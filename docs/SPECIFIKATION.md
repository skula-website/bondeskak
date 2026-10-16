# Bondeskak for børn – specifikation (bestilling #10/#20, 16. oktober 2026)

Mål: et farverigt, børnevenligt bondeskak i browseren med 10 sværhedsgrader og animerede kampe, hvor bønderne kæmper.

## Regler (låste valg)
- Bræt 8×8, hver spiller har 8 bønder: gul på række 6 (nederst, går op), lilla på række 1 (går ned). Felt = række·8 + kolonne. Gul (barnet) trækker først.
- Træk: ét felt ligeud, hvis feltet er tomt; to felter fra startrækken, hvis begge felter er tomme; slå ét felt på skrå fremad (kun mod modstanderens bonde). Ingen en passant. Ingen forvandling.
- Vinder: (1) første til at nå modstanderens bagerste række, (2) slår alle modstanderens bønder, (3) modstanderen kan ikke trække (blokeret). Uafgjort findes ikke (bønder går kun fremad, så spillet slutter altid).
- Dirigentens valg: den klassiske variant uden en passant, fordi børn kan forstå den.

## Sværhedsgrader 1–10 (`vaelgTraek(spil, niveau, rng)`)
1 = tilfældigt lovligt træk; 2–6 = søgning 1–3 lag med stadig sjældnere kiksere (tilfældige træk); 7–10 = ren alfa-beta (negamax) dybde 4–7. Ugyldigt niveau (ikke heltal 1–10) → RangeError. `tip(spil)` giver et godt træk.
Computerens tænketid højst ca. 1 s (målt: niveau 10 ca. 0,45 s første træk på minen).

## Brugerflade (site/)
HTML/CSS/SVG-bræt, farverigt (gule og lilla bønder med ansigter), stor tekst, store knapper. Sværhedsvælger med 10 stjerner. «Vis tip»-knap. Lovlige træk fremhæves, når en bonde vælges. Lyd (Web Audio, enkle toner) med slå-fra-knap. Respekterer `prefers-reduced-motion`.
Animation: almindeligt træk = bonden hopper hen. Slag = KAMP: bønderne løber mod hinanden, slår med små sværd (gnister, «POW»), den tabende snurrer rundt og forsvinder med stjerner. Sejr = konfetti og dansende vinder.

## Acceptkriterier (kørbare: `node docs/accept_check.mjs`)
- AK1 Regler: lovlige træk stemmer med en uafhængig, bevidst naiv referenceimplementering gennem 3000 tilfældige spil, træk for træk.
- AK2 Vinder: alle tre sejrsårsager opstår og udpeges korrekt.
- AK3 Ulovligt: ulovligt træk, spil slut og felt uden for 0–63 kaster fejl; spillet ændres aldrig (uforanderligt).
- AK4 Niveauer: alle 10 niveauer giver altid et lovligt træk; ugyldigt niveau (0, 11, 1.5, "3", null) kaster RangeError.
- AK5 Styrke: niveau 4 slår 1, 7 slår 4, 10 slår 7 (mindst 60 % af 20 partier, farverne byttes).
- AK6 Kampplan: `kampTrin(traek)` giver for et slag rækkefølgen løb → slag → fald, for et almindeligt træk kun hop.
- AK7 Site: `site/index.html` findes og indlæser `spil.js`; ingen eksterne adresser (alt lokalt).

## Tilvalg af brikker og fuldt skak (bestilling 17. oktober 2026, Michael)
Ønske: «efterhånden som barnet bliver bedre, kan man tilvælge nye brikker efter eget ønske; kun i begyndelsen af spillet; og en knap til fuldt spil. Udseende og animation skal matche og have egne animationer pr. brik.»

**Låste valg (dirigentens):**
- Før første træk vælges frit: tårne, heste, løbere, dronning, konge (knapper der kan slås til og fra), «Kun bønder» og «Fuldt skakspil». Hver valgt type stilles op for begge spillere på sin skakplads (tårne a/h, heste b/g, løbere c/f, dronning d, konge e). Valget huskes i browseren. Efter første træk er knapperne låst, til et nyt spil startes (også mens det første træk animeres).
- **Uden konge** gælder bondeskakkets mål for alle brikker: en *bonde* på bagerste række vinder (ingen forvandling), alle modstanderens brikker slået vinder, spærret modstander vinder; 50 træk uden slag eller bondetræk = uafgjort. Ingen en passant og ingen rokade.
- **Med konge** gælder de rigtige skakregler: man må ikke stå i skak efter sit træk, skakmat vinder, patt = uafgjort, rokade (hvis tårnene er med), en passant, forvandling (standard dronning; `udfoer(..., 'T'|'L'|'S')` kan vælge andet), 50-trækreglen og for lidt materiale (kun konger, eller konge + én hest/løber). Trefoldig gentagelse er ikke med (50-trækreglen sikrer, at et spil slutter).
- Computeren: samme 10 niveauer; med brikker tænker den 0–6 lag (niveau 1–10), ser slag til ende fra niveau 4 og har et tidsloft på 1,5 s pr. træk.
- Udseende: alle brikker tegnes i samme stil som bønderne (SVG-skabeloner i `site/index.html`, skrevet af `tools/tegn-brikker.py`): tårn med tinder og dør, hest med manke, løber med bispehue, dronning med juvelkrone, konge med kors og overskæg. Hver har sin egen bevægelse: bonde og konge hopper (kongen lavt og værdigt), tårnet glider tungt med rumlen og støv, løberen glider let med gnister, dronningen letter og flyver, hesten springer højt med galop. Kongen i skak ryster og får rødt felt. Rokade flytter tårnet samtidig. Forvandling sker med stjerner og klokker.

**Acceptkriterier (tilføjet):**
- AK8 Valg: rigtige pladser for hver kombination; ugyldigt valg → RangeError.
- AK9 Skakregler: perft-tal stemmer med kendte facit for startstillingen (d1–4), «kiwipete» (d1–3), position 3 (d1–4), 4 og 5 (d1–3).
- AK10 Slutninger med konger: skakmat (narremat), patt, for lidt materiale, 50-trækreglen, iSkak, forvandling.
- AK11 Bondeskak med brikker: kun en bonde vinder ved at nå over; sidste brik slået vinder; ingen en passant uden konger.
- AK12 Computeren med brikker: altid lovligt træk og under 2,5 s; niveau 7 slår 1 og niveau 10 slår 4 (mindst 4 af 6).
- AK13 Bevægelser og tegninger: hver brik har sin stil; længere vej tager længere tid; tegning findes for alle 12 brikker.

## Ikke dækket (ærligt)
Barnets oplevelse (balance, om sværhedsgraderne føles rigtige), lyd på rigtig enhed, ydeevne på gamle iPads.
