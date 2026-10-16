# Leveringsrapport: Bondeskak for børn (bestilling #20, 16. oktober 2026)

## Leveret
- `src/regler.js` (regler, uforanderlig), `src/ai.js` (10 niveauer), `src/kamp.js` (kampplan, tekster), `site/` (index.html, stil.css, spil.js).
- `docs/SPECIFIKATION.md`, `docs/accept_check.mjs` (uafhængigt facit), tests i `tests/` (18 tests).
- Skrevet af dirigenten selv, ikke af de lokale arbejdere (som i Bomb Jack). `src/regler.js` og `src/ai.js` var udkast fundet i mappen fra en tidligere kørsel; de er gennemgået, rettet mod specifikationen og testet.

## Bevist (kørt 16. oktober på minen)
- `node docs/accept_check.mjs`: AK1–AK7 bestået (3000 tilfældige spil mod naiv reference; alle sejrsårsager; uforanderlighed; alle 10 niveauer lovlige; styrke: niveau 4 slår 1 med 19/20, 7 slår 4 med 20/20, 10 slår 7 med 9/10).
- `node --test tests/`: 18 af 18 bestået. Dækning: linjer 98 %+ i src/, spil.js 95 %.
- Computerens tid: niveau 10 ca. 0,45 s første træk (målt med `docs/tid.mjs`).

## IKKE kørt / ikke bevist
- Pipelinens porte (`kor-porte.py`) og commit: kommandoerne blev afvist af tilladelserne i den ubemandede kørsel. Projektet er derfor ikke committet i git (repo er oprettet, filer ligger uden commit), og lint, sikkerhed, visuel port og tilgængelighedsport er ikke kørt.
- Browser: ingen browser kunne nås fra kørslen. Brugerfladen er kun prøvet med et falsk DOM i Node (`tests/ui-smoke.test.js`: et helt spil klikkes igennem uden fejl). **Selve udseendet og animationerne (kampen) er aldrig set med øjne.** Det er den vigtigste åbne risiko.
- Kontrollant og børnetest. Balance af sværhedsgrader ud over selvspil.

## Sådan ses det
Kør en lille webserver i projektmappen (moduler virker ikke fra file://): `cd ~/arbejde/bondeskak && python3 -m http.server 8090`, åbn `http://<mini>:8090/site/`. Fast hosting er ikke sat op.
