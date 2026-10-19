import { test } from "node:test";
import assert from "node:assert/strict";
import { isChecked, summaryText, toggleOption } from "../docs/js/multiselect.js";
import { DEFAULT_FILTERS, applyFilters, loadFilters } from "../docs/js/filters.js";

const all = ["Capital", "Godoy Cruz", "Maipu"];
const options = all.map(value => ({ value, label: value }));

test("empty selection means everything is checked", () => {
  assert.equal(isChecked([], "Maipu"), true);
  assert.equal(summaryText([], options), "Todos");
});

test("unchecking from all keeps the rest, rechecking returns to all", () => {
  const without = toggleOption([], "Maipu", all);
  assert.deepEqual(without, ["Capital", "Godoy Cruz"]);
  assert.equal(summaryText(without, options), "2 seleccionados");
  assert.deepEqual(toggleOption(without, "Maipu", all), []);
});

test("the last selected option cannot be removed", () => {
  assert.deepEqual(toggleOption(["Capital"], "Capital", all), ["Capital"]);
  assert.equal(summaryText(["Capital"], options), "Capital");
});

const listing = overrides => ({
  id: "a", type: "casa", usd: 50000, department: "Capital", source: "inmoclick", alsoOn: [], minutes: 10,
  features: { credito: false, patio: false }, score: 50, firstSeen: "2026-10-18", ...overrides,
});

test("multi filters combine types, departments and portals", () => {
  const items = [
    listing(),
    listing({ id: "b", type: "terreno", department: "Maipu" }),
    listing({ id: "c", source: "inmoup", department: "Godoy Cruz" }),
    listing({ id: "d", source: "inmoclick", alsoOn: [{ source: "inmoup", url: "x" }] }),
  ];
  const ids = f => applyFilters(items, { ...DEFAULT_FILTERS, ...f }).map(l => l.id).sort();
  assert.deepEqual(ids({ types: ["terreno"] }), ["b"]);
  assert.deepEqual(ids({ departments: ["Capital", "Maipu"] }), ["a", "b", "d"]);
  assert.deepEqual(ids({ sources: ["inmoup"] }), ["c", "d"]);
});

test("legacy saved filters are dropped", () => {
  const loaded = loadFilters({ type: "casa", department: "Capital", maxUsd: 70000 });
  assert.equal(loaded.maxUsd, 70000);
  assert.equal("type" in loaded, false);
  assert.deepEqual(loaded.departments, []);
});
