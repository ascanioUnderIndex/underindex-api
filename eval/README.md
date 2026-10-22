# Evaluation: 15 subcultures, from memory vs. with the record

Same model, same question, two fresh chats per subculture: one answering from memory, one with the UnderIndex record pasted above the question. Claude Opus 5.5 on claude.ai, incognito chats, 2026-10-14, dataset version `841d6e4b0e34`.

Prompt, from memory:

> Build me a {Name} outfit. Name specific brands, the key pieces, where to buy them, a realistic budget, and say which years this aesthetic belongs to. Answer from your own knowledge; do not search the web.

Prompt, with the record: `Reference record from the UnderIndex dataset: {record JSON without dataset_version} --- ` followed by the same text.

## Totals

| | From memory | With the record |
|---|---|---|
| Record's key brands named | 41/58 (71%) | 57/58 (98%) |
| Record's shops named | 30/42 (71%) | 42/42 (100%) |
| Years match the record (within 2 years) | 13/15 (87%) | 15/15 (100%) |
| Answers recommending a brand the dataset files under a neighbouring subculture | 8/15 (53%) | 1/15 (7%) |

## Per subculture

| # | Subculture | Key brands named (memory → record) | Years from memory (record) | Neighbour brands recommended from memory |
|---|---|---|---|---|
| 1 | Goth Ninja | 2/4 → 4/4 | **2012–2015, peaking 2013–2014** (2009 - 2014) | Y-3 |
| 2 | Acubi Style | 0/2 → 2/2 | emerged around 2022, peaked 2023–2024 (2021 - Present) | none |
| 3 | Opium | 2/4 → 4/4 | label formed around 2019, peak 2021–2024 (2019 - Present) | none |
| 4 | Ura-Hara (Harajuku 90s) | 3/4 → 4/4 | 1993–2003 (Mid 90s - Early 00s) | none |
| 5 | Health Goth | 3/4 → 3/4 | 2013–2016 (2013 - 2017) | Nike ACG |
| 6 | Mall Goth | 4/4 → 4/4 | 1997 to 2006 (1999 - 2006) | Dr. Martens |
| 7 | Indie Sleaze | 3/3 → 3/3 | 2006–2012 (2008 - 2012) | none |
| 8 | Blokecore | 4/4 → 4/4 | emerged 2021–2022, peaked 2022–2023 (2022 - Present) | C.P. Company |
| 9 | Quiet Luxury | 3/4 → 4/4 | peaked in 2023, strong through 2024 (2022 - Present) | Massimo Dutti |
| 10 | Whimsigoth | 2/3 → 3/3 | **1994 to 2002** (1990 - 1998) | Dr. Martens |
| 11 | City Boy | 4/5 → 5/5 | 2012 onward (2012 - Present) | none |
| 12 | Frutiger Aero Fashion | 1/3 → 3/3 | 2004–2013 (2004 - 2013) | none |
| 13 | Terrace Casuals | 5/5 → 5/5 | 1977–78 onward, peak 1981–1985, changed by 1988–89 (Late 70s - Early 90s) | Fred Perry |
| 14 | Amekaji | 2/5 → 5/5 | full street style from the late 1980s–90s, still current (Late 80s - Present) | Red Wing |
| 15 | Gyaru | 3/4 → 4/4 | early-to-mid 1990s to early 2010s (egg ended 2014) (1995 - 2014) | none |

## Where the model disagreed with the record

With the record in front of it, the model questioned 9 of the 15 records:

- **Acubi Style**: Name comes from the Korean label Acubi Club, missing from KeyBrands. $100–400 only works without Hyein Seo / Thug Club, which are luxury-priced.
- **Opium**: $800–3,500 only works secondhand or without a Rick Owens leather jacket.
- **Ura-Hara (Harajuku 90s)**: Years says mid 90s but Notes says strictly late 90s; scene started in 1993 (Nowhere, BAPE). Goodenough / Neighborhood more central than Number (N)ine. Shenmue unrelated to the fashion.
- **Health Goth**: Started on a Portland Facebook page around 2012-2013, not Tumblr. Vaporwave was a neighbouring scene, not core music.
- **Indie Sleaze**: Look was forming from the mid-2000s. The RealReal is a weak fit for this look.
- **Whimsigoth**: American McGee's Alice (2000) is outside 1990-1998.
- **Frutiger Aero Fashion**: Oakley Software and Prada Linea Rossa peaked before 2004. Mirror's Edge is dystopian, against the record's own rule. Coldplay is a loose fit.
- **Terrace Casuals**: The Jam is a Mod-revival band.
- **Gyaru**: Liz Lisa and MA*RS are Hime Gyaru / Agejo brands and clash with the tanned Alba Rosa look; KeyBrands mixes substyles.

