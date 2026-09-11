# Judging map — how each criterion is evidenced in this repo

This file has one purpose: for every line of the scoring rubric, point at **the artifact a
judge can open and check**. It doubles as the pre-submission self-check — the last section
lists what must be true before the form is submitted.

Two verification commands cover almost everything below:

```bash
npm start &                 # MCP server → http://localhost:3001/mcp
node scripts/smoke.mjs      # 11/11 checks, no credentials required
```

Last verified: **2026-09-12** — unit tests **30/30** (`npm test`), smoke **11/11**
(`scripts/smoke.mjs`), wire-level e2e **27/27** (`scripts/e2e.mjs` — hermetic temp
data dir, real MCP wire traffic, on-card confirmation code matched against that
store, fail-closed negatives, `?preview` gating, zero pageerrors; evidence at
`artifacts/e2e-evidence.json`), restart-recall **7/7**
(`scripts/restart-recall.mjs`). One command: `npm run verify`.

---

## 1. Stage 1 — pass/fail gate

Stage 1 asks two binary questions. Both are answered by code, not prose.

| Gate | Question | Evidence | Verifiable how |
|---|---|---|---|
| **Theme fit** | Is this an Alexa+ track project? | Self-hosted MCP server + Agent Skill + MCP Apps card, built for the track's stated creative directions (cross-session state, purchasing, media cards, Agent Skills) | `README.md`; `packages/server/src/server.ts`; `skill/show-dont-tell/SKILL.md` |
| **Runtime use of the required technology** | Is the track tech *imported and actually called* — not just named? | `@modelcontextprotocol/server` and `@modelcontextprotocol/ext-apps/server` are imported and exercised: `new McpServer(...)` at `packages/server/src/server.ts:69` and six `registerAppTool` calls at `:76, :128, :169, :190, :229, :276`; `NodeStreamableHTTPServerTransport` and `app.all("/mcp")` at `packages/server/src/index.ts:21,24` | `npm start` then `node scripts/smoke.mjs`; the served endpoint answers `tools/list` with 6 tools |
| **Spec version ≥ 2025-11-25 over Streamable HTTP** | Rules require 2025-11-25 "or a later version, once confirmed" | **MCP spec 2025-11-25** — the SDK's current `LATEST_PROTOCOL_VERSION`; served session-lessly (`sessionIdGenerator: undefined`, no `Mcp-Session-Id`) over `POST /mcp` with an SSE-tolerant reader | `node -e "import('@modelcontextprotocol/server').then(m=>console.log(m.LATEST_PROTOCOL_VERSION))"` → `2025-11-25`; `packages/server/src/index.ts:18-24`; `scripts/smoke.mjs` |
| **Agent Skill deliverable** (if claiming one) | Is there a working `SKILL.md` in the open format? | `skill/show-dont-tell/SKILL.md` — directory name matches the `name` field, `description` covers what *and* when, `license` / `compatibility` / `metadata` present, single-level references | Read the frontmatter; optional `skills-ref validate skill/show-dont-tell` |
| **Repo requirements** | Public repo with an OSI license, code reachable | `LICENSE` (MIT) at repo root; public at https://github.com/er-s-an/show-dont-tell; `.gitignore` excludes `node_modules/`, `dist/`, `.data/` | Open the repo URL in a private window |

## 2. Stage 2 — the four equally weighted criteria

### 2.1 Tech Implementation

