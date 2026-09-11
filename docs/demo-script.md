# Demo video script — "Show, Don't Tell"

**Submitted asset:** `docs/demo-video/show-dont-tell-demo.webm` — 71 s, 1280×720,
VP8, no audio track, burned-in English captions (rules allow captioned demos; a
voiceover is not required). **Length is comfortably under the 3:00 limit.**

**How it is made (fully reproducible):**

```bash
npm run build
node scripts/record-demo.mjs
```

The harness is hermetic: it spawns its own MCP server against a throwaway
`SDT_DATA_DIR`, serves the **production** simulator build (`vite preview`), and
exposes `window.sdtControl.{killServer,startServer}` so the in-page demo script
(`packages/simulator/src/demo.ts`) can kill and restart the server mid-flow —
for real, on camera. Nothing in the video is mocked, and the booking that
appears at the end is readable from the same on-disk trip store the whole time.

## Ground rules (enforced by the recording itself)

- The simulator takes **typed text**; it stands in for speech. There is no
  speech-to-text anywhere, and no caption implies one.
- A persistent corner tag reads **`Simulated Alexa+ surface · fixture data ·
  nothing is charged`** for the entire video, plus the `SIMULATED` badge in the
  app bar. A live **MCP wire overlay** lists every `tools/call` as it happens —
  including the one that fails.
- The video shows the strongest engineering, not just the UI: the server is
  killed mid-flow, the card **fails closed** (error toast, no fake success),
  the server restarts on the same store, and the same quote+token then
  confirms. The booking is then recalled in a new "day".
- No phone/watch claims: the optional ntfy.sh push is documented in the README
  and `docs/product-feedback.md`, but no device is shown and no caption claims
  a push. (It fires only when `NTFY_TOPIC` is set; it was unset here.)
- The dataset is a curated fixture and says so on screen; no live inventory,
  no real reservation, no payment.

## Shot list (as recorded)

| Time | Beat | Caption on screen | Wire overlay shows |
|---|---|---|---|
| 0:00–0:06 | Hook | `Voice assistants are great at timers. But ask for a weekend away…` → `…and the answer talks **at** you for two minutes. Let's fix that.` | — |
| 0:06–0:15 | The ask | `**Show, Don't Tell** — every complex answer becomes an interface.` (types *"Plan a weekend in Napa for two"*) | `plan-weekend-trip` |
| 0:15–0:21 | Card is the answer | `A real MCP server (spec 2025-11-25, Streamable HTTP) plans the trip. The card **is** the answer.` | — |
| 0:21–0:29 | Adjust in place | (types *"Make it dog-friendly"*) `Adjust in place. Same card, new constraints — the balloon ride can't take a dog, so it's out.` | `adjust-trip` |
| 0:29–0:33 | Quote, not charge | `Booking is two calls on purpose. First a quote — **nothing is booked yet.**` Confirm sheet: `Nothing is booked until you confirm. Quote held for 10 minutes.` | `book-hotel` |
| 0:33–0:36 | Kill | `Now the server dies mid-flow. Watch what the card does…` (server process killed) | — |
| 0:36–0:41 | **Fail closed** | `**Fail closed.** No fake success, no made-up code — the sheet stays open for a retry.` Red toast in the card: `Confirmation failed — no booking was made. Please try again.` | `confirm-booking` (the failed attempt, on the wire) |
| 0:41–0:44 | Restart | `Server restarts — new process, same on-disk trip store.` | — |
| 0:44–0:50 | Retry confirms | `Same quote, same token — now it confirms. The code came from the **server**, not the card.` Green panel: `Booked · $332 · Confirmation NP-XXXXXX` | second `confirm-booking` |
| 0:50–0:53 | New day | `Next morning.` (Day 2, fresh thread) | full history visible |
| 0:53–1:00 | Recall | (types *"What was that hotel we booked?"*) `New day, new session — **same memory**, from the trip store.` | `list-trips`, `get-trip` |
| 1:00–1:05 | Proof | `The booking survived a kill and a restart — confirmation code and all.` (scrolls to the intact confirmation) | — |
| 1:05–1:09 | Stack | `Open standards end to end: **MCP · MCP Apps · Agent Skills**.` | — |
| 1:09–1:12 | Close | `**Show, don't tell.**` | — |

## If a richer human-recorded cut is ever wanted

Same beats, same truth constraints: keep the corner tag, keep the wire overlay,
keep the kill/restart act, never caption typed text as speech, never show or
imply a capability that isn't in the build (no Alexa device rendering, no real
reservation, no device push unless the device and receipt are actually on
camera). Record at 1080p60 if the hardware allows; the current 720p25 webm is
the verified reference.
