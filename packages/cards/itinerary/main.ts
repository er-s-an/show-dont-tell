import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/client";
import "../shared/design-system.css";
import { ICONS, HERO_SCENE, HOTEL_SCENES } from "../shared/icons.js";

/* ================= types (contract with @sdt/server) ================= */

interface TripItem { time: string; icon: string; title: string; note: string }
interface TripDay { label: string; stops: number; items: TripItem[] }
interface Hotel { id: string; name: string; price: number; rating: number; note: string; tag: string | null }
interface BookingInfo {
  status: "requires_confirmation" | "confirmed";
  hotelName: string;
  pricePerNight: number;
  taxes: number;
  total: number;
  confirmation: string | null;
}
interface TripCard {
  tripId: string;
  title: string;
  subtitle: string;
  days: TripDay[];
  hotels: Hotel[];
  estimatedTotal: number;
  currency: string;
  booking: BookingInfo | null;
  bookingToken?: string;
}

/* ================= demo fallback data ================= */

const DEMO: TripCard = {
  tripId: "demo",
  title: "Weekend in Napa Valley",
  subtitle: "Sat Sep 12 – Sun Sep 13 · 2 travelers",
  days: [
    { label: "Saturday", stops: 5, items: [
      { time: "10:00", icon: "drive", title: "Drive up", note: "1h 20m from SF, no tolls" },
      { time: "12:00", icon: "food", title: "Oxbow Public Market", note: "Lunch · casual, dog-friendly patio" },
      { time: "14:00", icon: "wine", title: "Castello di Amorosa", note: "Castle winery tour · reserved 2pm slot" },
      { time: "17:30", icon: "hotel", title: "Check in · Meritage Resort", note: "Vineyard view room" },
      { time: "19:30", icon: "food", title: "Dinner at Charter Oak", note: "Farm-to-table, 8 min drive" },
    ]},
    { label: "Sunday", stops: 4, items: [
      { time: "09:00", icon: "coffee", title: "Model Bakery", note: "English muffins to go" },
      { time: "10:30", icon: "balloon", title: "Hot-air balloon (optional)", note: "Weather-dependent, decide Sat night" },
      { time: "13:00", icon: "wine", title: "Domaine Carneros", note: "Sparkling flight · terrace seats" },
      { time: "15:30", icon: "drive", title: "Head back", note: "Beat the 5pm bridge traffic" },
    ]},
  ],
  hotels: [
    { id: "meritage", name: "Meritage Resort & Spa", price: 289, rating: 4.6, note: "Vineyard view · free cancellation", tag: "Our pick" },
    { id: "andaz", name: "Andaz Napa", price: 342, rating: 4.7, note: "Downtown, walk to dinner", tag: null },
    { id: "riverpointe", name: "RiverPointe Cottages", price: 198, rating: 4.4, note: "Budget pick · riverside cabin", tag: null },
  ],
  estimatedTotal: 640,
  currency: "USD",
  booking: null,
};

const SCENE_BY_INDEX = ["vineyard", "downtown", "river"];

/* ================= element refs ================= */

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const heroWhereEl = $("#hero-where");
const titleEl = $("#trip-title");
const subtitleEl = $("#trip-subtitle");
const timelineEl = $("#timeline");
const hotelListEl = $("#hotel-list");
const hotelCountEl = $("#hotel-count");
const totalEl = $("#total");
const sheetEl = $("#sheet");
const sheetRowsEl = $("#sheet-rows");
const sheetNoteEl = $("#sheet-note");
const confirmationEl = $("#confirmation");
const confHotelEl = $("#conf-hotel");
const confDetailEl = $("#conf-detail");
const dogBtn = $("#dog-btn") as HTMLButtonElement;
const bookBtn = $("#book-btn") as HTMLButtonElement;
const sheetConfirmBtn = $("#sheet-confirm") as HTMLButtonElement;
const sheetCancelBtn = $("#sheet-cancel") as HTMLButtonElement;
const sheetXBtn = $("#sheet-x") as HTMLButtonElement;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

$("#hero").insertAdjacentHTML("afterbegin", HERO_SCENE);

/* ================= render ================= */

