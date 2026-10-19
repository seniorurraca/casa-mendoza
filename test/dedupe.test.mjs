import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupe } from "../scraper/lib/dedupe.mjs";

const listing = overrides => ({
  id: "a", source: "inmoclick", type: "casa", url: "https://a", usd: 50000, supC: 100, supT: 200,
  lat: -32.92, lng: -68.85, photos: [], description: "", ...overrides,
});

test("same property on two portals is merged keeping the richer one", () => {
  const result = dedupe([
    listing(),
    listing({ id: "b", source: "inmoup", url: "https://b", usd: 50500, lat: -32.9205, photos: ["1", "2"] }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "b");
  assert.deepEqual(result[0].alsoOn, [{ source: "inmoclick", url: "https://a" }]);
});

test("different price, place, size or same portal are kept apart", () => {
  const cases = [
    { id: "p", source: "inmoup", usd: 56000 },
    { id: "d", source: "inmoup", lat: -32.95 },
    { id: "s", source: "inmoup", supC: 140 },
    { id: "same", source: "inmoclick" },
  ];
  for (const other of cases) assert.equal(dedupe([listing(), listing(other)]).length, 2, other.id);
});

test("listings without coordinates are never merged", () => {
  assert.equal(dedupe([listing({ lat: null }), listing({ id: "b", source: "inmoup", lat: null })]).length, 2);
});
