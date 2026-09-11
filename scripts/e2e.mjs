/**
 * Hermetic end-to-end verification of the whole product against the real
 * production build. Self-contained: spawns its own MCP server (temp
 * SDT_DATA_DIR), its own `vite preview` of the production simulator build,
 * and a static server for the standalone card. Nothing reads or writes the
 * repo-local `.data/`; every artifact lands in git-ignored `artifacts/`.
 *
 *   npm run build && node scripts/e2e.mjs
 *   (first run needs the browser: npx playwright install chromium)
 *
 * Proofs, not just pixels:
 *  - any pageerror (main frame OR card iframe) fails the run
 *  - the real MCP JSON-RPC traffic is observed on the wire, and every
 *    expected tool call must appear (plan → adjust → book → confirm → recall)
 *  - the confirmation code shown in the card must exist in the server's
 *    trip store IN THE TEMP DATA DIR with status "confirmed"
 *  - the repo-local store is byte-identical before and after (hermeticity)
 *  - fail-closed negatives: confirm-before-quote, book-before-plan,
 *    wrong token, reused token, expired token (short-TTL server)
 *  - standalone card: only exactly `?preview=1` enables the local demo
 *    fallback; `?preview=0`, `?preview=true`, and no param all fail closed
 *  - writes an exact-SHA evidence artifact to artifacts/e2e-evidence.json
 */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = path.join(root, "artifacts");
const frames = process.env.SDT_FRAMES_DIR ?? path.join(artifacts, "frames");
mkdirSync(frames, { recursive: true });

const PORT_SERVER = 3012;
const PORT_PREVIEW = 5174;
const PORT_CARDS = 3199;
const PORT_TTL = 3013;
const MCP = `http://localhost:${PORT_SERVER}/mcp`;

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

const pageErrors = [];
const mcpCalls = [];
const children = [];
const spawnProc = (cmd, args, opts = {}) => {
  const p = spawn(cmd, args, { stdio: "ignore", ...opts });
  children.push(p);
  return p;
};
const killProc = (p) =>
  new Promise((resolve) => {
    if (p.exitCode !== null) return resolve();
    p.once("exit", resolve);
    p.kill("SIGTERM");
    setTimeout(() => { try { p.kill("SIGKILL"); } catch {} resolve(); }, 2500);
  });
const cleanupProcs = () => Promise.all(children.map(killProc));
process.on("exit", () => { for (const p of children) { try { p.kill("SIGKILL"); } catch {} } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status < 500) return;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error(`timeout waiting for ${url}`);
    await sleep(250);
  }
}

