# UnderIndex MCP server

Gives Claude (or any MCP client) verified records on 60 niche fashion subcultures: years, key brands, iconic items, music, where to buy, a price range, and a `WARNING` note on what each one must not be confused with. It is the [UnderIndex API](https://github.com/ascanioUnderIndex/underindex-api) as three tools.

| Tool | Cost | What it does |
|---|---|---|
| `list_subcultures` | free | Every slug with its name and years |
| `get_sample_record` | free | One complete record (Goth Ninja), to see the shape |
| `get_subculture` | $0.01 USDC on Base | One record, paid automatically over [x402](https://x402.org) |

Without a wallet key the two free tools work and `get_subculture` explains how to enable payments.

## Install

Requires Node.js 20 or later.

```bash
git clone https://github.com/ascanioUnderIndex/underindex-api.git
cd underindex-api/mcp
npm install
```

### Claude Desktop

Add this to `claude_desktop_config.json` (Settings → Developer → Edit Config), with the absolute path to `index.mjs`:

```json
{
  "mcpServers": {
    "underindex": {
      "command": "node",
      "args": ["/absolute/path/to/underindex-api/mcp/index.mjs"],
      "env": {
        "UNDERINDEX_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add underindex -e UNDERINDEX_PRIVATE_KEY=0x... -- node /absolute/path/to/underindex-api/mcp/index.mjs
```

Leave out `UNDERINDEX_PRIVATE_KEY` to use only the free tools.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `UNDERINDEX_PRIVATE_KEY` | none | Private key of an EVM wallet holding USDC on Base. Use a dedicated wallet with a few dollars in it, never your main one. |
| `UNDERINDEX_MAX_PER_CALL` | `$0.05` | Hard cap per lookup. The server refuses to pay more than this, whatever the API asks. |
| `UNDERINDEX_API_URL` | `https://underindex-api.onrender.com` | Point it at a self-hosted server, e.g. one running on Base Sepolia testnet. |

An unknown slug returns 404 before any payment is requested, so typos cost nothing. Each paid answer ends with a link to the payment on BaseScan.

## Try it for free

The API's own server starts on Base Sepolia testnet when self-hosted, where test USDC is free from a faucet. Run it as described in the [main README](../README.md#-self-hosting), then set `UNDERINDEX_API_URL=http://localhost:3000` and a testnet wallet key.
