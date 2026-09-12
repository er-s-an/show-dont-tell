# Friction Log — Show, Don't Tell

Build, Ship, Shape: Amazon Developer Hackathon — Alexa+ track.

These entries preserve the project's dated September 11–12, 2026 development findings. This English edition was prepared on September 12 from the local friction log and refreshed product-feedback document. It does not represent a new run of the original development experiments or a check of upstream release/PR status.

The demonstrated build uses MCP 2025-11-25 over Streamable HTTP. A newer-protocol migration is proposed and is outside the film build. The MCP server and card are real; the Alexa+-style host, speech input, inventory and booking commitments are simulated. The deterministic router is not a model-powered autonomous agent, and the included Agent Skill is not loaded by a model host.

## 1. Omitted metadata crashes a text-only tool

Recorded: 2026-09-11 · Severity: Medium

**Task attempted:** Register an MCP tool without a UI resource.

**Steps taken:**

1. Register a tool with ext-apps 2.0.0 registerAppTool and omit _meta.
2. Start the server and make the initial request.

**Expected result:** Optional metadata may be omitted; a text-only tool can register.

**Actual result:** The dated log records TypeError: Cannot read properties of undefined (reading 'ui').

**Workaround:** Pass _meta: {} for the text-only tool.

**Actionable suggestion:** Normalize config._meta to an empty object and add regression tests for omitted and empty metadata.

**Evidence scope:** Recorded local issue; the feedback refresh also inspected the installed helper. No current upstream merge status is claimed.

**Related contribution:** [ext-apps PR #775](https://github.com/modelcontextprotocol/ext-apps/pull/775) is the recorded contribution URL. The proposal adds `config._meta ?? {}` and a regression test. Acceptance or merge is not claimed.

## 2. Starter build has an undocumented Bun prerequisite

Recorded: 2026-09-11 · Severity: Low

**Task attempted:** Build the basic-server-vanillajs starter on its Node-oriented setup path.

**Steps taken:**

1. Follow the inspected starter README on an environment with Node but no Bun.
2. Run the provided build script.

**Expected result:** The documented Node prerequisites are enough to run the build.

**Actual result:** The inspected package script invokes bun build; the dated log records failure without Bun.

**Workaround:** Install Bun or use a Node-based bundling step.

**Actionable suggestion:** List Bun as a prerequisite or change the script to match the documented Node-only path; add a clean-environment starter build check.

**Evidence scope:** Applies to the inspected template snapshot, not a claim about every current starter.

## 3. SDK entry point obscures the served protocol revision

Recorded: 2026-09-11 · Severity: Medium

**Task attempted:** Determine the revision actually served by the installed SDK entry.

**Steps taken:**

1. Construct McpServer with the existing Streamable HTTP transport.
2. Probe with a 2026-07-28 request and server/discover.
3. Compare the default entry with the separate newer-entry experiment recorded in the debug notes.

**Expected result:** A supported revision and the entry point required to serve it are explicit in the setup documentation.

**Actual result:** The dated notes report a rejected newer-version request and server/discover error on the original entry; the current installed SDK exports 2025-11-25 as its default.

**Workaround:** Keep the submission at MCP 2025-11-25; leave the newer serving-entry migration proposed.

**Actionable suggestion:** Publish an entry-point/revision matrix, log the served revision, and add a version assertion to the reference smoke example.

**Evidence scope:** The newer-entry experiment is historical and outside the film build; it was not rerun for this preparation.

## 4. Node test-entry patterns vary across supported major versions

Recorded: 2026-09-12 · Severity: Low

**Task attempted:** Run the same test command on the project's declared Node 20/22/25 range.

**Steps taken:**

1. Try a quoted test glob and a directory argument in the dated Node matrix.
2. Change the command to an unquoted shell-expanded glob.

**Expected result:** One documented test command works across the declared engine range.

**Actual result:** The dated log records a literal-glob file-not-found on Node 20 and a directory parse failure on Node 22.0; the shell-expanded form passed the recorded matrix.

**Workaround:** Use node --test dist/test/*.test.js with shell expansion.

**Actionable suggestion:** Document a version support table for test-runner path/glob handling and provide a portable command in projects declaring broad engine support.

**Evidence scope:** Historical recorded matrix; no new Node matrix run is claimed.

## Further product feedback

The separate [product feedback](docs/product-feedback.md) also describes the unverified actual Alexa+ host integration, continuing-card sizing/update needs and the distinction between an interface confirmation step and authenticated user authorization. Those are bounded feedback topics, not assertions that a production host has a particular capability or defect.
