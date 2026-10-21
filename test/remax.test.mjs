import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePage, pageUrl } from "../scraper/sources/remax.mjs";

const html = readFileSync(new URL("./fixtures/remax-casas.html", import.meta.url), "utf8");
const { total, listings } = parsePage(html, "casa", 1545);
const [priced, hidden] = listings;

test("reads listings and total from the Angular ng-state", () => {
  assert.equal(total, 1421);
  assert.equal(listings.length, 2);
});

test("maps structured fields", () => {
  assert.equal(priced.id, "remax-677122");
  assert.equal(priced.source, "remax");
  assert.equal(priced.url, "https://www.remax.com.ar/listings/venta-casa-benegas-godoy-cruz-3-dormitorios");
  assert.equal(priced.usd, 89000);
  assert.equal(priced.department, "Godoy Cruz");
  assert.deepEqual([priced.lat, priced.lng], [-32.9525246, -68.8449989]);
  assert.deepEqual([priced.supC, priced.supT, priced.dorm, priced.banos], [120, 260, 3, 1]);
  assert.equal(priced.address, "Javier Morales 2200");
  assert.equal(priced.agency, "REMAX Kaia");
  assert.equal(priced.photos.length, 3);
  assert.equal(priced.photo, "https://d1acdg20u0pmxj.cloudfront.net/listings/4f3efd81-1f3c-45d1-bfcd-eb16077ba5bc/860x440/6f007f11-2062-4b5f-814c-6760ab4e0d8c.jpg");
  assert.match(priced.locationText, /benegas/);
});

test("hidden prices have no usd", () => {
  assert.equal(hidden.usd, null);
});

test("page urls use the landing path and zero-based pages", () => {
  assert.equal(pageUrl("casas-en-venta", 0), "https://www.remax.com.ar/casas-en-venta-en-mendoza");
  assert.equal(pageUrl("departamentos-en-alquiler", 2), "https://www.remax.com.ar/departamentos-en-alquiler-en-mendoza?page=2");
});
