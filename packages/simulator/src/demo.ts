/** Demo rehearsal mode: ?demo=1 auto-plays the human-judge golden path.
 *
 * It follows one person, one task, and one visual climax: Maya adds Pepper and
 * the same card reshapes in place. Engineering proof (wire traces, process
 * restart, test counts) stays in the repository instead of interrupting her
 * story. This source is a preflight aid; it is not a final submitted video. */

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
  { caption: "Maya is planning her first weekend away with her partner — and their newly adopted dog, Pepper.", settle: 3400 },
  { caption: "A long spoken answer would make her remember nine stops, three hotels, and every price.", settle: 3200 },
  { caption: "Complex answers should not be monologues. They should become something you can see.", type: "Plan a weekend in Napa for two", settle: 4600 },
  { type: "Make it dog-friendly", caption: "Then Maya remembers Pepper. <strong>The same plan reshapes around her.</strong>", settle: 5200 },
  { scroll: ".hotels", caption: "Incompatible stops leave. Dog-friendly stays move up. The total changes with the plan.", settle: 3600 },
  { click: "#book-btn", caption: "When Maya chooses a stay, the interface slows down: itemized quote, one clear decision.", settle: 3500 },
  { caption: "<strong>Nothing is booked until you confirm.</strong>", settle: 3000 },
  { click: "#sheet-confirm", caption: "Maya confirms. This is a simulated booking receipt — no inventory is reserved and no money moves.", settle: 4200 },
  { scroll: "#confirmation", settle: 2200 },
  { newDay: true, caption: "Next morning: a new transcript, the same simulated identity.", settle: 2600 },
  { type: "What was that hotel we booked?", caption: "The plan returns with its receipt intact.", settle: 4400 },
  { caption: "The card is served by a real self-hosted MCP server. The Alexa+ surface and booking are simulated.", scroll: "#confirmation", settle: 3600 },
  { caption: "<strong>Alexa+ answers, as interfaces.</strong>", settle: 3200 },
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
