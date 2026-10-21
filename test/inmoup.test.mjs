import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageUrl, parsePage } from "../scraper/sources/inmoup.mjs";

const html = readFileSync(new URL("./fixtures/inmoup-casas.html", import.meta.url), "utf8");
const { total, listings } = parsePage(html, "casa", 1535);
const [withRef, plain] = listings;

test("reads items and total from split flight payload", () => {
  assert.equal(total, 5460);
  assert.equal(listings.length, 2);
});

test("maps structured fields", () => {
  assert.equal(withRef.id, "inmoup-73253-418");
  assert.equal(withRef.url, "https://inmoup.com.ar/73253-aele-inmobiliaria/inmuebles/418/ficha/casa-en-venta-en-casa-apta-credito-3-hab-3-banos-cochera-doble");
  assert.equal(withRef.usd, 265000);
  assert.equal(withRef.department, "Maipu");
  assert.deepEqual([withRef.lat, withRef.lng], [-32.9366089, -68.802304]);
  assert.deepEqual([withRef.supC, withRef.supT, withRef.dorm, withRef.banos], [212, 336, 3, 3]);
  assert.equal(withRef.cocheraAttr, true);
  assert.equal(withRef.creditoFlag, true);
  assert.equal(withRef.publishedAt, "2026-10-14");
  assert.equal(withRef.photos.length, 5);
  assert.equal(withRef.photosApi, null);
});

test("resolves referenced descriptions from JSON-LD", () => {
  assert.match(withRef.description, /APTA CREDITO/);
  assert.ok(plain.description.length > 50);
});

test("no cochera and no credito flags", () => {
  assert.equal(plain.cocheraAttr, false);
  assert.equal(plain.creditoFlag, false);
});

test("page urls carry the operation and the price cap only for sales", () => {
  assert.equal(pageUrl("casas-en-venta", 2, 150000), "https://inmoup.com.ar/casas-en-venta-en-mendoza-y-150000-o-menos-dolares-y-pag-2");
  assert.equal(pageUrl("departamentos-en-alquiler", 1, null), "https://inmoup.com.ar/departamentos-en-alquiler-en-mendoza");
});
