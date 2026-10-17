// Bondeskak: reglerne. Ren logik uden browser, så den kan testes i Node.
// Brættet har 64 felter. Felt = række * 8 + kolonne. Række 0 er øverst.
// Gul ('w') starter nederst og går op mod række 0. Lilla ('b') starter oppe og går ned mod række 7.
//
// Grundspillet er kun bønder. Før spillet kan man tilvælge tårne (T), heste (S), løbere (L), dronning (D)
// og konge (K); de står på deres pladser fra skak. Med konger gælder de rigtige skakregler: skak, skakmat,
// patt, rokade, en passant og forvandling. Uden konger gælder bondeskakkets mål: få en bonde over på den
// anden side, slå alle modstanderens brikker, eller spær, så modstanderen ikke kan flytte.

export const STOERRELSE = 8;
export const GUL = 'w';
export const LILLA = 'b';
export const VALGBARE = ['T', 'S', 'L', 'D', 'K'];
export const BRIKNAVN = { B: 'bonde', T: 'tårn', S: 'hest', L: 'løber', D: 'dronning', K: 'konge' };

const RETNING = { [GUL]: -1, [LILLA]: 1 };
const STARTRAEKKE = { [GUL]: 6, [LILLA]: 1 };
export const MAALRAEKKE = { [GUL]: 0, [LILLA]: 7 };
const BAGRAEKKE = ['T', 'S', 'L', 'D', 'K', 'L', 'S', 'T'];
const SPRING = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const NABO = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const LIGE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const SKRAA = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const GLID = { T: LIGE, L: SKRAA, D: [...LIGE, ...SKRAA] };
const FORVANDLINGER = ['D', 'T', 'L', 'S'];
export const REMIS_HALVTRAEK = 100;

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

const paa = (r, k) => r >= 0 && r < STOERRELSE && k >= 0 && k < STOERRELSE;

// Briktyper pr. felt. Ældre stillinger uden typer består kun af bønder.
export function typerAf(spil) {
  return spil.typer ?? spil.braet.map((x) => (x ? 'B' : null));
}

/** @param {string[] | Set<string> | 'fuldt'} [valg] */
export function nytSpil(valg = []) {
  const liste = valg === 'fuldt' ? VALGBARE : valg;
  if (!Array.isArray(liste) && !(liste instanceof Set)) throw new RangeError('Valget skal være en liste af brikker eller "fuldt"');
  const saet = new Set(liste);
  for (const b of saet) if (!VALGBARE.includes(b)) throw new RangeError(`Ukendt brik: ${String(b)}`);
  const braet = new Array(STOERRELSE * STOERRELSE).fill(null);
  const typer = new Array(STOERRELSE * STOERRELSE).fill(null);
  for (let k = 0; k < STOERRELSE; k += 1) {
    braet[STARTRAEKKE[GUL] * STOERRELSE + k] = GUL;
    braet[STARTRAEKKE[LILLA] * STOERRELSE + k] = LILLA;
    typer[STARTRAEKKE[GUL] * STOERRELSE + k] = 'B';
    typer[STARTRAEKKE[LILLA] * STOERRELSE + k] = 'B';
    const b = BAGRAEKKE[k];
    if (saet.has(b)) {
      braet[56 + k] = GUL; typer[56 + k] = b;
      braet[k] = LILLA; typer[k] = b;
    }
  }
  const konger = saet.has('K');
  const rok = konger && saet.has('T');
  return {
    braet, typer, tur: GUL, vinder: null, aarsag: null, antalTraek: 0,
    valg: VALGBARE.filter((b) => saet.has(b)), konger,
    rokade: { wK: rok, wD: rok, bK: rok, bD: rok }, enPassant: null, halvtraek: 0,
  };
}

