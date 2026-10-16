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
function lavBonde(farve) {
  const b = el('div', `bonde ${farve === GUL ? 'gul-bonde' : 'lilla-bonde'}`);
  const hoved = el('div', 'hoved');
  hoved.append(el('i', 'oje'), el('i', 'oje'), el('b', 'mund'));
  b.append(el('div', 'krop'), hoved, el('div', 'hat'), el('div', 'sverd'));
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
    g.style.cssText = `left:${x}%;top:${y}%;width:8px;height:8px;border-radius:50%;background:${['#ffe066', '#ff5d8f', '#fff'][i % 3]}`;
    effekterEl.append(g);
    const v = (i / 10) * Math.PI * 2;
    anim(g, [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(v) * 46}px,${Math.sin(v) * 46}px) scale(.2)`, opacity: 0 }], 520).then(() => g.remove());
  }
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
    effekterEl.append(k);
    anim(k, [{ transform: 'translateY(0) rotate(0)', opacity: 1 },
      { transform: `translate(${(Math.random() - 0.5) * 120}px, ${effekterEl.clientHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 1 }],
    1800 + Math.random() * 1500, { easing: 'ease-in', delay: Math.random() * 600 }).then(() => k.remove());
  }
}

// ---------- animation af ét træk ----------
async function animerTraek(traek, min) {
  const a = bonder.get(traek.fra);
  const d = bonder.get(traek.til);
  const dx = (kolonne(traek.til) - kolonne(traek.fra)) * 100;
  const dy = (raekke(traek.til) - raekke(traek.fra)) * 100;
  a.style.zIndex = 20;
  for (const trin of kampTrin(traek)) {
    if (min !== omgang) return;
    if (trin.type === 'hop') {
      lyd.hop();
      await anim(a, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx / 2}%,${dy / 2 - 45}%) scale(1.25,.9)`, offset: 0.5 },
        { transform: `translate(${dx}%,${dy}%) scale(1)` }], trin.ms);
    } else if (trin.type === 'loeb') {
      lyd.loeb();
      a.classList.add('kaemper'); d.classList.add('kaemper');
      await Promise.all([
        anim(a, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.55}%,${dy * 0.55 - 8}%) rotate(${dx > 0 ? 8 : -8}deg)`, offset: 0.5 },
          { transform: `translate(${dx * 0.6}%,${dy * 0.6}%)` }], trin.ms),
        anim(d, [{ transform: 'translate(0,0)' }, { transform: `translate(${-dx * 0.14}%,${-dy * 0.14}%)` }], trin.ms),
      ]);
    } else if (trin.type === 'slag') {
      lyd.slag();
      const m = midtpunkt(traek.fra, traek.til);
      pow(m.x, m.y); ryst();
      const hugg = (sign) => [{ transform: `translate(${dx * 0.6}%,${dy * 0.6}%) rotate(0)` }, { transform: `translate(${dx * 0.62}%,${dy * 0.62}%) rotate(${sign * 22}deg)` },
        { transform: `translate(${dx * 0.58}%,${dy * 0.58}%) rotate(${-sign * 12}deg)` }, { transform: `translate(${dx * 0.6}%,${dy * 0.6}%) rotate(${sign * 18}deg)` }];
      await Promise.all([
        anim(a, hugg(1), trin.ms),
        anim(d, [{ transform: `translate(${-dx * 0.14}%,${-dy * 0.14}%) rotate(0)` }, { transform: `translate(${-dx * 0.2}%,${-dy * 0.2}%) rotate(${-20}deg)` },
          { transform: `translate(${-dx * 0.14}%,${-dy * 0.14}%) rotate(14deg)` }, { transform: `translate(${-dx * 0.14}%,${-dy * 0.14}%) rotate(-10deg)` }], trin.ms),
      ]);
    } else if (trin.type === 'fald') {
      lyd.fald();
      const p = pos(traek.til);
      stjerner(p.x + 6.25, p.y + 6.25);
      await Promise.all([
        anim(d, [{ transform: `translate(${-dx * 0.14}%,${-dy * 0.14}%) rotate(0) scale(1)`, opacity: 1 },
          { transform: `translate(${-dx * 0.3}%,${-dy * 0.3 - 60}%) rotate(360deg) scale(.7)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${-dx * 0.4}%,${-dy * 0.4 + 20}%) rotate(900deg) scale(0)`, opacity: 0 }], trin.ms),
        anim(a, [{ transform: `translate(${dx * 0.6}%,${dy * 0.6}%) scale(1)` }, { transform: `translate(${dx}%,${dy}%) scale(1.3)`, offset: 0.6 },
          { transform: `translate(${dx}%,${dy}%) scale(1)` }], trin.ms),
      ]);
    }
  }
  if (min !== omgang) return;
  d?.remove();
  a.classList.remove('kaemper');
  a.getAnimations().forEach((x) => x.cancel());
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
  await vent(450);
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
