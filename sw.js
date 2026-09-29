/* Mustang Splits service worker.
   Strategy: network-first for the app's own files (so pushes to GitHub reach the phone),
   falling back to cache after a short timeout or when offline (so it works at the course).
   Google Fonts are cache-first. Bump CACHE only if this file's caching logic changes. */
const CACHE = 'mustang-splits-shell-v1';
const FONTS = 'mustang-splits-fonts-v1';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest', './version.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.svg'
];
const TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mustang-splits-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => { if (event.data === 'skipWaiting') self.skipWaiting(); });

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const fromNetwork = fetch(request, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS, null));
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res) return res;
  } catch (e) { /* offline: fall through to cache */ }
  const cached = await cache.match(request, { ignoreSearch: true })
    || (request.mode === 'navigate' ? await cache.match('./index.html') : null);
  if (cached) return cached;
  return fromNetwork; // nothing cached yet: wait for the network
}

async function cacheFirst(request) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/version.json')) return; // always straight to the network
    event.respondWith(networkFirst(req));
  }
});
