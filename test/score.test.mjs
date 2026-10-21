import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich } from "../scraper/lib/enrich.mjs";
import { scoreListing } from "../scraper/lib/score.mjs";
import { AREA_RULES, OFFER_RULES, discardReason } from "../scraper/lib/filters.mjs";
import { buildMarket, median, zoneMedian } from "../scraper/lib/market.mjs";
import { withHistory } from "../scraper/lib/history.mjs";
import { normalize } from "../scraper/lib/text.mjs";
import { config, makeListing } from "./helpers.mjs";

const build = (overrides = {}) => enrich(makeListing(overrides), config);
const score = (listing, zonePpm = 500) => scoreListing(listing, zonePpm, config.scoring, config.maxMinutes);

test("credito + patio + cheap listing scores high", () => {
  const great = score(build({ usd: 35000, text: normalize("apta credito, patio, cochera") }));
  assert.ok(great.score >= 85, `score ${great.score}`);
});

test("credito outranks equal listing without credito", () => {
  const withCredit = score(build({ text: "apto credito" }));
  const without = score(build());
  assert.ok(withCredit.score - without.score >= 20);
});

test("expensive vs zone gets no price points", () => {
  const pricey = score(build({ usd: 70000 }));
  assert.equal(pricey.breakdown.find(f => f.label === "Precio vs zona").pts, 0);
});

test("posesion penalty drops score", () => {
  const clean = score(build({ text: "apto credito" }));
  const trap = score(build({ text: "apto credito, derechos posesorios" }));
  assert.equal(clean.score - trap.score, 30);
});

test("huge discount is flagged suspicious", () => {
  assert.equal(score(build({ usd: 15000 })).suspicious, true);
  assert.equal(score(build()).suspicious, false);
});

test("terrenos are scored only on price and proximity", () => {
  const labels = score(build({ type: "terreno", usd: 20000, supT: 400 }), 80).breakdown.map(f => f.label);
  assert.deepEqual(labels, ["Precio vs zona", "Cercanía"]);
});

test("area rules discard far, priceless and out-of-area listings", () => {
  const reason = overrides => discardReason(build(overrides), config, AREA_RULES);
  assert.equal(reason({ lat: -33.2, lng: -68.9 }), "lejos del centro");
  assert.equal(reason({ locationText: "barrio lihue" }), null);
  assert.equal(reason({ usd: null }), "sin precio");
  assert.equal(reason({ department: "San Rafael" }), "fuera de Gran Mendoza");
  assert.equal(reason({ department: "Guaymallén" }), null);
});

test("offer rules keep only cheap, big-enough terrenos", () => {
  const reason = overrides => discardReason(build({ type: "terreno", ...overrides }), config, OFFER_RULES);
  assert.equal(reason({ usd: 40000, supT: 500 }), "terreno caro");
  assert.equal(reason({ usd: 20000, supT: 150 }), "terreno chico");
  assert.equal(reason({ usd: 20000, supT: 400 }), null);
});

test("market median by department with fallback to overall", () => {
  const listings = [400, 500, 600, 700, 800].map((ppm, i) => build({ id: `g${i}`, usd: ppm * 100 }))
    .concat(build({ id: "m1", department: "Maipu", usd: 90000 }));
  const market = buildMarket(listings, config.segment, ["casa", "terreno"]);
  assert.equal(zoneMedian(market, listings[0], 5), 600);
  assert.equal(zoneMedian(market, listings.at(-1), 5), 650);
  assert.equal(median([1, 3]), 2);
});

test("history keeps firstSeen and remembers previous price", () => {
  const previous = new Map([["test-1", { id: "test-1", usd: 60000, firstSeen: "2026-10-01", prevUsd: null }]]);
  const seen = { "test-1": "2026-10-01T00:00:00.000Z", new: "2026-10-18T09:30:00.000Z" };
  const updated = withHistory({ id: "test-1", usd: 55000 }, previous, seen);
  assert.deepEqual([updated.firstSeen, updated.firstSeenAt, updated.prevUsd], ["2026-10-01", "2026-10-01T00:00:00.000Z", 60000]);
  const fresh = withHistory({ id: "new", usd: 1 }, previous, seen);
  assert.deepEqual([fresh.firstSeen, fresh.firstSeenAt], ["2026-10-18", "2026-10-18T09:30:00.000Z"]);
});
