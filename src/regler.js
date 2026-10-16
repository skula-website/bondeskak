// Bondeskak: reglerne. Ren logik uden browser, så den kan testes i Node.
// Brættet har 64 felter. Felt = række * 8 + kolonne. Række 0 er øverst.
// Gul ('w') starter nederst (række 6) og går op mod række 0.
// Lilla ('b') starter oppe (række 1) og går ned mod række 7.

export const STOERRELSE = 8;
export const GUL = 'w';
export const LILLA = 'b';

const RETNING = { [GUL]: -1, [LILLA]: 1 };
const STARTRAEKKE = { [GUL]: 6, [LILLA]: 1 };
const MAALRAEKKE = { [GUL]: 0, [LILLA]: 7 };

export function modstander(farve) {
  if (farve !== GUL && farve !== LILLA) {
    throw new RangeError(`Ukendt farve: ${String(farve)}`);
  }
  return farve === GUL ? LILLA : GUL;
}

export function raekke(felt) {
  return Math.floor(felt / STOERRELSE);
}

export function kolonne(felt) {
  return felt % STOERRELSE;
}

function erFelt(felt) {
  return Number.isInteger(felt) && felt >= 0 && felt < STOERRELSE * STOERRELSE;
}

export function nytSpil() {
  const braet = new Array(STOERRELSE * STOERRELSE).fill(null);
  for (let k = 0; k < STOERRELSE; k += 1) {
    braet[STARTRAEKKE[GUL] * STOERRELSE + k] = GUL;
    braet[STARTRAEKKE[LILLA] * STOERRELSE + k] = LILLA;
  }
  return { braet, tur: GUL, vinder: null, aarsag: null, antalTraek: 0 };
}

// Alle lovlige træk for en farve, eller kun fra ét felt.
export function lovligeTraek(spil, fraFelt = null) {
  if (spil.vinder) return [];
  const farve = spil.tur;
  const dr = RETNING[farve];
  const traek = [];
  const felter = fraFelt === null ? spil.braet.keys() : [fraFelt];
  for (const fra of felter) {
    if (!erFelt(fra)) throw new RangeError(`Ugyldigt felt: ${String(fra)}`);
    if (spil.braet[fra] !== farve) continue;
    const r = raekke(fra);
    const k = kolonne(fra);
    const frem = r + dr;
    if (frem < 0 || frem >= STOERRELSE) continue;
    if (spil.braet[frem * STOERRELSE + k] === null) {
      traek.push({ fra, til: frem * STOERRELSE + k, slag: false });
      const frem2 = r + 2 * dr;
      if (r === STARTRAEKKE[farve] && spil.braet[frem2 * STOERRELSE + k] === null) {
        traek.push({ fra, til: frem2 * STOERRELSE + k, slag: false });
      }
    }
    for (const dk of [-1, 1]) {
      const nk = k + dk;
      if (nk < 0 || nk >= STOERRELSE) continue;
      const til = frem * STOERRELSE + nk;
      if (spil.braet[til] === modstander(farve)) {
        traek.push({ fra, til, slag: true });
      }
    }
  }
  return traek;
}

export function erLovligt(spil, fra, til) {
  return lovligeTraek(spil, fra).some((t) => t.til === til);
}

export function taelBonder(spil, farve) {
  let antal = 0;
  for (const felt of spil.braet) if (felt === farve) antal += 1;
  return antal;
}

// Udfører et træk og giver et NYT spil. Kaster Error ved ulovligt træk.
export function udfoer(spil, fra, til) {
  if (spil.vinder) throw new Error('Spillet er slut');
  if (!erFelt(fra) || !erFelt(til)) throw new RangeError('Ugyldigt felt');
  const traek = lovligeTraek(spil, fra).find((t) => t.til === til);
  if (!traek) throw new Error(`Ulovligt træk ${fra} -> ${til}`);
  const braet = spil.braet.slice();
  braet[til] = braet[fra];
  braet[fra] = null;
  const naeste = {
    braet,
    tur: modstander(spil.tur),
    vinder: null,
    aarsag: null,
    antalTraek: spil.antalTraek + 1,
  };
  const mover = spil.tur;
  if (raekke(til) === MAALRAEKKE[mover]) {
    naeste.vinder = mover;
    naeste.aarsag = 'maal';
  } else if (taelBonder(naeste, modstander(mover)) === 0) {
    naeste.vinder = mover;
    naeste.aarsag = 'alle';
  } else if (lovligeTraek(naeste).length === 0) {
    naeste.vinder = mover;
    naeste.aarsag = 'blokeret';
  }
  return { spil: naeste, slag: traek.slag };
}
