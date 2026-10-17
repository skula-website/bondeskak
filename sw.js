// Bondeskak offline: gemmer hele spillet første gang og svarer fra telefonens lager bagefter.
const VERSION = 'f9ad6b4d45b2';
const FILER = ["./", "ikoner/ikon-180.png", "ikoner/ikon-192.png", "ikoner/ikon-512.png", "ikoner/ikon-maskable-512.png", "index.html", "manifest.webmanifest", "spil.js", "src/ai.js", "src/kamp.js", "src/regler.js", "stil.css"];
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
