// Service worker : permet à l'appli de s'installer et de marcher hors connexion.
// Stratégie « réseau d'abord » : chaque mise à jour poussée sur GitHub arrive
// dès que le téléphone est connecté ; sinon on sert la dernière version gardée.
const CACHE = 'noel-v11';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'bg/maison.jpg', 'bg/grange.jpg', 'bg/coucher.jpg', 'bg/chaton.jpg', 'bg/boites.jpg', 'bg/raisin.jpg', 'bg/pipi.jpg', 'bg/chaises.jpg',
  'bg/maison2.jpg', 'bg/grange2.jpg', 'bg/raisin2.jpg',
  'bg/coucher2.jpg', 'bg/chaises2.jpg', 'bg/boites2.jpg', 'bg/pipi2.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(url.href, { cache: 'no-cache' })
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./')))
  );
});
