# Demo video script — "Show, Don't Tell"

**Target length: 2:56 (hard limit 3:00).** Form: screen recording of the Alexa+-style
experience simulator, with **burned-in English subtitles along the bottom** so the video
works on mute — judges often watch in batches. A narrator track is **optional**: the
timings and captions below carry the story on their own, and the VO lines are written to
fit the same windows if you record one.

**Ground rules for this recording**

- The simulator takes **typed text** as input. It stands in for speech; there is no
  speech-to-text anywhere in this project, and the script never implies one. On screen we
  call the input field what it is — a *request* — and the typed line is framed as "what
  you'd say to Alexa+."
- **Everything behind the card is real**: the itinerary is scored by the MCP server, the
  adjustment re-picks venues, the booking quote and confirmation come from tool calls,
  and the phone push is a real ntfy.sh message. The simulator draws the Alexa+ surface.
- **Say the honest thing out loud, early.** Alexa+ cannot render MCP Apps today. This
  video shows the next step, built on the standards the track points to. One clean
  sentence at 0:12 buys credibility for everything after it.
- No slides, no deck frames, no stock footage of people talking to speakers. One small
  persistent label in the corner: `Alexa+ experience simulator`.

> **Recording status (2026-09-11):** the simulator is implemented and the video has been
> auto-recorded from it — `docs/demo-video/show-dont-tell-demo.webm` (66s, 720p, captioned,
> no voiceover needed). This script remains the reference if you want to re-record with
> live narration: same beats, same timings.

---

## Storyboard

### 0:00 – 0:12 · Hook: the answer you can't use

| | |
|---|---|
| **Picture** | Split frame. Left: a voice waveform and a paragraph of itinerary prose scrolling past, text getting smaller and denser until it's unreadable *(illustrative — this half is a diagram of the problem, not a recording of our input path)*. Right: the same weekend as a card — two days, timed stops, three hotels, one total. Hold on the card. |
| **Caption** | `A weekend plan read aloud is a list you can't compare, edit, or act on.` then `So we changed the output, not the assistant.` |
| **VO (optional)** | "Ask a voice assistant to plan a weekend and you get a paragraph. You can't compare two hotels in a paragraph. You can't change your mind in a paragraph. You can't book in one either." |
| **Judging land** | **Quality of Idea** — states the thesis in the first 10 seconds. **Potential Impact** — names a real limitation of voice for structured tasks. |

### 0:12 – 0:22 · Disclosure and setup

| | |
|---|---|
| **Picture** | Simulator full screen, quiet. Corner label fades in: `Alexa+ experience simulator`. A thin title card slides under it: `MCP 2025-11-25 · Streamable HTTP · MCP Apps · Agent Skill`. Terminal behind it shows `node scripts/smoke.mjs` output already at the bottom of frame. |
| **Caption** | `What you're watching is a simulator of the Alexa+ experience — Alexa+ can't render interactive cards from MCP servers yet.` / `Everything behind the card is real: a self-hosted MCP server on MCP spec 2025-11-25 over Streamable HTTP.` |
| **VO (optional)** | "Alexa+ can't render cards from an MCP server yet. So we built the capability on the standards it just adopted, and a simulator so you can feel it today. The card is real — the server, the tools, the purchase flow. Only the voice surface is simulated." |
| **Judging land** | **Tech Implementation** — spec, transport and stack established immediately. **Quality of Idea** — honesty about the platform's current state, stated as a design choice rather than an excuse. |

### 0:22 – 0:50 · The ask: a plan becomes a card

