// service-worker.js - Service Worker otimizado para funcionamento offline COMPLETO

const CACHE_NAME = 'pmg-agenda-v3.4';
const CACHE_VERSION = '3.2';

// Arquivos para cache - TODOS os recursos necessários
const STATIC_CACHE_FILES = [
    '/pmgagendainativos/',
    '/pmgagendainativos/index.html',
    '/pmgagendainativos/script.js',
    '/pmgagendainativos/client-manager.js',
    '/pmgagendainativos/dbManager.js',
    '/pmgagendainativos/map.js',
    '/pmgagendainativos/styles.css',
    '/pmgagendainativos/manifest.json',
    '/pmgagendainativos/icon-48.png',
    '/pmgagendainativos/icon-192.png',
    '/pmgagendainativos/icon-512.png',
    // CDN resources
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// URLs que devem sempre buscar da rede (quando disponível)
const NETWORK_FIRST_URLS = [
    'nominatim.openstreetmap.org',
    'tile.openstreetmap.org',
    '/pmgagendainativos/api/'
];

const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;
const DYNAMIC_CACHE_LIMIT = 150; // Aumentado para suportar mais conteúdo offline

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalando versão', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('📦 Service Worker: Cacheando arquivos estáticos');
            
            // Cachear arquivos um por um para melhor controle de erros
            const cachePromises = STATIC_CACHE_FILES.map(async (url) => {
                try {
                    // Para recursos externos, usar mode: 'cors'
                    const fetchOptions = url.startsWith('http') ? 
                        { mode: 'cors', cache: 'no-cache' } : 
                        { cache: 'no-cache' };
                    
                    const response = await fetch(url, fetchOptions);
                    
                    if (response.ok) {
                        await cache.put(url, response);
                        console.log(`✅ Cacheado: ${url}`);
                    } else {
                        console.warn(`⚠️ Não foi possível cachear ${url}: ${response.status}`);
                        
                        // Para recursos locais que falharam, tentar alternativa
                        if (url.startsWith('/pmgagendainativos/')) {
                            try {
                                const alternativeResponse = await fetch(url.replace('/pmgagendainativos/', './'));
                                if (alternativeResponse.ok) {
                                    await cache.put(url, alternativeResponse);
                                    console.log(`✅ Cacheado (alternativo): ${url}`);
                                }
                            } catch (altError) {
                                console.warn(`⚠️ Falha alternativa para ${url}:`, altError);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Erro ao cachear ${url}:`, error.message);
                    
                    // Tentar estratégias de fallback
                    if (url.startsWith('/pmgagendainativos/')) {
                        const fallbacks = [
                            url.replace('/pmgagendainativos/', './'),
                            url.replace('/pmgagendainativos/', ''),
                            url.substring(url.lastIndexOf('/') + 1)
                        ];
                        
                        for (const fallback of fallbacks) {
                            try {
                                const fallbackResponse = await fetch(fallback);
                                if (fallbackResponse.ok) {
                                    await cache.put(url, fallbackResponse);
                                    console.log(`✅ Cacheado (fallback): ${url} -> ${fallback}`);
                                    break;
                                }
                            } catch (fallbackError) {
                                continue;
                            }
                        }
                    }
                }
            });
            
            await Promise.allSettled(cachePromises);
            console.log('✅ Service Worker: Cache inicial concluído');
            
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
            // Assumir controle imediato
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Ativação concluída');
            
            // Notificar clientes da nova versão
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        }).catch((error) => {
            console.error('❌ Service Worker: Erro na ativação:', error);
        })
    );
});

// Interceptar requisições - Estratégia otimizada para offline
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    
    // Ignorar requests que não são GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Ignorar Chrome extensions e outros protocolos não HTTP
    if (!requestUrl.protocol.startsWith('http')) {
        return;
    }
    
    // Estratégia Network First para APIs e mapas
    if (NETWORK_FIRST_URLS.some(url => requestUrl.href.includes(url))) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    // Estratégia Cache First para recursos estáticos
    if (STATIC_CACHE_FILES.some(url => {
        const urlPath = requestUrl.pathname;
        const staticPath = new URL(url, self.location).pathname;
        return urlPath === staticPath || event.request.url === url;
    })) {
        event.respondWith(cacheFirstStrategy(event.request));
        return;
    }
    
    // Estratégia híbrida para outros recursos
    event.respondWith(hybridStrategy(event.request));
});

// Estratégia Cache First - Otimizada para recursos estáticos
async function cacheFirstStrategy(request) {
    try {
        const cacheResponse = await caches.match(request);
        
        if (cacheResponse) {
            console.log('📦 Cache hit:', request.url);
            
            // Atualizar em background se possível
            updateCacheInBackground(request);
            return cacheResponse;
        }
        
        console.log('🌐 Cache miss, buscando da rede:', request.url);
        const networkResponse = await fetchWithTimeout(request, 15000);
        
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            console.log('✅ Recurso cacheado:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('❌ Falha em cache first:', error);
        
        // Fallback para cache mesmo se expirado
        const staleCache = await caches.match(request);
        if (staleCache) {
            console.log('📦 Servindo cache expirado:', request.url);
            return staleCache;
        }
        
        return createOfflineResponse(request);
    }
}

// Estratégia Network First - Para conteúdo dinâmico
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 10000);
        
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
            console.log('✅ Recurso dinâmico cacheado:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('📦 Network falhou, tentando cache:', request.url);
        const cacheResponse = await caches.match(request);
        
        if (cacheResponse) {
            return cacheResponse;
        }
        
        return createOfflineResponse(request);
    }
}

// Estratégia híbrida - Equilibrio entre cache e network
async function hybridStrategy(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const cacheResponse = await cache.match(request);
        
        // Se temos cache, servir imediatamente e atualizar em background
        if (cacheResponse) {
            console.log('📦 Servindo do cache híbrido:', request.url);
            updateCacheInBackground(request);
            return cacheResponse;
        }
        
        // Se não temos cache, buscar da rede
        const networkResponse = await fetchWithTimeout(request, 8000);
        
        if (networkResponse && networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        }
        
        return networkResponse;
    } catch (error) {
        return createOfflineResponse(request);
    }
}

// Fetch com timeout melhorado
function fetchWithTimeout(request, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`Timeout após ${timeout}ms`));
        }, timeout);
        
        const fetchOptions = {
            signal: controller.signal,
            cache: 'no-cache'
        };
        
        // Para recursos externos, usar mode cors
        if (request.url.startsWith('http') && !request.url.includes(self.location.origin)) {
            fetchOptions.mode = 'cors';
        }
        
        fetch(request.clone(), fetchOptions)
            .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

// Atualizar cache em background
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse);
            console.log('🔄 Cache atualizado em background:', request.url);
        }
    } catch (error) {
        // Falha silenciosa em background updates
    }
}

// Criar resposta offline personalizada
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    // Para navegação (páginas HTML)
    if (request.destination === 'document' || 
        request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/pmgagendainativos/index.html').then(response => {
            return response || new Response(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>PMG Agenda - Offline</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-align: center;
                        }
                        .offline-icon {
                            font-size: 4rem;
                            margin-bottom: 1rem;
                        }
                        h1 { margin-bottom: 0.5rem; }
                        p { margin-bottom: 1.5rem; opacity: 0.9; }
                        button {
                            background: rgba(255,255,255,0.2);
                            border: 2px solid white;
                            color: white;
                            padding: 0.75rem 1.5rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        }
                        button:hover {
                            background: rgba(255,255,255,0.3);
                        }
                    </style>
                </head>
                <body>
                    <div class="offline-icon">🌐</div>
                    <h1>Você está offline</h1>
                    <p>O aplicativo PMG Agenda carregará assim que a conexão for restaurada.</p>
                    <button onclick="location.reload()">🔄 Tentar Novamente</button>
                </body>
                </html>
            `, {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'text/html' }
            });
        });
    }
    
    // Para recursos JavaScript
    if (request.destination === 'script' || url.pathname.endsWith('.js')) {
        return new Response('console.log("Recurso offline - JS não disponível");', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    // Para recursos CSS
    if (request.destination === 'style' || url.pathname.endsWith('.css')) {
        return new Response('/* Recurso offline - CSS não disponível */', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    // Para outros tipos de conteúdo
    return new Response(JSON.stringify({
        error: 'Offline',
        message: 'Este recurso não está disponível offline',
        url: request.url,
        timestamp: new Date().toISOString()
    }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
    });
}

// Limitar tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxItems) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxItems) {
            const itemsToDelete = keys.slice(0, keys.length - maxItems);
            await Promise.all(itemsToDelete.map(key => cache.delete(key)));
            console.log(`🧹 Cache limitado: ${itemsToDelete.length} itens removidos de ${cacheName}`);
        }
    } catch (error) {
        console.error('❌ Erro ao limitar cache:', error);
    }
}

// Background sync para quando voltar online
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync:', event.tag);
    
    if (event.tag === 'background-sync-clients') {
        event.waitUntil(syncOfflineData());
    }
});

