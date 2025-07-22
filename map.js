// map.js - Sistema de Mapa Avançado com Geolocalização Precisa e APIs Públicas
(function() {
    'use strict';

    // ========== VARIÁVEIS GLOBAIS ==========
    let map = null;
    let markersLayer = null;
    let currentMarkers = [];
    let isMapInitialized = false;
    let isProcessingMarkers = false;
    let initializationAttempts = 0;
    let globalTimeout = null;
    let userLocation = null;
    let geocodingCache = new Map();

    // ========== CONFIGURAÇÕES ==========
    const MAX_INIT_ATTEMPTS = 3;
    const ABSOLUTE_TIMEOUT = 15000;
    const MAX_MARKERS = 50;
    const GEOCODING_DELAY = 1000; // Respeitar limites da API
    
    const SJC_CONFIG = {
        center: [-23.2237, -45.9009],
        defaultZoom: 12,
        maxZoom: 18,
        minZoom: 8
    };

    const NOMINATIM_CONFIG = {
        baseUrl: 'https://nominatim.openstreetmap.org',
        headers: {
            'User-Agent': 'PMG-Agenda-Clientes/1.0'
        },
        timeout: 5000
    };

    // ========== GERENCIAMENTO DE TIMEOUT ==========
    function setGlobalTimeout() {
        if (globalTimeout) clearTimeout(globalTimeout);
        globalTimeout = setTimeout(() => {
            console.warn('🚨 TIMEOUT GLOBAL - Parando processamento');
            forceStopEverything();
            showMapBasic();
        }, ABSOLUTE_TIMEOUT);
    }

    function clearGlobalTimeout() {
        if (globalTimeout) {
            clearTimeout(globalTimeout);
            globalTimeout = null;
        }
    }

    function forceStopEverything() {
        isProcessingMarkers = false;
        clearGlobalTimeout();
        console.log('🛑 Processamento interrompido');
    }

    // ========== VERIFICAÇÕES DE COMPATIBILIDADE ==========
    function isLeafletReady() {
        return typeof L !== 'undefined' && L.map && L.tileLayer && L.circleMarker;
    }

    function isGeolocationSupported() {
        return 'geolocation' in navigator;
    }

    // ========== GEOLOCALIZAÇÃO DO USUÁRIO ==========
    async function obterLocalizacaoUsuario() {
        return new Promise((resolve, reject) => {
            if (!isGeolocationSupported()) {
                reject(new Error('Geolocalização não suportada'));
                return;
            }

            console.log('📍 Obtendo localização do usuário...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    console.log('✅ Localização obtida:', coords);
                    resolve(coords);
                },
                (error) => {
                    console.error('❌ Erro de geolocalização:', error.message);
                    resolve(null); // Retorna null em vez de rejeitar
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000 // Cache por 1 minuto
                }
            );
        });
    }

    // ========== API NOMINATIM (GEOCODIFICAÇÃO) ==========
    async function buscarEnderecoNominatim(lat, lon) {
        const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
        
        if (geocodingCache.has(cacheKey)) {
            return geocodingCache.get(cacheKey);
        }

        try {
            const url = `${NOMINATIM_CONFIG.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_CONFIG.timeout);

            const response = await fetch(url, {
                headers: NOMINATIM_CONFIG.headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = {
                display_name: data.display_name || 'Endereço não encontrado',
                address: data.address || {},
                lat: parseFloat(data.lat) || lat,
                lon: parseFloat(data.lon) || lon
            };

            geocodingCache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.warn('⚠️ Erro no Nominatim:', error.message);
            const fallback = {
                display_name: 'São José dos Campos, SP',
                address: { city: 'São José dos Campos', state: 'SP' },
                lat: lat,
                lon: lon
            };
            geocodingCache.set(cacheKey, fallback);
            return fallback;
        }
    }

    async function geocodificarEndereco(endereco) {
        const cacheKey = endereco.toLowerCase().trim();
        
        if (geocodingCache.has(cacheKey)) {
            return geocodingCache.get(cacheKey);
        }

        try {
            // Melhorar o endereço para consulta
            let enderecoMelhorado = endereco;
            if (!endereco.includes('São José dos Campos')) {
                enderecoMelhorado += ', São José dos Campos, SP, Brasil';
            }

            const url = `${NOMINATIM_CONFIG.baseUrl}/search?q=${encodeURIComponent(enderecoMelhorado)}&format=json&addressdetails=1&limit=1`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_CONFIG.timeout);

            const response = await fetch(url, {
                headers: NOMINATIM_CONFIG.headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    display_name: data[0].display_name,
                    address: data[0].address || {}
                };
                geocodingCache.set(cacheKey, result);
                return result;
            }

            throw new Error('Nenhum resultado encontrado');

        } catch (error) {
            console.warn('⚠️ Geocodificação falhou para:', endereco, error.message);
            // Fallback para centro de SJC
            const fallback = {
                lat: SJC_CONFIG.center[0],
                lon: SJC_CONFIG.center[1],
                display_name: endereco,
                address: {}
            };
            geocodingCache.set(cacheKey, fallback);
            return fallback;
        }
    }

    // ========== INICIALIZAÇÃO DO MAPA ==========
    async function initializeMap() {
        if (isMapInitialized) {
            console.log('✅ Mapa já inicializado');
            return;
        }

        if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
            console.error('❌ Máximo de tentativas excedido');
            showMapBasic();
            return;
        }

        initializationAttempts++;
        console.log(`🗺️ Inicializando mapa (tentativa ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);

        if (!isLeafletReady()) {
            console.error('❌ Leaflet não está pronto');
            setTimeout(initializeMap, 2000);
            return;
        }

        try {
            setGlobalTimeout();

            // Obter localização do usuário
            userLocation = await obterLocalizacaoUsuario();
            
            let mapCenter = SJC_CONFIG.center;
            let initialZoom = SJC_CONFIG.defaultZoom;

            if (userLocation) {
                mapCenter = [userLocation.lat, userLocation.lon];
                // Ajustar zoom baseado na precisão
                if (userLocation.accuracy < 100) {
                    initialZoom = 15;
                } else if (userLocation.accuracy < 1000) {
                    initialZoom = 13;
                }
            }

            // Criar mapa
            map = L.map('map', {
                center: mapCenter,
                zoom: initialZoom,
                maxZoom: SJC_CONFIG.maxZoom,
                minZoom: SJC_CONFIG.minZoom,
                zoomControl: true,
                attributionControl: true
            });

            // Adicionar tiles do OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: SJC_CONFIG.maxZoom,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Criar layer para marcadores
            markersLayer = L.layerGroup().addTo(map);

            // Adicionar marcador da localização do usuário
            if (userLocation) {
                await adicionarMarcadorUsuario(userLocation);
            }

            isMapInitialized = true;
            clearGlobalTimeout();

            console.log('✅ Mapa inicializado com sucesso');

            // Processar marcadores dos clientes
            setTimeout(() => {
                processAllMarkersComplete();
            }, 1000);

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            clearGlobalTimeout();
            
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                setTimeout(initializeMap, 3000);
            } else {
                showMapBasic();
            }
        }
    }

    async function adicionarMarcadorUsuario(location) {
        try {
            const endereco = await buscarEnderecoNominatim(location.lat, location.lon);
            
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '📍',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            });

            const marker = L.marker([location.lat, location.lon], { icon: userIcon })
                .addTo(markersLayer);

            const popupContent = `
                <div class="user-location-popup">
                    <h4>📍 Sua Localização</h4>
                    <p><strong>Endereço:</strong> ${endereco.display_name}</p>
                    <p><strong>Precisão:</strong> ±${Math.round(location.accuracy)}m</p>
                    <p><small>Última atualização: ${new Date(location.timestamp).toLocaleTimeString()}</small></p>
                </div>
            `;

            marker.bindPopup(popupContent).openPopup();

            console.log('✅ Marcador do usuário adicionado');
        } catch (error) {
            console.error('❌ Erro ao adicionar marcador do usuário:', error);
        }
    }

    // ========== PROCESSAMENTO DE MARCADORES DOS CLIENTES ==========
    async function processAllMarkersComplete() {
        if (isProcessingMarkers || !isMapInitialized) return;

        try {
            isProcessingMarkers = true;
            console.log('🔄 Processando marcadores dos clientes...');

            const allClients = getAllClientsData();
            if (!allClients || allClients.length === 0) {
                console.log('ℹ️ Nenhum cliente para processar');
                return;
            }

            const limitedClients = allClients.slice(0, MAX_MARKERS);
            console.log(`📊 Processando ${limitedClients.length} clientes`);

            // Processar em lotes para não sobrecarregar a API
            const batchSize = 5;
            for (let i = 0; i < limitedClients.length; i += batchSize) {
                const batch = limitedClients.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (client, index) => {
                    try {
                        await new Promise(resolve => setTimeout(resolve, index * 200)); // Delay escalonado
                        await processarMarcadorCliente(client);
                    } catch (error) {
                        console.warn('⚠️ Erro ao processar cliente:', client['Nome Fantasia'], error.message);
                    }
                }));

                // Pausa entre lotes
                if (i + batchSize < limitedClients.length) {
                    await new Promise(resolve => setTimeout(resolve, GEOCODING_DELAY));
                }
            }

            console.log('✅ Processamento de marcadores concluído');
            updateMapStatistics();

        } catch (error) {
            console.error('❌ Erro no processamento geral:', error);
        } finally {
            isProcessingMarkers = false;
        }
    }

    async function processarMarcadorCliente(client) {
        try {
            const endereco = extrairEnderecoLimpo(client);
            if (!endereco) return;

            const coords = await geocodificarEndereco(endereco);
            if (!coords) return;

            const marker = criarMarcadorCliente(client, coords);
            if (marker) {
                markersLayer.addLayer(marker);
                currentMarkers.push({
                    client: client,
                    marker: marker,
                    coords: coords
                });
            }

        } catch (error) {
            console.warn('⚠️ Erro ao processar marcador:', client['Nome Fantasia'], error.message);
        }
    }

    function extrairEnderecoLimpo(client) {
        const endereco = client['Endereço'] || client['endereco'] || '';
        if (!endereco || endereco === 'N/A') return null;

        // Limpar e normalizar o endereço
        return endereco
            .replace(/\n/g, ', ')
            .replace(/\s+/g, ' ')
            .replace(/,\s*,/g, ',')
            .trim();
    }

    function criarMarcadorCliente(client, coords) {
        try {
            const status = client['Status'] || 'Inativo';
            const categoria = getClientCategory(status);
            
            const icon = L.divIcon({
                className: `client-marker client-${categoria}`,
                html: getClientIcon(categoria),
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            });

            const marker = L.marker([coords.lat, coords.lon], { icon: icon });

            const popupContent = criarPopupCliente(client, coords);
            marker.bindPopup(popupContent);

            return marker;

        } catch (error) {
            console.error('❌ Erro ao criar marcador:', error);
            return null;
        }
    }

    function getClientCategory(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower.includes('ativo')) return 'ativo';
        if (statusLower.includes('novo')) return 'novo';
        return 'inativo';
    }

    function getClientIcon(categoria) {
        const icons = {
            'ativo': '🟢',
            'novo': '🆕',
            'inativo': '🔴'
        };
        return icons[categoria] || '📍';
    }

    function criarPopupCliente(client, coords) {
        const nome = client['Nome Fantasia'] || client['Cliente'] || 'Cliente';
        const contato = client['Contato'] || 'N/A';
        const telefone = client['Celular'] || 'N/A';
        const segmento = client['Segmento'] || 'N/A';
        const status = client['Status'] || 'N/A';

        return `
            <div class="client-popup">
                <h4>${nome}</h4>
                <p><strong>Status:</strong> <span class="status-${getClientCategory(status)}">${status}</span></p>
                <p><strong>Segmento:</strong> ${segmento}</p>
                <p><strong>Contato:</strong> ${contato}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
                <p><strong>Endereço:</strong> ${coords.display_name}</p>
                <div class="client-actions">
                    <button onclick="window.clientManager?.showClientModal?.(${JSON.stringify(client).replace(/"/g, '&quot;')})">Ver Detalhes</button>
                </div>
            </div>
        `;
    }

    // ========== UTILITÁRIOS ==========
    function getAllClientsData() {
        const allClients = [];
        
        if (window.clientManager) {
            if (window.clientManager.data) allClients.push(...window.clientManager.data);
            if (window.clientManager.ativos) allClients.push(...window.clientManager.ativos);
            if (window.clientManager.novos) allClients.push(...window.clientManager.novos);
        }

        // Fallback para variáveis globais
        if (allClients.length === 0) {
            if (window.data) allClients.push(...window.data);
            if (window.ativos) allClients.push(...window.ativos);
            if (window.novos) allClients.push(...window.novos);
        }

        return allClients.filter(client => client && (client['Nome Fantasia'] || client['Cliente']));
    }

    function updateMapStatistics() {
        try {
            const stats = {
                total: currentMarkers.length,
                ativos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'ativo').length,
                novos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'novo').length,
                inativos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'inativo').length
            };

            console.log('📊 Estatísticas do mapa:', stats);

            // Atualizar interface se existir
            const mapContainer = document.getElementById('map');
            if (mapContainer && mapContainer.parentElement) {
                let statsDiv = mapContainer.parentElement.querySelector('.map-statistics');
                if (!statsDiv) {
                    statsDiv = document.createElement('div');
                    statsDiv.className = 'map-statistics';
                    mapContainer.parentElement.insertBefore(statsDiv, mapContainer);
                }
                
                statsDiv.innerHTML = `
                    <div class="stats-content">
                        <span class="stat-item">Total: <strong>${stats.total}</strong></span>
                        <span class="stat-item">🟢 Ativos: <strong>${stats.ativos}</strong></span>
                        <span class="stat-item">🆕 Novos: <strong>${stats.novos}</strong></span>
                        <span class="stat-item">🔴 Inativos: <strong>${stats.inativos}</strong></span>
                    </div>
                `;
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar estatísticas:', error);
        }
    }

    function showMapBasic() {
        const container = document.getElementById('map');
        if (!container) return;

        container.style.height = '500px';
        container.innerHTML = `
            <div class="map-fallback">
                <h3>🗺️ Mapa Básico</h3>
                <p>O mapa avançado não pôde ser carregado.</p>
                <p><strong>Localização:</strong> São José dos Campos, SP</p>
                <div class="fallback-stats">
                    <p>Total de clientes carregados: <span id="fallback-count">0</span></p>
                </div>
                <button onclick="location.reload()" class="retry-btn">🔄 Tentar Novamente</button>
            </div>
        `;

        // Atualizar contagem básica
        const allClients = getAllClientsData();
        const countElement = container.querySelector('#fallback-count');
        if (countElement && allClients) {
            countElement.textContent = allClients.length;
        }
    }

    // ========== MÉTODOS PÚBLICOS ==========
    function clearAllMarkers() {
        if (markersLayer) {
            markersLayer.clearLayers();
        }
        currentMarkers = [];
        console.log('🧹 Todos os marcadores removidos');
    }

    function clearGeocodingCache() {
        geocodingCache.clear();
        console.log('🧹 Cache de geocodificação limpo');
    }

    function onMapTabActivated() {
        if (!isMapInitialized) {
            initializeMap();
        } else if (map) {
            // Invalidar tamanho do mapa quando a aba for ativada
            setTimeout(() => {
                map.invalidateSize(true);
                console.log('🔄 Tamanho do mapa atualizado');
            }, 300);
        }
    }

    // ========== ESTILOS CSS INJETADOS ==========
    function injectMapStyles() {
        const styles = `
            <style>
                .client-marker {
                    border-radius: 50%;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }
                
                .client-ativo { background: #28a745; }
                .client-novo { background: #17a2b8; }
                .client-inativo { background: #dc3545; }
                
                .user-location-marker {
                    font-size: 20px;
                    text-align: center;
                    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
                }
                
                .client-popup {
                    font-family: Arial, sans-serif;
                    min-width: 250px;
                }
                
                .client-popup h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 16px;
                }
                
                .client-popup p {
                    margin: 5px 0;
                    font-size: 14px;
                }
                
                .client-actions {
                    margin-top: 10px;
                    text-align: center;
                }
                
                .client-actions button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 5px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .client-actions button:hover {
                    background: #0056b3;
                }
                
                .status-ativo { color: #28a745; font-weight: bold; }
                .status-novo { color: #17a2b8; font-weight: bold; }
                .status-inativo { color: #dc3545; font-weight: bold; }
                
                .map-statistics {
                    background: #f8f9fa;
                    padding: 10px;
                    margin-bottom: 10px;
                    border-radius: 5px;
                    border: 1px solid #dee2e6;
                }
                
                .stats-content {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                }
                
                .stat-item {
                    font-size: 14px;
                    margin: 5px;
                }
                
                .map-fallback {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    padding: 40px 20px;
                }
                
                .retry-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-size: 14px;
                }
                
                .retry-btn:hover {
                    background: #0056b3;
                }
                
                .user-location-popup {
                    font-family: Arial, sans-serif;
                }
                
                .user-location-popup h4 {
                    margin: 0 0 10px 0;
                    color: #007bff;
                }
            </style>
        `;
        
        if (!document.querySelector('#map-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'map-styles';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }
    }

    // ========== INICIALIZAÇÃO ==========
    function initialize() {
        console.log('🚀 Sistema de mapa iniciando...');
        injectMapStyles();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            initializeMap();
        }
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    window.mapManager = {
        init: initializeMap,
        initialized: false,
        map: null,
        currentMarkers: [],
        clearAllMarkers: clearAllMarkers,
        clearGeocodingCache: clearGeocodingCache,
        onMapTabActivated: onMapTabActivated,
        processAllMarkersComplete: processAllMarkersComplete,
        
        // Getters
        get isInitialized() { return isMapInitialized; },
        get markersCount() { return currentMarkers.length; },
        get userLocation() { return userLocation; }
    };

    // Auto-inicializar
    initialize();

    console.log('✅ Sistema de mapa carregado com APIs públicas integradas');
})();
