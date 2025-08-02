const CACHE_NAME = 'agenda-inativos-v1.0.0.6'; // Incrementar versão

// Detectar ambiente
const isProduction = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const basePath = isProduction ? '/pmgagendainativos/' : './';

// URLs para cache - APENAS STRINGS VÁLIDAS
const urlsToCache = [
    basePath,
    basePath + 'index.html',
    basePath + 'styles.css',
    basePath + 'script.js',
    basePath + 'map.js',
    basePath + 'catalog.js',
    basePath + 'client-manager.js',
    basePath + 'database.js',
    basePath + 'icon-192.png',
    basePath + 'icon-512.png',
    basePath + 'manifest.json'
].filter(url => typeof url === 'string' && url.length > 0 && !url.includes('undefined'));

// Função para validar URLs
function isValidUrl(url) {
    try {
        return typeof url === 'string' && 
               url.length > 0 && 
               !url.includes('[object') && 
               !url.includes('undefined') &&
               (url.startsWith('http') || url.startsWith('./') || url.startsWith('/'));
    } catch {
        return false;
    }
}

// Instalação do SW com validação rigorosa
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...', urlsToCache);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Filtrar apenas URLs válidas
                const validUrls = urlsToCache.filter(isValidUrl);
                console.log('URLs válidas para cache:', validUrls);
                
                if (validUrls.length === 0) {
                    throw new Error('Nenhuma URL válida encontrada');
                }
                
                return cache.addAll(validUrls);
            })
            .then(() => {
                console.log('✅ Todas as URLs foram cachadas com sucesso');
            })
            .catch(error => {
                console.error('❌ Erro durante instalação do SW:', error);
                
                // Fallback: tentar cachear individualmente
                return caches.open(CACHE_NAME).then(cache => {
                    const validUrls = urlsToCache.filter(isValidUrl);
                    return Promise.allSettled(
                        validUrls.map(url => {
                            return cache.add(url).catch(err => {
                                console.error(`❌ Erro ao cachear ${url}:`, err);
                            });
                        })
                    );
                });
            })
    );
    self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('🗑️ Removendo cache antigo:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim();
});

// Intercepta fetch com validação
self.addEventListener('fetch', event => {
    // Ignorar requisições não-GET
    if (event.request.method !== 'GET') return;
    
    // Ignorar URLs inválidas
    if (!isValidUrl(event.request.url)) {
        console.warn('⚠️ URL inválida ignorada:', event.request.url);
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(response => {
            // Cache first, então network
            if (response) {
                return response;
            }
            
            // Buscar da rede
            return fetch(event.request)
                .then(networkResponse => {
                    // Cachear apenas respostas válidas
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback para offline
                    return new Response('Conteúdo não disponível offline', { 
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
        })
    );
});




