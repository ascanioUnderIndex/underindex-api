// Second run of all three arms (answers-run2.md, 2026-10-22), same prompts and frozen records.json as run 1.
// Scored exactly like score.mjs / rescore-unnamed.mjs / score-nowarning.mjs; hand labels in judgements-run2.json.
// Prints run 1, run 2 and the two-run total per arm.
// Run: node eval/score-run2.mjs        (prints unlabelled hits with context and stops if any are missing)
import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(dir + "records.json"));
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const J = JSON.parse(fs.readFileSync(dir + "judgements.json"));
const JU = JSON.parse(fs.readFileSync(dir + "judgements-unnamed.json"));
const JN = JSON.parse(fs.readFileSync(dir + "judgements-nowarning.json"));
const J2 = fs.existsSync(dir + "judgements-run2.json") ? JSON.parse(fs.readFileSync(dir + "judgements-run2.json")) : { years: {}, named: {}, unnamed: {} };

const split = (file, re) => {
  const out = {};
  const parts = fs.readFileSync(dir + file, "utf8").split(re);
  for (let i = 1; i < parts.length; i += 4) out[`${parts[i + 1]}/${parts[i + 2]}`] = parts[i + 3];
  return out;
};
const run1 = {};
for (const f of fs.readdirSync(dir + "answers").sort()) Object.assign(run1, split("answers/" + f, /<!-- answer (\d+) (\S+) (memory|grounded) -->/));
Object.assign(run1, split("answers-nowarning.md", /<!-- answer (\d+) (\S+) (nowarning) -->/));
const run2 = split("answers-run2.md", /<!-- answer (\d+) (\S+) (memory|grounded|nowarning) -->/);

// Same alias tables as score.mjs, so every run matches names the same way
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
  const own = new Set([...rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES)), ...rec.WhereToBuy.flatMap((s) => aliases(s, SHOP_ALIASES))]);
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

  for (const run of [1, 2]) {
    for (const arm of ["memory", "grounded", "nowarning"]) {
      const key = `${q.slug}/${arm}`;
      const text = norm((run === 1 ? run1 : run2)[key] ?? "");
      if (!text) throw new Error(`missing answer run ${run} ${key}`);
      let namedLabels, unnamedLabels, years;
      if (run === 2) [namedLabels, unnamedLabels, years] = [J2.named[key] ?? {}, J2.unnamed[key] ?? {}, J2.years[key]];
      else if (arm === "nowarning") [namedLabels, unnamedLabels, years] = [JN.named[key] ?? {}, JN.unnamed[key] ?? {}, JN.years[q.slug]];
      else [namedLabels, unnamedLabels, years] = [J.neighbour[key] ?? {}, JU[key] ?? {}, J.years[q.slug][arm]];
      const namedHits = named(text, namedBrands, BRAND_ALIASES);
      const unnamedHits = named(text, unnamedBrands, BRAND_ALIASES);
      for (const b of namedHits) if (!namedLabels[b]) missing.push(`run ${run} ${key} named ${b}: …${context(text, b)}…`);
      for (const b of unnamedHits) if (!unnamedLabels[b]) missing.push(`run ${run} ${key} unnamed ${b}: …${context(text, b)}…`);
      if (!years) missing.push(`run ${run} ${key} years (record ${rec.Years})`);
      rows.push({
        q, run, arm,
        brands: named(text, rec.KeyBrands, BRAND_ALIASES).length, brandsTotal: rec.KeyBrands.length,
        shops: named(text, rec.WhereToBuy, SHOP_ALIASES).length, shopsTotal: rec.WhereToBuy.length,
        namedRec: namedHits.filter((b) => (namedLabels[b] ?? "").startsWith("recommended")),
        unnamedRec: unnamedHits.filter((b) => (unnamedLabels[b] ?? "").startsWith("recommended")),
        yearsOk: years?.[1],
      });
    }
  }
}

if (missing.length) {
  console.log(`${missing.length} judgements missing in judgements-run2.json:\n` + missing.join("\n"));
  process.exit(1);
}

