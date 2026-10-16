// Bondeskak: computerens hjerne. Niveau 1-10.
// Niveau 1 vælger tilfældigt. Højere niveauer tænker flere træk frem og laver
// færre "kiksere" (tilfældige træk), så børn kan vokse med spillet.

import {
  GUL,
  STOERRELSE,
  lovligeTraek,
  raekke,
  kolonne,
  udfoer,
} from './regler.js';

export const NIVEAUER = [
  { niveau: 1, dybde: 0, kikser: 1.0 },
  { niveau: 2, dybde: 1, kikser: 0.6 },
  { niveau: 3, dybde: 1, kikser: 0.35 },
  { niveau: 4, dybde: 2, kikser: 0.25 },
  { niveau: 5, dybde: 2, kikser: 0.1 },
  { niveau: 6, dybde: 3, kikser: 0.05 },
  { niveau: 7, dybde: 4, kikser: 0 },
  { niveau: 8, dybde: 5, kikser: 0 },
  { niveau: 9, dybde: 6, kikser: 0 },
  { niveau: 10, dybde: 7, kikser: 0 },
];

const SEJR = 100000;

// Stilling set fra gul. Positiv = godt for gul.
function vurder(spil) {
  let sum = 0;
  const gule = [];
  const lilla = [];
  spil.braet.forEach((felt, i) => {
    if (felt === 'w') gule.push(i);
    else if (felt === 'b') lilla.push(i);
  });
  for (const i of gule) {
    const fremad = 6 - raekke(i);
    sum += 100 + fremad * fremad * 4;
    const frit = !lilla.some(
      (j) => Math.abs(kolonne(j) - kolonne(i)) <= 1 && raekke(j) < raekke(i),
    );
    if (frit) sum += 40 + fremad * 25;
  }
  for (const i of lilla) {
    const fremad = raekke(i) - 1;
    sum -= 100 + fremad * fremad * 4;
    const frit = !gule.some(
      (j) => Math.abs(kolonne(j) - kolonne(i)) <= 1 && raekke(j) > raekke(i),
    );
    if (frit) sum -= 40 + fremad * 25;
  }
  return sum;
}

function sorteredeTraek(spil) {
  const dr = spil.tur === GUL ? -1 : 1;
  return lovligeTraek(spil).sort((a, b) => {
    const va = (a.slag ? 10 : 0) + (a.til - a.fra) * dr / STOERRELSE;
    const vb = (b.slag ? 10 : 0) + (b.til - b.fra) * dr / STOERRELSE;
    return vb - va;
  });
}

// Negamax med alfa-beta. Giver værdi set fra den, der skal flytte.
function soeg(spil, dybde, alfa, beta, afstand) {
  if (spil.vinder) {
    return spil.vinder === spil.tur ? SEJR - afstand : -(SEJR - afstand);
  }
  if (dybde === 0) {
    return spil.tur === GUL ? vurder(spil) : -vurder(spil);
  }
  let bedst = -Infinity;
  for (const t of sorteredeTraek(spil)) {
    const { spil: efter } = udfoer(spil, t.fra, t.til);
    const v = -soeg(efter, dybde - 1, -beta, -alfa, afstand + 1);
    if (v > bedst) bedst = v;
    if (bedst > alfa) alfa = bedst;
    if (alfa >= beta) break;
  }
  return bedst;
}

function vaelgTilfaeldig(liste, rng) {
  return liste[Math.floor(rng() * liste.length)];
}

// Giver alle træk en værdi og returnerer de bedste (ens værdi = tilfældigt valg).
function bedsteTraek(spil, dybde) {
  const traek = sorteredeTraek(spil);
  let bedst = -Infinity;
  let vindere = [];
  for (const t of traek) {
    const { spil: efter } = udfoer(spil, t.fra, t.til);
    const v = -soeg(efter, dybde - 1, -Infinity, Infinity, 1);
    if (v > bedst) {
      bedst = v;
      vindere = [t];
    } else if (v === bedst) {
      vindere.push(t);
    }
  }
  return vindere;
}

export function vaelgTraek(spil, niveau, rng = Math.random) {
  if (!Number.isInteger(niveau) || niveau < 1 || niveau > 10) {
    throw new RangeError('Niveau skal være et helt tal fra 1 til 10');
  }
  if (spil.vinder) throw new Error('Spillet er slut');
  const alle = lovligeTraek(spil);
  if (alle.length === 0) throw new Error('Ingen lovlige træk');
  const { dybde, kikser } = NIVEAUER[niveau - 1];
  if (dybde === 0 || rng() < kikser) return vaelgTilfaeldig(alle, rng);
  return vaelgTilfaeldig(bedsteTraek(spil, dybde), rng);
}

// Et tip til barnet: et godt træk uden kiksere.
export function tip(spil) {
  if (spil.vinder) throw new Error('Spillet er slut');
  return vaelgTilfaeldig(bedsteTraek(spil, 4), Math.random);
}