// Sincronizar dados offline
async function syncOfflineData() {
    try {
        console.log('🔄 Sincronizando dados offline...');
        
        // Notificar clientes que a sincronização iniciou
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_STARTED'
            });
        });
        
        // Aqui você pode implementar lógica específica de sincronização
        // Por exemplo, enviar dados pendentes para o servidor
        
        console.log('✅ Sincronização concluída');
        
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED'
            });
        });
        
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_FAILED',
                error: error.message
            });
        });
    }
}

// Push notifications (preparado para futuro uso)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Nova atualização da PMG Agenda',
            icon: '/pmgagendainativos/icon-192.png',
            badge: '/pmgagendainativos/icon-48.png',
            vibrate: [200, 100, 200],
            data: data.data || {},
            actions: [
                { action: 'open', title: 'Abrir', icon: '/pmgagendainativos/icon-48.png' },
                { action: 'close', title: 'Fechar' }
            ],
            requireInteraction: true,
            silent: false
        };
        
        event.waitUntil(
            self.registration.showNotification(
                data.title || 'PMG Agenda Clientes',
                options
            )
        );
    } catch (error) {
        console.error('❌ Erro ao processar push:', error);
    }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/pmgagendainativos/')
        );
    }
});

// Comunicação com cliente
self.addEventListener('message', (event) => {
    console.log('💬 Mensagem recebida:', event.data);
    
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
                
            case 'CACHE_URLS':
                if (event.data.urls) {
                    cacheSpecificUrls(event.data.urls).then((result) => {
                        event.ports[0].postMessage({ cached: result });
                    });
                }
                break;
                
            case 'GET_CACHE_STATUS':
                getCacheStatus().then((status) => {
                    event.ports[0].postMessage({ status });
                });
                break;
                
            default:
                console.log('⚠️ Tipo de mensagem desconhecido:', event.data.type);
        }
    }
});

