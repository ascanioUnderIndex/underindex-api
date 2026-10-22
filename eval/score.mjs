// Scores the 30 answers in answers/ against the UnderIndex records and writes README.md.
// Automatic: which of the record's KeyBrands and WhereToBuy entries an answer names, and which brands it
// names that the dataset files under a neighbouring subculture. Years, and whether a neighbour brand is
// recommended or only mentioned, are judged by hand in judgements.json.
// Run: node eval/score.mjs
import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(dir + "records.json"));
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const J = JSON.parse(fs.readFileSync(dir + "judgements.json"));

// answers/answers-part-*.md hold every answer under a "<!-- answer {id} {slug} {arm} -->" marker
const answers = {};
for (const f of fs.readdirSync(dir + "answers").sort()) {
  const parts = fs.readFileSync(dir + "answers/" + f, "utf8").split(/<!-- answer (\d+) (\S+) (memory|grounded) -->/);
  for (let i = 1; i < parts.length; i += 4) answers[`${parts[i + 1]}/${parts[i + 2]}`] = parts[i + 3];
}

const BRAND_ALIASES = {
  "A Bathing Ape (90s era)": ["bathing ape", "bape"],
  "Number (N)ine": ["number (n)ine", "number nine"],
  "Nike (Gyakusou)": ["gyakusou"],
  "Adidas (vintage)": ["adidas"],
  "Oakley (vintage software era)": ["oakley"],
  "Prada Linea Rossa (early 00s)": ["linea rossa"],
  "11 by BBS": ["11 by bbs", "11 by boris"],
  "The Real McCoy's": ["real mccoy"],
  "Buzz Rickson's": ["buzz rickson"],
  "Nautica JP": ["nautica"],
  "C.P. Company": ["c.p. company", "cp company"],
  "Dr. Martens": ["dr. martens", "dr martens", "doc martens"],
};
const SHOP_ALIASES = {
  "Yahoo Auctions Japan": ["yahoo auctions", "yahoo! auctions"],
  "Mercari Japan": ["mercari"],
  "Thrift stores": ["thrift"],
  "Vintage boutiques": ["vintage boutique", "vintage shop", "vintage store"],
  "Official brand sites": ["official", "brand site", "brand website", "own site", "brand stores"],
  "Rick Owens boutiques": ["rick owens boutique", "rick owens store", "rick owens' own stores"],
  "The RealReal": ["realreal"],
};
const norm = (s) => s.toLowerCase().replace(/[’‘]/g, "'");
const aliases = (name, table) => table[name] ?? [norm(name.replace(/\s*\(.*?\)\s*/g, " ").trim())];
const named = (text, list, table) => list.filter((n) => aliases(n, table).some((a) => text.includes(a)));

const rows = [];
for (const q of Q) {
  const rec = R[q.slug];
  const ownBrands = new Set(rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES)));
  const ownShops = new Set(rec.WhereToBuy.flatMap((s) => aliases(s, SHOP_ALIASES)));
  // Brands the dataset files under a neighbouring subculture, minus any this record also uses as a brand or a shop
  const neighbourBrands = [...new Set(q.neighbours.flatMap((n) => R[n].KeyBrands))].filter(
    (b) => !aliases(b, BRAND_ALIASES).some((a) => ownBrands.has(a) || ownShops.has(a)),
  );
  for (const arm of ["memory", "grounded"]) {
    const text = norm(answers[`${q.slug}/${arm}`] ?? "");
    if (!text) throw new Error(`missing answer ${q.slug}/${arm}`);
    const found = named(text, neighbourBrands, BRAND_ALIASES);
    const labels = J.neighbour[`${q.slug}/${arm}`] ?? {};
    for (const b of found) if (!labels[b]) throw new Error(`judge neighbour brand ${b} in ${q.slug}/${arm}`);
    rows.push({
      q, arm,
      brands: named(text, rec.KeyBrands, BRAND_ALIASES).length, brandsTotal: rec.KeyBrands.length,
      shops: named(text, rec.WhereToBuy, SHOP_ALIASES).length, shopsTotal: rec.WhereToBuy.length,
      recommended: found.filter((b) => labels[b].startsWith("recommended")),
      yearsOk: J.years[q.slug][arm][1],
    });
  }
}

