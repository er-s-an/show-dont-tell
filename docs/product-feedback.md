# Product feedback — Alexa+ / MCP developer experience

Project: **Show, Don't Tell** — Alexa+ track, *Build, Ship, Shape: Amazon Developer Hackathon*.

This feedback combines the project's dated September 10–12 development notes with direct inspection of the installed packages, current source and September 12 local demonstration. The implemented server and card are distinguished from the simulated Alexa+ host. We have not verified rendering or execution inside an actual Alexa+ host.

## 1. Which tools and platforms did you use?

| Tool | Version or status in this build | Actual use |
|---|---|---|
| MCP | 2025-11-25 | Self-hosted Streamable HTTP endpoint at `POST /mcp`; a fresh server and transport are constructed per request. |
| MCP TypeScript SDK | `@modelcontextprotocol/server`, `/node`, `/express`: 2.0.0 | Server, HTTP transport and Express adapter. The installed server package exports `LATEST_PROTOCOL_VERSION = "2025-11-25"`; rechecked September 12. This is a statement about our installed version, not npm's current latest release. |
| MCP Apps | `@modelcontextprotocol/ext-apps` 2.0.0 | Tool-to-view metadata, one `ui://trip/itinerary.html` resource, and a card that calls server tools through the host bridge. |
| Agent Skills | Included portable contract | `skill/show-dont-tell/SKILL.md` describes intended orchestration. No model host loads it at runtime in this build. |
| Alexa+-style simulator | Implemented local web simulation | Typed text stands in for speech. A deterministic phrase router selects the trip tools; it is not a model-powered autonomous agent. |
| Build and application tooling | npm workspaces, TypeScript, Vite, Express, Zod | Monorepo build, self-contained card resource, runtime HTTP endpoint and schema validation. |
| ntfy.sh | Optional code path, unused in the film | Disabled unless both `SDT_ALLOW_NTFY=1` and a non-empty topic are supplied. Fresh capture forcibly disabled it. |

The prototype uses curated Napa example data. Hotel inventory, prices and booking commitments are simulated. No real reservation is made and no money moves.

## 2. What worked well?

**Structured output could remain an interface throughout the task.** A request produces an itinerary card rather than a long reply. The same card receives the adjusted tool result when Maya adds Pepper. In our fresh local demonstration, the visible plan changes from nine activities to eight and three stays to two; the example itinerary estimate changes from $1,369 to $609. These are changes in this fixture, not a claim about cost savings for travelers.

**Explicit state made continuity inspectable.** Stateless HTTP serving pushed trip state into a file-backed store keyed by trip and conversation identifiers. In the recorded flow, `New day` clears the transcript while retaining the same simulated identity. `list-trips` and `get-trip` then return the same hotel and simulated receipt. The visible result can be compared directly with the earlier confirmation. A separate earlier restart harness covers process-restart persistence; the film does not substitute a transcript reset for that test.

**Tool calls from the card support a useful review flow.** The first hotel action returns an itemized quote. A separate card click calls `confirm-booking`. This gives the person time to inspect one night, fees and total before the demo records its simulated commitment. The server validates pending state and a single-use, expiring quote token. We distinguish that mechanism from proof of human authorization: the server does not authenticate the click or forbid an arbitrary client from calling both tools in sequence.

**The Skill format helped us state intentions clearly.** The included contract says when to show the card, retain the conversation identifier and keep quote and confirmation separate. That is useful distribution documentation. Its presence does not establish that a host executes those rules, so runtime claims rest on the server and card.

## 3. What should be improved?

### 3.1 Tolerate omitted `_meta` in `registerAppTool`

**Task:** register a tool that returns text without a UI resource.

**Expected:** omitting UI metadata is accepted, or rejected with a clear validation/type error.

**Observed:** the dated development log records `TypeError: Cannot read properties of undefined (reading 'ui')`. Direct inspection of the installed ext-apps 2.0.0 helper still shows the unguarded path: it assigns `config._meta`, then reads `.ui` from that value. The declaration treats metadata as optional.

**Current workaround:** our text-only `list-trips` tool passes `_meta: {}`.

**Suggested improvement:** normalize omitted metadata to an empty object and add regression coverage for both omitted and empty metadata. Preserve the ability to register tools that do not render a card. A clear compile-time requirement would also be preferable to an unexplained runtime dereference.

