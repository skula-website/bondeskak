"""Udgiver Bondeskak som hjemmeskærms-app (offline) på GitHub Pages: https://skula-website.github.io/bondeskak/

  python3 tools/udgiv.py            bygger udgivelsen og skubber den til grenen gh-pages
  python3 tools/udgiv.py --kun-byg  bygger kun (til mappen udgivelse/, som er uden for git)

Udgivelsen er en flad kopi: site/* i roden og src/* i src/ (stierne i spil.js rettes fra ../src/ til ./src/).
sw.js skrives med en version (kontrolsum af alle filer) og listen over filer, så telefonen gemmer det hele
første gang og henter en ny udgave af sig selv, når den er online. Kræver git-adgang til GitHub (gh på iMac'en).
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UD = os.path.join(ROD, "udgivelse")
REPO = "https://github.com/skula-website/bondeskak.git"

SW = """// Bondeskak offline: gemmer hele spillet første gang og svarer fra telefonens lager bagefter.
const VERSION = '%s';
const FILER = %s;
const LAGER = `bondeskak-${VERSION}`;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(LAGER).then((c) => c.addAll(FILER)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== LAGER).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((svar) => svar || fetch(e.request)));
});
"""


def byg():
    if os.path.exists(UD):
        shutil.rmtree(UD)
    shutil.copytree(os.path.join(ROD, "site"), UD)
    shutil.copytree(os.path.join(ROD, "src"), os.path.join(UD, "src"))
    spil = os.path.join(UD, "spil.js")
    s = open(spil, encoding="utf-8").read()
    if "'../src/" not in s:
        sys.exit("spil.js importerer ikke fra ../src/ som forventet")
    open(spil, "w", encoding="utf-8").write(s.replace("'../src/", "'./src/"))
    filer = sorted(os.path.relpath(os.path.join(d, f), UD) for d, _, fs in os.walk(UD) for f in fs if f != ".DS_Store")
    h = hashlib.sha256()
    for f in filer:
        h.update(f.encode())
        h.update(open(os.path.join(UD, f), "rb").read())
    version = h.hexdigest()[:12]
    open(os.path.join(UD, "sw.js"), "w", encoding="utf-8").write(SW % (version, json.dumps(["./"] + filer, ensure_ascii=False)))
    open(os.path.join(UD, ".nojekyll"), "w").close()
    return version, len(filer)


def skub(version):
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copytree(UD, tmp, dirs_exist_ok=True)
        g = ["git", "-C", tmp]
        subprocess.run(g + ["init", "-q", "-b", "gh-pages"], check=True)
        subprocess.run(g + ["add", "-A"], check=True)
        subprocess.run(g + ["-c", "user.name=Michael Juhl", "-c", "user.email=mjuhl4@gmail.com", "commit", "-qm", f"Udgivelse {version}"], check=True)
        subprocess.run(g + ["push", "-q", "-f", REPO, "gh-pages"], check=True)


if __name__ == "__main__":
    version, antal = byg()
    print(f"Bygget udgivelse/ ({antal} filer, version {version})")
    if "--kun-byg" not in sys.argv:
        skub(version)
        print("Skubbet til gh-pages: https://skula-website.github.io/bondeskak/")
