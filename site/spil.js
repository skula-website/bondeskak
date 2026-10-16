// Bondeskak: brugerfladen. Reglerne og computeren ligger i ../src (testet i Node).
import { nytSpil, lovligeTraek, udfoer, GUL, LILLA, raekke, kolonne } from '../src/regler.js';
import { vaelgTraek, tip } from '../src/ai.js';
import { kampTrin, sejrsTekst, feltNavn } from '../src/kamp.js';

const NIVEAUNAVN = [
  'Sovende gris', 'Lille kylling', 'Glad kanin', 'Nysgerrig ræv', 'Modig ulv',
  'Snu ugle', 'Stærk bjørn', 'Klog drage', 'Skak-troldmand', 'Mester-konge',
];
const reduceretBevaegelse = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tempo = reduceretBevaegelse ? 0.05 : 1;

const $ = (id) => document.getElementById(id);
const braetEl = $('braet');
const bonderEl = $('bonder');
const effekterEl = $('effekter');
const statusEl = $('status');
const slutEl = $('slut');

let spil = nytSpil();
let niveau = hentNiveau();
let valgt = null;
let optaget = false;
let omgang = 0;
let lydPaa = true;
let bonder = new Map(); // felt -> element
let tipTimer = null;

// ---------- hjælpere ----------
function hentNiveau() {
  try {
    const n = Number(localStorage.getItem('bondeskak-niveau'));
    if (Number.isInteger(n) && n >= 1 && n <= 10) return n;
  } catch { /* privat tilstand: ingen lagring */ }
  return 3;
}
const vent = (ms) => new Promise((r) => setTimeout(r, ms * tempo));
const pos = (felt) => ({ x: kolonne(felt) * 12.5, y: raekke(felt) * 12.5 });
function el(tag, klasse, tekst) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst) e.textContent = tekst;
  return e;
}
function anim(e, keyframes, ms, valg = {}) {
  return e.animate(keyframes, { duration: Math.max(1, ms * tempo), fill: 'forwards', easing: 'ease-in-out', ...valg }).finished;
}

// ---------- lyd ----------
let lydCtx = null;
function bip(frekvens, varighed, type = 'sine', start = 0, glid = 0, styrke = 0.15) {
  if (!lydPaa) return;
  try {
    lydCtx ??= new AudioContext();
    const t0 = lydCtx.currentTime + start;
    const o = lydCtx.createOscillator();
    const g = lydCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frekvens, t0);
    if (glid) o.frequency.exponentialRampToValueAtTime(Math.max(30, frekvens + glid), t0 + varighed);
    g.gain.setValueAtTime(styrke, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + varighed);
    o.connect(g).connect(lydCtx.destination);
    o.start(t0);
    o.stop(t0 + varighed);
  } catch { /* ingen lyd er også i orden */ }
}
const lyd = {
  hop: () => bip(520, 0.12, 'triangle', 0, 260),
  loeb: () => { bip(220, 0.1, 'square', 0, 0, 0.06); bip(240, 0.1, 'square', 0.14, 0, 0.06); },
  slag: () => { bip(900, 0.12, 'sawtooth', 0, -600); bip(1200, 0.1, 'square', 0.1, -800); bip(120, 0.25, 'square', 0.05, -60, 0.2); },
  fald: () => bip(700, 0.55, 'triangle', 0, -600),
  sejr: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => bip(f, 0.2, 'triangle', i * 0.13)),
  tab: () => [392, 330, 262].forEach((f, i) => bip(f, 0.3, 'triangle', i * 0.2)),
  klik: () => bip(660, 0.05, 'sine'),
};

