"""Tegner app-ikonerne (hjemmeskærm) fra den gule bondes SVG-skabelon i site/index.html. Kræver macOS (qlmanage, sips).

  python3 tools/lav-app-ikoner.py      skriver site/ikoner/ikon-180.png, ikon-192.png, ikon-512.png og ikon-maskable-512.png
"""
import os
import re
import subprocess
import tempfile

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROD, "site", "index.html"), encoding="utf-8").read()
defs = re.search(r"<defs>.*?</defs>", html, re.S).group(0)
svg = re.search(r'<template id="skabelon-gul-B">(<svg.*?</svg>)</template>', html, re.S).group(1)
indre = re.sub(r"^<svg[^>]*>|</svg>$", "", svg)
stil = "<style>.k{stroke:#8a4b00;stroke-width:3.2;stroke-linejoin:round}.baelte{stroke:#8a4b00}.sverd{display:none}</style>"
UD = os.path.join(ROD, "site", "ikoner")
os.makedirs(UD, exist_ok=True)


def tegn(navn, ramme, hjoerne, stoerrelser):
    """ramme: luft omkring figuren i viewBox-enheder; hjoerne: afrundede hjørner (0 = fuld flade, til «maskable»)."""
    v = 100 + 2 * ramme
    fuld = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-ramme} {-ramme} {v} {v}" width="1024" height="1024">{stil}{defs}'
            f'<rect x="{-ramme}" y="{-ramme}" width="{v}" height="{v}" rx="{hjoerne}" fill="#fff1c9"/>{indre}</svg>')
    with tempfile.TemporaryDirectory() as tmp:
        sti = os.path.join(tmp, "ikon.svg")
        open(sti, "w", encoding="utf-8").write(fuld)
        subprocess.run(["qlmanage", "-t", "-s", "1024", "-o", tmp, sti], check=True, capture_output=True)
        for s, filnavn in stoerrelser:
            subprocess.run(["sips", "-z", str(s), str(s), sti + ".png", "--out", os.path.join(UD, filnavn)], check=True, capture_output=True)


tegn("ikon", 14, 0, [(180, "ikon-180.png"), (192, "ikon-192.png"), (512, "ikon-512.png")])
tegn("maskable", 34, 0, [(512, "ikon-maskable-512.png")])
print("\n".join(sorted(os.listdir(UD))))
