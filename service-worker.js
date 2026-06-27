const CACHE_NAME = "vidguk-family-tree-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/css/main.css",
  "./src/js/app.js",
  "./src/js/modules/i18n.js",
  "./src/js/modules/pwa.js",
  "./src/lang/uk.json",
  "./src/lang/en.json",
  "./src/lang/pl.json",
  "./src/lang/de.json",
  "./src/assets/icons/icon-192.png",
  "./src/assets/icons/icon-512.png",
  "./src/js/vendor/jszip.min.js"
];
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