const cell = (arm, runs, f, total) => {
  const r = rows.filter((x) => x.arm === arm && runs.includes(x.run));
  const n = r.reduce((s, x) => s + f(x), 0);
  const d = total ? r.reduce((s, x) => s + total(x), 0) : r.length;
  return `${n}/${d} (${Math.round((100 * n) / d)}%)`;
};
const metrics = [
  ["Record's key brands named", (x) => x.brands, (x) => x.brandsTotal],
  ["Years match the record (within 2 years)", (x) => (x.yearsOk ? 1 : 0)],
  ["Recommends a brand of a subculture the WARNING names", (x) => (x.namedRec.length ? 1 : 0)],
  ["Recommends a brand of any other subculture in the dataset", (x) => (x.unnamedRec.length ? 1 : 0)],
];
let table = "| Metric | Run | From memory | Record with WARNING | Record without WARNING |\n|:---|:---:|:---:|:---:|:---:|\n";
for (const [label, f, t] of metrics)
  for (const [runLabel, runs] of [["1", [1]], ["2", [2]], ["both", [1, 2]]])
    table += `| ${runLabel === "1" ? label : ""} | ${runLabel} | ${["memory", "grounded", "nowarning"].map((a) => cell(a, runs, f, t)).join(" | ")} |\n`;
console.log(table);
console.log("run-2 blends:");
for (const r of rows.filter((x) => x.run === 2 && (x.namedRec.length || x.unnamedRec.length)))
  console.log(`  ${r.q.slug}/${r.arm}: named [${r.namedRec.join(", ")}] unnamed [${r.unnamedRec.join(", ")}]`);

// Suggested on r/RAG: the 9 records the model questioned in run 1 were corrected afterwards, but every run scores
// the frozen originals, so split the blends by those 9 against the 6 left unchanged
const corrected = new Set(Object.keys(J.record_flags));
const splitCell = (arms, inCorrected, f) => {
  const r = rows.filter((x) => arms.includes(x.arm) && corrected.has(x.q.slug) === inCorrected);
  return `${r.filter(f).length}/${r.length}`;
};
const namedBlend = (x) => x.namedRec.length > 0, otherBlend = (x) => x.unnamedRec.length > 0;
const nCorrected = Q.filter((q) => corrected.has(q.slug)).length, nUnchanged = Q.length - nCorrected;
let splitTable = "| Records | Named neighbour, from memory | Named neighbour, with the record | Any other subculture, from memory | Any other subculture, with the record |\n|:---|:---:|:---:|:---:|:---:|\n";
for (const [label, inC] of [[`${nCorrected} later corrected`, true], [`${nUnchanged} unchanged`, false]])
  splitTable += `| ${label} | ${splitCell(["memory"], inC, namedBlend)} | ${splitCell(["grounded", "nowarning"], inC, namedBlend)} | ${splitCell(["memory"], inC, otherBlend)} | ${splitCell(["grounded", "nowarning"], inC, otherBlend)} |\n`;
const recArms = rows.filter((x) => x.arm !== "memory");
const recNamed = recArms.filter(namedBlend), recOther = recArms.filter(otherBlend);
const fromCorrected = (list) => list.filter((x) => corrected.has(x.q.slug)).length;
console.log(splitTable);

// The section goes into README.md (written by score.mjs) just before "How it was scored"
const both = (arm, f) => cell(arm, [1, 2], f);
const section = `## Second run

All three arms again, 45 new incognito chats on 2026-10-22 with the same prompts and the same frozen \`records.json\`, to see how much of the result is run-to-run noise.

${table}
Across both runs the record cuts named-neighbour blends from ${both("memory", metrics[2][1])} to ${both("grounded", metrics[2][1])} with the WARNING and ${both("nowarning", metrics[2][1])} without it, and blends from any other subculture from ${both("memory", metrics[3][1])} to ${both("grounded", metrics[3][1])} and ${both("nowarning", metrics[3][1])}. The second run reproduces the first: the record does the work, and the WARNING adds nothing measurable.

**Split by the corrected records.** Suggested on r/RAG: the ${nCorrected} records the model questioned in the first run were corrected afterwards, but every run scores the frozen originals. Both runs; "with the record" counts the two record arms together.

${splitTable}
With the record in context, ${fromCorrected(recNamed)} of the ${recNamed.length} named-neighbour blends and ${fromCorrected(recOther)} of the ${recOther.length} any-subculture blends come from the ${nCorrected} records that were later corrected. The ${nUnchanged} unchanged records are not simply the easy ones: from memory they pick up a named neighbour's brand more often (${splitCell(["memory"], false, namedBlend)} against ${splitCell(["memory"], true, namedBlend)}). With the record in context, the blending that is left tracks the quality of the record.

Files: [\`answers-run2.md\`](answers-run2.md) (45 answers, verbatim), [\`judgements-run2.json\`](judgements-run2.json), [\`score-run2.mjs\`](score-run2.mjs).

`;
const readme = fs.readFileSync(dir + "README.md", "utf8").replace(/## Second run[\s\S]*?(?=## (Planted-error test|How it was scored))/, "");
if (!readme.includes("## How it was scored")) throw new Error("README.md has no 'How it was scored' section");
fs.writeFileSync(dir + "README.md", readme.replace("## How it was scored", section + "## How it was scored"));
