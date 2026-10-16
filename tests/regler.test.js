import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nytSpil, lovligeTraek, udfoer, erLovligt, taelBonder, modstander, raekke, kolonne, GUL, LILLA,
} from '../src/regler.js';

const tomt = (tur = GUL) => ({ braet: Array(64).fill(null), tur, vinder: null, aarsag: null, antalTraek: 0 });

test('startstilling: 8 bønder hver og 16 lovlige træk', () => {
  const s = nytSpil();
  assert.equal(taelBonder(s, GUL), 8);
  assert.equal(taelBonder(s, LILLA), 8);
  assert.equal(s.tur, GUL);
  assert.equal(lovligeTraek(s).length, 16);
});

test('hjælpefunktioner', () => {
  assert.equal(modstander(GUL), LILLA);
  assert.equal(modstander(LILLA), GUL);
  assert.throws(() => modstander('x'), RangeError);
  assert.equal(raekke(10), 1);
  assert.equal(kolonne(10), 2);
});

test('dobbelttræk kun fra startrækken og kun over tomme felter', () => {
  const s = tomt();
  s.braet[48] = GUL; s.braet[40] = LILLA;
  assert.deepEqual(lovligeTraek(s, 48), []);
  const t = tomt();
  t.braet[48] = GUL; t.braet[32] = LILLA;
  assert.deepEqual(lovligeTraek(t, 48).map((x) => x.til), [40]);
  const u = tomt();
  u.braet[40] = GUL;
  assert.deepEqual(lovligeTraek(u, 40).map((x) => x.til), [32]);
});

test('slag går kun på skrå og kun mod modstanderen', () => {
  const s = tomt();
  s.braet[41] = GUL; s.braet[32] = LILLA; s.braet[34] = LILLA; s.braet[33] = GUL;
  const til = lovligeTraek(s, 41).map((x) => `${x.til}${x.slag ? 's' : ''}`).sort();
  assert.deepEqual(til, ['32s', '34s']);
});

test('kanten af brættet giver ingen slag udenfor', () => {
  const s = tomt();
  s.braet[40] = GUL; s.braet[33] = LILLA;
  assert.deepEqual(lovligeTraek(s, 40).map((x) => x.til).sort(), [32, 33]);
});

test('udfoer er uforanderlig og skifter tur', () => {
  const s = nytSpil();
  const kopi = JSON.stringify(s);
  const { spil, slag } = udfoer(s, 52, 44);
  assert.equal(JSON.stringify(s), kopi);
  assert.equal(slag, false);
  assert.equal(spil.tur, LILLA);
  assert.equal(spil.braet[44], GUL);
  assert.equal(spil.braet[52], null);
  assert.equal(spil.antalTraek, 1);
});

test('sejr ved at nå målrækken', () => {
  const s = tomt();
  s.braet[8] = GUL; s.braet[60] = LILLA;
  const r = udfoer(s, 8, 0);
  assert.equal(r.spil.vinder, GUL);
  assert.equal(r.spil.aarsag, 'maal');
});

test('sejr ved at slå alle', () => {
  const s = tomt();
  s.braet[41] = GUL; s.braet[34] = LILLA;
  const r = udfoer(s, 41, 34);
  assert.equal(r.slag, true);
  assert.equal(r.spil.aarsag, 'alle');
});

test('sejr når modstanderen er blokeret', () => {
  const s = tomt();
  s.braet[10] = LILLA; s.braet[18] = GUL; s.braet[56] = GUL; s.braet[48] = GUL;
  // lilla på 10 er spærret af gul på 18; gul trækker 48->40, lilla kan intet
  const r = udfoer(s, 48, 40);
  assert.equal(r.spil.vinder, GUL);
  assert.equal(r.spil.aarsag, 'blokeret');
});

test('ulovlige træk kaster', () => {
  const s = nytSpil();
  assert.throws(() => udfoer(s, 52, 28), Error);
  assert.throws(() => udfoer(s, 12, 20), Error);
  assert.throws(() => udfoer(s, -1, 0), RangeError);
  assert.throws(() => udfoer(s, 52, 64), RangeError);
  assert.throws(() => lovligeTraek(s, 99), RangeError);
  assert.throws(() => udfoer({ ...s, vinder: GUL }, 52, 44), /slut/);
  assert.deepEqual(lovligeTraek({ ...s, vinder: GUL }), []);
  assert.equal(erLovligt(s, 52, 44), true);
  assert.equal(erLovligt(s, 52, 36 - 4), false);
});
