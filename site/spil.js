// Bondeskak: brugerfladen. Reglerne og computeren ligger i ../src (testet i Node).
import { nytSpil, lovligeTraek, udfoer, GUL, LILLA, raekke, kolonne, VALGBARE, BRIKNAVN, typerAf, iSkak, kongeFelt } from '../src/regler.js';
import { vaelgTraek, tip } from '../src/ai.js';
import { kampTrin, sejrsTekst, uafgjortTekst, feltNavn, bevaegelse, afstand } from '../src/kamp.js';

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

let valg = hentValg();
let spil = nytSpil(valg);
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
function hentValg() {
  try {
    const v = JSON.parse(localStorage.getItem('bondeskak-brikker') ?? '[]');
    if (Array.isArray(v) && v.every((b) => VALGBARE.includes(b))) return v;
  } catch { /* privat tilstand eller ødelagt værdi: kun bønder */ }
  return [];
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
  rumle: (ms) => { bip(80, ms / 1000, 'sawtooth', 0, -20, 0.05); bip(60, 0.18, 'square', ms / 1000 * 0.9, -20, 0.12); },
  sus: (ms) => bip(500, ms / 1000, 'sine', 0, 700, 0.05),
  klokke: () => [1047, 1319, 1568, 2093].forEach((f, i) => bip(f, 0.25, 'sine', i * 0.07, 0, 0.06)),
  galop: () => { bip(300, 0.05, 'square', 0, -120, 0.08); bip(260, 0.05, 'square', 0.12, -120, 0.08); bip(700, 0.35, 'sawtooth', 0.22, 280, 0.035); },
  skak: () => [880, 660, 880].forEach((f, i) => bip(f, 0.12, 'square', i * 0.13, 0, 0.06)),
};

