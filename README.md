# Show, Don't Tell

**Voice names the intent. The interface carries the consequence. The human keeps the final word.**

Voice assistants learned to listen and to talk — but for anything complex, an
answer you *hear* is worse than an answer you can *see, edit, and act on*. This
project shows what Alexa+ conversations could feel like when a complex answer is a
**generated, interactive interface**. Maya asks for a first weekend away with her
partner; when she remembers their newly adopted dog Pepper, the same itinerary
reshapes in place. In this simulator, the card presents a quote and waits for a separate confirmation click. The server validates the pending quote and its single-use token; it does not authenticate a human gesture. Napa is the current proof dataset, not the product.

Built for the **Alexa+ track** of *Build, Ship, Shape: Amazon Developer
Hackathon* — implemented using open standards: a self-hosted
**MCP server** (spec 2025-11-25, Streamable HTTP — the hackathon's required
minimum, served statelessly; see `friction-log.md` #3 for what 2026-07-28
would take) and an **MCP Apps** interactive card. A companion **Agent Skill contract**
documents the intended orchestration, but no model host loads it in this build.

## Why

- Complex plans benefit from a persistent interface for comparison, adjustment, and review.
- We have not verified MCP Apps rendering in an actual Alexa+ host. The repository therefore includes an
  explicitly labelled web simulation that exercises the real server and card.

## What's real, what's simulated

| Claim | Status | Proof / notes |
|---|---|---|
| MCP server, spec 2025-11-25 over Streamable HTTP, session-less | **Implemented** | `node scripts/smoke.mjs` — 11/11 |
| Six tools + `ui://trip/itinerary.html` MCP Apps resource | **Implemented** | smoke + `node scripts/e2e.mjs` — 27/27 |
| Trip engine (curated 22-venue Napa dataset, constraint scoring) | **Implemented demo data** | unit tests 31/31; dataset is hand-written, not live inventory |
| Two-phase booking: quote → confirm, single-use expiring token | **Implemented — simulated booking** | No hotel/payment provider is called; `confirm-booking` changes local state and issues a confirmation code. It is a *simulated booking commitment with an enforced confirmation token*, and the refusal path is tested |
| Fail-closed card | **Implemented** | A failed MCP call surfaces an error in the card — never a fake success (local simulation exists only behind exactly `?preview=1`; `?preview=0` & co. fail closed, proven by the e2e) |
| Cross-session trip memory | **Implemented capability** | File-backed store keyed by `conversationId`; proven across a server-process restart by `node scripts/restart-recall.mjs` |
| Phone push on confirm (ntfy.sh) | **Optional code path, not demo evidence** | Disabled by default. It can send only when both `SDT_ALLOW_NTFY=1` and a non-empty `NTFY_TOPIC` are set; no device receipt is claimed |
| Alexa+ voice surface | **Simulated** | `packages/simulator` — typed text stands in for speech; Alexa+ host rendering was not available for us to test |
| Simulator "planner" | **Deterministic router, not an agent** | `packages/simulator/src/planner.ts` maps phrases to tool calls by regex — it stands in for the model an MCP host would supply. No runtime model reasoning is claimed |
| Agent Skill contract | **Included, not runtime-proven** | `skill/show-dont-tell/SKILL.md` is a portable orchestration contract; no model host loads it at runtime in this build |
| 2026-07-28 revision / MRTR | **Planned, scoped** | `friction-log.md` #3, `docs/product-feedback.md` §3.3 |

## What's in the box

| Piece | Where | What it is |
|---|---|---|
| MCP server | `packages/server` | Trip-planning engine: curated dataset + constraint scoring, cross-session trip memory, two-phase booking (quote → confirm) |
| Cards | `packages/cards` | MCP Apps views. Warm editorial design system, hand-drawn SVG scenes, micro-interactions, `prefers-reduced-motion` support |
| Agent Skill contract | `skill/show-dont-tell` | Portable orchestration rules; included as an artifact, not presented as runtime host evidence |
| Simulator | `packages/simulator` | An Alexa+-style web simulation: typed requests drive the real server and card |
| Docs | `docs/` | Architecture, demo script, product feedback, judging map |
| Friction log | `friction-log.md` | Real developer-experience findings, kept since day one |

## Quickstart

Requires Node.js ≥ 20 (verified on 20 / 22 / 25).

```bash
npm ci
npm run build
npm start          # MCP server → http://localhost:3001/mcp
```

Try it with any MCP client over Streamable HTTP, or run the experience
simulator:

```bash
npm run dev -w @sdt/simulator   # → http://localhost:5173
```

Optional external notification testing requires an explicit double opt-in:

```bash
SDT_ALLOW_NTFY=1 NTFY_TOPIC=your-private-topic npm start
```

`NTFY_TOPIC` alone does nothing. Verification and rehearsal harnesses forcibly
disable notifications even when the parent shell contains that variable.

## Verify it

Every layer is hermetic: the harnesses spawn their own servers against
throwaway data dirs and never touch the repo-local `.data/`.

```bash
npm ci
npm run build
npx playwright install chromium   # one-time: browser for the wire-level e2e
npm run verify                    # unit → smoke → restart recall → browser e2e
```

`npm run verify` runs, in order:

| Stage | What it proves | Count |
|---|---|---|
| `npm test -w @sdt/server` | engine + store + notification-isolation unit tests | 31 |
| `scripts/smoke.mjs` | full golden path over real JSON-RPC, wrong-token refusal, ui resource | 11 |
| `scripts/restart-recall.mjs` | a booking survives a server-process kill + restart (same store) | 7 |
| `scripts/e2e.mjs` | wire-level browser run of the production build: real MCP traffic observed, card confirmation code checked against the server's temp-dir store, zero pageerrors | 27 |

The e2e additionally proves the fail-closed contract — confirm-before-quote,
book-before-plan, wrong / reused / expired tokens are all refused — and that
the standalone card only fakes success behind exactly `?preview=1`
(`?preview=0`, `?preview=true`, and no param all fail closed). Each run writes
`artifacts/e2e-evidence.json` (git HEAD, Node/npm, lockfile hash, Chromium
version, store hash, observed MCP methods, every check).

The simulator can be pointed at any server with a query param, which is how
the production build is tested: `http://localhost:5173/?mcp=http://host:port/mcp`.
`SDT_QUOTE_TTL_MS` overrides the quote lifetime so the expiry refusal is
testable without a 10-minute wait.

## How it works

```
You: "Plan a weekend in Napa for two"
        │
        ▼
MCP host (the simulator ships a            plan-weekend-trip ──▶ engine scores venues
deterministic stand-in; no model-host          against your constraints
runtime is claimed) ──▶
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

Continuity lives in the server's trip store (`conversationId`). In the simulator,
"New day" means a new transcript with the same simulated identity—not a new user
session. Separately, `scripts/restart-recall.mjs` proves that the store survives a
full server-process restart.

## Submission materials

The completed English review film is 128 seconds, including recorded local UI, narration, and captions. The public video URL is managed during submission; the source repository does not claim a video upload or Devpost receipt before those are verified.

- [Project story and submission text](docs/submission.md)
- [Detailed product feedback](docs/product-feedback.md)
- [Final film narration and evidence boundaries](docs/demo-script.md)
- [Release validation and submission status](docs/VIDEO-READY.md)
- [Evidence map](docs/judging-map.md)

## License

MIT — see [LICENSE](./LICENSE).