// Står feltet under angreb fra farven «af»?
export function angrebet(braet, typer, felt, af) {
  const r = raekke(felt);
  const k = kolonne(felt);
  const br = r - RETNING[af];
  for (const dk of [-1, 1]) {
    if (paa(br, k + dk)) {
      const f = br * 8 + k + dk;
      if (braet[f] === af && typer[f] === 'B') return true;
    }
  }
  const naer = (liste, type) => liste.some(([a, b]) => {
    const f = (r + a) * 8 + k + b;
    return paa(r + a, k + b) && braet[f] === af && typer[f] === type;
  });
  const straale = (liste, a1, a2) => liste.some(([a, b]) => {
    let rr = r + a;
    let kk = k + b;
    while (paa(rr, kk)) {
      const f = rr * 8 + kk;
      if (braet[f] !== null) return braet[f] === af && (typer[f] === a1 || typer[f] === a2);
      rr += a; kk += b;
    }
    return false;
  });
  return naer(SPRING, 'S') || naer(NABO, 'K') || straale(LIGE, 'T', 'D') || straale(SKRAA, 'L', 'D');
}

export function kongeFelt(braet, typer, farve) {
  for (let f = 0; f < 64; f += 1) if (braet[f] === farve && typer[f] === 'K') return f;
  return -1;
}

// Står spilleren, der skal flytte, i skak?
export function iSkak(spil) {
  if (!spil.konger) return false;
  const typer = typerAf(spil);
  const kf = kongeFelt(spil.braet, typer, spil.tur);
  return kf >= 0 && angrebet(spil.braet, typer, kf, modstander(spil.tur));
}

// Træk uden kontrol af egen konge (lægges i «ud»).
export function pseudoTraek(spil, typer, fra, ud) {
  const B = spil.braet;
  const farve = B[fra];
  const t = typer[fra];
  const andre = modstander(farve);
  const r = raekke(fra);
  const k = kolonne(fra);
  if (t === 'B') {
    const dr = RETNING[farve];
    const frem = r + dr;
    if (frem < 0 || frem >= STOERRELSE) return;
    const forvandl = spil.konger && frem === MAALRAEKKE[farve];
    const laeg = (til, slag, ekstra) => {
      if (forvandl) for (const f of FORVANDLINGER) ud.push({ fra, til, slag, brik: 'B', forvandling: f, ...ekstra });
      else ud.push({ fra, til, slag, brik: 'B', ...ekstra });
    };
    if (B[frem * 8 + k] === null) {
      laeg(frem * 8 + k, false);
      const frem2 = r + 2 * dr;
      if (r === STARTRAEKKE[farve] && B[frem2 * 8 + k] === null) laeg(frem2 * 8 + k, false);
    }
    for (const dk of [-1, 1]) {
      const nk = k + dk;
      if (nk < 0 || nk >= STOERRELSE) continue;
      const til = frem * 8 + nk;
      if (B[til] === andre) laeg(til, true);
      else if (spil.konger && til === spil.enPassant && B[til] === null && B[r * 8 + nk] === andre && typer[r * 8 + nk] === 'B') {
        laeg(til, true, { slagFelt: r * 8 + nk });
      }
    }
    return;
  }
  if (t === 'S' || t === 'K') {
    for (const [a, b] of (t === 'S' ? SPRING : NABO)) {
      if (!paa(r + a, k + b)) continue;
      const til = (r + a) * 8 + k + b;
      if (B[til] !== farve) ud.push({ fra, til, slag: B[til] === andre, brik: t });
    }
    if (t === 'K' && spil.konger && spil.rokade) {
      const hjem = farve === GUL ? 60 : 4;
      const side = farve === GUL ? 'w' : 'b';
      if (fra === hjem && !angrebet(B, typer, hjem, andre)) {
        const tom = (...f) => f.every((x) => B[x] === null);
        const fri = (...f) => f.every((x) => !angrebet(B, typer, x, andre));
        const taarn = (f) => B[f] === farve && typer[f] === 'T';
        if (spil.rokade[`${side}K`] && tom(hjem + 1, hjem + 2) && taarn(hjem + 3) && fri(hjem + 1, hjem + 2)) {
          ud.push({ fra, til: hjem + 2, slag: false, brik: 'K', rokade: { fra: hjem + 3, til: hjem + 1 } });
        }
        if (spil.rokade[`${side}D`] && tom(hjem - 1, hjem - 2, hjem - 3) && taarn(hjem - 4) && fri(hjem - 1, hjem - 2)) {
          ud.push({ fra, til: hjem - 2, slag: false, brik: 'K', rokade: { fra: hjem - 4, til: hjem - 1 } });
        }
      }
    }
    return;
  }
  for (const [a, b] of GLID[t]) {
    let rr = r + a;
    let kk = k + b;
    while (paa(rr, kk)) {
      const til = rr * 8 + kk;
      if (B[til] === farve) break;
      ud.push({ fra, til, slag: B[til] === andre, brik: t });
      if (B[til] !== null) break;
      rr += a; kk += b;
    }
  }
}

