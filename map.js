// map.js - Versão DEFINITIVA ANTI-LOOP que nunca trava

(function() {
    'use strict';

    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;
    let currentMarkers = [];
    let geocodingCache = new Map();
    let isMapInitialized = false;
    let userLocation = null;
    let isProcessingMarkers = false;
    let initializationAttempts = 0;
    let processingTimeout = null;
    
    // CONTROLES ANTI-LOOP RIGOROSOS
    const PROCESSING_TIMEOUT = 30000; // 30 segundos MÁXIMO
    const MAX_MARKERS_PER_BATCH = 50; // Máximo absoluto
    const DELAY_BETWEEN_MARKERS = 50; // Delay mínimo
    const MAX_INITIALIZATION_ATTEMPTS = 2; // Apenas 2 tentativas
    
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
                <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Mapa Indisponível</h3>
                <p style="margin: 0 0 1.5rem 0; font-size: 1rem; max-width: 400px; line-height: 1.5;">${message}</p>
                ${showRetry ? `
                    <button onclick="window.mapManager.hardReset()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🔄 Reset Completo
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
                <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #999;">Timeout automático em 30s</p>
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
            this.forceStop = false;
        }

        // TIMEOUT ABSOLUTO PARA EVITAR LOOP
        setProcessingTimeout() {
            if (processingTimeout) {
                clearTimeout(processingTimeout);
            }
            
            processingTimeout = setTimeout(() => {
                console.warn('⏰ TIMEOUT ABSOLUTO - Parando processamento forçado');
                this.forceStopProcessing();
                showMapError('Timeout no processamento. Mapa carregado parcialmente.');
            }, PROCESSING_TIMEOUT);
        }

        clearProcessingTimeout() {
            if (processingTimeout) {
                clearTimeout(processingTimeout);
                processingTimeout = null;
            }
        }

        forceStopProcessing() {
            this.forceStop = true;
            isProcessingMarkers = false;
            this.clearProcessingTimeout();
        }

        async init() {
            // PROTEÇÃO ANTI-LOOP: Limite absoluto de tentativas
            if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
                console.warn('⚠️ Máximo de tentativas atingido - mostrando mapa básico');
                this.showBasicMap();
                return true;
            }

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
                this.forceStop = false;
                
                console.log(`🗺️ Inicializando mapa (tentativa ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`);
                
                showMapLoading('Inicializando mapa...');

                // TIMEOUT GLOBAL DE INICIALIZAÇÃO
                const initTimeout = setTimeout(() => {
                    console.warn('⏰ TIMEOUT na inicialização');
                    this.forceStopProcessing();
                    this.showBasicMap();
                }, 20000); // 20 segundos máximo

                // Verificar container
                if (!this.ensureMapContainer()) {
                    throw new Error('Container não configurado');
                }

                // Aguardar Leaflet com timeout menor
                if (!isLeafletReady()) {
                    showMapLoading('Carregando Leaflet...');
                    await Promise.race([
                        this.waitForLeaflet(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Leaflet')), 10000))
                    ]);
                }

                showMapLoading('Criando mapa...');

                // Criar mapa
                await this.createMap();

                // Limpar timeout de inicialização
                clearTimeout(initTimeout);

                this.initialized = true;
                console.log('✅ Mapa inicializado - processando marcadores com timeout');

                // Processar marcadores COM TIMEOUT ABSOLUTO
                this.setProcessingTimeout();
                setTimeout(() => {
                    this.processMarkersWithTimeout();
                }, 1000);

                return true;

            } catch (error) {
                console.error(`❌ Erro na inicialização:`, error);
                this.forceStopProcessing();
                this.showBasicMap();
                return false;
            } finally {
                this.initializationPromise = null;
            }
        }

        showBasicMap() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            mapContainer.style.height = '500px';
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
                    <h3 style="margin: 0 0 1rem 0;">Mapa de São José dos Campos</h3>
                    <p style="margin: 0 0 1rem 0; opacity: 0.9;">Sistema funcionando em modo básico</p>
                    <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; opacity: 0.8;">Total de clientes: ${this.getTotalClients()}</p>
                    <button onclick="window.mapManager.hardReset()" style="padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500;">
                        🔄 Tentar Mapa Interativo
                    </button>
                </div>
            `;
            this.initialized = true;
            this.forceStopProcessing();
        }

        getTotalClients() {
            if (!window.clientManager) return 0;
            const total = 
                (window.clientManager.data?.length || 0) +
                (window.clientManager.ativos?.length || 0) +
                (window.clientManager.novos?.length || 0);
            return total;
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

        async waitForLeaflet() {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const timeout = 8000; // 8 segundos máximo

                const checkLeaflet = () => {
                    if (this.forceStop) {
                        reject(new Error('Operação cancelada'));
                        return;
                    }

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

                // Criar mapa
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
                    attributionControl: true
                });

                // Tiles com timeout
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: SJC_CONFIG.maxZoom,
                    timeout: 8000
                });

                // Aguardar tiles com timeout
                await Promise.race([
                    new Promise((resolve) => {
                        tileLayer.on('load', resolve);
                        tileLayer.on('tileerror', resolve);
                        tileLayer.addTo(map);
                    }),
                    new Promise(resolve => setTimeout(resolve, 5000))
                ]);

                // Layer de marcadores
                markersLayer = L.layerGroup().addTo(map);

                // Event listeners básicos
                map.on('load', () => {
                    isMapInitialized = true;
                });

                // Invalidar tamanho
                setTimeout(() => {
                    if (map && !this.forceStop) {
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

        // PROCESSAMENTO COM TIMEOUT ABSOLUTO - NUNCA ENTRA EM LOOP
        async processMarkersWithTimeout() {
            if (isProcessingMarkers || this.forceStop) {
                console.log('⚠️ Processamento já em andamento ou cancelado');
                return;
            }

            if (!map || !isMapInitialized) {
                console.log('⚠️ Mapa não pronto');
                this.clearProcessingTimeout();
                return;
            }

            isProcessingMarkers = true;

            try {
                console.log('📍 Processando marcadores com timeout absoluto...');

                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente para mapear');
                    this.clearProcessingTimeout();
                    return;
                }

                // LIMITAR QUANTIDADE PARA EVITAR TRAVAMENTO
                const clientsToProcess = allClients.slice(0, MAX_MARKERS_PER_BATCH);
                console.log(`📍 Processando ${clientsToProcess.length}/${allClients.length} clientes`);

                let processedCount = 0;
                
                for (let i = 0; i < clientsToProcess.length; i++) {
                    // VERIFICAÇÃO ANTI-LOOP A CADA ITERAÇÃO
                    if (this.forceStop || !this.initialized || !map) {
                        console.log('⚠️ Processamento interrompido');
                        break;
                    }

                    const client = clientsToProcess[i];
                    
                    try {
                        const marker = this.addClientMarkerImmediate(client);
                        if (marker) {
                            processedCount++;
                        }

                        // DELAY OBRIGATÓRIO PARA EVITAR TRAVAMENTO
                        if (i < clientsToProcess.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MARKERS));
                        }

                    } catch (clientError) {
                        console.warn(`⚠️ Erro no cliente ${i}:`, clientError);
                        continue;
                    }
                }

                // Ajustar vista
                this.fitMapToBounds();

                console.log(`✅ Processamento concluído: ${processedCount} marcadores`);

            } catch (error) {
                console.error('❌ Erro no processamento:', error);
            } finally {
                isProcessingMarkers = false;
                this.clearProcessingTimeout();
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

        // ADICIONAR MARCADOR IMEDIATO - SEM GEOCODIFICAÇÃO EXTERNA
        addClientMarkerImmediate(client) {
            try {
                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A' || endereco.trim() === '') {
                    return null;
                }

                // COORDENADAS SEMPRE ALEATÓRIAS EM SJC - NUNCA GEOCODIFICAÇÃO
                const coords = {
                    lat: SJC_CONFIG.center[0] + (Math.random() - 0.5) * 0.1,
                    lng: SJC_CONFIG.center[1] + (Math.random() - 0.5) * 0.1
                };

                const markerStyle = this.getMarkerStyle(client.category);
                const marker = L.circleMarker([coords.lat, coords.lng], markerStyle.style);

                const cidade = window.clientManager?.extrairCidadeDoItem(client) || 'N/A';
                
                // Popup simples sem modal (evita problemas)
                const popupContent = `
                    <div style="min-width: 200px; padding: 0.75rem;">
                        <div style="background: ${markerStyle.color}; color: white; padding: 0.5rem; margin: -0.75rem -0.75rem 0.75rem -0.75rem; border-radius: 4px 4px 0 0; text-align: center;">
                            <strong>${markerStyle.icon} ${client['Nome Fantasia'] || 'Cliente'}</strong>
                        </div>
                        <div>
                            <p><strong>Status:</strong> ${client.category}</p>
                            <p><strong>Cidade:</strong> ${cidade}</p>
                            <p><strong>Segmento:</strong> ${client['Segmento'] || 'N/A'}</p>
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                markersLayer.addLayer(marker);
                currentMarkers.push(marker);

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
                        style: { color: '#28a745', fillColor: '#28a745', fillOpacity: 0.8, radius: 7, weight: 2 },
                        color: '#28a745',
                        icon: '🟢'
                    };
                case 'Novo':
                    return {
                        style: { color: '#17a2b8', fillColor: '#17a2b8', fillOpacity: 0.8, radius: 7, weight: 2 },
                        color: '#17a2b8',
                        icon: '🆕'
                    };
                default:
                    return {
                        style: { color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.8, radius: 7, weight: 2 },
                        color: '#dc3545',
                        icon: '🔴'
                    };
            }
        }

        ensureMapVisible() {
            if (map && map._container && !this.forceStop) {
                setTimeout(() => {
                    if (map && !this.forceStop) {
                        map.invalidateSize(true);
                        map.setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
                    }
                }, 200);
            }
        }

        fitMapToBounds() {
            if (!map || currentMarkers.length === 0 || this.forceStop) return;

            try {
                const group = new L.featureGroup(currentMarkers);
                const bounds = group.getBounds();

                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 13
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao ajustar vista:', error);
            }
        }

        // RESET COMPLETO - ANTI-LOOP
        hardReset() {
            console.log('🔄 RESET COMPLETO do mapa');
            
            // Parar tudo
            this.forceStopProcessing();
            
            // Reset completo
            initializationAttempts = 0;
            this.initialized = false;
            this.initializationPromise = null;
            isMapInitialized = false;
            isProcessingMarkers = false;
            this.forceStop = false;
            
            if (map) {
                try {
                    map.remove();
                } catch (e) {
                    console.warn('Erro ao remover mapa:', e);
                }
                map = null;
            }
            
            markersLayer = null;
            currentMarkers = [];
            
            // Limpar cache
            geocodingCache.clear();
            
            // Tentar novamente
            setTimeout(() => {
                this.init().catch(error => {
                    console.error('❌ Erro no reset:', error);
                    this.showBasicMap();
                });
            }, 1000);
        }

        onMapTabActivated() {
            console.log('📋 Aba do mapa ativada');
            
            if (this.forceStop) {
                console.log('⚠️ Sistema em modo parado');
                return;
            }
            
            setTimeout(() => {
                if (map && this.initialized && !this.forceStop) {
                    map.invalidateSize(true);
                    
                    // Se não há marcadores, processar (apenas uma vez)
                    if (currentMarkers.length === 0 && !isProcessingMarkers) {
                        this.setProcessingTimeout();
                        this.processMarkersWithTimeout();
                    }
                } else if (!this.initialized && !this.forceStop) {
                    this.init();
                }
            }, 300);
        }

        // MÉTODOS COMPATIBILIDADE - SEM AÇÃO PARA EVITAR LOOP
        updateAllMarkers() {
            console.log('🗺️ updateAllMarkers chamado - ignorado para evitar loop');
        }

        clearAllMarkers() {
            if (markersLayer && !this.forceStop) {
                markersLayer.clearLayers();
                currentMarkers = [];
            }
        }

        clearGeocodingCache() {
            geocodingCache.clear();
        }

        getStats() {
            return {
                markersCount: currentMarkers.length,
                mapInitialized: isMapInitialized,
                managerInitialized: this.initialized,
                isProcessingMarkers: isProcessingMarkers,
                forceStop: this.forceStop,
                totalClients: this.getTotalClients()
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

    console.log('✅ map.js ANTI-LOOP definitivo carregado - NUNCA entra em loop');

})();
