// Re-score of the same 30 answers, suggested on r/RAG: does the WARNING only suppress the neighbours it names?
// Uses the frozen lists from the run (records.json, unchanged), so a difference can't come from list edits.
//   named:   brands of the subcultures named in the record's WARNING (the original metric, same judgements)
//   unnamed: brands of every other record in records.json, minus the record's own brands/shops and the named ones
// Every unnamed hit is read in context and labelled in judgements-unnamed.json; only "recommended" counts.
// Run: node eval/rescore-unnamed.mjs            (prints unlabelled hits and stops if any are missing)
import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(dir + "records.json"));
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const J = JSON.parse(fs.readFileSync(dir + "judgements.json"));
const JU = fs.existsSync(dir + "judgements-unnamed.json") ? JSON.parse(fs.readFileSync(dir + "judgements-unnamed.json")) : {};

const answers = {};
for (const f of fs.readdirSync(dir + "answers").sort()) {
  const parts = fs.readFileSync(dir + "answers/" + f, "utf8").split(/<!-- answer (\d+) (\S+) (memory|grounded) -->/);
  for (let i = 1; i < parts.length; i += 4) answers[`${parts[i + 1]}/${parts[i + 2]}`] = parts[i + 3];
}

// Same alias tables as score.mjs, so both passes match names the same way
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

const missing = [];
const rows = [];
for (const q of Q) {
  const rec = R[q.slug];
  const own = new Set([
    ...rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES)),
    ...rec.WhereToBuy.flatMap((s) => aliases(s, SHOP_ALIASES)),
  ]);
  const notOwn = (b) => !aliases(b, BRAND_ALIASES).some((a) => own.has(a));
  const namedBrands = [...new Set(q.neighbours.flatMap((n) => R[n].KeyBrands))].filter(notOwn);
  const namedSet = new Set(namedBrands.flatMap((b) => aliases(b, BRAND_ALIASES)));
  const others = Object.keys(R).filter((s) => s !== q.slug && !q.neighbours.includes(s));
  // One entry per brand: "Adidas" and "Adidas (vintage)" are filed under different records but match the same text
  const seen = new Set();
  const unnamedBrands = [...new Set(others.flatMap((s) => R[s].KeyBrands))]
    .filter(notOwn)
    .filter((b) => !aliases(b, BRAND_ALIASES).some((a) => namedSet.has(a)))
    .filter((b) => {
      const k = aliases(b, BRAND_ALIASES)[0];
      return seen.has(k) ? false : (seen.add(k), true);
    });
  const source = (b) => {
    const k = aliases(b, BRAND_ALIASES)[0];
    return others.filter((s) => R[s].KeyBrands.some((x) => aliases(x, BRAND_ALIASES)[0] === k)).join(", ");
  };

  for (const arm of ["memory", "grounded"]) {
    const key = `${q.slug}/${arm}`;
    const text = norm(answers[key]);
    const namedLabels = J.neighbour[key] ?? {};
    const namedRec = named(text, namedBrands, BRAND_ALIASES).filter((b) => (namedLabels[b] ?? "").startsWith("recommended"));
    const hits = named(text, unnamedBrands, BRAND_ALIASES);
    const labels = JU[key] ?? {};
    for (const b of hits) if (!labels[b]) missing.push(`${key}: ${b} (filed under ${source(b)})`);
    const unnamedRec = hits.filter((b) => (labels[b] ?? "").startsWith("recommended"));
    rows.push({ q, arm, namedRec, unnamedRec });
  }
}

if (missing.length) {
  console.log(`${missing.length} unnamed hits to label in judgements-unnamed.json:\n` + missing.join("\n"));
  process.exit(1);
}

const count = (arm, f) => rows.filter((r) => r.arm === arm && r[f].length).length;
const brands = (arm, f) => rows.filter((r) => r.arm === arm).reduce((n, r) => n + r[f].length, 0);
console.log("answers with at least one recommended blend (of 15), and total blended brands:");
for (const arm of ["memory", "grounded"]) {
  console.log(`  ${arm.padEnd(8)} named ${count(arm, "namedRec")}/15 (${brands(arm, "namedRec")} brands)   unnamed ${count(arm, "unnamedRec")}/15 (${brands(arm, "unnamedRec")} brands)`);
}
console.log("\nper answer:");
for (const r of rows) {
  if (r.namedRec.length || r.unnamedRec.length)
    console.log(`  ${r.q.slug}/${r.arm}: named [${r.namedRec.join(", ")}]  unnamed [${r.unnamedRec.join(", ")}]`);
}
