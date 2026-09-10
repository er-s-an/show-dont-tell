import fs from "node:fs";
import path from "node:path";

/**
 * File-backed store for trip state. This is what makes "cross-session memory"
 * real: the MCP core is stateless (2026-07-28 spec), so continuity lives here,
 * keyed by tripId and indexed by conversationId.
 */

export interface Booking {
  status: "requires_confirmation" | "confirmed";
  hotelName: string;
  pricePerNight: number;
  taxes: number;
  total: number;
  token: string;           // confirmation token, required by confirm-booking
  confirmation?: string;
  expiresAt: number;
  createdAt: string;
}

export interface TripState {
  tripId: string;
  conversationId: string;
  destination: string;
  dates: string;
  party: number;
  prefs: { dogFriendly: boolean; budget: "budget" | "balanced" | "luxury" };
  days: TripDayState[];
  hotels: HotelOption[];
  estimatedTotal: number;
  currency: string;
  booking?: Booking;
  createdAt: string;
  updatedAt: string;
}

export interface TripDayState {
  label: string;
  items: { time: string; icon: string; title: string; note: string; venueId: string }[];
}

export interface HotelOption {
  id: string; name: string; price: number; rating: number; note: string; tag: string | null;
}

interface StoreFile {
  trips: Record<string, TripState>;
}

export class TripStore {
  private file: string;
  private cache: StoreFile | null = null;

  constructor(dir?: string) {
    const root = dir ?? process.env.SDT_DATA_DIR ?? path.join(process.cwd(), ".data");
    fs.mkdirSync(root, { recursive: true });
    this.file = path.join(root, "trips.json");
  }

  private load(): StoreFile {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(fs.readFileSync(this.file, "utf-8")) as StoreFile;
    } catch {
      this.cache = { trips: {} };
    }
    return this.cache!;
  }

  private persist() {
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.cache, null, 2));
    fs.renameSync(tmp, this.file);
  }

  save(trip: TripState): TripState {
    const data = this.load();
    trip.updatedAt = new Date().toISOString();
    data.trips[trip.tripId] = trip;
    this.persist();
    return trip;
  }

  get(tripId: string): TripState | undefined {
    return this.load().trips[tripId];
  }

  listByConversation(conversationId: string): TripState[] {
    const { trips } = this.load();
    return Object.values(trips)
      .filter((t) => t.conversationId === conversationId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
}
