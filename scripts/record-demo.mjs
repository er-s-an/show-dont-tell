/**
 * Records the self-narrating demo (?demo=1) to a webm video.
 * Requires: server (:3001) + simulator dev server (:5173) running.
 *
 *   node scripts/record-demo.mjs [output.webm]
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync, renameSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "demo-video");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

await page.goto("http://localhost:5173/?demo=1", { waitUntil: "domcontentloaded" });

// The demo script marks body[data-demo-done="1"] when finished.
await page.waitForSelector('body[data-demo-done="1"]', { state: "attached", timeout: 180000 });
await page.waitForTimeout(1600);

await context.close();
await browser.close();

const target = process.argv[2] ?? path.join(outDir, "show-dont-tell-demo.webm");
const files = readdirSync(outDir)
  .filter((f) => f.endsWith(".webm") && path.join(outDir, f) !== target)
  .map((f) => ({ f, mtime: statSync(path.join(outDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);
if (!files.length) throw new Error("no recording produced");
renameSync(path.join(outDir, files[0].f), target);
console.log("recorded →", target);
