import { test } from "node:test";
import assert from "node:assert/strict";
import { upsert } from "../scraper/lib/history.mjs";
import { dedupe } from "../scraper/lib/dedupe.mjs";

test("upsert replaces existing ids and keeps the rest", () => {
  const merged = upsert([{ id: "a", usd: 1 }, { id: "b", usd: 2 }], [{ id: "b", usd: 3 }, { id: "c", usd: 4 }]);
  assert.deepEqual(merged.map(l => `${l.id}:${l.usd}`), ["a:1", "b:3", "c:4"]);
});

test("re-deduping a merged listing keeps previous alsoOn links", () => {
  const base = { type: "casa", usd: 50000, supC: 100, lat: -32.92, lng: -68.85, description: "" };
  const previous = { ...base, id: "up", source: "inmoup", url: "https://up", photos: ["1"], alsoOn: [{ source: "inmoclick", url: "https://old" }] };
  const fresh = { ...base, id: "click2", source: "inmoclick", url: "https://new", photos: [] };
  const [merged] = dedupe([previous, fresh]);
  assert.equal(merged.id, "up");
  assert.deepEqual(merged.alsoOn.map(l => l.url).sort(), ["https://new", "https://old"]);
});
