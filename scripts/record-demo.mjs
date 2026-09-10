/**
 * Records the self-narrating demo (?demo=1) to a webm video.
 * Requires: server (:3001) + simulator dev server (:5173) running.
 *
 *   node scripts/record-demo.mjs [output.webm]
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync, renameSync, readdirSync } from "node:fs";
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

const files = readdirSync(outDir).filter((f) => f.endsWith(".webm"));
const latest = files[files.length - 1];
const target = process.argv[2] ?? path.join(outDir, "show-dont-tell-demo.webm");
renameSync(path.join(outDir, latest), target);
console.log("recorded →", target);
