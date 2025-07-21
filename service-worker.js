// service-worker.js - Service Worker corrigido para resolver erros de clone

const CACHE_NAME = 'pmg-agenda-v2.2';
const CACHE_VERSION = '2.2';

// Arquivos para cache
const STATIC_CACHE_FILES = [
    '/pmgagendainativos/',
    '/pmgagendainativos/index.html',
    '/pmgagendainativos/script.js',
    '/pmgagendainativos/client-manager.js',
    '/pmgagendainativos/dbManager.js',
    '/pmgagendainativos/map.js',
    '/pmgagendainativos/manifest.json',
    '/pmgagendainativos/icon-48.png',
    '/pmgagendainativos/icon-192.png',
    '/pmgagendainativos/icon-512.png',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// URLs que devem sempre buscar da rede
const NETWORK_FIRST_URLS = [
    'nominatim.openstreetmap.org',
    'tile.openstreetmap.org',
    '/pmgagendainativos/api/'
];

// Cache de dados dinâmicos
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;
const DYNAMIC_CACHE_LIMIT = 50;

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalando versão', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Service Worker: Cacheando arquivos estáticos');
            return Promise.allSettled(
                STATIC_CACHE_FILES.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            return cache.put(url, response);
                        } else {
                            console.warn(`⚠️ Não foi possível cachear ${url}: ${response.status}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Erro ao cachear ${url}:`, error);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker: Instalação concluída');
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Service Worker: Erro na instalação:', error);
        })
    );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Ativando versão', CACHE_VERSION);
    event.waitUntil(
        Promise.all([
            // Limpar caches antigos
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                            console.log('🧹 Service Worker: Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Assumir controle de todas as páginas
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Ativação concluída');
        }).catch((error) => {
            console.error('❌ Service Worker: Erro na ativação:', error);
        })
    );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Ignorar requests que não são GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorar requests do Chrome DevTools
    if (requestUrl.protocol === 'chrome-extension:') {
        return;
    }

    // Estratégia Network First para URLs específicas
    if (NETWORK_FIRST_URLS.some(url => requestUrl.href.includes(url))) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Estratégia Cache First para arquivos estáticos
    if (STATIC_CACHE_FILES.some(url => {
        const fileName = url.split('/').pop();
        return event.request.url.includes(fileName) || event.request.url === url;
    })) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Estratégia Cache First com fallback para outros recursos
    event.respondWith(cacheFirstWithFallback(event.request));
});

// Estratégia Cache First - CORRIGIDA
async function cacheFirst(request) {
    try {
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            console.log('📦 Service Worker: Servindo do cache:', request.url);
            return cacheResponse;
        }

        console.log('🌐 Service Worker: Buscando da rede:', request.url);
        const networkResponse = await fetch(request.clone()); // Clone da request, não da response
        
        // Verificar se a resposta é válida antes de cachear
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            // Clonar ANTES de usar a response
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache);
        }

        return networkResponse;
    } catch (error) {
        console.error('❌ Service Worker: Erro em cacheFirst:', error);
        
        // Tentar buscar do cache como fallback
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            return cacheResponse;
        }

        return new Response('Offline - Recurso não disponível', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Estratégia Network First - CORRIGIDA
async function networkFirst(request) {
    try {
        console.log('🌐 Service Worker: Network first para:', request.url);
        
        // Configurar timeout para evitar esperas longas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const networkResponse = await fetch(request.clone(), {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // Cache da resposta se for bem-sucedida
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            // Clonar ANTES de usar a response
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache);
            
            // Limitar tamanho do cache dinâmico
            limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        }

        return networkResponse;
    } catch (error) {
        console.log('📦 Service Worker: Rede falhou, tentando cache:', request.url);
        
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            return cacheResponse;
        }

        return new Response('Offline - Dados não disponíveis', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Estratégia Cache First com fallback - CORRIGIDA
async function cacheFirstWithFallback(request) {
    try {
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            console.log('📦 Service Worker: Cache hit:', request.url);
            return cacheResponse;
        }

        console.log('🌐 Service Worker: Cache miss, buscando da rede:', request.url);
        const networkResponse = await fetch(request.clone());
        
        // Cache apenas respostas bem-sucedidas
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            // Clonar ANTES de usar a response
            const responseToCache = networkResponse.clone();
            cache.put(request, responseToCache);
            
            // Limitar tamanho do cache dinâmico
            limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        }

        return networkResponse;
    } catch (error) {
        console.error('❌ Service Worker: Erro em cacheFirstWithFallback:', error);
        
        // Fallback para página offline se for uma navegação
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/pmgagendainativos/index.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }

        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Limitar tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxItems) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxItems) {
            console.log(`🧹 Service Worker: Limpando cache ${cacheName}, ${keys.length} > ${maxItems}`);
            
            // Remover itens mais antigos
            const itemsToDelete = keys.slice(0, keys.length - maxItems);
            await Promise.all(itemsToDelete.map(key => cache.delete(key)));
            
            console.log(`✅ Service Worker: ${itemsToDelete.length} itens removidos do cache`);
        }
    } catch (error) {
        console.error('❌ Service Worker: Erro ao limitar cache:', error);
    }
}

// Sincronização em background
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Evento de sincronização:', event.tag);
    
    if (event.tag === 'background-sync-clients') {
        event.waitUntil(syncClients());
    }
});

// Função de sincronização de clientes
async function syncClients() {
    try {
        console.log('🔄 Service Worker: Sincronizando dados de clientes...');
        // Implementar lógica de sincronização quando necessário
        console.log('✅ Service Worker: Sincronização concluída');
    } catch (error) {
        console.error('❌ Service Worker: Erro na sincronização:', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        console.log('📬 Service Worker: Push recebido:', data);
        
        const options = {
            body: data.body || 'Nova notificação da PMG Agenda',
            icon: '/pmgagendainativos/icon-192.png',
            badge: '/pmgagendainativos/icon-48.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: [
                {
                    action: 'open',
                    title: 'Abrir App'
                },
                {
                    action: 'close',
                    title: 'Fechar'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'PMG Agenda', options)
        );
    } catch (error) {
        console.error('❌ Service Worker: Erro ao processar push:', error);
    }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
    console.log('👆 Service Worker: Notificação clicada:', event.action);
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/pmgagendainativos/')
        );
    }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
    console.log('💬 Service Worker: Mensagem recebida:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({
                    version: CACHE_VERSION,
                    cacheName: CACHE_NAME
                });
                break;
                
            case 'CLEAR_CACHE':
                clearAllCaches().then((success) => {
                    event.ports[0].postMessage({ success });
                });
                break;
                
            default:
                console.log('⚠️ Service Worker: Tipo de mensagem desconhecido:', event.data.type);
        }
    }
});

// Limpar todos os caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 Service Worker: Todos os caches foram limpos');
        return true;
    } catch (error) {
        console.error('❌ Service Worker: Erro ao limpar caches:', error);
        return false;
    }
}

// Tratamento de erros não capturados
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker: Erro não capturado:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker: Promise rejeitada:', event.reason);
    event.preventDefault();
});

// Log de inicialização
console.log(`✅ Service Worker carregado - Versão ${CACHE_VERSION}`);
console.log('🔧 Recursos em cache:', STATIC_CACHE_FILES.length);
console.log('📦 Cache dinâmico limitado a:', DYNAMIC_CACHE_LIMIT, 'itens');