| Claim | Evidence in the repo | Check |
|---|---|---|
| Serves MCP **session-lessly** | `packages/server/src/index.ts:24` — fresh server + transport per request, `sessionIdGenerator: undefined`, `Server.connect()` passes the version list to the transport; no `Mcp-Session-Id` is ever issued | `grep -rn "sessionId\|initialize" packages/server/src` returns only that one comment line; `curl -i` shows no `Mcp-Session-Id` response header |
| **Streamable HTTP** transport, plus stdio fallback | `@modelcontextprotocol/node` transport on `POST /mcp` (`index.ts:21-33`); `StdioServerTransport` path at `index.ts:60` | `npm start`; `curl -X POST localhost:3001/mcp` returns a JSON-RPC error object rather than a 404 |
| **Six real tools**, not one generic wrapper | `plan-weekend-trip` (`server.ts:76`), `adjust-trip` (`:128`), `get-trip` (`:169`), `list-trips` (`:190`), `book-hotel` (`:229`), `confirm-booking` (`:276`) | `scripts/smoke.mjs` check 1: `tools/list returns 6 tools` |
| **MCP Apps** delivery of a real UI | `registerAppTool` declares `_meta.ui.resourceUri = ui://trip/itinerary.html` (`server.ts:22,92`); `registerAppResource` serves the built single-file card (`server.ts:329-337`); card implemented with the `App` class and `ontoolresult` (`packages/cards/itinerary/main.ts:202,210`) | smoke check 2 (`declares a ui resource`) and check 11 (`ui resource serves the built card`, asserts the rendered HTML is > 100 KB) |
| **Computed, not canned** | Scoring engine: `scoreVenue` (`packages/server/src/engine.ts:15`) weights rating, "iconic", dog-friendliness and budget; `pickForSlot` filters by constraint before ranking; `buildDays` / `pickHotels` / `estimateTotal` (`:40,57,73`) | smoke check 5: after `adjust-trip`, the non-dog-friendly venues (hot-air balloon, spa) are gone and the Sunday pick changed |
| **Two-phase purchase with an enforced guard** | `book-hotel` sets `status: "requires_confirmation"` + single-use token with a 10-minute expiry (`server.ts:250-262`); `confirm-booking` rejects a mismatched or expired token (`server.ts:296-298`) and only then sets `confirmed` (`:299`) | smoke checks 6–8: the quote carries no charge, a wrong token is refused, the correct token yields a confirmation code |
| **Cross-session state** | `TripStore` with atomic file persistence (`packages/server/src/state/store.ts:51,71-74`), indexed by `conversationId` (`:89`); `conversationId` is an explicit tool input (`server.ts:88`) | smoke checks 9 and 10: `get-trip` returns the booked state in a later call, and `list-trips` still finds the trip |
| **Verification harness** | `scripts/smoke.mjs` — 11 end-to-end checks over plain HTTP, no credentials, no mock framework | `node scripts/smoke.mjs` → `11/11 passed` |

### 2.2 Design

| Claim | Evidence | Check |
|---|---|---|
| A real design system, not inline styles | `packages/cards/shared/design-system.css` — warm editorial tokens (paper surfaces, Playfair Display + Inter, Alexa-blue accents), shared by all views | Read the token block at the top of the file |
| Interface, not a screenshot: the card is interactive | Hotel selection, `Book` button, confirm sheet, dog-friendly adjustment, all wired to real tool calls (`packages/cards/itinerary/main.ts:160-168,228-293`) | Run the card in an MCP Apps host and click through; `docs/card-in-host.png` shows a render |
| Purchase presented as a trust surface | Confirm sheet with itemised rows and total plus the literal line *"Nothing is booked until you confirm. Quote held for 10 minutes."* (`main.ts` `openSheet`) | Grep the built card: `grep -o "Nothing is booked[^<]*" packages/cards/dist/itinerary/index.html` |
| Motion with intent, and motion that yields | Total counts up on arrival (`main.ts:101-111`); card **adopts the host's theme and style variables** (`main.ts:218-222`); full `prefers-reduced-motion` support both in the card logic (`main.ts:91`) and globally in CSS (`design-system.css:472`) | Search the CSS for the media query; the count-up is skipped when reduced motion is set |
| Restraint in the voice layer | `SKILL.md` §Voice notes: spoken replies under 25 words when a card is on screen; name the numbers that matter | `skill/show-dont-tell/SKILL.md:44-47` |

### 2.3 Potential Impact

