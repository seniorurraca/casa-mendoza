import { test } from "node:test";
import assert from "node:assert/strict";
import { mapsUrl } from "../docs/js/maps.js";
import { isFresh, tokenClaims } from "../docs/js/google-token.js";
import { DEFAULT_FILTERS, advancedCount, applyFilters, favoriteListings, monthlyArs } from "../docs/js/filters.js";

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

test("favorites ignore filters and show the last saved first", () => {
  const items = [listing({ id: "cara", usd: 140000 }), listing({ id: "lejos", zone: { level: "high" } }), listing({ id: "otra" })];
  const { found, missing } = favoriteListings(items, new Set(["cara", "vencido", "lejos"]));
  assert.deepEqual(found.map(l => l.id), ["lejos", "cara"]);
  assert.equal(missing, 1);
});

test("old onlyFavorites filter is dropped when loading", () => {
  assert.equal("onlyFavorites" in DEFAULT_FILTERS, false);
});

test("google token claims are read and expiry is checked with a margin", () => {
  const encode = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const token = `${encode({ alg: "RS256" })}.${encode({ email: "a@b.com", given_name: "Natalí", exp: 1000 })}.sig`;
  assert.equal(tokenClaims(token).given_name, "Natalí");
  assert.equal(isFresh(token, 900_000), true);
  assert.equal(isFresh(token, 950_000), false);
  assert.equal(isFresh(null), false);
  assert.equal(tokenClaims("basura"), null);
});

test("more-filters badge counts only the filters inside the panel", () => {
  assert.equal(advancedCount(DEFAULT_FILTERS), 0);
  assert.equal(advancedCount({ ...DEFAULT_FILTERS, minUsd: 20000, departments: ["Maipu"], maxMinutes: 20, onlyCredito: true, onlyPatio: true, hideSuspicious: true }), 4);
});

test("buy shows houses and land by default, apartments only when picked", () => {
  const items = [listing({ id: "c" }), listing({ id: "t", type: "terreno" }), listing({ id: "d", type: "departamento", operation: "venta" })];
  assert.deepEqual(applyFilters(items, DEFAULT_FILTERS).map(l => l.id).sort(), ["c", "t"]);
  assert.deepEqual(applyFilters(items, { ...DEFAULT_FILTERS, types: ["departamento"] }).map(l => l.id), ["d"]);
});

test("rent filters by monthly pesos and ignores the credit toggle", () => {
  const rent = overrides => listing({ operation: "alquiler", type: "departamento", ...overrides });
  const items = [rent({ id: "barato", ars: 450000 }), rent({ id: "caro", ars: 1200000 }), listing({ id: "venta" })];
  const filters = { ...DEFAULT_FILTERS, operation: "alquiler", onlyCredito: true };
  assert.deepEqual(applyFilters(items, filters).map(l => l.id), ["barato"]);
  assert.equal(DEFAULT_FILTERS.maxArs, 1000000);
});

test("monthly rent in pesos is rounded to thousands", () => {
  assert.equal(monthlyArs(291, 1545), 450000);
});
