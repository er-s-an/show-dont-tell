# Show, Don't Tell — Devpost submission text

> **Submission source, updated September 12, 2026.** Operator notes are separate from the project story.
>
> - The English review film is complete: 128 seconds, 1080p30, narration and captions, including 79 seconds of recorded local product UI. The public video URL is supplied during submission.
> - Repository: https://github.com/er-s-an/show-dont-tell (MIT). Recorded contribution: https://github.com/modelcontextprotocol/ext-apps/pull/775. No acceptance or merge claim is made here.
> - The current build uses MCP 2025-11-25 over Streamable HTTP. Newer protocol migration remains proposed.
> - The release validation record is in [VIDEO-READY.md](VIDEO-READY.md). This source publication does not establish that Devpost or Product Feedback has been submitted.

---

## Project name

**Show, Don't Tell**

## Tagline

> Alexa+ answers, as interfaces: complex replies become interactive cards you can edit and act on.

Shorter alternate: `Say what changes. See the plan adapt.`

---

## The story

### Inspiration

Maya has a weekend in mind. Then one detail changes the plan: Pepper, the dog she and
her partner just adopted, is coming too. A spoken request is quick. Comparing its
consequences takes something you can see.

Show, Don't Tell explores an interaction pattern for complex Alexa+ requests:
**express the intent, inspect the plan, review the next step, and return to the saved result.**
A working self-hosted MCP server and MCP Apps card make that pattern observable in an
explicitly labelled Alexa+-style web simulation. The simulator uses a deterministic
phrase router; a companion Agent Skill describes intended orchestration but is not
loaded by a model host in this build.

Travel is the example. Our question is how an assistant can keep a person's changing
intent visible throughout a task.

### What it does

One person, one task, four moments. Napa is the current fixture dataset, not the identity
of the product:

1. **Plan.** "Plan a weekend in Napa for two." The server scores a curated venue dataset
   against your constraints and returns an **interactive itinerary card** — two days,
   nine timed stops, three hotel options with prices and ratings, an estimated total.
2. **Adjust in place.** Maya adds, "Make it dog-friendly." The engine re-scores, drops the venues
   that do not meet that constraint, replaces the selected hot-air-balloon activity,
   and the *same card* updates. The itinerary is computed, not canned.
3. **Book, with a receipt you have to approve.** Tapping *Book* calls `book-hotel`,
   which returns a quote with `status: "requires_confirmation"` and a single-use token
   that expires in 10 minutes. The card opens a confirm sheet — hotel, one night, taxes
   and fees, total — and states plainly: *"Nothing is booked until you confirm."*
   `confirm-booking` is the only tool that marks a booking confirmed, it requires that
   token, and a wrong or expired token is refused. **In this simulator, the card requires
   a separate confirmation click. The server validates a single-use, expiring quote
   token.** That token check does not authenticate a human gesture or prevent an
   arbitrary MCP client from calling both tools in sequence. This is a *simulated
   booking commitment*: no hotel inventory is reserved and no payment provider is called.
4. **Come back later.** State lives in the server, keyed by trip id and indexed by
   conversation id. In the simulator, a new transcript with the same simulated identity
   can answer "what was that hotel we booked?" — `list-trips` → `get-trip` → the card
   returns with its booking intact.
   The memory survives a full server-process restart, proven by
   `node scripts/restart-recall.mjs` (7/7): plan and confirm against one process,
   kill it, recall from a fresh one.

An optional **ntfy.sh** code path can send the hotel, total and confirmation code only
when the operator sets both `SDT_ALLOW_NTFY=1` and a non-empty `NTFY_TOPIC`. It is disabled
by default and forcibly disabled in verification and rehearsal harnesses. No device push
or provider receipt is claimed in the completed local film.

