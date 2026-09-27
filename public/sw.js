// sw.js — Cinmin PWA (Chromebook offline)
// Cache core shell only — HTML/CSS/JS/icons, not external sites

const CACHE = 'cinmin-v1';
const CORE = [
  './',
  './index.html',
  // Vite hashed assets will be cached on fetch — we cache everything with same-origin
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only cache same-origin GET
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Don't cache external websites (browser iframe)
  if (url.pathname.startsWith('/assets/') || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        // cache new assets
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  }
});
