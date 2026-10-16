"""Skriver SVG-skabelonerne for alle brikker i begge farver ind i site/index.html (mellem markørerne)."""
import re, sys

STI = sys.argv[1]


def ansigt(cx, cy, sky=1.0):
    """Øjne, kinder og mund omkring (cx, cy) = midt mellem øjnene."""
    dx = 7 * sky
    return (f'<ellipse cx="{cx - dx - 5.5:.1f}" cy="{cy + 6:.1f}" rx="4.2" ry="2.7" fill="#ff7aa2" opacity=".5"/>'
            f'<ellipse cx="{cx + dx + 5.5:.1f}" cy="{cy + 6:.1f}" rx="4.2" ry="2.7" fill="#ff7aa2" opacity=".5"/>'
            f'<g class="ojne"><ellipse cx="{cx - dx:.1f}" cy="{cy:.1f}" rx="3.4" ry="4.5" fill="#2b2250"/><ellipse cx="{cx + dx:.1f}" cy="{cy:.1f}" rx="3.4" ry="4.5" fill="#2b2250"/>'
            f'<circle cx="{cx - dx + 1.3:.1f}" cy="{cy - 1.8:.1f}" r="1.4" fill="#fff"/><circle cx="{cx + dx + 1.3:.1f}" cy="{cy - 1.8:.1f}" r="1.4" fill="#fff"/></g>'
            f'<path d="M{cx - 5:.1f} {cy + 8.5:.1f} Q{cx:.1f} {cy + 13.5:.1f} {cx + 5:.1f} {cy + 8.5:.1f}" stroke="#8a1c4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>')


def krop(navn, sti='M30 91 C28 75 33 63 43 59 L57 59 C67 63 72 75 70 91 Z', baelte=True):
    s = (f'<path class="k" d="{sti}" fill="url(#g-krop-{navn})"/>'
         f'<ellipse class="k" cx="50" cy="90" rx="25" ry="6.5" fill="url(#g-krop-{navn})"/>'
         '<path d="M38 66 Q35 76 36 85" stroke="#fff" stroke-opacity=".5" stroke-width="3.2" fill="none" stroke-linecap="round"/>')
    if baelte:
        s += ('<path class="baelte" d="M34 75 Q50 80 66 75" stroke-width="3" fill="none" stroke-linecap="round"/>'
              '<rect x="46" y="74" width="8" height="7" rx="2" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>')
    return s


def hoved(cy=45, r=19):
    return f'<circle class="k" cx="50" cy="{cy}" r="{r}" fill="url(#g-hud)"/>'


def sverd(navn):
    sx = 76 if navn == 'gul' else 18
    return (f'<g class="sverd"><rect x="{sx}" y="30" width="6" height="36" rx="2.5" fill="url(#g-staal)" stroke="#5d6b7e" stroke-width="1.5"/>'
            f'<rect x="{sx - 6}" y="64" width="18" height="5" rx="2.5" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>'
            f'<rect x="{sx + 1}" y="68" width="4" height="10" rx="2" fill="#7a4a1e"/></g>')


HAT = {
    'gul': ('<path class="k" d="M28 40 C28 23 38 15 50 15 C62 15 72 23 72 40 Z" fill="url(#g-hat-gul)"/>'
            '<path class="k" d="M18 41 Q50 30 82 41 Q50 50 18 41 Z" fill="url(#g-hat-gul)"/>'
            '<path d="M30 35 Q50 29 70 35" stroke="#e0533d" stroke-width="4" fill="none" stroke-linecap="round"/>'),
    'lilla': ('<path d="M50 16 C47 5 58 -1 66 3 C59 5 56 10 54 17 Z" fill="#ff5d8f" stroke="#a3124a" stroke-width="2"/>'
              '<path class="k" d="M28 42 C28 22 38 13 50 13 C62 13 72 22 72 42 Z" fill="url(#g-hat-lilla)"/>'
              '<rect class="k" x="25" y="37" width="50" height="8" rx="4" fill="url(#g-hat-lilla)"/>'
              '<path d="M38 20 Q42 16 47 15" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>'),
}


def bonde(navn):
    return krop(navn) + hoved() + ansigt(50, 46) + HAT[navn]


def taarn(navn):
    return (f'<path class="k" d="M24 92 L28 36 L72 36 L76 92 Z" fill="url(#g-krop-{navn})"/>'
            f'<ellipse class="k" cx="50" cy="90" rx="28" ry="6.5" fill="url(#g-krop-{navn})"/>'
            f'<path class="k" d="M18 38 V14 H31 V23 H42 V14 H58 V23 H69 V14 H82 V38 Z" fill="url(#g-hat-{navn})"/>'
            '<path d="M24 20 V32" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M30 46 H44 M56 46 H70 M34 70 H46 M54 70 H66" stroke="#000" stroke-opacity=".12" stroke-width="2.5" stroke-linecap="round"/>'
            '<path d="M42 92 V82 Q50 72 58 82 V92 Z" fill="#2b2250" opacity=".35"/>'
            '<circle class="k" cx="50" cy="58" r="15" fill="url(#g-hud)"/>' + ansigt(50, 57, 0.8))