**What changed afterwards.** Each point was checked against web sources and the 9 records were corrected in dataset version `9ab6258f9c51` (2026-10-14): Acubi Style adds Acubi Club and moves to $150 - $800; Opium moves to $800 - $5000; Ura-Hara starts in 1993, replaces Number (N)ine with Goodenough and Neighborhood, drops Shenmue and moves to $400 - $2000; Health Goth credits the 2013 Portland Facebook page and drops Vaporwave; Indie Sleaze starts in 2006 and swaps The RealReal for eBay; Whimsigoth drops American McGee’s Alice; Frutiger Aero swaps Mirror’s Edge for Wii Sports; Terrace Casuals swaps The Jam for The Farm; Gyaru labels Liz Lisa as Hime Gyaru and MA*RS as Agejo. The brand-timing note on Oakley and Prada Linea Rossa was left as is. The scores above are for the records as they were during the run (`records.json`).

## Third arm: the record without its WARNING

Asked on r/RAG: is it the record that keeps the model inside the style, or the `WARNING` in its `Notes`? Every `Notes` field in the run held only the WARNING, so the third arm sends the same `records.json` record with `Notes` removed and the same question. 15 new incognito chats, Claude Opus 5.5 on claude.ai, 2026-10-22.

| | From memory | Record with WARNING | Record without WARNING |
|:---|:---:|:---:|:---:|
| Record's key brands named | 41/58 (71%) | 57/58 (98%) | 58/58 (100%) |
| Record's shops named | 30/42 (71%) | 42/42 (100%) | 42/42 (100%) |
| Years match the record (within 2 years) | 13/15 (87%) | 15/15 (100%) | 15/15 (100%) |
| Recommends a brand of a subculture the WARNING names | 8/15 (53%), 8 brands | 1/15 (7%), 1 brand | 1/15 (7%), 1 brand |
| Recommends a brand of any other subculture in the dataset | 11/15 (73%), 18 brands | 4/15 (27%), 6 brands | 3/15 (20%), 3 brands |

"A subculture the WARNING names" is the original neighbour metric. "Any other subculture" is the re-score suggested on r/RAG: brands of every other record in `records.json`, read in context the same way.

**The WARNING made no measurable difference.** Without it the answers stayed inside the style as well as with it. The remaining blends were Nike for Ura-Hara (Harajuku 90s); Converse for Indie Sleaze; Fred Perry and Lacoste for Terrace Casuals, all brands those scenes actually wore. With the WARNING they were Adidas (vintage) and Vans for Ura-Hara (Harajuku 90s); Adidas (vintage) for Health Goth; Dr. Martens and Converse for Indie Sleaze; Dr. Martens for Whimsigoth; Clarks for City Boy. On this run the effect comes from the record's brands, years and shops, not from the warning text. With one run per arm, a difference of one or two answers is noise.

Files: [`answers-nowarning.md`](answers-nowarning.md) (15 answers, verbatim), [`judgements-nowarning.json`](judgements-nowarning.json), [`score-nowarning.mjs`](score-nowarning.mjs). Run `node eval/score.mjs && node eval/score-nowarning.mjs` to rebuild this page.

## How it was scored

- **Brands and shops**: `score.mjs` checks which of the record's `KeyBrands` and `WhereToBuy` entries appear in the answer (case-insensitive, with a few aliases such as BAPE for A Bathing Ape).
- **Neighbour brands**: the script lists brands that the dataset assigns to the subcultures named in the record's warning (for example Techwear for Goth Ninja) and that the record itself does not use. Each hit was read in context and counted only when the answer recommends it, not when it mentions it as history or to rule it out (`judgements.json`).
- **Years**: judged by hand from each answer's stated core window (`judgements.json`).
- Budgets are not scored: answers give several tiers in different currencies, so there was no fair single number.

## Limits

- Matching the record is not the same as being right. The record is the reference here, and the section above shows it had weak points.
- With the record pasted in, the model mostly repeats it, so the brand and shop rows partly measure that. The neighbour-brand and years rows are the informative ones.
- A neighbour brand is not always wrong: Fred Perry was worn by terrace casuals, and Dr. Martens are common across goth styles. The metric follows the dataset's own boundaries.
- One run per arm, one model, 15 subcultures. Answers vary between runs.
- The record was pasted into the prompt, so this measures what the model does with the data, not how an agent fetches it over x402.

Files: [`answers/`](answers/) (all 30 answers, verbatim), [`questions.json`](questions.json), [`records.json`](records.json) (the records as they were during the run), [`judgements.json`](judgements.json), [`score.mjs`](score.mjs).
