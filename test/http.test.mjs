import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../scraper/lib/http.mjs";

const flaky = failures => {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failures) throw new Error("HTTP 202");
    return calls;
  };
};

test("retries until the task succeeds", async () => {
  assert.equal(await withRetry(flaky(2), { retries: 2, backoffMs: 1 }), 3);
});

test("gives up after the configured retries", async () => {
  await assert.rejects(withRetry(flaky(3), { retries: 2, backoffMs: 1 }), /HTTP 202/);
});
