import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lastPage, parseListings } from "../scraper/sources/inmoclick.mjs";

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

test("parses every card in the page", () => {
  assert.equal(parseListings(html, "casa", 1535).length, 2);
});

test("reads last page from pagination links", () => {
  assert.equal(lastPage(html), 52);
});
