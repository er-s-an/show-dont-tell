import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import {
  McpServer,
  type CallToolResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/server";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { DEFAULT_DATES, DESTINATION } from "./data/napa.js";
import { buildDays, pickHotels, estimateTotal } from "./engine.js";
import { TripStore, type TripState } from "./state/store.js";

const CARDS_DIR =
  process.env.SDT_CARDS_DIR ??
  path.join(import.meta.dirname, "..", "..", "cards", "dist");

const ITINERARY_URI = "ui://trip/itinerary.html";

const store = new TripStore();

const rid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// Quote lifetime. SDT_QUOTE_TTL_MS exists so the expiry refusal path can be
// exercised in verification without a 10-minute wait; production uses 10 min.
const QUOTE_TTL_MS = Number(process.env.SDT_QUOTE_TTL_MS ?? 10 * 60 * 1000);

function tripCard(trip: TripState) {
  return {
    tripId: trip.tripId,
    title: `Weekend in ${trip.destination}`,
    subtitle: `${trip.dates} · ${trip.party} travelers${trip.prefs.dogFriendly ? " · dog-friendly" : ""}`,
    days: trip.days.map((d) => ({
      label: d.label,
      stops: d.items.length,
      items: d.items.map(({ time, icon, title, note }) => ({ time, icon, title, note })),
    })),
    hotels: trip.hotels,
    estimatedTotal: trip.estimatedTotal,
    currency: trip.currency,
    booking: trip.booking
      ? {
          status: trip.booking.status,
          hotelName: trip.booking.hotelName,
          pricePerNight: trip.booking.pricePerNight,
          taxes: trip.booking.taxes,
          total: trip.booking.total,
          confirmation: trip.booking.confirmation ?? null,
        }
      : null,
  };
}

function cardResult(trip: TripState, text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent: tripCard(trip),
  };
}

const prefsSchema = z.object({
  dogFriendly: z.boolean().optional()
    .describe("Keep every stop dog-friendly (patios, parks, dog-ok hotels)."),
  budget: z.enum(["budget", "balanced", "luxury"]).optional()
    .describe("Budget stance: affects hotel ranking and splurge picks."),
});