| Claim | Evidence | Check |
|---|---|---|
| Solves a limitation voice genuinely has | Complex, multi-constraint tasks (compare, adjust, commit) are exactly where audio-only answers fail — the thesis of `README.md` and the 0:00–0:12 hook of `docs/demo-script.md` | Read the intro of `README.md` |
| The risky moment — committing to pay — is handled with a real safety property | Quote and confirm are separate tools; the token is single-use and expires; the refusal path is tested, not asserted (`server.ts:250-262,296-298`; `scripts/smoke.mjs`). The booking itself is a simulated commitment — no hotel API or payment provider is called | smoke checks 6–8 |
| Continuity that users actually ask for | "Which hotel did we book?" works days later, without any session to hold it, because the store is explicit (`store.ts`; `SKILL.md:21-23`) | smoke checks 9–10 |
| The answer leaves the screen | Optional real push via ntfy.sh on confirmation (`server.ts:305-318`) — verified live; a paired watch buzzes only if the phone relays it, and devices are not shown in the current video | Set `NTFY_TOPIC`, confirm a booking, receive the notification |
| Honest scope = defensible impact | The project states plainly that Alexa+ cannot render MCP Apps yet and that the voice surface is simulated, then shows the capability built only on the standards the track points to | First paragraph of `README.md`; disclosure beats at 0:12 in `docs/demo-script.md` |

### 2.4 Quality of the Idea

| Claim | Evidence | Check |
|---|---|---|
| Not on the rules' "obvious" list | It is not a single-turn Q&A bot, and not a 1:1 REST wrapper: tools model *trip state transitions* (plan → adjust → quote → confirm → recall) rather than API endpoints | Compare `server.ts` tool set against the rules' obvious/creative examples |
| Hits four of the track's named creative directions | **Cross-session state** (`store.ts`), **purchasing** (two-phase booking), **media/cards** (MCP Apps `ui://` resource), **Agent Skills** (`SKILL.md`) | One file each, listed above |
| The interface is the answer, and that is enforced in the orchestration layer | `SKILL.md` Golden rule 1: "when a tool returns a card, the card IS the answer… never transcribe a card's contents into a text wall" (`SKILL.md:18-20`) | Read `SKILL.md:16-30` |
| A design decision, not a guess, about the platform | Serving without a session pushes memory into ownable product code, and the protocol revision is treated as a deliberate, testable choice rather than a changelog claim | `packages/server/src/index.ts:24`; §3.4 of `docs/product-feedback.md`; the "What we learned" section of `docs/submission.md` |

## 3. Friction log (+10% in Stage 1)

The rules award up to **+10%** for a friction log, assessed by Amazon's own team in
Stage 1 and carried into Stage 2. This repo has one, kept from day one, and the log is
also load-bearing: one of its entries produced a real architectural constraint.

| Entry | Where | Why it earns the bonus |
|---|---|---|
| `registerAppTool` crashes on a tool with no `_meta` (`TypeError: Cannot read properties of undefined (reading 'ui')`, ext-apps 2.0.0) — with workaround and a proposed upstream fix | `friction-log.md` §1 | A real bug in the official SDK's MCP Apps helper, with a reproduction and a one-line fix. Reported, not just endured |
| ext-apps starter template's build script implicitly requires bun while the README lists only Node.js | `friction-log.md` §2 | A real onboarding defect on the first ten minutes of card development, with two concrete remedies |
| Alexa+ documents no contract for how it consumes an MCP server (spec version, transport, auth, UI support) | `docs/product-feedback.md` §3.3 | The highest-impact finding: it changes what a team can build. Written up constructively, with four escalating suggestions |
| The SDK serves the newest protocol revision only through its `createMcpHandler` entry; a hand-constructed server silently keeps serving 2025-11-25 and answers `-32601` to `server/discover` | `docs/product-feedback.md` §3.4 | A trap that produces an undefendable version claim. Found by probing the running server rather than trusting the changelog, with the exact error text, the source-level explanation and a four-part fix proposal |
| The consequence of those entries | `docs/submission.md`, "Challenges" and "What we learned"; `docs/demo-script.md`, 0:12 beat | The log is shown to have **changed the work twice** — we built on the public standards and simulated the host rather than guessing at an unpublished integration, and every version claim in these docs is now pinned to a live probe |

## 4. Pre-submission self-check

**Pass/fail items (must be true):**

- [x] Repo is **public**, with `LICENSE` (MIT) visible in the About area —
  https://github.com/er-s-an/show-dont-tell
