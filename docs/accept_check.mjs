// Acceptprøve for Bondeskak (docs/SPECIFIKATION.md). Kør: node docs/accept_check.mjs
// Facit er en bevidst naiv, uafhængig implementering med (række, kolonne)-par og 2D-bræt.
import fs from 'node:fs';
import { nytSpil, lovligeTraek, udfoer, fraFen, perft, iSkak } from '../src/regler.js';
import { vaelgTraek } from '../src/ai.js';
import { kampTrin, bevaegelse } from '../src/kamp.js';

let fejl = 0;
const ok = (b, tekst) => { if (!b) { fejl += 1; console.log('FEJL  ' + tekst); } };
const rapport = (navn, start) => console.log(`${fejl === start.fejl ? 'OK   ' : 'FEJL '} ${navn}`);

// --- uafhængigt facit ---
function facitNy() {
  const g = Array.from({ length: 8 }, () => Array(8).fill('.'));
  for (let c = 0; c < 8; c += 1) { g[6][c] = 'G'; g[1][c] = 'L'; }
  return { g, tur: 'G' };
}
function facitTraek({ g, tur }) {
  const d = tur === 'G' ? -1 : 1;
  const start = tur === 'G' ? 6 : 1;
  const andre = tur === 'G' ? 'L' : 'G';
  const ud = [];
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    if (g[r][c] !== tur) continue;
    const r1 = r + d;
    if (r1 < 0 || r1 > 7) continue;
    if (g[r1][c] === '.') {
      ud.push(`${r * 8 + c}-${r1 * 8 + c}`);
      if (r === start && g[r + 2 * d][c] === '.') ud.push(`${r * 8 + c}-${(r + 2 * d) * 8 + c}`);
    }
    for (const dc of [-1, 1]) if (c + dc >= 0 && c + dc < 8 && g[r1][c + dc] === andre) ud.push(`${r * 8 + c}-${r1 * 8 + c + dc}`);
  }
  return ud.sort();
}
function facitUdfoer(s, fra, til) {
  const g = s.g.map((x) => x.slice());
  g[Math.floor(til / 8)][til % 8] = g[Math.floor(fra / 8)][fra % 8];
  g[Math.floor(fra / 8)][fra % 8] = '.';
  return { g, tur: s.tur === 'G' ? 'L' : 'G' };
}
function facitVinder(s, mover, til) {
  const maalRaekke = mover === 'G' ? 0 : 7;
  if (Math.floor(til / 8) === maalRaekke) return 'maal';
  const andre = mover === 'G' ? 'L' : 'G';
  if (!s.g.some((r) => r.includes(andre))) return 'alle';
  if (facitTraek(s).length === 0) return 'blokeret';
  return null;
}
const mkRng = (frø) => () => { frø = (frø * 1664525 + 1013904223) % 4294967296; return frø / 4294967296; };

