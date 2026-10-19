import { test } from "node:test";
import assert from "node:assert/strict";
import { markNew, newSince, seenAt, startVisit } from "../docs/js/visits.js";

const memory = (initial = null) => {
  let value = initial;
  return { get: () => value, set: v => { value = v; } };
};

test("first visit has no previous visit and records now", () => {
  const local = memory();
  assert.equal(startVisit({ local, session: memory() }, "2026-10-19T10:00:00Z"), null);
  assert.equal(local.get(), "2026-10-19T10:00:00Z");
});

test("reloads in the same session keep the original baseline", () => {
  const local = memory("2026-10-18T08:00:00Z");
  const session = memory();
  assert.equal(startVisit({ local, session }, "2026-10-19T10:00:00Z"), "2026-10-18T08:00:00Z");
  assert.equal(startVisit({ local, session }, "2026-10-19T10:05:00Z"), "2026-10-18T08:00:00Z");
  assert.equal(local.get(), "2026-10-19T10:00:00Z");
});

test("a new session uses the last recorded visit", () => {
  const local = memory("2026-10-19T10:00:00Z");
  assert.equal(startVisit({ local, session: memory() }, "2026-10-20T09:00:00Z"), "2026-10-19T10:00:00Z");
});

test("listings seen after the baseline are new", () => {
  const listings = [
    { id: "old", firstSeen: "2026-10-17", firstSeenAt: "2026-10-17T09:00:00Z" },
    { id: "fresh", firstSeen: "2026-10-19", firstSeenAt: "2026-10-19T13:00:00Z" },
    { id: "legacy", firstSeen: "2026-10-19", firstSeenAt: null },
  ];
  const flags = Object.fromEntries(markNew(listings, "2026-10-18T22:00:00Z").map(l => [l.id, l.isNew]));
  assert.deepEqual(flags, { old: false, fresh: true, legacy: true });
  assert.equal(seenAt(listings[2]), "2026-10-19T00:00:00");
});

test("without a previous visit, new means the last 3 days", () => {
  assert.equal(newSince(null, Date.parse("2026-10-19T00:00:00Z")), "2026-10-16T00:00:00.000Z");
  assert.equal(newSince("2026-10-18T22:00:00Z"), "2026-10-18T22:00:00Z");
});