// ---------- tegning ----------
const HATTE = {
  gul: '<path class="k" d="M28 40 C28 23 38 15 50 15 C62 15 72 23 72 40 Z" fill="url(#g-hat-gul)"/>'
    + '<path class="k" d="M18 41 Q50 30 82 41 Q50 50 18 41 Z" fill="url(#g-hat-gul)"/>'
    + '<path d="M30 35 Q50 29 70 35" stroke="#e0533d" stroke-width="4" fill="none" stroke-linecap="round"/>',
  lilla: '<path d="M50 16 C47 5 58 -1 66 3 C59 5 56 10 54 17 Z" fill="#ff5d8f" stroke="#a3124a" stroke-width="2"/>'
    + '<path class="k" d="M28 42 C28 22 38 13 50 13 C62 13 72 22 72 42 Z" fill="url(#g-hat-lilla)"/>'
    + '<rect class="k" x="25" y="37" width="50" height="8" rx="4" fill="url(#g-hat-lilla)"/>'
    + '<path d="M38 20 Q42 16 47 15" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>',
};
function bondeSvg(navn) {
  const blink = (-Math.random() * 4.6).toFixed(2);
  const sx = navn === 'gul' ? 76 : 18; // sværdet i den hånd, der vender mod modstanderen
  return '<svg viewBox="0 0 100 100" aria-hidden="true">'
    + `<path class="k" d="M30 91 C28 75 33 63 43 59 L57 59 C67 63 72 75 70 91 Z" fill="url(#g-krop-${navn})"/>`
    + `<ellipse class="k" cx="50" cy="90" rx="25" ry="6.5" fill="url(#g-krop-${navn})"/>`
    + '<path d="M38 66 Q35 76 36 85" stroke="#fff" stroke-opacity=".5" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
    + '<path d="M34 75 Q50 80 66 75" stroke="var(--moerk)" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<rect x="46" y="74" width="8" height="7" rx="2" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>'
    + '<circle class="k" cx="50" cy="45" r="19" fill="url(#g-hud)"/>'
    + '<ellipse cx="37.5" cy="52" rx="4.2" ry="2.7" fill="#ff7aa2" opacity=".5"/><ellipse cx="62.5" cy="52" rx="4.2" ry="2.7" fill="#ff7aa2" opacity=".5"/>'
    + `<g class="ojne" style="animation-delay:${blink}s"><ellipse cx="43" cy="46" rx="3.4" ry="4.5" fill="#2b2250"/><ellipse cx="57" cy="46" rx="3.4" ry="4.5" fill="#2b2250"/>`
    + '<circle cx="44.3" cy="44.2" r="1.4" fill="#fff"/><circle cx="58.3" cy="44.2" r="1.4" fill="#fff"/></g>'
    + '<path d="M45 54.5 Q50 59.5 55 54.5" stroke="#8a1c4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + HATTE[navn]
    + `<g class="sverd"><rect x="${sx}" y="30" width="6" height="36" rx="2.5" fill="url(#g-staal)" stroke="#5d6b7e" stroke-width="1.5"/>`
    + `<rect x="${sx - 6}" y="64" width="18" height="5" rx="2.5" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>`
    + `<rect x="${sx + 1}" y="68" width="4" height="10" rx="2" fill="#7a4a1e"/></g>`
    + '</svg>';
}
function lavBonde(farve) {
  const navn = farve === GUL ? 'gul' : 'lilla';
  const b = el('div', `bonde ${navn}-bonde`);
  const skygge = el('div', 'skygge');
  const figur = el('div', 'figur');
  const aande = el('div', 'aande');
  aande.style.animationDelay = `${(-Math.random() * 1.7).toFixed(2)}s`;
  aande.innerHTML = bondeSvg(navn);
  figur.append(aande);
  b.append(skygge, figur);
  b.dele = { skygge, figur };
  return b;
}
function placer(b, felt) {
  const { x, y } = pos(felt);
  b.style.left = `${x}%`;
  b.style.top = `${y}%`;
}

