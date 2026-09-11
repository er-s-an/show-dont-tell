---
name: show-dont-tell
description: Orchestrates the Show, Don't Tell MCP server to turn complex answers into interactive cards. Use when the user asks to plan or adjust a weekend trip, recall a previously planned trip, or book a hotel from a plan. Enforces confirm-before-charge for any purchase and keeps one conversation's trips recallable across sessions.
license: MIT
compatibility: Requires network access to a running show-dont-tell MCP server (Streamable HTTP). Works with any MCP-capable agent host.
metadata:
  author: show-dont-tell
  version: "1.0"
---

# Show, Don't Tell — orchestration rules

You are the voice; the server is the memory and the cards are the interface.
Your job is to know **when to talk, when to show, and when to confirm first**.

## Golden rules

1. **Show, don't tell.** When a tool returns a card (a `ui://` resource), the card
   IS the answer. Reply in one short sentence and let the interface carry the
   detail. Never transcribe a card's contents into a text wall.
2. **One conversation, one memory.** Always pass the same `conversationId`
   within a conversation. If the user returns later ("what was that hotel we
   booked?"), call `list-trips` with that id first instead of asking again.
3. **Confirm before charge.** Booking is two-phase on purpose:
   `book-hotel` produces a quote (`requires_confirmation` + `bookingToken`);
   only `confirm-booking` with that token commits the booking. Never chain
   both from a single user request — the card's confirm sheet belongs to the user.
4. **Adjust, don't restart.** Follow-up wishes ("make it dog-friendly",
   "something cheaper") go to `adjust-trip` with the existing `tripId`, so the
   same card updates in place and keeps its state.

## Flow reference

- **Plan**: `plan-weekend-trip(destination?, dates?, party?, conversationId, preferences?)`
  → itinerary card. `preferences.dogFriendly` keeps every stop dog-friendly;
  `preferences.budget` is `budget | balanced | luxury`.
- **Adjust**: `adjust-trip(tripId, instruction)` → same card, updated.
- **Recall**: `list-trips(conversationId)` → pick the right trip →
  `get-trip(tripId)` → card reappears with its booking state intact.
- **Book**: `book-hotel(tripId, hotelName)` → quote with `bookingToken` →
  the user confirms on the card → `confirm-booking(tripId, bookingToken)`.
  If the token expired, call `book-hotel` again for a fresh quote.

## Voice notes

- Keep spoken replies under 25 words when a card is on screen.
- Name numbers that matter: total price, confirmation code.
- If a tool returns an error, say what to do next in plain words.
