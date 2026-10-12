// Before/after demo: ask Claude the same shopping question twice.
// "Before" answers from memory. "After" can call UnderIndex and pays for the lookup over x402.
import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createUnderIndex, tools } from "./underindex-tool.mjs";

const MODEL = process.env.MODEL || "claude-opus-5-5";
const BASE_URL = (process.env.UNDERINDEX_URL || "http://localhost:3000").replace(/\/$/, "");
const QUESTION =
  process.argv.slice(2).join(" ") ||
  "Build me an Acubi outfit. Name specific brands, the key pieces, where to buy them, and a realistic budget.";
const SYSTEM = "You are a personal shopping agent for niche fashion aesthetics. Be specific and concise.";
const SYSTEM_GROUNDED =
  SYSTEM +
  " You have the UnderIndex tools. Before recommending anything for a named aesthetic, look it up with " +
  "get_subculture and base brands, items, shops and prices on that record.";

if (!process.env.WALLET_PRIVATE_KEY) {
  console.error("WALLET_PRIVATE_KEY is missing. Run `npm run wallet` in this folder first.");
  process.exit(1);
}

const claude = new Anthropic();
const underindex = createUnderIndex({ baseUrl: BASE_URL, privateKey: process.env.WALLET_PRIVATE_KEY });

const textOf = (message) =>
  message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

async function ask(system, withTools) {
  const messages = [{ role: "user", content: QUESTION }];
  for (let turn = 0; turn < 8; turn++) {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages,
      ...(withTools ? { tools } : {}),
    });
    if (response.stop_reason === "refusal") throw new Error("Claude declined to answer this question.");
    if (response.stop_reason !== "tool_use") return textOf(response);

    messages.push({ role: "assistant", content: response.content });
    const results = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.error(`  -> ${block.name}(${JSON.stringify(block.input)})`);
      try {
        results.push({ type: "tool_result", tool_use_id: block.id, content: await underindex.runTool(block.name, block.input) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: String(err.message), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("The agent did not finish within 8 turns.");
}

/** Which verified names from the paid record does an answer actually mention? */
function overlap(answer, names) {
  const haystack = answer.toLowerCase();
  // "Diesel (early 00s)" should match an answer that just says "Diesel".
  return names.filter((n) => haystack.includes(n.replace(/\s*\(.*\)$/, "").toLowerCase()));
}

console.error(`Model: ${MODEL}\nUnderIndex: ${BASE_URL}\nQuestion: ${QUESTION}\n`);
console.error("Before (no tools)...");
const before = await ask(SYSTEM, false);
console.error("After (with UnderIndex)...");
const after = await ask(SYSTEM_GROUNDED, true);

const record = underindex.records[0];
const lines = [`# UnderIndex before/after`, ``, `**Model:** ${MODEL}  `, `**Question:** ${QUESTION}`, ``];
lines.push(`## Before: Claude from memory`, ``, before, ``);
lines.push(`## After: Claude with UnderIndex`, ``, after, ``);

lines.push(`## What changed`, ``);
if (record) {
  lines.push(`Verified names from the UnderIndex record for **${record.Name}** that each answer mentions:`, ``);
  lines.push(`| Field | Verified | Before | After |`, `|---|---|---|---|`);
  for (const [label, key] of [["Key brands", "KeyBrands"], ["Where to buy", "WhereToBuy"]]) {
    const verified = record[key] ?? [];
    const b = overlap(before, verified);
    const a = overlap(after, verified);
    lines.push(`| ${label} | ${verified.join(", ")} | ${b.length}/${verified.length} | ${a.length}/${verified.length} |`);
  }
  lines.push(``);
} else {
  lines.push(`The agent answered without calling get_subculture, so there is no record to compare against.`, ``);
}
lines.push(`## Payments`, ``);
if (underindex.payments.length === 0) lines.push(`No paid lookups were made.`);
for (const p of underindex.payments) lines.push(`- \`${p.slug}\`: $0.01 USDC on ${p.network}, ${p.url}`);
lines.push(``);

const report = lines.join("\n");
fs.writeFileSync(new URL("./output.md", import.meta.url), report);
console.log(report);
console.error("Saved to demo/output.md");