function byggBraet() {
  braetEl.replaceChildren();
  for (let f = 0; f < 64; f += 1) {
    const c = el('button', `felt${(raekke(f) + kolonne(f)) % 2 ? ' moerk' : ''}`);
    c.type = 'button';
    c.dataset.felt = String(f);
    c.addEventListener('click', () => klikFelt(f));
    braetEl.append(c);
  }
}
function byggBonder() {
  bonderEl.replaceChildren();
  bonder = new Map();
  spil.braet.forEach((farve, f) => {
    if (!farve) return;
    const b = lavBonde(farve);
    placer(b, f);
    bonderEl.append(b);
    bonder.set(f, b);
  });
}
function opdaterFelter() {
  bonder.forEach((b, f) => b.classList.toggle('loeftet', f === valgt));
  const maal = new Map(valgt === null ? [] : lovligeTraek(spil, valgt).map((t) => [t.til, t]));
  for (const c of /** @type {HTMLCollectionOf<HTMLElement>} */ (braetEl.children)) {
    const f = Number(c.dataset.felt);
    c.classList.toggle('valgt', f === valgt);
    c.classList.toggle('maal', maal.has(f) && !maal.get(f).slag);
    c.classList.toggle('slagmaal', maal.has(f) && maal.get(f).slag);
    const farve = spil.braet[f];
    const hvem = farve === GUL ? 'gul bonde' : farve === LILLA ? 'lilla bonde' : 'tomt felt';
    c.setAttribute('aria-label', `${feltNavn(f)}, ${hvem}${maal.has(f) ? ', du kan flytte hertil' : ''}`);
    c.classList.remove('tip');
  }
}
function sigStatus(tekst, lilla = false) {
  statusEl.textContent = tekst;
  statusEl.classList.toggle('lilla', lilla);
}

