import { test } from "node:test";
import assert from "node:assert/strict";
import { operationOf, replaceSegment, segmentOf } from "../scraper/lib/segments.mjs";
import { sourcesFor } from "../scraper/lib/sources.mjs";
import { buildMarket, zoneMedian } from "../scraper/lib/market.mjs";
import { scoreListing } from "../scraper/lib/score.mjs";
import { enrich } from "../scraper/lib/enrich.mjs";
import { normalize } from "../scraper/lib/text.mjs";
import { config, makeListing } from "./helpers.mjs";

test("each listing belongs to one segment; old listings are sales", () => {
  assert.equal(segmentOf({ type: "casa" }), "venta");
  assert.equal(segmentOf({ type: "terreno", operation: "venta" }), "venta");
  assert.equal(segmentOf({ type: "departamento", operation: "venta" }), "deptos");
  assert.equal(segmentOf({ type: "departamento", operation: "alquiler" }), "alquiler");
  assert.equal(segmentOf({ type: "casa", operation: "alquiler" }), "alquiler");
  assert.equal(operationOf("alquiler"), "alquiler");
  assert.equal(operationOf("deptos"), "venta");
});

test("a segment run replaces only that segment", () => {
  const existing = [{ id: "c", type: "casa" }, { id: "d1", type: "departamento", operation: "venta" }, { id: "a", type: "casa", operation: "alquiler" }];
  const merged = replaceSegment(existing, [{ id: "d2", type: "departamento", operation: "venta" }], "deptos");
  assert.deepEqual(merged.map(l => l.id), ["c", "a", "d2"]);
});

const sources = {
  inmoclick: { maxPages: 80, segments: { venta: { casas: "casa" } }, quick: { order: "recent", maxPages: 3 } },
  inmoup: { maxPages: 300, segments: { venta: { "casas-en-venta": "casa" }, alquiler: { "casas-en-alquiler": "casa" } } },
};

test("sources run only the groups of the requested segment", () => {
  assert.deepEqual(sourcesFor(sources, "full", "alquiler"), [["inmoup", { maxPages: 300, groups: { "casas-en-alquiler": "casa" } }]]);
  assert.deepEqual(sourcesFor(sources, "full", "venta").map(([name]) => name), ["inmoclick", "inmoup"]);
});

test("quick mode uses only sources with quick options, merged", () => {
  assert.deepEqual(sourcesFor(sources, "quick", "venta"), [["inmoclick", { maxPages: 3, groups: { casas: "casa" }, order: "recent" }]]);
});

const listing = overrides => enrich(makeListing(overrides), config);

test("market medians are kept apart by operation and type", () => {
  const rents = [10, 11, 12, 13, 14].map((usd, i) => listing({ id: `r${i}`, type: "departamento", operation: "alquiler", usd: usd * 30, supC: 50, supT: null }));
  const sales = [1, 2, 3, 4, 5].map(i => listing({ id: `s${i}`, type: "departamento", operation: "venta", usd: 60000 + i * 1000, supC: 50, supT: null }));
  const market = buildMarket([...rents, ...sales], config.segment, ["departamento", "alquiler-departamento"]);
  assert.equal(zoneMedian(market, rents[0], 5), 7);
  assert.equal(zoneMedian(market, sales[0], 5), 1260);
  assert.deepEqual(Object.keys(market).sort(), ["alquiler-departamento", "departamento"]);
});

const labels = l => scoreListing(l, 500, config.scoring, config.maxMinutes).breakdown.map(f => f.label);

test("rentals are not scored on mortgage credit", () => {
  assert.ok(!labels(listing({ operation: "alquiler" })).includes("Apto crédito"));
  assert.ok(labels(listing({ operation: "venta" })).includes("Apto crédito"));
});

test("apartments only get patio points when the listing mentions it", () => {
  const patioPts = l => scoreListing(l, 500, config.scoring, config.maxMinutes).breakdown.find(f => f.label === "Patio").pts;
  assert.equal(patioPts(listing({ type: "departamento", supT: 300, supC: 60 })), 0);
  assert.ok(patioPts(listing({ type: "departamento", supC: 60, text: normalize("depto con patio propio") })) > 0);
});