// AK1 + AK2 + AK3
{
  const start = { fejl };
  const rng = mkRng(42);
  const sedAarsag = new Set();
  for (let spilNr = 0; spilNr < 3000; spilNr += 1) {
    let s = nytSpil(); let f = facitNy();
    for (let t = 0; t < 80; t += 1) {
      const a = lovligeTraek(s).map((x) => `${x.fra}-${x.til}`).sort();
      const b = facitTraek(f);
      if (JSON.stringify(a) !== JSON.stringify(b)) { ok(false, `AK1 træk afviger i spil ${spilNr}, træk ${t}`); break; }
      if (b.length === 0) break;
      const valgt = b[Math.floor(rng() * b.length)].split('-').map(Number);
      const mover = f.tur;
      const kopi = JSON.stringify(s);
      const r = udfoer(s, valgt[0], valgt[1]);
      ok(JSON.stringify(s) === kopi, 'AK3 spillet blev ændret af udfoer');
      f = facitUdfoer(f, valgt[0], valgt[1]);
      const forventet = facitVinder(f, mover, valgt[1]);
      s = r.spil;
      if (forventet) {
        sedAarsag.add(forventet);
        ok(s.vinder === (mover === 'G' ? 'w' : 'b') && s.aarsag === forventet, `AK2 forkert vinder/årsag ${forventet} i spil ${spilNr}`);
        break;
      }
      ok(s.vinder === null, `AK2 vinder meldt for tidligt i spil ${spilNr}`);
    }
  }
  // 'alle' opstår sjældent i tilfældigt spil: konstrueret stilling (gul 41 slår lilla 34, lillas sidste bonde)
  {
    const braet = Array(64).fill(null); braet[41] = 'w'; braet[34] = 'b';
    const r = udfoer({ braet, tur: 'w', vinder: null, aarsag: null, antalTraek: 0 }, 41, 34);
    ok(r.slag === true && r.spil.vinder === 'w' && r.spil.aarsag === 'alle', 'AK2 sidste bonde slået skal give sejr (alle)');
    sedAarsag.add('alle');
  }
  ok(['maal', 'alle', 'blokeret'].every((x) => sedAarsag.has(x)), `AK2 ikke alle sejrsårsager set: ${[...sedAarsag]}`);
  const s0 = nytSpil();
  for (const [fra, til] of [[48, 32 - 8], [0, 8], [-1, 0], [64, 0], [48.5, 40], [49, 49], [1.0, 'x']]) {
    let kastede = false; try { udfoer(s0, fra, til); } catch { kastede = true; }
    ok(kastede, `AK3 ulovligt træk ${fra}->${til} kastede ikke`);
  }
  let kastede = false;
  try { udfoer({ ...s0, vinder: 'w' }, 48, 40); } catch { kastede = true; }
  ok(kastede, 'AK3 træk efter spil slut kastede ikke');
  rapport('AK1-AK3 regler, vinder, ulovligt', start);
}

// AK4
{
  const start = { fejl };
  const rng = mkRng(7);
  for (let n = 1; n <= 10; n += 1) {
    let s = nytSpil();
    for (let t = 0; t < 200 && !s.vinder; t += 1) {
      const lov = new Set(lovligeTraek(s).map((x) => `${x.fra}-${x.til}`));
      const v = vaelgTraek(s, n, rng);
      ok(lov.has(`${v.fra}-${v.til}`), `AK4 niveau ${n} gav ulovligt træk`);
      s = udfoer(s, v.fra, v.til).spil;
    }
  }
  for (const dårlig of [0, 11, 1.5, '3', null, undefined, NaN]) {
    let kastede = false; try { vaelgTraek(nytSpil(), dårlig); } catch (e) { kastede = e instanceof RangeError; }
    ok(kastede, `AK4 niveau ${String(dårlig)} gav ikke RangeError`);
  }
  rapport('AK4 alle niveauer lovlige, ugyldigt niveau', start);
}

// AK5
{
  const start = { fejl };
  const spilParti = (gul, lilla, rng) => {
    let s = nytSpil();
    while (!s.vinder) {
      const v = vaelgTraek(s, s.tur === 'w' ? gul : lilla, rng);
      s = udfoer(s, v.fra, v.til).spil;
    }
    return s.vinder;
  };
  for (const [lav, høj] of [[1, 4], [4, 7], [7, 10]]) {
    const rng = mkRng(100 + høj);
    let sejre = 0;
    const antal = høj === 10 ? 10 : 20;
    for (let i = 0; i < antal; i += 1) {
      const højErGul = i % 2 === 0;
      const v = højErGul ? spilParti(høj, lav, rng) : spilParti(lav, høj, rng);
      if ((v === 'w') === højErGul) sejre += 1;
    }
    console.log(`      niveau ${høj} mod ${lav}: ${sejre}/${antal}`);
    ok(sejre / antal >= 0.6, `AK5 niveau ${høj} slog kun ${sejre}/${antal} mod ${lav}`);
  }
  rapport('AK5 højere niveau slår lavere', start);
}

