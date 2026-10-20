import { test } from "node:test";
import assert from "node:assert/strict";
import { createFreeQuota } from "./free-quota.js";

test("allows `limit` records per client per day, then refuses", () => {
  const q = createFreeQuota({ limit: 3, now: () => Date.parse("2026-10-20T10:00:00Z") });
  assert.deepEqual([1, 2, 3].map(() => q.take("a").remaining), [2, 1, 0]);
  assert.equal(q.take("a").allowed, false);
  assert.equal(q.take("b").allowed, true, "another client has its own allowance");
  assert.equal(q.clientsToday(), 2);
});

test("resets at midnight UTC and reports when", () => {
  let t = Date.parse("2026-10-20T23:59:00Z");
  const q = createFreeQuota({ limit: 1, now: () => t });
  assert.equal(q.take("a").allowed, true);
  const refused = q.take("a");
  assert.equal(refused.allowed, false);
  assert.equal(refused.resetAt.toISOString(), "2026-10-21T00:00:00.000Z");
  t = Date.parse("2026-10-21T00:00:01Z");
  assert.equal(q.take("a").allowed, true);
});

test("limit 0 disables the allowance", () => {
  const q = createFreeQuota({ limit: 0 });
  assert.equal(q.take("a").allowed, false);
});
