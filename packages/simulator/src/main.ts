import "./styles.css";
import { connectMcp, type McpConnection } from "./mcp.js";
import { embedCard, toolHasCard } from "./host.js";
import { plan, type ChatContext } from "./planner.js";
import { maybeRunDemo } from "./demo.js";
import type { CallToolResult } from "@modelcontextprotocol/client";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const threadEl = $("#thread");
const inputEl = $("#input") as HTMLInputElement;
const sendBtn = $("#send") as HTMLButtonElement;
const micBtn = $("#mic") as HTMLButtonElement;
const statusEl = $("#status");
const statusText = $("#status-text");
const dayChip = $("#day-chip");
const newDayBtn = $("#new-day") as HTMLButtonElement;

// MCP endpoint resolution: `?mcp=` query param (verification harnesses point
// the production build at their own server), then the VITE_MCP_URL build-time
// env, then the local default.
const MCP_URL =
  new URLSearchParams(location.search).get("mcp") ??
  import.meta.env.VITE_MCP_URL ??
  "http://localhost:3001/mcp";

/* ---------------- session state (survives reloads; "memory" demo) ---------------- */

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem("sdt-session") ?? "null");
  } catch {
    return null;
  }
})();

const ctx: ChatContext & { day: number } = stored ?? {
  conversationId: "conv_" + Math.random().toString(36).slice(2, 10),
  tripId: null,
  day: 1,
};
persist();

function persist() {
  localStorage.setItem(
    "sdt-session",
    JSON.stringify({ conversationId: ctx.conversationId, tripId: ctx.tripId, day: ctx.day }),
  );
}

function setDay(n: number) {
  ctx.day = n;
  dayChip.textContent = `Day ${n}`;
  persist();
}
setDay(ctx.day);

/* ---------------- rendering ---------------- */

function scrollToEnd() {
  requestAnimationFrame(() => threadEl.scrollTo({ top: threadEl.scrollHeight, behavior: "smooth" }));
}

function addUserBubble(text: string) {
  const el = document.createElement("div");
  el.className = "msg-user";
  el.textContent = text;
  threadEl.appendChild(el);
  scrollToEnd();
}

function addTurn(): { body: HTMLElement; done: (say?: string) => void } {
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.innerHTML = `<div class="avatar"></div><div class="body"><div class="thinking"><i></i><i></i><i></i></div></div>`;
  threadEl.appendChild(turn);
  scrollToEnd();
  const body = turn.querySelector(".body") as HTMLElement;
  return {
    body,
    done: (say) => {
      const think = body.querySelector(".thinking");
      if (think) think.remove();
      if (say) {
        const p = document.createElement("div");
        p.className = "say";
        p.textContent = say;
        body.prepend(p);
      }
      scrollToEnd();
    },
  };
}

function assistantText(result: CallToolResult): string {
  const t = result.content?.[0];
  return t && t.type === "text" ? t.text : "";
}

/* ---------------- chat controller ---------------- */

let mcp: McpConnection | null = null;
let busy = false;

async function handleUser(raw: string) {
  const text = raw.trim();
  if (!text || busy) return;
  busy = true;
  inputEl.value = "";
  addUserBubble(text);

  const turn = addTurn();
  const orb = document.querySelector(".topbar .orb");
  orb?.classList.add("listening");

  try {
    const intent = plan(text, ctx);

    if (!intent.tool || !mcp) {
      turn.done(intent.say ?? "…");
      return;
    }

    let result = await mcp.call(intent.tool, intent.args ?? {});

    // list-trips is a recall index: if it finds trips, follow with get-trip so
    // the remembered plan reappears as a card.
    if (intent.tool === "list-trips") {
      const trips = (result.structuredContent as { trips?: { tripId: string }[] })?.trips ?? [];
      if (trips.length > 0) {
        const tid = trips[0].tripId;
        const recalled = await mcp.call("get-trip", { tripId: tid });
        ctx.tripId = tid;
        persist();
        result = recalled;
        await renderToolResult(turn.body, "get-trip", { tripId: tid }, result, assistantText(result));
        return;
      }
      turn.done(assistantText(result) || "No trips yet — ask me to plan one.");
      return;
    }

    const say = assistantText(result);
    await renderToolResult(turn.body, intent.tool, intent.args ?? {}, result, say);
  } catch (e) {
    console.error(e);
    turn.done("Something glitched between us and the server. Check that it's running, then try again.");
  } finally {
    orb?.classList.remove("listening");
    busy = false;
    scrollToEnd();
  }
}

