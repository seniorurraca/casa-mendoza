import { test } from "node:test";
import assert from "node:assert/strict";
import { mapsUrl } from "../docs/js/maps.js";
import { DEFAULT_FILTERS, applyFilters } from "../docs/js/filters.js";

const listing = (overrides = {}) => ({
  id: "a", type: "casa", usd: 50000, department: "Godoy Cruz", address: "Calle 1", minutes: 12,
  lat: -32.9163, lng: -68.8314, features: { credito: false, patio: false }, suspicious: false,
  score: 50, discount: 0.1, firstSeen: "2026-10-18", ...overrides,
});

test("google maps link uses coordinates when available", () => {
  assert.equal(mapsUrl(listing()), "https://www.google.com/maps/search/?api=1&query=-32.9163%2C-68.8314");
});

test("google maps link falls back to address search", () => {
  assert.equal(
    mapsUrl(listing({ lat: null, lng: null, address: "Río Cuarto 2100" })),
    "https://www.google.com/maps/search/?api=1&query=R%C3%ADo%20Cuarto%202100%2C%20Godoy%20Cruz%2C%20Mendoza%2C%20Argentina",
  );
});

test("default filter caps price at 62k and sorts by score", () => {
  const result = applyFilters([listing({ id: "x", usd: 70000 }), listing({ id: "b", score: 90 }), listing()], DEFAULT_FILTERS);
  assert.deepEqual(result.map(l => l.id), ["b", "a"]);
});

test("price range and toggles are configurable", () => {
  const items = [listing({ id: "c", usd: 80000, features: { credito: true, patio: true } }), listing()];
  const result = applyFilters(items, { ...DEFAULT_FILTERS, minUsd: 60000, maxUsd: 90000, onlyCredito: true, onlyPatio: true });
  assert.deepEqual(result.map(l => l.id), ["c"]);
});

test("favorites filter shows only saved listings", () => {
  const result = applyFilters([listing(), listing({ id: "fav" })], { ...DEFAULT_FILTERS, onlyFavorites: true }, new Set(["fav"]));
  assert.deepEqual(result.map(l => l.id), ["fav"]);
});
