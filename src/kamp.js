// Bondeskak: plan for animationerne. Ren logik, så den kan testes uden browser.
// Et almindeligt træk er én bevægelse, der passer til brikken: bonden og kongen hopper, tårnet glider tungt,
// løberen svæver skråt med gnister, dronningen flyver, og hesten springer i en høj bue.
// Et slag er en kamp i tre akter: brikkerne løber mod hinanden, slår med sværd, og den tabende falder.

export const TRIN_VARIGHED = { hop: 520, glid: 560, svaev: 640, spring: 680, loeb: 480, slag: 640, fald: 760 };
const STIL = { B: 'hop', K: 'hop', T: 'glid', L: 'glid', D: 'svaev', S: 'spring' };
const PR_FELT_MS = 70;
const MAKS_EKSTRA_MS = 420;

// Hvordan brikken bevæger sig ('hop', 'glid', 'svaev' eller 'spring').
export function bevaegelse(brik = 'B') {
  return STIL[brik] ?? 'hop';
}

// Antal felter mellem fra og til (konge-afstand); 1, hvis det ikke kan regnes ud.
export function afstand(traek) {
  if (!Number.isInteger(traek.fra) || !Number.isInteger(traek.til)) return 1;
  const dr = Math.abs(Math.floor(traek.til / 8) - Math.floor(traek.fra / 8));
  const dk = Math.abs((traek.til % 8) - (traek.fra % 8));
  return Math.max(1, dr, dk);
}

export function kampTrin(traek) {
  if (!traek || typeof traek !== 'object') throw new TypeError('Mangler træk');
  if (!traek.slag) {
    const stil = bevaegelse(traek.brik);
    return [{ type: stil, ms: TRIN_VARIGHED[stil] + Math.min(MAKS_EKSTRA_MS, (afstand(traek) - 1) * PR_FELT_MS) }];
  }
  return ['loeb', 'slag', 'fald'].map((type) => ({ type, ms: TRIN_VARIGHED[type] }));
}

export function samletVarighed(trin) {
  return trin.reduce((sum, t) => sum + t.ms, 0);
}

const SEJRSTEKST = {
  maal: 'kom helt over til den anden side',
  alle: 'slog alle de andre brikker',
  blokeret: 'spærrede vejen, så der ikke var flere træk',
  skakmat: 'satte kongen skakmat',
};

export function sejrsTekst(aarsag) {
  return SEJRSTEKST[aarsag] ?? 'vandt';
}

const UAFGJORT = {
  patt: 'Ingen kunne flytte, men kongen stod ikke i skak. Det hedder patt.',
  remis50: '50 træk i træk uden slag eller bondetræk.',
  materiale: 'Der er ikke brikker nok tilbage til at sætte skakmat.',
};

export function uafgjortTekst(aarsag) {
  return UAFGJORT[aarsag] ?? 'Ingen vandt denne gang.';
}

// Felt-navn til oplæsning/tilgængelighed: kolonne A-H og række 1-8 (række 8 er øverst).
export function feltNavn(felt) {
  if (!Number.isInteger(felt) || felt < 0 || felt > 63) throw new RangeError('Ugyldigt felt');
  return `${'ABCDEFGH'[felt % 8]}${8 - Math.floor(felt / 8)}`;
}
