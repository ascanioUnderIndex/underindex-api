# UnderIndex API 🔮

**The x402-monetized fashion data oracle for AI agents**

UnderIndex is a high-density, machine-to-machine (M2M) dataset of verified grounding data on 30 niche fashion subcultures (from *Ura-Hara* to *Acubi* and *Opium*).

It's built for AI agents, autonomous personal shoppers and RAG pipelines. Access is paid per call with the open [x402 protocol](https://x402.org) (USDC on Base), so any standard x402 client can pay without needing an API key or an account.

## 🧠 Why build with UnderIndex?
Even strong LLMs blur neighbouring aesthetics when asked about niche fashion. They mix *Goth Ninja* with *Techwear*, drift on dates, and pad outfits with generic high-street substitutes, and the answer changes from one run to the next. UnderIndex is a deterministic source of truth:
- **High signal-to-noise:** Exact key brands, iconic items and historical context.
- **Anti-hallucination guardrails:** Explicit `WARNING` notes that prevent common era and routing errors.
- **Actionable marketplaces:** Specific destinations (e.g. "Yahoo Auctions Japan via proxy", "Grailed") instead of generic "Online" tags.
- **Versioned:** Every response carries a `dataset_version`, so you can cache and detect changes.

## 📊 Before / after
Same model, same question, asked twice: once from memory, once with the UnderIndex record for that subculture.

> *"Build me a Goth Ninja outfit. Name specific brands, the key pieces, where to buy them, a realistic budget, and say which years this aesthetic belongs to."*

| | From memory | With UnderIndex |
|---|---|---|
| Years (record: 2009 - 2014) | 2011–2015, plus a "revival since 2021" | 2009–2014 |
| Key brands in the record | 2 of 4 | 4 of 4 |
| Iconic items in the record | 2 of 4 | 4 of 4 |
| Where to buy | Grailed, plus SSENSE, Farfetch, Vinted, ASOS, Zalando | Grailed, Yahoo Auctions Japan |
| Budget (record: $600 - $2500) | €300 to €8,000+ | $600 to $2,500 |
| Techwear mixed in | Yes: an Acronym shell and Nike Tech Fleece | No: "skip the tactical straps, nylon shells and utility hardware" |

The answer from memory is plausible, which is the problem: nothing in it signals that Acronym and Tech Fleece belong to a different aesthetic. The record's `WARNING` note ("Distinguish from modern Techwear") is what keeps the grounded answer inside the 2009-2014 look.

Method: Claude Opus 5.5, two fresh chats with no memory and no web search, October 2026. In the second chat the record was pasted into the prompt. Full transcripts for this run and for an Acubi run are in [`demo/`](demo/), together with a Claude tool definition that pays for lookups over x402 ([`demo/underindex-tool.mjs`](demo/underindex-tool.mjs)).

## 🪙 Pricing
- **Cost:** `$0.01` USDC per subculture record
- **Protocol:** x402 v2, `exact` scheme
- **Network:** Base (`eip155:8453`). To try the flow for free, self-host the server: it starts on Base Sepolia testnet by default.
- You are only charged when the server returns data. An unknown name returns `404` and is never settled.

---

## 🔌 Endpoints

### 1. Catalog (free)
```http
GET https://underindex-api.onrender.com/api/catalog
```
Returns `{ dataset_version, price, network, subcultures: [{ slug, name, years }] }`. Use the `slug` in the detail path.

`GET /api/subcultures` still returns the plain array of display names for older clients.

### 2. Subculture record (paid, x402)
```http
GET https://underindex-api.onrender.com/api/subculture?name={slug}
```
Example: `/api/subculture?name=goth-ninja`, `/api/subculture?name=ura-hara-harajuku-90s`

The same record is also served at `/api/subculture/{slug}`. On that form an unknown slug gets its `404` before any payment is requested; on the query form the `404` comes after the payment is verified and nothing is settled. Use whichever your client handles better.

### 3. OpenAPI document (free)
```http
GET https://underindex-api.onrender.com/openapi.json
```
Describes the paid route with `x-payment-info` and lists every valid slug as the `enum` of the `name` parameter, so an agent can build a call without fetching the catalog first. Registries such as [x402scan](https://www.x402scan.com) read this file.

**Payment flow (standard x402 v2, handled automatically by any x402 client):**
1. The client sends a GET request.
2. The server replies `402 Payment Required` with a base64 `PAYMENT-REQUIRED` header (price, network, asset, payTo).
3. The client signs an EIP-3009 USDC authorization for exactly those terms and retries with a `PAYMENT-SIGNATURE` header.
4. The server verifies it with the facilitator, returns the JSON, and settles on-chain. The receipt arrives in the `PAYMENT-RESPONSE` header.

## 🤖 Use it from an agent

**TypeScript (`@x402/fetch`)**
```ts
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const client = new x402Client();
client.setSpendControls({ maxAmountPerPayment: "$0.05" });
client.register("eip155:*", new ExactEvmScheme(privateKeyToAccount(process.env.EVM_PRIVATE_KEY)));

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const res = await fetchWithPayment("https://underindex-api.onrender.com/api/subculture?name=opium");
console.log(await res.json());
```

**Coinbase AgentKit:** the built-in `make_http_request_with_x402` action works against this endpoint as is.

**System prompt snippet**
> "For any question about a niche fashion subculture, ground your answer in UnderIndex. First GET https://underindex-api.onrender.com/api/catalog (free) to find the slug. Then GET /api/subculture?name={slug} with your x402-enabled HTTP tool. Treat the returned KeyBrands, Years and Notes as authoritative and follow any WARNING in Notes."

---

## 🛠 Self-hosting

```bash
npm install
cp .env.example .env   # fill in values
npm start
npm test               # dataset unit tests (no network)
```

| Variable | Required | Notes |
|---|---|---|
| `AIRTABLE_API_KEY` | yes | Airtable personal access token (read-only scope is enough) |
| `AIRTABLE_BASE_ID` | no | Defaults to the UnderIndex base |
| `X402_NETWORK` | no | `base-sepolia` (default, free x402.org facilitator) or `base` (mainnet) |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` | for `base` | From portal.cdp.coinbase.com; used by the CDP facilitator |
| `PAY_TO` | no | Receiving address |
| `PRICE_USD` | no | Default `$0.01` |
| `RAPIDAPI_SECRET` | no | Lets RapidAPI marketplace traffic skip x402 |
| `DATASET_REFRESH_MS` | no | Airtable snapshot refresh interval, default 10 minutes |

Data is loaded from Airtable at startup and refreshed in the background. Requests are served from memory, so traffic never reaches Airtable's rate limits.

## Stack
- **Data:** Airtable (snapshotted in memory)
- **Server:** Node.js 20+, Express, `@x402/express` (hosted on Render)
- **Payments:** x402 v2, USDC on Base, CDP facilitator
