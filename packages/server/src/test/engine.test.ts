import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { NAPA, SLOT_TEMPLATE, DAY_LABELS } from "../data/napa.js";
import { buildDays, pickHotels, estimateTotal } from "../engine.js";
import type { TripState, TripDayState, HotelOption } from "../state/store.js";

/**
 * Tests for the itinerary engine (packages/server/src/engine.ts).
 *
 * Expected values below are derived by hand from the actual scoring code, not
 * copied from a run. The derivation is written next to each assertion so a
 * future reader can re-check it against the dataset.
 */

type Prefs = Required<TripState["prefs"]>;

const BALANCED: Prefs = { dogFriendly: false, budget: "balanced" };
const BUDGET: Prefs = { dogFriendly: false, budget: "budget" };
const LUXURY: Prefs = { dogFriendly: false, budget: "luxury" };
const DOG: Prefs = { dogFriendly: true, budget: "balanced" };

const venueById = new Map(NAPA.map((v) => [v.id, v] as const));
const idsOf = (day: TripDayState) => day.items.map((i) => i.venueId);
const allIds = (days: TripDayState[]) => days.flatMap(idsOf);

function hotel(overrides: Partial<HotelOption> & { id: string; price: number }): HotelOption {
  return { name: overrides.id, rating: 4.5, note: "", tag: null, ...overrides };
}

describe("buildDays — slot template", () => {
  test("produces two days with the template's 5 + 4 slots", () => {
    const days = buildDays(BALANCED);

    assert.equal(SLOT_TEMPLATE.length, 2, "template is a two-day trip");
    assert.equal(SLOT_TEMPLATE[0].length, 5);
    assert.equal(SLOT_TEMPLATE[1].length, 4);
    assert.equal(days.length, 2);
    assert.deepEqual(days.map((d) => d.label), DAY_LABELS);
    assert.equal(days[0].items.length, 5, "Saturday: morning/lunch/afternoon/checkin/dinner");
    assert.equal(days[1].items.length, 4, "Sunday: breakfast/lateMorning/afternoon2/depart");
    assert.deepEqual(
      days.map((d) => d.items.map((i) => i.time)),
      [
        ["10:00", "12:00", "14:00", "17:30", "19:30"],
        ["09:00", "10:30", "13:00", "15:30"],
      ],
    );
  });

  test("default prefs pick the highest-scoring venue per slot (hand-derived)", () => {
    // scoreVenue = rating*10 + (iconic ? 4 : 0), checkin adds a budget bonus.
    //   morning   : only "drive-up" offers the slot
    //   lunch     : oxbow 49 (iconic) > bistro-jeanty 46 > gott's 44
    //   afternoon : opus-one 52 (48+4) > castello 51 > domaine-carneros 50
    //   checkin   : meritage 57.82 > andaz 54.3 > auberge 53 > riverpointe 50.3
    //   dinner    : charter-oak 50 (46+4) > bistro-jeanty 46 > ad-hoc 45
    //   breakfast : model-bakery 51 (47+4) > bouchon-bakery 46
    //   lateMorning: balloon 52 (48+4) > alston-park/frogs-leap 46
    //   afternoon2: domaine-carneros 50 (46+4, still unused) > frogs-leap 46
    //   depart    : only "drive-back" offers the slot
    const days = buildDays(BALANCED);
    assert.deepEqual(idsOf(days[0]), [
      "drive-up",
      "oxbow",
      "opus-one",
      "meritage",
      "charter-oak",
    ]);
    assert.deepEqual(idsOf(days[1]), [
      "model-bakery",
      "balloon",
      "domaine-carneros",
      "drive-back",
    ]);
  });

  test("never schedules the same venue twice in one trip", () => {
    for (const prefs of [BALANCED, BUDGET, LUXURY, DOG]) {
      const ids = allIds(buildDays(prefs));
      assert.equal(
        new Set(ids).size,
        ids.length,
        `duplicate venue for prefs ${JSON.stringify(prefs)}: ${ids.join(",")}`,
      );
    }
  });

  test("every scheduled item references a real dataset venue with its own note/icon", () => {
    for (const id of allIds(buildDays(BALANCED))) {
      const venue = venueById.get(id);
      assert.ok(venue, `unknown venueId ${id}`);
      assert.ok(venue.note.length > 0);
      assert.ok(venue.icon.length > 0);
    }
  });
});

