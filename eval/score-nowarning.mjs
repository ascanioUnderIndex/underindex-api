// Third arm, promised on r/RAG: the same record with its WARNING removed (records.json minus Notes; every Notes
// field in the run was the WARNING alone). 15 incognito chats on 2026-10-22, answers in answers-nowarning.md.
// Scored exactly like the first two arms, against the frozen records.json:
//   brands, shops       automatic, same alias tables as score.mjs
//   named neighbours    brands of the subcultures the (removed) WARNING named, as in score.mjs
//   unnamed neighbours  brands of every other record, as in rescore-unnamed.mjs
//   years               by hand
// Every hit is read in context and labelled in judgements-nowarning.json; only "recommended" counts as a blend.
// Run: node eval/score-nowarning.mjs        (prints unlabelled hits with context and stops if any are missing)
import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(dir + "records.json"));
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const J = JSON.parse(fs.readFileSync(dir + "judgements.json"));
const JU = JSON.parse(fs.readFileSync(dir + "judgements-unnamed.json"));
const JN = fs.existsSync(dir + "judgements-nowarning.json") ? JSON.parse(fs.readFileSync(dir + "judgements-nowarning.json")) : { years: {}, named: {}, unnamed: {} };

const answers = {};
for (const f of fs.readdirSync(dir + "answers").sort()) {
  const parts = fs.readFileSync(dir + "answers/" + f, "utf8").split(/<!-- answer (\d+) (\S+) (memory|grounded) -->/);
  for (let i = 1; i < parts.length; i += 4) answers[`${parts[i + 1]}/${parts[i + 2]}`] = parts[i + 3];
}
{
  const parts = fs.readFileSync(dir + "answers-nowarning.md", "utf8").split(/<!-- answer (\d+) (\S+) (nowarning) -->/);
  for (let i = 1; i < parts.length; i += 4) answers[`${parts[i + 1]}/${parts[i + 2]}`] = parts[i + 3];
}

// Same alias tables as score.mjs, so all three arms match names the same way
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
const context = (text, b) => {
  const a = aliases(b, BRAND_ALIASES).find((x) => text.includes(x));
  const i = text.indexOf(a);
  return text.slice(Math.max(0, i - 90), i + a.length + 60).replace(/\s+/g, " ");
};

const missing = [];
const rows = [];
for (const q of Q) {
  const rec = R[q.slug];
  const ownBrands = new Set(rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES)));
  const own = new Set([...ownBrands, ...rec.WhereToBuy.flatMap((s) => aliases(s, SHOP_ALIASES))]);
  const notOwn = (b) => !aliases(b, BRAND_ALIASES).some((a) => own.has(a));
  const namedBrands = [...new Set(q.neighbours.flatMap((n) => R[n].KeyBrands))].filter(notOwn);
  const namedSet = new Set(namedBrands.flatMap((b) => aliases(b, BRAND_ALIASES)));
  const others = Object.keys(R).filter((s) => s !== q.slug && !q.neighbours.includes(s));
  const seen = new Set();
  const unnamedBrands = [...new Set(others.flatMap((s) => R[s].KeyBrands))]
    .filter(notOwn)
    .filter((b) => !aliases(b, BRAND_ALIASES).some((a) => namedSet.has(a)))
    .filter((b) => {
      const k = aliases(b, BRAND_ALIASES)[0];
      return seen.has(k) ? false : (seen.add(k), true);
    });

  for (const arm of ["memory", "grounded", "nowarning"]) {
    const key = `${q.slug}/${arm}`;
    const text = norm(answers[key] ?? "");
    if (!text) throw new Error(`missing answer ${key}`);
    const namedLabels = arm === "nowarning" ? JN.named[key] ?? {} : J.neighbour[key] ?? {};
    const unnamedLabels = arm === "nowarning" ? JN.unnamed[key] ?? {} : JU[key] ?? {};
    const namedHits = named(text, namedBrands, BRAND_ALIASES);
    const unnamedHits = named(text, unnamedBrands, BRAND_ALIASES);
    for (const b of namedHits) if (!namedLabels[b]) missing.push(`${key} named ${b}: …${context(text, b)}…`);
    for (const b of unnamedHits) if (!unnamedLabels[b]) missing.push(`${key} unnamed ${b}: …${context(text, b)}…`);
    const years = arm === "nowarning" ? JN.years[q.slug] : J.years[q.slug][arm];
    if (!years) missing.push(`${key} years (record ${rec.Years})`);
    rows.push({
      q, arm,
      brands: named(text, rec.KeyBrands, BRAND_ALIASES).length, brandsTotal: rec.KeyBrands.length,
      shops: named(text, rec.WhereToBuy, SHOP_ALIASES).length, shopsTotal: rec.WhereToBuy.length,
      namedRec: namedHits.filter((b) => (namedLabels[b] ?? "").startsWith("recommended")),
      unnamedRec: unnamedHits.filter((b) => (unnamedLabels[b] ?? "").startsWith("recommended")),
      yearsOk: years?.[1],
    });
  }
}

