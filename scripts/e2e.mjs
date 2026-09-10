/**
 * Golden-path end-to-end drive of the simulator against the real MCP server.
 * Requires: `npm start` (server :3001) and `npm run dev -w @sdt/simulator` (:5173),
 * plus playwright available (`npm i -g playwright` or NODE_PATH to global root).
 *
 *   node scripts/e2e.mjs
 *
 * Writes verification frames into docs/demo-frames/.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frames = path.join(root, "docs", "demo-frames");
mkdirSync(frames, { recursive: true });

const checks = [];
const check = (name, ok) => {
  checks.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 1150 } });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".turn .say", { timeout: 10000 });
check("simulator boots and greets", true);

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
await page.waitForTimeout(5500);
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
await page.screenshot({ path: path.join(frames, "03-quote.png") });

// beat 4 — confirm
await doc2.locator("#sheet-confirm").click();
await doc2.locator("#confirmation:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
check("confirm → confirmation banner with code", true);
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(frames, "04-confirmed.png") });

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

await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