**What is real and what is staged.** The server, the tools, the cards, the two-phase
confirmation flow, memory, and opt-in notification path are real code (see *Judges' quickstart* at
the bottom); the booking itself is a simulated commitment — no real hotel is reserved
and no money moves. The Alexa+ voice surface is a simulator: it takes typed text
standing in for speech and renders the real card returned by the real server. **Public
documentation does not confirm whether an Alexa+ host renders MCP Apps, and we could
not test it** — we are showing the interaction through the rules-permitted web simulation.
One more honesty note: the
simulator's planner is a deterministic phrase router standing in for the model an MCP
host would supply — the server doesn't care which side the model is on.

### How we built it

An npm-workspaces monorepo, no proprietary dependency anywhere in the critical path.

- **MCP server** (`packages/server`) — TypeScript on the official SDK **v2**
  (`@modelcontextprotocol/server` 2.0.0, pinned in this build) with the
  `@modelcontextprotocol/express` and `@modelcontextprotocol/node` adapters, speaking
  **MCP spec 2025-11-25 over Streamable HTTP** on `POST /mcp`. That is exactly the version
  the track requires, and the SDK we depend on advertises it as its `LATEST_PROTOCOL_VERSION`.
  Serving is **session-less**: a fresh server and transport per request
  (`sessionIdGenerator: undefined` — the SDK's documented stateless idiom), so there is no
  `Mcp-Session-Id` to pin and no sticky routing to configure. A stdio transport is included
  as a fallback for local hosts. *(See "What's next" — an earlier experiment explored the newer serving entry;
  that migration is not part of the current film build.)*
- **Trip engine** (`packages/server/src/engine.ts`) — 22 hand-written Napa venues tagged
  with slot, rating, price, dog-friendliness and "iconic" weight. `scoreVenue` ranks
  candidates per time slot, hotel ranking shifts with the budget stance, and totals are
  recomputed per party size. Changing a constraint changes selected venues and totals,
  rather than only changing the wording of the answer.
- **Trip store** (`packages/server/src/state/store.ts`) — a file-backed store
  (`.data/trips.json`, atomic temp-file rename). Because the server holds no session
  between requests, cross-session continuity *had* to live in the server as explicit state;
  that's exactly why we kept it keyed by `conversationId` as well as `tripId`.
- **MCP Apps card** (`packages/cards`) — a single `ui://trip/itinerary.html` resource
  built by Vite into one self-contained HTML file (~266 KB), written against
  `@modelcontextprotocol/ext-apps` 2.0.0. The view adopts the host's theme and style
  variables, renders hand-drawn SVG hero and hotel scenes, counts the total up on arrival,
  and honors `prefers-reduced-motion`. It uses the MCP Apps view API; rendering in
  other hosts still depends on their supported capabilities and has not been claimed here.
- **Agent Skill** (`skill/show-dont-tell`) — a single `SKILL.md` in the open
  `agentskills.io` format (`name` matching the directory, `description` covering what it
  does *and* when to use it, plus `license`/`compatibility`/`metadata`). It carries the
  orchestration rules an agent needs: show the card instead of transcribing it, keep one
  `conversationId` per conversation, never chain `book-hotel` into `confirm-booking`
  in one turn, adjust rather than restart, and keep spoken replies under 25 words when a
  card is on screen. It is an included contract, not runtime model-host evidence.
- **Simulator** (`packages/simulator`) — the Alexa+-style web experience: type a request,
  watch the real server answer, see the real card render, tap through to a server-recorded
  simulated confirmation. Verified end-to-end by `scripts/e2e.mjs` (27/27, wire-level).
- **Verification** (`scripts/verify.mjs` — one command, four stages: unit tests +
  `scripts/smoke.mjs` + `scripts/restart-recall.mjs` + `scripts/e2e.mjs`)
  — an 11-check protocol harness with no credentials and no test framework: `tools/list`
  shape, the `ui://` declaration, plan, constraint-driven adjustment,
  quote-without-confirm, wrong-token refusal, confirmation, cross-session recall,
  `list-trips`, and the served card HTML. The e2e goes further than DOM: it spawns its
  own server against a temp data dir (the repo store is hash-checked untouched),
  watches the real MCP JSON-RPC traffic, matches the on-card confirmation code against
  that store, proves the fail-closed negatives (confirm-before-quote, book-before-plan,
  wrong / reused / expired token), checks that only exactly `?preview=1` enables the
  standalone demo fallback, fails on any browser error, and writes an exact-SHA evidence
  artifact to `artifacts/e2e-evidence.json`. The restart script proves memory across a
  full server-process restart.

### Challenges we ran into

- **We could not find a public Alexa+ integration contract.** The material we found during the September 10–11 research pass
  was the July 2026 preview announcement — "inspect the server, propose an integration path, generate a
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
  with an explicit total line, a 10-minute expiry, and the sentence *"Nothing is booked
  until you confirm"* in the card itself — then wrote a smoke check that a mismatched
  token is refused, so the safety property is tested rather than asserted. And the card
  fails closed: if a tool call errors, the card shows the failure and books nothing —
  the only local simulation left is behind exactly `?preview=1` for design review, and
  the e2e proves `?preview=0` doesn't trip it.

### Accomplishments we're proud of

- A **real, self-hosted MCP server on the spec the track requires** (2025-11-25, the SDK's
  exported default in this installed build) — session-less Streamable HTTP, six tools, one `ui://` card resource —
  that passes an 11/11 end-to-end smoke test with no credentials and no paid API.
- **A visible review step with token validation.** The simulator opens an itemized quote
  and waits for a separate confirmation click. The server checks pending state and a
  single-use, expiring token. This makes the demo's state transition explicit without
  claiming a universal human-authorization guarantee.
- **Cross-session memory that actually persists** across processes and days, because it
  lives in a store rather than in a session — proven by a kill-and-restart harness
  (`restart-recall.mjs`, 7/7), not just asserted.
- **A plan that is computed, not scripted.** Ask for dog-friendly and the selected hot-air
  balloon activity is replaced; options and the estimate are recomputed.
- **A card designed as an interface, not a screenshot**: host theming, hand-drawn scenes,
  in-place adjustment, motion that yields to `prefers-reduced-motion`.
- **Honesty as a feature.** We say that Alexa+ host rendering is unverified, and show the
  interaction in an explicitly labelled simulation instead of inventing platform behavior.

### What we learned

- **The interesting part of a voice answer isn't the voice.** Once the plan becomes a
  card, every hard product question shows up at once: what's editable, what's a commitment,
  what survives the session. Voice never asked us those questions.
- **Spec eras are a design surface, not a checkbox.** Serving without a session pushed
  memory into our code and made the confirm flow explicit: choosing how to be stateless
  shaped the architecture more than any library choice.
- **Agent Skill contracts are a useful protocol for restraint.** Writing `SKILL.md` forced us to state
  rules an agent would otherwise improvise — "never chain the two booking tools" is a
  prompt-shaped invariant that a schema can't express. This build does not load the Skill
  in a model host, so it is a portable contract rather than runtime evidence.
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

- **Evaluate the 2026-07-28 serving entry** using the SDK's `createMcpHandler`.
  An earlier local experiment recorded that with that entry
  the server answers `server/discover` with `{"supportedVersions":["2026-07-28"]}` and
  returns the revision's required `ttlMs` / `cacheScope` list hints. It is a change
  confined to `packages/server/src/index.ts`, and remains outside the film build.
- **Move the confirmation into MRTR.** The 2026-07-28 revision replaces server-initiated
  elicitation with Multi Round-Trip Requests: the server returns
  `resultType: "input_required"` and the client retries with `inputResponses`. Our
  present flow uses separate quote and confirm tools. A future MRTR integration would
  require fresh host and runtime validation before we claim it is implemented.
- **Verify a real Alexa+ host integration** when an applicable test path is available.
  Transport, authorization and rendering capabilities must be tested against that host.
- **Evaluate more destinations.** New data and destination-specific constraints need
  validation; the current demonstrated dataset remains Napa.
- **Follow up on the recorded upstream contribution** and improve the remaining
  documentation issues in the friction log (see the Open Source mini challenge below).

### Judges' quickstart (no credentials)

```bash
npm install
npm run build
npm start                        # MCP server → http://localhost:3001/mcp
node scripts/smoke.mjs           # 11/11 checks: plan → adjust → quote → confirm → recall
node scripts/restart-recall.mjs  # 7/7: booking survives a full server restart
```

The full gate, hermetic and browser-level (one-time browser download first):

```bash
npx playwright install chromium  # one-time, for the wire-level e2e
npm run verify                   # unit 31 → smoke 11 → restart 7 → e2e 27, all green
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

- Node.js, engines ≥ 20 (verified on 20, 22 and 25) — npm workspaces monorepo, TypeScript 5.9
- Vite 6 + `vite-plugin-singlefile` (single-file card build)
- Zod 4 (tool input schemas), Express 5, cors
- ntfy.sh (optional phone push; disabled unless `SDT_ALLOW_NTFY=1` and `NTFY_TOPIC` are both set)
- Zero paid APIs, zero cloud services required to run it

**Design**

- Warm editorial design system (`packages/cards/shared/design-system.css`):
  Newsreader + Instrument Sans, Alexa-blue accents, paper surfaces
  (the isolated film capture used local system-font fallback)
- Hand-drawn SVG scenes, host theme adoption, `prefers-reduced-motion` support

---

## Track & Mini Challenges — what to tick

### Main track: **Alexa+** ✅

- Self-hosted MCP server: yes — spec **2025-11-25** (exactly the required version) over
  **Streamable HTTP**, served session-lessly.
- Proposed upgrade, described in the earlier local experiment: serving through the SDK's
  `createMcpHandler` entry answers `server/discover` with
  `{"supportedVersions":["2026-07-28"]}`. If that lands before the deadline, change this
  line to 2026-07-28 — and **only** if a request to the running server proves it.
- Runtime hook satisfied: `@modelcontextprotocol/server` and
  `@modelcontextprotocol/ext-apps/server` are imported and called at runtime in
  `packages/server/src/server.ts`; `McpServer` and the transport are constructed in
  `packages/server/src/index.ts`.
- Agent Skill contract included: `skill/show-dont-tell/SKILL.md` (name matches its
  parent directory, per the standard). It is not loaded by a model host at runtime;
  the self-hosted MCP server is the project's qualifying track path.
- Repo contains the simulator source: `packages/simulator/` — implemented and verified
  (wire-level e2e 27/27 in the existing engineering record). `scripts/record-demo.mjs`
  remains a rehearsal harness. A separate 128-second English local film is completed;
  its final public URL remains pending.

### Mini challenge: **Open Source** ✅ tick it

Recorded contribution details for submission:

- **Contribution URL:** https://github.com/modelcontextprotocol/ext-apps/pull/775
- **Project repository URL:** https://github.com/er-s-an/show-dont-tell
- **GitHub username:** er-s-an
- **What/why:** `registerAppTool` in `@modelcontextprotocol/ext-apps/server` crashed any
  tool registered without `_meta` (`TypeError: Cannot read properties of undefined
  (reading 'ui')`) — even though `ToolConfig._meta` is typed optional. We hit this crash
  building this very project (friction-log §1), diagnosed the normalization code, and
  shipped a one-line guard (`config._meta ?? {}`) plus a regression test. The contribution link and status should be checked
  at submission time; no acceptance or merge is claimed by this document.

### Mini challenge: **AWS Builder** ⚠️ only if true

Tick this **only if** the project actually uses Bedrock, AgentCore, Strands SDK or
SageMaker — or was built with **Kiro Crew**, which the rules count as qualifying on its
own. This project currently uses none of them, so **leave it unticked** unless that
changes before 2026-10-23.

### Also verify before submitting (rules, not preferences)

- [ ] Current release is reachable at the repository URL with MIT `LICENSE` visible:
      https://github.com/er-s-an/show-dont-tell.
- [x] Local English film is completed: **128 seconds**, 1080p30, with audio and captions.
- [ ] Add the public YouTube/Vimeo URL after upload and verify judge access.
- [ ] All written material is English (this document and the repo docs are).
- [ ] Product feedback is submitted — it is **required**, and it goes straight to the
      Alexa+ team (`product-feedback.md`).
