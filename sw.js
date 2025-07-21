// sw.js - Service Worker para funcionalidade PWA
const CACHE_NAME = 'pmg-system-v2.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/client-manager.js',
    '/map-manager.js',
    '/db-manager.js',
    '/data-handler.js',
    '/modal-manager.js',
    '/api-manager.js',
    '/agenda-manager.js',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instalar SW
self.addEventListener('install', event => {
    console.log('🔧 SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('💾 SW: Armazenando arquivos em cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('✅ SW: Instalação concluída');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ SW: Erro na instalação:', error);
            })
    );
});

// Ativar SW
self.addEventListener('activate', event => {
    console.log('🚀 SW: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ SW: Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ SW: Ativação concluída');
            return self.clients.claim();
        })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    // Estratégia: Cache First para recursos estáticos, Network First para dados
    if (event.request.url.includes('/api/') || event.request.url.includes('viacep.com')) {
        // Network First para APIs
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clonar a resposta para cache
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                })
                .catch(() => {
                    // Fallback para cache se network falhar
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache First para recursos estáticos
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Retornar do cache se disponível
                    if (response) {
                        return response;
                    }
                    
                    // Buscar da network se não estiver no cache
                    return fetch(event.request)
                        .then(response => {
                            // Verificar se é uma resposta válida
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            
                            // Clonar a resposta
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        });
                })
                .catch(() => {
                    // Fallback para página offline
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                })
        );
    }
});

// Mensagens do cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
