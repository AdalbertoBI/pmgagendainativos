const CACHE_NAME = 'agenda-inativos-v1.0.1.2'; // Nova versão incrementada
const isProduction = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
const basePath = isProduction ? '/pmgagendainativos/' : './';

const urlsToCache = [
    basePath,
    basePath + 'index.html?v=1.0.0.0',
    basePath + 'styles.css?v=1.0.0.0',
    basePath + 'script.js?v=1.0.0.0',
    basePath + 'map.js?v=1.0.0.0',
    basePath + 'catalog.js?v=1.0.0.0',
    basePath + 'client-manager.js?v=1.0.0.0',
    basePath + 'database.js?v=1.0.0.0',
    basePath + 'prospeccao.html?v=1.0.0.0',
    basePath + 'prospeccao.js?v=1.0.0.0',
    basePath + 'prospeccao.css?v=1.0.0.0',
    basePath + 'social-media-analyzer.js?v=1.0.0.0',
    basePath + 'social-media-styles.css?v=1.0.0.0',
    basePath + 'icon-192.png?v=1.0.0.0',
    basePath + 'icon-512.png?v=1.0.0.0',
    basePath + 'logo.png?v=1.0.0.0',
    basePath + 'manifest.json?v=1.0.0.0'
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

// INSTALAÇÃO COM FORÇA DE ATUALIZAÇÃO
self.addEventListener('install', event => {
    console.log('🔄 Service Worker: Instalando versão', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                const validUrls = urlsToCache.filter(isValidUrl);
                console.log('✅ URLs válidas para cache:', validUrls);
                
                if (validUrls.length === 0) {
                    throw new Error('Nenhuma URL válida encontrada');
                }
                
                return cache.addAll(validUrls);
            })
            .then(() => {
                console.log('✅ Cache atualizado com sucesso');
                // FORÇA ATIVAÇÃO IMEDIATA - CRUCIAL PARA ATUALIZAÇÃO
                return self.skipWaiting();
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
});

// ATIVAÇÃO COM LIMPEZA FORÇADA DE TODOS OS CACHES ANTIGOS
self.addEventListener('activate', event => {
    console.log('🗑️ Service Worker: Ativando e limpando caches antigos');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Todos os caches antigos removidos');
            // FORÇA CONTROLE IMEDIATO DE TODAS AS PÁGINAS
            return self.clients.claim();
        })
    );
});

// INTERCEPTAÇÃO DE FETCH COM ESTRATÉGIA CACHE-FIRST
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
            // Se encontrou no cache, retorna
            if (response) {
                return response;
            }
            
            // Se não encontrou, busca da rede
            return fetch(event.request).then(networkResponse => {
                // Cachear apenas respostas válidas
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback para offline
                return new Response('Conteúdo não disponível offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            });
        })
    );
});

// LISTENER PARA DETECTAR ATUALIZAÇÕES E NOTIFICAR O CLIENTE
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('🔄 Recebido comando para pular espera');
        self.skipWaiting();
    }
});

// NOTIFICAR CLIENTES SOBRE NOVA VERSÃO DISPONÍVEL
self.addEventListener('controllerchange', () => {
    console.log('🔄 Controller alterado - nova versão ativa');
});

//teste



