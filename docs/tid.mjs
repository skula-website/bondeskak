// Måler hvor lang tid computeren bruger på første træk og midtvejs i spillet.
import { nytSpil, udfoer } from '../src/regler.js';
import { vaelgTraek } from '../src/ai.js';

let spil = nytSpil();
for (const niveau of [4, 7, 8, 9, 10]) {
  const t0 = Date.now();
  vaelgTraek(spil, niveau);
  console.log(`niveau ${niveau}: ${Date.now() - t0} ms (start)`);
}
for (let i = 0; i < 12 && !spil.vinder; i += 1) {
  const t = vaelgTraek(spil, 6);
  spil = udfoer(spil, t.fra, t.til).spil;
}
const t0 = Date.now();
vaelgTraek(spil, 10);
console.log(`niveau 10 efter 12 træk: ${Date.now() - t0} ms`);