Related contribution URL recorded by the project: [ext-apps PR #775](https://github.com/modelcontextprotocol/ext-apps/pull/775). This feedback does not claim the contribution was accepted or merged.

### 3.2 Make starter build prerequisites explicit

**Task:** build the `basic-server-vanillajs` starter using its Node-oriented setup path.

**Observed:** the checked-out template's `package.json` contains `bun build` commands. The dated project notes report that this was not apparent from the setup prerequisites and blocked a Node-only attempt.

**Workaround:** install the required Bun runtime, or use a Node-based bundling step in the application.

**Suggested improvement:** make the template's prerequisites match its actual scripts. A small clean-environment build check would catch a README that promises a Node-only path while relying on another executable. This feedback applies to the inspected template snapshot; it does not claim every current template has the issue.

### 3.3 Make the served protocol revision visible

**Task:** determine which MCP revision an installed SDK and a chosen serving entry point actually expose.

**Observed now:** our pinned SDK exports 2025-11-25 as its default version. The project's current entry creates `McpServer` and `NodeStreamableHTTPServerTransport` directly. Its source has not been migrated to `createMcpHandler`.

**Recorded earlier:** the September 11 debug notes report an unsupported-version error for a 2026-07-28 request on the original entry, and describe a separate successful experiment using the newer HTTP entry. That experiment is not the implementation shown in the film and was not rerun during this material refresh.

**Suggested improvement:** provide a compact table mapping each SDK entry point to its default/supported revisions, log the served revision at startup, and include a version assertion in the reference smoke example. “The package contains support” and “this running endpoint serves that revision” should be easy to distinguish without reading internal comments.

**Our current choice:** keep the submission claim at 2025-11-25. Any migration must be followed by a fresh request against the changed endpoint before the claim changes.

### 3.4 Provide an explicit Alexa+ host test contract

**Task:** test the server and interactive card with the platform targeted by the project.

**Boundary encountered:** during the team's September 10–11 research, we did not establish an accessible host integration path that we could use to verify this experience. Our present build remains a labelled web simulation. This is an account of what we could test, not a blanket claim that Alexa+ lacks MCP Apps support or that no later platform documentation exists.

**What would help:** a versioned integration page stating accepted MCP revisions, transport and endpoint requirements, authorization, UI capabilities, and the exact form of a simulator-ready artifact. A minimal worked example with an actual host request/response trace would let developers separate server correctness from host compatibility.

UI support should be stated directly as supported, unsupported or preview/conditional. We would then know which capabilities to test instead of inferring them from the general standards.

### 3.5 Include a same-card update and sizing example

**Task:** change an existing itinerary without losing the card's connection or making the changed result hard to see.

**Current implementation:** the simulator retains the active iframe in its DOM position, moves the new utterance above it, and sends the result through the existing bridge. It measures the real card content and keeps the trigger and change summary in view. The fresh recording and capture metadata show exactly one card before and after the adjustment.

**Suggested improvement:** provide a small reference host test for tool-result updates, iframe sizing, long-content scrolling and reduced-motion behavior. The example should demonstrate a continuing interaction, not just the initial successful render. These host details directly affect whether a person understands what changed.

### 3.6 Separate interface confirmation from authorization guarantees

**Task:** explain what a two-step quote/confirm example actually guarantees.

**Finding from our own implementation:** a distinct confirmation control and an expiring token make the demonstrated state transition clearer. They do not by themselves prove that a human authorized the action. A client holding the token can call the confirmation tool.

**Suggested improvement:** sample applications should label three separate responsibilities: the interface presents and captures a decision; the server validates the quote and state transition; the production host or application supplies any required user authorization. This would discourage teams from describing a prompt instruction or tool split as an unbreakable safety boundary.

## 4. How was the onboarding experience?

The server/transport adapters and tool-to-resource mapping gave us a practical starting point. The difficult parts were matching the installed SDK's served revision to our wording, and implementing the host behavior around a continuing card. The comments and current code now make those responsibilities explicit.

The dated development notes also record a cross-version Node test-entry issue. The current server package uses a shell-expanded `node --test dist/test/*.test.js` command. We retain the existing recorded Node 20/22/25 results rather than presenting them as a new matrix run from this feedback refresh.

For the latest film, we built a scratch copy of the current source, used a temporary store, disabled notifications and blocked nonlocal browser requests. That gave us a reproducible local path through the real MCP endpoint while preserving the original working tree and data. A similarly isolated example in the starter documentation would help teams capture demonstrations without accidental external effects.

## 5. Would we use these tools again?

Yes, for this interaction pattern. MCP supplies the tools, MCP Apps supplies a continuing interface, and explicit application state makes the result inspectable when the person returns. The strongest next improvement is a verified host integration path and clearer boundaries around versioning, view behavior and authorization.

The current experience already supports the story we can demonstrate: plan, adjust, review, record a simulated commitment and recall. We would not add an unverified model-agent, live inventory or payment claim simply to make the description sound more advanced.
