/** Demo mode: ?demo=1 auto-plays the golden path with captions —
 * a self-narrating recording for the 3-minute video.
 *
 * When the recording harness (scripts/record-demo.mjs) drives the page it
 * exposes `window.sdtControl` with killServer/startServer hooks, and the
 * script gains its middle act: the server is killed after the quote arrives,
 * the card fails closed on confirm (no fake success), the server restarts on
 * the same on-disk store, and the same quote+token then confirms. Without the
 * harness those beats drop out and the plain golden path plays.
 *
 * Every caption states the truth: the surface is simulated, the MCP server,
 * the trip store, the fail-closed behavior and the restart are real. */

import type { api as ApiShape } from "./main.js";

type Api = typeof ApiShape;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface DemoControl {
  killServer(): Promise<void>;
  startServer(): Promise<void>;
}
const control = (window as unknown as { sdtControl?: DemoControl }).sdtControl;

interface Step {
  caption?: string;
  type?: string;        // type a user message and send it
  click?: string;       // click a selector inside the latest card
  scroll?: string;      // scroll a selector inside the latest card into view
  newDay?: boolean;     // press "New day"
  act?: keyof DemoControl; // harness-only: control the server process
  settle?: number;      // extra wait after the action
}

const SCRIPT: Step[] = [
  { caption: "Voice assistants are great at timers. But ask for a weekend away…", settle: 3000 },
  { caption: "…and the answer talks <strong>at</strong> you for two minutes. Let's fix that.", settle: 3200 },
  { caption: "<strong>Show, Don't Tell</strong> — every complex answer becomes an interface.", type: "Plan a weekend in Napa for two", settle: 3000 },
  { caption: "A real MCP server (spec 2025-11-25, Streamable HTTP) plans the trip. The card <strong>is</strong> the answer.", settle: 5200 },
  { type: "Make it dog-friendly", caption: "Adjust in place. Same card, new constraints — the balloon ride can't take a dog, so it's out.", settle: 4400 },
  { click: "#book-btn", caption: "Booking is two calls on purpose. First a quote — <strong>nothing is booked yet.</strong>", settle: 3600 },
  ...(control
    ? [
        { act: "killServer", caption: "Now the server dies mid-flow. Watch what the card does…", settle: 2800 } as Step,
        { click: "#sheet-confirm", caption: "<strong>Fail closed.</strong> No fake success, no made-up code — the sheet stays open for a retry.", settle: 2600 } as Step,
        { scroll: "#card-error", settle: 2800 } as Step,
        { act: "startServer", caption: "Server restarts — new process, same on-disk trip store.", settle: 2800 } as Step,
        { click: "#sheet-confirm", caption: "Same quote, same token — now it confirms. The code came from the <strong>server</strong>, not the card.", settle: 4600 } as Step,
      ]
    : [
        { click: "#sheet-confirm", caption: "Confirmed — the booking now exists in the server's trip store, code and all.", settle: 4200 } as Step,
      ]),
  { scroll: "#confirmation", settle: 2400 },
  { newDay: true, caption: "Next morning.", settle: 2800 },
  { type: "What was that hotel we booked?", caption: "New day, new session — <strong>same memory</strong>, from the trip store.", settle: 4400 },
  { caption: "The booking survived a kill and a restart — confirmation code and all.", scroll: "#confirmation", settle: 4200 },
  { caption: "Open standards end to end: <strong>MCP · MCP Apps · Agent Skills</strong>.", settle: 3600 },
  { caption: "<strong>Show, don't tell.</strong>", settle: 3200 },
];

export async function maybeRunDemo(api: Api): Promise<void> {
  if (!new URLSearchParams(location.search).has("demo")) return;
  await sleep(1400);
  for (const step of SCRIPT) {
    if (step.caption) api.caption(step.caption);
    if (step.act && control) await control[step.act]();
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