const RYD_ROKADE = { 60: ['wK', 'wD'], 4: ['bK', 'bD'], 63: ['wK'], 56: ['wD'], 7: ['bK'], 0: ['bD'] };

// Udfører et træk uden at afgøre spillet (bruges også af computerens søgning). Giver en ny stilling.
export function anvend(spil, typer0, tr) {
  const braet = spil.braet.slice();
  const typer = typer0.slice();
  const farve = braet[tr.fra];
  const t = typer[tr.fra];
  if (tr.slagFelt !== undefined) { braet[tr.slagFelt] = null; typer[tr.slagFelt] = null; }
  braet[tr.til] = farve; typer[tr.til] = tr.forvandling ?? t;
  braet[tr.fra] = null; typer[tr.fra] = null;
  if (tr.rokade) {
    braet[tr.rokade.til] = farve; typer[tr.rokade.til] = 'T';
    braet[tr.rokade.fra] = null; typer[tr.rokade.fra] = null;
  }
  let rokade = spil.rokade ?? null;
  if (spil.konger && rokade) {
    const ryd = [...(RYD_ROKADE[tr.fra] ?? []), ...(RYD_ROKADE[tr.til] ?? [])];
    if (ryd.some((x) => rokade[x])) {
      rokade = { ...rokade };
      for (const x of ryd) rokade[x] = false;
    }
  }
  return {
    braet, typer, tur: modstander(spil.tur), vinder: null, aarsag: null,
    antalTraek: spil.antalTraek + 1, valg: spil.valg ?? [], konger: !!spil.konger, rokade,
    enPassant: spil.konger && t === 'B' && Math.abs(tr.til - tr.fra) === 16 ? (tr.fra + tr.til) / 2 : null,
    halvtraek: t === 'B' || tr.slag ? 0 : (spil.halvtraek ?? 0) + 1,
  };
}

// Alle lovlige træk for den, der skal flytte, eller kun fra ét felt.
export function lovligeTraek(spil, fraFelt = null) {
  if (spil.vinder) return [];
  const typer = typerAf(spil);
  const farve = spil.tur;
  const ud = [];
  const felter = fraFelt === null ? spil.braet.keys() : [fraFelt];
  for (const fra of felter) {
    if (!erFelt(fra)) throw new RangeError(`Ugyldigt felt: ${String(fra)}`);
    if (spil.braet[fra] === farve) pseudoTraek(spil, typer, fra, ud);
  }
  if (!spil.konger) return ud;
  const andre = modstander(farve);
  return ud.filter((tr) => {
    const n = anvend(spil, typer, tr);
    const kf = kongeFelt(n.braet, n.typer, farve);
    return kf < 0 || !angrebet(n.braet, n.typer, kf, andre);
  });
}

export function erLovligt(spil, fra, til) {
  return lovligeTraek(spil, fra).some((t) => t.til === til);
}

// Antal brikker (alle typer) af en farve.
export function taelBonder(spil, farve) {
  let antal = 0;
  for (const felt of spil.braet) if (felt === farve) antal += 1;
  return antal;
}

function forLidtMateriale(n) {
  const rest = n.typer.filter((t) => t && t !== 'K');
  return rest.length === 0 || (rest.length === 1 && (rest[0] === 'S' || rest[0] === 'L'));
}

