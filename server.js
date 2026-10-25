import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import Airtable from "airtable";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import { createDataset } from "./dataset.js";
import { createFreeQuota } from "./free-quota.js";
import { apiKeyGate, createApiKeys } from "./api-keys.js";
import { buildOpenApi, EXAMPLE_RECORD, RECORD_DESCRIPTION } from "./openapi.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const PAY_TO = process.env.PAY_TO || "0xb5842a407e6b37925DafEcf265a80A697f2B474C";
const PRICE = process.env.PRICE_USD || "$0.01";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appEkpxkkqg3JZ2wj";
const REFRESH_MS = Number(process.env.DATASET_REFRESH_MS || 10 * 60 * 1000);
const SAMPLE_SLUG = process.env.SAMPLE_SLUG || "goth-ninja";
const FREE_PER_DAY = Number(process.env.FREE_PER_DAY ?? 3);

// X402_NETWORK=base-sepolia (default, testnet, free x402.org facilitator, no keys)
// X402_NETWORK=base         (mainnet, CDP facilitator, needs CDP_API_KEY_ID + CDP_API_KEY_SECRET)
const NETWORKS = {
  "base-sepolia": {
    caip2: "eip155:84532",
    facilitator: () => new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" }),
  },
  base: {
    caip2: "eip155:8453",
    facilitator: () => createCdpFacilitatorClient(),
  },
};
const networkName = process.env.X402_NETWORK || "base-sepolia";
const network = NETWORKS[networkName];
if (!network) {
  console.error(`Unknown X402_NETWORK "${networkName}". Use "base" or "base-sepolia".`);
  process.exit(1);
}
if (networkName === "base" && !(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET)) {
  console.error("X402_NETWORK=base needs CDP_API_KEY_ID and CDP_API_KEY_SECRET (from portal.cdp.coinbase.com).");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const dataset = createDataset(
  () => base("Subculture").select({ filterByFormula: "{Status} = 'Published'" }).all(),
  { refreshMs: REFRESH_MS },
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
// Render terminates TLS at its proxy; trust X-Forwarded-Proto so URLs come out as https.
app.set("trust proxy", true);
app.use(
  cors({
    // Browser-based agents must be able to read the x402 v2 headers.
    exposedHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  }),
);
app.use(express.json());

// FREE: health
app.get("/api/health", (req, res) => {
  res.json({
    status: dataset.ready ? "ok" : "loading",
    network: network.caip2,
    dataset_version: dataset.version,
    loaded_at: dataset.loadedAt,
    subcultures: dataset.names().length,
  });
});

// FREE: catalog, unchanged shape (array of display names) for existing clients
app.get("/api/subcultures", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  res.json(dataset.names());
});

// FREE: catalog with URL-safe slugs (preferred; names like "Avant-Garde / Darkwear" break in paths)
app.get("/api/catalog", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  res.json({
    dataset_version: dataset.version,
    price: PRICE,
    network: network.caip2,
    detail_endpoint: "/api/subculture/{slug}",
    free_sample: "/api/sample",
    free_endpoint: FREE_PER_DAY > 0 ? "/api/free/subculture/{slug}" : null,
    free_per_day: FREE_PER_DAY,
    subcultures: dataset.catalog(),
  });
});

// FREE: one complete record, in exactly the paid shape, so people can see what they buy before setting up a wallet
app.get("/api/sample", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  const entry = dataset.find(SAMPLE_SLUG);
  if (!entry) return res.status(404).json({ error: "Sample not available" });
  res.json({ ...entry, dataset_version: dataset.version });
});

// FREE, capped: any record without a wallet, FREE_PER_DAY per client per UTC day. A separate route on purpose:
// registries probe the paid route and expect a 402 there, so the paid route never answers for free.
const freeQuota = createFreeQuota({ limit: FREE_PER_DAY });
app.get("/api/free/subculture/:name", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  const entry = dataset.find(req.params.name);
  if (!entry) {
    return res.status(404).json({ error: "Subculture not found", available: dataset.catalog().map((c) => c.slug) });
  }
  // Cloudflare sits in front of Render and overwrites CF-Connecting-IP; X-Forwarded-For can be set by the client.
  const cfIp = req.get("cf-connecting-ip");
  const take = freeQuota.take(cfIp || req.ip);
  res.set({
    "RateLimit-Limit": String(FREE_PER_DAY),
    "RateLimit-Remaining": String(take.remaining),
    "RateLimit-Reset": String(Math.ceil((take.resetAt - Date.now()) / 1000)),
  });
  if (!take.allowed) {
    return res.status(429).json({
      error: `Free allowance used: ${FREE_PER_DAY} records per day`,
      resets_at: take.resetAt.toISOString(),
      paid_endpoint: `/api/subculture/${req.params.name}`,
      price: PRICE,
    });
  }
  console.log(`free: ${req.params.name} (${take.remaining} left, ${freeQuota.clientsToday()} clients today, key ${cfIp ? "cf" : "ip"})`);
  res.json({ ...entry, dataset_version: dataset.version, free_remaining_today: take.remaining });
});