// ---------- effekter ----------
function midtpunkt(felt1, felt2) {
  const a = pos(felt1); const b = pos(felt2);
  return { x: (a.x + b.x) / 2 + 6.25, y: (a.y + b.y) / 2 + 6.25 };
}
function pow(x, y) {
  const ord = ['POW!', 'BAM!', 'KLING!', 'ØV!'][Math.floor(Math.random() * 4)];
  const p = el('div', 'pow', ord);
  p.style.left = `${x}%`; p.style.top = `${y}%`;
  effekterEl.append(p);
  anim(p, [{ transform: 'translate(-50%,-50%) scale(.2) rotate(-15deg)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.3) rotate(8deg)', opacity: 1, offset: 0.35 },
    { transform: 'translate(-50%,-90%) scale(1) rotate(-4deg)', opacity: 0 }], 700).then(() => p.remove());
  for (let i = 0; i < 10; i += 1) {
    const g = el('div', 'gnist');
    const str = 5 + Math.random() * 6;
    g.style.cssText = `left:${x}%;top:${y}%;width:${str}px;height:${str}px;border-radius:50%;background:${['#ffe066', '#ff5d8f', '#fff', '#4cc9f0'][i % 4]};box-shadow:0 0 6px #fff`;
    effekterEl.append(g);
    const v = (i / 10) * Math.PI * 2;
    anim(g, [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(v) * (36 + Math.random() * 24)}px,${Math.sin(v) * (36 + Math.random() * 24)}px) scale(.2)`, opacity: 0 }], 520,
    { easing: 'cubic-bezier(.1,.8,.3,1)' }).then(() => g.remove());
  }
}
function stoev(x, y, antal = 6) {
  for (let i = 0; i < antal; i += 1) {
    const d = el('div', 'stoev');
    const str = 6 + Math.random() * 6;
    d.style.cssText = `left:${x}%;top:${y}%;width:${str}px;height:${str}px`;
    effekterEl.append(d);
    const side = i % 2 ? 1 : -1;
    anim(d, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 },
      { transform: `translate(calc(-50% + ${side * (14 + Math.random() * 18)}px),calc(-50% - ${4 + Math.random() * 10}px)) scale(1.4)`, opacity: 0 }],
    420 + Math.random() * 200, { easing: 'cubic-bezier(.2,.7,.3,1)' }).then(() => d.remove());
  }
}
function roeg(x, y) {
  for (let i = 0; i < 9; i += 1) {
    const r = el('div', 'roeg');
    const str = 14 + Math.random() * 14;
    r.style.cssText = `left:${x}%;top:${y}%;width:${str}px;height:${str}px`;
    effekterEl.append(r);
    const v = (i / 9) * Math.PI * 2;
    anim(r, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(v) * 26}px),calc(-50% + ${Math.sin(v) * 22 - 10}px)) scale(1.5)`, opacity: 0 }],
    600 + Math.random() * 200, { easing: 'cubic-bezier(.2,.7,.3,1)' }).then(() => r.remove());
  }
}
function glimt(x, y) {
  const g = el('div', 'glimt');
  g.style.left = `${x}%`; g.style.top = `${y}%`;
  effekterEl.append(g);
  anim(g, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }], 380,
    { easing: 'cubic-bezier(.1,.8,.3,1)' }).then(() => g.remove());
}
function stjerner(x, y) {
  for (let i = 0; i < 6; i += 1) {
    const s = el('div', 'stjerne', '⭐');
    s.style.left = `${x}%`; s.style.top = `${y}%`;
    effekterEl.append(s);
    const v = (i / 6) * Math.PI * 2 - Math.PI / 2;
    anim(s, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(v) * 60}px),calc(-50% + ${Math.sin(v) * 60 - 20}px)) scale(1.2) rotate(240deg)`, opacity: 0 }], 800).then(() => s.remove());
  }
}
function ryst() {
  anim(braetEl.parentElement, [{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,3px)' }, { transform: 'translate(5px,-3px)' },
    { transform: 'translate(-3px,-2px)' }, { transform: 'translate(0,0)' }], 320, { fill: 'none' });
}
function konfetti() {
  if (reduceretBevaegelse) return;
  const farver = ['#ffc928', '#9b5de5', '#ff5d8f', '#00c2a8', '#4cc9f0'];
  for (let i = 0; i < 60; i += 1) {
    const k = el('div', 'konfetti');
    k.style.left = `${Math.random() * 100}%`;
    k.style.background = farver[i % farver.length];
    if (i % 3 === 0) k.style.borderRadius = '50%';
    effekterEl.append(k);
    anim(k, [{ transform: 'translateY(0) rotate(0)', opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 120}px, ${effekterEl.clientHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 1 }],
    1800 + Math.random() * 1500, { easing: 'ease-in', delay: Math.random() * 600 }).then(() => k.remove());
  }
}

// ---------- animation af ét træk ----------
const BLOED = 'cubic-bezier(.45,0,.25,1)';
function nulstil(b) {
  [b, b.dele.figur, b.dele.skygge].forEach((x) => x.getAnimations().forEach((y) => y.cancel()));
  b.classList.remove('kaemper', 'hugger');
}
// Ét hop med sats, svæv og landing: hele bonden glider, figuren hopper og klemmes, skyggen bliver på jorden.
function hop(b, fra, til, ms, hoejde = 55) {
  return Promise.all([
    anim(b, [{ transform: fra }, { transform: til }], ms, { easing: BLOED }),
    anim(b.dele.figur, [{ transform: 'none' }, { transform: 'scale(1.14,.82)', offset: 0.16 }, { transform: `translateY(-${hoejde}%) scale(.9,1.12)`, offset: 0.5 },
      { transform: 'translateY(0) scale(1.2,.8)', offset: 0.84 }, { transform: 'scale(.95,1.05)', offset: 0.93 }, { transform: 'none' }], ms, { easing: 'linear' }),
    anim(b.dele.skygge, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.16 }, { transform: 'scale(.5)', opacity: 0.4, offset: 0.5 },
      { transform: 'scale(1.15)', opacity: 1, offset: 0.84 }, { transform: 'scale(1)', opacity: 1 }], ms, { easing: 'linear' }),
  ]);
}
async function animerTraek(traek, min) {
  const a = bonder.get(traek.fra);
  const d = bonder.get(traek.til);
  const dx = (kolonne(traek.til) - kolonne(traek.fra)) * 100;
  const dy = (raekke(traek.til) - raekke(traek.fra)) * 100;
  const t = (k) => `translate(${dx * k}%,${dy * k}%)`;
  const p = pos(traek.til);
  a.style.zIndex = 20;
  for (const trin of kampTrin(traek)) {
    if (min !== omgang) return;
    if (trin.type === 'hop') {
      lyd.hop();
      setTimeout(() => stoev(p.x + 6.25, p.y + 11), trin.ms * 0.84 * tempo);
      await hop(a, t(0), t(1), trin.ms, Math.abs(dy) > 100 ? 75 : 55);
    } else if (trin.type === 'loeb') {
      lyd.loeb();
      a.classList.add('kaemper'); d.classList.add('kaemper');
      await Promise.all([
        anim(a, [{ transform: t(0) }, { transform: t(0.6) }], trin.ms, { easing: BLOED }),
        anim(a.dele.figur, [{ transform: 'none' }, { transform: 'translateY(-22%) rotate(-6deg)', offset: 0.25 }, { transform: 'scale(1.1,.9)', offset: 0.5 },
          { transform: 'translateY(-18%) rotate(6deg)', offset: 0.75 }, { transform: 'scale(1.08,.92)' }], trin.ms, { easing: 'linear' }),
        anim(d, [{ transform: t(0) }, { transform: t(-0.14) }], trin.ms, { easing: BLOED }),
        anim(d.dele.figur, [{ transform: 'none' }, { transform: `scale(1.1,.9) rotate(${dx > 0 ? 8 : -8}deg)` }], trin.ms, { easing: 'cubic-bezier(.3,1.6,.5,1)' }),
      ]);
    } else if (trin.type === 'slag') {
      lyd.slag();
      const m = midtpunkt(traek.fra, traek.til);
      a.classList.add('hugger'); d.classList.add('hugger');
      glimt(m.x, m.y); pow(m.x, m.y); ryst();
      const stoed = (k, sign) => [{ transform: `${t(k)} rotate(0)` }, { transform: `${t(k + sign * 0.06)} rotate(${sign * 14}deg)` },
        { transform: `${t(k - sign * 0.04)} rotate(${-sign * 8}deg)` }, { transform: `${t(k + sign * 0.05)} rotate(${sign * 10}deg)` }, { transform: `${t(k)} rotate(0)` }];
      setTimeout(() => { glimt(m.x, m.y); bip(1400, 0.08, 'square', 0, -900, 0.08); }, trin.ms * 0.5 * tempo);
      await Promise.all([anim(a, stoed(0.6, 1), trin.ms), anim(d, stoed(-0.14, -1), trin.ms)]);
      a.classList.remove('hugger'); d.classList.remove('hugger');
    } else if (trin.type === 'fald') {
      lyd.fald();
      stjerner(p.x + 6.25, p.y + 6.25);
      setTimeout(() => roeg(p.x + 6.25 - dx * 0.0625 * 0.5, p.y + 6.25 - dy * 0.0625 * 0.5), trin.ms * 0.55 * tempo);
      d.classList.remove('kaemper');
      setTimeout(() => stoev(p.x + 6.25, p.y + 11, 8), trin.ms * 0.86 * tempo);
      await Promise.all([
        anim(d, [{ transform: `${t(-0.14)} rotate(0) scale(1)`, opacity: 1 },
          { transform: `${t(-0.32)} translateY(-70%) rotate(${dx > 0 ? -300 : 300}deg) scale(.8)`, opacity: 1, offset: 0.55 },
          { transform: `${t(-0.42)} translateY(-20%) rotate(${dx > 0 ? -620 : 620}deg) scale(0)`, opacity: 0 }], trin.ms, { easing: 'cubic-bezier(.2,.6,.4,1)' }),
        anim(d.dele.skygge, [{ opacity: 1 }, { opacity: 0 }], trin.ms * 0.4),
        hop(a, t(0.6), t(1), trin.ms, 70),
      ]);
    }
  }
  if (min !== omgang) return;
  d?.remove();
  nulstil(a);
  a.style.zIndex = '';
  placer(a, traek.til);
  bonder.delete(traek.fra);
  bonder.set(traek.til, a);
}

// ---------- spilgang ----------
async function spilTraek(traek, min) {
  const resultat = udfoer(spil, traek.fra, traek.til);
  await animerTraek(traek, min);
  if (min !== omgang) return false;
  spil = resultat.spil;
  opdaterFelter();
  return true;
}

async function menneskeTraek(fra, til) {
  const traek = lovligeTraek(spil, fra).find((t) => t.til === til);
  const min = omgang;
  optaget = true; valgt = null; opdaterFelter();
  if (!(await spilTraek(traek, min))) return;
  if (spil.vinder) return slut();
  sigStatus('Lilla tænker …', true);
  const lilla = [...bonder.values()].filter((b) => b.classList.contains('lilla-bonde'));
  lilla.forEach((b) => b.classList.add('taenker'));
  await vent(550);
  lilla.forEach((b) => b.classList.remove('taenker'));
  if (min !== omgang) return;
  const v = vaelgTraek(spil, niveau);
  if (!(await spilTraek({ ...v }, min))) return;
  if (spil.vinder) return slut();
  optaget = false;
  sigStatus('Din tur!');
}

function slut() {
  optaget = true;
  const vandtJeg = spil.vinder === GUL;
  $('slut-titel').textContent = vandtJeg ? '🎉 Du vandt! 🎉' : '😅 Lilla vandt denne gang';
  $('slut-tekst').textContent = vandtJeg
    ? `Din gule bonde ${sejrsTekst(spil.aarsag)}. Prøv et højere niveau!`
    : `Den lilla bonde ${sejrsTekst(spil.aarsag)}. Prøv igen – eller vælg et lavere niveau.`;
  const vinderFelt = spil.braet.findIndex((f, i) => f === spil.vinder && (spil.aarsag !== 'maal' || raekke(i) === (spil.vinder === GUL ? 0 : 7)));
  bonder.get(vinderFelt)?.classList.add('sejr');
  sigStatus(vandtJeg ? 'Du vandt! 🏆' : 'Lilla vandt', !vandtJeg);
  setTimeout(() => { slutEl.hidden = false; $('igen').focus(); }, 900 * tempo);
  if (vandtJeg) { lyd.sejr(); konfetti(); } else lyd.tab();
}

function klikFelt(f) {
  if (optaget || spil.vinder) return;
  lyd.klik();
  if (valgt !== null && lovligeTraek(spil, valgt).some((t) => t.til === f)) return void menneskeTraek(valgt, f);
  valgt = spil.braet[f] === GUL && lovligeTraek(spil, f).length > 0 ? f : null;
  opdaterFelter();
  if (valgt === null && spil.braet[f] === GUL) sigStatus('Den bonde kan ikke flytte lige nu. Prøv en anden!');
  else if (valgt !== null) sigStatus('Hvor skal bonden hen?');
}

function visTip() {
  if (optaget || spil.vinder) return;
  const t = tip(spil);
  opdaterFelter();
  const felter = braetEl.children;
  felter[t.fra].classList.add('tip');
  felter[t.til].classList.add('tip');
  sigStatus(t.slag ? 'Tip: du kan slå en bonde! ⚔️' : 'Tip: flyt den markerede bonde til det markerede felt 😊');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(opdaterFelter, 3000);
}

function nytSpilStart() {
  omgang += 1;
  spil = nytSpil();
  valgt = null; optaget = false;
  slutEl.hidden = true;
  effekterEl.replaceChildren();
  byggBonder(); opdaterFelter();
  sigStatus(`Din tur! Niveau ${niveau}: ${NIVEAUNAVN[niveau - 1]}`);
}

function byggStjerner() {
  const g = $('stjerner');
  g.replaceChildren();
  for (let n = 1; n <= 10; n += 1) {
    const b = el('button', '', '⭐');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', `Niveau ${n}: ${NIVEAUNAVN[n - 1]}`);
    b.addEventListener('click', () => vaelgNiveau(n));
    g.append(b);
  }
  visNiveau();
}
function visNiveau() {
  [...$('stjerner').children].forEach((b, i) => {
    b.classList.toggle('aktiv', i < niveau);
    b.setAttribute('aria-checked', String(i + 1 === niveau));
  });
  $('niveau-navn').textContent = `Niveau ${niveau}: ${NIVEAUNAVN[niveau - 1]}`;
}
function vaelgNiveau(n) {
  niveau = n;
  try { localStorage.setItem('bondeskak-niveau', String(n)); } catch { /* ingen lagring */ }
  visNiveau();
  nytSpilStart();
}

$('tip').addEventListener('click', visTip);
$('nyt').addEventListener('click', nytSpilStart);
$('igen').addEventListener('click', nytSpilStart);
$('lyd').addEventListener('click', (e) => {
  lydPaa = !lydPaa;
  const knap = /** @type {HTMLElement} */ (e.currentTarget);
  knap.setAttribute('aria-pressed', String(lydPaa));
  knap.textContent = lydPaa ? '🔊 Lyd' : '🔇 Lyd';
});

byggBraet();
byggStjerner();
nytSpilStart();
globalThis.__bondeskak = { get spil() { return spil; }, get optaget() { return optaget; }, klikFelt };
