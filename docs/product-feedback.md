# Product feedback — Alexa+ / MCP developer experience

Team: **Show, Don't Tell** (Alexa+ track, *Build, Ship, Shape: Amazon Developer Hackathon*)
Collected: **2026-09-10 → 2026-09-11**, while building a self-hosted MCP server, an MCP
Apps card and an Agent Skill from scratch. Raw log with dates and severity:
[`friction-log.md`](../friction-log.md) — §3.1 and §3.2 are logged there; §3.3 and §3.4
were found by probing the running server and the published specs, and are written up here.

Everything below is from first-hand use. Where we could not verify something, we say so
rather than guess.

---

## 1. Which tools and platforms did you use?

| Tool / standard | Version | How we used it |
|---|---|---|
| **MCP specification** | **2025-11-25** (required version) | Built the server against it: Streamable HTTP on `POST /mcp`, session-less serving (fresh server + transport per request, no `Mcp-Session-Id`) |
| **MCP specification** | 2026-07-28 (next revision) | Attempted, and this is the most useful thing we learned — see §3.4. The installed SDK advertises 2025-11-25 as its latest and rejects a 2026-07-28 request unless the server is created through its `createMcpHandler` HTTP entry |
| **MCP TypeScript SDK v2** | `@modelcontextprotocol/server` 2.0.0, `/node` 2.0.0, `/express` 2.0.0 | Server, Streamable HTTP transport (`POST /mcp`), Express host |
| **MCP Apps** | `@modelcontextprotocol/ext-apps` 2.0.0, spec 2026-01-26 (stable) | `registerAppTool` + `registerAppResource`, one `ui://trip/itinerary.html` view written with the `App` class |
| **MCP TypeScript SDK** | `@modelcontextprotocol/client` 2.0.0 | Client-side types inside the card view |
| **Agent Skills** | open standard, `agentskills.io/specification` | Shipped `skill/show-dont-tell/SKILL.md` (orchestration rules) |
| **Alexa+ for Builders** | preview, announced 2026-07-23 | Evaluated as the integration target; could not test it (see §3.3) |
| **ntfy.sh** | public service | Optional push on confirmed booking (the demo's phone/watch notification) |

Runtimes: Node.js 22, TypeScript 5.9, Vite 6, Express 5, Zod 4.

## 2. What worked well

**Serving without a session is genuinely simpler to deploy, and it is the single best
decision we made.** We did not need sticky sessions, a session store, or a stateful proxy:
each request gets a fresh server instance and a transport with
`sessionIdGenerator: undefined`, and the server runs behind ordinary HTTP. The SDK's own
documentation calls this "the established stateless idiom," and it is exactly right for a
self-hosted server whose host may be running anywhere. It also made our architecture
honest — with no session to lean on, "remember this trip" stopped being a transport
accident and became an explicit, testable store in our own code. Anyone building an
Alexa+-facing server today should serve it statelessly.

**SDK v2 is coherent and the adapters are the right shape.** `createMcpExpressApp` plus
`NodeStreamableHTTPServerTransport` gave us a working endpoint in a handful of lines, and
splitting `server` / `client` / `node` / `express` into separate packages made the
dependency surface obvious (the difference between what the server needs and what the
card view needs was visible at install time, not at runtime).

**MCP Apps is the most product-shaped thing in the ecosystem.** In an afternoon we had a
card that adopts the host's theme and style variables, renders a two-day itinerary,
re-scores itself in place when the user changes a constraint, and carries a purchase
confirm sheet. Two specific things are well designed: the contract is *data in, UI out*
(`_meta.ui.resourceUri` + structured tool output) rather than a bespoke rendering API;
and the view can call other server tools through the host (`app.callServerTool`), which
is what makes in-place adjustment possible at all. The `ui://` resource is a single
self-contained HTML file in our build, so there is nothing to deploy beside the server.

**Agent Skills turned out to be a restraint mechanism, not documentation.** Writing
`SKILL.md` forced us to state rules an agent would otherwise improvise, e.g. "never chain
`book-hotel` into `confirm-booking` in a single turn" and "when a card is on screen, keep
the spoken reply under 25 words." Those are exactly the invariants that a JSON schema
cannot express. The format itself is small, readable and self-documenting; the
progressive-disclosure model (metadata always loaded, body on activation, resources on
demand) matched how we wanted to distribute orchestration logic.

**Errors are legible.** The failure messages told us where to look within minutes, and the
smoke harness — eleven checks over plain HTTP, seven of them tool calls — was enough to
verify the whole purchase and recall path without any mock framework.

## 3. What should be improved

Four items, ordered by how much they cost us. The first two are in the raw log with
reproduction steps; the third is a documentation gap, not a bug, and it is the biggest
single source of uncertainty for anyone entering this track; the fourth is a trap we
walked into ourselves and would most want fixed.

### 3.1 `registerAppTool` crashes when a tool has no UI — Medium

**What we did:** registered a text-only tool with no `_meta` (a legal shape — not every
tool returns a card).

**Expected:** a missing or empty `_meta` is tolerated.

**Actual:** the first request died with
`TypeError: Cannot read properties of undefined (reading 'ui')`. In ext-apps 2.0.0,
`registerAppTool` dereferences `config._meta.ui` with no guard.

**Workaround:** pass `_meta: {}` on every tool (this is what our server does today; see
`packages/server/src/server.ts`, the `list-trips` tool).

**Suggested fix:** either default inside the helper (`config._meta ?? {}`) or, better,
mark `_meta` as **required** in the `registerAppTool` TypeScript signature so the failure
appears at compile time instead of on the first request. A runtime `TypeError` on a
plausible input is the kind of thing an agent-host integration will hit in production.
We consider this upstream-worthy and intend to open a PR (see the Open Source mini
challenge).

### 3.2 The `basic-server-vanillajs` starter template silently requires bun — Low

**What we did:** followed the ext-apps README's Getting Started for the starter server.

**Expected:** the README's stated prerequisites (Node.js 20+) plus `npm run build`.

**Actual:** the build script runs `bun build server.ts ...` and fails immediately in a
Node-only environment. The README does not mention bun anywhere.

**Workaround:** `brew install bun`, or replace the build step with `tsc` / `esbuild`.

**Suggested fix:** list bun in the prerequisites, or use a Node-native bundler so the
template's promise matches the template's requirements. This is a small thing that costs
every newcomer the same ten minutes — and it is the first ten minutes, which is the worst
place to lose someone.

### 3.3 There is no public documentation for how Alexa+ consumes an MCP server — highest impact

This is a gap, not a bug, and we want to be precise about it.

**What we did:** tried to build the integration the Alexa+ track describes — bring your
own MCP server so Alexa+ can use it.

**What we found:** Amazon's July 2026 announcement says Alexa+ will inspect an MCP
server, propose an integration path and generate a simulator-ready package. That is the
entire public specification. We could not find answers to any of the questions a
developer actually has:

- Which MCP **spec versions** does Alexa+ accept — 2025-11-25 only, or 2026-07-28 too?
  The rules allow "a later version, once confirmed," but nothing says how confirmation happens.
- Which **transport** endpoints does the platform call, and from where? Does it reach a
  locally hosted server, or must it be public HTTPS?
- What is the **authorization** model? Pre-registered client, CIMD, or something Amazon-specific?
- What **capabilities** does the platform expose to a tool — can it render any UI
  (MCP Apps), or is output text/audio only?
- What does a **"simulator-ready package"** mean as an artifact?

**Why this matters more than the others:** the Alexa+ track's rules tell
entrants to follow the open MCP docs, which we did. But we could only make the *server*
side definitive; every decision about the *integration* was an educated guess. A team
with less spec experience would reasonably conclude that the Alexa+ surface is untestable
and build a generic MCP demo instead — which is exactly the "basic MCP wrapper" the same
rules list as the obvious, non-creative outcome. The documentation gap quietly pushes
submissions toward the thing the judges don't want.

**Suggested fix, in increasing order of usefulness:**

1. **Publish a one-page integration contract** for Alexa+ ⇄ MCP: supported spec version(s),
   transport, URL requirements, auth mechanism, and whether server-initiated UI is
   rendered. Even a draft table would remove most of the uncertainty.
2. **Publish one worked example** — a minimal public MCP server plus the exact steps to
   get it into the Alexa+ simulator, with the request/response trace the platform sends.
   One real log is worth more than a page of prose.
3. **State the UI roadmap explicitly**, even if the answer is "not supported yet." A
   sentence like "Alexa+ currently renders text and audio only; MCP Apps rendering is on
   the roadmap" would let teams design for it honestly instead of hedging in the video.
4. **Open the Alexa+ for Builders portal** (or publish its acceptance criteria and
   timeline) — today it is the only path to a real integration, and there is no visible
   way in for an individual developer or a hackathon team.

**What we did instead:** built strictly on the open, versioned standards the track points
to (MCP 2025-11-25 over Streamable HTTP, MCP Apps, Agent Skills) so nothing is wasted
whichever way the platform lands, and made the demo a simulator of the Alexa+ experience
rather than a claim about the unverifiable integration. We would much rather have been
able to test against the real thing.

### 3.4 The newest protocol revision is opt-in, and nothing tells you that — Medium

This one is our own near-miss, and it is the finding we would most want the SDK team to
see, because it is a trap for exactly the kind of team this hackathon attracts.

**What we did:** read the 2026-07-28 changelog, designed around the newer revision, and
hand-wired our endpoint the obvious way — one `McpServer` and one
`NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })` per request,
`server.connect(transport)`, `transport.handleRequest(...)`. That is the pattern shown in
most existing 2.x code.

**What we found when we checked:** the installed `@modelcontextprotocol/server@2.0.0`
(npm `latest`) exports `LATEST_PROTOCOL_VERSION = "2025-11-25"` and
`SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05",
"2024-10-07"]`. Sending a request with `MCP-Protocol-Version: 2026-07-28` gets:

```
-32000 Bad Request: Unsupported protocol version: 2026-07-28
(supported versions: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05, 2024-10-07)
```

`server/discover` (mandatory in that revision) answers `-32601 Method not found`.

**The thing that is easy to miss:** the SDK *does* implement the modern revision — there
is a 2026-era codec, `FIRST_MODERN_PROTOCOL_VERSION = "2026-07-28"`, and cache-hint
machinery in the same build. It is served by the SDK's HTTP entry point,
`createMcpHandler(...)`, which also installs the `server/discover` handler. Servers
constructed by hand keep serving the legacy era and answering `-32601`, and **nothing
warns you**: no deprecation notice, no log line, no type error. We only caught it because
we sent a request with the modern header and read the error. A source comment in the
package confirms it ("Hand-constructed instances are unaffected… they keep answering
`-32601` unless their own supported-versions list opts into a modern revision"), but that
is not where a developer looks.

**Why it matters beyond us:** the whole point of the newer revision is the stateless,
envelope-per-request model. A team that *thinks* it is on 2026-07-28 but is quietly
serving 2025-11-25 has a version claim they cannot defend, and judges and integrators
absolutely can check it with one `curl`. We nearly shipped that claim.

**Suggested fix:** make the era visible and deliberate.

1. **Emit a startup warning** when a server is constructed with no modern revision in its
   supported list, naming the entry point that serves one.
2. **Put `SUPPORTED_MODERN_PROTOCOL_VERSIONS` in the default set** (or document in the
   README which entry point serves which eras, in a table).
3. **Expose the era on the instance** so a server can log or assert what it is actually
   serving, and add one line to the docs: "hand-constructed servers serve the legacy era
   by default."
4. **Ship a version-assertion in the reference smoke test** — a single request with the
   modern header that fails loudly when the answer is `Unsupported protocol version`. It
   costs the SDK team nothing and prevents an entire class of unfounded compliance claims.

**On our side:** the migration is confined to `packages/server/src/index.ts` (serve
through `createMcpHandler`). We verified locally that it works — the entry answers
`server/discover` with `{"supportedVersions":["2026-07-28"]}` and returns the revision's
required `ttlMs` / `cacheScope` list hints — and we are sequencing it before the deadline
rather than claiming it in advance.

## 4. Onboarding experience

**Getting a server running: fast.** With SDK v2 and a session-less transport we had a
working Streamable HTTP endpoint answering `tools/list` on day one. The 2026-07-28
changelog is well written and the breaking changes are clearly enumerated, which made the
version question a decision rather than a discovery process — though, as §3.4 shows, the
SDK currently serves the older revision by default, so the decision and the delivered
behavior were not the same thing.

**Getting a card on screen: fast, then fiddly.** The `_meta.ui.resourceUri` → `ui://`
resource → sandboxed iframe model was easy to grasp and we had an interactive card
rendering quickly. The fiddly part is that a card is developed against a *host*, and the
host is the variable: theme variables, style variables and available capabilities differ.
Two asks: (a) a documented, versioned list of what the host guarantees to a view, and
(b) a first-class local dev host in the SDK so card development does not start with
"which host do I test in?"

**Agent Skills: the smoothest part of the whole project.** One directory, one `SKILL.md`
with YAML frontmatter, optional `scripts/` and `references/`. The spec's field
constraints (name ≤ 64 chars and matching the parent directory, description 1–1024
characters covering both what and when) are checkable by reading, and the validation tool
(`skills-ref validate`) is the right size for the job.

**The confusing part was scope, not mechanics.** The Alexa+ track offers "a working Agent
Skill **or** a self-hosted MCP server." Those are different deliverables with different
runtime hooks, and the product feedback questions assume both are platform integrations.
We resolved it by shipping both, with the skill driving the server, which is the only
combination where the Agent Skill has something real to orchestrate. That is worth
clarifying in the track description — "or" left us guessing about what the judges weigh.

**Friction cost, summed up:** roughly an hour lost to the two tooling bugs in §3.1 and
§3.2, a further afternoon to the protocol-era trap in §3.4, and substantially more than
that deciding how to present an integration we could not test.

## 5. Would we use these again?

**Yes — MCP, SDK v2, MCP Apps and Agent Skills, without hesitation.** The session-less
serving model made deployment simpler, MCP Apps gave our product an interface instead of a
text response, and Agent Skills gave it rules. Between them they cover the three things
this project needed: tools, UI, and judgment. Two concrete caveats, both fixable: we would
serve through the SDK's `createMcpHandler` entry from day one (§3.4) so that the protocol
revision we chose is the one we actually speak, and we would verify the served version
with a request rather than with a changelog. We are also planning to move our confirmation
step onto MRTR (`resultType: "input_required"`) once we are on the 2026-07-28 revision,
which is the spec-native version of the two-phase purchase we ship today.

**On Alexa+ specifically: yes, and that is the point of this feedback.** The concept is
the most interesting voice surface we have seen, because it is the first one with a
credible path to real interfaces and real transactions. What is missing is not
capability — it is a contract we can build against. Publish the integration page and the
portal, and this goes from "we built for the standards and simulated the host" to "we
built for Alexa+."

**One more request, for the standards community rather than Amazon:** the ecosystem is
currently excellent at *server-side* DX and thin on *view-side* DX. The template bug and
the unguarded `_meta` read are both small, but they land on the very first steps of card
development, which is precisely where MCP Apps is trying to compete for adoption.