// FREE: discovery document for registries and agents (lists the routes, the price and the valid slugs)
app.get("/openapi.json", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  res.json(
    buildOpenApi({
      origin: `${req.protocol}://${req.get("host")}`,
      price: PRICE,
      slugs: dataset.catalog().map((c) => c.slug),
    }),
  );
});

// FREE: x402 manifest, the first thing crawlers fetch. Bare pointers to URLs that answer 402 when probed
// (the shape proposed in x402 #2979); payment terms stay in the live 402, so the two cannot drift apart.
// routeTemplate, as in the Bazaar extension, says the example stands for every slug.
app.get("/.well-known/x402", (req, res) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  res.json({
    x402Version: 2,
    resources: [
      { url: `${origin}/api/subculture/${SAMPLE_SLUG}`, method: "GET", routeTemplate: "/api/subculture/:name" },
      { url: `${origin}/api/subculture?name=${SAMPLE_SLUG}`, method: "GET" },
    ],
    openapi: `${origin}/openapi.json`,
  });
});

// FREE: landing page for people who arrive from a directory or registry
app.get("/", (req, res) => {
  res.sendFile(fileURLToPath(new URL("./landing.html", import.meta.url)));
});

// FREE: icon that registries show next to the listing
app.get("/favicon.ico", (req, res) => {
  res.sendFile(fileURLToPath(new URL("./favicon.png", import.meta.url)), (err) => err && res.status(404).end());
});

// FREE pre-check, runs BEFORE the paywall: an agent never gets asked to pay for a name that doesn't exist.
app.get("/api/subculture/:name", (req, res, next) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  const entry = dataset.find(req.params.name);
  if (!entry) {
    return res.status(404).json({ error: "Subculture not found", available: dataset.catalog().map((c) => c.slug) });
  }
  res.locals.entry = entry;
  next();
});

// RapidAPI marketplace traffic is billed by RapidAPI, so it skips x402.
function isRapidApi(req) {
  const expected = process.env.RAPIDAPI_SECRET;
  const got = req.headers["x-rapidapi-secret"];
  if (!expected || typeof got !== "string") return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// PAID: x402 v2. The middleware answers 402 + PAYMENT-REQUIRED, verifies the client's
// PAYMENT-SIGNATURE with the facilitator, runs the handler, and settles only if the
// handler responds with status < 400.
const paidRoute = (discovery) => ({
  accepts: [{ scheme: "exact", price: PRICE, network: network.caip2, payTo: PAY_TO }],
  description: RECORD_DESCRIPTION,
  mimeType: "application/json",
  // Shown by Bazaar catalogs such as agentic.market; without them the listing has no name and a guessed domain.
  serviceName: "UnderIndex",
  tags: ["fashion", "subcultures", "grounding", "rag", "dataset"],
  iconUrl: "https://underindex-api.onrender.com/favicon.ico",
  extensions: { ...declareDiscoveryExtension({ ...discovery, output: { example: EXAMPLE_RECORD } }) },
});
const slugSchema = {
  properties: {
    name: { type: "string", description: "Subculture slug from GET /api/catalog, e.g. goth-ninja, opium, ura-hara-harajuku-90s" },
  },
  required: ["name"],
};
const x402 = paymentMiddleware(
  {
    "GET /api/subculture/:name": paidRoute({ pathParams: { name: "goth-ninja" }, pathParamsSchema: slugSchema }),
    // Same record with the slug as ?name=. Registries probe a fixed URL, so this one has no free pre-check.
    "GET /api/subculture": paidRoute({ input: { name: "goth-ninja" }, inputSchema: slugSchema }),
  },
  new x402ResourceServer(network.facilitator()).register(network.caip2, new ExactEvmScheme()),
);
// Partner keys (API_KEYS) skip x402 too: for platforms that bill their own users and call providers with a key.
const apiKeys = createApiKeys({ spec: process.env.API_KEYS });
if (apiKeys.size) console.log(`API keys: ${apiKeys.size} partner key(s) loaded`);
const gate = apiKeyGate({ apiKeys, paywall: x402, isPaidPath: (p) => p === "/api/subculture" || p.startsWith("/api/subculture/") });
app.use((req, res, next) => (isRapidApi(req) ? next() : gate(req, res, next)));

app.get("/api/subculture/:name", (req, res) => {
  res.json({ ...res.locals.entry, dataset_version: dataset.version });
});

// Reached only after a verified payment. A 4xx/5xx here is never settled, so a wrong name costs nothing.
app.get("/api/subculture", (req, res) => {
  if (!dataset.ready) return res.status(503).json({ error: "Dataset loading, retry shortly" });
  const entry = typeof req.query.name === "string" ? dataset.find(req.query.name) : null;
  if (!entry) {
    return res.status(404).json({ error: "Subculture not found", available: dataset.catalog().map((c) => c.slug) });
  }
  res.json({ ...entry, dataset_version: dataset.version });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
await dataset.start();
app.listen(PORT, () => {
  console.log(`UnderIndex API on port ${PORT}, x402 ${network.caip2}, paying to ${PAY_TO}`);
});
