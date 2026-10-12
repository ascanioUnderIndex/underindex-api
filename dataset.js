// In-memory snapshot of the published Airtable records.
//
// Why: Airtable allows 5 requests/second per base (429 + 30s lockout above that)
// and caps monthly calls on Free/Team plans. The old server hit Airtable on every
// request, including the free catalog, so anyone could exhaust the quota. The data
// changes rarely, so we load it once, refresh on a timer, and serve from memory.

import { createHash } from "node:crypto";

/** "Ura-Hara (Harajuku 90s)" -> "ura-hara-harajuku-90s", "Avant-Garde / Darkwear" -> "avant-garde-darkwear" */
export function slugify(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Map an Airtable-shaped record (anything with .get(field)) to the public payload.
 * Airtable omits empty fields, so list fields fall back to [] to keep the shape stable.
 */
export function toPayload(record) {
  return {
    Name: record.get("Name"),
    Years: record.get("Years"),
    Description: record.get("Description"),
    KeyBrands: record.get("Key Brands") ?? [],
    IconicItems: record.get("Iconic Items") ?? [],
    MusicGenre: record.get("Music Genre") ?? [],
    Artists: record.get("Artists") ?? [],
    VideoGames: record.get("Video Games") ?? [],
    WhereToBuy: record.get("Where to Buy") ?? [],
    PriceRange: record.get("Price Range"),
    Notes: record.get("Notes"),
  };
}

/**
 * @param {() => Promise<Array<{get(field: string): any}>>} fetchRecords  loads published records
 * @param {{ refreshMs?: number, log?: Pick<Console, "log" | "error"> }} [opts]
 */
export function createDataset(fetchRecords, { refreshMs = 10 * 60 * 1000, log = console } = {}) {
  let entries = new Map(); // slug -> payload
  let version = null;
  let loadedAt = null;
  let timer = null;

  async function refresh() {
    try {
      const records = await fetchRecords();
      const next = new Map();
      for (const record of records) {
        const payload = toPayload(record);
        if (!payload.Name) continue;
        const slug = slugify(payload.Name);
        if (next.has(slug)) log.error(`dataset: duplicate slug "${slug}" for "${payload.Name}"; keeping the first`);
        else next.set(slug, payload);
      }
      const sorted = [...next.entries()].sort(([a], [b]) => a.localeCompare(b));
      const nextVersion = createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 12);
      if (nextVersion !== version) log.log(`dataset: loaded ${next.size} subcultures, version ${nextVersion}`);
      entries = next;
      version = nextVersion;
      loadedAt = new Date();
      return true;
    } catch (err) {
      // Keep serving the last good snapshot.
      log.error("dataset: refresh failed, serving previous snapshot", err);
      return false;
    }
  }

  return {
    refresh,
    start() {
      if (!timer && refreshMs > 0) {
        timer = setInterval(refresh, refreshMs);
        timer.unref?.();
      }
      return refresh();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    get ready() {
      return version !== null;
    },
    get version() {
      return version;
    },
    get loadedAt() {
      return loadedAt;
    },
    /** Accepts a slug ("acubi-style") or the exact display name, any case ("Acubi Style"). */
    find(nameOrSlug) {
      return entries.get(slugify(nameOrSlug)) ?? null;
    },
    names() {
      return [...entries.values()].map((p) => p.Name);
    },
    catalog() {
      return [...entries.entries()].map(([slug, p]) => ({ slug, name: p.Name, years: p.Years ?? null }));
    },
  };
}