const total = (arm) => {
  const r = rows.filter((x) => x.arm === arm);
  const sum = (f) => r.reduce((n, x) => n + f(x), 0);
  const pct = (a, b) => `${a}/${b} (${Math.round((100 * a) / b)}%)`;
  return {
    brands: pct(sum((x) => x.brands), sum((x) => x.brandsTotal)),
    shops: pct(sum((x) => x.shops), sum((x) => x.shopsTotal)),
    years: pct(r.filter((x) => x.yearsOk).length, r.length),
    blend: pct(r.filter((x) => x.recommended.length).length, r.length),
  };
};
const m = total("memory"), g = total("grounded");
const version = Object.values(R)[0].dataset_version;

let md = `# Evaluation: 15 subcultures, from memory vs. with the record

Same model, same question, two fresh chats per subculture: one answering from memory, one with the UnderIndex record pasted above the question. Claude Opus 5.5 on claude.ai, incognito chats, 2026-10-14, dataset version \`${version}\`.

Prompt, from memory:

> Build me a {Name} outfit. Name specific brands, the key pieces, where to buy them, a realistic budget, and say which years this aesthetic belongs to. Answer from your own knowledge; do not search the web.

Prompt, with the record: \`Reference record from the UnderIndex dataset: {record JSON without dataset_version} --- \` followed by the same text.

## Totals

| | From memory | With the record |
|---|---|---|
| Record's key brands named | ${m.brands} | ${g.brands} |
| Record's shops named | ${m.shops} | ${g.shops} |
| Years match the record (within 2 years) | ${m.years} | ${g.years} |
| Answers recommending a brand the dataset files under a neighbouring subculture | ${m.blend} | ${g.blend} |

## Per subculture

| # | Subculture | Key brands named (memory → record) | Years from memory (record) | Neighbour brands recommended from memory |
|---|---|---|---|---|
`;
for (const q of Q) {
  const mem = rows.find((x) => x.q === q && x.arm === "memory");
  const gr = rows.find((x) => x.q === q && x.arm === "grounded");
  const [said, ok] = J.years[q.slug].memory;
  md += `| ${q.id} | ${q.name} | ${mem.brands}/${mem.brandsTotal} → ${gr.brands}/${gr.brandsTotal} | ${ok ? said : `**${said}**`} (${J.years[q.slug].record}) | ${mem.recommended.join(", ") || "none"} |\n`;
}
md += `
## Where the model disagreed with the record

With the record in front of it, the model questioned ${Object.keys(J.record_flags).length} of the 15 records:

${Object.entries(J.record_flags).map(([s, t]) => `- **${R[s].Name}**: ${t}`).join("\n")}

${J.corrections}

## How it was scored

- **Brands and shops**: \`score.mjs\` checks which of the record's \`KeyBrands\` and \`WhereToBuy\` entries appear in the answer (case-insensitive, with a few aliases such as BAPE for A Bathing Ape).
- **Neighbour brands**: the script lists brands that the dataset assigns to the subcultures named in the record's warning (for example Techwear for Goth Ninja) and that the record itself does not use. Each hit was read in context and counted only when the answer recommends it, not when it mentions it as history or to rule it out (\`judgements.json\`).
- **Years**: judged by hand from each answer's stated core window (\`judgements.json\`).
- Budgets are not scored: answers give several tiers in different currencies, so there was no fair single number.

## Limits

- Matching the record is not the same as being right. The record is the reference here, and the section above shows it had weak points.
- With the record pasted in, the model mostly repeats it, so the brand and shop rows partly measure that. The neighbour-brand and years rows are the informative ones.
- A neighbour brand is not always wrong: Fred Perry was worn by terrace casuals, and Dr. Martens are common across goth styles. The metric follows the dataset's own boundaries.
- Two runs per arm (see Second run), one model, 15 subcultures. Answers vary between runs.
- The record was pasted into the prompt, so this measures what the model does with the data, not how an agent fetches it over x402.

Files: [\`answers/\`](answers/) (all 30 answers, verbatim), [\`questions.json\`](questions.json), [\`records.json\`](records.json) (the records as they were during the run), [\`judgements.json\`](judgements.json), [\`score.mjs\`](score.mjs).
`;
fs.writeFileSync(dir + "README.md", md);
console.log("memory", m, "\ngrounded", g);
