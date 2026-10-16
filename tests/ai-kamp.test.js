import test from 'node:test';
import assert from 'node:assert/strict';
import { nytSpil, lovligeTraek, udfoer } from '../src/regler.js';
import { vaelgTraek, tip, NIVEAUER } from '../src/ai.js';
import { kampTrin, samletVarighed, sejrsTekst, feltNavn } from '../src/kamp.js';

test('der er 10 niveauer, og de bliver gradvist stærkere', () => {
  assert.equal(NIVEAUER.length, 10);
  for (let i = 1; i < 10; i += 1) {
    assert.ok(NIVEAUER[i].dybde >= NIVEAUER[i - 1].dybde);
    assert.ok(NIVEAUER[i].kikser <= NIVEAUER[i - 1].kikser);
  }
});

test('alle niveauer vælger et lovligt træk', () => {
  for (let n = 1; n <= 10; n += 1) {
    const s = nytSpil();
    const v = vaelgTraek(s, n);
    assert.ok(lovligeTraek(s).some((t) => t.fra === v.fra && t.til === v.til));
  }
});

test('ugyldigt niveau og afsluttet spil kaster', () => {
  for (const n of [0, 11, 2.5, '3', null]) assert.throws(() => vaelgTraek(nytSpil(), n), RangeError);
  assert.throws(() => vaelgTraek({ ...nytSpil(), vinder: 'w' }, 5), /slut/);
  assert.throws(() => tip({ ...nytSpil(), vinder: 'w' }), /slut/);
});

test('et sejrstræk tages af stærke niveauer', () => {
  const braet = Array(64).fill(null);
  braet[8] = 'w'; braet[60] = 'b';
  const s = { braet, tur: 'w', vinder: null, aarsag: null, antalTraek: 0 };
  for (const n of [7, 8, 9, 10]) {
    const v = vaelgTraek(s, n);
    assert.equal(udfoer(s, v.fra, v.til).spil.vinder, 'w');
  }
});

test('tip giver et lovligt træk', () => {
  const s = nytSpil();
  const t = tip(s);
  assert.ok(lovligeTraek(s).some((x) => x.fra === t.fra && x.til === t.til));
});

test('kampplan: hop eller løb-slag-fald', () => {
  assert.deepEqual(kampTrin({ slag: false }).map((t) => t.type), ['hop']);
  assert.deepEqual(kampTrin({ slag: true }).map((t) => t.type), ['loeb', 'slag', 'fald']);
  assert.throws(() => kampTrin(null), TypeError);
  assert.ok(samletVarighed(kampTrin({ slag: true })) > samletVarighed(kampTrin({ slag: false })));
});

test('tekster og feltnavne', () => {
  assert.match(sejrsTekst('maal'), /anden side/);
  assert.match(sejrsTekst('alle'), /alle/);
  assert.match(sejrsTekst('blokeret'), /spærrede/);
  assert.equal(sejrsTekst('??'), 'vandt');
  assert.equal(feltNavn(0), 'A8');
  assert.equal(feltNavn(63), 'H1');
  assert.throws(() => feltNavn(64), RangeError);
});
