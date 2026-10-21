import { test } from "node:test";
import assert from "node:assert/strict";
import { departmentAt, isPlaceholder } from "../scraper/lib/departments.mjs";
import { enrich } from "../scraper/lib/enrich.mjs";
import { config, makeListing } from "./helpers.mjs";

test("finds the department that contains the coordinates", () => {
  assert.equal(departmentAt({ lat: -32.8895, lng: -68.8458 }), "Capital");
  assert.equal(departmentAt({ lat: -32.9534, lng: -68.83 }), "Godoy Cruz");
  assert.equal(departmentAt({ lat: -32.9584934, lng: -68.7895478 }), "Maipu");
  assert.equal(departmentAt({ lat: -32.9924459, lng: -68.8270196 }), "Lujan de Cuyo");
  assert.equal(departmentAt({ lat: -32.855, lng: -68.838 }), "Las Heras");
  assert.equal(departmentAt({ lat: -32.883008, lng: -68.7381197 }), "Guaymallen");
});

test("returns null outside Mendoza or without coordinates", () => {
  assert.equal(departmentAt({ lat: -34.6, lng: -58.38 }), null);
  assert.equal(departmentAt({ lat: null, lng: null }), null);
});

test("detects portal default pins", () => {
  assert.equal(isPlaceholder({ lat: -32.87505096302248, lng: -68.83456419 }, config.placeholderCoords), true);
  assert.equal(isPlaceholder({ lat: -32.889, lng: -68.846 }, config.placeholderCoords), true);
  assert.equal(isPlaceholder({ lat: -32.92, lng: -68.85 }, config.placeholderCoords), false);
});

test("coordinates override the portal department", () => {
  const listing = enrich(makeListing({ department: "Maipu", lat: -32.9534, lng: -68.83 }), config);
  assert.equal(listing.department, "Godoy Cruz");
});

test("keeps the portal department when coordinates fall outside every polygon", () => {
  const listing = enrich(makeListing({ department: "Maipu", lat: -34.6, lng: -58.38 }), config);
  assert.equal(listing.department, "Maipu");
});

test("drops placeholder coordinates and keeps the portal department", () => {
  const listing = enrich(makeListing({ department: "Maipu", lat: -32.87505096302248, lng: -68.83456419 }), config);
  assert.equal(listing.department, "Maipu");
  assert.equal(listing.lat, null);
  assert.equal(listing.lng, null);
  assert.equal(listing.minutes, null);
});
