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

test("without coordinates, same department and known similar size are required", () => {
  const noCoords = { id: "m", source: "mendozaprop", url: "https://m", lat: null, lng: null, department: "Godoy Cruz" };
  const base = listing({ department: "Godoy Cruz" });
  assert.equal(dedupe([base, listing(noCoords)]).length, 1);
  assert.equal(dedupe([base, listing({ ...noCoords, department: "Maipu" })]).length, 2);
  assert.equal(dedupe([base, listing({ ...noCoords, supC: null })]).length, 2);
});

test("richer winner without coordinates takes the location of a located duplicate", () => {
  const located = listing({ minutes: 12, department: "Godoy Cruz" });
  const richer = listing({ id: "m", source: "mendozaprop", url: "https://m", lat: null, lng: null, minutes: null, department: "Godoy Cruz", photos: ["1"] });
  const [merged] = dedupe([located, richer]);
  assert.equal(merged.id, "m");
  assert.deepEqual([merged.lat, merged.lng, merged.minutes], [-32.92, -68.85, 12]);
});