let currentTrip: TripCard | null = null;
let selectedHotel: string | null = null;
let pendingToken: string | null = null;

function countUp(el: HTMLElement, target: number, prefix = "$") {
  if (reduceMotion) { el.textContent = `${prefix}${target}`; return; }
  const start = performance.now();
  const dur = 700;
  const tick = (now: number) => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = `${prefix}${Math.round(target * (1 - Math.pow(1 - t, 3)))}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function render(trip: TripCard) {
  currentTrip = trip;
  pendingToken = trip.bookingToken ?? null;

  heroWhereEl.textContent = trip.title.replace(/^Weekend in /, "") + " · California";
  titleEl.textContent = trip.title;
  const dog = /dog-friendly/i.test(trip.subtitle);
  subtitleEl.innerHTML =
    `${ICONS.calendar}<span>${trip.subtitle}</span>` +
    (dog ? `<span class="pref-badge">${ICONS.paw}dog-friendly</span>` : "");
  if (dog) {
    dogBtn.disabled = true;
    dogBtn.innerHTML = `${ICONS.paw} Dog-friendly ✓`;
  }

  timelineEl.innerHTML = trip.days.map((day) => `
    <div class="day">
      <h3>${day.label}<small>${day.stops} stops</small></h3>
      <ol class="tl">
        ${day.items.map((it) => `
          <li class="tl-item">
            <span class="tl-time">${it.time}</span>
            <span class="tl-icon">${ICONS[it.icon] ?? ICONS.pin}</span>
            <div class="tl-body"><strong>${it.title}</strong><small>${it.note}</small></div>
          </li>`).join("")}
      </ol>
    </div>`).join("");

  hotelCountEl.textContent = `${trip.hotels.length} options`;
  hotelListEl.innerHTML = trip.hotels.map((h, i) => `
    <button class="hotel ${h.tag ? "recommended" : ""} ${selectedHotel === h.name ? "selected" : ""}"
            data-hotel="${h.name}" style="animation-delay:${i * 70}ms">
      ${h.tag ? `<span class="tag">${h.tag}</span>` : ""}
      <span class="scene-strip">${HOTEL_SCENES[SCENE_BY_INDEX[i % 3]]}</span>
      <span class="hotel-body">
        <strong>${h.name}</strong>
        <small>${h.note}</small>
        <span class="hotel-meta">
          <span class="rating">${ICONS.star} ${h.rating}</span>
          <span class="price">$${h.price}<small>/night</small></span>
        </span>
      </span>
    </button>`).join("");

  totalEl.innerHTML = `Est. total <strong id="total-num"></strong>`;
  countUp($("#total-num"), trip.estimatedTotal);

  hotelListEl.querySelectorAll<HTMLButtonElement>(".hotel").forEach((el) => {
    el.addEventListener("click", () => {
      selectedHotel = el.dataset.hotel === selectedHotel ? null : (el.dataset.hotel ?? null);
      hotelListEl.querySelectorAll(".hotel").forEach((x) => x.classList.toggle("selected", x.dataset.hotel === selectedHotel));
      bookBtn.innerHTML = selectedHotel
        ? `Book “${selectedHotel}” ${ICONS.arrow}`
        : `Book “Our pick” ${ICONS.arrow}`;
    });
  });

  if (trip.booking?.status === "confirmed") {
    showConfirmation(trip.booking.hotelName, trip.booking.confirmation ?? "—", trip.booking.total);
    bookBtn.disabled = true;
  } else if (trip.booking?.status === "requires_confirmation") {
    // Chat-initiated booking: the quote arrives with the card — open the sheet.
    confirmationEl.hidden = true;
    openSheet(trip.booking);
  } else {
    confirmationEl.hidden = true;
    sheetEl.hidden = true;
  }
}

/* ================= booking sheet ================= */

function openSheet(b: BookingInfo) {
  sheetRowsEl.innerHTML = `
    <div class="sheet-row"><span>${ICONS.hotel} Hotel</span><strong>${b.hotelName}</strong></div>
    <div class="sheet-row"><span>${ICONS.calendar} 1 night</span><span>$${b.pricePerNight}</span></div>
    <div class="sheet-row"><span>${ICONS.receipt} Taxes &amp; fees</span><span>$${b.taxes}</span></div>
    <div class="sheet-row total-row"><span>Total</span><span class="num">$${b.total}</span></div>`;
  sheetNoteEl.innerHTML = `${ICONS.shield}<span>Nothing is charged until you confirm. Quote held for 10 minutes.</span>`;
  sheetEl.hidden = false;
  sheetEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
}

function closeSheet() { sheetEl.hidden = true; }

function showConfirmation(hotel: string, conf: string, total: number) {
  confHotelEl.textContent = hotel;
  confDetailEl.textContent = `Booked · $${total} · Confirmation ${conf}`;
  confirmationEl.hidden = false;
}

/* ================= MCP wiring ================= */

const app = new App({ name: "Trip Itinerary Card", version: "1.0.0" });
let gotHostData = false;

function extract(result: CallToolResult): TripCard | null {
  const sc = result.structuredContent as Partial<TripCard> | undefined;
  return sc && Array.isArray(sc.days) && Array.isArray(sc.hotels) ? (sc as TripCard) : null;
}

app.ontoolresult = (result) => {
  gotHostData = true;
  const trip = extract(result);
  if (trip) render(trip);
};
app.onerror = console.error;
app.onteardown = async () => ({});

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
}
app.onhostcontextchanged = handleHostContextChanged;

async function call<T = CallToolResult>(name: string, args: Record<string, unknown>): Promise<T> {
  return (await app.callServerTool({ name, arguments: args })) as T;
}

dogBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  dogBtn.disabled = true;
  try {
    const result = await call("adjust-trip", {
      tripId: currentTrip.tripId,
      instruction: "make it dog-friendly",
    });
    const trip = extract(result);
    if (trip) render(trip);
  } catch (e) { console.error(e); }
  finally { setTimeout(() => { dogBtn.disabled = false; }, 600); }
});

bookBtn.addEventListener("click", async () => {
  if (!currentTrip) return;
  const hotel =
    currentTrip.hotels.find((h) => h.name === selectedHotel) ?? currentTrip.hotels[0];
  bookBtn.disabled = true;
  try {
    const result = await call("book-hotel", { tripId: currentTrip.tripId, hotelName: hotel.name });
    const sc = result.structuredContent as TripCard | undefined;
    if (sc?.booking?.status === "requires_confirmation") {
      pendingToken = sc.bookingToken ?? null;
      openSheet(sc.booking);
    }
  } catch (e) {
    console.error(e);
    // Standalone preview: simulate the quote locally.
    const taxes = Math.round(hotel.price * 0.15);
    pendingToken = "demo-token";
    openSheet({
      status: "requires_confirmation",
      hotelName: hotel.name,
      pricePerNight: hotel.price,
      taxes,
      total: hotel.price + taxes,
      confirmation: null,
    });
  } finally {
    setTimeout(() => { bookBtn.disabled = false; }, 600);
  }
});

sheetConfirmBtn.addEventListener("click", async () => {
  if (!currentTrip || !pendingToken) return;
  sheetConfirmBtn.disabled = true;
  try {
    const result = await call("confirm-booking", {
      tripId: currentTrip.tripId,
      bookingToken: pendingToken,
    });
    const trip = extract(result);
    if (trip) render(trip);
  } catch (e) {
    console.error(e);
    closeSheet();
    const hotel = currentTrip.hotels.find((h) => h.name === selectedHotel) ?? currentTrip.hotels[0];
    showConfirmation(hotel.name, "NP-DEMO42", hotel.price + Math.round(hotel.price * 0.15));
  } finally {
    setTimeout(() => { sheetConfirmBtn.disabled = false; }, 600);
  }
});

sheetCancelBtn.addEventListener("click", closeSheet);
sheetXBtn.addEventListener("click", closeSheet);

app.connect()
  .then(() => {
    const ctx = app.getHostContext();
    if (ctx) handleHostContextChanged(ctx);
  })
  .catch(() => { /* standalone preview */ });

setTimeout(() => {
  if (!gotHostData) render(DEMO);
}, 900);
