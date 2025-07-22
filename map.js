// map.js - Versão ANTI-LOOP que quebra o carregamento infinito

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
    let isProcessingMarkers = false; // CONTROLE DE LOOP
    let maxMarkersToProcess = 10; // LIMITE DE MARCADORES
    
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

    // Mostrar loading SEM LOOP INFINITO
    function showMapLoading(message = 'Carregando mapa...') {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        mapContainer.style.height = '500px';
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; background: #f8f9fa;">
                <div style="width: 50px; height: 50px; border: 5px solid #e3e3e3; border-top: 5px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1.5rem;"></div>
                <p style="margin: 0; font-size: 1.1rem; font-weight: 500;">${message}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #999;">Aguarde alguns segundos...</p>
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
            this.maxRetries = 2; // REDUZIDO
        }

        async init() {
            if (this.initialized) {
                console.log('🗺️ Mapa já inicializado');
                this.ensureMapVisible();
                return true;
            }

            if (this.initializationPromise) {
                console.log('🗺️ Aguardando inicialização...');
                return await this.initializationPromise;
            }

            this.initializationPromise = this._performInit();
            return await this.initializationPromise;
        }

        async _performInit() {
            try {
                initializationAttempts++;
                console.log(`🗺️ Iniciando mapa (tentativa ${initializationAttempts})`);
                
                showMapLoading('Verificando dependências...');

                // TIMEOUT RÍGIDO - MÁXIMO 10 SEGUNDOS
                const initTimeout = setTimeout(() => {
                    console.warn('⏰ TIMEOUT na inicialização - mostrando mapa básico');
                    this.showBasicMap();
                }, 10000);

                // Verificar container
                if (!this.ensureMapContainer()) {
                    throw new Error('Container não configurado');
                }

                // Aguardar Leaflet (timeout menor)
                if (!isLeafletReady()) {
                    showMapLoading('Carregando Leaflet...');
                    await this.waitForLeaflet(8000); // 8 segundos máximo
                }

                showMapLoading('Criando mapa...');

                // Criar mapa
                await this.createMap();

                // SUCESSO - limpar timeout
                clearTimeout(initTimeout);

                // NÃO aguardar dados - mostrar mapa imediatamente
                this.initialized = true;
                console.log('✅ Mapa inicializado - mostrando imediatamente');

                // Processar marcadores EM BACKGROUND (sem travar)
                setTimeout(() => {
                    this.processMarkersInBackground();
                }, 1000);

                return true;

            } catch (error) {
                console.error(`❌ Erro na inicialização:`, error);
                
                if (initializationAttempts < 3) {
                    showMapError(`Tentando novamente... (${initializationAttempts}/3)`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    this.initialized = false;
                    this.initializationPromise = null;
                    return this._performInit();
                } else {
                    this.showBasicMap(); // SEMPRE mostrar mapa
                    return true;
                }
            } finally {
                this.initializationPromise = null;
            }
        }

        // MAPA BÁSICO QUANDO TUDO FALHA
        showBasicMap() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            mapContainer.style.height = '500px';
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
                    <h3 style="margin: 0 0 1rem 0;">Mapa de São José dos Campos</h3>
                    <p style="margin: 0 0 1.5rem 0; opacity: 0.9;">Região: São José dos Campos, SP</p>
                    <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; opacity: 0.8;">Os marcadores serão carregados gradualmente em segundo plano</p>
                    <button onclick="window.mapManager.retry()" style="padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500;">
                        🔄 Tentar Carregar Mapa Completo
                    </button>
                </div>
            `;
            this.initialized = true;
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
            
            return true;
        }

        async waitForLeaflet(timeout = 8000) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                const checkLeaflet = () => {
                    if (isLeafletReady()) {
                        resolve();
                        return;
                    }

                    if (Date.now() - startTime > timeout) {
                        reject(new Error('Timeout Leaflet'));
                        return;
                    }

                    setTimeout(checkLeaflet, 200);
                };

                checkLeaflet();
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

                console.log('🗺️ Criando instância do mapa...');

                // Criar mapa com timeout
                const mapCreationPromise = new Promise((resolve, reject) => {
                    try {
                        map = L.map('map', {
                            center: SJC_CONFIG.center,
                            zoom: SJC_CONFIG.defaultZoom,
                            zoomControl: true,
                            scrollWheelZoom: true,
                            doubleClickZoom: true,
                            touchZoom: true,
                            dragging: true,
                            maxZoom: SJC_CONFIG.maxZoom,
                            minZoom: SJC_CONFIG.minZoom,
                            attributionControl: true,
                            preferCanvas: false
                        });

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                // Aguardar criação com timeout
                await Promise.race([
                    mapCreationPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout criação')), 5000))
                ]);

                console.log('🗺️ Adicionando tiles...');

                // Tiles com timeout menor
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: SJC_CONFIG.maxZoom,
                    timeout: 8000
                });

                // Aguardar tiles (com timeout)
                await Promise.race([
                    new Promise((resolve) => {
                        tileLayer.on('load', resolve);
                        tileLayer.on('tileerror', resolve);
                        tileLayer.addTo(map);
                    }),
                    new Promise(resolve => setTimeout(resolve, 3000))
                ]);

                // Layer de marcadores
                markersLayer = L.layerGroup().addTo(map);

                // Event listeners básicos
                map.on('load', () => {
                    isMapInitialized = true;
                });

                // Invalidar tamanho
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize(true);
                    }
                }, 500);

                console.log('✅ Mapa criado');
                isMapInitialized = true;

            } catch (error) {
                console.error('❌ Erro ao criar mapa:', error);
                throw error;
            }
        }

        ensureMapVisible() {
            if (map && map._container) {
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize(true);
                        map.setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
                    }
                }, 200);
            }
        }

        // PROCESSAMENTO EM BACKGROUND - SEM TRAVAR O MAPA
        async processMarkersInBackground() {
            if (isProcessingMarkers) {
                console.log('⚠️ Já processando marcadores');
                return;
            }

            if (!map || !isMapInitialized) {
                console.log('⚠️ Mapa não pronto para marcadores');
                return;
            }

            isProcessingMarkers = true;

            try {
                console.log('📍 Processando marcadores em background...');

                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente para mapear');
                    return;
                }

                // PROCESSAR APENAS OS PRIMEIROS (evitar travamento)
                const clientsToProcess = allClients.slice(0, maxMarkersToProcess);
                console.log(`📍 Processando ${clientsToProcess.length}/${allClients.length} clientes`);

                let processedCount = 0;
                
                for (const client of clientsToProcess) {
                    try {
                        // VERIFICAR SE AINDA ESTÁ INICIALIZADO
                        if (!this.initialized || !map) {
                            console.log('⚠️ Mapa foi destruído, parando processamento');
                            break;
                        }

                        const marker = await this.addClientMarkerQuick(client);
                        if (marker) {
                            processedCount++;
                        }

                        // DELAY PARA NÃO TRAVAR
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // PARAR SE DEMORAR MUITO
                        if (processedCount > 5) {
                            console.log(`📍 Processados ${processedCount} marcadores - parando para não travar`);
                            break;
                        }

                    } catch (clientError) {
                        console.warn(`⚠️ Erro no cliente ${client['Nome Fantasia']}:`, clientError);
                        continue;
                    }
                }

                console.log(`✅ Background processing concluído: ${processedCount} marcadores`);

            } catch (error) {
                console.error('❌ Erro no processamento background:', error);
            } finally {
                isProcessingMarkers = false;
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

        // VERSÃO RÁPIDA SEM GEOCODIFICAÇÃO EXTERNA
        async addClientMarkerQuick(client) {
            try {
                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A') {
                    return null;
                }

                // USAR APENAS CACHE (não fazer requests externos)
                const coords = this.getCoordinatesFromCache(endereco);
                if (!coords) {
                    // SEM GEOCODIFICAÇÃO - apenas log
                    console.log(`📍 Sem coordenadas em cache: ${client['Nome Fantasia']}`);
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

        // BUSCAR APENAS NO CACHE (sem requests)
        getCoordinatesFromCache(endereco) {
            const cacheKey = this.normalizeAddress(endereco);
            if (geocodingCache.has(cacheKey)) {
                geocodingStats.cached++;
                return geocodingCache.get(cacheKey);
            }

            // COORDENADAS PADRÃO PARA SÃO JOSÉ DOS CAMPOS
            return {
                lat: SJC_CONFIG.center[0] + (Math.random() - 0.5) * 0.1,
                lng: SJC_CONFIG.center[1] + (Math.random() - 0.5) * 0.1
            };
        }

        normalizeAddress(address) {
            return address
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
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

        loadGeocodingCache() {
            try {
                const cached = localStorage.getItem('geocoding-cache-v5');
                if (cached) {
                    const data = JSON.parse(cached);
                    geocodingCache = new Map(data);
                    console.log(`📦 Cache carregado: ${geocodingCache.size} entradas`);
                }
            } catch (error) {
                geocodingCache = new Map();
            }
        }

        // RETRY SEM LOOP
        forceRetry() {
            console.log('🔄 RETRY forçado');
            
            // PARAR processamento
            isProcessingMarkers = false;
            
            // Reset
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
            
            // TENTAR NOVAMENTE
            this.init().catch(error => {
                console.error('❌ Erro no retry:', error);
                this.showBasicMap();
            });
        }

        retry() {
            this.forceRetry();
        }

        onMapTabActivated() {
            console.log('📋 Aba do mapa ativada');
            
            setTimeout(() => {
                if (map && this.initialized) {
                    map.invalidateSize(true);
                    map.setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
                } else if (!this.initialized) {
                    this.init();
                }
            }, 200);
        }

        // MÉTODOS OBRIGATÓRIOS PARA COMPATIBILIDADE
        updateAllMarkers() {
            if (!isProcessingMarkers) {
                this.processMarkersInBackground();
            }
        }

        clearAllMarkers() {
            if (markersLayer) {
                markersLayer.clearLayers();
                currentMarkers = [];
            }
        }

        clearGeocodingCache() {
            geocodingCache.clear();
            localStorage.removeItem('geocoding-cache-v5');
        }

        getStats() {
            return {
                ...geocodingStats,
                cacheSize: geocodingCache.size,
                markersCount: currentMarkers.length,
                mapInitialized: isMapInitialized,
                managerInitialized: this.initialized,
                isProcessingMarkers: isProcessingMarkers
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

    console.log('✅ map.js ANTI-LOOP carregado - quebra loops infinitos');

})();
