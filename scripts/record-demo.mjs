/**
 * Records the self-narrating demo (?demo=1) to a webm video — hermetically.
 *
 * Spawns its own MCP server (temp SDT_DATA_DIR) and a `vite preview` of the
 * production simulator build, exposes window.sdtControl.{killServer,
 * startServer} so the in-page demo script can show the fail-closed beat and
 * the process-restart recovery for real, then saves the recording to
 * docs/demo-video/show-dont-tell-demo.webm (the previous recording is kept
 * alongside with a date suffix).
 *
 *   npm run build && node scripts/record-demo.mjs
 *   (first run needs the browser: npx playwright install chromium)
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "demo-video");
mkdirSync(outDir, { recursive: true });

const PORT_SERVER = 3021;
const PORT_PREVIEW = 5181;
const MCP = `http://localhost:${PORT_SERVER}/mcp`;
const dataDir = mkdtempSync(path.join(tmpdir(), "sdt-demo-"));

for (const f of ["packages/server/dist/index.js", "packages/simulator/dist/index.html"]) {
  if (!existsSync(path.join(root, f))) {
    console.error(`missing build output: ${f} — run \`npm run build\` first`);
    process.exit(1);
  }
}

let idSeq = 0;
async function rpc(method, params = {}) {
  const res = await fetch(MCP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++idSeq, method, params }),
  });
  if (!res.ok) throw new Error(`${method} → HTTP ${res.status}`);
  return res.text();
}
async function waitServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try { await rpc("tools/list"); return; } catch {
      if (Date.now() > deadline) throw new Error("server did not become ready");
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

let serverProc = null;
function startServerProc() {
  serverProc = spawn(process.execPath, [path.join(root, "packages/server/dist/index.js")], {
    env: { ...process.env, PORT: String(PORT_SERVER), SDT_DATA_DIR: dataDir },
    stdio: "ignore",
  });
  return serverProc;
}
async function killServerProc() {
  const p = serverProc;
  if (!p || p.exitCode !== null) return;
  const gone = new Promise((resolve) => p.once("exit", resolve));
  p.kill("SIGTERM");
  await Promise.race([gone, new Promise((r) => setTimeout(r, 3000))]);
  try { p.kill("SIGKILL"); } catch { /* already gone */ }
  await new Promise((r) => setTimeout(r, 300)); // let the port release
}

const preview = spawn(
  process.execPath,
  [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--port", String(PORT_PREVIEW), "--strictPort"],
  { cwd: path.join(root, "packages/simulator"), stdio: "ignore" },
);

const cleanup = async () => {
  await killServerProc();
  try { preview.kill("SIGKILL"); } catch { /* gone */ }
  rmSync(dataDir, { recursive: true, force: true });
};
process.on("exit", () => {
  try { serverProc?.kill("SIGKILL"); } catch {}
  try { preview.kill("SIGKILL"); } catch {}
});

try {
  startServerProc();
  await waitServer();
  await (async () => {
    const deadline = Date.now() + 15000;
    for (;;) {
      try { const r = await fetch(`http://localhost:${PORT_PREVIEW}/`); if (r.ok) return; } catch {}
      if (Date.now() > deadline) throw new Error("vite preview did not become ready");
      await new Promise((r) => setTimeout(r, 250));
    }
  })();

  const target = process.argv[2] ?? path.join(outDir, "show-dont-tell-demo.webm");
  if (existsSync(target)) {
    const backup = path.join(outDir, "show-dont-tell-demo-2026-09-11.webm");
    if (!existsSync(backup)) renameSync(target, backup);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  await context.exposeFunction("sdtKillServer", async () => { await killServerProc(); });
  await context.exposeFunction("sdtStartServer", async () => { startServerProc(); await waitServer(); });
  await context.addInitScript(() => {
    window.sdtControl = {
      killServer: () => window.sdtKillServer(),
      startServer: () => window.sdtStartServer(),
    };
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

  await page.goto(`http://localhost:${PORT_PREVIEW}/?demo=1&mcp=${encodeURIComponent(MCP)}`, {
    waitUntil: "domcontentloaded",
  });

  // The demo script marks body[data-demo-done="1"] when finished.
  await page.waitForSelector('body[data-demo-done="1"]', { state: "attached", timeout: 240000 });
  await page.waitForTimeout(1600);

  await context.close();
  await browser.close();

  const files = readdirSync(outDir)
    .filter((f) => f.endsWith(".webm") && path.join(outDir, f) !== target && !f.includes("2026-"))
    .map((f) => ({ f, mtime: statSync(path.join(outDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) throw new Error("no recording produced");
  renameSync(path.join(outDir, files[0].f), target);
  console.log("recorded →", target);
} finally {
  await cleanup();
}
