# Show, Don't Tell

**Alexa+ answers, as interfaces.**

Voice assistants learned to listen and to talk — but for anything complex, an
answer you *hear* is worse than an answer you can *see, edit, and act on*. This
project shows what Alexa+ conversations look like when a complex answer is a
**generated, interactive interface**: ask for a weekend trip and you get an
itinerary card; adjust it in place; book the hotel from a confirm sheet that
never charges you without an explicit tap.

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

## What's in the box

| Piece | Where | What it is |
|---|---|---|
| MCP server | `packages/server` | Real trip-planning engine: curated dataset + constraint scoring, cross-session trip memory, two-phase booking (quote → confirm) |
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
confirms — the demo's "watch buzzes" moment.

## How it works

```
You: "Plan a weekend in Napa for two"
        │
        ▼
Agent (any MCP host) ──▶ plan-weekend-trip ──▶ engine scores venues
        │                                        against your constraints
        ▼
ui://trip/itinerary.html  (MCP Apps card)
        │
        ▼
Interactive itinerary — adjust in place, pick a hotel
        │
book-hotel  ──▶  quote (requires_confirmation + token)   ← nothing charged
        │
        ▼  you confirm on the card
confirm-booking ──▶ booked · confirmation code · phone/watch buzz
```

Cross-session memory lives in the server's trip store (`conversationId`), so
"what was that hotel we booked?" works days later.

## License

MIT — see [LICENSE](./LICENSE).
