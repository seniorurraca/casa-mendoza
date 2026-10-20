import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, resolveTheme } from "../docs/js/theme.js";

test("system follows the device, explicit themes win", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("lavanda", true), "lavanda");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("without a choice the default is light, even on dark devices", () => {
  assert.equal(resolveTheme(null, true), "light");
  assert.equal(resolveTheme("neon", true), "light");
});

test("every theme has an id, a label and a swatch", () => {
  assert.ok(THEMES.length >= 5);
  for (const t of THEMES) assert.ok(t.id && t.label && t.swatch);
});
