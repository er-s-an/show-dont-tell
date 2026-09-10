/**
 * End-to-end smoke test against a running server (default http://localhost:3001/mcp).
 * Exercises the full golden path: list → plan → adjust → book → confirm → recall.
 *
 *   npm start &   →   node scripts/smoke.mjs
 */

const BASE = process.env.SDT_MCP_URL ?? "http://localhost:3001/mcp";
let idSeq = 0;

async function rpc(method, params = {}, headers = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Method": method,
      ...(method === "tools/call" && params?.name ? { "Mcp-Name": params.name } : {}),
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++idSeq, method, params }),
  });
  if (!res.ok) throw new Error(`${method} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  // Streamable HTTP answers as SSE frames; tolerate plain JSON too.
  const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
  const payload = dataLine ? dataLine.slice(5).trim() : text;
  const msg = JSON.parse(payload);
  if (msg.error) throw new Error(`${method} → ${JSON.stringify(msg.error)}`);
  return msg.result;
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`);
}

const result = await rpc("tools/list");
const names = result.tools.map((t) => t.name);
check("tools/list returns 6 tools", names.length === 6, names.join(", "));

const planTool = result.tools.find((t) => t.name === "plan-weekend-trip");
const ui = planTool?._meta?.ui?.resourceUri ?? planTool?._meta?.["ui/resourceUri"];
check("plan-weekend-trip declares a ui resource", ui === "ui://trip/itinerary.html", ui);

const planned = await rpc("tools/call", {
  name: "plan-weekend-trip",
  arguments: { conversationId: "smoke", party: 2 },
});
const trip = planned.structuredContent;
check("plan returns itinerary card data", !!trip?.tripId && trip.days.length === 2);
check(
  "engine picks per-slot venues",
  trip.days[0].items.length === 5 && trip.days[1].items.length === 4,
);
console.log(`   · tripId=${trip.tripId} · est $${trip.estimatedTotal} · pick=${trip.hotels[0].name}`);

const adjusted = await rpc("tools/call", {
  name: "adjust-trip",
  arguments: { tripId: trip.tripId, instruction: "make it dog-friendly" },
});
const dog = adjusted.structuredContent;
const allTitles = dog.days.flatMap((d) => d.items.map((i) => i.title)).join(" | ");
check(
  "adjust-trip removes non-dog-friendly venues",
  /dog-friendly/.test(dog.subtitle) &&
    !/Hot-air balloon|Spa morning/.test(allTitles),
  `sunday lateMorning → ${dog.days[1].items[1]?.title}`,
);

const quote = await rpc("tools/call", {
  name: "book-hotel",
  arguments: { tripId: trip.tripId, hotelName: dog.hotels[0].name },
});
const q = quote.structuredContent;
check(
  "book-hotel returns requires_confirmation + token, no charge",
  q.booking?.status === "requires_confirmation" && typeof q.bookingToken === "string",
  `total $${q.booking.total} (incl. $${q.booking.taxes} taxes)`,
);

const bad = await rpc("tools/call", {
  name: "confirm-booking",
  arguments: { tripId: trip.tripId, bookingToken: "bk_wrong" },
});
check("confirm with wrong token is refused", bad.isError === true);

const booked = await rpc("tools/call", {
  name: "confirm-booking",
  arguments: { tripId: trip.tripId, bookingToken: q.bookingToken },
});
check(
  "confirm-booking completes with confirmation code",
  booked.structuredContent.booking?.status === "confirmed",
  booked.structuredContent.booking?.confirmation,
);

const recalled = await rpc("tools/call", { name: "get-trip", arguments: { tripId: trip.tripId } });
check(
  "get-trip recalls state across sessions (booking intact)",
  recalled.structuredContent.booking?.status === "confirmed",
);

const list = await rpc("tools/call", { name: "list-trips", arguments: { conversationId: "smoke" } });
check("list-trips finds the planned trip", list.structuredContent.trips.length >= 1);

const res = await rpc("resources/read", { uri: "ui://trip/itinerary.html" });
const html = res.contents?.[0]?.text ?? "";
check("ui resource serves the built card", html.includes("Trip Itinerary Card") && html.length > 100_000);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
