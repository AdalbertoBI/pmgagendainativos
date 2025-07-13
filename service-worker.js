const CACHE_NAME = 'agenda-inativos-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/map.js',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

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

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(resp => resp || fetch(event.request).catch(() => {
                console.error('Erro no fetch:', event.request.url);
                return new Response('Offline', { status: 503 });
            }))
    );
});
