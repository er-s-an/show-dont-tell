/** Demo mode: ?demo=1 auto-plays the golden path with captions —
 * a self-narrating recording for the 3-minute video. */

import type { api as ApiShape } from "./main.js";

type Api = typeof ApiShape;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Step {
  caption?: string;
  type?: string;        // type a user message and send it
  click?: string;       // click a selector inside the latest card
  scroll?: string;      // scroll a selector inside the latest card into view
  newDay?: boolean;     // press "New day"
  settle?: number;      // extra wait after the action
}

const SCRIPT: Step[] = [
  { caption: "Voice assistants are great at timers. But ask for a weekend away…", settle: 3000 },
  { caption: "…and the answer talks <strong>at</strong> you for two minutes. Let's fix that.", settle: 3200 },
  { caption: "<strong>Show, Don't Tell</strong> — every complex answer becomes an interface.", type: "Plan a weekend in Napa for two", settle: 3000 },
  { caption: "A real MCP server plans the trip — curated data, constraints, prices. The card is the answer.", settle: 5200 },
  { type: "Make it dog-friendly", caption: "Adjust in place. Same card, new constraints.", settle: 4200 },
  { caption: "Balloon ride is out — it's not dog-friendly. The plan re-solves itself.", settle: 3600 },
  { click: "#book-btn", caption: "Booking is a quote first. <strong>Nothing charges without your confirm.</strong>", settle: 3400 },
  { click: "#sheet-confirm", caption: "Confirmed — and a push lands on your phone. (And your watch.)", settle: 4200 },
  { scroll: "#confirmation", settle: 2400 },
  { newDay: true, caption: "Next morning.", settle: 3000 },
  { type: "What was that hotel we booked?", caption: "New day. <strong>Same memory.</strong> Cross-session by design.", settle: 4200 },
  { caption: "The booking is still on the card — confirmed, code and all.", scroll: "#confirmation", settle: 4200 },
  { caption: "Built on open standards: <strong>MCP · MCP Apps · Agent Skills</strong>.", settle: 3800 },
  { caption: "<strong>Show, don't tell.</strong>", settle: 3200 },
];

export async function maybeRunDemo(api: Api): Promise<void> {
  if (!new URLSearchParams(location.search).has("demo")) return;
  await sleep(1400);
  for (const step of SCRIPT) {
    if (step.caption) api.caption(step.caption);
    if (step.type) await api.typeAndSend(step.type);
    if (step.click) {
      try {
        api.clickInCard(step.click);
      } catch (e) {
        console.warn("demo click failed:", e);
      }
    }
    if (step.scroll) {
      try {
        api.scrollCardTo(step.scroll);
      } catch (e) {
        console.warn("demo scroll failed:", e);
      }
    }
    if (step.newDay) api.newDay();
    await sleep(step.settle ?? 2000);
  }
  await sleep(1200);
  api.hideCaptions();
  document.body.dataset.demoDone = "1";
}
