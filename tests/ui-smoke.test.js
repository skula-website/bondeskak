// Røgtest af brugerfladen i Node med et minimalt falsk DOM (ingen browser findes på minen).
// Fanger kørselsfejl i site/spil.js og følger et helt spil: vælg bonde, flyt, kamp, computerens svar.
import test from 'node:test';
import assert from 'node:assert/strict';

class Liste {
  constructor() { this.s = new Set(); }
  add(...k) { k.forEach((x) => this.s.add(x)); }
  remove(...k) { k.forEach((x) => this.s.delete(x)); }
  toggle(k, t) { if (t) this.s.add(k); else this.s.delete(k); }
  contains(k) { return this.s.has(k); }
}
class Elm {
  constructor(tag) {
    this.tag = tag; this.children = []; this.style = {}; this.dataset = {}; this.attrs = {};
    this.classList = new Liste(); this.lyttere = {}; this.hidden = false; this.textContent = ''; this.parentElement = null;
    this.clientHeight = 500;
  }
  set className(v) { this.classList = new Liste(); String(v).split(/\s+/).filter(Boolean).forEach((x) => this.classList.add(x)); }
  append(...b) { b.forEach((x) => { x.parentElement = this; this.children.push(x); }); }
  replaceChildren(...b) { this.children = []; this.append(...b); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((x) => x !== this); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(n, f) { this.lyttere[n] = f; }
  animate() { this.antalAnim = (this.antalAnim ?? 0) + 1; return { finished: Promise.resolve() }; }
  getAnimations() { return []; }
  focus() {}
  click() { this.lyttere.click?.({ currentTarget: this }); }
}
const ider = {};
globalThis.document = {
  getElementById: (id) => (ider[id] ??= new Elm('div')),
  createElement: (t) => new Elm(t),
};
globalThis.matchMedia = () => ({ matches: true });
globalThis.localStorage = { getItem: () => null, setItem() {} };
ider['braet-ramme'] = new Elm('div');
ider.braet = new Elm('div'); ider.braet.parentElement = ider['braet-ramme'];

const sov = (ms) => new Promise((r) => setTimeout(r, ms));

test('brugerfladen starter og et helt spil kan spilles uden fejl', async () => {
  await import('../site/spil.js');
  const sp = globalThis.__bondeskak;
  assert.equal(ider.braet.children.length, 64);
  assert.equal(ider.bonder.children.length, 16);
  assert.equal(ider.stjerner.children.length, 10);

  ider.stjerner.children[0].click(); // niveau 1: tilfældig computer
  assert.match(ider['niveau-navn'].textContent, /Niveau 1/);

  for (let t = 0; t < 60 && !sp.spil.vinder; t += 1) {
    const { lovligeTraek } = await import('../src/regler.js');
    const mine = lovligeTraek(sp.spil);
    const valg = mine.find((m) => m.slag) ?? mine[0];
    sp.klikFelt(valg.fra);
    assert.ok(ider.braet.children[valg.fra].classList.contains('valgt'));
    sp.klikFelt(valg.til);
    for (let i = 0; i < 200 && sp.optaget && !sp.spil.vinder; i += 1) await sov(5);
  }
  assert.ok(sp.spil.vinder, 'spillet skulle slutte');
  await sov(100);
  assert.equal(ider.slut.hidden, false);
  assert.ok(ider['slut-titel'].textContent.length > 0);

  ider.igen.click();
  assert.equal(ider.slut.hidden, true);
  assert.equal(ider.bonder.children.length, 16);
  ider.tip.click();
  ider.lyd.click();
  assert.equal(ider.lyd.attrs['aria-pressed'], 'false');
});