// Obter status do cache
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[cacheName] = {
                itemCount: keys.length,
                urls: keys.map(request => request.url).slice(0, 10) // Primeiras 10 URLs
            };
        }
        
        return {
            version: CACHE_VERSION,
            caches: status,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { error: error.message };
    }
}

// Cachear URLs específicas
async function cacheSpecificUrls(urls) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const results = [];
        
        for (const url of urls) {
            try {
                const response = await fetchWithTimeout(url, 10000);
                if (response && response.ok) {
                    await cache.put(url, response);
                    results.push({ url, success: true });
                } else {
                    results.push({ 
                        url, 
                        success: false, 
                        error: `Status ${response ? response.status : 'unknown'}` 
                    });
                }
            } catch (error) {
                results.push({ url, success: false, error: error.message });
            }
        }
        
        await limitCacheSize(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
        return results;
    } catch (error) {
        console.error('❌ Erro ao cachear URLs específicas:', error);
        return [];
    }
}

// Limpar todos os caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('🧹 Todos os caches limpos');
        return true;
    } catch (error) {
        console.error('❌ Erro ao limpar caches:', error);
        return false;
    }
}

// Tratamento global de erros
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker: Erro global:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker: Promise rejeitada:', event.reason);
    event.preventDefault();
});

console.log(`✅ Service Worker carregado - Versão ${CACHE_VERSION} (Offline Completo Melhorado)`);