function afgoer(n, mover, tr) {
  const andre = modstander(mover);
  const antal = lovligeTraek(n).length;
  if (n.konger) {
    if (antal === 0) {
      const kf = kongeFelt(n.braet, n.typer, andre);
      const mat = kf >= 0 && angrebet(n.braet, n.typer, kf, mover);
      n.vinder = mat ? mover : 'uafgjort';
      n.aarsag = mat ? 'skakmat' : 'patt';
    } else if (n.halvtraek >= REMIS_HALVTRAEK) {
      n.vinder = 'uafgjort'; n.aarsag = 'remis50';
    } else if (forLidtMateriale(n)) {
      n.vinder = 'uafgjort'; n.aarsag = 'materiale';
    }
    return;
  }
  if (n.typer[tr.til] === 'B' && raekke(tr.til) === MAALRAEKKE[mover]) {
    n.vinder = mover; n.aarsag = 'maal';
  } else if (taelBonder(n, andre) === 0) {
    n.vinder = mover; n.aarsag = 'alle';
  } else if (antal === 0) {
    n.vinder = mover; n.aarsag = 'blokeret';
  } else if (n.halvtraek >= REMIS_HALVTRAEK) {
    n.vinder = 'uafgjort'; n.aarsag = 'remis50';
  }
}

// Udfører et træk og giver et NYT spil. Kaster Error ved ulovligt træk.
// Forvandling (kun med konger): 'D' (standard), 'T', 'L' eller 'S'.
export function udfoer(spil, fra, til, forvandling = undefined) {
  if (spil.vinder) throw new Error('Spillet er slut');
  if (!erFelt(fra) || !erFelt(til)) throw new RangeError('Ugyldigt felt');
  const muligt = lovligeTraek(spil, fra).filter((t) => t.til === til);
  if (muligt.length === 0) throw new Error(`Ulovligt træk ${fra} -> ${til}`);
  const traek = muligt.length === 1 && !muligt[0].forvandling ? muligt[0] : muligt.find((t) => t.forvandling === (forvandling ?? 'D'));
  if (!traek) throw new Error(`Ugyldig forvandling: ${String(forvandling)}`);
  const naeste = anvend(spil, typerAf(spil), traek);
  afgoer(naeste, spil.tur, traek);
  return { spil: naeste, slag: traek.slag, traek };
}

// Stilling fra FEN (til test): store bogstaver = gul, små = lilla.
export function fraFen(fen) {
  const [stilling, side, rok = '-', ep = '-', halv = '0'] = String(fen).trim().split(/\s+/);
  const braet = new Array(64).fill(null);
  const typer = new Array(64).fill(null);
  const MAP = { p: 'B', n: 'S', b: 'L', r: 'T', q: 'D', k: 'K' };
  const raekker = stilling.split('/');
  if (raekker.length !== 8) throw new RangeError('Ugyldig FEN');
  raekker.forEach((linje, r) => {
    let k = 0;
    for (const c of linje) {
      if (/\d/.test(c)) { k += Number(c); continue; }
      const t = MAP[c.toLowerCase()];
      if (!t || k > 7) throw new RangeError('Ugyldig FEN');
      braet[r * 8 + k] = c === c.toUpperCase() ? GUL : LILLA;
      typer[r * 8 + k] = t;
      k += 1;
    }
  });
  const konger = kongeFelt(braet, typer, GUL) >= 0 && kongeFelt(braet, typer, LILLA) >= 0;
  const enPassant = ep === '-' ? null : (8 - Number(ep[1])) * 8 + 'abcdefgh'.indexOf(ep[0]);
  return {
    braet, typer, tur: side === 'b' ? LILLA : GUL, vinder: null, aarsag: null, antalTraek: 0,
    valg: [...new Set(typer.filter((t) => t && t !== 'B'))], konger,
    rokade: { wK: rok.includes('K'), wD: rok.includes('Q'), bK: rok.includes('k'), bD: rok.includes('q') },
    enPassant, halvtraek: Number(halv) || 0,
  };
}

// Antal stillinger efter «dybde» halvtræk (perft): standardmålet for, om trækgeneratoren er rigtig.
export function perft(spil, dybde) {
  if (dybde === 0) return 1;
  const traek = lovligeTraek(spil);
  if (dybde === 1) return traek.length;
  const typer = typerAf(spil);
  let sum = 0;
  for (const t of traek) sum += perft(anvend(spil, typer, t), dybde - 1);
  return sum;
}
