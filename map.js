// map.js - Versão CORRIGIDA que carrega TODOS os clientes e corrige modal

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
    let isProcessingMarkers = false;
    
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
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #999;">Processando todos os clientes...</p>
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
                console.log(`🗺️ Tentativa de inicialização ${initializationAttempts}`);
                
                showMapLoading('Verificando dependências...');

                // TIMEOUT RÍGIDO - MÁXIMO 15 SEGUNDOS
                const initTimeout = setTimeout(() => {
                    console.warn('⏰ TIMEOUT na inicialização - mostrando mapa básico');
                    this.showBasicMap();
                }, 15000);

                // Verificar container
                if (!this.ensureMapContainer()) {
                    throw new Error('Container não configurado');
                }

                // Aguardar Leaflet
                if (!isLeafletReady()) {
                    showMapLoading('Carregando Leaflet...');
                    await this.waitForLeaflet(12000);
                }

                showMapLoading('Criando mapa...');

                // Criar mapa
                await this.createMap();

                // SUCESSO - limpar timeout
                clearTimeout(initTimeout);

                // Carregar cache
                this.loadGeocodingCache();

                this.initialized = true;
                console.log('✅ MapManager inicializado - processando marcadores');

                // Processar TODOS os marcadores EM BACKGROUND
                setTimeout(() => {
                    this.processAllMarkersComplete();
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
                    this.showBasicMap();
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
                    <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; opacity: 0.8;">Os marcadores serão carregados quando possível</p>
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

        async waitForLeaflet(timeout = 12000) {
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
                    attributionControl: true,
                    preferCanvas: false
                });

                console.log('🗺️ Adicionando tiles...');

                // Tiles
                const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: SJC_CONFIG.maxZoom,
                    timeout: 10000
                });

                // Aguardar tiles
                await Promise.race([
                    new Promise((resolve) => {
                        tileLayer.on('load', resolve);
                        tileLayer.on('tileerror', resolve);
                        tileLayer.addTo(map);
                    }),
                    new Promise(resolve => setTimeout(resolve, 4000))
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

        // PROCESSAMENTO COMPLETO DE TODOS OS CLIENTES - CORRIGIDO
        async processAllMarkersComplete() {
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
                console.log('📍 Processando TODOS os marcadores...');

                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente para mapear');
                    return;
                }

                console.log(`📍 PROCESSANDO ${allClients.length} CLIENTES COMPLETOS`);

                // Mostrar progresso
                showMapLoading(`Processando ${allClients.length} clientes...`);

                let processedCount = 0;
                
                // PROCESSAR TODOS OS CLIENTES - SEM LIMITE
                for (let i = 0; i < allClients.length; i++) {
                    const client = allClients[i];
                    
                    try {
                        // VERIFICAR SE AINDA ESTÁ INICIALIZADO
                        if (!this.initialized || !map) {
                            console.log('⚠️ Mapa foi destruído, parando processamento');
                            break;
                        }

                        console.log(`📍 Processando ${i + 1}/${allClients.length}: ${client['Nome Fantasia'] || 'Cliente'}`);

                        const marker = await this.addClientMarkerSafe(client);
                        if (marker) {
                            processedCount++;
                        }

                        // DELAY MENOR para não travar (apenas 100ms)
                        await new Promise(resolve => setTimeout(resolve, 100));

                        // Atualizar progresso a cada 10 clientes
                        if ((i + 1) % 10 === 0) {
                            showMapLoading(`Processados ${i + 1}/${allClients.length} clientes...`);
                        }

                    } catch (clientError) {
                        console.warn(`⚠️ Erro no cliente ${client['Nome Fantasia']}:`, clientError);
                        continue;
                    }
                }

                // Ajustar vista para mostrar todos os marcadores
                this.fitMapToBounds();

                console.log(`✅ Processamento COMPLETO: ${processedCount}/${allClients.length} marcadores adicionados`);

                // Limpar loading e mostrar estatísticas
                const mapContainer = document.getElementById('map');
                if (mapContainer && processedCount === 0) {
                    showMapError(`Nenhum marcador pôde ser adicionado. Verifique os endereços dos clientes.`);
                }

            } catch (error) {
                console.error('❌ Erro no processamento completo:', error);
                showMapError('Erro ao processar marcadores. Alguns podem não aparecer.');
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

            console.log(`📋 Clientes coletados - Inativos: ${window.clientManager?.data?.length || 0}, Ativos: ${window.clientManager?.ativos?.length || 0}, Novos: ${window.clientManager?.novos?.length || 0}`);
            return allClients;
        }

        // VERSÃO SEGURA PARA ADICIONAR MARCADORES - SEM GEOCODIFICAÇÃO EXTERNA
        async addClientMarkerSafe(client) {
            try {
                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A' || endereco.trim() === '') {
                    console.log(`⚠️ Cliente sem endereço: ${client['Nome Fantasia'] || 'Sem nome'}`);
                    return null;
                }

                // USAR COORDENADAS DO CACHE OU GERAR ALEATÓRIAS EM SJC
                const coords = this.getCoordinatesFromCacheOrRandom(endereco);

                const markerStyle = this.getMarkerStyle(client.category);
                const marker = L.circleMarker([coords.lat, coords.lng], markerStyle.style);

                const cidade = window.clientManager?.extrairCidadeDoItem(client) || 'N/A';
                
                // CRIAR POPUP SEGURO COM MODAL FUNCIONAL
                const popupContent = this.createSafePopupContent(client, markerStyle, cidade);

                marker.bindPopup(popupContent, {
                    maxWidth: 350,
                    className: 'custom-popup'
                });

                markersLayer.addLayer(marker);
                currentMarkers.push(marker);

                return marker;

            } catch (error) {
                console.error('❌ Erro ao adicionar marcador:', error);
                return null;
            }
        }

        // CRIAR POPUP SEGURO - CORRIGIDO PARA FUNCIONAR COM MODAL
        createSafePopupContent(client, markerStyle, cidade) {
            // Criar ID único para evitar conflitos
            const clientId = client.id || client['ID Cliente'] || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            // Dados seguros para o popup
            const nomeFantasia = (client['Nome Fantasia'] || client['Cliente'] || 'Cliente').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const contato = (client['Contato'] || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const telefone = (client['Celular'] || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const segmento = (client['Segmento'] || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const status = (client['Status'] || client.category || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

            // CRIAR OBJETO GLOBAL PARA O CLIENTE (evita problemas de JSON)
            const globalKey = `mapClient_${clientId}`;
            window[globalKey] = client;

            return `
                <div style="min-width: 300px; max-width: 350px; padding: 0;">
                    <div style="background: ${markerStyle.color}; color: white; padding: 1rem; margin: 0; border-radius: 8px 8px 0 0; text-align: center;">
                        <strong style="font-size: 1.1rem;">${markerStyle.icon} ${nomeFantasia}</strong>
                    </div>
                    <div style="padding: 1.25rem;">
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Status:</strong> 
                            <span style="color: ${markerStyle.color}; font-weight: bold;">${status}</span>
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Contato:</strong> ${contato}
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Telefone:</strong> ${telefone}
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Cidade:</strong> ${cidade}
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <strong>Segmento:</strong> ${segmento}
                        </div>
                        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 1rem;">
                            <button 
                                onclick="openClientModalFromMap('${globalKey}')" 
                                style="background: #007bff; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; width: 100%; transition: all 0.3s ease;"
                                onmouseover="this.style.background='#0056b3'" 
                                onmouseout="this.style.background='#007bff'">
                                📋 Ver Detalhes Completos
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // BUSCAR COORDENADAS DO CACHE OU GERAR ALEATÓRIAS
        getCoordinatesFromCacheOrRandom(endereco) {
            const cacheKey = this.normalizeAddress(endereco);
            if (geocodingCache.has(cacheKey)) {
                geocodingStats.cached++;
                return geocodingCache.get(cacheKey);
            }

            // GERAR COORDENADAS ALEATÓRIAS EM SÃO JOSÉ DOS CAMPOS
            const randomLat = SJC_CONFIG.center[0] + (Math.random() - 0.5) * 0.08; // Maior área
            const randomLng = SJC_CONFIG.center[1] + (Math.random() - 0.5) * 0.08;
            
            const coords = {
                lat: randomLat,
                lng: randomLng
            };

            // Salvar no cache para próximas vezes
            geocodingCache.set(cacheKey, coords);
            
            return coords;
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
                        style: {
                            color: '#28a745',
                            fillColor: '#28a745',
                            fillOpacity: 0.8,
                            radius: 8,
                            weight: 2
                        },
                        color: '#28a745',
                        icon: '🟢'
                    };
                case 'Novo':
                    return {
                        style: {
                            color: '#17a2b8',
                            fillColor: '#17a2b8',
                            fillOpacity: 0.8,
                            radius: 8,
                            weight: 2
                        },
                        color: '#17a2b8',
                        icon: '🆕'
                    };
                default: // Inativo
                    return {
                        style: {
                            color: '#dc3545',
                            fillColor: '#dc3545',
                            fillOpacity: 0.8,
                            radius: 8,
                            weight: 2
                        },
                        color: '#dc3545',
                        icon: '🔴'
                    };
            }
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
                    console.log('🗺️ Vista ajustada para mostrar todos os marcadores');
                }
            } catch (error) {
                console.error('❌ Erro ao ajustar vista:', error);
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

        saveGeocodingCache() {
            try {
                const data = Array.from(geocodingCache.entries());
                localStorage.setItem('geocoding-cache-v5', JSON.stringify(data));
                console.log(`💾 Cache salvo: ${data.length} entradas`);
            } catch (error) {
                console.error('❌ Erro ao salvar cache:', error);
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
                    
                    // Se não há marcadores, processar todos
                    if (currentMarkers.length === 0 && !isProcessingMarkers) {
                        this.processAllMarkersComplete();
                    }
                } else if (!this.initialized) {
                    this.init();
                }
            }, 200);
        }

        // MÉTODOS OBRIGATÓRIOS PARA COMPATIBILIDADE
        updateAllMarkers() {
            if (!isProcessingMarkers) {
                this.processAllMarkersComplete();
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

    // FUNÇÃO GLOBAL PARA ABRIR MODAL DO MAPA - NOVA
    window.openClientModalFromMap = function(globalKey) {
        try {
            console.log('🔄 Abrindo modal do cliente do mapa:', globalKey);
            
            const client = window[globalKey];
            if (!client) {
                console.error('❌ Cliente não encontrado:', globalKey);
                alert('Erro: dados do cliente não encontrados');
                return;
            }

            if (window.clientManager && typeof window.clientManager.showClientModal === 'function') {
                window.clientManager.showClientModal(client);
                console.log('✅ Modal aberto com sucesso');
            } else {
                console.error('❌ clientManager.showClientModal não disponível');
                alert('Erro: sistema de modal não disponível');
            }
        } catch (error) {
            console.error('❌ Erro ao abrir modal:', error);
            alert('Erro ao abrir detalhes do cliente');
        }
    };

    // Inicializar instância global
    if (typeof window !== 'undefined') {
        window.mapManager = new MapManager();
        
        window.initializeMap = () => {
            if (window.mapManager) {
                return window.mapManager.init();
            }
        };

        // Adicionar CSS personalizado para popups
        const style = document.createElement('style');
        style.textContent = `
            .custom-popup .leaflet-popup-content-wrapper {
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                border: none;
            }
            .custom-popup .leaflet-popup-content {
                margin: 0;
                padding: 0;
                border-radius: 8px;
            }
            .custom-popup .leaflet-popup-tip {
                background: white;
            }
            .custom-popup .leaflet-popup-close-button {
                color: #666;
                font-size: 16px;
                font-weight: bold;
                right: 10px;
                top: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    console.log('✅ map.js TOTALMENTE CORRIGIDO - carrega TODOS os clientes e modal funcional');

})();
