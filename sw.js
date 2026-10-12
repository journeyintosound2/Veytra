/* Offline support: keeps Veytra working without internet once it has loaded.
   Bump VERSION whenever you change any file so devices pick up the update. */
var VERSION = 'veytra-v2';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/core.js', 'js/storage.js', 'js/input.js', 'js/audio.js',
  'js/lessons.js', 'js/engine.js', 'js/highway.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fonts/unbounded-latin-600-normal.woff2', 'fonts/unbounded-latin-700-normal.woff2',
  'fonts/unbounded-latin-800-normal.woff2', 'fonts/unbounded-latin-900-normal.woff2',
  'fonts/atkinson-hyperlegible-latin-400-normal.woff2', 'fonts/atkinson-hyperlegible-latin-700-normal.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Network first (so updates arrive), falling back to the cache when offline.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
  }));
});
