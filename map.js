// map.js - Sistema ROBUSTO de geocodificação com máxima precisão e múltiplas APIs

(function() {
    'use strict';

    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;
    let userLocationAccuracyCircle = null;
    let currentMarkers = [];
    let geocodingCache = new Map();
    let isMapInitialized = false;
    let userLocation = null;
    let watchId = null;
    let isProcessingMarkers = false;
    let geocodingQueue = [];
    let isProcessingQueue = false;
    
    // SISTEMA DE GEOCODIFICAÇÃO COM MÁXIMA PRECISÃO
    let geocodingStats = { 
        total: 0, 
        success: 0, 
        errors: 0, 
        cached: 0,
        viacep: 0,
        nominatim: 0,
        photon: 0,
        precision: { high: 0, medium: 0, low: 0 }
    };
    
    const SJC_CONFIG = {
        center: [-23.2237, -45.9009],
        defaultZoom: 13,
        maxZoom: 18,
        minZoom: 10,
        bounds: {
            north: -23.1,
            south: -23.3,
            east: -45.8,
            west: -46.0
        }
    };

    // CONFIGURAÇÃO DE APIS PÚBLICAS PARA MÁXIMA PRECISÃO
    const GEOCODING_CONFIG = {
        delay: 2000, // 2 segundos entre requests
        timeout: 15000, // 15 segundos timeout
        retries: 3,
        userAgent: 'PMG-Agenda-Clientes/3.0 (contato@pmg.com)'
    };

    // MÚLTIPLAS APIS PÚBLICAS PARA GARANTIR PRECISÃO
    const GEOCODING_APIS = {
        // API 1: ViaCEP - Para extrair e corrigir endereços brasileiros
        viaCEP: async (cep) => {
            try {
                const cleanCEP = cep.replace(/\D/g, '');
                if (cleanCEP.length !== 8) return null;
                
                console.log(`🌐 ViaCEP: Consultando CEP ${cleanCEP}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.timeout);
                
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': GEOCODING_CONFIG.userAgent
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.erro) {
                    console.warn(`⚠️ ViaCEP: CEP ${cleanCEP} não encontrado`);
                    return null;
                }
                
                const endereco = {
                    logradouro: data.logradouro || '',
                    bairro: data.bairro || '',
                    localidade: data.localidade || 'São José dos Campos',
                    uf: data.uf || 'SP',
                    cep: data.cep || cleanCEP,
                    endereco_completo: `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`,
                    fonte: 'ViaCEP'
                };
                
                console.log(`✅ ViaCEP: Endereço encontrado - ${endereco.endereco_completo}`);
                geocodingStats.viacep++;
                
                return endereco;
                
            } catch (error) {
                console.warn('⚠️ ViaCEP erro:', error.message);
                return null;
            }
        },

        // API 2: Nominatim OpenStreetMap - Para coordenadas precisas
        nominatim: async (endereco) => {
            try {
                console.log(`🌐 Nominatim: Geocodificando "${endereco.substring(0, 50)}..."`);
                
                // Construir query otimizada
                const query = `${endereco}, São José dos Campos, São Paulo, Brasil`;
                const encodedQuery = encodeURIComponent(query);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.timeout);
                
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `format=json&` +
                    `q=${encodedQuery}&` +
                    `limit=3&` +
                    `countrycodes=br&` +
                    `addressdetails=1&` +
                    `bounded=1&` +
                    `viewbox=${SJC_CONFIG.bounds.west},${SJC_CONFIG.bounds.south},${SJC_CONFIG.bounds.east},${SJC_CONFIG.bounds.north}&` +
                    `dedupe=1`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': GEOCODING_CONFIG.userAgent
                        }
                    }
                );
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data || data.length === 0) {
                    console.warn('⚠️ Nominatim: Nenhum resultado encontrado');
                    return null;
                }
                
                // Filtrar resultados dentro da região de São José dos Campos
                const validResults = data.filter(result => {
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);
                    return lat >= SJC_CONFIG.bounds.south && 
                           lat <= SJC_CONFIG.bounds.north &&
                           lon >= SJC_CONFIG.bounds.west && 
                           lon <= SJC_CONFIG.bounds.east;
                });
                
                if (validResults.length === 0) {
                    console.warn('⚠️ Nominatim: Nenhum resultado na região de SJC');
                    return null;
                }
                
                const best = validResults[0];
                const coords = {
                    lat: parseFloat(best.lat),
                    lng: parseFloat(best.lon),
                    precisao: this.calculatePrecision(best),
                    endereco_display: best.display_name,
                    fonte: 'Nominatim'
                };
                
                console.log(`✅ Nominatim: Coordenadas encontradas - ${coords.lat}, ${coords.lng} (${coords.precisao})`);
                geocodingStats.nominatim++;
                geocodingStats.precision[coords.precisao]++;
                
                return coords;
                
            } catch (error) {
                console.warn('⚠️ Nominatim erro:', error.message);
                return null;
            }
        },

        // API 3: Photon - Backup público para geocodificação
        photon: async (endereco) => {
            try {
                console.log(`🌐 Photon: Geocodificando "${endereco.substring(0, 50)}..."`);
                
                const query = `${endereco}, São José dos Campos, SP, Brasil`;
                const encodedQuery = encodeURIComponent(query);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.timeout);
                
                const response = await fetch(
                    `https://photon.komoot.io/api/?` +
                    `q=${encodedQuery}&` +
                    `limit=3&` +
                    `bbox=${SJC_CONFIG.bounds.west},${SJC_CONFIG.bounds.south},${SJC_CONFIG.bounds.east},${SJC_CONFIG.bounds.north}&` +
                    `osm_tag=place`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': GEOCODING_CONFIG.userAgent
                        }
                    }
                );
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.features || data.features.length === 0) {
                    console.warn('⚠️ Photon: Nenhum resultado encontrado');
                    return null;
                }
                
                const best = data.features[0];
                const coords = {
                    lat: best.geometry.coordinates[1],
                    lng: best.geometry.coordinates[0],
                    precisao: 'medium',
                    endereco_display: best.properties.name,
                    fonte: 'Photon'
                };
                
                console.log(`✅ Photon: Coordenadas encontradas - ${coords.lat}, ${coords.lng}`);
                geocodingStats.photon++;
                geocodingStats.precision.medium++;
                
                return coords;
                
            } catch (error) {
                console.warn('⚠️ Photon erro:', error.message);
                return null;
            }
        }
    };

    function isLeafletReady() {
        return typeof L !== 'undefined' && L.map && L.tileLayer && L.circleMarker && L.layerGroup;
    }

    function showMapError(message, showRetry = true) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        mapContainer.style.height = '500px';
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; padding: 2rem; background: #f8f9fa;">
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
                <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Erro no Sistema de Mapa</h3>
                <p style="margin: 0 0 1.5rem 0; font-size: 1rem; max-width: 400px; line-height: 1.5;">${message}</p>
                ${showRetry ? `
                    <button onclick="window.mapManager.forceRetry()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        🔄 Reinicializar Sistema
                    </button>
                ` : ''}
            </div>
        `;
    }

    function showMapLoading(message = 'Inicializando sistema...') {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        mapContainer.style.height = '500px';
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; background: #f8f9fa;">
                <div style="width: 50px; height: 50px; border: 5px solid #e3e3e3; border-top: 5px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1.5rem;"></div>
                <p style="margin: 0; font-size: 1.1rem; font-weight: 500; color: #333;">${message}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #666;">Sistema de alta precisão em funcionamento...</p>
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
        }

        async init() {
            if (this.initialized) {
                console.log('🗺️ Sistema já inicializado');
                this.ensureMapVisible();
                return true;
            }

            if (this.initializationPromise) {
                return await this.initializationPromise;
            }

            this.initializationPromise = this._performInit();
            return await this.initializationPromise;
        }

        async _performInit() {
            try {
                console.log('🗺️ Inicializando sistema de mapa de alta precisão...');
                showMapLoading('Verificando dependências...');

                if (!this.ensureMapContainer()) {
                    throw new Error('Container do mapa não configurado');
                }

                if (!isLeafletReady()) {
                    showMapLoading('Carregando biblioteca Leaflet...');
                    await this.waitForLeaflet();
                }

                showMapLoading('Criando mapa interativo...');
                await this.createMap();

                showMapLoading('Inicializando localização em tempo real...');
                this.startRealTimeLocation();

                showMapLoading('Carregando cache de geocodificação...');
                this.loadGeocodingCache();

                this.initialized = true;
                console.log('✅ Sistema de mapa inicializado com sucesso');

                showMapLoading('Processando clientes com máxima precisão...');
                
                // Iniciar processamento de marcadores após delay
                setTimeout(() => {
                    this.startPrecisionGeocoding();
                }, 2000);

                return true;

            } catch (error) {
                console.error('❌ Erro na inicialização:', error);
                showMapError('Erro ao inicializar sistema: ' + error.message);
                return false;
            } finally {
                this.initializationPromise = null;
            }
        }

        ensureMapContainer() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return false;

            mapContainer.style.height = '500px';
            mapContainer.style.width = '100%';
            mapContainer.style.position = 'relative';
            return true;
        }

        async waitForLeaflet() {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const timeout = 15000;

                const check = () => {
                    if (isLeafletReady()) {
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        reject(new Error('Timeout aguardando Leaflet'));
                    } else {
                        setTimeout(check, 200);
                    }
                };
                check();
            });
        }

        async createMap() {
            const mapContainer = document.getElementById('map');
            mapContainer.innerHTML = '';

            map = L.map('map', {
                center: SJC_CONFIG.center,
                zoom: SJC_CONFIG.defaultZoom,
                zoomControl: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true,
                maxZoom: SJC_CONFIG.maxZoom,
                minZoom: SJC_CONFIG.minZoom
            });

            // Tiles com múltiplas opções
            const tileProviders = [
                {
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    attribution: '© OpenStreetMap contributors'
                },
                {
                    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                    attribution: '© OpenTopoMap contributors'
                }
            ];

            let tileLayer;
            for (const provider of tileProviders) {
                try {
                    tileLayer = L.tileLayer(provider.url, {
                        attribution: provider.attribution,
                        maxZoom: SJC_CONFIG.maxZoom,
                        timeout: 10000
                    });
                    tileLayer.addTo(map);
                    break;
                } catch (error) {
                    console.warn(`⚠️ Erro ao carregar tiles ${provider.url}:`, error);
                }
            }

            markersLayer = L.layerGroup().addTo(map);

            map.on('load', () => {
                isMapInitialized = true;
            });

            setTimeout(() => {
                if (map) map.invalidateSize(true);
            }, 500);

            isMapInitialized = true;
            console.log('✅ Mapa criado com sucesso');
        }

        // LOCALIZAÇÃO EM TEMPO REAL DE ALTA PRECISÃO
        startRealTimeLocation() {
            if (!navigator.geolocation) {
                console.log('⚠️ Geolocalização não disponível');
                return;
            }

            console.log('📍 Iniciando localização em tempo real de alta precisão...');

            const highAccuracyOptions = {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000
            };

            // Obter posição inicial
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.updateUserLocation(position);
                    console.log('✅ Localização inicial obtida');
                },
                (error) => {
                    console.warn('⚠️ Erro na localização inicial:', error);
                    this.tryFallbackLocation();
                },
                highAccuracyOptions
            );

            // Rastreamento contínuo
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.updateUserLocation(position);
                },
                (error) => {
                    console.warn('⚠️ Erro no rastreamento:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 30000
                }
            );

            console.log('✅ Sistema de localização em tempo real ativo');
        }

        tryFallbackLocation() {
            // Tentar localização com menor precisão
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.updateUserLocation(position);
                    console.log('✅ Localização de fallback obtida');
                },
                (error) => {
                    console.warn('⚠️ Localização de fallback também falhou:', error);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 15000,
                    maximumAge: 300000
                }
            );
        }

        updateUserLocation(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                timestamp: position.timestamp
            };

            const accuracy = Math.round(userLocation.accuracy);
            console.log(`📍 Localização atualizada: ${userLocation.lat.toFixed(7)}, ${userLocation.lng.toFixed(7)} (±${accuracy}m)`);

            if (!map || !isMapInitialized) return;

            // Remover marcadores anteriores
            if (userLocationMarker) {
                markersLayer.removeLayer(userLocationMarker);
            }
            if (userLocationAccuracyCircle) {
                markersLayer.removeLayer(userLocationAccuracyCircle);
            }

            // Círculo de precisão
            userLocationAccuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
                radius: userLocation.accuracy,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
            });

            // Marcador do usuário com informações detalhadas
            userLocationMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
                color: '#007bff',
                fillColor: '#ffffff',
                fillOpacity: 1,
                radius: 10,
                weight: 4
            });

            const popupContent = `
                <div style="text-align: center; padding: 0.75rem; min-width: 200px;">
                    <div style="background: #007bff; color: white; padding: 0.5rem; margin: -0.75rem -0.75rem 0.75rem -0.75rem; border-radius: 6px 6px 0 0;">
                        <strong>📍 Sua Localização em Tempo Real</strong>
                    </div>
                    <div style="text-align: left; line-height: 1.6;">
                        <p><strong>Coordenadas:</strong><br>${userLocation.lat.toFixed(7)}, ${userLocation.lng.toFixed(7)}</p>
                        <p><strong>Precisão:</strong> ±${accuracy}m</p>
                        ${userLocation.altitude ? `<p><strong>Altitude:</strong> ${Math.round(userLocation.altitude)}m</p>` : ''}
                        ${userLocation.speed ? `<p><strong>Velocidade:</strong> ${Math.round(userLocation.speed * 3.6)} km/h</p>` : ''}
                        <p><strong>Atualização:</strong><br>${new Date(userLocation.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            `;

            userLocationMarker.bindPopup(popupContent);

            markersLayer.addLayer(userLocationAccuracyCircle);
            markersLayer.addLayer(userLocationMarker);
        }

        // SISTEMA DE GEOCODIFICAÇÃO DE ALTA PRECISÃO
        async startPrecisionGeocoding() {
            if (isProcessingMarkers) return;
            if (!map || !isMapInitialized) return;

            isProcessingMarkers = true;

            try {
                console.log('🎯 Iniciando geocodificação de alta precisão...');
                
                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente disponível para geocodificar');
                    showMapError('Nenhum cliente encontrado. Faça o upload de uma planilha.');
                    return;
                }

                console.log(`🎯 ${allClients.length} clientes serão geocodificados com máxima precisão`);
                
                // Adicionar à fila de geocodificação
                geocodingQueue = allClients.map((client, index) => ({
                    client,
                    index,
                    attempts: 0
                }));

                // Iniciar processamento sequencial
                this.processGeocodingQueue();

            } catch (error) {
                console.error('❌ Erro no início da geocodificação:', error);
            } finally {
                // Não marcar como finished aqui, pois o processamento é assíncrono
            }
        }

        async processGeocodingQueue() {
            if (isProcessingQueue) return;
            if (geocodingQueue.length === 0) {
                this.finishGeocodingProcess();
                return;
            }

            isProcessingQueue = true;

            while (geocodingQueue.length > 0) {
                const item = geocodingQueue.shift();
                const { client, index } = item;

                try {
                    // Mostrar progresso
                    const processed = index + 1;
                    const total = this.getAllClients().length;
                    this.showGeocodingProgress(processed, total, client['Nome Fantasia'] || 'Cliente');

                    console.log(`🎯 [${processed}/${total}] Geocodificando: ${client['Nome Fantasia'] || 'Cliente'}`);

                    const marker = await this.geocodeClientWithMaxPrecision(client);
                    
                    if (marker) {
                        console.log(`✅ [${processed}/${total}] Sucesso: ${client['Nome Fantasia']}`);
                        geocodingStats.success++;
                    } else {
                        console.warn(`⚠️ [${processed}/${total}] Falha: ${client['Nome Fantasia']}`);
                        geocodingStats.errors++;
                    }

                    // Delay obrigatório entre requests para evitar rate limiting
                    if (geocodingQueue.length > 0) {
                        console.log(`⏳ Aguardando ${GEOCODING_CONFIG.delay}ms para próxima consulta...`);
                        await new Promise(resolve => setTimeout(resolve, GEOCODING_CONFIG.delay));
                    }

                } catch (error) {
                    console.error(`❌ Erro no cliente ${client['Nome Fantasia']}:`, error);
                    geocodingStats.errors++;
                }
            }

            this.finishGeocodingProcess();
        }

        showGeocodingProgress(current, total, clientName) {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Criar/atualizar indicador de progresso
            let progressDiv = document.getElementById('geocoding-progress');
            if (!progressDiv) {
                progressDiv = document.createElement('div');
                progressDiv.id = 'geocoding-progress';
                progressDiv.style.cssText = `
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 123, 255, 0.95);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 25px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    z-index: 1000;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    min-width: 300px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                `;
                mapContainer.appendChild(progressDiv);
            }

            const percentage = Math.round((current / total) * 100);
            
            progressDiv.innerHTML = `
                <div style="margin-bottom: 0.5rem;">
                    <strong>🎯 Geocodificação de Alta Precisão</strong>
                </div>
                <div style="margin-bottom: 0.5rem;">
                    ${current} de ${total} clientes processados (${percentage}%)
                </div>
                <div style="font-size: 0.8rem; opacity: 0.9;">
                    📍 ${clientName.substring(0, 30)}${clientName.length > 30 ? '...' : ''}
                </div>
                <div style="background: rgba(255,255,255,0.2); height: 6px; border-radius: 3px; margin-top: 0.5rem; overflow: hidden;">
                    <div style="background: white; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                </div>
            `;
        }

        finishGeocodingProcess() {
            isProcessingQueue = false;
            isProcessingMarkers = false;

            // Remover indicador de progresso
            const progressDiv = document.getElementById('geocoding-progress');
            if (progressDiv) {
                setTimeout(() => {
                    progressDiv.remove();
                }, 2000);
            }

            // Ajustar vista
            this.fitMapToBounds();

            // Salvar cache
            this.saveGeocodingCache();

            // Mostrar estatísticas
            console.log('📊 Geocodificação concluída:');
            console.log(`   Total processados: ${geocodingStats.total}`);
            console.log(`   Sucessos: ${geocodingStats.success}`);
            console.log(`   Erros: ${geocodingStats.errors}`);
            console.log(`   Cache hits: ${geocodingStats.cached}`);
            console.log(`   ViaCEP: ${geocodingStats.viacep}`);
            console.log(`   Nominatim: ${geocodingStats.nominatim}`);
            console.log(`   Photon: ${geocodingStats.photon}`);
            console.log(`   Alta precisão: ${geocodingStats.precision.high}`);
            console.log(`   Média precisão: ${geocodingStats.precision.medium}`);
            console.log(`   Baixa precisão: ${geocodingStats.precision.low}`);

            console.log('✅ Sistema de geocodificação de alta precisão concluído!');
        }

        // GEOCODIFICAÇÃO COM MÁXIMA PRECISÃO
        async geocodeClientWithMaxPrecision(client) {
            try {
                geocodingStats.total++;

                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A' || endereco.trim() === '') {
                    console.log(`⚠️ Cliente sem endereço: ${client['Nome Fantasia']}`);
                    return null;
                }

                // Verificar cache primeiro
                const cacheKey = this.createCacheKey(endereco);
                if (geocodingCache.has(cacheKey)) {
                    geocodingStats.cached++;
                    const cached = geocodingCache.get(cacheKey);
                    console.log(`📦 Cache hit: ${client['Nome Fantasia']}`);
                    return this.createMarkerFromCoordinates(client, cached);
                }

                console.log(`🎯 Processando endereço: ${endereco}`);

                // ETAPA 1: Extrair e melhorar endereço com ViaCEP
                let enderecoMelhorado = endereco;
                const cep = this.extractCEP(endereco);
                
                if (cep) {
                    console.log(`📮 CEP encontrado: ${cep}`);
                    const dadosViaCEP = await GEOCODING_APIS.viaCEP(cep);
                    if (dadosViaCEP) {
                        enderecoMelhorado = dadosViaCEP.endereco_completo;
                        console.log(`✅ Endereço melhorado pelo ViaCEP: ${enderecoMelhorado}`);
                    }
                }

                // ETAPA 2: Geocodificação com múltiplas APIs
                let coords = null;
                const geocodingMethods = [
                    { name: 'Nominatim', func: () => GEOCODING_APIS.nominatim(enderecoMelhorado) },
                    { name: 'NominatimOriginal', func: () => GEOCODING_APIS.nominatim(endereco) },
                    { name: 'Photon', func: () => GEOCODING_APIS.photon(enderecoMelhorado) }
                ];

                for (const method of geocodingMethods) {
                    try {
                        console.log(`🌐 Tentando ${method.name}...`);
                        coords = await method.func();
                        
                        if (coords && this.validateCoordinates(coords)) {
                            console.log(`✅ ${method.name} retornou coordenadas válidas`);
                            break;
                        } else if (coords) {
                            console.warn(`⚠️ ${method.name} retornou coordenadas fora da região`);
                        }

                        // Delay entre tentativas de API
                        await new Promise(resolve => setTimeout(resolve, 1000));

                    } catch (error) {
                        console.warn(`⚠️ ${method.name} falhou:`, error.message);
                    }
                }

                // ETAPA 3: Fallback para coordenadas aproximadas
                if (!coords) {
                    console.warn(`⚠️ Geocodificação falhou para: ${client['Nome Fantasia']}`);
                    coords = this.generateSmartFallbackCoordinates(endereco);
                }

                // Salvar no cache
                geocodingCache.set(cacheKey, coords);

                // Criar marcador
                return this.createMarkerFromCoordinates(client, coords);

            } catch (error) {
                console.error('❌ Erro na geocodificação:', error);
                return null;
            }
        }

        extractCEP(endereco) {
            const cepPattern = /\d{5}-?\d{3}/g;
            const matches = endereco.match(cepPattern);
            return matches ? matches[0] : null;
        }

        validateCoordinates(coords) {
            if (!coords || !coords.lat || !coords.lng) return false;
            
            return coords.lat >= SJC_CONFIG.bounds.south && 
                   coords.lat <= SJC_CONFIG.bounds.north &&
                   coords.lng >= SJC_CONFIG.bounds.west && 
                   coords.lng <= SJC_CONFIG.bounds.east;
        }

        calculatePrecision(result) {
            const type = result.type || result.class || 'unknown';
            const importance = parseFloat(result.importance || 0);
            
            if (type === 'house' || importance > 0.6) return 'high';
            if (type === 'way' || type === 'residential' || importance > 0.4) return 'medium';
            return 'low';
        }

        generateSmartFallbackCoordinates(endereco) {
            // Análise de bairro para coordenadas mais precisas
            const bairros = {
                'vila industrial': [-23.2100, -45.8800],
                'jardim paulista': [-23.2200, -45.8900],
                'centro': [-23.2237, -45.9009],
                'jardim das industrias': [-23.2400, -45.8700],
                'vila ema': [-23.2300, -45.8800],
                'jardim america': [-23.2150, -45.8950],
                'parque industrial': [-23.2350, -45.8850],
                'jardim colonial': [-23.2280, -45.8750],
                'bosque dos eucaliptos': [-23.2180, -45.8920]
            };

            const enderecoLower = endereco.toLowerCase();
            for (const [bairro, coords] of Object.entries(bairros)) {
                if (enderecoLower.includes(bairro)) {
                    return {
                        lat: coords[0] + (Math.random() - 0.5) * 0.01,
                        lng: coords[1] + (Math.random() - 0.5) * 0.01,
                        precisao: 'low',
                        fonte: 'Fallback Inteligente'
                    };
                }
            }

            // Fallback padrão
            return {
                lat: SJC_CONFIG.center[0] + (Math.random() - 0.5) * 0.08,
                lng: SJC_CONFIG.center[1] + (Math.random() - 0.5) * 0.08,
                precisao: 'low',
                fonte: 'Fallback Aleatório'
            };
        }

        createMarkerFromCoordinates(client, coords) {
            try {
                const markerStyle = this.getMarkerStyle(client.category, coords.precisao);
                const marker = L.circleMarker([coords.lat, coords.lng], markerStyle.style);

                const popupContent = this.createDetailedPopup(client, coords, markerStyle);
                marker.bindPopup(popupContent, {
                    maxWidth: 400,
                    className: 'precision-popup'
                });

                markersLayer.addLayer(marker);
                currentMarkers.push(marker);

                return marker;

            } catch (error) {
                console.error('❌ Erro ao criar marcador:', error);
                return null;
            }
        }

        createDetailedPopup(client, coords, markerStyle) {
            const nomeFantasia = this.escapeHtml(client['Nome Fantasia'] || client['Cliente'] || 'Cliente');
            const contato = this.escapeHtml(client['Contato'] || 'N/A');
            const telefone = this.escapeHtml(client['Celular'] || 'N/A');
            const cidade = this.escapeHtml(window.clientManager?.extrairCidadeDoItem(client) || 'N/A');
            const segmento = this.escapeHtml(client['Segmento'] || 'N/A');

            // Determinar ícone de precisão
            const precisaoIcon = coords.precisao === 'high' ? '🎯' : 
                                coords.precisao === 'medium' ? '📍' : '📌';
            
            const precisaoText = coords.precisao === 'high' ? 'Alta Precisão' : 
                                coords.precisao === 'medium' ? 'Média Precisão' : 'Baixa Precisão';

            // Criar chave global para o modal
            const clientId = `precisionClient_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            window[clientId] = client;

            return `
                <div style="min-width: 350px; max-width: 400px; padding: 0;">
                    <div style="background: ${markerStyle.color}; color: white; padding: 1.25rem; margin: 0; border-radius: 8px 8px 0 0; text-align: center;">
                        <strong style="font-size: 1.2rem;">${markerStyle.icon} ${nomeFantasia}</strong>
                    </div>
                    <div style="padding: 1.5rem;">
                        <div style="margin-bottom: 1rem;">
                            <strong>Status:</strong> 
                            <span style="color: ${markerStyle.color}; font-weight: bold;">${client.category}</span>
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
                        
                        <div style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; border-left: 4px solid ${markerStyle.color};">
                            <div style="margin-bottom: 0.5rem;">
                                <strong>${precisaoIcon} ${precisaoText}</strong>
                            </div>
                            <div style="font-size: 0.85rem; color: #666;">
                                <div>Fonte: ${coords.fonte || 'Sistema'}</div>
                                <div>Coordenadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; border-top: 1px solid #eee; padding-top: 1rem;">
                            <button 
                                onclick="window.openClientModal('${clientId}')" 
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

        getMarkerStyle(category, precision = 'medium') {
            let baseStyle, color, icon;

            // Estilo base por categoria
            switch (category) {
                case 'Ativo':
                    baseStyle = { color: '#28a745', fillColor: '#28a745', fillOpacity: 0.8 };
                    color = '#28a745';
                    icon = '🟢';
                    break;
                case 'Novo':
                    baseStyle = { color: '#17a2b8', fillColor: '#17a2b8', fillOpacity: 0.8 };
                    color = '#17a2b8';
                    icon = '🆕';
                    break;
                default:
                    baseStyle = { color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.8 };
                    color = '#dc3545';
                    icon = '🔴';
            }

            // Ajustar tamanho baseado na precisão
            let radius, weight;
            switch (precision) {
                case 'high':
                    radius = 12;
                    weight = 4;
                    break;
                case 'medium':
                    radius = 10;
                    weight = 3;
                    break;
                default:
                    radius = 8;
                    weight = 2;
            }

            return {
                style: {
                    ...baseStyle,
                    radius: radius,
                    weight: weight
                },
                color: color,
                icon: icon
            };
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

        createCacheKey(endereco) {
            return endereco
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
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

        fitMapToBounds() {
            if (!map || currentMarkers.length === 0) return;

            try {
                const group = new L.featureGroup(currentMarkers);
                const bounds = group.getBounds();

                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [30, 30],
                        maxZoom: 15
                    });
                    console.log('🗺️ Vista ajustada para mostrar todos os marcadores');
                }
            } catch (error) {
                console.error('❌ Erro ao ajustar vista:', error);
            }
        }

        loadGeocodingCache() {
            try {
                const cached = localStorage.getItem('precision-geocoding-cache-v1');
                if (cached) {
                    const data = JSON.parse(cached);
                    geocodingCache = new Map(data);
                    console.log(`📦 Cache de precisão carregado: ${geocodingCache.size} entradas`);
                }
            } catch (error) {
                geocodingCache = new Map();
            }
        }

        saveGeocodingCache() {
            try {
                const data = Array.from(geocodingCache.entries());
                localStorage.setItem('precision-geocoding-cache-v1', JSON.stringify(data));
                console.log(`💾 Cache de precisão salvo: ${data.length} entradas`);
            } catch (error) {
                console.error('❌ Erro ao salvar cache:', error);
            }
        }

        forceRetry() {
            console.log('🔄 Reinicializando sistema completo...');
            
            // Parar rastreamento
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }

            // Reset completo
            this.initialized = false;
            this.initializationPromise = null;
            isMapInitialized = false;
            isProcessingMarkers = false;
            isProcessingQueue = false;
            geocodingQueue = [];
            
            if (map) {
                map.remove();
                map = null;
            }
            
            markersLayer = null;
            currentMarkers = [];
            userLocationMarker = null;
            userLocationAccuracyCircle = null;
            
            // Reinicializar
            setTimeout(() => {
                this.init();
            }, 1000);
        }

        onMapTabActivated() {
            console.log('📋 Aba do mapa ativada');
            
            setTimeout(() => {
                if (map && this.initialized) {
                    map.invalidateSize(true);
                    
                    if (currentMarkers.length === 0 && !isProcessingMarkers) {
                        console.log('📍 Sem marcadores, iniciando geocodificação...');
                        this.startPrecisionGeocoding();
                    }
                } else if (!this.initialized) {
                    this.init();
                }
            }, 200);
        }

        updateAllMarkers() {
            if (!isProcessingMarkers) {
                currentMarkers.forEach(marker => markersLayer.removeLayer(marker));
                currentMarkers = [];
                this.startPrecisionGeocoding();
            }
        }

        clearAllMarkers() {
            if (markersLayer) {
                currentMarkers.forEach(marker => markersLayer.removeLayer(marker));
                currentMarkers = [];
            }
        }

        clearGeocodingCache() {
            geocodingCache.clear();
            localStorage.removeItem('precision-geocoding-cache-v1');
            console.log('🧹 Cache de geocodificação limpo');
        }

        getStats() {
            return {
                ...geocodingStats,
                cacheSize: geocodingCache.size,
                markersCount: currentMarkers.length,
                mapInitialized: isMapInitialized,
                managerInitialized: this.initialized,
                userLocationActive: !!watchId,
                userLocation: userLocation,
                queueSize: geocodingQueue.length,
                isProcessing: isProcessingMarkers
            };
        }
    }

    // FUNÇÃO GLOBAL PARA MODAL
    window.openClientModal = function(clientId) {
        try {
            const client = window[clientId];
            if (!client) {
                alert('Cliente não encontrado');
                return;
            }

            if (window.clientManager && typeof window.clientManager.showClientModal === 'function') {
                window.clientManager.showClientModal(client);
            } else {
                alert('Sistema de modal não disponível');
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

        // CSS personalizado para popups de precisão
        const style = document.createElement('style');
        style.textContent = `
            .precision-popup .leaflet-popup-content-wrapper {
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                border: none;
                overflow: hidden;
            }
            .precision-popup .leaflet-popup-content {
                margin: 0;
                padding: 0;
                border-radius: 8px;
                overflow: hidden;
            }
            .precision-popup .leaflet-popup-tip {
                background: white;
                box-shadow: 0 3px 14px rgba(0,0,0,0.4);
            }
            .precision-popup .leaflet-popup-close-button {
                color: #666;
                font-size: 18px;
                font-weight: bold;
                padding: 8px;
                top: 8px;
                right: 8px;
                background: rgba(255,255,255,0.9);
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            .precision-popup .leaflet-popup-close-button:hover {
                background: rgba(220, 53, 69, 0.1);
                color: #dc3545;
                transform: rotate(90deg);
            }
        `;
        document.head.appendChild(style);
    }

    console.log('✅ Sistema de Mapa de Alta Precisão carregado');
    console.log('🎯 Características:');
    console.log('   • Localização do usuário em tempo real');
    console.log('   • Geocodificação sequencial (uma por vez)');
    console.log('   • Múltiplas APIs públicas (ViaCEP + Nominatim + Photon)');
    console.log('   • Cache inteligente de coordenadas');
    console.log('   • Validação de precisão automática');
    console.log('   • Sistema de fallback robusto');

})();
