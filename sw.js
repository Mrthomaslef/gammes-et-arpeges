// Service worker : cache « réseau d'abord » pour le code, « cache d'abord » pour les images.
const CACHE = "gea-v8";
const CORE = ["./", "index.html", "app.css?v=8", "icons.js?v=8", "pictos.js?v=8", "app.js?v=8", "data/embedded_data.js?v=8", "manifest.webmanifest", "assets/logo.svg", "assets/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isImg = /\/assets\/(slides|schemas)\//.test(req.url);
  if (isImg) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match("index.html"))));
});
