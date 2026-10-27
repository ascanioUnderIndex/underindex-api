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

**The WARNING made no measurable difference.** Without it the answers stayed inside the style as well as with it. The remaining blends were Nike for Ura-Hara (Harajuku 90s); Converse for Indie Sleaze; Fred Perry and Lacoste for Terrace Casuals, all brands those scenes actually wore. With the WARNING they were Adidas (vintage) and Vans for Ura-Hara (Harajuku 90s); Adidas (vintage) for Health Goth; Dr. Martens and Converse for Indie Sleaze; Dr. Martens for Whimsigoth; Clarks for City Boy. On this run the effect comes from the record's brands, years and shops, not from the warning text. On one run a difference of one or two answers is noise; the second run below repeats all three arms.

Files: [`answers-nowarning.md`](answers-nowarning.md) (15 answers, verbatim), [`judgements-nowarning.json`](judgements-nowarning.json), [`score-nowarning.mjs`](score-nowarning.mjs).

## Second run

All three arms again, 45 new incognito chats on 2026-10-22 with the same prompts and the same frozen `records.json`, to see how much of the result is run-to-run noise.

| Metric | Run | From memory | Record with WARNING | Record without WARNING |
|:---|:---:|:---:|:---:|:---:|
| Record's key brands named | 1 | 41/58 (71%) | 57/58 (98%) | 58/58 (100%) |
|  | 2 | 39/58 (67%) | 56/58 (97%) | 57/58 (98%) |
|  | both | 80/116 (69%) | 113/116 (97%) | 115/116 (99%) |
| Years match the record (within 2 years) | 1 | 13/15 (87%) | 15/15 (100%) | 15/15 (100%) |
|  | 2 | 14/15 (93%) | 15/15 (100%) | 15/15 (100%) |
|  | both | 27/30 (90%) | 30/30 (100%) | 30/30 (100%) |
| Recommends a brand of a subculture the WARNING names | 1 | 8/15 (53%) | 1/15 (7%) | 1/15 (7%) |
|  | 2 | 9/15 (60%) | 1/15 (7%) | 1/15 (7%) |
|  | both | 17/30 (57%) | 2/30 (7%) | 2/30 (7%) |
| Recommends a brand of any other subculture in the dataset | 1 | 11/15 (73%) | 4/15 (27%) | 3/15 (20%) |
|  | 2 | 9/15 (60%) | 3/15 (20%) | 4/15 (27%) |
|  | both | 20/30 (67%) | 7/30 (23%) | 7/30 (23%) |

Across both runs the record cuts named-neighbour blends from 17/30 (57%) to 2/30 (7%) with the WARNING and 2/30 (7%) without it, and blends from any other subculture from 20/30 (67%) to 7/30 (23%) and 7/30 (23%). The second run reproduces the first: the record does the work, and the WARNING adds nothing measurable.

**Split by the corrected records.** Suggested on r/RAG: the 9 records the model questioned in the first run were corrected afterwards, but every run scores the frozen originals. Both runs; "with the record" counts the two record arms together.

| Records | Named neighbour, from memory | Named neighbour, with the record | Any other subculture, from memory | Any other subculture, with the record |
|:---|:---:|:---:|:---:|:---:|
| 9 later corrected | 7/18 | 4/36 | 14/18 | 11/36 |
| 6 unchanged | 10/12 | 0/24 | 6/12 | 3/24 |

With the record in context, 4 of the 4 named-neighbour blends and 11 of the 14 any-subculture blends come from the 9 records that were later corrected. The 6 unchanged records are not simply the easy ones: from memory they pick up a named neighbour's brand more often (10/12 against 7/18). With the record in context, the blending that is left tracks the quality of the record.

Files: [`answers-run2.md`](answers-run2.md) (45 answers, verbatim), [`judgements-run2.json`](judgements-run2.json), [`score-run2.mjs`](score-run2.mjs).

## Planted-error test

Suggested after the r/RAG thread: the model questioned 9 of the 15 records in the first run, which counts what it caught but not what it missed. Each record from `records.json`, without its `Notes`, was given two known errors: `Years` shifted 10 years earlier, and one brand from a neighbouring subculture inserted into `KeyBrands` (both listed in `planted-records.json`). Same outfit question, 15 new incognito chats, 2026-10-22. An error counts as caught only when the answer says the value is wrong or doesn't belong.

| Planted error | Called out |
|:---|:---:|
| Years shifted 10 years earlier | 13/15 (87%) |
| Brand from a neighbouring subculture | 10/15 (67%) |
| Both error types | 23/30 (77%) |
| Planted brand still recommended in the outfit | 4/15 (27%) |

