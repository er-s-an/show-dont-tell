import { NAPA, SLOT_TEMPLATE, DAY_LABELS, type Venue, type Slot } from "./data/napa.js";
import type { TripState, TripDayState, HotelOption } from "./state/store.js";

/**
 * The itinerary engine. Not a canned trip: it scores the curated venue dataset
 * against the user's constraints (dog-friendly, budget, pace) and picks a
 * coherent two-day plan, plus the three best-fit hotels.
 */

export interface TripPrefs {
  dogFriendly?: boolean;
  budget?: "budget" | "balanced" | "luxury";
}

function scoreVenue(v: Venue, prefs: Required<TripState["prefs"]>, slot: Slot): number {
  let s = v.rating * 10;
  if (v.iconic) s += 4;
  if (prefs.dogFriendly && v.dogFriendly) s += 6;
  if (slot === "checkin") {
    if (prefs.budget === "budget") s += Math.max(0, (400 - v.price) / 25);
    if (prefs.budget === "luxury") s += v.price / 250;
    if (prefs.budget === "balanced") s += Math.max(0, 8 - Math.abs(v.price - 300) / 60);
  }
  return s;
}

function pickForSlot(
  slot: Slot,
  prefs: Required<TripState["prefs"]>,
  used: Set<string>,
): Venue | undefined {
  const candidates = NAPA.filter((v) => v.slots.includes(slot))
    .filter((v) => !used.has(v.id))
    .filter((v) => !prefs.dogFriendly || v.dogFriendly);
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => scoreVenue(b, prefs, slot) - scoreVenue(a, prefs, slot));
  return candidates[0];
}

export function pickHotels(prefs: Required<TripState["prefs"]>): HotelOption[] {
  const pool = NAPA.filter((v) => v.type === "hotel")
    .filter((v) => !prefs.dogFriendly || v.dogFriendly);
  const ranked = [...pool].sort(
    (a, b) => scoreVenue(b, prefs, "checkin") - scoreVenue(a, prefs, "checkin"),
  );
  const top = ranked.slice(0, 3);
  return top.map((h, i) => ({
    id: h.id,
    name: h.name,
    price: h.price,
    rating: h.rating,
    note: h.note,
    tag: i === 0 ? "Our pick" : null,
  }));
}

export function buildDays(prefs: Required<TripState["prefs"]>): TripDayState[] {
  const used = new Set<string>();
  const days: TripDayState[] = [];
  for (let d = 0; d < SLOT_TEMPLATE.length; d++) {
    const items: TripDayState["items"] = [];
    for (const { slot, time } of SLOT_TEMPLATE[d]) {
      const venue = pickForSlot(slot, prefs, used);
      if (!venue) continue;
      used.add(venue.id);
      items.push({ time, icon: venue.icon, title: venue.name, note: venue.note, venueId: venue.id });
    }
    days.push({ label: DAY_LABELS[d], items });
  }
  return days;
}

export function estimateTotal(
  days: TripDayState[],
  hotels: HotelOption[],
  party: number,
  dataset: Venue[] = NAPA,
): number {
  const venueById = new Map(dataset.map((v) => [v.id, v]));
  let activities = 0;
  for (const day of days) {
    for (const it of day.items) {
      const v = venueById.get(it.venueId);
      // Hotels are priced per-night, not per-person; the stay cost is added
      // once below from the top pick, so skip them in the activities loop.
      if (!v || v.type === "hotel") continue;
      activities += v.price * party;
    }
  }
  const hotel = hotels[0]?.price ?? 0;
  return activities + hotel;
}