// ---------- tegning ----------
function lavBrik(farve, type = 'B') {
  const navn = farve === GUL ? 'gul' : 'lilla';
  const b = el('div', `bonde ${navn}-bonde brik-${type}`);
  const skygge = el('div', 'skygge');
  const figur = el('div', 'figur');
  const aande = el('div', 'aande');
  aande.style.animationDelay = `${(-Math.random() * 1.7).toFixed(2)}s`;
  const skabelon = /** @type {HTMLTemplateElement} */ (document.getElementById(`skabelon-${navn}-${type}`));
  const svg = /** @type {SVGElement | undefined} */ (skabelon.content?.firstElementChild?.cloneNode(true));
  if (svg) {
    const ojne = /** @type {SVGElement | null} */ (svg.querySelector('.ojne'));
    if (ojne) ojne.style.animationDelay = `${(-Math.random() * 4.6).toFixed(2)}s`;
    aande.append(svg);
  }
  figur.append(aande);
  b.append(skygge, figur);
  b.dele = { skygge, figur };
  b.dataset.brik = type;
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
  const typer = typerAf(spil);
  spil.braet.forEach((farve, f) => {
    if (!farve) return;
    const b = lavBrik(farve, typer[f]);
    placer(b, f);
    bonderEl.append(b);
    bonder.set(f, b);
  });
}
function opdaterFelter() {
  bonder.forEach((b, f) => b.classList.toggle('loeftet', f === valgt));
  const skakFelt = iSkak(spil) ? kongeFelt(spil.braet, typerAf(spil), spil.tur) : -1;
  bonder.forEach((b, f) => b.classList.toggle('skak', f === skakFelt));
  const typer = typerAf(spil);
  const maal = new Map(valgt === null ? [] : lovligeTraek(spil, valgt).map((t) => [t.til, t]));
  for (const c of /** @type {HTMLCollectionOf<HTMLElement>} */ (braetEl.children)) {
    const f = Number(c.dataset.felt);
    c.classList.toggle('valgt', f === valgt);
    c.classList.toggle('maal', maal.has(f) && !maal.get(f).slag);
    c.classList.toggle('slagmaal', maal.has(f) && maal.get(f).slag);
    c.classList.toggle('skakfelt', f === skakFelt);
    const farve = spil.braet[f];
    const hvem = farve === GUL ? `gul ${BRIKNAVN[typer[f]]}` : farve === LILLA ? `lilla ${BRIKNAVN[typer[f]]}` : 'tomt felt';
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
function glimmer(x, y, farve = '#ffe066') {
  const g = el('div', 'glimmer', '✦');
  g.style.left = `${x}%`; g.style.top = `${y}%`; g.style.color = farve;
  effekterEl.append(g);
  anim(g, [{ transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 1 },
    { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 20}px),calc(-50% - ${10 + Math.random() * 14}px)) scale(1.1) rotate(160deg)`, opacity: 0 }],
  600 + Math.random() * 300, { easing: 'cubic-bezier(.2,.7,.3,1)' }).then(() => g.remove());
}
// Spor efter brikken langs vejen: støv bag tårnet, gnister bag løber og dronning.
function spor(stil, brik, fraFelt, tilFelt, ms, slutAndel = 1) {
  const a = pos(fraFelt); const b = pos(tilFelt);
  const n = Math.max(3, afstand({ fra: fraFelt, til: tilFelt }) * 3);
  for (let i = 1; i <= n; i += 1) {
    const andel = (i / (n + 1)) * slutAndel;
    const x = a.x + (b.x - a.x) * andel + 6.25;
    const y = a.y + (b.y - a.y) * andel;
    setTimeout(() => {
      if (stil === 'glid' && brik === 'T') stoev(x, y + 11, 2);
      else if (stil === 'glid' || stil === 'svaev') glimmer(x + (Math.random() - 0.5) * 4, y + (stil === 'svaev' ? 4 : 8), brik === 'D' ? ['#ffe066', '#ff8fb1', '#9be7ff'][i % 3] : '#ffe066');
    }, ms * andel * tempo);
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
function ryst(styrke = 5) {
  const k = styrke;
  anim(braetEl.parentElement, [{ transform: 'translate(0,0)' }, { transform: `translate(${-k}px,${k * 0.6}px)` }, { transform: `translate(${k}px,${-k * 0.6}px)` },
    { transform: `translate(${-k * 0.6}px,${-k * 0.4}px)` }, { transform: 'translate(0,0)' }], 320, { fill: 'none' });
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
// Ét hop med sats, svæv og landing: hele brikken glider, figuren hopper og klemmes, skyggen bliver på jorden.
function hop(b, fra, til, ms, hoejde = 55, vip = 0) {
  return Promise.all([
    anim(b, [{ transform: fra }, { transform: til }], ms, { easing: BLOED }),
    anim(b.dele.figur, [{ transform: 'none' }, { transform: `scale(1.14,.82) rotate(${-vip}deg)`, offset: 0.16 },
      { transform: `translateY(-${hoejde}%) scale(.9,1.12) rotate(${vip}deg)`, offset: 0.5 },
      { transform: 'translateY(0) scale(1.2,.8)', offset: 0.84 }, { transform: 'scale(.95,1.05)', offset: 0.93 }, { transform: 'none' }], ms, { easing: 'linear' }),
    anim(b.dele.skygge, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.16 }, { transform: `scale(${hoejde > 80 ? 0.35 : 0.5})`, opacity: 0.4, offset: 0.5 },
      { transform: 'scale(1.15)', opacity: 1, offset: 0.84 }, { transform: 'scale(1)', opacity: 1 }], ms, { easing: 'linear' }),
  ]);
}
// Tårnet glider tungt og rumler; løberen glider let og læner sig ind i farten.
function glid(b, fra, til, ms, brik, retning) {
  const tung = brik === 'T';
  const vip = retning * (tung ? 4 : 9);
  return Promise.all([
    anim(b, [{ transform: fra }, { transform: til }], ms, { easing: tung ? 'cubic-bezier(.55,0,.35,1)' : 'cubic-bezier(.4,0,.2,1)' }),
    anim(b.dele.figur, tung
      ? [{ transform: 'none' }, { transform: `rotate(${-vip}deg) scale(1.04,.96)`, offset: 0.15 }, { transform: `rotate(${vip}deg) translateY(-2%)`, offset: 0.35 },
        { transform: `rotate(${vip}deg) translateY(1%)`, offset: 0.55 }, { transform: `rotate(${vip}deg) translateY(-2%)`, offset: 0.75 },
        { transform: 'scale(1.12,.86)', offset: 0.9 }, { transform: 'none' }]
      : [{ transform: 'none' }, { transform: `translateY(-10%) rotate(${vip}deg)`, offset: 0.3 }, { transform: `translateY(-12%) rotate(${vip}deg)`, offset: 0.75 },
        { transform: 'scale(1.06,.94)', offset: 0.92 }, { transform: 'none' }], ms, { easing: 'ease-in-out' }),
    anim(b.dele.skygge, [{ transform: 'scale(1)' }, { transform: `scale(${tung ? 1.05 : 0.75})`, offset: 0.4 }, { transform: 'scale(1)' }], ms),
  ]);
}
// Dronningen letter, flyver hen over brættet og lander blødt.
function svaev(b, fra, til, ms) {
  return Promise.all([
    anim(b, [{ transform: fra }, { transform: fra, offset: 0.18 }, { transform: til, offset: 0.82 }, { transform: til }], ms, { easing: BLOED }),
    anim(b.dele.figur, [{ transform: 'none' }, { transform: 'scale(1.08,.9)', offset: 0.08 }, { transform: 'translateY(-34%) rotate(-4deg)', offset: 0.22 },
      { transform: 'translateY(-38%) rotate(4deg)', offset: 0.55 }, { transform: 'translateY(-32%) rotate(-2deg)', offset: 0.8 },
      { transform: 'translateY(0) scale(1.06,.94)', offset: 0.94 }, { transform: 'none' }], ms, { easing: 'ease-in-out' }),
    anim(b.dele.skygge, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.55)', opacity: 0.45, offset: 0.22 },
      { transform: 'scale(.55)', opacity: 0.45, offset: 0.8 }, { transform: 'scale(1)', opacity: 1 }], ms),
  ]);
}
// Én bevægelse i brikkens egen stil fra en forskydning til en anden.
function bevaeg(b, stil, brik, fra, til, ms, fraFelt, tilFelt, andel = 1) {
  const retning = Math.sign(kolonne(tilFelt) - kolonne(fraFelt)) || 1;
  if (stil === 'glid') { (brik === 'T' ? lyd.rumle : lyd.sus)(ms); spor(stil, brik, fraFelt, tilFelt, ms, andel); return glid(b, fra, til, ms, brik, retning); }
  if (stil === 'svaev') { lyd.klokke(); spor(stil, brik, fraFelt, tilFelt, ms, andel); return svaev(b, fra, til, ms); }
  if (stil === 'spring') { lyd.galop(); return hop(b, fra, til, ms, 110, retning * 12); }
  lyd.hop();
  return hop(b, fra, til, ms, brik === 'K' ? 30 : 55);
}
function landing(stil, brik, felt, ms) {
  const p = pos(felt);
  const tid = stil === 'svaev' ? 0.94 : stil === 'glid' ? 0.88 : 0.84;
  setTimeout(() => {
    stoev(p.x + 6.25, p.y + 11, stil === 'spring' || brik === 'T' ? 9 : 6);
    if (brik === 'T' || stil === 'spring') ryst(2);
  }, ms * tid * tempo);
}

async function animerTraek(traek, min) {
  const a = bonder.get(traek.fra);
  const maalFelt = traek.slagFelt ?? traek.til; // ved en passant står den slåede bonde ved siden af
  const d = traek.slag ? bonder.get(maalFelt) : null;
  const brik = traek.brik ?? 'B';
  const stil = bevaegelse(brik);
  const dx = (kolonne(traek.til) - kolonne(traek.fra)) * 100;
  const dy = (raekke(traek.til) - raekke(traek.fra)) * 100;
  const sx = (kolonne(maalFelt) - kolonne(traek.fra)) * 100;
  const sy = (raekke(maalFelt) - raekke(traek.fra)) * 100;
  const t = (k) => `translate(${dx * k}%,${dy * k}%)`;
  const ts = (k) => `translate(${sx * k}%,${sy * k}%)`;
  a.style.zIndex = 20;
  for (const trin of kampTrin(traek)) {
    if (min !== omgang) return;
    if (trin.type === 'loeb') {
      a.classList.add('kaemper'); d.classList.add('kaemper');
      const tilmoede = stil === 'hop'
        ? (lyd.loeb(), Promise.all([
          anim(a, [{ transform: ts(0) }, { transform: ts(0.6) }], trin.ms, { easing: BLOED }),
          anim(a.dele.figur, [{ transform: 'none' }, { transform: 'translateY(-22%) rotate(-6deg)', offset: 0.25 }, { transform: 'scale(1.1,.9)', offset: 0.5 },
            { transform: 'translateY(-18%) rotate(6deg)', offset: 0.75 }, { transform: 'scale(1.08,.92)' }], trin.ms, { easing: 'linear' })]))
        : bevaeg(a, stil, brik, ts(0), ts(0.6), trin.ms, traek.fra, maalFelt, 0.6);
      await Promise.all([
        tilmoede,
        anim(d, [{ transform: 'translate(0,0)' }, { transform: `translate(${-sx * 0.14}%,${-sy * 0.14}%)` }], trin.ms, { easing: BLOED }),
        anim(d.dele.figur, [{ transform: 'none' }, { transform: `scale(1.1,.9) rotate(${sx > 0 ? 8 : -8}deg)` }], trin.ms, { easing: 'cubic-bezier(.3,1.6,.5,1)' }),
      ]);
    } else if (trin.type === 'slag') {
      lyd.slag();
      const m = midtpunkt(traek.fra, maalFelt);
      a.classList.add('hugger'); d.classList.add('hugger');
      glimt(m.x, m.y); pow(m.x, m.y); ryst();
      const stoed = (x, y, k, sign) => [{ transform: `translate(${x * k}%,${y * k}%) rotate(0)` }, { transform: `translate(${x * (k + sign * 0.06)}%,${y * (k + sign * 0.06)}%) rotate(${sign * 14}deg)` },
        { transform: `translate(${x * (k - sign * 0.04)}%,${y * (k - sign * 0.04)}%) rotate(${-sign * 8}deg)` }, { transform: `translate(${x * (k + sign * 0.05)}%,${y * (k + sign * 0.05)}%) rotate(${sign * 10}deg)` },
        { transform: `translate(${x * k}%,${y * k}%) rotate(0)` }];
      setTimeout(() => { glimt(m.x, m.y); bip(1400, 0.08, 'square', 0, -900, 0.08); }, trin.ms * 0.5 * tempo);
      await Promise.all([anim(a, stoed(sx, sy, 0.6, 1), trin.ms), anim(d, stoed(-sx, -sy, 0.14, -1), trin.ms)]);
      a.classList.remove('hugger'); d.classList.remove('hugger');
    } else if (trin.type === 'fald') {
      lyd.fald();
      const q = pos(maalFelt);
      stjerner(q.x + 6.25, q.y + 6.25);
      setTimeout(() => roeg(q.x + 6.25 - sx * 0.03, q.y + 6.25 - sy * 0.03), trin.ms * 0.55 * tempo);
      d.classList.remove('kaemper');
      landing(stil === 'hop' ? 'hop' : stil, brik, traek.til, trin.ms);
      const ind = stil === 'hop' ? hop(a, ts(0.6), t(1), trin.ms, 70) : bevaeg(a, stil, brik, ts(0.6), t(1), trin.ms, traek.fra, traek.til);
      await Promise.all([
        anim(d, [{ transform: `translate(${-sx * 0.14}%,${-sy * 0.14}%) rotate(0) scale(1)`, opacity: 1 },
          { transform: `translate(${-sx * 0.32}%,${-sy * 0.32}%) translateY(-70%) rotate(${sx > 0 ? -300 : 300}deg) scale(.8)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${-sx * 0.42}%,${-sy * 0.42}%) translateY(-20%) rotate(${sx > 0 ? -620 : 620}deg) scale(0)`, opacity: 0 }], trin.ms, { easing: 'cubic-bezier(.2,.6,.4,1)' }),
        anim(d.dele.skygge, [{ opacity: 1 }, { opacity: 0 }], trin.ms * 0.4),
        ind,
      ]);
    } else {
      landing(trin.type, brik, traek.til, trin.ms);
      const tarn = traek.rokade ? bonder.get(traek.rokade.fra) : null;
      const rx = traek.rokade ? (kolonne(traek.rokade.til) - kolonne(traek.rokade.fra)) * 100 : 0;
      await Promise.all([
        bevaeg(a, trin.type, brik, t(0), t(1), trin.ms, traek.fra, traek.til),
        tarn ? (tarn.style.zIndex = 19, glid(tarn, 'translate(0,0)', `translate(${rx}%,0)`, trin.ms, 'T', Math.sign(rx))) : null,
      ]);
      if (tarn && min === omgang) {
        nulstil(tarn); tarn.style.zIndex = ''; placer(tarn, traek.rokade.til);
        bonder.delete(traek.rokade.fra); bonder.set(traek.rokade.til, tarn);
      }
    }
  }
  if (min !== omgang) return;
  d?.remove();
  nulstil(a);
  a.style.zIndex = '';
  placer(a, traek.til);
  bonder.delete(traek.fra);
  if (traek.slagFelt !== undefined) bonder.delete(traek.slagFelt);
  bonder.set(traek.til, a);
  if (traek.forvandling) forvandl(a, traek.forvandling, traek.til);
}
// En bonde, der når bagerste række (med konger), bliver til en ny brik med stjerner og klokker.
function forvandl(gammel, type, felt) {
  const farve = gammel.classList.contains('gul-bonde') ? GUL : LILLA;
  const ny = lavBrik(farve, type);
  placer(ny, felt);
  bonderEl.append(ny);
  gammel.remove();
  bonder.set(felt, ny);
  const p = pos(felt);
  glimt(p.x + 6.25, p.y + 6.25); stjerner(p.x + 6.25, p.y + 6.25); lyd.klokke();
  anim(ny.dele.figur, [{ transform: 'scale(0) rotate(-180deg)' }, { transform: 'scale(1.25) rotate(10deg)', offset: 0.7 }, { transform: 'none' }], 600, { easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'none' });
}

// ---------- spilgang ----------
async function spilTraek(traek, min) {
  const resultat = udfoer(spil, traek.fra, traek.til, traek.forvandling);
  await animerTraek(traek, min);
  if (min !== omgang) return false;
  spil = resultat.spil;
  opdaterFelter();
  visValg();
  if (iSkak(spil) && !spil.vinder) lyd.skak();
  return true;
}

async function menneskeTraek(fra, til) {
  const muligt = lovligeTraek(spil, fra).filter((t) => t.til === til);
  const traek = muligt.find((t) => !t.forvandling || t.forvandling === 'D');
  const min = omgang;
  optaget = true; valgt = null; opdaterFelter(); visValg();
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
  sigStatus(iSkak(spil) ? 'Skak! Red din konge 👑' : 'Din tur!');
}

function slut() {
  optaget = true;
  const uafgjort = spil.vinder === 'uafgjort';
  const vandtJeg = spil.vinder === GUL;
  $('slut-titel').textContent = uafgjort ? '🤝 Uafgjort' : vandtJeg ? '🎉 Du vandt! 🎉' : '😅 Lilla vandt denne gang';
  const hvem = spil.konger ? '' : ' bonde';
  $('slut-tekst').textContent = uafgjort
    ? uafgjortTekst(spil.aarsag)
    : vandtJeg
      ? `Din gule${hvem} ${sejrsTekst(spil.aarsag)}. Prøv et højere niveau!`
      : `Den lilla${hvem} ${sejrsTekst(spil.aarsag)}. Prøv igen – eller vælg et lavere niveau.`;
  if (!uafgjort) {
    const typer = typerAf(spil);
    const kf = kongeFelt(spil.braet, typer, spil.vinder);
    const vinderFelt = kf >= 0 ? kf
      : spil.braet.findIndex((f, i) => f === spil.vinder && (spil.aarsag !== 'maal' || (typer[i] === 'B' && raekke(i) === (spil.vinder === GUL ? 0 : 7))));
    bonder.get(vinderFelt)?.classList.add('sejr');
  }
  sigStatus(uafgjort ? 'Uafgjort' : vandtJeg ? 'Du vandt! 🏆' : 'Lilla vandt', !vandtJeg && !uafgjort);
  setTimeout(() => { slutEl.hidden = false; $('igen').focus(); }, 900 * tempo);
  if (vandtJeg) { lyd.sejr(); konfetti(); } else lyd.tab();
}

function klikFelt(f) {
  if (optaget || spil.vinder) return;
  lyd.klik();
  if (valgt !== null && lovligeTraek(spil, valgt).some((t) => t.til === f)) return void menneskeTraek(valgt, f);
  valgt = spil.braet[f] === GUL && lovligeTraek(spil, f).length > 0 ? f : null;
  opdaterFelter();
  const navn = BRIKNAVN[typerAf(spil)[f]] ?? 'brik';
  if (valgt === null && spil.braet[f] === GUL) sigStatus(iSkak(spil) ? 'Skak! Den brik kan ikke redde kongen.' : `Den ${navn} kan ikke flytte lige nu. Prøv en anden!`);
  else if (valgt !== null) sigStatus(`Hvor skal ${navn === 'tårn' ? 'tårnet' : navn === 'dronning' ? 'dronningen' : `${navn}en`} hen?`);
}

function visTip() {
  if (optaget || spil.vinder) return;
  const t = tip(spil);
  opdaterFelter();
  const felter = braetEl.children;
  felter[t.fra].classList.add('tip');
  felter[t.til].classList.add('tip');
  sigStatus(t.slag ? 'Tip: du kan slå en brik! ⚔️' : 'Tip: flyt den markerede brik til det markerede felt 😊');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(opdaterFelter, 3000);
}

function nytSpilStart() {
  omgang += 1;
  spil = nytSpil(valg);
  valgt = null; optaget = false;
  slutEl.hidden = true;
  effekterEl.replaceChildren();
  byggBonder(); opdaterFelter(); visValg();
  sigStatus(spil.konger ? `Din tur! Sæt den lilla konge skakmat. Niveau ${niveau}` : `Din tur! Niveau ${niveau}: ${NIVEAUNAVN[niveau - 1]}`);
}

// ---------- valg af brikker (kun før første træk) ----------
const VALGNAVN = { T: '🏰 Tårne', S: '🐴 Heste', L: '🎩 Løbere', D: '👸 Dronning', K: '🤴 Konge' };
const valgKnapper = new Map();
function byggValg() {
  const g = $('valgknapper');
  g.replaceChildren();
  const kun = el('button', 'valg-hel', '♟ Kun bønder');
  kun.type = 'button';
  kun.addEventListener('click', () => saetValg([]));
  valgKnapper.set('kun', kun);
  g.append(kun);
  for (const b of VALGBARE) {
    const k = el('button', 'valg', VALGNAVN[b]);
    k.type = 'button';
    k.addEventListener('click', () => saetValg(valg.includes(b) ? valg.filter((x) => x !== b) : [...valg, b]));
    valgKnapper.set(b, k);
    g.append(k);
  }
  const fuldt = el('button', 'valg-hel', '♚ Fuldt skakspil');
  fuldt.type = 'button';
  fuldt.addEventListener('click', () => saetValg([...VALGBARE]));
  valgKnapper.set('fuldt', fuldt);
  g.append(fuldt);
  visValg();
}
function brikTekst() {
  if (valg.length === 0) return 'Kun bønder';
  if (valg.length === VALGBARE.length) return 'Fuldt skak';
  return `Bønder + ${valg.map((b) => VALGNAVN[b].split(' ')[1].toLowerCase()).join(', ')}`;
}
function visValg() {
  const laast = (spil.antalTraek > 0 || optaget) && !spil.vinder;
  // Under spillet er der intet at vælge: panelet skjules og afløses af én linje.
  $('indstillinger').hidden = laast;
  $('resume').hidden = !laast;
  $('resume').textContent = `Niveau ${niveau}: ${NIVEAUNAVN[niveau - 1]} · ${brikTekst()} · «Nyt spil» for at ændre`;
  for (const [n, k] of valgKnapper) {
    const til = n === 'kun' ? valg.length === 0 : n === 'fuldt' ? valg.length === VALGBARE.length : valg.includes(n);
    k.setAttribute('aria-pressed', String(til));
    k.disabled = laast;
  }
  $('valgtekst').textContent = valg.includes('K') ? 'Med konge: sæt kongen skakmat' : 'Få en bonde over, eller slå alt';
}
function saetValg(nyt) {
  if ((spil.antalTraek > 0 || optaget) && !spil.vinder) return;
  valg = VALGBARE.filter((b) => nyt.includes(b));
  try { localStorage.setItem('bondeskak-brikker', JSON.stringify(valg)); } catch { /* ingen lagring */ }
  lyd.klik();
  nytSpilStart();
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
byggValg();
nytSpilStart();
globalThis.__bondeskak = { get spil() { return spil; }, get optaget() { return optaget; }, klikFelt, saetValg };