// AK6
{
  const start = { fejl };
  const hop = kampTrin({ fra: 48, til: 40, slag: false }).map((t) => t.type);
  const kamp = kampTrin({ fra: 48, til: 41, slag: true }).map((t) => t.type);
  ok(JSON.stringify(hop) === '["hop"]', 'AK6 almindeligt træk skal kun være hop');
  ok(JSON.stringify(kamp) === '["loeb","slag","fald"]', 'AK6 slag skal være løb, slag, fald');
  rapport('AK6 kampplan', start);
}

// AK7
{
  const start = { fejl };
  const html = fs.existsSync('site/index.html') ? fs.readFileSync('site/index.html', 'utf8') : '';
  ok(/spil\.js/.test(html), 'AK7 index.html indlæser ikke spil.js');
  const alle = ['site/index.html', 'site/spil.js', 'site/stil.css'].map((f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')).join('\n');
  ok(!/(https?:)?\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(alle.replace(/\/\/.*$/gm, '')), 'AK7 ekstern adresse fundet');
  rapport('AK7 site', start);
}

// AK8 Valg af brikker: rigtige pladser, ugyldigt valg afvises
{
  const start = { fejl };
  const t = nytSpil(['T']);
  const tårne = t.typer.map((x, i) => (x === 'T' ? i : -1)).filter((i) => i >= 0);
  ok(JSON.stringify(tårne) === '[0,7,56,63]', `AK8 tårne står forkert: ${tårne}`);
  ok(t.braet[0] === 'b' && t.braet[63] === 'w', 'AK8 tårnenes farver er forkerte');
  ok(t.typer.filter((x) => x === 'B').length === 16, 'AK8 bønderne mangler');
  const f = nytSpil('fuldt');
  ok(f.typer.slice(56).join('') === 'TSLDKLST' && f.typer.slice(0, 8).join('') === 'TSLDKLST', 'AK8 fuldt spil står ikke som i skak');
  ok(f.konger === true && t.konger === false, 'AK8 kongetilstand forkert');
  const h = nytSpil(['S', 'L']);
  ok([1, 2, 5, 6, 57, 58, 61, 62].every((i) => h.typer[i] !== null) && h.typer[0] === null && h.typer[3] === null, 'AK8 heste og løbere står forkert');
  for (const dårlig of [['X'], 'alt', [1], null, 42]) {
    let kastede = false; try { nytSpil(dårlig); } catch (e) { kastede = e instanceof RangeError; }
    ok(kastede, `AK8 valg ${JSON.stringify(dårlig)} gav ikke RangeError`);
  }
  rapport('AK8 valg af brikker', start);
}

// AK9 Skakregler: perft-tal (kendte facit fra skakprogrammering) for fem stillinger
{
  const start = { fejl };
  const sager = [
    ['startstilling', nytSpil('fuldt'), [20, 400, 8902, 197281]],
    ['kiwipete (rokade, en passant)', fraFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), [48, 2039, 97862]],
    ['position 3 (en passant, bundet)', fraFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), [14, 191, 2812, 43238]],
    ['position 4 (forvandling)', fraFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'), [6, 264, 9467]],
    ['position 5', fraFen('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8'), [44, 1486, 62379]],
  ];
  for (const [navn, s, facit] of sager) {
    const res = facit.map((_, i) => perft(s, i + 1));
    ok(JSON.stringify(res) === JSON.stringify(facit), `AK9 perft ${navn}: ${res} (facit ${facit})`);
  }
  rapport('AK9 skakregler (perft)', start);
}

// AK10 Slutninger med konger: skakmat, patt, for lidt materiale, 50 træk
{
  const start = { fejl };
  let s = nytSpil('fuldt');
  for (const [fra, til] of [[53, 45], [12, 28], [54, 38], [3, 39]]) s = udfoer(s, fra, til).spil; // narremat
  ok(s.vinder === 'b' && s.aarsag === 'skakmat', `AK10 narremat gav ${s.vinder}/${s.aarsag}`);
  const patt = udfoer(fraFen('7k/8/6Q1/8/8/8/8/K7 w - - 0 1'), 22, 13).spil; // Dg6-f7: lilla konge på h8 har ingen træk og står ikke i skak
  ok(patt.vinder === 'uafgjort' && patt.aarsag === 'patt', `AK10 patt gav ${patt.vinder}/${patt.aarsag}`);
  const mat = udfoer(fraFen('7k/8/8/8/8/8/8/K5q1 b - - 0 1'), 62, 63).spil;
  ok(mat.vinder === null, 'AK10 dronningetræk skulle ikke afslutte');
  const kk = udfoer(fraFen('7k/8/8/8/8/8/6q1/K5R1 w - - 0 1'), 62, 54).spil; // tårn slår dronning: kun K+T mod K
  ok(kk.vinder === null, 'AK10 K+T mod K er ikke for lidt materiale');
  const bar = udfoer(fraFen('7k/8/8/8/8/8/6r1/K5R1 w - - 0 1'), 62, 54).spil;
  ok(bar.vinder === null, 'AK10 tårn slår tårn: K+T mod K kan stadig vindes');
  const kun = udfoer(fraFen('7k/8/8/8/8/5r2/8/K5N1 w - - 0 1'), 62, 45).spil; // hest g1 slår tårn f3: K+S mod K
  ok(kun.vinder === 'uafgjort' && kun.aarsag === 'materiale', `AK10 K+S mod K gav ${kun.vinder}/${kun.aarsag}`);
  const halv = udfoer(fraFen('7k/8/8/8/8/8/8/K6R w - - 99 1'), 63, 62).spil;
  ok(halv.vinder === 'uafgjort' && halv.aarsag === 'remis50', `AK10 50-trækreglen gav ${halv.vinder}/${halv.aarsag}`);
  ok(iSkak(fraFen('4k3/8/8/8/8/8/8/4R2K b - - 0 1')) && !iSkak(fraFen('4k3/8/8/8/8/8/8/3R3K b - - 0 1')), 'AK10 iSkak forkert');
  // forvandling: standard dronning, valgfri anden brik, ugyldig afvises
  const pf = fraFen('7k/P7/8/8/8/8/8/K7 w - - 0 1');
  ok(udfoer(pf, 8, 0).spil.typer[0] === 'D' && udfoer(pf, 8, 0, 'S').spil.typer[0] === 'S', 'AK10 forvandling virker ikke');
  let kastede = false; try { udfoer(pf, 8, 0, 'K'); } catch { kastede = true; }
  ok(kastede, 'AK10 forvandling til konge blev ikke afvist');
  rapport('AK10 slutninger med konger', start);
}

// AK11 Bondeskak med brikker (uden konger): kun en bonde vinder ved at nå over; alt slået vinder
{
  const start = { fejl };
  const tom = () => ({ braet: Array(64).fill(null), typer: Array(64).fill(null), tur: 'w', vinder: null, aarsag: null, antalTraek: 0, konger: false, halvtraek: 0 });
  const a = tom(); a.braet[48] = 'w'; a.typer[48] = 'T'; a.braet[9] = 'b'; a.typer[9] = 'B'; a.braet[55] = 'w'; a.typer[55] = 'B';
  ok(udfoer(a, 48, 0).spil.vinder === null, 'AK11 tårn på bagerste række må ikke vinde');
  const b = tom(); b.braet[8] = 'w'; b.typer[8] = 'B'; b.braet[40] = 'b'; b.typer[40] = 'T';
  const rb = udfoer(b, 8, 0).spil;
  ok(rb.vinder === 'w' && rb.aarsag === 'maal' && rb.typer[0] === 'B', 'AK11 bonde over skal vinde (og ikke forvandles)');
  const c = tom(); c.braet[57] = 'w'; c.typer[57] = 'S'; c.braet[42] = 'b'; c.typer[42] = 'L';
  const rc = udfoer(c, 57, 42).spil;
  ok(rc.vinder === 'w' && rc.aarsag === 'alle', 'AK11 sidste brik slået skal vinde');
  const d = nytSpil(['T', 'S']); // ingen en passant uden konger
  let s = d; for (const [fra, til] of [[52, 36], [9, 17], [36, 28], [11, 27]]) s = udfoer(s, fra, til).spil;
  ok(!lovligeTraek(s, 28).some((t) => t.slagFelt !== undefined), 'AK11 en passant må ikke findes uden konger');
  rapport('AK11 bondeskak med brikker', start);
}

// AK12 Computeren med brikker: altid lovlig, hurtig nok, stærkere på højt niveau
{
  const start = { fejl };
  const rng = mkRng(11);
  for (const valg of [['T'], ['S', 'L'], ['D', 'K'], 'fuldt']) {
    for (const n of [1, 5, 10]) {
      let s = nytSpil(valg);
      for (let t = 0; t < 16 && !s.vinder; t += 1) {
        const lov = new Set(lovligeTraek(s).map((x) => `${x.fra}-${x.til}-${x.forvandling ?? ''}`));
        const t0 = Date.now();
        const v = vaelgTraek(s, n, rng);
        const ms = Date.now() - t0;
        ok(ms < 2500, `AK12 niveau ${n} brugte ${ms} ms`);
        ok(lov.has(`${v.fra}-${v.til}-${v.forvandling ?? ''}`), `AK12 niveau ${n} gav ulovligt træk med ${JSON.stringify(valg)}`);
        s = udfoer(s, v.fra, v.til, v.forvandling).spil;
      }
    }
  }
  const parti = (g, l, valg, r) => {
    let s = nytSpil(valg);
    for (let p = 0; p < 300 && !s.vinder; p += 1) { const v = vaelgTraek(s, s.tur === 'w' ? g : l, r); s = udfoer(s, v.fra, v.til, v.forvandling).spil; }
    return s.vinder;
  };
  for (const [valg, høj, lav] of [['fuldt', 7, 1], [['T', 'S'], 7, 1], ['fuldt', 10, 4]]) {
    let sejre = 0;
    for (let i = 0; i < 6; i += 1) {
      const højErGul = i % 2 === 0;
      const v = højErGul ? parti(høj, lav, valg, mkRng(300 + i)) : parti(lav, høj, valg, mkRng(300 + i));
      if (v === (højErGul ? 'w' : 'b')) sejre += 1;
    }
    console.log(`      ${JSON.stringify(valg)} niveau ${høj} mod ${lav}: ${sejre}/6`);
    ok(sejre >= 4, `AK12 niveau ${høj} vandt kun ${sejre}/6 mod ${lav} med ${JSON.stringify(valg)}`);
  }
  rapport('AK12 computeren med brikker', start);
}

// AK13 Bevægelser: hver brik har sin egen stil
{
  const start = { fejl };
  const stil = Object.fromEntries(['B', 'T', 'S', 'L', 'D', 'K'].map((b) => [b, bevaegelse(b)]));
  ok(JSON.stringify(stil) === '{"B":"hop","T":"glid","S":"spring","L":"glid","D":"svaev","K":"hop"}', `AK13 stile: ${JSON.stringify(stil)}`);
  ok(kampTrin({ fra: 56, til: 0, slag: false, brik: 'T' })[0].ms > kampTrin({ fra: 56, til: 48, slag: false, brik: 'T' })[0].ms, 'AK13 lang vej skal tage længere tid');
  const html = fs.readFileSync('site/index.html', 'utf8');
  for (const farve of ['gul', 'lilla']) for (const b of ['B', 'T', 'S', 'L', 'D', 'K']) ok(html.includes(`id="skabelon-${farve}-${b}"`), `AK13 tegning mangler: ${farve} ${b}`);
  rapport('AK13 bevægelser og tegninger', start);
}

console.log(fejl === 0 ? 'ALLE ACCEPTKRITERIER BESTÅET' : `${fejl} FEJL`);
process.exit(fejl === 0 ? 0 : 1);