/* -------- minimal MCP rpc (stateless) -------- */
let idSeq = 0;
async function rpc(method, params = {}, base = MCP) {
  const res = await fetch(base, {
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
const callTool = (name, args, base) => rpc("tools/call", { name, arguments: args }, base);

/* -------- build artifacts must exist -------- */
for (const f of [
  "packages/server/dist/index.js",
  "packages/simulator/dist/index.html",
  "packages/cards/dist/itinerary/index.html",
]) {
  if (!existsSync(path.join(root, f))) {
    console.error(`missing build output: ${f} — run \`npm run build\` first`);
    process.exit(1);
  }
}

const repoStore = path.join(root, ".data", "trips.json");
const repoStoreHash = () =>
  existsSync(repoStore) ? createHash("sha256").update(readFileSync(repoStore)).digest("hex") : null;
const repoStoreBefore = repoStoreHash();
let repoStoreAfter = null;

const dataDir = mkdtempSync(path.join(tmpdir(), "sdt-e2e-"));
const startedAt = new Date();
let browser = null;
let browserVersion = null;
let cardsHttp = null;

try {
  /* -------- server + production simulator -------- */
  spawnProc(process.execPath, [path.join(root, "packages/server/dist/index.js")], {
    env: { ...process.env, PORT: String(PORT_SERVER), SDT_DATA_DIR: dataDir },
  });
  spawnProc(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORT_PREVIEW), "--strictPort"], {
    cwd: path.join(root, "packages/simulator"),
  });
  await waitHttp(`http://localhost:${PORT_SERVER}/mcp`);
  await waitHttp(`http://localhost:${PORT_PREVIEW}/`);
  check("server + production simulator up (temp data dir)", true);

  browser = await chromium.launch();
  browserVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 960, height: 1150 } });
  page.on("pageerror", (e) => {
    pageErrors.push(String(e).slice(0, 300));
    console.log("[pageerror]", String(e).slice(0, 200));
  });
  page.on("request", (req) => {
    if (!req.url().includes(`:${PORT_SERVER}/mcp`) || req.method() !== "POST") return;
    try {
      const body = req.postDataJSON();
      for (const msg of Array.isArray(body) ? body : [body]) {
        if (msg?.method === "tools/call") mcpCalls.push(msg.params?.name);
        else if (msg?.method) mcpCalls.push(msg.method);
      }
    } catch { /* non-JSON or notification — ignore */ }
  });

  await page.goto(`http://localhost:${PORT_PREVIEW}/?mcp=${encodeURIComponent(MCP)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".turn .say", { timeout: 10000 });
  check("simulator boots and greets (production build)", true);

  // beat 1 — plan
  await page.fill("#input", "Plan a weekend in Napa for two");
  await page.click("#send");
  await page.waitForSelector(".card-frame", { timeout: 15000 });
  await page.waitForTimeout(4500);
  check("plan → itinerary card embedded", true);
  await page.screenshot({ path: path.join(frames, "01-plan.png") });

  // beat 2 — dog-friendly adjust
  await page.fill("#input", "Make it dog-friendly");
  await page.click("#send");
  await page.locator(".card-frame").nth(1).waitFor({ state: "attached", timeout: 20000 });
  await page.waitForTimeout(2500);
  const cardCount1 = await page.locator(".card-frame").count();
  check("adjust → second card render", cardCount1 >= 2);
  await page.screenshot({ path: path.join(frames, "02-dog.png") });

  // beat 3 — book from the card (quote sheet)
  const card2 = page.locator(".card-frame").nth(1);
  const doc2 = card2.contentFrame();
  await doc2.locator("#book-btn").click();
  await doc2.locator("#sheet:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
  check("book → confirm sheet opens inside card", true);
  await page.waitForTimeout(900);
  check(
    "quote came from the server (no error toast)",
    (await doc2.locator("#card-error:not([hidden])").count()) === 0,
  );
  await page.screenshot({ path: path.join(frames, "03-quote.png") });

  // beat 4 — confirm
  await doc2.locator("#sheet-confirm").click();
  await doc2.locator("#confirmation:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
  check("confirm → confirmation banner with code", true);
  check(
    "confirm came from the server (no error toast)",
    (await doc2.locator("#card-error:not([hidden])").count()) === 0,
  );
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(frames, "04-confirmed.png") });

  // beat 4b — the code on screen must exist in the server's TEMP data dir store.
  // The server persists synchronously before responding, so the poll should
  // never actually wait; it exists to defuse any hidden flush race, and the
  // failure dump makes a recurrence debuggable from the artifact alone.
  const confText = (await doc2.locator("#conf-detail").textContent()) ?? "";
  const confCode = confText.match(/NP-[A-Z0-9_-]+/)?.[0] ?? null;
  check("confirmation code parsed from card", Boolean(confCode), confText);
  const storeFile = path.join(dataDir, "trips.json");
  if (confCode) {
    let persisted = null;
    let lastStoreDump = "";
    for (let i = 0; i < 12 && !persisted; i++) {
      try {
        lastStoreDump = readFileSync(storeFile, "utf-8");
        const store = JSON.parse(lastStoreDump);
        persisted = Object.values(store.trips ?? {}).find(
          (t) => t?.booking?.confirmation === confCode,
        ) ?? null;
      } catch (e) {
        lastStoreDump = `read error: ${String(e).slice(0, 120)}`;
      }
      if (!persisted) await page.waitForTimeout(250);
    }
    check(
      `store in temp SDT_DATA_DIR holds ${confCode} as confirmed`,
      persisted?.booking?.status === "confirmed",
      persisted ? "" : `code not found; store dump: ${lastStoreDump.slice(0, 400)}`,
    );
  }

  // beat 5 — new day, recall
  await page.click("#new-day");
  await page.waitForTimeout(800);
  await page.fill("#input", "What was that hotel we booked?");
  await page.click("#send");
  await page.waitForTimeout(7000);
  const lastCard = page.locator(".card-frame").last();
  const docR = lastCard.contentFrame();
  await docR.locator("#confirmation:not([hidden])").waitFor({ state: "visible", timeout: 10000 });
  check("cross-session recall → card with booking intact", true);
  await page.screenshot({ path: path.join(frames, "05-recall.png") });

  // wire-level proof: every expected tool call actually reached the MCP server
  for (const tool of ["plan-weekend-trip", "adjust-trip", "book-hotel", "confirm-booking"]) {
    check(`wire: tools/call ${tool}`, mcpCalls.includes(tool), mcpCalls.join(", "));
  }
  check(
    "wire: recall used get-trip or list-trips",
    mcpCalls.includes("get-trip") || mcpCalls.includes("list-trips"),
    mcpCalls.join(", "),
  );

  /* -------- negative paths at the MCP contract level (same server) -------- */

  // confirm before any quote exists → refused
  const negPlan = await callTool("plan-weekend-trip", { conversationId: "e2e-neg", party: 2 });
  const negTrip = negPlan.structuredContent.tripId;
  const noQuote = await callTool("confirm-booking", { tripId: negTrip, bookingToken: "bk_none" });
  check("fail-closed: confirm before any quote is refused", noQuote.isError === true);

  // book before any plan (unknown tripId) → refused
  const noTrip = await callTool("book-hotel", { tripId: "trip_does_not_exist", hotelName: "x" });
  check("fail-closed: book-hotel on unknown trip is refused", noTrip.isError === true);

  // wrong token → refused, and the booking is NOT confirmed
  await callTool("book-hotel", { tripId: negTrip, hotelName: negPlan.structuredContent.hotels[0].name });
  const wrongTok = await callTool("confirm-booking", { tripId: negTrip, bookingToken: "bk_wrong" });
  const afterWrong = await callTool("get-trip", { tripId: negTrip });
  check(
    "fail-closed: wrong token refused, booking unconfirmed",
    wrongTok.isError === true && afterWrong.structuredContent.booking?.status !== "confirmed",
  );

  // right token → confirmed; same token again (reused) → refused
  const realQuote = await callTool("book-hotel", { tripId: negTrip, hotelName: negPlan.structuredContent.hotels[0].name });
  const token = realQuote.structuredContent.bookingToken;
  const okConfirm = await callTool("confirm-booking", { tripId: negTrip, bookingToken: token });
  const reused = await callTool("confirm-booking", { tripId: negTrip, bookingToken: token });
  check(
    "fail-closed: token is single-use (reused token refused)",
    okConfirm.structuredContent.booking?.status === "confirmed" && reused.isError === true,
  );

  /* -------- expired token (short-TTL server on its own port + data dir) -------- */
  const ttlDir = mkdtempSync(path.join(tmpdir(), "sdt-ttl-"));
  const ttlServer = spawnProc(process.execPath, [path.join(root, "packages/server/dist/index.js")], {
    env: { ...process.env, PORT: String(PORT_TTL), SDT_DATA_DIR: ttlDir, SDT_QUOTE_TTL_MS: "300" },
  });
  try {
    await waitHttp(`http://localhost:${PORT_TTL}/mcp`);
    const ttlBase = `http://localhost:${PORT_TTL}/mcp`;
    const ttlPlan = await callTool("plan-weekend-trip", { conversationId: "e2e-ttl" }, ttlBase);
    const ttlQuote = await callTool(
      "book-hotel",
      { tripId: ttlPlan.structuredContent.tripId, hotelName: ttlPlan.structuredContent.hotels[0].name },
      ttlBase,
    );
    await sleep(600); // let the 300ms quote expire
    const expired = await callTool(
      "confirm-booking",
      { tripId: ttlPlan.structuredContent.tripId, bookingToken: ttlQuote.structuredContent.bookingToken },
      ttlBase,
    );
    check("fail-closed: expired quote token is refused", expired.isError === true);
  } finally {
    await killProc(ttlServer);
    rmSync(ttlDir, { recursive: true, force: true });
  }

  /* -------- standalone card: preview gating -------- */
  const cardsDir = path.join(root, "packages/cards/dist");
  cardsHttp = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://x").pathname;
    const file = path.join(cardsDir, pathname === "/" ? "itinerary/index.html" : pathname);
    if (!file.startsWith(cardsDir) || !existsSync(file)) {
      res.writeHead(404).end("nope");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => cardsHttp.listen(PORT_CARDS, r));

  const previewProbe = async (query) => {
    const p = await browser.newPage({ viewport: { width: 700, height: 1200 } });
    p.on("pageerror", (e) => pageErrors.push(`preview ${query}: ${String(e).slice(0, 200)}`));
    await p.goto(`http://localhost:${PORT_CARDS}/itinerary/index.html${query}`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#book-btn", { timeout: 10000 });
    await p.waitForTimeout(1400); // standalone DEMO render + failed host connect
    await p.locator("#book-btn").click();
    await p.waitForTimeout(2200); // failed MCP call → fail-closed toast, or demo sheet
    const state = await p.evaluate(() => ({
      sheetOpen: !document.querySelector("#sheet")?.hidden,
      confShown: !document.querySelector("#confirmation")?.hidden,
      toastShown: !document.querySelector("#card-error")?.hidden,
      confText: document.querySelector("#conf-detail")?.textContent ?? "",
    }));
    await p.close();
    return state;
  };

  for (const q of ["?preview=0", "?preview=true", ""]) {
    const s = await previewProbe(q);
    check(
      `fail-closed standalone: "${q || "(no param)"}" → no fake quote, no fake confirmation`,
      !s.sheetOpen && !s.confShown && s.toastShown && !/NP-DEMO42/.test(s.confText),
      JSON.stringify(s),
    );
  }
  {
    const p = await browser.newPage({ viewport: { width: 700, height: 1200 } });
    p.on("pageerror", (e) => pageErrors.push(`preview=1: ${String(e).slice(0, 200)}`));
    await p.goto(`http://localhost:${PORT_CARDS}/itinerary/index.html?preview=1`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector("#book-btn", { timeout: 10000 });
    await p.waitForTimeout(1400);
    await p.locator("#book-btn").click();
    await p.locator("#sheet:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
    await p.locator("#sheet-confirm").click();
    await p.locator("#confirmation:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
    const confText1 = (await p.locator("#conf-detail").textContent()) ?? "";
    check(
      "exactly ?preview=1 keeps the local design-preview demo (NP-DEMO42)",
      /NP-DEMO42/.test(confText1),
      confText1,
    );
    await p.close();
  }

  /* -------- hermeticity: the repo-local store must be untouched -------- */
  repoStoreAfter = repoStoreHash();
  check(
    "hermetic: repo .data/trips.json untouched by the run",
    repoStoreBefore === repoStoreAfter,
  );

  check("zero pageerrors across all pages and card iframes", pageErrors.length === 0, pageErrors[0] ?? "");
} catch (e) {
  check(`harness error: ${String(e).slice(0, 300)}`, false);
} finally {
  if (browser) await browser.close();
  if (cardsHttp) cardsHttp.close();
  await cleanupProcs();
}

/* -------- evidence artifact -------- */
const finishedAt = new Date();
const failed = checks.filter((c) => !c.ok);
const pick = (cmd) => { try { return execSync(cmd, { cwd: root }).toString().trim(); } catch { return null; } };
let storeHash = null;
try {
  storeHash = createHash("sha256").update(readFileSync(path.join(dataDir, "trips.json"))).digest("hex");
} catch { /* store may not exist if the run failed early */ }
const pwVersion = JSON.parse(
  readFileSync(path.join(root, "node_modules/playwright/package.json"), "utf-8"),
).version;
const evidence = {
  project: "show-dont-tell",
  script: "scripts/e2e.mjs",
  git: {
    head: pick("git rev-parse HEAD"),
    dirty: Boolean(pick("git status --porcelain")),
  },
  runtime: {
    node: process.version,
    npm: pick("npm --version"),
    platform: `${process.platform}/${process.arch}`,
    playwright: pwVersion,
    chromium: browserVersion,
  },
  lockfileSha256: createHash("sha256").update(readFileSync(path.join(root, "package-lock.json"))).digest("hex"),
  dataDir: {
    kind: "mkdtemp SDT_DATA_DIR (deleted after run)",
    tripsJsonSha256: storeHash,
    repoStoreTouched: repoStoreBefore !== repoStoreAfter,
  },
  mcpWireCallsObserved: mcpCalls,
  checks: checks.map((c) => ({ name: c.name, ok: c.ok })),
  totals: { passed: checks.length - failed.length, total: checks.length },
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  ok: failed.length === 0,
};
mkdirSync(artifacts, { recursive: true });
writeFileSync(path.join(artifacts, "e2e-evidence.json"), JSON.stringify(evidence, null, 2));
rmSync(dataDir, { recursive: true, force: true });

console.log(`\n${evidence.totals.passed}/${evidence.totals.total} passed · evidence → artifacts/e2e-evidence.json`);
process.exit(failed.length ? 1 : 0);
