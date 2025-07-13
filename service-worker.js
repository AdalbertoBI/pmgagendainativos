const CACHE_NAME = 'agenda-inativos-v1';

const urlsToCache = [
  '/pmgagendainativos/',
  '/pmgagendainativos/index.html',
  '/pmgagendainativos/styles.css',
  '/pmgagendainativos/script.js',
  '/pmgagendainativos/map.js',
  '/pmgagendainativos/icon-192.png',
  '/pmgagendainativos/icon-512.png'
];

// Instala o service worker e faz cache dos arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Ativa o novo service worker e remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

// Intercepta requisições e serve do cache se offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});