def hest(navn):
    vend = '' if navn == 'gul' else ' transform="translate(100 0) scale(-1 1)"'
    return (krop(navn, 'M30 91 C28 78 32 68 40 64 L60 64 C68 68 72 78 70 91 Z')
            + f'<g{vend}>'
            f'<path class="k" d="M36 70 C32 56 34 42 42 32 C42 22 50 12 60 12 C66 12 70 18 74 24 C80 30 86 38 84 46 C82 52 74 52 68 48 C64 46 60 48 60 54 C62 60 64 66 62 70 Z" fill="url(#g-hud)"/>'
            f'<path class="k" d="M44 30 C40 22 46 14 52 14 C50 20 54 24 48 26 C54 30 46 36 42 40 C46 44 40 52 36 56 C36 46 38 38 44 30 Z" fill="url(#g-hat-{navn})"/>'
            '<path class="k" d="M58 14 L56 3 L65 10 Z" fill="url(#g-hud)"/>'
            '<ellipse cx="78" cy="42" rx="2" ry="1.5" fill="#8a1c4a"/>'
            '<ellipse cx="70" cy="40" rx="4.2" ry="2.7" fill="#ff7aa2" opacity=".5"/>'
            '<g class="ojne"><ellipse cx="64" cy="27" rx="3.6" ry="4.8" fill="#2b2250"/><circle cx="65.4" cy="25" r="1.5" fill="#fff"/></g>'
            '<path d="M74 47 Q78 50 82 47" stroke="#8a1c4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
            '</g>')


def loeber(navn):
    return (krop(navn, 'M31 91 C29 76 34 66 43 62 L57 62 C66 66 71 76 69 91 Z')
            + hoved(48, 17) + ansigt(50, 49, 0.9)
            + f'<path class="k" d="M33 40 C33 24 42 12 50 4 C58 12 67 24 67 40 Z" fill="url(#g-hat-{navn})"/>'
            '<path d="M44 16 L56 34" stroke="#fff" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>'
            f'<rect class="k" x="31" y="36" width="38" height="7" rx="3.5" fill="url(#g-hat-{navn})"/>'
            '<circle cx="50" cy="4" r="4" fill="#ffd23f" stroke="#a66b00" stroke-width="1.5"/>')


def dronning(navn):
    return (krop(navn, 'M24 91 C24 74 33 64 42 60 L58 60 C67 64 76 74 76 91 Z', baelte=False)
            + '<path d="M28 84 Q50 90 72 84" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>'
            + hoved(45, 18) + ansigt(50, 46)
            + '<path d="M38 41 l-3 -3 M62 41 l3 -3" stroke="#2b2250" stroke-width="1.8" stroke-linecap="round"/>'
            + '<path class="krone" d="M29 33 L32 13 L41 24 L50 8 L59 24 L68 13 L71 33 Z" fill="url(#g-guld)" stroke="#a66b00" stroke-width="2.4" stroke-linejoin="round"/>'
            + '<circle cx="32" cy="13" r="3.2" fill="#ff5d8f"/><circle cx="50" cy="8" r="3.6" fill="#4cc9f0"/><circle cx="68" cy="13" r="3.2" fill="#ff5d8f"/>'
            + f'<circle cx="50" cy="27" r="3.4" fill="url(#g-krop-{navn})" stroke="#a66b00" stroke-width="1.2"/>')


def konge(navn):
    return (krop(navn, 'M28 91 C27 74 33 62 43 58 L57 58 C67 62 73 74 72 91 Z', baelte=False)
            + '<path d="M30 72 Q50 78 70 72 L70 78 Q50 84 30 78 Z" fill="#fff" stroke="#c9c3d9" stroke-width="1.2"/>'
            + '<circle cx="38" cy="76" r="1.3" fill="#2b2250"/><circle cx="50" cy="79" r="1.3" fill="#2b2250"/><circle cx="62" cy="76" r="1.3" fill="#2b2250"/>'
            + hoved(46, 19) + ansigt(50, 46)
            + '<path d="M40 56 Q45 52 50 55 Q55 52 60 56 Q55 59 50 57 Q45 59 40 56 Z" fill="#7a4a1e"/>'
            + '<path class="krone" d="M30 34 L30 18 L40 25 L50 14 L60 25 L70 18 L70 34 Z" fill="url(#g-guld)" stroke="#a66b00" stroke-width="2.4" stroke-linejoin="round"/>'
            + '<path d="M50 0 V12 M45 5 H55" stroke="#a66b00" stroke-width="6" stroke-linecap="round"/><path d="M50 0 V12 M45 5 H55" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>'
            + f'<rect x="30" y="29" width="40" height="6" rx="3" fill="url(#g-krop-{navn})" stroke="#a66b00" stroke-width="1.2"/>')


TYPER = {'B': bonde, 'T': taarn, 'S': hest, 'L': loeber, 'D': dronning, 'K': konge}
linjer = []
for navn in ('gul', 'lilla'):
    for t, f in TYPER.items():
        svg = f'<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">{f(navn)}{sverd(navn)}</svg>'
        linjer.append(f'  <template id="skabelon-{navn}-{t}">{svg}</template>')
blok = '  <!-- brikker:start (skrevet af tools/tegn-brikker.py; ret tegningerne dér) -->\n' + '\n'.join(linjer) + '\n  <!-- brikker:slut -->\n'

h = open(STI, encoding='utf-8').read()
if '<!-- brikker:start' in h:
    h = re.sub(r'  <!-- brikker:start.*?<!-- brikker:slut -->\n', lambda m: blok, h, flags=re.S)
else:
    h = re.sub(r'  <template id="skabelon-gul">.*?</template>\n  <template id="skabelon-lilla">.*?</template>\n', lambda m: blok, h, flags=re.S)
if 'g-guld' not in h:
    h = h.replace('    </defs>', '      <linearGradient id="g-guld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09a00"/></linearGradient>\n    </defs>', 1)
open(STI, 'w', encoding='utf-8').write(h)
print(len(linjer), 'skabeloner')
