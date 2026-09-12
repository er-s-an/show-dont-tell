# Final English film script

**Show, Don't Tell — Room for One More · 128 seconds.**

This completed review film combines the recorded local MCP/card flow with editorial animation. Maya and Pepper are a synthetic story. Alexa+ speech and host, venue inventory, and bookings are simulated. No payment, hotel reservation, or device notification occurs.

## 0–12s · A weekend for two.

Maya is planning a weekend away with her partner. Two days to explore. A place to stay. One plan that holds everything together.

Evidence boundary: Synthetic Maya persona. Actual plan capture provides the card; typography and paper world are editorial illustrations.

## 12–26s · Plan a weekend in Napa for two.

In this Alexa Plus simulation, Maya types instead of speaking. A deterministic phrase router sends her request to the trip-planning tool.

Evidence boundary: Actual MCP tools/call traffic and runtime capture; planner.ts uses a deterministic phrase router, not a model agent.

## 26–39s · A plan she can see.

The MCP server scores the example venues and returns an interactive card. Stops, stays, and an estimated total appear together, so Maya can compare them.

Evidence boundary: engine.ts filters and scores hand-written Napa data. MCP Apps card implementation is real; inventory is simulated.

## 39–50s · Pepper is coming too.

Then Maya looks at Pepper, the dog they just adopted. The weekend needs room for her, too. Make it dog-friendly.

Evidence boundary: Synthetic story; actual request text supported by planner.ts and adjust-trip.

## 50–68s · Same card. A different weekend.

That small change reaches the server as an adjustment to the existing trip. Places that cannot take a dog leave the plan. Suitable choices replace them. The same card updates.

Evidence boundary: main.ts activeCard path and current actual UI capture; adjust-trip and engine scoring on local MCP wire.

## 68–81s · A little more room for life.

Nine activities become eight. Three stays become two. The estimate changes with the itinerary. Pepper joins, and Maya keeps the context of her plan.

Evidence boundary: Captured fixture delta 9→8 activities,3→2 stays,$1,369→$609. Revised estimate, not a demonstrated savings claim.

## 81–99s · A moment to decide.

Maya chooses a stay. The card opens a quote: one night, fees, total. She reviews it, then confirms with a separate click. This booking is simulated. No hotel is reserved, and no money moves.

Evidence boundary: Actual card review flow. Server validates pending state and expiring token, not human identity or universal agent turn separation.

## 99–115s · The conversation restarts. The plan stays.

The next morning, Maya starts a new transcript using the same simulated identity. What did we book? The server returns her saved itinerary, with the same receipt attached.

Evidence boundary: New day retains conversationId; list-trips/get-trip return file-backed state. No new authenticated session claim.

## 115–128s · Say what changes. See the plan adapt.

A request becomes a plan. A new detail changes it. A decision remains visible. Show, Don't Tell. Say what changes. See the plan adapt.

Evidence boundary: Review film of current local prototype; actual Alexa+ host integration is not verified. Agent Skill included, not runtime loaded.
