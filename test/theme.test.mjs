import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, resolveTheme } from "../docs/js/theme.js";

test("system follows the device, explicit themes win", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("lavanda", true), "lavanda");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("unknown or missing choices fall back to system", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme("neon", false), "light");
});

test("every theme has an id, a label and a swatch", () => {
  assert.ok(THEMES.length >= 5);
  for (const t of THEMES) assert.ok(t.id && t.label && t.swatch);
});
