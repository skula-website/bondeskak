// Regler for de tilvalgte brikker (tårn, hest, løber, dronning, konge) og fuldt skak.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nytSpil, lovligeTraek, udfoer, fraFen, perft, iSkak } from '../src/regler.js';
import { vaelgTraek } from '../src/ai.js';

const til = (s, fra) => lovligeTraek(s, fra).map((t) => t.til).sort((a, b) => a - b);

test('startstillingen i fuldt skak har 20 træk og 8902 stillinger efter 3 halvtræk', () => {
  assert.equal(lovligeTraek(nytSpil('fuldt')).length, 20);
  assert.equal(perft(nytSpil('fuldt'), 3), 8902);
});

test('hver brik går, som den skal', () => {
  const s = fraFen('8/8/8/3N4/8/8/8/8 w - - 0 1');
  assert.deepEqual(til(s, 27), [10, 12, 17, 21, 33, 37, 42, 44]);
  const t = fraFen('8/8/8/8/3R4/8/3p4/8 w - - 0 1');
  assert.deepEqual(til(t, 35), [3, 11, 19, 27, 32, 33, 34, 36, 37, 38, 39, 43, 51]);
  const l = fraFen('8/8/8/8/3B4/8/8/8 w - - 0 1');
  assert.equal(til(l, 35).length, 13);
});

test('rokade kun når vejen er fri og ikke under angreb', () => {
  const fri = fraFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(til(fri, 60).includes(62) && til(fri, 60).includes(58));
  const angrebet = fraFen('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1');
  assert.ok(!til(angrebet, 60).includes(62));
  const r = udfoer(fri, 60, 62).spil;
  assert.equal(r.typer[61], 'T');
  assert.equal(r.typer[63], null);
});

test('en passant og forvandling', () => {
  let s = fraFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  const ep = lovligeTraek(s, 28).find((t) => t.slagFelt !== undefined);
  assert.equal(ep.til, 19);
  s = udfoer(s, 28, 19).spil;
  assert.equal(s.braet[27], null);
  const p = udfoer(fraFen('7k/P7/8/8/8/8/8/K7 w - - 0 1'), 8, 0).spil;
  assert.equal(p.typer[0], 'D');
});

test('man må ikke sætte sin egen konge i skak', () => {
  const s = fraFen('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1');
  assert.ok(iSkak(fraFen('4k3/4r3/8/8/8/8/8/4K3 w - - 0 1')));
  assert.deepEqual(til(s, 52), []);
});

test('computeren finder mat i ét træk', () => {
  const s = fraFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
  const v = vaelgTraek(s, 7, () => 0.5);
  assert.equal(udfoer(s, v.fra, v.til).spil.aarsag, 'skakmat');
});
