const CACHE_NAME = 'agenda-inativos-v1.0.0.4'; // Troque o nome a cada deploy
const urlsToCache = [
  '/pmgagendainativos/',
  '/pmgagendainativos/index.html',
  '/pmgagendainativos/styles.css',
  '/pmgagendainativos/script.js',
  '/pmgagendainativos/map.js',
  '/pmgagendainativos/icon-192.png',
  '/pmgagendainativos/icon-512.png',
  '/pmgagendainativos/manifest.json'
];

// Instalação do SW
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos imediatamente
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepta fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // Sempre tenta atual (freshness over cache)
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Atualiza o cache para o próximo acesso
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => response || new Response('Offline', { status: 503 }));

      // Responde pelo cache imediatamente, e faz update para próxima visita
      return response || fetchPromise;
    })
  );
});

// Detecta novo SW
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
