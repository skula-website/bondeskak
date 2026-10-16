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

## Ikke dækket (ærligt)
Barnets oplevelse (balance, om sværhedsgraderne føles rigtige), lyd på rigtig enhed, ydeevne på gamle iPads.
