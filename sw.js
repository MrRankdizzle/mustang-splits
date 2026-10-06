/* Mustang Splits service worker.
   Strategy: network-first for the app's own files (so pushes to GitHub reach the phone),
   falling back to cache after a short timeout or when offline (so it works at the course).
   Google Fonts and the pinned Firebase SDK are cache-first. Bump CACHE only if this file's caching logic changes.
   Firestore and Auth network traffic is never cached (not handled here). */
const CACHE = 'mustang-splits-shell-v3'; // v3 (2.9.0): the 'refresh' message
const FONTS = 'mustang-splits-fonts-v1';
// Keep in step with the version in sync.js imports. A new version gets a new cache name.
const SDK_VERSION = '12.19.0';
const SDK = 'mustang-splits-sdk-' + SDK_VERSION;
const SDK_FILES = ['app', 'auth', 'firestore'].map((m) => `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-${m}.js`);
const SHELL = [
  './', './index.html', './styles.css', './app.js', './sync.js', './manifest.webmanifest', './version.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.svg', './icons/logo.png'
];
const TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(SHELL)),
    // The SDK is optional for the app to open; don't fail the install if gstatic is unreachable.
    caches.open(SDK).then((c) => c.addAll(SDK_FILES.map((u) => new Request(u, { mode: 'cors' })))).catch(() => {})
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mustang-splits-') && k !== CACHE && k !== FONTS && k !== SDK).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') { self.skipWaiting(); return; }
  // Auto-update (2.9.0): download every app file fresh into the cache, then answer on the port. The page reloads
  // only after this, so even a slow network at reload time can't hand it the old version again.
  if (event.data && event.data.type === 'refresh') {
    const port = event.ports && event.ports[0];
    event.waitUntil((async () => {
      let ok = false;
      try {
        const cache = await caches.open(CACHE);
        const got = await Promise.all(SHELL.map((u) => fetch(u, { cache: 'reload' }).then((r) => { if (!r.ok) throw new Error(u); return [u, r]; })));
        await Promise.all(got.map(([u, r]) => cache.put(u, r)));
        ok = true;
      } catch (e) { ok = false; }
      if (port) port.postMessage({ ok });
    })());
  }
});

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

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
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
    event.respondWith(cacheFirst(req, FONTS));
    return;
  }
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(cacheFirst(req, SDK));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/version.json')) return; // always straight to the network
    event.respondWith(networkFirst(req));
  }
});
