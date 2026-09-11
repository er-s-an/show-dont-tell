# Show, Don't Tell

**Alexa+ answers, as interfaces.**

Voice assistants learned to listen and to talk — but for anything complex, an
answer you *hear* is worse than an answer you can *see, edit, and act on*. This
project shows what Alexa+ conversations look like when a complex answer is a
**generated, interactive interface**: ask for a weekend trip and you get an
itinerary card; adjust it in place; book the hotel from a confirm sheet that
cannot be confirmed without an explicit tap.

Built for the **Alexa+ track** of *Build, Ship, Shape: Amazon Developer
Hackathon* — entirely on the open standards Alexa+ just adopted: a self-hosted
**MCP server** (spec 2025-11-25, Streamable HTTP — the hackathon's required
minimum, served statelessly; see `friction-log.md` #3 for what 2026-07-28
would take), **MCP Apps** interactive cards, and an **Agent Skill** for
orchestration.

## Why

- Voice-only answers fail complex tasks: no memory, no comparison, no action.
- Alexa+ can't render interactive cards from MCP servers *yet*. Instead of
  waiting, we built that future on the standards themselves — and a simulator
  that lets you experience it today.

## What's real, what's simulated

| Claim | Status | Proof / notes |
|---|---|---|
| MCP server, spec 2025-11-25 over Streamable HTTP, session-less | **Implemented** | `node scripts/smoke.mjs` — 11/11 |
| Six tools + `ui://trip/itinerary.html` MCP Apps resource | **Implemented** | smoke + `node scripts/e2e.mjs` — 16/16 |
| Trip engine (curated 22-venue Napa dataset, constraint scoring) | **Implemented demo data** | unit tests 30/30; dataset is hand-written, not live inventory |
| Two-phase booking: quote → confirm, single-use expiring token | **Implemented — simulated booking** | No hotel/payment provider is called; `confirm-booking` changes local state and issues a confirmation code. It is a *simulated booking commitment with an enforced confirmation token*, and the refusal path is tested |
| Fail-closed card | **Implemented** | A failed MCP call surfaces an error in the card — never a fake success (local simulation exists only behind `?preview=1`) |
| Cross-session trip memory | **Implemented capability** | File-backed store keyed by `conversationId`; proven across a server-process restart by `node scripts/restart-recall.mjs` |
| Phone push on confirm (ntfy.sh) | **Optional, implemented** | Fires only with `NTFY_TOPIC` set; verified live. A paired watch buzzes only if the phone routes the notification |
| Alexa+ voice surface | **Simulated** | `packages/simulator` — typed text stands in for speech; Alexa+ cannot render MCP Apps today |
| Simulator "planner" | **Deterministic router, not an agent** | `packages/simulator/src/planner.ts` maps phrases to tool calls by regex — it stands in for the model an MCP host would supply. No runtime model reasoning is claimed |
| Agent Skill loaded by a host at runtime | **Planned** | `skill/show-dont-tell/SKILL.md` is the orchestration contract; no host loads it at runtime yet |
| 2026-07-28 revision / MRTR | **Planned, scoped** | `friction-log.md` #3, `docs/product-feedback.md` §3.4 |

## What's in the box

| Piece | Where | What it is |
|---|---|---|
| MCP server | `packages/server` | Trip-planning engine: curated dataset + constraint scoring, cross-session trip memory, two-phase booking (quote → confirm) |
| Cards | `packages/cards` | MCP Apps views. Warm editorial design system, hand-drawn SVG scenes, micro-interactions, `prefers-reduced-motion` support |
| Agent Skill | `skill/show-dont-tell` | The orchestration rules: when to talk, when to show, confirm-before-charge |
| Simulator | `packages/simulator` | An Alexa+-style web experience that drives the real server (voice-in, cards-out) |
| Docs | `docs/` | Architecture, demo script, product feedback, judging map |
| Friction log | `friction-log.md` | Real developer-experience findings, kept since day one |

## Quickstart

Requires Node.js ≥ 20.

```bash
npm install
npm run build
npm start          # MCP server → http://localhost:3001/mcp
```

Try it with any MCP client over Streamable HTTP, or run the experience
simulator:

```bash
npm run dev -w @sdt/simulator   # → http://localhost:5173
```

Optional: set `NTFY_TOPIC` to get a real phone push (ntfy.sh) when a booking
confirms — and if your phone relays notifications to a paired watch, that's
the demo's "watch buzzes" moment.

## How it works

```
You: "Plan a weekend in Napa for two"
        │
        ▼
MCP host (any agentic client; the          plan-weekend-trip ──▶ engine scores venues
simulator ships a deterministic               against your constraints
stand-in) ──▶
        │
        ▼
ui://trip/itinerary.html  (MCP Apps card)
        │
        ▼
Interactive itinerary — adjust in place, pick a hotel
        │
book-hotel  ──▶  quote (requires_confirmation + token)   ← nothing confirmed
        │
        ▼  you confirm on the card
confirm-booking ──▶ booked · confirmation code · optional phone push
```

Cross-session memory lives in the server's trip store (`conversationId`), so
"what was that hotel we booked?" works days later — the store survives server
restarts, and `scripts/restart-recall.mjs` proves it.

## License

MIT — see [LICENSE](./LICENSE).
