# Leveringsrapport: Bondeskak for børn (bestilling #20, 16. oktober 2026)

## Sådan ser du resultatet
Åbn **http://100.122.133.31:8088/vis/bondeskak/** (hjemme også http://mini.local:8088/vis/bondeskak/), eller tryk «Åbn resultatet» på kortet i Overblik. Virker på iPhonen med Tailscale tændt. Afprøvet 16. oktober kl. 23.10: siden åbner, et træk virker, og computeren svarer uden fejl i konsollen.

## Leveret
- `src/regler.js` (regler, uforanderlig), `src/ai.js` (10 niveauer), `src/kamp.js` (kampplan, tekster), `site/` (index.html, stil.css, spil.js).
- `docs/SPECIFIKATION.md`, `docs/accept_check.mjs` (uafhængigt facit), tests i `tests/` (18 tests).
- Skrevet af dirigenten selv, ikke af de lokale arbejdere (som i Bomb Jack). `src/regler.js` og `src/ai.js` var udkast fundet i mappen fra en tidligere kørsel; de er gennemgået, rettet mod specifikationen og testet.

## Bevist (kørt 16. oktober på minen)
- `node docs/accept_check.mjs`: AK1–AK7 bestået (3000 tilfældige spil mod naiv reference; alle sejrsårsager; uforanderlighed; alle 10 niveauer lovlige; styrke: niveau 4 slår 1 med 19/20, 7 slår 4 med 20/20, 10 slår 7 med 9/10).
- `node --test tests/`: 18 af 18 bestået. Dækning: linjer 98 %+ i src/, spil.js 95 %.
- Computerens tid: niveau 10 ca. 0,45 s første træk (målt med `docs/tid.mjs`).

## Porte og browser (16. oktober, aften)
- Alle 12 porte bestået (`logs/porte/20261016-230723/rapport.md`): bygning, typekontrol (tsc med checkJs), lint (eslint), 18 tests, dækning, sikkerhed (semgrep p/javascript + egne regler, osv-scanner, gitleaks), acceptprøve (`node docs/accept_check.mjs`), visuel kontrol (390 og 1280 px), tilgængelighed (axe-core) og visuel vurdering.
- Rettet undervejs: porte.json manglede JS-opsætning (portene kørte Pythons værktøjer), brættet var markeret som ARIA-gitter uden rækker (nu en knapgruppe), to typefejl i site/spil.js.
- Committet på minen (`~/git/bondeskak.git`).

## Ikke bevist
- Kontrollant (lokal model) er ikke kørt. Børnetest og balance ud over selvspil er ikke målt.

## Næste skridt
Din prøve. Er du tilfreds, så tryk «Godkend – færdig» på kortet i Overblik; så flyttes Bondeskak til Lenovo-disken, når iMac'en er tændt.
