// Creates a throwaway wallet for the demo and stores its key in demo/.env (gitignored).
// Fund it with test USDC on Base Sepolia from https://faucet.circle.com before running the demo.
import fs from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = new URL("./.env", import.meta.url);
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "ANTHROPIC_API_KEY=\nUNDERINDEX_URL=http://localhost:3000\n";
let key = env.match(/^WALLET_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
if (!key) {
  key = generatePrivateKey();
  env = env.replace(/^WALLET_PRIVATE_KEY=.*\n?/m, "") + `WALLET_PRIVATE_KEY=${key}\n`;
  fs.writeFileSync(envPath, env, { mode: 0o600 });
}
console.log("Demo wallet address:", privateKeyToAccount(key).address);
console.log("Send it test USDC on Base Sepolia (https://faucet.circle.com), then run: npm run demo");
