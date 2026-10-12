import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";
import Airtable from "airtable";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { createCdpFacilitatorClient } from "@coinbase/cdp-sdk/x402";
import { createDataset } from "./dataset.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const PAY_TO = process.env.PAY_TO || "0xb5842a407e6b37925DafEcf265a80A697f2B474C";
const PRICE = process.env.PRICE_USD || "$0.01";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appEkpxkkqg3JZ2wj";
const REFRESH_MS = Number(process.env.DATASET_REFRESH_MS || 10 * 60 * 1000);

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
    exposedHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
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
    subcultures: dataset.catalog(),
  });
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
const x402 = paymentMiddleware(
  {
    "GET /api/subculture/:name": {
      accepts: [{ scheme: "exact", price: PRICE, network: network.caip2, payTo: PAY_TO }],
      description:
        "UnderIndex: verified grounding data for one niche fashion subculture (era, key brands, iconic items, " +
        "music, where to buy, price range, anti-hallucination notes). Free catalog of slugs at /api/catalog.",
      mimeType: "application/json",
      extensions: {
        ...declareDiscoveryExtension({
          pathParams: { name: "acubi-style" },
          pathParamsSchema: {
            properties: {
              name: { type: "string", description: "Subculture slug from GET /api/catalog, e.g. acubi-style, opium, ura-hara-harajuku-90s" },
            },
            required: ["name"],
          },
          output: {
            example: {
              Name: "Acubi Style",
              Years: "2020s",
              KeyBrands: "…",
              IconicItems: "…",
              WhereToBuy: "…",
              PriceRange: "…",
              Notes: "WARNING: …",
              dataset_version: "3f9a1c0b7e2d",
            },
          },
        }),
      },
    },
  },
  new x402ResourceServer(network.facilitator()).register(network.caip2, new ExactEvmScheme()),
);
app.use((req, res, next) => (isRapidApi(req) ? next() : x402(req, res, next)));

app.get("/api/subculture/:name", (req, res) => {
  res.json({ ...res.locals.entry, dataset_version: dataset.version });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
await dataset.start();
app.listen(PORT, () => {
  console.log(`UnderIndex API on port ${PORT}, x402 ${network.caip2}, paying to ${PAY_TO}`);
});
