import { test, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { apiKeyGate, createApiKeys, parseApiKeys } from "./api-keys.js";

const KEY = "uix_test_0123456789abcdefghijklmn";
const logs = [];
const app = express();
// A stand-in for the x402 middleware: always asks for payment on the paid routes
const paywall = (req, res, next) => (req.path.startsWith("/api/subculture") ? res.status(402).json({ pay: true }) : next());
const apiKeys = createApiKeys({ spec: `apibase:${KEY}` });
app.use(apiKeyGate({ apiKeys, paywall, isPaidPath: (p) => p === "/api/subculture" || p.startsWith("/api/subculture/"), log: (l) => logs.push(l) }));
app.get("/api/subculture/:name", (req, res) => res.json({ name: req.params.name }));
app.get("/api/subculture", (req, res) => res.json({ name: req.query.name }));
app.get("/api/catalog", (req, res) => res.json({ ok: true }));
const server = app.listen(0);
after(() => server.close());
const base = `http://127.0.0.1:${server.address().port}`;
const get = (path, headers = {}) => fetch(base + path, { headers });

test("without a key the paid route still answers 402", async () => {
  assert.equal((await get("/api/subculture/goth-ninja")).status, 402);
});

test("a valid key skips payment, as a Bearer token or X-API-Key, and is logged per partner", async () => {
  const a = await get("/api/subculture/goth-ninja", { authorization: `Bearer ${KEY}` });
  assert.equal(a.status, 200);
  assert.deepEqual(await a.json(), { name: "goth-ninja" });
  const b = await get("/api/subculture?name=opium", { "x-api-key": KEY });
  assert.equal(b.status, 200);
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(logs.slice(-2), ["key: apibase goth-ninja (1 this month)", "key: apibase opium (2 this month)"]);
});

test("an unknown key gets 401 on paid routes, never a 402 to pay", async () => {
  const r = await get("/api/subculture/goth-ninja", { authorization: "Bearer uix_wrong_0123456789abcdefghijkl" });
  assert.equal(r.status, 401);
  assert.equal((await get("/api/catalog", { "x-api-key": "whatever-key-on-a-free-route-000" })).status, 200);
});

test("with no keys configured a presented key changes nothing", async () => {
  const empty = createApiKeys({ spec: "" });
  assert.equal(empty.size, 0);
  assert.equal(empty.check(KEY), null);
});

test("rejects malformed and short keys, counts usage per calendar month", () => {
  assert.throws(() => parseApiKeys("apibase"), /partner:key/);
  assert.throws(() => parseApiKeys("apibase:short"), /shorter than 24/);
  assert.deepEqual(parseApiKeys(` a:${KEY} , b:${KEY}x `).map((k) => k.partner), ["a", "b"]);
  let t = Date.parse("2026-10-31T23:00:00Z");
  const k = createApiKeys({ spec: `apibase:${KEY}`, now: () => t });
  assert.equal(k.check(KEY), "apibase");
  assert.equal(k.check(KEY + "x"), null);
  assert.deepEqual([k.record("apibase"), k.record("apibase")], [1, 2]);
  t = Date.parse("2026-11-01T00:00:01Z");
  assert.equal(k.record("apibase"), 1);
});
