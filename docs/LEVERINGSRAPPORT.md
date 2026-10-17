# Leveringsrapport: Bondeskak for børn (bestilling #20, 16. oktober 2026)

## Sådan ser du resultatet
Genoptaget 17. oktober for et kompakt indstillingspanel. Mens det ligger på minen: **http://100.122.133.31:8088/vis/bondeskak/** (hjemme også http://mini.local:8088/vis/bondeskak/) eller «Åbn resultatet» på kortet i Overblik.
Når det er godkendt igen, flyttes det til `/Volumes/Lenovo PS8/ps8/bondeskak` og åbnes med ikonet **«Åbn Bondeskak»** i mappen (http://127.0.0.1:8835/site/).

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

## Ny grafik og animation (16. oktober, nat, Michaels ønske)
- Bønderne er tegnet om som vektorgrafik (skabeloner i `site/index.html`): rund krop med lys og skygge, ansigt med kinder og glans i øjnene, gul med stråhat, lilla med hjelm og fjer. De trækker vejret og blinker hver for sig, og en valgt bonde løfter sig og svæver.
- Hop med sats, svæv og landing (klemmes og retter sig op), skygge på brættet og støv ved landing. Kamp: bønderne løber med små hop, sværdene springer frem og hugger, glimt og POW i midten, den tabende flyver baglæns med røgsky, vinderen hopper ind på feltet. De lilla vugger, mens computeren tænker.
- Brættet har dybde (rammegradient, felter med lys) og blødere markeringer. «Reducer bevægelse» slukker det hele.
- Alle 12 porte bestået igen (`logs/porte/20261016-233033`). Set i browseren i mobilbredde med et slag; ingen konsolfejl.

## Tilvalg af brikker og fuldt skak (17. oktober, nat, Michaels bestilling)
- Over brættet: «Kun bønder», Tårne, Heste, Løbere, Dronning, Konge og «Fuldt skakspil». Kan kun ændres før første træk (låst også under første animation); huskes i browseren.
- Uden konge: bondeskakkets mål for alle brikker. Med konge: rigtige skakregler (skakmat, patt, rokade, en passant, forvandling til dronning, 50-trækreglen, for lidt materiale). Se SPECIFIKATION.md.
- Regler bevist med perft-tal for fem kendte stillinger (fx 197.281 stillinger efter 4 halvtræk fra start), som er standardfacit for skakprogrammer.
- Computeren spiller alle kombinationer, slår lave niveauer 6/6 i fuldt skak og tænker under 0,2 s på niveau 10 fra start (tidsloft 1,5 s).
- Nye tegninger i samme stil (tårn, hest, løber, dronning, konge) med egne bevægelser: hesten springer højt med galop, tårnet glider tungt med støv og rumlen, løberen glider med gnister, dronningen flyver med klokker, kongen går lavt og værdigt og ryster, når han står i skak. Rokade, en passant og forvandling er animeret.
- Prøvet i browseren (mobilbredde) med fuldt skak: 30 træk med kampe for hest, bonde, dronning og løber, ingen konsolfejl, og hver brik på skærmen svarer til reglerne. Alle 12 porte og AK1–AK13 bestået (`logs/porte/20261017-000930`). En fejl fundet af testen og rettet: valget kunne ændres, mens første træk blev animeret.

## Kompakt indstillingspanel (17. oktober, Michaels ønske)
- Før spillet: ét panel med samme opbygning på alle skærme: «Computer» med 10 stjerner på én række og niveaunavnet, «Brikker» med knapperne i et fast gitter (4 + 3) og en kort regeltekst.
- Under spillet er panelet skjult og afløst af én linje (fx «Niveau 3: Glad kanin · Fuldt skak»); det kommer tilbage ved «Nyt spil» eller når spillet slutter. Undertitlen følger spilformen.
- Set i mobil- og desktopbredde; alle 12 porte bestået (`logs/porte/20261017-112757`).
- Oprydning: genoptagelsen tog Finders `.DS_Store` med i git; den er fjernet, og flytningen tager hverken den eller ikon-appen med fremover.

## Ikke bevist
- Kontrollant (lokal model) er ikke kørt. Børnetest og balance ud over selvspil er ikke målt.

## Næste skridt
Din prøve af brikvalget. Er du tilfreds, så tryk «Godkend – færdig» på kortet i Overblik; så flyttes Bondeskak til Lenovo-disken, når iMac'en er tændt.
