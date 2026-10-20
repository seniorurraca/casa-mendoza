import { test } from "node:test";
import assert from "node:assert/strict";
import { registerSeen, withHistory } from "../scraper/lib/history.mjs";
import { appendRun, logTail } from "../scraper/lib/runs.mjs";
import { healthOf } from "../docs/js/runs.js";

const NOW = "2026-10-20T10:00:00.000Z";

test("a listing missing from one run and back later is not new", () => {
  const seen = registerSeen({ "click-1": "2026-10-19T05:00:00.000Z" }, [], [{ id: "click-1" }], NOW);
  const back = withHistory({ id: "click-1", usd: 50000 }, new Map(), seen);
  assert.deepEqual([back.firstSeen, back.firstSeenAt, back.prevUsd], ["2026-10-19", "2026-10-19T05:00:00.000Z", null]);
});

test("a dedupe loser that becomes the winner keeps its first sighting", () => {
  const firstRun = registerSeen({}, [], [{ id: "up-1" }, { id: "click-9" }], "2026-10-19T05:00:00.000Z");
  const seen = registerSeen(firstRun, [], [{ id: "click-9" }], NOW);
  assert.equal(withHistory({ id: "click-9", usd: 1 }, new Map(), seen).firstSeenAt, "2026-10-19T05:00:00.000Z");
});

test("only ids never scraped before get the current run time", () => {
  const seen = registerSeen({}, [], [{ id: "fresh" }], NOW);
  assert.equal(withHistory({ id: "fresh", usd: 1 }, new Map(), seen).firstSeenAt, NOW);
});

test("the registry is seeded from previous listings, legacy ones included", () => {
  const previous = [{ id: "a", firstSeen: "2026-10-18", firstSeenAt: null }, { id: "b", firstSeen: "2026-10-19", firstSeenAt: "2026-10-19T03:00:00.000Z" }];
  assert.deepEqual(registerSeen({}, previous, [{ id: "a" }, { id: "b" }], NOW), {
    a: "2026-10-18T00:00:00.000Z",
    b: "2026-10-19T03:00:00.000Z",
  });
});

test("runs log keeps the newest entries first, capped", () => {
  const runs = Array.from({ length: 60 }, (_, i) => ({ id: i }));
  const next = appendRun(runs, { id: "new" });
  assert.equal(next.length, 60);
  assert.deepEqual([next[0].id, next.at(-1).id], ["new", 58]);
});

test("log tail keeps the last non-empty lines", () => {
  assert.equal(logTail("a\nb\n\nc\nd\n", 2), "c\nd");
});

test("health flags failures and runs that stopped", () => {
  const now = Date.parse(NOW);
  assert.equal(healthOf([], now), "unknown");
  assert.equal(healthOf([{ ok: false, finishedAt: NOW }], now), "fail");
  assert.equal(healthOf([{ ok: true, finishedAt: "2026-10-20T01:00:00.000Z" }], now), "stale");
  assert.equal(healthOf([{ ok: true, finishedAt: "2026-10-20T05:00:00.000Z" }], now), "ok");
});
