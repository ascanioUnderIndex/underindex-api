// Partner API keys, for platforms that call providers with their own keys (aggregators such as APIbase)
// instead of paying per call over x402. Set API_KEYS="partner:key,other:key2" in the environment; with
// it unset nothing changes, and requests without a key still get the 402 that registries probe for.
//
// Only hashes are kept in memory and compared in constant time. Usage is counted per partner per
// calendar month (UTC) for the log line; counts reset on restart, so the Render log is the record.
import { createHash, timingSafeEqual } from "node:crypto";

const MIN_KEY_LENGTH = 24;
const sha256 = (s) => createHash("sha256").update(s).digest();

/** "partner:key,partner2:key2" -> [{ partner, hash }]; malformed or short entries are rejected loudly. */
export function parseApiKeys(spec = "") {
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const i = entry.indexOf(":");
      const partner = entry.slice(0, i).trim();
      const key = entry.slice(i + 1).trim();
      // Never echo the value: without a colon the "partner" part would be the key itself
      if (i < 1 || !/^[a-z0-9-]+$/i.test(partner)) throw new Error("API_KEYS: each entry needs the form partner:key, e.g. apibase:<key>");
      if (key.length < MIN_KEY_LENGTH) throw new Error(`API_KEYS: the key for ${partner} is shorter than ${MIN_KEY_LENGTH} characters`);
      return { partner, hash: sha256(key) };
    });
}

/** @param {{ spec?: string, now?: () => number }} options */
export function createApiKeys({ spec, now = Date.now } = {}) {
  const keys = parseApiKeys(spec);
  let month = null;
  let used = new Map(); // partner -> records served this month

  const roll = () => {
    const m = new Date(now()).toISOString().slice(0, 7);
    if (m !== month) {
      month = m;
      used = new Map();
    }
  };

  return {
    size: keys.length,
    /** The partner name for a presented key, or null. Checks every key so timing does not reveal which matched. */
    check(token) {
      if (typeof token !== "string" || !token) return null;
      const h = sha256(token);
      let found = null;
      for (const k of keys) if (timingSafeEqual(h, k.hash)) found = k.partner;
      return found;
    },
    /** Counts one served record and returns the partner's total for the month. */
    record(partner) {
      roll();
      const n = (used.get(partner) ?? 0) + 1;
      used.set(partner, n);
      return n;
    },
  };
}

/** The key a request presents: Authorization: Bearer <key>, or X-API-Key: <key>. */
export function presentedKey(req) {
  const auth = req.get?.("authorization") ?? req.headers?.authorization;
  const m = typeof auth === "string" ? auth.match(/^Bearer\s+(\S+)$/i) : null;
  if (m) return m[1];
  const x = req.get?.("x-api-key") ?? req.headers?.["x-api-key"];
  return typeof x === "string" && x ? x.trim() : null;
}

/**
 * Express middleware in front of the x402 paywall: a valid key skips payment, an unknown key on a paid
 * route gets 401 (never a 402 a client might try to pay), and everything else goes to `paywall`.
 */
export function apiKeyGate({ apiKeys, paywall, isPaidPath, log = console.log }) {
  return (req, res, next) => {
    const token = apiKeys.size ? presentedKey(req) : null;
    if (!token) return paywall(req, res, next);
    const partner = apiKeys.check(token);
    if (!partner) {
      if (isPaidPath(req.path)) return res.status(401).json({ error: "Unknown API key" });
      return paywall(req, res, next);
    }
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      const slug = decodeURIComponent(req.path.replace(/^\/api\/subculture\/?/, "")) || req.query?.name || req.path;
      log(`key: ${partner} ${slug} (${apiKeys.record(partner)} this month)`);
    });
    next();
  };
}