- [x] Runtime hook is genuinely exercised — ✅ verified 11/11 via `scripts/smoke.mjs`
- [ ] Demo video is **under 3 minutes**, public, and shows the experience running —
  recorded from the current production build by `scripts/record-demo.mjs`
  (`docs/demo-video/show-dont-tell-demo.webm`, 71s, 720p, captioned; shows the wire
  calls, the fail-closed kill-and-restart act, and the recall);
  **YouTube/Vimeo upload is the remaining human step**
- [ ] Product feedback submitted — it is mandatory (*`docs/product-feedback.md`* is
  ready to paste)
- [x] All materials in English — ✅ this docs set and the repo docs are English

**Scoring items (should be true):**

- [x] `packages/simulator/` implemented and able to drive the real server — verified
  end-to-end by `scripts/e2e.mjs` (27/27, wire-level, hermetic)
- [x] `README.md` quickstart matches reality — `npm run dev -w @sdt/simulator` works;
  the truth table in the README labels Implemented / Simulated / Planned per claim
- [x] **Protocol-revision claim matches the running server.** The server answers
  2025-11-25 and *rejects* `MCP-Protocol-Version: 2026-07-28` with
  `-32000 Unsupported protocol version`; `server/discover` returns `-32601`. Every doc
  claims 2025-11-25 only. If the `createMcpHandler` migration (§3.4 of
  `docs/product-feedback.md`) lands, re-run that probe and only then update the version
  claim here and in `docs/submission.md` / `docs/demo-script.md`. **Never claim a
  revision without a request that proves it** — a judge can check it with one `curl`
- [x] `npm test` runs — 30 unit tests across engine and store, 30/30
- [x] Friction log entries dated and current — `friction-log.md` holds three entries,
  including the protocol-era finding (`docs/product-feedback.md` §3.4)
- [x] Open Source mini challenge PR opened against `modelcontextprotocol/ext-apps`
  (the `_meta` guard) — **ext-apps#775**, currently OPEN (review not yet answered as of
  2026-09-11); rules state a merged PR is not required
- [x] AWS Builder mini challenge — **left unticked**: no Bedrock / AgentCore / Strands /
  SageMaker / Kiro Crew usage
- [x] Fail-closed card — a failed tool call surfaces an error toast and books nothing;
  local simulation exists only behind exactly `?preview=1` (`?preview=0` and friends
  fail closed, proven by the e2e); the e2e's negative backend-down run exits non-zero
- [x] Portable cold start — fresh clone → `npm ci` → `npm run build` →
  `npx playwright install chromium` → `npm run verify` is green on Node 20/22/25;
  the e2e runs hermetically against a temp `SDT_DATA_DIR` and hash-checks that the
  repo `.data` is untouched
- [x] Card hygiene — all server-interpolated fields escaped before `innerHTML`; the
  `ui://` resource declares `_meta.ui.csp` for the two Google Fonts domains; fonts
  degrade to local serif/sans stacks under a strict host

**Things a judge will look for, and where they are:**

| Judge instinct | Where it is satisfied |
|---|---|
| "Does it actually run?" | `npm install && npm run build && npm start`; `scripts/smoke.mjs` → 11/11 |
| "Is the purchase real or theatre?" | Two-phase tools, expiring token, tested refusal path (`server.ts:250-298`) — honestly labelled a simulated commitment with the safety property enforced |
| "Is the card real or a mockup?" | `ui://trip/itinerary.html` served as an MCP Apps resource from the built single-file bundle |
| "Did they use the required technology at runtime?" | SDK v2 imports and calls in `server.ts` and `index.ts` |
| "Which protocol revision does this actually serve?" | 2025-11-25 (the required version) over Streamable HTTP, session-less — verifiable with one `curl`; the 2026-07-28 upgrade is documented as verified-but-uncommitted in §3.4 of `docs/product-feedback.md` |
| "Are they honest about what's simulated?" | `README.md` truth table, `docs/submission.md`, and the 0:12 disclosure in the demo script |
| "Does the memory survive a restart?" | `node scripts/restart-recall.mjs` → 7/7: confirm against one process, recall from a fresh one |
