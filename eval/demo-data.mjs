// Data for the /demo page (server.js serves it as /demo-data.json): the 30 run-1 answers (answers/) with,
// for each one, which of the record's KeyBrands it names and which neighbour-subculture brands it names,
// labelled by hand in judgements.json. Matching is the same as score.mjs, so the page shows the numbers in README.md.
// Run: node eval/demo-data.mjs        (prints the totals to check against README.md)
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const dir = new URL(".", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(dir + "records.json"));
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const J = JSON.parse(fs.readFileSync(dir + "judgements.json"));

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
// The answer text sits in a ~~~text fence under its heading
const body = (md) => md.match(/~~~text\n([\s\S]*?)\n~~~/)[1].trim();

export function demoData() {
  const out = [];
  for (const q of Q) {
    const rec = R[q.slug];
    const ownBrands = new Set(rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES)));
    const ownShops = new Set(rec.WhereToBuy.flatMap((s) => aliases(s, SHOP_ALIASES)));
    const style = {};
    for (const n of q.neighbours) for (const b of R[n].KeyBrands) style[b] ??= R[n].Name;
    const neighbourBrands = Object.keys(style).filter(
      (b) => !aliases(b, BRAND_ALIASES).some((a) => ownBrands.has(a) || ownShops.has(a)),
    );
    const arms = {};
    for (const arm of ["memory", "grounded"]) {
      const md = answers[`${q.slug}/${arm}`];
      if (!md) throw new Error(`missing answer ${q.slug}/${arm}`);
      const text = norm(md);
      const labels = J.neighbour[`${q.slug}/${arm}`] ?? {};
      const found = named(text, neighbourBrands, BRAND_ALIASES);
      for (const b of found) if (!labels[b]) throw new Error(`judge neighbour brand ${b} in ${q.slug}/${arm}`);
      const [said, ok] = J.years[q.slug][arm];
      arms[arm] = {
        text: body(md),
        own: named(text, rec.KeyBrands, BRAND_ALIASES),
        neighbour: found.map((b) => ({
          brand: b,
          style: style[b],
          recommended: labels[b].startsWith("recommended"),
          note: labels[b].replace(/^\w+( to exclude it)? \(|\)$/g, ""),
        })),
        years: { said, ok },
      };
    }
    out.push({
      slug: q.slug,
      name: q.name,
      prompt: q.prompt,
      neighbours: q.neighbours.map((n) => R[n].Name),
      record: {
        Years: rec.Years, KeyBrands: rec.KeyBrands, IconicItems: rec.IconicItems,
        WhereToBuy: rec.WhereToBuy, PriceRange: rec.PriceRange, Notes: rec.Notes,
      },
      // Every spelling the page should highlight, longest first so "Rick Owens DRKSHDW" style overlaps resolve
      highlight: [
        ...rec.KeyBrands.flatMap((b) => aliases(b, BRAND_ALIASES).map((a) => ({ a, kind: "own", brand: b }))),
        ...neighbourBrands.flatMap((b) => aliases(b, BRAND_ALIASES).map((a) => ({ a, kind: "neighbour", brand: b, style: style[b] }))),
      ].sort((x, y) => y.a.length - x.a.length),
      arms,
    });
  }

  const version = Object.values(R)[0].dataset_version;
  return { run: "2026-10-14", model: "Claude Opus 5.5 on claude.ai", dataset_version: version, subcultures: out };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { subcultures } = demoData();
  const blend = (arm) => subcultures.filter((s) => s.arms[arm].neighbour.some((n) => n.recommended)).length;
  console.log(`${subcultures.length} subcultures; neighbour brand recommended: memory ${blend("memory")}, grounded ${blend("grounded")}`);
}
