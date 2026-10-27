// Planted-error test, suggested by Future AGI after the r/RAG thread: the model questioned 9 of the 15 records in
// run 1, which counts its hits but not what it misses. Each record (records.json, without Notes) got two known
// errors: Years shifted 10 years earlier, and one brand from a neighbouring subculture inserted in KeyBrands
// (planted-records.json). Same outfit question, 15 incognito chats on 2026-10-22, answers in answers-planted.md.
// Hand labels in judgements-planted.json: was each planted error called out, and was the planted brand still used?
// Run: node eval/score-planted.mjs
import fs from "node:fs";

const dir = new URL(".", import.meta.url).pathname;
const Q = JSON.parse(fs.readFileSync(dir + "questions.json"));
const P = JSON.parse(fs.readFileSync(dir + "planted-records.json"));
const JP = JSON.parse(fs.readFileSync(dir + "judgements-planted.json"));

const rows = Q.map((q) => {
  const p = P.find((x) => x.slug === q.slug);
  const j = JP[q.slug];
  if (!p || !j) throw new Error(`missing planted record or judgement for ${q.slug}`);
  return { q, p, j, year: j.year[0] === "caught", brand: j.brand[0] === "caught", recommended: j.recommended };
});
const count = (f) => rows.filter(f).length;
const pct = (n, d) => `${n}/${d} (${Math.round((100 * n) / d)}%)`;
const years = count((r) => r.year), brands = count((r) => r.brand), used = count((r) => r.recommended);

const summary = `| Planted error | Called out |
|:---|:---:|
| Years shifted 10 years earlier | ${pct(years, rows.length)} |
| Brand from a neighbouring subculture | ${pct(brands, rows.length)} |
| Both error types | ${pct(years + brands, rows.length * 2)} |
| Planted brand still recommended in the outfit | ${pct(used, rows.length)} |`;
let detail = "| # | Subculture | Planted years | Caught | Planted brand | Caught | Still recommended |\n|---|---|---|---|---|---|---|\n";
for (const r of rows)
  detail += `| ${r.q.id} | ${r.q.name} | ${r.p.errors.years.planted} (was ${r.p.errors.years.true}) | ${r.year ? "yes" : "**no**"} | ${r.p.errors.brand.planted} (${r.p.errors.brand.from}) | ${r.brand ? "yes" : "**no**"} | ${r.recommended ? "**yes**" : "no"} |\n`;
console.log(summary + "\n\n" + detail);

// Suggested on r/RAG: does detecting the planted brand change the recommendation? Cross the two labels
const cross = `| Planted brand | Recommended | Left out |
|:---|:---:|:---:|
| Called out | ${count((r) => r.brand && r.recommended)} | ${count((r) => r.brand && !r.recommended)} |
| Not called out | ${count((r) => !r.brand && r.recommended)} | ${count((r) => !r.brand && !r.recommended)} |`;
const silent = rows.filter((r) => !r.brand && !r.recommended).map((r) => `${r.p.errors.brand.planted} in ${r.q.name}`).join(", ");
console.log(cross);

const missed = rows.filter((r) => !r.brand).map((r) => `${r.p.errors.brand.planted} in ${r.q.name}`).join(", ");
const missedYears = rows.filter((r) => !r.year).map((r) => `${r.q.name} (${r.p.errors.years.planted})`).join(" and ");
const section = `## Planted-error test

Suggested after the r/RAG thread: the model questioned 9 of the 15 records in the first run, which counts what it caught but not what it missed. Each record from \`records.json\`, without its \`Notes\`, was given two known errors: \`Years\` shifted 10 years earlier, and one brand from a neighbouring subculture inserted into \`KeyBrands\` (both listed in \`planted-records.json\`). Same outfit question, 15 new incognito chats, 2026-10-22. An error counts as caught only when the answer says the value is wrong or doesn't belong.

${summary}

${detail}
**As a reviewer of its own source, the model catches most errors but not the dangerous ones.** It caught the clearly wrong dates and the brands from obviously different scenes, usually citing the record's own clues (artists or games that postdate the planted years). The brands it missed were ${missed}: the close neighbours, the same kind of blending the dataset exists to prevent. In ${used} of 15 answers the planted brand went straight into the outfit. The two missed dates, ${missedYears}, are the shifts that stay plausible because the style has older roots, so they are weaker planted errors than the other thirteen.

**Detection against the recommendation.** Suggested on r/RAG: the two counts above do not show how they overlap.

${cross}

When the model called the planted brand out, it always left it out of the outfit; every planted brand it recommended was one it had not called out. The only brand dropped without comment was ${silent}. Two of the recommended ones are borderline: in Whimsigoth the answer calls Heaven by Marc Jacobs "revival, not period" and still uses it, and in Quiet Luxury it warns about the Ralph Lauren logo but keeps a Purple Label belt. Neither says the brand does not belong, so both count as not called out; under a looser rule they would be called out and still recommended.

Files: [\`answers-planted.md\`](answers-planted.md) (15 answers, verbatim), [\`planted-records.json\`](planted-records.json), [\`judgements-planted.json\`](judgements-planted.json), [\`score-planted.mjs\`](score-planted.mjs). Run \`node eval/score.mjs && node eval/score-nowarning.mjs && node eval/score-run2.mjs && node eval/score-planted.mjs\` to rebuild this page.

`;
const readme = fs.readFileSync(dir + "README.md", "utf8").replace(/## Planted-error test[\s\S]*?(?=## How it was scored)/, "");
if (!readme.includes("## How it was scored")) throw new Error("README.md has no 'How it was scored' section");
fs.writeFileSync(dir + "README.md", readme.replace("## How it was scored", section + "## How it was scored"));