| | |
|---|---|
| **Picture** | Cursor in the request field. Type `Plan a weekend in Napa for two` (typed live, not pasted). Send. A beat of the assistant replying in one short line — under 25 words, per the skill's rule — then the card rises: hero scene, `Weekend in Napa Valley`, `Sat Sep 12 – Sun Sep 13 · 2 travelers`, the total counting up to `$1,369`. Slow vertical pan down the timeline: 10:00 drive up, 12:00 Oxbow Public Market, 14:00 winery, 17:30 check-in, 19:30 dinner, then Sunday's four stops. Pan to the hotel list — three options with ratings and nightly prices, `Our pick` tag on the first. |
| **Caption** | `One request. Nine timed stops across two days, three hotels, one estimated total.` / `Scored from a curated Napa dataset — per slot, per constraint. Not a template.` |
| **VO (optional)** | "Plan a weekend in Napa for two. The spoken answer stays short — one line — because the card is the answer. Two days, nine stops, three hotels, an estimated total. Every slot was scored against the venue data: rating, price, dog-friendliness, and whether it's the kind of place you can only do in Napa." |
| **Judging land** | **Design** — the card as an interface: hierarchy, motion, readable density. **Tech Implementation** — `plan-weekend-trip` returns `ui://trip/itinerary.html`; structured output drives a real view. **Potential Impact** — the complex-answer problem answered with an interface. |

### 0:50 – 1:15 · Adjust in place, not from scratch

| | |
|---|---|
| **Picture** | Type `make it dog-friendly`. A single short reply, then the *same card* re-renders: a `dog-friendly` badge appears next to the dates, the Sunday 10:30 hot-air balloon is replaced, the spa morning is gone, the Sunday afternoon pick changes, the total re-counts. Cursor hovers the changed row so the diff is visible. Do not cut away from the card — the in-place update is the point. |
| **Caption** | `"Make it dog-friendly."` / `Same card. Re-scored, not restarted. The balloon and the spa can't take a dog — so they're gone.` |
| **VO (optional)** | "Make it dog-friendly. Watch what changes: the badge appears, and the balloon ride and the spa morning vanish — because those venues can't take a dog — and the engine re-picks the afternoon. This is the same card, updated in place by a second tool call. No re-planning, no lost context." |
| **Judging land** | **Tech Implementation** — `adjust-trip` mutates server state and re-runs the scoring engine; the card calls it through the host. **Design** — in-place update preserves the user's position and state. **Quality of Idea** — conversation as editing, not restarting. |

### 1:15 – 1:50 · Booking that cannot charge you by accident

| | |
|---|---|
| **Picture** | Cursor on the hotel card, then the `Book` button. The confirm sheet slides up: hotel name, `1 night $289`, `Taxes & fees $43`, `Total $332`, a shield icon and the line `Nothing is charged until you confirm. Quote held for 10 minutes.` Hold here for two full seconds — this is the moment judges should remember. Cursor leaves the sheet and returns (hovering, not clicking) to make the pause visible. Then click `Confirm`; the sheet collapses and a green confirmation panel appears: `Booked · $332 · Confirmation NP-XXXXXX`. |
| **Caption** | `Booking is two calls, on purpose.` / `The quote is step one. Nothing is charged.` / `Step two needs the token from that quote — a single agent turn can't quote and charge.` / `Confirmed.` |
| **VO (optional)** | "Tapping Book does not book anything. It asks for a quote. The sheet shows the whole price — hotel, taxes, total — and holds it for ten minutes. Confirm and charge are a different tool call that needs the token from this quote, so no single agent turn can spend your money. One tap later: booked. Nothing was charged without a human decision." |
| **Judging land** | **Potential Impact** — agentic purchasing with a real safety property, not just a demo of checkout. **Tech Implementation** — two-phase `book-hotel` → `confirm-booking`, single-use expiring token, refusal path covered by the smoke test. **Design** — the confirm sheet as the trust surface. |

### 1:50 – 2:12 · Cross-session recall: "we booked — which hotel?"

