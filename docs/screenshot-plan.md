# Screenshot plan — one wish, one visible change

This records the screenshot plan and captured set used during September 12 preparation. The completed 128-second English film and current release status are described in [VIDEO-READY.md](VIDEO-READY.md).

## Current rendered set — 2026-09-12

These are real 1440×810 viewport captures from the current production build, the local
self-hosted MCP server, and a fresh temporary data directory:

- [`captures/01-before-1440x810.png`](captures/01-before-1440x810.png)
- [`captures/02-dog-friendly-delta-1440x810.png`](captures/02-dog-friendly-delta-1440x810.png)
- [`captures/03-confirm-1440x810.png`](captures/03-confirm-1440x810.png)
- [`captures/04-receipt-1440x810.png`](captures/04-receipt-1440x810.png)

All four were visually inspected after capture. The truth line is visible in every frame;
the before/delta pair uses the same viewport and prompt anchor; the delta frame was taken
after 5.5 seconds and still shows the persistent change state; the confirm frame exposes
the full `Confirm & book` control; and the receipt frame shows the simulated confirmation.
The measured iframe-to-card height gap was 48.5 px, exactly the card container's vertical
padding, rather than the previous 2400 px height cap.

## Capture rules

- Use the production simulator build against the local self-hosted MCP server.
- Keep the quiet truth line visible:
  `Real MCP server + card · simulated Alexa+ surface · fixture inventory · no money charged`.
- Do not enable `?wire=1`; no terminal, protocol trace, test count, or process dashboard
  belongs in the hero images.
- Use a fresh temporary `SDT_DATA_DIR`. Leave notifications off; never set
  `SDT_ALLOW_NTFY=1` during capture.
- Primary still viewport: 1440×810. Responsive proof: 390×844. Browser chrome may be cropped,
  but do not crop away the truth line or the interaction that caused the state.
- Wait for web fonts and card resize to settle. Preserve readable 1× pixels; no upscaling.

## Required frames

### 01 — Human wish, product promise

**State:** first screen, before a request.

**Must show:** Maya + Pepper context in the editorial rail, the four-step interaction
contract, the simulated surface, and the prompt `Plan a weekend in Napa for two`.

**Caption:** `Voice names the intent. The interface carries the consequence.`

### 02 — Before Pepper

**State:** after `Plan a weekend in Napa for two`, before adjustment.

**Must show:** one itinerary card, the visible action contract, at least one incompatible
activity, hotel comparison, and total. Keep the card large enough to read.

**Caption:** `A complex answer becomes a plan Maya can inspect.`

### 03 — Hero frame: the same card reshaped

**State:** immediately after `Make it dog-friendly` while the Pepper change banner is
visible.

**Must show:** exactly one `.card-frame`; `Pepper joins the trip`; dog-friendly badge;
replacement activities or reordered stays; current total. The prompt and updated card
should share the frame so cause and effect are obvious.

**Caption:** `Pepper joins. The same plan reshapes—without starting over.`

This is the hero image for Devpost and social sharing. If only one screenshot is allowed,
use this one.

### 04 — Consent and continuity diptych

Capture two supporting crops, not two competing hero images:

1. Quote sheet with the selected stay, itemized fees, total, and
   `Nothing is booked until you confirm`.
2. Later return after `New day` + `What did we book?`, showing the same saved plan and
   simulated receipt.

**Caption:** `Show the consequence. Ask before commitment. Remember on return.`

## Responsive proof

At 390×844, capture the first screen and hero adjustment again. Check:

- no horizontal scrolling;
- controls remain at least 34 px high and keyboard focus is visible;
- truth line wraps without covering the conversation;
- contract ledger stacks in reading order;
- hotel rows, quote actions, and receipt remain readable;
- reduced-motion mode removes animation without hiding state changes.

## Reject a capture if

- it contains two itinerary iframes after adjustment;
- Napa reads like the product name rather than the current example dataset;
- an Alexa+ host, live speech, real inventory, real reservation, payment, device push, or
  model-host Skill execution is implied;
- the quote and confirmed receipt are visually indistinguishable;
- the truth line, user action, or changed result is outside the crop;
- a loading state, web-font jump, broken frame height, toast error, or console/page error
  is present.
