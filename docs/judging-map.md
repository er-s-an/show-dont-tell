# Evidence map

This map links the submission story to inspectable implementation. It does not claim that source publication, video upload, Product Feedback, and Devpost submission are the same operation.

| Question | Implementation / evidence |
|---|---|
| Does the required server run? | `packages/server/src/index.ts` serves MCP 2025-11-25 over Streamable HTTP. `scripts/smoke.mjs` exercises six tools and the card resource. |
| Is the itinerary computed? | `engine.ts` scores the 22-venue Napa fixture. Changing dog-friendliness recomputes selected activities, hotel options and the estimate. No live inventory or savings claim. |
| Does the same card continue? | `packages/simulator/src/main.ts` preserves the active iframe and updates its existing bridge. `scripts/e2e.mjs` checks exactly one card after adjustment. |
| What does confirmation guarantee? | The simulator waits for a separate card click. The server checks pending state, a single-use token and expiry. It does not authenticate a human gesture; the booking is simulated. |
| Does memory survive? | `state/store.ts` persists by trip and conversation identifier. `scripts/restart-recall.mjs` verifies process-restart recall. The film’s New day action is a transcript reset under the same simulated identity. |
| Are external effects controlled? | `notifications.ts` requires exact `SDT_ALLOW_NTFY=1` plus a non-empty topic. Verification and capture disable it. No notification is shown as delivered in the film. |
| Is Alexa+ host integration verified? | No. The shipped web host is a labelled simulator with a deterministic phrase router. The MCP server/card are implemented; the Agent Skill is an included contract. |
| Can judges inspect the story? | [Submission text](submission.md), [128-second narration](demo-script.md), and the completed review film supplied through the public submission video field. |
| Is developer feedback concrete? | [Product Feedback](product-feedback.md) documents `_meta`, starter build prerequisites, protocol entries, host testing, same-card updates and confirmation boundaries. |
| Is the code licensed? | MIT [LICENSE](../LICENSE). |

Current release checks are recorded in [release-validation.json](release-validation.json). Historical engineering results in `friction-log.md` remain dated evidence, not a fresh run of every runtime/platform combination.

The Alexa+ self-hosted MCP path is used. The Open Source contribution link recorded by the project is [ext-apps PR #775](https://github.com/modelcontextprotocol/ext-apps/pull/775); no accepted/merged status is claimed. AWS Builder is not selected because this project does not use the qualifying technologies recorded in the submission materials.