describe("buildDays — dog-friendly constraint", () => {
  test("every scheduled stop is dog-friendly and balloon/spa are excluded", () => {
    const days = buildDays(DOG);
    const ids = allIds(days);

    assert.ok(ids.length > 0, "dog-friendly plan should still schedule stops");
    for (const id of ids) {
      const venue = venueById.get(id);
      assert.ok(venue, `unknown venueId ${id}`);
      assert.equal(venue.dogFriendly, true, `${venue.name} is not dog-friendly`);
    }
    // Both would out-score the dog-friendly alternatives on raw rating.
    assert.ok(!ids.includes("balloon"), "hot-air balloon is not dog-friendly");
    assert.ok(!ids.includes("spa"), "spa is not dog-friendly");
    // Check by exact name (a substring match would wrongly flag the dog-friendly
    // "Meritage Resort & Spa" hotel, whose name contains "Spa").
    const bannedTitles = new Set(["Hot-air balloon (optional)", "Spa morning at the resort"]);
    assert.ok(
      days.every((d) => d.items.every((i) => !bannedTitles.has(i.title))),
      "balloon/spa must not leak into the plan",
    );
  });

  test("drops the Saturday dinner slot because no dinner venue is dog-friendly", () => {
    // Saturday: morning=drive-up, lunch=oxbow, afternoon=domaine-carneros (56),
    // checkin=meritage, dinner → charter-oak/ad-hoc/bistro-jeanty are all
    // dogFriendly:false, so pickForSlot returns undefined and the slot is skipped.
    // Sunday: breakfast=model-bakery, lateMorning=frogs-leap|alston-park (tie at 52),
    // afternoon2=domaine-carneros already used → v-sattui (51), depart=drive-back.
    const days = buildDays(DOG);

    assert.equal(days[0].items.length, 4);
    assert.equal(days[1].items.length, 4);
    assert.ok(
      !days[0].items.some((i) => i.time === "19:30"),
      "no dog-friendly dinner exists, so 19:30 must be empty",
    );
    assert.equal(idsOf(days[0])[2], "domaine-carneros", "dog bonus favors the dog-friendly winery");
    assert.ok(
      ["frogs-leap", "alston-park"].includes(idsOf(days[1])[1]),
      "lateMorning tie between the two dog-friendly alternatives",
    );
  });

  test("dog-friendly hotel ranking only contains dog-friendly hotels", () => {
    const hotels = pickHotels(DOG);
    assert.ok(hotels.length > 0);
    for (const h of hotels) {
      assert.equal(venueById.get(h.id)?.dogFriendly, true, `${h.name} is not dog-friendly`);
    }
    // andaz (4.7, no dog) and auberge (4.9, no dog) are filtered out entirely.
    assert.deepEqual(hotels.map((h) => h.id).sort(), ["meritage", "riverpointe"]);
  });
});

describe("pickHotels — budget drives the ranking", () => {
  test("balanced: meritage > andaz > auberge (hand-derived scores)", () => {
    // checkin score = rating*10 + iconic*4 + max(0, 8 - |price-300|/60)
    //   meritage   : 46+4    + 7.8167 = 57.8167
    //   andaz      : 47      + 7.3    = 54.3
    //   auberge    : 49+4    + 0      = 53     (|1200-300|/60 = 15 → clamped)
    //   riverpointe: 44      + 6.3    = 50.3
    const hotels = pickHotels(BALANCED);
    assert.deepEqual(hotels.map((h) => h.id), ["meritage", "andaz", "auberge"]);
    assert.equal(hotels[0].tag, "Our pick");
    assert.deepEqual(hotels.slice(1).map((h) => h.tag), [null, null]);
  });

  test("budget: meritage > auberge > riverpointe (price bonus favors cheap nights)", () => {
    // bonus = max(0, (400 - price)/25)
    //   meritage   : 50    + 4.44  = 54.44
    //   auberge    : 53    + 0     = 53     (price 1200 → clamped)
    //   riverpointe: 44    + 8.08  = 52.08
    //   andaz      : 47    + 2.32  = 49.32
    const hotels = pickHotels(BUDGET);
    assert.deepEqual(hotels.map((h) => h.id), ["meritage", "auberge", "riverpointe"]);
    assert.equal(hotels[0].tag, "Our pick");
  });

  test("luxury: auberge > meritage > andaz (expensive nights rank first)", () => {
    // bonus = price/250
    //   auberge    : 53 + 4.8    = 57.8
    //   meritage   : 50 + 1.156  = 51.156
    //   andaz      : 47 + 1.368  = 48.368
    //   riverpointe: 44 + 0.792  = 44.792
    const hotels = pickHotels(LUXURY);
    assert.deepEqual(hotels.map((h) => h.id), ["auberge", "meritage", "andaz"]);
    assert.equal(hotels[0].tag, "Our pick");
  });

  test("budget vs luxury flip the ranking direction (cheap-vs-expensive sanity)", () => {
    const budget = pickHotels(BUDGET);
    const luxury = pickHotels(LUXURY);

    // Luxury's pick is the most expensive hotel in the dataset; budget's is not.
    assert.equal(luxury[0].id, "auberge");
    assert.equal(luxury[0].price, 1200);
    assert.ok(luxury[0].price > budget[0].price);

    // The cheapest hotel (riverpointe, $198) cracks budget's top 3 but is
    // squeezed out of luxury's by the price term.
    assert.ok(budget.some((h) => h.id === "riverpointe"));
    assert.ok(!luxury.some((h) => h.id === "riverpointe"));
  });

  test("returns at most three hotels, each priced from the dataset", () => {
    for (const prefs of [BALANCED, BUDGET, LUXURY, DOG]) {
      const hotels = pickHotels(prefs);
      assert.ok(hotels.length <= 3);
      for (const h of hotels) {
        assert.equal(h.price, venueById.get(h.id)?.price);
        assert.equal(h.name, venueById.get(h.id)?.name);
      }
    }
  });
});

