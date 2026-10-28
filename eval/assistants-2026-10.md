# AI shopping assistants and niche fashion aesthetics: a small test

*28 October 2026. Ascanio, [UnderIndex](https://underindex-api.onrender.com).*

Shoppers increasingly ask for a look, not a product: "something Amekaji", "a Goth Ninja outfit", "Quiet Luxury on a budget". To answer, an assistant first has to know which brands and pieces belong to that style, and which belong to the style next door. I wanted to see how often that step goes wrong, so I asked three public assistants about the same 8 aesthetics. Every test was done signed out, in a fresh chat each time.

## Daydream (fashion shopping agent)

Request: "Build me a {Name} outfit". The Mens tab was used for menswear styles and Womens for Goth Ninja and Acubi. I counted the brand of every product returned and compared it with the key brands of the UnderIndex record for that style.

| Aesthetic | Key brands in the record | Record brands among the products | Brands shown most |
|:---|:---|:---:|:---|
| Goth Ninja | Rick Owens, Julius, Damir Doma, 11 by BBS | 7 of 112 | GANNI 32, Vivienne Westwood 21, IRO 9, AllSaints 8 |
| Amekaji | The Real McCoy's, Kapital, Studio D'Artisan, Iron Heart, Buzz Rickson's | 0 of 92 | A.P.C. 18, Officine Creative 18, BEAMS PLUS 12, Madewell 11 |
| City Boy | Nanamica, Beams Plus, AURALEE, Comoli, Nautica JP | 1 of 92 | J.Crew 17, Ralph Lauren 14, ETRO 10, Polo Ralph Lauren 8 |
| Quiet Luxury | Loro Piana, Brunello Cucinelli, The Row, Zegna | 0 of 105 | A.P.C. 46, Rag & Bone 34, lululemon 8 |
| 90s Ura-Hara | A Bathing Ape, Undercover, WTAPS, Goodenough, Neighborhood | 0 of 112 | ETRO 17, Barbour 14, J.Crew 10, PUMA 9 |
| Blokecore | Adidas (vintage), Umbro, Kappa, Stone Island | 12 of 72 (adidas) | Nike 13, adidas 12, Supreme 11, Ralph Lauren 9 |
| Acubi | Hyein Seo, Thug Club, Acubi Club | 0 of 112 | Courrèges 22, Acne Studios 19, Madewell 13 |
| Opium | Rick Owens, Balenciaga, Alyx, Givenchy | n/a | refused twice |

The catalog does have the right brands. Asked for them by name, Daydream returned Brunello Cucinelli (11 products), KAPITAL (10) and Undercover (2). The failing step is the one from aesthetic to brand. "Build me an Opium outfit" got the reply "I'm unable to offer opinions or advice on your questions", most likely a drug filter, although Opium is the aesthetic of Playboi Carti's label.

## Encore (AI search for secondhand)

Same short request, three aesthetics.

- **Goth Ninja** came back as Techwear: techwear hoodie, tapered cargos, combat boots, balaclava, utility bag ("keeps the techwear vibe cohesive"). The defining pieces are missing: long draped layers, drop-crotch trousers, Rick Owens Geobaskets.
- **Amekaji** got a reasonable description (work jacket, selvedge jeans, moc-toe boots) with no brands.
- **90s Ura-Hara** got generic 90s streetwear (graphic tee, baggy cargos, chunky sneakers) with no brands, followed by an offer to make it "more specifically Ura-Hara".

On resale sites the brand is the search key, so an answer with no brands can't turn into a good secondhand search.

## ChatGPT (signed out)

Longer prompt, the one used in the [UnderIndex eval](README.md): "Build me a {Name} outfit. Name specific brands, the key pieces, where to buy them, a realistic budget, and say which years this aesthetic belongs to."

| Aesthetic | Record brands named | Brands from a neighbouring style, recommended |
|:---|:---:|:---|
| Goth Ninja | 3 of 4 (Rick Owens, Julius, Damir Doma) | ACRONYM, Riot Division, Nike ACG, Y-3 (Techwear) |
| Amekaji | 1 of 5 (Buzz Rickson's) | Red Wing, Levi's Vintage Clothing (heritage workwear) |
| City Boy | 0 of 5 (BEAMS appears only among "brands to explore") | Ralph Lauren, listed for "classic Ivy staples"; the outfit itself is Uniqlo, New Balance, Patagonia, L.L.Bean |
| Quiet Luxury | 1 of 4 (Loro Piana, as an upgrade) | Massimo Dutti trousers; the outfit itself is COS, Uniqlo, Furla |
| 90s Ura-Hara | 5 of 5 | none |
| Blokecore | 2 of 4 (Adidas, Umbro) | none |
| Acubi | 1 of 3 (Acubi Club) | none; the outfit itself is Bershka, Pull&Bear, H&M |
| Opium | 1 of 4 (Rick Owens) | none; the outfit itself is Represent, Diesel, AllSaints |

ChatGPT knows the scenes with a well-documented history best: Ura-Hara is perfect. On the others it drifts in two ways: towards the neighbouring scene (Goth Ninja built on Techwear, Red Wing in Amekaji) and towards high-street chains. The second drift is partly caused by the "realistic budget" in the prompt.

Perplexity allowed one signed-out question and then asked me to sign up, so it isn't in the comparison.

## The pattern

When an assistant doesn't know a style well, it fills the gap with the neighbouring one. Goth Ninja turns into Techwear, City Boy into Ivy, Amekaji into American workwear, Quiet Luxury into high-street minimalism.

That's the step UnderIndex covers: verified records on 60 fashion subcultures, each with years, key brands, iconic items, where to buy (new and resale) and the neighbouring style it must not be confused with. In the [public eval](README.md) with Claude (90 chats, two runs), answers that mixed in a neighbouring style's brands dropped from 17 of 30 to 2 of 30 with the record in context. A second test planted errors in the records: the model caught most obvious ones but passed plausible wrong brands straight to the shopper in 4 of 15 answers, so the data has to be right at the source.

## Limits

- One run per assistant per aesthetic, signed out, on one day. Results may differ with a profile or follow-up messages.
- Scored against my own records. Matching a record is not the same as being right.
- Daydream returns products from its retail catalog, so its counts mix the agent's understanding with what's in stock. The by-name checks above suggest the catalog isn't the main limit.
- ChatGPT's answers were counted by brand name and then read in context. "Record brands named" counts any mention, history included (Julius and Damir Doma appear only in the timeline). In the neighbouring-style column, a brand counts only when it is recommended for the outfit.
