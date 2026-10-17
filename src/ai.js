// Bondeskak: computerens hjerne. Niveau 1-10.
// Niveau 1 vælger tilfældigt. Højere niveauer tænker flere træk frem og laver
// færre "kiksere" (tilfældige træk), så børn kan vokse med spillet.
// Med andre brikker end bønder er der mange flere træk, så computeren tænker færre lag,
// ser slag til ende (fra niveau 4) og har et tidsloft pr. træk.

import {
  GUL,
  MAALRAEKKE,
  REMIS_HALVTRAEK,
  angrebet,
  anvend,
  kongeFelt,
  kolonne,
  lovligeTraek,
  modstander,
  pseudoTraek,
  raekke,
  typerAf,
} from './regler.js';

export const NIVEAUER = [
  { niveau: 1, dybde: 0, dybdeBrikker: 0, kikser: 1.0 },
  { niveau: 2, dybde: 1, dybdeBrikker: 1, kikser: 0.6 },
  { niveau: 3, dybde: 1, dybdeBrikker: 1, kikser: 0.35 },
  { niveau: 4, dybde: 2, dybdeBrikker: 2, kikser: 0.25 },
  { niveau: 5, dybde: 2, dybdeBrikker: 2, kikser: 0.1 },
  { niveau: 6, dybde: 3, dybdeBrikker: 2, kikser: 0.05 },
  { niveau: 7, dybde: 4, dybdeBrikker: 3, kikser: 0 },
  { niveau: 8, dybde: 5, dybdeBrikker: 4, kikser: 0 },
  { niveau: 9, dybde: 6, dybdeBrikker: 5, kikser: 0 },
  { niveau: 10, dybde: 7, dybdeBrikker: 6, kikser: 0 },
];

const SEJR = 100000;
const VAERDI = { B: 100, S: 300, L: 320, T: 500, D: 900, K: 0 };
const MIDTE = [0, 1, 2, 3, 3, 2, 1, 0];
const TIDSLOFT_MS = 1500;

class Tidsnok extends Error {}

const kunBonder = (s) => !s.typer || s.typer.every((t) => t === null || t === 'B');

// Stilling set fra gul. Positiv = godt for gul.
function vurder(s) {
  const typer = typerAf(s);
  let sum = 0;
  const gule = [];
  const lilla = [];
  s.braet.forEach((felt, i) => {
    if (felt === null) return;
    const t = typer[i];
    if (t === 'B') {
      (felt === 'w' ? gule : lilla).push(i);
      return;
    }
    const tegn = felt === 'w' ? 1 : -1;
    let v = VAERDI[t];
    if (t === 'S' || t === 'L') v += 6 * (MIDTE[raekke(i)] + MIDTE[kolonne(i)]);
    if (t === 'D') v += 2 * (MIDTE[raekke(i)] + MIDTE[kolonne(i)]);
    if (t === 'K' && s.konger) v -= 4 * (MIDTE[raekke(i)] + MIDTE[kolonne(i)]);
    sum += tegn * v;
  });
  // Bønder: uden konger er det et kapløb mod bagerste række (som i grundspillet); med konger tæller fremdrift mindre.
  const vaegt = s.konger ? 0.35 : 1;
  for (const i of gule) {
    const fremad = 6 - raekke(i);
    sum += 100 + vaegt * fremad * fremad * 4;
    const frit = !lilla.some((j) => Math.abs(kolonne(j) - kolonne(i)) <= 1 && raekke(j) < raekke(i));
    if (frit) sum += vaegt * (40 + fremad * 25);
  }
  for (const i of lilla) {
    const fremad = raekke(i) - 1;
    sum -= 100 + vaegt * fremad * fremad * 4;
    const frit = !gule.some((j) => Math.abs(kolonne(j) - kolonne(i)) <= 1 && raekke(j) > raekke(i));
    if (frit) sum -= vaegt * (40 + fremad * 25);
  }
  return Math.round(sum);
}

function statisk(s) {
  return s.tur === GUL ? vurder(s) : -vurder(s);
}

