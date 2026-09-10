/** The planner: turns a user utterance into a tool call (or a plain reply).
 * Rule-based on purpose — the demo path must be deterministic. */

export interface ChatContext {
  conversationId: string;
  tripId: string | null;
}

export interface Intent {
  tool?: string;
  args?: Record<string, unknown>;
  say?: string;
}

export function plan(message: string, ctx: ChatContext): Intent {
  const m = message.toLowerCase();

  if (/^(hi|hello|hey|help|what can you do)/.test(m)) {
    return {
      say: "I plan weekends and answer with interfaces, not monologues. Try: “Plan a weekend in Napa for two.”",
    };
  }

  // Recall across sessions
  if (/(what|which).*(book|hotel|trip|planned)|remember|recall|did we/i.test(m)) {
    return { tool: "list-trips", args: { conversationId: ctx.conversationId } };
  }

  // Adjustments
  if (/dog|puppy|pet|fido/.test(m)) {
    return ctx.tripId
      ? { tool: "adjust-trip", args: { tripId: ctx.tripId, instruction: "make it dog-friendly" } }
      : { tool: "plan-weekend-trip", args: { conversationId: ctx.conversationId, preferences: { dogFriendly: true } } };
  }
  if (/cheap|budget|save|less expensive/.test(m)) {
    return ctx.tripId
      ? { tool: "adjust-trip", args: { tripId: ctx.tripId, instruction: "something cheaper" } }
      : { say: "Plan a trip first, then I'll trim the budget." };
  }
  if (/luxur|splurge|fancy|upgrade/.test(m)) {
    return ctx.tripId
      ? { tool: "adjust-trip", args: { tripId: ctx.tripId, instruction: "make it more luxurious" } }
      : { say: "Plan a trip first, then we can splurge." };
  }

  // Booking via chat — the card still owns the final confirm.
  if (/book|reserve|confirm/.test(m)) {
    return ctx.tripId
      ? { tool: "book-hotel", args: { tripId: ctx.tripId, hotelName: "" } }
      : { say: "There's no trip yet. Ask me to plan one first." };
  }

  // Planning
  if (/plan|weekend|trip|getaway|napa|away|itinerary/.test(m)) {
    return {
      tool: "plan-weekend-trip",
      args: {
        conversationId: ctx.conversationId,
        party: 2,
        preferences: /dog|pet/.test(m) ? { dogFriendly: true } : undefined,
      },
    };
  }

  return {
    say: "I'm best at weekends away. Try “plan a weekend in Napa”, “make it dog-friendly”, or “what did we book?”.",
  };
}
