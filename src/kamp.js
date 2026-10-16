// Bondeskak: plan for animationerne. Ren logik, så den kan testes uden browser.
// Et almindeligt træk er ét hop. Et slag er en kamp i tre akter:
// bønderne løber mod hinanden, slår med sværd, og den tabende falder.

export const TRIN_VARIGHED = { hop: 520, loeb: 480, slag: 640, fald: 760 };

export function kampTrin(traek) {
  if (!traek || typeof traek !== 'object') throw new TypeError('Mangler træk');
  if (!traek.slag) return [{ type: 'hop', ms: TRIN_VARIGHED.hop }];
  return ['loeb', 'slag', 'fald'].map((type) => ({ type, ms: TRIN_VARIGHED[type] }));
}

export function samletVarighed(trin) {
  return trin.reduce((sum, t) => sum + t.ms, 0);
}

const SEJRSTEKST = {
  maal: 'kom helt over til den anden side',
  alle: 'slog alle de andre bønder',
  blokeret: 'spærrede vejen, så der ikke var flere træk',
};

export function sejrsTekst(aarsag) {
  return SEJRSTEKST[aarsag] ?? 'vandt';
}

// Felt-navn til oplæsning/tilgængelighed: kolonne A-H og række 1-8 (række 8 er øverst).
export function feltNavn(felt) {
  if (!Number.isInteger(felt) || felt < 0 || felt > 63) throw new RangeError('Ugyldigt felt');
  return `${'ABCDEFGH'[felt % 8]}${8 - Math.floor(felt / 8)}`;
}
