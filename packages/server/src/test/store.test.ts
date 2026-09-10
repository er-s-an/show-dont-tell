import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { TripStore, type TripState } from "../state/store.js";

/**
 * Tests for the file-backed trip store (packages/server/src/state/store.ts).
 *
 * Every store is pointed at a fresh directory under os.tmpdir() so the real
 * repo-local `.data/` (and any SDT_DATA_DIR) is never touched.
 */

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sdt-store-test-"));
}

function makeTrip(overrides: Partial<TripState> & { tripId: string }): TripState {
  const now = "2026-09-01T10:00:00.000Z";
  return {
    conversationId: "conv-a",
    destination: "Napa Valley",
    dates: "Sat Sep 12 – Sun Sep 13",
    party: 2,
    prefs: { dogFriendly: false, budget: "balanced" },
    days: [
      {
        label: "Saturday",
        items: [{ time: "10:00", icon: "drive", title: "Drive up", note: "", venueId: "drive-up" }],
      },
    ],
    hotels: [
      { id: "meritage", name: "Meritage Resort & Spa", price: 289, rating: 4.6, note: "", tag: "Our pick" },
    ],
    estimatedTotal: 1947,
    currency: "USD",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("TripStore — save/get", () => {
  test("round-trips a trip by tripId", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);

    const trip = makeTrip({ tripId: "trip_1" });
    const saved = store.save(trip);

    assert.equal(saved.tripId, "trip_1");
    assert.deepEqual(store.get("trip_1"), saved);
    assert.deepEqual(store.get("trip_1"), trip);
    assert.equal(store.get("trip_1")?.destination, "Napa Valley");
    assert.deepEqual(store.get("trip_1")?.hotels[0].name, "Meritage Resort & Spa");
  });

  test("returns undefined for an unknown tripId", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);

    assert.equal(store.get("nope"), undefined);
  });

  test("save stamps updatedAt but leaves createdAt alone", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);

    const trip = makeTrip({ tripId: "trip_1", updatedAt: "2000-01-01T00:00:00.000Z" });
    const saved = store.save(trip);

    assert.equal(saved.createdAt, "2026-09-01T10:00:00.000Z");
    assert.notEqual(saved.updatedAt, "2000-01-01T00:00:00.000Z");
    assert.ok(!Number.isNaN(Date.parse(saved.updatedAt)), "updatedAt must be an ISO timestamp");
    assert.equal(store.get("trip_1")?.updatedAt, saved.updatedAt);
  });

  test("treats tripId as the primary key: re-saving upserts instead of duplicating", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);

    store.save(makeTrip({ tripId: "trip_1", destination: "Napa Valley" }));
    store.save(makeTrip({ tripId: "trip_1", destination: "Sonoma" }));

    assert.equal(store.listByConversation("conv-a").length, 1);
    assert.equal(store.get("trip_1")?.destination, "Sonoma");

    const raw = JSON.parse(fs.readFileSync(path.join(dir, "trips.json"), "utf-8")) as {
      trips: Record<string, TripState>;
    };
    assert.deepEqual(Object.keys(raw.trips), ["trip_1"]);
  });
});

describe("TripStore — listByConversation", () => {
  test("returns only the matching conversation, newest createdAt first", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);

    store.save(makeTrip({ tripId: "a_old", conversationId: "conv-a", createdAt: "2026-09-01T10:00:00.000Z" }));
    store.save(makeTrip({ tripId: "a_new", conversationId: "conv-a", createdAt: "2026-09-03T10:00:00.000Z" }));
    store.save(makeTrip({ tripId: "a_mid", conversationId: "conv-a", createdAt: "2026-09-02T10:00:00.000Z" }));
    store.save(makeTrip({ tripId: "b_only", conversationId: "conv-b", createdAt: "2026-09-04T10:00:00.000Z" }));

    const a = store.listByConversation("conv-a");
    assert.deepEqual(a.map((x) => x.tripId), ["a_new", "a_mid", "a_old"]);

    const b = store.listByConversation("conv-b");
    assert.deepEqual(b.map((x) => x.tripId), ["b_only"]);

    assert.deepEqual(store.listByConversation("conv-missing"), []);
    assert.ok(
      a.every((x) => x.conversationId === "conv-a"),
      "no trip may leak across conversations",
    );

    // TODO(store robustness): sorting relies on `createdAt.localeCompare`.
    // TripStore.save() never stamps createdAt, so a trip saved without one
    // (server.ts always sets it today) makes listByConversation throw
    // `TypeError: Cannot read properties of undefined (reading 'localeCompare')`.
  });
});

describe("TripStore — persistence and file handling", () => {
  test("a new TripStore instance reads trips written by a previous one", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

    const writer = new TripStore(dir);
    const trip = writer.save(makeTrip({ tripId: "trip_persist" }));

    const reader = new TripStore(dir);
    assert.deepEqual(reader.get("trip_persist"), trip);
  });

  test("writes atomically: trips.json is valid JSON and no .tmp file is left behind", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);
    store.save(makeTrip({ tripId: "trip_1" }));
    store.save(makeTrip({ tripId: "trip_2" }));

    const file = path.join(dir, "trips.json");
    assert.ok(fs.existsSync(file));
    assert.ok(!fs.existsSync(`${file}.tmp`), "the tmp scratch file must be renamed away");

    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as { trips: Record<string, TripState> };
    assert.deepEqual(Object.keys(raw.trips).sort(), ["trip_1", "trip_2"]);
    assert.equal(raw.trips.trip_2.tripId, "trip_2");
  });

  test("only touches the directory it was given (no repo .data pollution)", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const store = new TripStore(dir);
    store.save(makeTrip({ tripId: "trip_1" }));

    assert.deepEqual(fs.readdirSync(dir), ["trips.json"]);
  });

  test("creates a missing nested directory on construction", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const nested = path.join(dir, "deep", "nested");

    const store = new TripStore(nested);
    store.save(makeTrip({ tripId: "trip_1" }));

    assert.ok(fs.existsSync(path.join(nested, "trips.json")));
    assert.deepEqual(store.get("trip_1")?.tripId, "trip_1");
  });

  test("a corrupted JSON file degrades to an empty store instead of throwing", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, "trips.json"), "{ this is not valid json", "utf-8");

    const store = new TripStore(dir);
    assert.equal(store.get("anything"), undefined);
    assert.deepEqual(store.listByConversation("conv-a"), []);
  });

  test("an empty file also degrades to an empty store", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, "trips.json"), "", "utf-8");

    const store = new TripStore(dir);
    assert.equal(store.get("anything"), undefined);
  });

  test("recovers from a corrupted file: a later save rewrites it as valid JSON", (t) => {
    const dir = tmpDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, "trips.json"), "!!!corrupt!!!", "utf-8");

    const store = new TripStore(dir);
    store.save(makeTrip({ tripId: "trip_recovered" }));

    const raw = JSON.parse(fs.readFileSync(path.join(dir, "trips.json"), "utf-8")) as {
      trips: Record<string, TripState>;
    };
    assert.deepEqual(Object.keys(raw.trips), ["trip_recovered"]);

    const reloaded = new TripStore(dir);
    assert.equal(reloaded.get("trip_recovered")?.tripId, "trip_recovered");
  });
});
