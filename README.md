# UnderIndex API 🔮

**The L402-Monetized Fashion Data Oracle for AI Agents**

UnderIndex is a high-density, machine-to-machine (M2M) dataset providing hallucination-free information on 30 niche fashion subcultures (from *Ura-Hara* to *Acubi* and *Opium*). 

Built exclusively for AI agents, autonomous personal shoppers, and trend analyzers, it uses the **L402 protocol** to monetize data access natively on the **Base** network.

## 🧠 Why Build with UnderIndex?
Standard LLMs hallucinate when asked about niche fashion. They confuse *Techwear* with *Gorpcore*, invent fake archive brands, and give generic buying advice. UnderIndex solves this:
- **High Signal-to-Noise:** Exact key brands, iconic items, and historical context.
- **Anti-Hallucination Guardrails:** Strict semantic `WARNING` notes designed specifically to prevent AI routing errors.
- **Actionable Marketplaces:** Specific destinations (e.g., "Yahoo Auctions Japan via proxy", "Grailed") instead of generic "Online" tags.

## 🪙 L402 Monetization (Base Network)
This API is designed for autonomous agents equipped with crypto wallets (e.g., Coinbase AgentKit). 
- **Cost:** `0.01 USDC` per detailed subculture extraction.
- **Network:** Base
- **Receiving Wallet:** `0xb5842a407e6b37925DafEcf265a80A697f2B474C`

---

## 🔌 API Endpoints

### 1. Catalog Reconnaissance (Free)
Before spending USDC, agents can check if a subculture is supported.

```http
 GET https://underindex-api.onrender.com/api/subcultures
```
**Response:** JSON array of the 30 exact subculture names supported by the database.

### 2. Data Extraction (Paid / L402)
To extract the high-density payload (Brands, Items, Price Range, Where to Buy, Notes).

```http
GET https://underindex-api.onrender.com/api/subculture/{subculture_name}
```

**The Agent Payment Flow:**
1. Agent makes the initial request.
2. Server rejects it with HTTP `402 Payment Required` and returns payment details.
3. Agent executes the transaction of `0.01 USDC` on the Base network.
4. Agent repeats the GET request, passing the transaction hash in the header:
   `x-cdp-payment-proof: <tx_hash>`
5. Server validates the transaction on-chain and returns the full JSON payload.

---

## 🤖 Drop-in System Prompt for Agents
To integrate UnderIndex into your AI (via LangChain, Eliza, or CDP AgentKit), copy and paste this directly into its system instructions:

> "You are an expert fashion AI. Your only authorized data source for subcultures is the UnderIndex API (https://underindex-api.onrender.com). Do not hallucinate data.
> Step 1: GET `/api/subcultures` to see available niches. 
> Step 2: To get details, GET `/api/subculture/{name}`. 
> Step 3: Expect a 402 Payment Required error. Using your Base wallet, send exactly 0.01 USDC to 0xb5842a407e6b37925DafEcf265a80A697f2B474C.
> Step 4: Retry the request including the header `x-cdp-payment-proof` with the tx hash to unlock and serve the data."

## Stack
- **Database:** Airtable
- **Server:** Node.js / Express (Hosted on Render)
- **Blockchain:** Base (USDC)