// Alle træk (uden kontrol af egen konge), bedste gæt først: slag af store brikker med små, forvandling, fremdrift.
function sorteredeTraek(s, typer, kunSlag = false) {
  const ud = [];
  for (let f = 0; f < 64; f += 1) if (s.braet[f] === s.tur) pseudoTraek(s, typer, f, ud);
  const dr = s.tur === GUL ? -1 : 1;
  const point = (t) => {
    let p = 0;
    if (t.slag) p += 10 * (VAERDI[typer[t.slagFelt ?? t.til]] || 100) - (VAERDI[t.brik] || 0) / 10 + 1000;
    if (t.forvandling) p += VAERDI[t.forvandling];
    if (t.brik === 'B') p += ((t.til - t.fra) * dr) / 8;
    return p;
  };
  const liste = kunSlag ? ud.filter((t) => t.slag || t.forvandling) : ud;
  return liste.map((t) => [point(t), t]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

// Er trækket ulovligt (egen konge i skak bagefter)?
function ulovlig(s, n) {
  if (!s.konger) return false;
  const kf = kongeFelt(n.braet, n.typer, s.tur);
  return kf >= 0 && angrebet(n.braet, n.typer, kf, n.tur);
}

// Vandt trækket med det samme (kun uden konger: bonde over, alle slået)?
function vandt(s, n, t) {
  if (s.konger) return false;
  if (n.typer[t.til] === 'B' && raekke(t.til) === MAALRAEKKE[s.tur]) return true;
  return !n.braet.includes(n.tur);
}

function iSkakNu(s) {
  const kf = kongeFelt(s.braet, s.typer, s.tur);
  return kf >= 0 && angrebet(s.braet, s.typer, kf, modstander(s.tur));
}

function lavSoeger(frist) {
  let noder = 0;
  const tjek = () => {
    noder += 1;
    if ((noder & 1023) === 0 && Date.now() > frist) throw new Tidsnok();
  };

  // Ser slag til ende, så computeren ikke stopper midt i en udveksling.
  function stille(s, alfa, beta, dybde) {
    tjek();
    const staa = statisk(s);
    if (staa >= beta || dybde === 0) return staa;
    if (staa > alfa) alfa = staa;
    for (const t of sorteredeTraek(s, s.typer, true)) {
      const n = anvend(s, s.typer, t);
      if (ulovlig(s, n)) continue;
      const v = vandt(s, n, t) ? SEJR : -stille(n, -beta, -alfa, dybde - 1);
      if (v >= beta) return v;
      if (v > alfa) alfa = v;
    }
    return alfa;
  }

  // Negamax med alfa-beta. Giver værdi set fra den, der skal flytte.
  function soeg(s, dybde, alfa, beta, afstand, kvies) {
    tjek();
    if (dybde === 0) return kvies ? stille(s, alfa, beta, 6) : statisk(s);
    let bedst = -Infinity;
    let lovlige = 0;
    for (const t of sorteredeTraek(s, s.typer)) {
      const n = anvend(s, s.typer, t);
      if (ulovlig(s, n)) continue;
      lovlige += 1;
      let v;
      if (vandt(s, n, t)) v = SEJR - afstand - 1;
      else if (n.halvtraek >= REMIS_HALVTRAEK) v = 0;
      else v = -soeg(n, dybde - 1, -beta, -alfa, afstand + 1, kvies);
      if (v > bedst) bedst = v;
      if (bedst > alfa) alfa = bedst;
      if (alfa >= beta) break;
    }
    if (lovlige === 0) {
      if (s.konger && !iSkakNu(s)) return 0; // patt
      return -(SEJR - afstand); // skakmat, eller spærret i bondeskak
    }
    return bedst;
  }
  return soeg;
}

function vaelgTilfaeldig(liste, rng) {
  return liste[Math.floor(rng() * liste.length)];
}

// Giver alle træk en værdi og returnerer de bedste (ens værdi = tilfældigt valg). Tænker dybere og dybere,
// til dybden er nået eller tiden er gået; så gælder den sidste hele omgang.
function bedsteTraek(spil, dybde, kvies, tidsloft) {
  const s = { ...spil, typer: typerAf(spil) };
  const alle = lovligeTraek(spil);
  const soeg = lavSoeger(Date.now() + tidsloft);
  let resultat = alle;
  let orden = alle;
  for (let d = 1; d <= dybde; d += 1) {
    try {
      let bedst = -Infinity;
      let vindere = [];
      const vaerdier = new Map();
      for (const t of orden) {
        const n = anvend(s, s.typer, t);
        let v;
        if (vandt(s, n, t)) v = SEJR - 1;
        else if (n.halvtraek >= REMIS_HALVTRAEK) v = 0;
        else v = -soeg(n, d - 1, -Infinity, -(bedst - 1), 1, kvies);
        vaerdier.set(t, v);
        if (v > bedst) { bedst = v; vindere = [t]; } else if (v === bedst) vindere.push(t);
      }
      resultat = vindere;
      orden = [...orden].sort((a, b) => vaerdier.get(b) - vaerdier.get(a));
      if (bedst >= SEJR - 50) break; // vundet: ingen grund til at tænke længere
    } catch (e) {
      if (!(e instanceof Tidsnok) || d === 1) throw e;
      break;
    }
  }
  return resultat;
}

export function vaelgTraek(spil, niveau, rng = Math.random) {
  if (!Number.isInteger(niveau) || niveau < 1 || niveau > 10) {
    throw new RangeError('Niveau skal være et helt tal fra 1 til 10');
  }
  if (spil.vinder) throw new Error('Spillet er slut');
  const alle = lovligeTraek(spil);
  if (alle.length === 0) throw new Error('Ingen lovlige træk');
  const { dybde, dybdeBrikker, kikser } = NIVEAUER[niveau - 1];
  const bonder = kunBonder(spil);
  const d = bonder ? dybde : dybdeBrikker;
  if (d === 0 || rng() < kikser) return vaelgTilfaeldig(alle, rng);
  return vaelgTilfaeldig(bedsteTraek(spil, d, !bonder && niveau >= 4, bonder ? 10000 : TIDSLOFT_MS), rng);
}

// Et tip til barnet: et godt træk uden kiksere.
export function tip(spil) {
  if (spil.vinder) throw new Error('Spillet er slut');
  const bonder = kunBonder(spil);
  return vaelgTilfaeldig(bedsteTraek(spil, bonder ? 4 : 3, !bonder, 900), Math.random);
}
