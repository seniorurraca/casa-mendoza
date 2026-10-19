import { test } from "node:test";
import assert from "node:assert/strict";
import { enrich } from "../scraper/lib/enrich.mjs";
import { normalize } from "../scraper/lib/text.mjs";
import { estimateMinutes } from "../scraper/lib/geo.mjs";
import { parsePrice } from "../scraper/lib/currency.mjs";
import { config, makeListing } from "./helpers.mjs";

const enrichText = (text, extra = {}) => enrich(makeListing({ text: normalize(text), ...extra }), config);

test("detects credito, patio, cochera ignoring accents and case", () => {
  const { features } = enrichText("Casa APTA CRÉDITO hipotecario, Jardín y Cochera");
  assert.equal(features.credito, true);
  assert.equal(features.patio, true);
  assert.equal(features.cochera, true);
});

test("negated credito is not credito", () => {
  assert.equal(enrichText("No apta crédito, solo contado").features.credito, false);
});

test("detects posesion and reciclar traps", () => {
  const { features } = enrichText("Vendo derechos posesorios, casa a reciclar");
  assert.equal(features.posesion, true);
  assert.equal(features.reciclar, true);
});

test("structured credito flag overrides text", () => {
  assert.equal(enrichText("apta credito", { creditoFlag: false }).features.credito, false);
  assert.equal(enrichText("", { creditoFlag: true }).features.credito, true);
  assert.equal(enrichText("apta credito", { creditoFlag: null }).features.credito, true);
});

test("price per m2 uses covered area for casas and total area for terrenos", () => {
  assert.equal(enrichText("").ppm, 500);
  assert.equal(enrichText("", { type: "terreno" }).ppm, 200);
});

test("estimates minutes from straight-line distance", () => {
  assert.equal(estimateMinutes(config.centro, config.centro, 1.8), 0);
  assert.equal(estimateMinutes({ lat: null, lng: null }, config.centro, 1.8), null);
  const maipu = estimateMinutes({ lat: -32.983, lng: -68.785 }, config.centro, 1.8);
  assert.ok(maipu > 18 && maipu < 30, `maipu ${maipu}`);
});

test("parses USD and converts ARS prices", () => {
  assert.equal(parsePrice("US$ 62.000", 1535), 62000);
  assert.equal(parsePrice("$ 76.750.000", 1535), 50000);
  assert.equal(parsePrice("Consultar", 1535), null);
});
