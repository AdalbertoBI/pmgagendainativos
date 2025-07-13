const CACHE_NAME = 'agenda-inativos-v2';

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

self.addEventListener('install', event => {
    console.log('Service Worker: Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache failed', error);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activate');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('Service Worker: Removing old cache', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Só intercepta requisições GET
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna do cache se encontrado
                if (response) {
                    return response;
                }
                
                // Senão, busca da rede
                return fetch(event.request)
                    .then(response => {
                        // Verifica se a resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clona a resposta para o cache
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Fallback para páginas offline
                        if (event.request.destination === 'document') {
                            return caches.match('/pmgagendainativos/index.html');
                        }
                        return new Response('Offline', { 
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});
