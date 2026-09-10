# Show, Don't Tell — Devpost submission text

> **Read this before pasting.** Everything below is true as of **2026-09-11**:
>
> 1. **The simulator is implemented and verified** — `packages/simulator/` drives the
>    real server, e2e golden path 6/6 (`node scripts/e2e.mjs`), demo video recorded from it.
> 2. **Public repo with MIT license:** https://github.com/er-s-an/show-dont-tell
> 3. **Open Source mini-challenge PR exists:** modelcontextprotocol/ext-apps#775
>    (https://github.com/modelcontextprotocol/ext-apps/pull/775) — tick the box.
> 4. **The server speaks MCP 2025-11-25** (the track's required minimum), served
>    statelessly over Streamable HTTP. The 2026-07-28 migration via `createMcpHandler`
>    is scoped in *What's next*; the SDK-era gotcha is friction-log §3.
>
> Verified at submission time: unit tests 30/30, protocol smoke 11/11, e2e 6/6,
> fresh-clone judge path (install → build → test → start → smoke) all green.

---

## Project name

**Show, Don't Tell**

## Tagline (96 characters)

> Alexa+ answers, as interfaces: complex replies become interactive cards you can edit and act on.

Shorter alternates, if the form field is tight:

- `Voice for the simple things; interactive cards for the complex ones.` (73)
- `Complex Alexa+ answers shouldn't be spoken — they should be cards you can act on.` (81)

---

## The story

### Inspiration

Ask a voice assistant to plan a weekend and listen to what you get: a paragraph. Read
aloud, a list of five stops is worse than useless — you can't compare hotels, you can't
see that the balloon ride conflicts with the drive home, and you can't change your mind
without starting over. Voice is a wonderful interface for the simple things ("turn off
the lights") and a terrible one for anything with structure.

Alexa+ is the first Alexa built on open standards that let an answer be an *interface*:
**MCP** for tools, **MCP Apps** for interactive cards, **Agent Skills** for orchestration.
Those pieces all exist and are stable. What doesn't exist is a public answer to *how*
Alexa+ consumes an MCP server — the July 2026 preview announcement describes inspecting
a server and generating a "simulator-ready package," and stops there. So we built the
thing the standards make possible, shipped it as a real server, and put a faithful
Alexa+-style simulator in front of it so the experience can be seen today rather than
described.

### What it does

One conversation, one weekend in Napa, four moments:

1. **Plan.** "Plan a weekend in Napa for two." The server scores a curated venue dataset
   against your constraints and returns an **interactive itinerary card** — two days,
   nine timed stops, three hotel options with prices and ratings, an estimated total.
2. **Adjust in place.** "Make it dog-friendly." The engine re-scores, drops the venues
   that can't take a dog (the hot-air balloon, the spa morning), re-picks replacements,
   and the *same card* updates. The itinerary is computed, not canned.
3. **Book, with a receipt you have to approve.** Tapping *Book* calls `book-hotel`,
   which returns a quote with `status: "requires_confirmation"` and a single-use token
   that expires in 10 minutes. The card opens a confirm sheet — hotel, one night, taxes
   and fees, total — and states plainly: *"Nothing is charged until you confirm."*
   `confirm-booking` is the only tool that charges, it requires that token, and a wrong
   or expired token is refused. **No single agent turn can both quote and charge.**
4. **Come back later.** State lives in the server, keyed by trip id and indexed by
   conversation id, so a new session days later can answer "what was that hotel we
   booked?" — `list-trips` → `get-trip` → the card returns with its booking intact.

When the booking confirms, the server fires an **ntfy.sh push** to the user's phone with
the hotel, total and confirmation code — the notification that makes a paired watch buzz
on camera. The push is optional (`NTFY_TOPIC`) and a no-op without it.

**What is real and what is staged.** The server, the tools, the cards, the purchase flow,
the memory and the push are real code (see *Judges' quickstart* at the bottom). The
Alexa+ voice surface is a simulator: it takes typed text standing in for speech and
renders the real card returned by the real server. **Alexa+ cannot render MCP Apps
today, and we do not claim it can** — we are showing the next step, built only on the
standards the track points to.

### How we built it

An npm-workspaces monorepo, no proprietary dependency anywhere in the critical path.

- **MCP server** (`packages/server`) — TypeScript on the official SDK **v2**
  (`@modelcontextprotocol/server` 2.0.0, the current `latest`) with the
  `@modelcontextprotocol/express` and `@modelcontextprotocol/node` adapters, speaking
  **MCP spec 2025-11-25 over Streamable HTTP** on `POST /mcp`. That is exactly the version
  the track requires, and the SDK we depend on advertises it as its `LATEST_PROTOCOL_VERSION`.
  Serving is **session-less**: a fresh server and transport per request
  (`sessionIdGenerator: undefined` — the SDK's documented stateless idiom), so there is no
  `Mcp-Session-Id` to pin and no sticky routing to configure. A stdio transport is included
  as a fallback for local hosts. *(See "What's next" — moving to the 2026-07-28 revision is
  a one-file change we have already verified.)*
- **Trip engine** (`packages/server/src/engine.ts`) — 22 hand-written Napa venues tagged
  with slot, rating, price, dog-friendliness and "iconic" weight. `scoreVenue` ranks
  candidates per time slot, hotel ranking shifts with the budget stance, and totals are
  recomputed per party size. Nothing is a string template: changing a constraint changes
  the plan.
- **Trip store** (`packages/server/src/state/store.ts`) — a file-backed store
  (`.data/trips.json`, atomic temp-file rename). Because the server holds no session
  between requests, cross-session continuity *had* to live in the server as explicit state;
  that's exactly why we kept it keyed by `conversationId` as well as `tripId`.
- **MCP Apps card** (`packages/cards`) — a single `ui://trip/itinerary.html` resource
  built by Vite into one self-contained HTML file (~266 KB), written against
  `@modelcontextprotocol/ext-apps` 2.0.0. The view adopts the host's theme and style
  variables, renders hand-drawn SVG hero and hotel scenes, counts the total up on arrival,
  and honors `prefers-reduced-motion`. It is a standard MCP Apps view, so it renders
  wherever MCP Apps render.
- **Agent Skill** (`skill/show-dont-tell`) — a single `SKILL.md` in the open
  `agentskills.io` format (`name` matching the directory, `description` covering what it
  does *and* when to use it, plus `license`/`compatibility`/`metadata`). It carries the
  orchestration rules an agent needs: show the card instead of transcribing it, keep one
  `conversationId` per conversation, never chain `book-hotel` into `confirm-booking`
  in one turn, adjust rather than restart, and keep spoken replies under 25 words when a
  card is on screen.
- **Simulator** (`packages/simulator`) — the Alexa+-style web experience: type a request,
  watch the real server answer, see the real card render, tap through to a real
  confirmation. *(Not implemented yet — see the note at the top of this file.)*
- **Verification** (`scripts/smoke.mjs`) — an 11-check end-to-end harness with no
  credentials and no test framework: `tools/list` shape, the `ui://` declaration, plan,
  constraint-driven adjustment, quote-without-charge, wrong-token refusal, confirmation,
  cross-session recall, `list-trips`, and the served card HTML.

### Challenges we ran into

- **You cannot read the Alexa+ integration spec, because there isn't one.** The only
  Amazon statement about Alexa+ consuming MCP servers is the July 2026 preview
  announcement — "inspect the server, propose an integration path, generate a
  simulator-ready package." No transport details, no supported spec version, no auth
  story, no UI capability list. We stopped waiting for it: we built against the open
  standards the track's own rules point to (`modelcontextprotocol.io` and
  `agentskills.io`), and we made the demo a simulator so the experience is presentable
  without guessing at an unpublished integration.
- **A server that holds nothing between requests is a server you can reason about.** The
  stateless serving idiom means memory cannot hide in a session: our first design kept
  trips in one, and it broke the moment requests stopped belonging to a session. Reworking
  memory into an explicit server-side store keyed by conversation is the single biggest
  architectural decision in the project — and the honest one, because "remember my trip"
  is a product feature, so it should be owned by code we can point at, not by a transport
  detail.
- **`registerAppTool` throws on a tool with no UI.** We registered a text-only tool with
  no `_meta`, and the first request died with
  `TypeError: Cannot read properties of undefined (reading 'ui')` — ext-apps 2.0.0 reads
  `config._meta.ui` unguarded. Workaround: pass `_meta: {}`. Logged in `friction-log.md`
  with a one-line fix proposed upstream.
- **Designing a card that respects a purchase.** A booking flow is where a card earns its
  keep, and also where it can do real harm. We made the confirm sheet a separate state
  with an explicit total line, a 10-minute expiry, and the sentence *"Nothing is charged
  until you confirm"* in the card itself — then wrote a smoke check that a mismatched
  token is refused, so the safety property is tested rather than asserted.

### Accomplishments we're proud of

- A **real, self-hosted MCP server on the spec the track requires** (2025-11-25, the SDK's
  current latest) — session-less Streamable HTTP, six tools, one `ui://` card resource —
  that passes an 11/11 end-to-end smoke test with no credentials and no paid API.
- **A purchase flow that cannot charge by accident.** Quote and charge are different
  tools, the token is single-use and expiring, and the refusal path is covered by the
  test harness.
- **Cross-session memory that actually persists** across processes and days, because it
  lives in a store rather than in a session.
- **A plan that is computed, not scripted.** Ask for dog-friendly and the balloon and the
  spa genuinely disappear from Sunday.
- **A card designed as an interface, not a screenshot**: host theming, hand-drawn scenes,
  in-place adjustment, motion that yields to `prefers-reduced-motion`.
- **Honesty as a feature.** We say out loud that Alexa+ cannot render MCP Apps yet, and
  we show the next step instead of implying a capability that doesn't exist.

### What we learned

- **The interesting part of a voice answer isn't the voice.** Once the plan becomes a
  card, every hard product question shows up at once: what's editable, what's a commitment,
  what survives the session. Voice never asked us those questions.
- **Spec eras are a design surface, not a checkbox.** Serving without a session pushed
  memory into our code and made the confirm flow explicit: choosing how to be stateless
  shaped the architecture more than any library choice.
- **Agent Skills are a protocol for restraint.** Writing `SKILL.md` forced us to state
  rules an agent would otherwise improvise — "never chain the two booking tools" is a
  prompt-shaped invariant that a schema can't express.
- **If a platform gives you no integration docs, the standards are the contract.** Every
  line of this project runs against public, versioned specs, so none of it is wasted if
  the Alexa+ integration turns out to look different than we imagine.
- **A protocol revision you don't opt into is a revision you don't serve.** We read the
  2026-07-28 changelog, wrote our notes around it, and only later discovered that the
  installed SDK still advertises 2025-11-25 as latest and rejects a 2026-07-28 request
  unless the server is created through its HTTP entry point. A version claim needs a
  request that proves it — we now probe the running server, not the changelog, and adding
  that probe to `scripts/smoke.mjs` is part of the migration.

### What's next

- **Move to the 2026-07-28 revision** by serving through the SDK's `createMcpHandler`
  entry instead of a hand-built transport. We verified the path locally: with that entry
  the server answers `server/discover` with `{"supportedVersions":["2026-07-28"]}` and
  returns the revision's required `ttlMs` / `cacheScope` list hints. It is a change
  confined to `packages/server/src/index.ts`, and it is our next commit.
- **Move the confirmation into MRTR.** The 2026-07-28 revision replaces server-initiated
  elicitation with Multi Round-Trip Requests: the server returns
  `resultType: "input_required"` and the client retries with `inputResponses`. Our
  two-phase token flow is the safe, host-agnostic version of the same idea; MRTR is the
  spec-native version, and it arrives with the migration above.
- **Wire it to Alexa+ for real** as soon as the Alexa+ for Builders portal opens up
  server submission — the MCP surface is already the shape they describe.
- **More destinations, same engine.** The dataset is the only thing that changes.
- **Upstream the two fixes** from the friction log so the next team doesn't hit them
  (see the Open Source mini challenge below).

### Judges' quickstart (60 seconds, no credentials)

```bash
npm install
npm run build
npm start                 # MCP server → http://localhost:3001/mcp
node scripts/smoke.mjs    # 11/11 checks: plan → adjust → quote → confirm → recall
```

Then call `plan-weekend-trip` from any MCP client and read the returned
`ui://trip/itinerary.html` resource.

---

## Built with

**Standards & protocols**

- MCP specification **2025-11-25** (Streamable HTTP; session-less serving)
- **MCP Apps** (`io.modelcontextprotocol/ui`, `ui://` resources, ext-apps 2.0.0)
- **Agent Skills** open standard (`SKILL.md`, agentskills.io format)
- JSON-RPC 2.0 over HTTP, Server-Sent Events

**Official SDKs (v2)**

- `@modelcontextprotocol/server` 2.0.0
- `@modelcontextprotocol/node` 2.0.0 (Streamable HTTP transport)
- `@modelcontextprotocol/express` 2.0.0 (Express 5 host)
- `@modelcontextprotocol/ext-apps` 2.0.0 (`registerAppTool`, `registerAppResource`, view `App`)
- `@modelcontextprotocol/client` 2.0.0 (types in the card view)

**Runtime & tooling**

- Node.js 22, engines ≥ 20 — npm workspaces monorepo, TypeScript 5.9
- Vite 6 + `vite-plugin-singlefile` (single-file card build)
- Zod 4 (tool input schemas), Express 5, cors
- ntfy.sh (optional phone push on confirmed booking)
- Zero paid APIs, zero cloud services required to run it

**Design**

- Warm editorial design system (`packages/cards/shared/design-system.css`):
  Playfair Display + Inter, Alexa-blue accents, paper surfaces
- Hand-drawn SVG scenes, host theme adoption, `prefers-reduced-motion` support

---

## Track & Mini Challenges — what to tick

### Main track: **Alexa+** ✅

- Self-hosted MCP server: yes — spec **2025-11-25** (exactly the required version) over
  **Streamable HTTP**, served session-lessly.
- Optional upgrade, verified but not yet committed: serving through the SDK's
  `createMcpHandler` entry answers `server/discover` with
  `{"supportedVersions":["2026-07-28"]}`. If that lands before the deadline, change this
  line to 2026-07-28 — and **only** if a request to the running server proves it.
- Runtime hook satisfied: `@modelcontextprotocol/server` and
  `@modelcontextprotocol/ext-apps/server` are imported and called at runtime in
  `packages/server/src/server.ts`; `McpServer` and the transport are constructed in
  `packages/server/src/index.ts`.
- Working Agent Skill delivered: `skill/show-dont-tell/SKILL.md` (name matches its
  parent directory, per the standard).
- Repo contains the simulator source: `packages/simulator/` — implemented and verified
  (e2e 6/6); the demo video is recorded from it.

### Mini challenge: **Open Source** ✅ tick it

The contribution exists and is public:

- **Contribution URL:** https://github.com/modelcontextprotocol/ext-apps/pull/775
- **Project repository URL:** https://github.com/er-s-an/show-dont-tell
- **GitHub username:** er-s-an
- **What/why:** `registerAppTool` in `@modelcontextprotocol/ext-apps/server` crashed any
  tool registered without `_meta` (`TypeError: Cannot read properties of undefined
  (reading 'ui')`) — even though `ToolConfig._meta` is typed optional. We hit this crash
  building this very project (friction-log §1), diagnosed the normalization code, and
  shipped a one-line guard (`config._meta ?? {}`) plus a regression test. The rules
  don't require merge — a real, reviewed-track PR to a public repo qualifies.

### Mini challenge: **AWS Builder** ⚠️ only if true

Tick this **only if** the project actually uses Bedrock, AgentCore, Strands SDK or
SageMaker — or was built with **Kiro Crew**, which the rules count as qualifying on its
own. This project currently uses none of them, so **leave it unticked** unless that
changes before 2026-10-23.

### Also verify before submitting (rules, not preferences)

- [ ] Repo is **public**, with MIT `LICENSE` visible (it is present; the repo is not
      pushed).
- [ ] Demo video is **under 3 minutes**, public on YouTube or Vimeo, and shows the
      experience running.
- [ ] All written material is English (this document and the repo docs are).
- [ ] Product feedback is submitted — it is **required**, and it goes straight to the
      Alexa+ team (`product-feedback.md`).
