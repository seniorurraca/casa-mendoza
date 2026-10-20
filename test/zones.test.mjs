import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ZONE_PREFS, activeZones, applyZones, areaZone, countMatches, customZone, zoneFor } from "../docs/js/zones.js";
import { applyFilters, DEFAULT_FILTERS } from "../docs/js/filters.js";
import { wrapIndex } from "../docs/js/carousel.js";
import { config } from "./helpers.mjs";

const defaults = config.dangerZones;
const listing = (locationText, overrides = {}) => ({
  id: locationText, type: "casa", usd: 50000, minutes: 10, department: "Godoy Cruz", locationText,
  features: { credito: false, patio: false }, baseScore: 60, baseBreakdown: [], firstSeen: "2026-10-18", ...overrides,
});
const zonesWith = prefs => activeZones(defaults, { ...DEFAULT_ZONE_PREFS, ...prefs });

test("default zones match by location text", () => {
  const zones = zonesWith({});
  assert.equal(zoneFor(listing("barrio la gloria godoy cruz"), zones).level, "high");
  assert.equal(zoneFor(listing("b° sargento cabral"), zones).level, "medium");
  assert.equal(zoneFor(listing("av. san martin 1200"), zones), null);
  assert.equal(zoneFor(listing("barrio san martin"), zones).level, "high");
});

test("disabling a default zone stops matching it", () => {
  assert.equal(zoneFor(listing("barrio la gloria"), zonesWith({ disabled: ["La Gloria (Godoy Cruz)"] })), null);
});

test("custom zones are accent-insensitive and regex-safe", () => {
  const zone = customZone("Barrio Bombal (Sur)", "medium");
  const zones = zonesWith({ custom: [zone] });
  assert.equal(zoneFor(listing("casa en barrio bombal (sur) godoy cruz"), zones).name, "Barrio Bombal (Sur)");
  assert.equal(zoneFor(listing("barrio bombal norte"), zones), null);
  assert.equal(countMatches([listing("x barrio bombal (sur)"), listing("y")], zone), 1);
});

test("high zones are hidden and medium zones lose points", () => {
  const zoned = applyZones([listing("barrio lihue"), listing("b° escorihuela"), listing("centro")], zonesWith({}), -15);
  const visible = applyFilters(zoned, DEFAULT_FILTERS);
  assert.deepEqual(visible.map(l => l.id), ["centro", "b° escorihuela"]);
  const medium = zoned.find(l => l.id === "b° escorihuela");
  assert.equal(medium.score, 45);
  assert.deepEqual(medium.breakdown.at(-1), { label: "Zona: Escorihuela (Las Heras)", pts: -15 });
});

test("carousel index wraps both ways", () => {
  assert.equal(wrapIndex(-1, 5), 4);
  assert.equal(wrapIndex(5, 5), 0);
  assert.equal(wrapIndex(2, 5), 2);
});

test("an ignored area hides listings within its radius only", () => {
  const center = listing("calle sin nombre", { id: "centro-area", lat: -32.9, lng: -68.8, address: "Calle 1" });
  const area = areaZone(center, 500);
  const near = listing("otra calle", { id: "near", lat: -32.903, lng: -68.8 });
  const far = listing("lejos", { id: "far", lat: -32.91, lng: -68.8 });
  const noCoords = listing("sin coordenadas", { id: "nc", lat: null, lng: null });
  const zones = zonesWith({ areas: [area] });
  assert.deepEqual([center, near, far, noCoords].map(l => zoneFor(l, zones)?.level ?? null), ["high", "high", null, null]);
  assert.equal(countMatches([center, near, far, noCoords], area), 2);
  assert.equal(area.name, "500 m alrededor de Calle 1");
});
