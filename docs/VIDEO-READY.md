# Release and film status

Updated September 12, 2026.

The completed English review film is **128 seconds**, 1080p30, with narration and captions. It includes **79 seconds of recorded local product UI**. The final story is plan → same-card adjustment → quote → separate confirmation click → recall of the same simulated receipt.

## Current boundaries

- Real local MCP server, tools, card, deterministic scoring, and file-backed state.
- Deterministic phrase router; included Agent Skill is not loaded by a model host.
- Simulated Alexa+ host and speech, fixture inventory/prices, simulated bookings. No hotel reservation or payment.
- Notifications are disabled in verification and film capture.
- A separate UI click is demonstrated. The server checks quote state, token and expiry; it does not authenticate a human gesture or prevent an arbitrary MCP client from calling quote and confirm in sequence.
- Full human listening review is separate from media decoding and screenshot checks.

## Release validation

The isolated release passed the build, 31 unit tests, 11 protocol smoke checks, 7 process-restart recall checks, and 27 browser E2E checks on Node 25.9.0. Exact source/harness hashes are recorded in [release-validation.json](release-validation.json). Original developer checkout and data remain unchanged.

## Platform submission

The source publication, public video upload, required Product Feedback, and Devpost submission are separate steps. The final public video URL and submission receipt belong to the platform submission record. This file does not claim they already exist.

Use [submission.md](submission.md) for the English project story and [product-feedback.md](product-feedback.md) for the technical feedback. The [final narration](demo-script.md) matches the 128-second film.
