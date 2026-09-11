/**
 * Golden-path end-to-end drive of the simulator against the real MCP server.
 * Requires: `npm start` (server :3001) and `npm run dev -w @sdt/simulator` (:5173),
 * plus playwright available (`npm i -g playwright` or NODE_PATH to global root).
 *
 *   node scripts/e2e.mjs
 *
 * Proofs, not just pixels:
 *  - any pageerror (main frame OR card iframe) fails the run
 *  - the real MCP JSON-RPC traffic to :3001 is observed, and every expected
 *    tool call must appear (plan → adjust → book → confirm → recall)
 *  - the confirmation code shown in the card must exist in the server's
 *    on-disk trip store with status "confirmed" (no card-side fake success)
 *  - the card's fail-closed error toast must never appear on the golden path
 *
 * Writes verification frames into docs/demo-frames/.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frames = path.join(root, "docs", "demo-frames");
mkdirSync(frames, { recursive: true });

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

const pageErrors = [];
const mcpCalls = []; // JSON-RPC methods + tool names observed on the wire

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 1150 } });
page.on("pageerror", (e) => {
  pageErrors.push(String(e).slice(0, 300));
  console.log("[pageerror]", String(e).slice(0, 200));
});
page.on("request", (req) => {
  if (!req.url().includes(":3001/mcp") || req.method() !== "POST") return;
  try {
    const body = req.postDataJSON();
    for (const msg of Array.isArray(body) ? body : [body]) {
      if (msg?.method === "tools/call") mcpCalls.push(msg.params?.name);
      else if (msg?.method) mcpCalls.push(msg.method);
    }
  } catch { /* non-JSON or notification — ignore */ }
});

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
  await doc2.locator("#card-error:not([hidden])").count() === 0,
);
await page.screenshot({ path: path.join(frames, "03-quote.png") });

// beat 4 — confirm
await doc2.locator("#sheet-confirm").click();
await doc2.locator("#confirmation:not([hidden])").waitFor({ state: "visible", timeout: 8000 });
check("confirm → confirmation banner with code", true);
check(
  "confirm came from the server (no error toast)",
  await doc2.locator("#card-error:not([hidden])").count() === 0,
);
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(frames, "04-confirmed.png") });

// beat 4b — the code on screen must exist in the server's trip store
const confText = (await doc2.locator("#conf-detail").textContent()) ?? "";
const confCode = confText.match(/NP-[A-Z0-9]+/)?.[0] ?? null;
check("confirmation code parsed from card", Boolean(confCode), confText);
if (confCode) {
  const store = JSON.parse(readFileSync(path.join(root, ".data", "trips.json"), "utf-8"));
  const trips = Array.isArray(store) ? store : Object.values(store.trips ?? store);
  const persisted = trips.find((t) => t?.booking?.confirmation === confCode);
  check(
    `store holds ${confCode} as confirmed`,
    persisted?.booking?.status === "confirmed",
    persisted ? "" : "code not found in .data/trips.json",
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

check("zero pageerrors across main frame and card iframes", pageErrors.length === 0, pageErrors[0] ?? "");

await browser.close();
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