| # | Subculture | Planted years | Caught | Planted brand | Caught | Still recommended |
|---|---|---|---|---|---|---|
| 1 | Goth Ninja | 1999 - 2004 (was 2009 - 2014) | yes | ACRONYM (techwear) | **no** | **yes** |
| 2 | Acubi Style | 2011 - Present (was 2021 - Present) | yes | Juicy Couture (y2k) | yes | no |
| 3 | Opium | 2009 - Present (was 2019 - Present) | yes | Anti Social Social Club (hypebeast-streetwear) | yes | no |
| 4 | Ura-Hara (Harajuku 90s) | Mid 80s - Early 90s (was Mid 90s - Early 00s) | yes | Yeezy (hypebeast-streetwear) | yes | no |
| 5 | Health Goth | 2003 - 2007 (was 2013 - 2017) | yes | ACRONYM (techwear) | **no** | **yes** |
| 6 | Mall Goth | 1989 - 1996 (was 1999 - 2006) | yes | Atticus (emo) | yes | no |
| 7 | Indie Sleaze | 1998 - 2002 (was 2008 - 2012) | yes | Kate Spade (twee) | yes | no |
| 8 | Blokecore | 2012 - Present (was 2022 - Present) | yes | Trapstar (uk-roadman) | yes | no |
| 9 | Quiet Luxury | 2012 - Present (was 2022 - Present) | **no** | Ralph Lauren (old-money) | **no** | **yes** |
| 10 | Whimsigoth | 1980 - 1988 (was 1990 - 1998) | yes | Heaven by Marc Jacobs (fairy-grunge) | **no** | **yes** |
| 11 | City Boy | 2002 - Present (was 2012 - Present) | yes | Iron Heart (amekaji) | yes | no |
| 12 | Frutiger Aero Fashion | 1994 - 2003 (was 2004 - 2013) | yes | JNCO (cyber-y2k) | yes | no |
| 13 | Terrace Casuals | Late 60s - Early 80s (was Late 70s - Early 90s) | yes | Umbro (blokecore) | **no** | no |
| 14 | Amekaji | Late 70s - Present (was Late 80s - Present) | **no** | Nautica JP (city-boy) | yes | no |
| 15 | Gyaru | 1985 - 2004 (was 1995 - 2014) | yes | Baby, the Stars Shine Bright (lolita) | yes | no |

**As a reviewer of its own source, the model catches most errors but not the dangerous ones.** It caught the clearly wrong dates and the brands from obviously different scenes, usually citing the record's own clues (artists or games that postdate the planted years). The brands it missed were ACRONYM in Goth Ninja, ACRONYM in Health Goth, Ralph Lauren in Quiet Luxury, Heaven by Marc Jacobs in Whimsigoth, Umbro in Terrace Casuals: the close neighbours, the same kind of blending the dataset exists to prevent. In 4 of 15 answers the planted brand went straight into the outfit. The two missed dates, Quiet Luxury (2012 - Present) and Amekaji (Late 70s - Present), are the shifts that stay plausible because the style has older roots, so they are weaker planted errors than the other thirteen.

**Detection against the recommendation.** Suggested on r/RAG: the two counts above do not show how they overlap.

| Planted brand | Recommended | Left out |
|:---|:---:|:---:|
| Called out | 0 | 10 |
| Not called out | 4 | 1 |

When the model called the planted brand out, it always left it out of the outfit; every planted brand it recommended was one it had not called out. The only brand dropped without comment was Umbro in Terrace Casuals. Two of the recommended ones are borderline: in Whimsigoth the answer calls Heaven by Marc Jacobs "revival, not period" and still uses it, and in Quiet Luxury it warns about the Ralph Lauren logo but keeps a Purple Label belt. Neither says the brand does not belong, so both count as not called out; under a looser rule they would be called out and still recommended.

Files: [`answers-planted.md`](answers-planted.md) (15 answers, verbatim), [`planted-records.json`](planted-records.json), [`judgements-planted.json`](judgements-planted.json), [`score-planted.mjs`](score-planted.mjs). Run `node eval/score.mjs && node eval/score-nowarning.mjs && node eval/score-run2.mjs && node eval/score-planted.mjs` to rebuild this page.

## How it was scored

- **Brands and shops**: `score.mjs` checks which of the record's `KeyBrands` and `WhereToBuy` entries appear in the answer (case-insensitive, with a few aliases such as BAPE for A Bathing Ape).
- **Neighbour brands**: the script lists brands that the dataset assigns to the subcultures named in the record's warning (for example Techwear for Goth Ninja) and that the record itself does not use. Each hit was read in context and counted only when the answer recommends it, not when it mentions it as history or to rule it out (`judgements.json`).
- **Years**: judged by hand from each answer's stated core window (`judgements.json`).
- Budgets are not scored: answers give several tiers in different currencies, so there was no fair single number.

## Limits

- Matching the record is not the same as being right. The record is the reference here, and the section above shows it had weak points.
- With the record pasted in, the model mostly repeats it, so the brand and shop rows partly measure that. The neighbour-brand and years rows are the informative ones.
- A neighbour brand is not always wrong: Fred Perry was worn by terrace casuals, and Dr. Martens are common across goth styles. The metric follows the dataset's own boundaries.
- Two runs per arm (see Second run), one model, 15 subcultures. Answers vary between runs.
- The record was pasted into the prompt, so this measures what the model does with the data, not how an agent fetches it over x402.

Files: [`answers/`](answers/) (all 30 answers, verbatim), [`questions.json`](questions.json), [`records.json`](records.json) (the records as they were during the run), [`judgements.json`](judgements.json), [`score.mjs`](score.mjs).
