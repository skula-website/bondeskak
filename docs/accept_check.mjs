// Acceptprøve for Bondeskak (docs/SPECIFIKATION.md). Kør: node docs/accept_check.mjs
// Facit er en bevidst naiv, uafhængig implementering med (række, kolonne)-par og 2D-bræt.
import fs from 'node:fs';
import { nytSpil, lovligeTraek, udfoer } from '../src/regler.js';
import { vaelgTraek } from '../src/ai.js';
import { kampTrin } from '../src/kamp.js';

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

console.log(fejl === 0 ? 'ALLE ACCEPTKRITERIER BESTÅET' : `${fejl} FEJL`);
process.exit(fejl === 0 ? 0 : 1);