export function createServer(): McpServer {
  const server = new McpServer({
    name: "show-dont-tell",
    version: "0.1.0",
  });

  /* ---------------- plan-weekend-trip ---------------- */

  registerAppTool(
    server,
    "plan-weekend-trip",
    {
      title: "Plan a weekend trip",
      description:
        "Plans a two-day weekend getaway and returns an interactive itinerary card " +
        "the user can adjust and act on. Remembers the trip for future sessions.",
      inputSchema: z.object({
        destination: z.string().optional().describe("Currently supports: Napa Valley."),
        dates: z.string().optional().describe("Human-readable dates, e.g. 'Sat Sep 12 – Sun Sep 13'."),
        party: z.number().int().min(1).max(8).optional(),
        conversationId: z.string().optional()
          .describe("Stable conversation id so the trip can be recalled across sessions."),
        preferences: prefsSchema.optional(),
      }),
      _meta: { ui: { resourceUri: ITINERARY_URI } },
    },
    async ({ destination, dates, party, conversationId, preferences }): Promise<CallToolResult> => {
      const prefs = {
        dogFriendly: preferences?.dogFriendly ?? false,
        budget: preferences?.budget ?? ("balanced" as const),
      };
      const days = buildDays(prefs);
      const hotels = pickHotels(prefs);
      const now = new Date().toISOString();
      const trip: TripState = {
        tripId: rid("trip"),
        conversationId: conversationId ?? "default",
        destination: destination?.trim() || DESTINATION,
        dates: dates ?? DEFAULT_DATES,
        party: party ?? 2,
        prefs,
        days,
        hotels,
        estimatedTotal: estimateTotal(days, hotels, party ?? 2),
        currency: "USD",
        createdAt: now,
        updatedAt: now,
      };
      store.save(trip);
      return cardResult(
        trip,
        `Here's your weekend in ${trip.destination} — ${trip.days.length} days, ` +
        `${trip.hotels.length} hotel options, est. $${trip.estimatedTotal}. ` +
        `You can adjust anything right on the card.`,
      );
    },
  );

  /* ---------------- adjust-trip ---------------- */

  registerAppTool(
    server,
    "adjust-trip",
    {
      title: "Adjust the trip",
      description:
        "Applies a follow-up instruction to an existing trip (e.g. 'make it dog-friendly', " +
        "'cheaper', 'more luxurious') and returns the updated itinerary card.",
      inputSchema: z.object({
        tripId: z.string(),
        instruction: z.string().describe("Natural-language adjustment, e.g. 'make it dog-friendly'."),
      }),
      _meta: { ui: { resourceUri: ITINERARY_URI } },
    },
    async ({ tripId, instruction }): Promise<CallToolResult> => {
      const trip = store.get(tripId);
      if (!trip) {
        return {
          content: [{ type: "text", text: `I couldn't find trip ${tripId}.` }],
          isError: true,
        };
      }
      const text = instruction.toLowerCase();
      if (/dog|puppy|pet/.test(text)) trip.prefs.dogFriendly = true;
      if (/cheaper|budget|save/.test(text)) trip.prefs.budget = "budget";
      if (/luxur|splurge|fancy/.test(text)) trip.prefs.budget = "luxury";

      trip.days = buildDays(trip.prefs);
      trip.hotels = pickHotels(trip.prefs);
      trip.estimatedTotal = estimateTotal(trip.days, trip.hotels, trip.party);
      store.save(trip);
      return cardResult(
        trip,
        `Updated: ${instruction}. New estimate $${trip.estimatedTotal} · ` +
        `hotel pick is now ${trip.hotels[0].name}.`,
      );
    },
  );

  /* ---------------- get-trip / list-trips (cross-session recall) ---------------- */

  registerAppTool(
    server,
    "get-trip",
    {
      title: "Get a saved trip",
      description: "Recalls a previously planned trip by id — works across sessions.",
      inputSchema: z.object({ tripId: z.string() }),
      _meta: { ui: { resourceUri: ITINERARY_URI } },
    },
    async ({ tripId }): Promise<CallToolResult> => {
      const trip = store.get(tripId);
      if (!trip) {
        return {
          content: [{ type: "text", text: `No trip found with id ${tripId}.` }],
          isError: true,
        };
      }
      return cardResult(trip, `Here's the ${trip.destination} trip from ${trip.createdAt.slice(0, 10)}.`);
    },
  );

  registerAppTool(
    server,
    "list-trips",
    {
      title: "List my trips",
      description:
        "Lists trips planned in this conversation history, newest first. " +
        "Use this when the user references a past plan without an id.",
      inputSchema: z.object({
        conversationId: z.string().optional(),
      }),
      _meta: {},
    },
    async ({ conversationId }): Promise<CallToolResult> => {
      const trips = store.listByConversation(conversationId ?? "default");
      return {
        content: [
          {
            type: "text",
            text: trips.length
              ? trips.map((t) => `${t.destination} (${t.dates}) — ${t.tripId}${t.booking?.status === "confirmed" ? " · booked" : ""}`).join("\n")
              : "No trips planned yet in this conversation.",
          },
        ],
        structuredContent: {
          trips: trips.map((t) => ({
            tripId: t.tripId,
            destination: t.destination,
            dates: t.dates,
            booked: t.booking?.status === "confirmed",
            hotel: t.booking?.hotelName ?? null,
          })),
        },
      };
    },
  );

  /* ---------------- book-hotel / confirm-booking (two-phase purchase) ---------------- */

  registerAppTool(
    server,
    "book-hotel",
    {
      title: "Book a hotel (step 1: quote)",
      description:
        "Starts a booking for one of the trip's hotel options. Returns a price " +
        "breakdown with status 'requires_confirmation'. NEVER books without " +
        "the user confirming via confirm-booking.",
      inputSchema: z.object({
        tripId: z.string(),
        hotelName: z.string(),
      }),
      _meta: { ui: { resourceUri: ITINERARY_URI } },
    },
    async ({ tripId, hotelName }): Promise<CallToolResult> => {
      const trip = store.get(tripId);
      if (!trip) {
        return { content: [{ type: "text", text: `No trip found with id ${tripId}.` }], isError: true };
      }
      const hotel = trip.hotels.find((h) => h.name === hotelName) ?? trip.hotels[0];
      const taxes = Math.round(hotel.price * 0.15);
      const booking = {
        status: "requires_confirmation" as const,
        hotelName: hotel.name,
        pricePerNight: hotel.price,
        taxes,
        total: hotel.price + taxes,
        token: rid("bk"),
        expiresAt: Date.now() + QUOTE_TTL_MS,
        createdAt: new Date().toISOString(),
      };
      trip.booking = booking;
      store.save(trip);
      return {
        content: [
          {
            type: "text",
            text: `${hotel.name}: $${booking.pricePerNight}/night + $${taxes} taxes & fees = ` +
              `$${booking.total}. Confirm to book?`,
          },
        ],
        structuredContent: { ...tripCard(trip), bookingToken: booking.token },
      };
    },
  );

  registerAppTool(
    server,
    "confirm-booking",
    {
      title: "Confirm booking (step 2: commit)",
      description:
        "Completes a pending booking after explicit user confirmation. " +
        "Requires the bookingToken from book-hotel.",
      inputSchema: z.object({
        tripId: z.string(),
        bookingToken: z.string(),
      }),
      _meta: { ui: { resourceUri: ITINERARY_URI } },
    },
    async ({ tripId, bookingToken }): Promise<CallToolResult> => {
      const trip = store.get(tripId);
      const booking = trip?.booking;
      if (!trip || !booking || booking.status !== "requires_confirmation") {
        return { content: [{ type: "text", text: "No pending booking to confirm." }], isError: true };
      }
      if (booking.token !== bookingToken || booking.expiresAt < Date.now()) {
        return { content: [{ type: "text", text: "That booking quote expired or doesn't match. Please start again." }], isError: true };
      }
      booking.status = "confirmed";
      // Hash, not raw base64: the code must differ per booking. Hex digest so
      // the code stays a clean [A-Z0-9] — base64url can emit `-`/`_`, which
      // both reads badly and breaks naive code parsers.
      booking.confirmation =
        "NP-" + createHash("sha256").update(tripId + bookingToken).digest("hex").slice(0, 6).toUpperCase();
      trip.booking = booking;
      store.save(trip);

      // Optional: push a real phone notification (ntfy.sh) — the demo's
      // "watch buzzes on camera" moment. No-op unless NTFY_TOPIC is set.
      const topic = process.env.NTFY_TOPIC;
      if (topic) {
        try {
          await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
            method: "POST",
            headers: { "Title": "Show, Don't Tell - hotel booked", "Priority": "high" },
            body: `${booking.hotelName} confirmed · $${booking.total} · ${booking.confirmation}`,
          });
        } catch (e) {
          console.error("ntfy push failed (non-fatal):", e);
        }
      }

      return cardResult(
        trip,
        `Booked: ${booking.hotelName}, $${booking.total}. Confirmation ${booking.confirmation}.`,
      );
    },
  );

  /* ---------------- card resources ---------------- */

  registerAppResource(
    server,
    ITINERARY_URI,
    ITINERARY_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(CARDS_DIR, "itinerary", "index.html"), "utf-8");
      return {
        contents: [{
          uri: ITINERARY_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                // The card's only external requests: Google Fonts stylesheet
                // (@import in the bundled CSS) and the font files themselves.
                resourceDomains: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
              },
            },
          },
        }],
      };
    },
  );

  return server;
}
