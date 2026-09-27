// sw.js — Cinmin PWA v1.1 (Chromebook)
// Versioned: cinmin-shell-v1 -> bump to v2 on deploy to force update
const CACHE = 'cinmin-shell-v1';
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('cinmin-shell-') && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache external sites (github, google, etc.)
  if (url.hostname.includes('github.com') || url.hostname.includes('google.com') || url.hostname.includes('youtube.com')) return;
  if (url.pathname.startsWith('/assets/') || url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => hit))
    );
  }
});