| | |
|---|---|
| **Picture** | Cut to a session reset: the transcript clears, a date stamp appears in the corner, and the simulator announces `New session · 2 days later`. Type `Which hotel did we book for Napa?`. A short reply names the hotel and the confirmation code. Then `get-trip` returns the full card — booked state intact, confirmation panel still showing. Frame the terminal, where the request is handled by a fresh server process with no session id. |
| **Caption** | `New session. New day. The server keeps no session between requests.` / `The memory lives in the server's trip store, keyed to the conversation.` / `Cross-session state, without a session.` |
| **VO (optional)** | "Two days later, in a new session: which hotel did we book? The server answers — and the card comes back exactly as we left it, booked and confirmed. This server is session-less: every request is handled by a fresh instance with no session id, so nothing could have survived in a session even if we wanted it to. The memory isn't a transport trick. It's a trip store we own, indexed by the conversation." |
| **Judging land** | **Tech Implementation** — session-less serving plus an explicit file-backed store; `list-trips` → `get-trip`; "cross-session state" is an official creative keyword. **Quality of Idea** — continuity as a product feature rather than a protocol side effect. |

### 2:12 – 2:32 · The push: it leaves the screen

| | |
|---|---|
| **Picture** | Second camera: phone on the desk lights up with the ntfy.sh notification — hotel, total, confirmation code. Beat. Cut to the paired watch on the wrist as it buzzes; the notification is visible there too. Return to the card. |
| **Caption** | `Confirmation leaves the screen.` / `A real push to the phone — and the watch, through the paired phone.` / `$332 · NP-XXXXXX`. |
| **VO (optional)** | "And the confirmation doesn't stay on the screen. The server pushes a real notification — the hotel, the total, the code — and it lands on the phone and the watch." |
| **Judging land** | **Design** — the experience continues onto the device the user is actually wearing. **Potential Impact** — the answer becomes an action with a real-world receipt. |

### 2:32 – 2:56 · Close: the one sentence and the stack

| | |
|---|---|
| **Picture** | Card at rest, then a clean flash of the stack, one item at a time: `MCP spec 2025-11-25` → `Streamable HTTP · session-less` → `MCP Apps · ui://trip/itinerary.html` → `Agent Skill · confirm-before-charge` → `11/11 smoke checks passing`. End on the repo URL and the corner label still reading `Alexa+ experience simulator`. |
| **Caption** | `A complex answer shouldn't be spoken. It should be something you can see, change, and act on.` / `Show, don't tell.` |
| **VO (optional)** | "A complex answer shouldn't be spoken — it should be something you can see, change, and act on. That's what Alexa+ can be next, and it's already buildable on the standards it adopted. Show, don't tell." |
| **Judging land** | **Quality of Idea** — the thesis restated in one line. **Tech Implementation** — concrete, verifiable stack, ending on a passing test count rather than a promise. |

---

## Production notes

- **Captions are the primary track.** Burn them in, bottom third, 32–40 px, high contrast,
  max two lines, minimum ~1.2 s on screen. Every caption above is short enough to read
  once. Re-hearse the read: if a caption feels rushed, cut words, not time.
- **Record at 1080p or better, 60 fps** for the card's motion (the total counts up, the
  dog-friendly badge animates, the sheet slides). Keep the cursor visible — the taps are
  the proof that this is a running build, not a mockup.
- **No dead air.** If a tool call takes longer than a beat, keep the shot and use the
  caption to explain what just happened ("the server re-scored nine slots").
- **Show the terminal once, early** (`0:12–0:22`) with the smoke run visible, then get
  back to the product. One frame of `11/11 passed` does the credibility work that a
  slide of architecture diagrams would not.
- **Do not** show a fake audio waveform reacting to the typed input, do not caption the
  typed text as "voice input," and do not say or imply that Alexa+ can render these cards
  today. The drop in credibility is unrecoverable if a judge notices; the honest framing
  is also the stronger story.
- **Upload** to YouTube or Vimeo, public, marked *not for kids*, under three minutes, and
  check the link in a private browser window before submitting.
- **Put the disclosure in the video description too**, not just on screen: one sentence
  saying the voice surface is a simulator built with the Alexa+ simulation path the rules
  allow, plus the repo link and the command judges can run to reproduce the server. If a
  judge reads only the description, they should still know exactly what is real.
