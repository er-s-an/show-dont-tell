/**
 * One-command release gate. Runs every verification layer against the current
 * build, hermetically (own servers, temp data dirs, no repo `.data`):
 *
 *   1. unit tests (31)   npm test -w @sdt/server
 *   2. smoke (11)        scripts/smoke.mjs against a throwaway server + store
 *   3. restart recall(7) scripts/restart-recall.mjs
 *   4. wire e2e (27)     scripts/e2e.mjs  (needs: npx playwright install chromium)
 *
 *   npm ci && npm run build && npx playwright install chromium && npm run verify
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stages = [];

function run(name, cmd, args, opts = {}) {
  console.log(`\n=== ${name} ===`);
  return new Promise((resolve) => {
    const started = Date.now();
    const p = spawn(cmd, args, { cwd: root, stdio: "inherit", ...opts });
    p.on("exit", (code) => {
      stages.push({ name, code, seconds: Math.round((Date.now() - started) / 1000) });
      resolve(code);
    });
  });
}

const dataDir = mkdtempSync(path.join(tmpdir(), "sdt-verify-"));
const smokePort = 3031;
const hermeticEnv = { ...process.env, SDT_ALLOW_NTFY: "0", NTFY_TOPIC: "" };

// stage 1 — unit tests (Node test runner)
let code = await run("unit tests (npm test -w @sdt/server)", "npm", ["test", "-w", "@sdt/server"]);

// stage 2 — smoke against a throwaway server with a temp store
if (code === 0) {
  const server = spawn(process.execPath, [path.join(root, "packages/server/dist/index.js")], {
    env: { ...hermeticEnv, PORT: String(smokePort), SDT_DATA_DIR: dataDir },
    stdio: "ignore",
  });
  try {
    // wait for readiness, then smoke
    const deadline = Date.now() + 15000;
    for (;;) {
      try {
        const r = await fetch(`http://localhost:${smokePort}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
        });
        if (r.ok) break;
      } catch { /* not up yet */ }
      if (Date.now() > deadline) throw new Error("smoke server did not become ready");
      await new Promise((r) => setTimeout(r, 250));
    }
    code = await run("smoke (scripts/smoke.mjs)", process.execPath, [path.join(root, "scripts/smoke.mjs")], {
      env: { ...hermeticEnv, SDT_MCP_URL: `http://localhost:${smokePort}/mcp` },
    });
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 400));
    try { server.kill("SIGKILL"); } catch { /* gone */ }
    rmSync(dataDir, { recursive: true, force: true });
  }
}

// stage 3 — cross-process restart recall
if (code === 0) {
  code = await run("restart recall (scripts/restart-recall.mjs)", process.execPath, [path.join(root, "scripts/restart-recall.mjs")], { env: hermeticEnv });
}

// stage 4 — hermetic wire-level browser e2e
if (code === 0) {
  code = await run("browser e2e (scripts/e2e.mjs)", process.execPath, [path.join(root, "scripts/e2e.mjs")], { env: hermeticEnv });
}

console.log("\n=== verify summary ===");
for (const s of stages) {
  console.log(`${s.code === 0 ? "✅" : "❌"} ${s.name} (${s.seconds}s)`);
}
const failed = stages.filter((s) => s.code !== 0);
console.log(failed.length ? `\n${failed.length} stage(s) FAILED` : "\nall stages green");
process.exit(failed.length ? 1 : 0);
