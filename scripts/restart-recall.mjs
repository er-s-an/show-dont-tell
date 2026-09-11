/**
 * Cross-process memory proof: plans and confirms a booking against one server
 * process, kills it, starts a fresh process on the same data dir, and recalls
 * the trip — the confirmation must survive the restart.
 *
 * Self-contained: spawns its own servers on :3011 with an isolated data dir.
 *
 *   node scripts/restart-recall.mjs
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3011;
const BASE = `http://localhost:${PORT}/mcp`;
const CONVERSATION = "restart-proof";
const dataDir = mkdtempSync(path.join(tmpdir(), "sdt-restart-"));

let idSeq = 0;
async function rpc(method, params = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++idSeq, method, params }),
  });
  if (!res.ok) throw new Error(`${method} → HTTP ${res.status}`);
  const text = await res.text();
  const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
  const msg = JSON.parse(dataLine ? dataLine.slice(5).trim() : text);
  if (msg.error) throw new Error(`${method} → ${JSON.stringify(msg.error)}`);
  return msg.result;
}

function startServer() {
  const proc = spawn("node", [path.join(root, "packages/server/dist/index.js")], {
    env: { ...process.env, PORT: String(PORT), SDT_DATA_DIR: dataDir },
    stdio: "ignore",
  });
  return proc;
}

async function waitReady(timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await rpc("tools/list");
      return;
    } catch {
      if (Date.now() > deadline) throw new Error("server did not become ready");
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

async function stopServer(proc) {
  if (proc.exitCode !== null) return;
  proc.kill("SIGTERM");
  await new Promise((resolve) => {
    proc.once("exit", resolve);
    setTimeout(() => { proc.kill("SIGKILL"); resolve(); }, 3000);
  });
}

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
};

let serverA;
try {
  serverA = startServer();
  await waitReady();
  check("server A up", true);

  const planned = await rpc("tools/call", {
    name: "plan-weekend-trip",
    arguments: { conversationId: CONVERSATION, party: 2 },
  });
  const trip = planned.structuredContent;
  check("planned against server A", Boolean(trip?.tripId), trip?.tripId);

  const quote = await rpc("tools/call", {
    name: "book-hotel",
    arguments: { tripId: trip.tripId, hotelName: trip.hotels[0].name },
  });
  const q = quote.structuredContent;
  const booked = await rpc("tools/call", {
    name: "confirm-booking",
    arguments: { tripId: trip.tripId, bookingToken: q.bookingToken },
  });
  const code = booked.structuredContent.booking?.confirmation;
  check("confirmed against server A", booked.structuredContent.booking?.status === "confirmed", code);

  await stopServer(serverA);
  check("server A stopped", true);

  const serverB = startServer();
  try {
    await waitReady();
    check("server B up (same data dir, new process)", true);

    const list = await rpc("tools/call", { name: "list-trips", arguments: { conversationId: CONVERSATION } });
    check(
      "server B lists the trip by conversation",
      list.structuredContent.trips?.some((t) => t.tripId === trip.tripId),
    );

    const recalled = await rpc("tools/call", { name: "get-trip", arguments: { tripId: trip.tripId } });
    const rb = recalled.structuredContent.booking;
    check(
      "booking survives the process restart",
      rb?.status === "confirmed" && rb?.confirmation === code,
      rb ? `${rb.status} · ${rb.confirmation}` : "no booking",
    );
  } finally {
    await stopServer(serverB);
  }
} catch (e) {
  check(`harness error: ${String(e).slice(0, 160)}`, false);
  if (serverA) await stopServer(serverA);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
