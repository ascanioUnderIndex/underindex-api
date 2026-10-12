import { test } from "node:test";
import assert from "node:assert/strict";
import { createDataset, slugify, toPayload } from "./dataset.js";

const rec = (fields) => ({ get: (k) => fields[k] });
const quiet = { log() {}, error() {} };

test("slugify handles the awkward live names", () => {
  assert.equal(slugify("Ura-Hara (Harajuku 90s)"), "ura-hara-harajuku-90s");
  assert.equal(slugify("Avant-Garde / Darkwear"), "avant-garde-darkwear");
  assert.equal(slugify("E-girl / E-boy"), "e-girl-e-boy");
  assert.equal(slugify("Acubi Style"), "acubi-style");
});

test("find accepts slug or display name, any case", async () => {
  const ds = createDataset(async () => [rec({ Name: "Acubi Style", Years: "2020s" })], { refreshMs: 0, log: quiet });
  await ds.start();
  assert.equal(ds.find("acubi-style").Name, "Acubi Style");
  assert.equal(ds.find("ACUBI STYLE").Name, "Acubi Style");
  assert.equal(ds.find("acubi"), null);
  assert.deepEqual(ds.catalog(), [{ slug: "acubi-style", name: "Acubi Style", years: "2020s" }]);
});

test("version is stable for same data, changes when data changes", async () => {
  let rows = [rec({ Name: "Opium", Notes: "a" })];
  const ds = createDataset(async () => rows, { refreshMs: 0, log: quiet });
  await ds.start();
  const v1 = ds.version;
  await ds.refresh();
  assert.equal(ds.version, v1);
  rows = [rec({ Name: "Opium", Notes: "b" })];
  await ds.refresh();
  assert.notEqual(ds.version, v1);
});

test("a failed refresh keeps serving the last good snapshot", async () => {
  let fail = false;
  const ds = createDataset(async () => {
    if (fail) throw new Error("429");
    return [rec({ Name: "Opium" })];
  }, { refreshMs: 0, log: quiet });
  await ds.start();
  const v = ds.version;
  fail = true;
  assert.equal(await ds.refresh(), false);
  assert.equal(ds.version, v);
  assert.equal(ds.find("opium").Name, "Opium");
});

test("not ready until first successful load", async () => {
  const ds = createDataset(async () => { throw new Error("down"); }, { refreshMs: 0, log: quiet });
  await ds.start();
  assert.equal(ds.ready, false);
});

test("empty list fields come back as [] instead of missing", () => {
  const p = toPayload(rec({ Name: "Quiet Luxury", "Key Brands": ["The Row"] }));
  assert.deepEqual(p.VideoGames, []);
  assert.deepEqual(p.KeyBrands, ["The Row"]);
});
