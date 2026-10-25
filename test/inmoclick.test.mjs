import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lastPage, parseListings, pageUrl } from "../scraper/sources/inmoclick.mjs";

const html = readFileSync(new URL("./fixtures/inmoclick-casas.html", import.meta.url), "utf8");

test("parses listing attributes from article cards", () => {
  const [first] = parseListings(html, "casa", 1535);
  assert.equal(first.id, "inmoclick-17-19310");
  assert.equal(first.usd, 215000);
  assert.equal(first.supT, 251);
  assert.equal(first.supC, 229);
  assert.equal(first.dorm, 3);
  assert.equal(first.cocheraAttr, true);
  assert.equal(first.department, "Capital");
  assert.match(first.url, /^https:\/\/inmoclick\.com\/17-cocucci-sa\/inmuebles\/19310\/ficha\//);
  assert.match(first.text, /apta credito hipotecario/);
  assert.match(first.locationText, /alto dorrego/);
});

test("merges embedded JSON fields into listings", () => {
  const [first, second] = parseListings(html, "casa", 1535);
  assert.equal(first.publishedAt, "2026-10-07");
  assert.equal(first.agency, "COCUCCI SA");
  assert.equal(first.creditoFlag, null);
  assert.equal(second.creditoFlag, true);
  assert.equal(first.photosApi, "https://inmoclick.com/json/inmuebles/fotos?usuario=17&propiedad=19310");
  assert.match(first.description, /APTA CREDITO HIPOTECARIO/);
});

test("embedded JSON serialized as object with sparse keys", () => {
  const sparse = html.replace(/var propiedades = (\[.*\]);/, (_, arr) => `var propiedades = ${JSON.stringify(Object.fromEntries(JSON.parse(arr).map((p, i) => [i * 3, p])))};`);
  assert.notEqual(sparse, html);
  assert.equal(parseListings(sparse, "casa", 1535)[1].creditoFlag, true);
});

test("parses every card in the page", () => {
  assert.equal(parseListings(html, "casa", 1535).length, 2);
});

test("reads last page from pagination links", () => {
  assert.equal(lastPage(html), 52);
});

test("asks for 200 listings per page to make fewer requests", () => {
  assert.equal(pageUrl("casas", 2, "recent"), "https://inmoclick.com/inmuebles/venta/casas/mendoza?limit=200&page=2&ordenar=recientes");
});
