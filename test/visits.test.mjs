import { test } from "node:test";
import assert from "node:assert/strict";
import { seenAt } from "../docs/js/visits.js";

test("legacy listings without a timestamp fall back to their first day", () => {
  assert.equal(seenAt({ firstSeen: "2026-10-19", firstSeenAt: null }), "2026-10-19T00:00:00");
  assert.equal(seenAt({ firstSeen: "2026-10-19", firstSeenAt: "2026-10-19T13:00:00Z" }), "2026-10-19T13:00:00Z");
});
