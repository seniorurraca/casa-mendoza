import { test } from "node:test";
import assert from "node:assert/strict";
import { isChecked, summaryText, toggleOption } from "../docs/js/multiselect.js";
import { DEFAULT_FILTERS, applyFilters, loadFilters } from "../docs/js/filters.js";

const all = ["Capital", "Godoy Cruz", "Maipu"];
const options = all.map(value => ({ value, label: value }));

test("empty selection means all, with only the 'all' box checked", () => {
  assert.equal(isChecked([], "Maipu"), false);
  assert.equal(summaryText([], options), "Todos");
  assert.equal(summaryText([], options, "Todos los departamentos"), "Todos los departamentos");
});

test("checking an option from all selects only that one", () => {
  const picked = toggleOption([], "Maipu", all);
  assert.deepEqual(picked, ["Maipu"]);
  assert.equal(isChecked(picked, "Maipu"), true);
  assert.equal(summaryText(toggleOption(picked, "Capital", all), options), "2 seleccionados");
});

test("unchecking the last option or checking every option returns to all", () => {
  assert.deepEqual(toggleOption(["Capital"], "Capital", all), []);
  assert.deepEqual(toggleOption(["Capital", "Godoy Cruz"], "Maipu", all), []);
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
