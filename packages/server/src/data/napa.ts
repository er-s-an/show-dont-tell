/**
 * Curated Napa Valley dataset. Hand-written, realistic entries with tags that
 * the itinerary engine filters and scores against. All data is illustrative
 * content created for this project (no scraped/copyrighted material).
 */

export type VenueType = "winery" | "restaurant" | "hotel" | "cafe" | "activity";
export type Slot =
  | "morning" | "lunch" | "afternoon" | "checkin" | "dinner"
  | "breakfast" | "lateMorning" | "afternoon2" | "depart";

export interface Venue {
  id: string;
  type: VenueType;
  name: string;
  note: string;
  slots: Slot[];
  rating: number;          // 1..5
  price: number;           // per-person activity / per-night hotel / per-person meal
  dogFriendly: boolean;
  outdoor: boolean;
  iconic: boolean;         // "only in Napa" factor
  icon: "drive" | "food" | "wine" | "hotel" | "coffee" | "balloon" | "pin";
}

export const NAPA: Venue[] = [
  // ---- wineries ----
  { id: "castello", type: "winery", name: "Castello di Amorosa", note: "Castle winery tour · reserve the 2pm slot", slots: ["afternoon"], rating: 4.7, price: 55, dogFriendly: false, outdoor: true, iconic: true, icon: "wine" },
  { id: "domaine-carneros", type: "winery", name: "Domaine Carneros", note: "Sparkling flight · terrace seats", slots: ["afternoon", "afternoon2"], rating: 4.6, price: 45, dogFriendly: true, outdoor: true, iconic: true, icon: "wine" },
  { id: "opus-one", type: "winery", name: "Opus One", note: "Iconic Bordeaux blend · appointment only", slots: ["afternoon"], rating: 4.8, price: 100, dogFriendly: false, outdoor: false, iconic: true, icon: "wine" },
  { id: "sterling", type: "winery", name: "Sterling Vineyards", note: "Aerial tram up the hill · great views", slots: ["afternoon", "lateMorning"], rating: 4.5, price: 65, dogFriendly: false, outdoor: true, iconic: false, icon: "wine" },
  { id: "v-sattui", type: "winery", name: "V. Sattui", note: "Picnic grounds · dogs welcome on leash", slots: ["afternoon", "afternoon2"], rating: 4.5, price: 35, dogFriendly: true, outdoor: true, iconic: false, icon: "wine" },
  { id: "frogs-leap", type: "winery", name: "Frog's Leap", note: "Organic gardens · relaxed porch tasting", slots: ["lateMorning", "afternoon2"], rating: 4.6, price: 40, dogFriendly: true, outdoor: true, iconic: false, icon: "wine" },

  // ---- restaurants ----
  { id: "oxbow", type: "restaurant", name: "Oxbow Public Market", note: "Lunch hall · casual, dog-friendly patio", slots: ["lunch"], rating: 4.5, price: 28, dogFriendly: true, outdoor: true, iconic: true, icon: "food" },
  { id: "charter-oak", type: "restaurant", name: "The Charter Oak", note: "Farm-to-table · hearth cooking, 8 min drive", slots: ["dinner"], rating: 4.6, price: 75, dogFriendly: false, outdoor: true, iconic: true, icon: "food" },
  { id: "ad-hoc", type: "restaurant", name: "Ad Hoc", note: "Thomas Keller's casual spot · fried chicken night", slots: ["dinner"], rating: 4.5, price: 65, dogFriendly: false, outdoor: false, iconic: false, icon: "food" },
  { id: "bistro-jeanty", type: "restaurant", name: "Bistro Jeanty", note: "French bistro classic · tomato soup en croûte", slots: ["dinner", "lunch"], rating: 4.6, price: 70, dogFriendly: false, outdoor: false, iconic: false, icon: "food" },
  { id: "gott's", type: "restaurant", name: "Gott's Roadside", note: "Roadside burgers & shakes · dog-friendly tables", slots: ["lunch"], rating: 4.4, price: 22, dogFriendly: true, outdoor: true, iconic: false, icon: "food" },

  // ---- cafes / breakfast ----
  { id: "model-bakery", type: "cafe", name: "Model Bakery", note: "The famous English muffins · go early", slots: ["breakfast"], rating: 4.7, price: 12, dogFriendly: true, outdoor: true, iconic: true, icon: "coffee" },
  { id: "bouchon-bakery", type: "cafe", name: "Bouchon Bakery", note: "Keller's bakery · croissants & macarons", slots: ["breakfast"], rating: 4.6, price: 15, dogFriendly: true, outdoor: true, iconic: false, icon: "coffee" },

  // ---- activities ----
  { id: "drive-up", type: "activity", name: "Drive up", note: "1h 20m from SF · no tolls this route", slots: ["morning"], rating: 4.5, price: 0, dogFriendly: true, outdoor: false, iconic: false, icon: "drive" },
  { id: "balloon", type: "activity", name: "Hot-air balloon (optional)", note: "Weather-dependent · decide the night before", slots: ["lateMorning"], rating: 4.8, price: 280, dogFriendly: false, outdoor: true, iconic: true, icon: "balloon" },
  { id: "spa", type: "activity", name: "Spa morning at the resort", note: "Slow start · book the 9am slot", slots: ["lateMorning"], rating: 4.5, price: 140, dogFriendly: false, outdoor: false, iconic: false, icon: "pin" },
  { id: "alston-park", type: "activity", name: "Alston Park off-leash trail", note: "Morning walk with valley views", slots: ["lateMorning"], rating: 4.6, price: 0, dogFriendly: true, outdoor: true, iconic: false, icon: "pin" },
  { id: "drive-back", type: "activity", name: "Head back", note: "Leave by 3:30pm to beat bridge traffic", slots: ["depart"], rating: 4.5, price: 0, dogFriendly: true, outdoor: false, iconic: false, icon: "drive" },

  // ---- hotels ----
  { id: "meritage", type: "hotel", name: "Meritage Resort & Spa", note: "Vineyard view · free cancellation", slots: ["checkin"], rating: 4.6, price: 289, dogFriendly: true, outdoor: true, iconic: true, icon: "hotel" },
  { id: "andaz", type: "hotel", name: "Andaz Napa", note: "Downtown · walk to dinner", slots: ["checkin"], rating: 4.7, price: 342, dogFriendly: false, outdoor: false, iconic: false, icon: "hotel" },
  { id: "riverpointe", type: "hotel", name: "RiverPointe Cottages", note: "Budget pick · riverside cabin", slots: ["checkin"], rating: 4.4, price: 198, dogFriendly: true, outdoor: true, iconic: false, icon: "hotel" },
  { id: "auberge", type: "hotel", name: "Auberge du Soleil", note: "The splurge · valley-view terraces", slots: ["checkin"], rating: 4.9, price: 1200, dogFriendly: false, outdoor: true, iconic: true, icon: "hotel" },
];

export const SLOT_TEMPLATE: { day: string; slot: Slot; time: string }[][] = [
  [
    { day: "Saturday", slot: "morning", time: "10:00" },
    { day: "Saturday", slot: "lunch", time: "12:00" },
    { day: "Saturday", slot: "afternoon", time: "14:00" },
    { day: "Saturday", slot: "checkin", time: "17:30" },
    { day: "Saturday", slot: "dinner", time: "19:30" },
  ],
  [
    { day: "Sunday", slot: "breakfast", time: "09:00" },
    { day: "Sunday", slot: "lateMorning", time: "10:30" },
    { day: "Sunday", slot: "afternoon2", time: "13:00" },
    { day: "Sunday", slot: "depart", time: "15:30" },
  ],
];

export const DAY_LABELS = ["Saturday", "Sunday"];
export const DEFAULT_DATES = "Sat Sep 12 – Sun Sep 13";
export const DESTINATION = "Napa Valley";