async function renderToolResult(
  body: HTMLElement,
  toolName: string,
  args: Record<string, unknown>,
  result: CallToolResult,
  say: string,
) {
  const sc = result.structuredContent as { tripId?: string } | undefined;
  if (sc?.tripId) {
    ctx.tripId = sc.tripId;
    persist();
  }

  const tool = mcp!.tools.get(toolName);
  if (tool && toolHasCard(tool)) {
    const slot = document.createElement("div");
    slot.className = "card-slot";
    const sayEl = document.createElement("div");
    sayEl.className = "say";
    sayEl.textContent = say;
    body.innerHTML = "";
    body.append(sayEl, slot);
    try {
      await embedCard({ container: slot, mcp: mcp!, tool, input: args, result });
    } catch (e) {
      console.error("card embed failed:", e);
    }
  } else {
    const sayEl = document.createElement("div");
    sayEl.className = "say";
    sayEl.textContent = say;
    body.innerHTML = "";
    body.append(sayEl);
  }
  scrollToEnd();
}

/* ---------------- wiring ---------------- */

async function boot() {
  statusEl.hidden = false;
  statusText.textContent = "Connecting to the MCP server…";
  try {
    mcp = await connectMcp(MCP_URL);
    statusEl.hidden = true;
    const turn = addTurn();
    turn.done(
      ctx.day > 1 || ctx.tripId
        ? `Welcome back — day ${ctx.day}, and I still remember our plans. What are we doing today?`
        : "I'm Alexa+ (simulated). I answer with interfaces, not monologues. Ask me to plan a weekend.",
    );
    void maybeRunDemo(api);
  } catch (e) {
    console.error(e);
    statusText.textContent =
      `Can't reach the MCP server at ${MCP_URL}. Start it with \`npm start\` in the repo root, then retry.`;
  }
}

$("#status-retry").addEventListener("click", boot);

sendBtn.addEventListener("click", () => void handleUser(inputEl.value));
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void handleUser(inputEl.value);
});
micBtn.addEventListener("click", () => inputEl.focus());
newDayBtn.addEventListener("click", () => newDay());
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => void handleUser(chip.textContent ?? ""));
});

function newDay() {
  threadEl.innerHTML = "";
  setDay(ctx.day + 1);
  ctx.tripId = null; // the day turns over; the memory (conversationId) stays
  persist();
  const turn = addTurn();
  turn.done("Morning. New day — same memory. Ask me what we booked, if you like.");
}

/* ---------------- wire overlay + truth tag (demo / verification) ---------------- */

const uiFlags = new URLSearchParams(location.search);
if (uiFlags.has("demo") || uiFlags.has("wire")) {
  $("#wire").hidden = false;
  $("#truth-tag").hidden = false;
  const logEl = $("#wire-log");
  window.addEventListener("sdt:mcp-call", (e) => {
    const name = (e as CustomEvent).detail ?? "?";
    const line = document.createElement("div");
    line.className = "wire-line";
    line.textContent = `→ tools/call ${name}`;
    logEl.appendChild(line);
    while (logEl.children.length > 7) logEl.firstElementChild?.remove();
  });
}

/* ---------------- demo-mode API (used by demo.ts and e2e) ---------------- */

export const api = {
  send: (text: string) => handleUser(text),
  newDay,
  clickInCard: (selector: string) => {
    const frames = threadEl.querySelectorAll<HTMLIFrameElement>(".card-frame");
    const doc = frames[frames.length - 1]?.contentDocument;
    const el = doc?.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`demo click: ${selector} not found in card`);
    el.click();
  },
  scrollCardTo: (selector: string) => {
    const frames = threadEl.querySelectorAll<HTMLIFrameElement>(".card-frame");
    const doc = frames[frames.length - 1]?.contentDocument;
    const el = doc?.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`demo scroll: ${selector} not found in card`);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  },
  caption: (text: string) => {
    const el = $("#captions");
    el.innerHTML = text;
    el.hidden = false;
  },
  hideCaptions: () => { $("#captions").hidden = true; },
  typeAndSend: async (text: string, cps = 26) => {
    inputEl.value = "";
    inputEl.focus();
    for (const ch of text) {
      inputEl.value += ch;
      await new Promise((r) => setTimeout(r, 1000 / cps));
    }
    await new Promise((r) => setTimeout(r, 240));
    await handleUser(text);
  },
};

void boot();