describe("estimateTotal", () => {
  test("sums activity price × party, then adds the first hotel's nightly rate", () => {
    const days: TripDayState[] = [
      {
        label: "Day 1",
        items: [
          { time: "10:00", icon: "pin", title: "A", note: "", venueId: "a" },
          { time: "12:00", icon: "pin", title: "B", note: "", venueId: "b" },
        ],
      },
    ];
    const hotels = [hotel({ id: "h1", price: 200 }), hotel({ id: "h2", price: 99 })];
    const dataset = [
      { id: "a", price: 10 },
      { id: "b", price: 25 },
    ] as unknown as typeof NAPA;

    // (10 + 25) × 3 travelers + 200 first-hotel = 105 + 200 = 305
    assert.equal(estimateTotal(days, hotels, 3, dataset), 305);
    // Only hotels[0] is charged; the second option never enters the math.
    assert.equal(estimateTotal(days, [hotels[1]], 3, dataset), 105 + 99);
    // Unknown ids contribute 0 instead of NaN.
    assert.equal(
      estimateTotal(
        [{ label: "d", items: [{ time: "t", icon: "pin", title: "?", note: "", venueId: "nope" }] }],
        [],
        4,
        dataset,
      ),
      0,
    );
  });

  test("real plan math is non-hotel activities × party + first hotel night", () => {
    const days = buildDays(BALANCED);
    const hotels = pickHotels(BALANCED);

    // Per-person activities, default plan (hotel-type items are excluded —
    // they are priced per-night, not per-person):
    //   Sat: drive-up 0 + oxbow 28 + opus-one 100 + charter-oak 75 = 203
    //   Sun: model-bakery 12 + balloon 280 + domaine-carneros 45 + drive-back 0 = 337
    //   540 × party 2 = 1080; plus one night at hotels[0] (meritage 289) = 1369.
    assert.equal(estimateTotal(days, hotels, 2), 1369);
    assert.equal(hotels[0].id, "meritage");
  });

  test("estimateTotal does not mutate the plan it is given", () => {
    const days = buildDays(BALANCED);
    const hotels = pickHotels(BALANCED);
    const before = JSON.stringify({ days, hotels });
    estimateTotal(days, hotels, 2);
    assert.equal(JSON.stringify({ days, hotels }), before);
  });
});

describe("NAPA dataset sanity", () => {
  test("has unique ids and every venue is reachable through at least one slot", () => {
    const ids = NAPA.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "ids must be unique");
    assert.ok(NAPA.length >= 20, `expected a full dataset, got ${NAPA.length}`);
    for (const v of NAPA) {
      assert.ok(v.slots.length > 0, `${v.id} has no slots`);
      assert.ok(v.rating >= 1 && v.rating <= 5, `${v.id} rating out of range`);
      assert.ok(v.price >= 0, `${v.id} has a negative price`);
    }
  });

  test("every slot named in the template has at least one eligible venue", () => {
    const wanted = new Set(SLOT_TEMPLATE.flat().map((s) => s.slot));
    for (const slot of wanted) {
      assert.ok(
        NAPA.some((v) => v.slots.includes(slot)),
        `no venue offers slot ${slot}`,
      );
    }
  });

  test("hotels are checkin-only, and every checkin venue is a hotel", () => {
    for (const v of NAPA.filter((x) => x.type === "hotel")) {
      assert.deepEqual(v.slots, ["checkin"], `${v.id} should only be a checkin slot`);
    }
    for (const v of NAPA.filter((x) => x.slots.includes("checkin"))) {
      assert.equal(v.type, "hotel", `${v.id} is in the checkin pool but is not a hotel`);
    }
  });
});