if (missing.length) {
  console.log(`${missing.length} judgements missing in judgements-nowarning.json:\n` + missing.join("\n"));
  process.exit(1);
}

const pct = (a, b) => `${a}/${b} (${Math.round((100 * a) / b)}%)`;
const plural = (k, word) => `${k} ${word}${k === 1 ? "" : "s"}`;
const col = (arm) => {
  const r = rows.filter((x) => x.arm === arm);
  const sum = (f) => r.reduce((n, x) => n + f(x), 0);
  return {
    brands: pct(sum((x) => x.brands), sum((x) => x.brandsTotal)),
    shops: pct(sum((x) => x.shops), sum((x) => x.shopsTotal)),
    years: pct(r.filter((x) => x.yearsOk).length, r.length),
    named: `${pct(r.filter((x) => x.namedRec.length).length, r.length)}, ${plural(sum((x) => x.namedRec.length), "brand")}`,
    unnamed: `${pct(r.filter((x) => x.unnamedRec.length).length, r.length)}, ${plural(sum((x) => x.unnamedRec.length), "brand")}`,
  };
};
const [m, g, n] = ["memory", "grounded", "nowarning"].map(col);
const table = `| | From memory | Record with WARNING | Record without WARNING |
|:---|:---:|:---:|:---:|
| Record's key brands named | ${m.brands} | ${g.brands} | ${n.brands} |
| Record's shops named | ${m.shops} | ${g.shops} | ${n.shops} |
| Years match the record (within 2 years) | ${m.years} | ${g.years} | ${n.years} |
| Recommends a brand of a subculture the WARNING names | ${m.named} | ${g.named} | ${n.named} |
| Recommends a brand of any other subculture in the dataset | ${m.unnamed} | ${g.unnamed} | ${n.unnamed} |`;
const blends = (arm) =>
  rows
    .filter((x) => x.arm === arm && (x.namedRec.length || x.unnamedRec.length))
    .map((x) => `${[...x.namedRec, ...x.unnamedRec].join(" and ")} for ${x.q.name}`)
    .join("; ");
console.log(table + "\n\nno-WARNING blends: " + blends("nowarning"));

// The section goes into README.md (written by score.mjs) just before "How it was scored"
const section = `## Third arm: the record without its WARNING

Asked on r/RAG: is it the record that keeps the model inside the style, or the \`WARNING\` in its \`Notes\`? Every \`Notes\` field in the run held only the WARNING, so the third arm sends the same \`records.json\` record with \`Notes\` removed and the same question. 15 new incognito chats, Claude Opus 5.5 on claude.ai, 2026-10-22.

${table}

"A subculture the WARNING names" is the original neighbour metric. "Any other subculture" is the re-score suggested on r/RAG: brands of every other record in \`records.json\`, read in context the same way.

**The WARNING made no measurable difference.** Without it the answers stayed inside the style as well as with it. The remaining blends were ${blends("nowarning")}, all brands those scenes actually wore. With the WARNING they were ${blends("grounded")}. On this run the effect comes from the record's brands, years and shops, not from the warning text. On one run a difference of one or two answers is noise; the second run below repeats all three arms.

Files: [\`answers-nowarning.md\`](answers-nowarning.md) (15 answers, verbatim), [\`judgements-nowarning.json\`](judgements-nowarning.json), [\`score-nowarning.mjs\`](score-nowarning.mjs).

`;
const readme = fs.readFileSync(dir + "README.md", "utf8").replace(/## Third arm:[\s\S]*?(?=## How it was scored)/, "");
if (!readme.includes("## How it was scored")) throw new Error("README.md has no 'How it was scored' section");
fs.writeFileSync(dir + "README.md", readme.replace("## How it was scored", section + "## How it was scored"));
