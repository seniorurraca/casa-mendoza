import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apiUrl, toListing } from "../scraper/sources/mendozaprop.mjs";

const items = JSON.parse(readFileSync(new URL("./fixtures/mendozaprop-casas.json", import.meta.url), "utf8"));
const [godoyCruz, capital] = items.map(item => toListing(item, "casa", 1545));

test("maps structured fields", () => {
  assert.equal(godoyCruz.id, "mendozaprop-404952");
  assert.equal(godoyCruz.source, "mendozaprop");
  assert.equal(godoyCruz.url, "https://www.mendozaprop.com/venta-casa/404952");
  assert.equal(godoyCruz.usd, 80000);
  assert.deepEqual([godoyCruz.supC, godoyCruz.supT, godoyCruz.dorm, godoyCruz.banos], [170, 220, 6, 2]);
  assert.equal(godoyCruz.cocheraAttr, true);
  assert.equal(godoyCruz.agency, "Jezabel Castro Horacio");
  assert.equal(godoyCruz.photos.length, 2);
  assert.deepEqual([godoyCruz.lat, godoyCruz.lng], [null, null]);
});

test("regions map to the same department names as the other portals", () => {
  assert.equal(godoyCruz.department, "Godoy Cruz");
  assert.equal(capital.department, "Capital");
});

test("credit is only trusted when the portal says yes", () => {
  assert.equal(godoyCruz.creditoFlag, null);
  assert.equal(toListing({ ...items[0], credit: 1 }, "casa", 1545).creditoFlag, true);
});

test("prices in pesos are converted", () => {
  assert.equal(toListing({ ...items[0], currency_id: 2, price: "154500000" }, "casa", 1545).usd, 100000);
});

test("api url pages with offset", () => {
  assert.equal(apiUrl("3,11", 2, 100), "https://www.mendozaprop.com/api/properties?limit=100&offset=200&isMap=false&operationType=2&propertyType=3,11");
});
