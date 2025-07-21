// map.js - Versão DEFINITIVAMENTE corrigida para resolver problemas de geocodificação e rate limiting

(function() {
    'use strict';

    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;
    let currentMarkers = [];
    let geocodingCache = new Map();
    let isMapInitialized = false;
    let userLocation = null;
    let geocodingStats = { total: 0, success: 0, errors: 0, cached: 0 };
    let initializationAttempts = 0;
    let maxInitializationAttempts = 3;
    
    // RATE LIMITING - Controle rigoroso de requisições
    let geocodingQueue = [];
    let isProcessingQueue = false;
    let lastRequestTime = 0;
    const MIN_REQUEST_INTERVAL = 1500; // 1.5 segundos entre requests
    const MAX_CONCURRENT_REQUESTS = 1; // Apenas 1 request por vez
    
    const SJC_CONFIG = {
        center: [-23.2237, -45.9009],
        defaultZoom: 12,
        maxZoom: 18,
        minZoom: 10
    };

    // Verificar se Leaflet está disponível
    function isLeafletReady() {
        return typeof L !== 'undefined' && L.map && L.tileLayer && L.circleMarker && L.layerGroup;
    }

    // Mostrar erro no container do mapa
    function showMapError(message, showRetry = true) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        mapContainer.style.height = '500px';
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; padding: 2rem; background: #f8f9fa;">
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
                <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Problema no Mapa</h3>
                <p style="margin: 0 0 1.5rem 0; font-size: 1rem; max-width: 400px; line-height: 1.5;">${message}</p>
                ${showRetry ? `
                    <button onclick="window.mapManager.forceRetry()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s ease;">
                        🔄 Tentar Novamente
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Mostrar loading
    function showMapLoading(message = 'Carregando mapa...') {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        mapContainer.style.height = '500px';
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; background: #f8f9fa;">
                <div style="width: 50px; height: 50px; border: 5px solid #e3e3e3; border-top: 5px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1.5rem;"></div>
                <p style="margin: 0; font-size: 1.1rem; font-weight: 500;">${message}</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    class MapManager {
        constructor() {
            this.initialized = false;
            this.initializationPromise = null;
            this.retryCount = 0;
            this.maxRetries = 3;
        }

        async init() {
            if (this.initialized) {
                console.log('🗺️ Mapa já inicializado');
                this.ensureMapVisible();
                return true;
            }

            if (this.initializationPromise) {
                console.log('🗺️ Aguardando inicialização em progresso...');
                return await this.initializationPromise;
            }

            this.initializationPromise = this._performInit();
            return await this.initializationPromise;
        }

        async _performInit() {
            try {
                initializationAttempts++;
                console.log(`🗺️ Tentativa de inicialização ${initializationAttempts}/${maxInitializationAttempts}`);
                
                showMapLoading('Verificando dependências...');

                // PASSO 1: Garantir container
                if (!this.ensureMapContainer()) {
                    throw new Error('Container do mapa não pôde ser configurado');
                }

                // PASSO 2: Aguardar Leaflet
                if (!isLeafletReady()) {
                    console.log('⏳ Aguardando Leaflet...');
                    showMapLoading('Carregando biblioteca Leaflet...');
                    await this.waitForLeaflet(20000); // 20 segundos
                }

                showMapLoading('Inicializando mapa...');

                // PASSO 3: Garantir aba ativa
                await this.ensureMapTabActive();

                // PASSO 4: Criar mapa
                await this.createMap();

                // PASSO 5: Aguardar dados (opcional)
                showMapLoading('Carregando dados...');
                await this.waitForClientData();

                // PASSO 6: Cache e marcadores com delay maior
                this.loadGeocodingCache();
                
                // DELAY MAIOR para evitar rate limiting
                showMapLoading('Preparando marcadores...');
                setTimeout(async () => {
                    await this.updateAllMarkers();
                }, 2000);

                this.initialized = true;
                console.log('✅ MapManager inicializado com sucesso');
                return true;

            } catch (error) {
                console.error(`❌ Erro na tentativa ${initializationAttempts}:`, error);
                
                if (initializationAttempts < maxInitializationAttempts) {
                    showMapError(`Falha na tentativa ${initializationAttempts}. Tentando novamente em 3 segundos...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    this.initialized = false;
                    this.initializationPromise = null;
                    return this._performInit();
                } else {
                    showMapError('Falha persistente ao carregar mapa. O mapa funcionará apenas com dados em cache.');
                    this.initialized = true; // Marcar como inicializado mesmo com falha
                    return false;
                }
            } finally {
                this.initializationPromise = null;
            }
        }

        ensureMapContainer() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.error('❌ Container #map não encontrado');
                return false;
            }

            mapContainer.style.height = '500px';
            mapContainer.style.width = '100%';
            mapContainer.style.minHeight = '500px';
            mapContainer.style.position = 'relative';
            mapContainer.style.zIndex = '1';
            
            console.log('✅ Container configurado');
            return true;
        }

        async ensureMapTabActive() {
            const mapTab = document.getElementById('mapa-tab');
            if (mapTab && !mapTab.classList.contains('active')) {
                console.log('📋 Aba não ativa, mas continuando...');
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.style.display = 'block';
                    mapContainer.style.visibility = 'visible';
                }
            }
        }

        async waitForLeaflet(timeout = 20000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                const checkLeaflet = () => {
                    if (isLeafletReady()) {
                        console.log('✅ Leaflet disponível');
                        resolve();
                        return;
                    }

                    if (Date.now() - startTime > timeout) {
                        reject(new Error('Timeout aguardando Leaflet. Verifique a conexão.'));
                        return;
                    }

                    setTimeout(checkLeaflet, 500);
                };

                checkLeaflet();
            });
        }

        async waitForClientData(timeout = 8000) {
            return new Promise((resolve) => {
                const startTime = Date.now();

                const checkClientData = () => {
                    if (window.clientManager && 
                        window.clientManager.initialized && 
                        (window.clientManager.data?.length > 0 || 
                         window.clientManager.ativos?.length > 0 || 
                         window.clientManager.novos?.length > 0)) {
                        console.log('✅ Dados disponíveis');
                        resolve();
                        return;
                    }

                    if (Date.now() - startTime > timeout) {
                        console.log('⏰ Timeout aguardando dados - continuando');
                        resolve();
                        return;
                    }

                    setTimeout(checkClientData, 500);
                };

                checkClientData();
            });
        }

        async createMap() {
            try {
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    throw new Error('Container não encontrado');
                }

                // Limpar
                mapContainer.innerHTML = '';
                await new Promise(resolve => requestAnimationFrame(resolve));

                console.log('🗺️ Criando mapa...');

                // Criar mapa
                map = L.map('map', {
                    center: SJC_CONFIG.center,
                    zoom: SJC_CONFIG.defaultZoom,
                    zoomControl: true,
                    scrollWheelZoom: true,
                    doubleClickZoom: true,
                    touchZoom: true,
                    dragging: true,
                    boxZoom: true,
                    keyboard: true,
                    maxZoom: SJC_CONFIG.maxZoom,
                    minZoom: SJC_CONFIG.minZoom,
                    attributionControl: true,
                    renderer: L.canvas() // Canvas para melhor performance
                });

                console.log('🗺️ Adicionando tiles...');

                // Tiles com timeout maior
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: SJC_CONFIG.maxZoom,
                    minZoom: SJC_CONFIG.minZoom,
                    subdomains: ['a', 'b', 'c'],
                    timeout: 15000, // 15 segundos
                    errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSI+Erro</text></svg>'
                });

                // Aguardar tiles
                await new Promise((resolve) => {
                    tileLayer.on('load', resolve);
                    tileLayer.on('tileerror', resolve);
                    tileLayer.addTo(map);
                    setTimeout(resolve, 5000); // Timeout de segurança
                });

                console.log('✅ Tiles carregados');

                // Layer de marcadores
                markersLayer = L.layerGroup().addTo(map);

                // Event listeners
                map.on('load', () => {
                    console.log('✅ Mapa carregado');
                    isMapInitialized = true;
                });

                map.on('error', (e) => {
                    console.error('❌ Erro no mapa:', e);
                });

                // FORÇAR invalidateSize múltiplas vezes
                const invalidateTimes = [500, 1000, 2000, 3000];
                invalidateTimes.forEach(delay => {
                    setTimeout(() => {
                        if (map) {
                            map.invalidateSize(true);
                            console.log(`🔄 invalidateSize (${delay}ms)`);
                        }
                    }, delay);
                });

                // Aguardar inicialização
                await new Promise((resolve) => {
                    if (map._loaded) {
                        resolve();
                    } else {
                        map.once('load', resolve);
                        setTimeout(resolve, 10000); // 10 segundos timeout
                    }
                });

                // Localização do usuário
                this.getUserLocation();

                console.log('✅ Mapa criado');
                isMapInitialized = true;

                // Forçar redraw final
                if (map && map._container) {
                    map._container.style.display = 'none';
                    map._container.offsetHeight;
                    map._container.style.display = 'block';
                    map.invalidateSize(true);
                }

            } catch (error) {
                console.error('❌ Erro ao criar mapa:', error);
                throw error;
            }
        }

        ensureMapVisible() {
            if (map && map._container) {
                console.log('🔄 Garantindo visibilidade...');
                
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize(true);
                        
                        if (!map.getBounds().contains(SJC_CONFIG.center)) {
                            map.setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
                        }
                        
                        console.log('✅ Mapa revalidado');
                    }
                }, 200);
                
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize(true);
                    }
                }, 1000);
            }
        }

        getUserLocation() {
            if (!navigator.geolocation) {
                console.log('⚠️ Geolocalização não disponível');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };

                    console.log('📍 Localização obtida');

                    if (map && isMapInitialized) {
                        this.addUserLocationMarker();
                    }
                },
                (error) => {
                    console.warn('⚠️ Erro localização:', error.message);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: 600000
                }
            );
        }

        addUserLocationMarker() {
            if (!userLocation || !map) return;

            try {
                if (userLocationMarker) {
                    markersLayer.removeLayer(userLocationMarker);
                }

                userLocationMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
                    color: '#007bff',
                    fillColor: '#007bff',
                    fillOpacity: 0.7,
                    radius: 10,
                    weight: 3
                }).bindPopup(`
                    <div style="text-align: center; padding: 0.5rem;">
                        <strong>📍 Sua Localização</strong><br>
                        Precisão: ±${Math.round(userLocation.accuracy)}m
                    </div>
                `);

                markersLayer.addLayer(userLocationMarker);
                console.log('✅ Marcador de localização adicionado');

            } catch (error) {
                console.error('❌ Erro marcador localização:', error);
            }
        }

        // SISTEMA DE GEOCODIFICAÇÃO COM RATE LIMITING RIGOROSO
        async updateAllMarkers() {
            if (!map || !isMapInitialized) {
                console.log('⚠️ Mapa não pronto para marcadores');
                return;
            }

            try {
                console.log('🗺️ Atualizando marcadores com rate limiting...');

                this.clearClientMarkers();
                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente para mapear');
                    return;
                }

                console.log(`📍 Processando ${allClients.length} clientes com rate limiting`);

                // PROCESSAR UM POR VEZ com delay grande
                let processedCount = 0;
                for (const client of allClients) {
                    try {
                        console.log(`📍 Processando ${processedCount + 1}/${allClients.length}: ${client['Nome Fantasia'] || 'Sem nome'}`);
                        
                        await this.addClientMarkerWithRateLimit(client);
                        processedCount++;
                        
                        // DELAY OBRIGATÓRIO entre cada cliente
                        if (processedCount < allClients.length) {
                            console.log(`⏳ Aguardando ${MIN_REQUEST_INTERVAL}ms...`);
                            await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));
                        }
                        
                    } catch (clientError) {
                        console.warn(`⚠️ Erro no cliente ${client['Nome Fantasia']}:`, clientError);
                        continue;
                    }
                }

                this.fitMapToBounds();
                console.log(`✅ ${processedCount}/${allClients.length} clientes processados`);
                this.saveGeocodingCache();

            } catch (error) {
                console.error('❌ Erro ao atualizar marcadores:', error);
            }
        }

        getAllClients() {
            const allClients = [];

            if (window.clientManager) {
                if (Array.isArray(window.clientManager.data)) {
                    allClients.push(...window.clientManager.data.map(c => ({...c, category: 'Inativo'})));
                }
                if (Array.isArray(window.clientManager.ativos)) {
                    allClients.push(...window.clientManager.ativos.map(c => ({...c, category: 'Ativo'})));
                }
                if (Array.isArray(window.clientManager.novos)) {
                    allClients.push(...window.clientManager.novos.map(c => ({...c, category: 'Novo'})));
                }
            }

            return allClients;
        }

        async addClientMarkerWithRateLimit(client) {
            try {
                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A' || endereco.trim() === '') {
                    return null;
                }

                // Obter coordenadas COM rate limiting
                const coords = await this.getCoordinatesWithRateLimit(endereco);
                if (!coords) {
                    console.log(`❌ Sem coordenadas: ${client['Nome Fantasia']}`);
                    return null;
                }

                const markerStyle = this.getMarkerStyle(client.category);
                const marker = L.circleMarker([coords.lat, coords.lng], markerStyle.style);

                const cidade = window.clientManager?.extrairCidadeDoItem(client) || 'N/A';
                const popupContent = `
                    <div style="min-width: 200px; padding: 0.5rem;">
                        <div style="background: ${markerStyle.color}; color: white; padding: 0.5rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; border-radius: 4px 4px 0 0; text-align: center;">
                            <strong>${markerStyle.icon} ${client['Nome Fantasia'] || 'Cliente'}</strong>
                        </div>
                        <div>
                            <strong>Status:</strong> ${client.category}<br>
                            <strong>Cidade:</strong> ${cidade}<br>
                            <strong>Segmento:</strong> ${client['Segmento'] || 'N/A'}
                        </div>
                        <div style="text-align: center; margin-top: 0.5rem;">
                            <button onclick="window.clientManager && window.clientManager.showClientModal(${JSON.stringify(client).replace(/"/g, '&quot;')})" 
                                    style="background: #007bff; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">
                                📋 Ver Detalhes
                            </button>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                markersLayer.addLayer(marker);
                currentMarkers.push(marker);

                console.log(`✅ Marcador adicionado: ${client['Nome Fantasia']}`);
                return marker;

            } catch (error) {
                console.error('❌ Erro ao adicionar marcador:', error);
                return null;
            }
        }

        getMarkerStyle(category) {
            switch (category) {
                case 'Ativo':
                    return {
                        style: { color: '#28a745', fillColor: '#28a745', fillOpacity: 0.8, radius: 8, weight: 2 },
                        color: '#28a745',
                        icon: '🟢'
                    };
                case 'Novo':
                    return {
                        style: { color: '#17a2b8', fillColor: '#17a2b8', fillOpacity: 0.8, radius: 8, weight: 2 },
                        color: '#17a2b8',
                        icon: '🆕'
                    };
                default:
                    return {
                        style: { color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.8, radius: 8, weight: 2 },
                        color: '#dc3545',
                        icon: '🔴'
                    };
            }
        }

        // GEOCODIFICAÇÃO COM RATE LIMITING RIGOROSO
        async getCoordinatesWithRateLimit(endereco) {
            try {
                geocodingStats.total++;

                // Cache primeiro
                const cacheKey = this.normalizeAddress(endereco);
                if (geocodingCache.has(cacheKey)) {
                    geocodingStats.cached++;
                    const cached = geocodingCache.get(cacheKey);
                    console.log('📦 Cache hit');
                    return cached;
                }

                // RATE LIMITING: Aguardar interval mínimo
                const now = Date.now();
                const timeSinceLastRequest = now - lastRequestTime;
                if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
                    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
                    console.log(`⏳ Rate limiting: aguardando ${waitTime}ms`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const cleanAddress = this.cleanAddress(endereco);
                const query = encodeURIComponent(`${cleanAddress}, São José dos Campos, SP, Brasil`);
                
                // URLs com fallback
                const urls = [
                    `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`,
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress + ', SP, Brasil')}&limit=1&countrycodes=br`
                ];

                for (let i = 0; i < urls.length; i++) {
                    try {
                        console.log(`🌐 Geocodificando (tentativa ${i + 1}): ${cleanAddress.substring(0, 40)}...`);
                        
                        lastRequestTime = Date.now();
                        
                        // Request com timeout MUITO maior
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => {
                            console.log('⏰ Timeout na geocodificação');
                            controller.abort();
                        }, 15000); // 15 segundos

                        const response = await fetch(urls[i], {
                            headers: {
                                'User-Agent': 'PMG-Agenda-App/1.0 (contact: admin@pmg.com)'
                            },
                            signal: controller.signal,
                            cache: 'no-cache'
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            if (response.status === 429) {
                                console.warn('⚠️ Rate limit atingido, aguardando mais...');
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                continue;
                            }
                            throw new Error(`HTTP ${response.status}`);
                        }

                        const data = await response.json();

                        if (data && data.length > 0) {
                            const result = {
                                lat: parseFloat(data[0].lat),
                                lng: parseFloat(data[0].lon)
                            };

                            // Validar coordenadas (região de São José dos Campos ampliada)
                            if (result.lat >= -24.5 && result.lat <= -21.5 && 
                                result.lng >= -47.5 && result.lng <= -44.5) {
                                
                                geocodingCache.set(cacheKey, result);
                                geocodingStats.success++;
                                console.log('✅ Geocodificação OK');
                                
                                return result;
                            } else {
                                console.warn('⚠️ Coordenadas fora da região válida');
                            }
                        }

                        if (i < urls.length - 1) {
                            console.log('⏳ Tentando URL alternativa...');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }

                    } catch (fetchError) {
                        console.warn(`⚠️ Erro na tentativa ${i + 1}:`, fetchError.message);
                        
                        if (fetchError.name === 'AbortError') {
                            console.log('🚫 Request abortado por timeout');
                        }
                        
                        if (i < urls.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                }

                geocodingStats.errors++;
                return null;

            } catch (error) {
                console.error('❌ Erro geral na geocodificação:', error);
                geocodingStats.errors++;
                return null;
            }
        }

        cleanAddress(address) {
            return address
                .replace(/\n/g, ', ')
                .replace(/\s+/g, ' ')
                .replace(/,\s*,/g, ',')
                .replace(/^,|,$/g, '')
                .trim();
        }

        normalizeAddress(address) {
            return this.cleanAddress(address)
                .toLowerCase()
                .replace(/[^\w\s,]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        clearClientMarkers() {
            if (markersLayer) {
                currentMarkers.forEach(marker => {
                    markersLayer.removeLayer(marker);
                });
                currentMarkers = [];
                console.log('🧹 Marcadores de clientes removidos');
            }
        }

        fitMapToBounds() {
            if (!map || currentMarkers.length === 0) return;

            try {
                const group = new L.featureGroup(currentMarkers);
                const bounds = group.getBounds();

                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 14
                    });
                    console.log('🗺️ Vista ajustada');
                }
            } catch (error) {
                console.error('❌ Erro ao ajustar vista:', error);
            }
        }

        loadGeocodingCache() {
            try {
                const cached = localStorage.getItem('geocoding-cache-v4');
                if (cached) {
                    const data = JSON.parse(cached);
                    geocodingCache = new Map(data);
                    console.log(`📦 Cache carregado: ${geocodingCache.size} entradas`);
                }
            } catch (error) {
                geocodingCache = new Map();
            }
        }

        saveGeocodingCache() {
            try {
                const data = Array.from(geocodingCache.entries());
                localStorage.setItem('geocoding-cache-v4', JSON.stringify(data));
                console.log(`💾 Cache salvo: ${data.length} entradas`);
            } catch (error) {
                console.error('❌ Erro ao salvar cache:', error);
            }
        }

        clearGeocodingCache() {
            geocodingCache.clear();
            localStorage.removeItem('geocoding-cache-v4');
            geocodingStats = { total: 0, success: 0, errors: 0, cached: 0 };
            console.log('🧹 Cache limpo');
        }

        // RETRY FORÇADO
        forceRetry() {
            console.log('🔄 RETRY FORÇADO');
            initializationAttempts = 0;
            this.initialized = false;
            this.initializationPromise = null;
            isMapInitialized = false;
            
            if (map) {
                map.remove();
                map = null;
            }
            
            markersLayer = null;
            currentMarkers = [];
            lastRequestTime = 0;
            
            this.init().catch(error => {
                console.error('❌ Erro no retry:', error);
                showMapError('Falha no retry. Recarregue a página.');
            });
        }

        onMapTabActivated() {
            console.log('📋 Aba do mapa ativada');
            
            setTimeout(() => {
                if (map && this.initialized) {
                    console.log('🔄 Revalidando após ativação');
                    map.invalidateSize(true);
                    
                    if (!map.getBounds().contains(SJC_CONFIG.center)) {
                        map.setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
                    }
                } else if (!this.initialized) {
                    console.log('🗺️ Iniciando mapa...');
                    this.init();
                }
            }, 200);
        }

        getStats() {
            return {
                ...geocodingStats,
                cacheSize: geocodingCache.size,
                markersCount: currentMarkers.length,
                mapInitialized: isMapInitialized,
                managerInitialized: this.initialized,
                lastRequestTime: lastRequestTime,
                queueLength: geocodingQueue.length
            };
        }
    }

    // Inicializar instância global
    if (typeof window !== 'undefined') {
        window.mapManager = new MapManager();
        
        window.initializeMap = () => {
            if (window.mapManager) {
                return window.mapManager.init();
            }
        };
    }

    console.log('✅ map.js carregado com rate limiting rigoroso e tratamento de erros melhorado');

})();
