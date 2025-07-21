// map.js - Versão com estatísticas e geocodificação inteligente

(function() {
    'use strict';
    
    let map = null;
    let markersLayer = null;
    let userLocationMarker = null;
    let currentMarkers = [];
    let geocodingCache = new Map();
    let isMapInitialized = false;
    let userLocation = null;
    let geocodingStats = {
        total: 0,
        success: 0,
        errors: 0,
        cached: 0
    };
    
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
    
    // Aguardar carregamento completo do Leaflet
    async function waitForLeaflet() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 60;
            
            const checkLeaflet = () => {
                attempts++;
                console.log(`🔍 Verificando Leaflet... tentativa ${attempts}/${maxAttempts}`);
                
                if (isLeafletReady()) {
                    console.log('✅ Leaflet está pronto!');
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    console.error('❌ Timeout: Leaflet não carregou');
                    reject(new Error('Leaflet não foi carregado após 60 segundos'));
                    return;
                }
                
                setTimeout(checkLeaflet, 1000);
            };
            
            checkLeaflet();
        });
    }
    
    // Mostrar erro no container do mapa
    function showMapError(message, showRetry = true) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        
        mapContainer.innerHTML = `
            <div style="padding: 50px; text-align: center; color: #666;">
                <h3>❌ ${message}</h3>
                ${showRetry ? `<button onclick="window.mapManager.retryInitialization()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 Tentar Novamente</button>` : ''}
            </div>
        `;
    }
    
    // Obter localização do usuário
    async function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não suportada pelo navegador'));
                return;
            }
            
            console.log('📍 Solicitando localização do usuário...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    console.log('✅ Localização do usuário obtida:', location);
                    resolve(location);
                },
                (error) => {
                    console.warn('⚠️ Erro ao obter localização:', error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    }
    
    // Adicionar marcador da localização do usuário
    function addUserLocationMarker(location) {
        if (!map) return;
        
        // Remover marcador anterior se existir
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
        }
        
        // Criar ícone personalizado para o usuário
        const userIcon = L.divIcon({
            html: `
                <div style="
                    width: 20px; 
                    height: 20px; 
                    background: #007bff; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    animation: pulse 2s infinite;
                "></div>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(0,123,255,0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(0,123,255,0); }
                        100% { box-shadow: 0 0 0 0 rgba(0,123,255,0); }
                    }
                </style>
            `,
            className: 'user-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        userLocationMarker = L.marker([location.lat, location.lng], { icon: userIcon });
        
        // Popup com informações da localização
        const popupContent = `
            <div style="min-width: 200px; font-family: Arial, sans-serif; text-align: center;">
                <div style="background: #007bff; color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 5px 5px 0 0;">
                    <strong>📍 Sua Localização</strong>
                </div>
                <p><strong>Coordenadas:</strong><br>${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
                <p><strong>Precisão:</strong> ±${Math.round(location.accuracy)}m</p>
                <button onclick="window.mapManager.centerOnUser()" 
                        style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    🎯 Centralizar Aqui
                </button>
            </div>
        `;
        
        userLocationMarker.bindPopup(popupContent);
        userLocationMarker.addTo(map);
        
        console.log('✅ Marcador do usuário adicionado ao mapa');
    }
    
    // Centralizar mapa na localização do usuário
    function centerOnUser() {
        if (userLocation && map) {
            map.setView([userLocation.lat, userLocation.lng], 15);
            if (userLocationMarker) {
                userLocationMarker.openPopup();
            }
        }
    }
    
    // Atualizar localização do usuário
    async function updateUserLocation() {
        try {
            console.log('🔄 Atualizando localização do usuário...');
            userLocation = await getUserLocation();
            
            if (map) {
                addUserLocationMarker(userLocation);
            }
            
            sessionStorage.setItem('userLocation', JSON.stringify(userLocation));
            return userLocation;
        } catch (error) {
            console.warn('⚠️ Não foi possível obter localização do usuário:', error.message);
            return null;
        }
    }
    
    // Carregar localização do usuário do sessionStorage
    function loadUserLocationFromSession() {
        try {
            const stored = sessionStorage.getItem('userLocation');
            if (stored) {
                userLocation = JSON.parse(stored);
                console.log('📍 Localização do usuário carregada da sessão:', userLocation);
                return userLocation;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar localização da sessão:', error);
        }
        return null;
    }
    
    // Configurar mapa base
    async function setupBaseMap() {
        try {
            console.log('🗺️ Configurando mapa base...');
            
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Container do mapa não encontrado');
            }
            
            mapContainer.innerHTML = `<div style="padding: 50px; text-align: center; color: #666;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <p>Carregando mapa...</p>
            </div>`;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            map = L.map('map').setView(SJC_CONFIG.center, SJC_CONFIG.defaultZoom);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: SJC_CONFIG.maxZoom,
                minZoom: SJC_CONFIG.minZoom
            }).addTo(map);
            
            markersLayer = L.layerGroup().addTo(map);
            addCustomControls();
            
            console.log('✅ Mapa base configurado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao configurar mapa base:', error);
            showMapError('Erro ao configurar o mapa: ' + error.message);
            throw error;
        }
    }
    
    // Adicionar controles personalizados
    function addCustomControls() {
        const locationControl = L.control({ position: 'topleft' });
        
        locationControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.innerHTML = `
                <button onclick="window.mapManager.updateUserLocation()" 
                        style="width: 34px; height: 34px; background: white; border: none; cursor: pointer; font-size: 16px;"
                        title="Atualizar minha localização">
                    📍
                </button>
            `;
            return div;
        };
        
        locationControl.addTo(map);
    }
    
    // Normalizar endereço com tratamento aprimorado para diferentes formatos
    function normalizeAddress(endereco, cidade = '', uf = 'SP') {
        if (!endereco) return '';
        
        try {
            // Formato 1: Endereço estruturado (quebras de linha)
            if (endereco.includes('\n')) {
                const linhas = endereco.split('\n').map(linha => linha.trim()).filter(linha => linha);
                
                if (linhas.length >= 3) {
                    const ufLinha = linhas[0] || 'SP';
                    const cidadeLinha = linhas[2] || 'São José dos Campos';
                    const bairroLinha = linhas[3] || '';
                    const numeroLinha = linhas[5] || '';
                    const logradouroLinha = linhas[6] || '';
                    
                    const parts = [logradouroLinha, numeroLinha, bairroLinha, cidadeLinha, ufLinha].filter(p => p);
                    return parts.join(', ');
                }
            }
            
            // Formato 2: "Avenida X, 300 - Bairro Cidade - SP CEP: XXXXX"
            const format2Match = endereco.match(/^(.+?),?\s*(\d+)?\s*-\s*(.+?)\s*-\s*(\w{2})\s*CEP:\s*(\d{5}-?\d{3})/);
            if (format2Match) {
                const [, rua, numero, cidadeBairro, ufExtraida, cep] = format2Match;
                const parts = [rua.trim(), numero, cidadeBairro.trim(), ufExtraida.trim()].filter(p => p);
                return parts.join(', ');
            }
            
            // Formato 3: "Rua X, 65 – Sala 03, Bairro, Cidade, SP, CEP XXXXX"
            const format3Match = endereco.match(/^(.+?),\s*(\d+)(?:\s*[–-]\s*(.+?))?,\s*(.+?),\s*(.+?),\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (format3Match) {
                const [, rua, numero, complemento, bairro, cidadeExtraida, ufExtraida, cep] = format3Match;
                const parts = [rua.trim(), numero, complemento, bairro.trim(), cidadeExtraida.trim(), ufExtraida.trim()].filter(p => p);
                return parts.join(', ');
            }
            
            // Formato 4: "Avenida X, 1800 - Bairro Cidade SP CEP: XXXXX"
            const format4Match = endereco.match(/^(.+?),\s*(\d+)\s*-\s*(.+?)\s+(\w{2})\s*CEP:\s*(\d{5}-?\d{3})/);
            if (format4Match) {
                const [, rua, numero, cidadeBairro, ufExtraida, cep] = format4Match;
                const parts = [rua.trim(), numero, cidadeBairro.trim(), ufExtraida.trim()].filter(p => p);
                return parts.join(', ');
            }
            
            // Formato 5: "Avenida X, 1904\nConjuntos Y, Bairro — Cidade, SP, CEP XX"
            const format5Match = endereco.match(/^(.+?),\s*(\d+)\s*(.+?)—\s*(.+?),\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (format5Match) {
                const [, rua, numero, complemento, cidadeBairro, ufExtraida, cep] = format5Match;
                const parts = [rua.trim(), numero, complemento.replace('\n', ' ').trim(), cidadeBairro.trim(), ufExtraida.trim()].filter(p => p);
                return parts.join(', ');
            }
            
            // Formato 6: "Av. das X, 234 – Bairro, Cidade – SP, CEP XXXXX"
            const format6Match = endereco.match(/^(.+?),\s*(\d+)\s*[–-]\s*(.+?),\s*(.+?)\s*[–-]\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (format6Match) {
                const [, rua, numero, bairro, cidadeExtraida, ufExtraida, cep] = format6Match;
                const parts = [rua.trim(), numero, bairro.trim(), cidadeExtraida.trim(), ufExtraida.trim()].filter(p => p);
                return parts.join(', ');
            }
            
            // Fallback: tentar limpar e adicionar São José dos Campos se não tiver
            let enderecoLimpo = endereco.replace(/\s*CEP:\s*\d{5}-?\d{3}/, '').trim();
            
            if (!enderecoLimpo.toLowerCase().includes('são josé dos campos') && 
                !enderecoLimpo.toLowerCase().includes('sao jose dos campos')) {
                enderecoLimpo += ', São José dos Campos, SP';
            }
            
            return enderecoLimpo;
            
        } catch (error) {
            console.error('❌ Erro ao normalizar endereço:', error);
            return endereco + ', São José dos Campos, SP';
        }
    }
    
    // Geocodificar endereço com controle inteligente
    async function geocodeAddress(address, forceRefresh = false) {
        const normalizedAddress = normalizeAddress(address);
        
        // Verificar cache apenas se não for refresh forçado
        if (!forceRefresh && geocodingCache.has(normalizedAddress)) {
            const cached = geocodingCache.get(normalizedAddress);
            geocodingStats.cached++;
            console.log(`📍 Usando coordenadas em cache para: ${normalizedAddress}`);
            return cached;
        }
        
        try {
            console.log(`🔍 Geocodificando: ${normalizedAddress}`);
            
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedAddress)}&limit=1&countrycodes=br`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PMG-Agenda-App/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    display_name: data[0].display_name
                };
                
                if (!isNaN(result.lat) && !isNaN(result.lng)) {
                    geocodingCache.set(normalizedAddress, result);
                    geocodingStats.success++;
                    console.log(`✅ Coordenadas encontradas: ${result.lat}, ${result.lng}`);
                    return result;
                }
            }
            
            geocodingStats.errors++;
            console.log(`❌ Nenhuma coordenada encontrada para: ${normalizedAddress}`);
            return null;
            
        } catch (error) {
            geocodingStats.errors++;
            console.error(`❌ Erro na geocodificação de "${normalizedAddress}":`, error);
            return null;
        }
    }
    
    // Geocodificar coordenadas para endereço (reverse geocoding)
    async function reverseGeocode(lat, lng) {
        try {
            console.log(`🔍 Fazendo reverse geocoding para: ${lat}, ${lng}`);
            
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=br`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PMG-Agenda-App/1.0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
                console.log(`✅ Endereço encontrado: ${data.display_name}`);
                return {
                    endereco: data.display_name,
                    cidade: data.address?.city || data.address?.town || data.address?.village || '',
                    uf: data.address?.state || 'SP',
                    cep: data.address?.postcode || '',
                    bairro: data.address?.suburb || data.address?.neighbourhood || ''
                };
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Erro no reverse geocoding:`, error);
            return null;
        }
    }
    
    // Atualizar estatísticas na interface
    function updateStats() {
        const statsContainer = document.getElementById('map-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';
            
            document.getElementById('stat-success').textContent = geocodingStats.success;
            document.getElementById('stat-errors').textContent = geocodingStats.errors;
            document.getElementById('stat-cached').textContent = geocodingStats.cached;
            document.getElementById('stat-total').textContent = geocodingStats.total;
        }
    }
    
    // Resetar estatísticas
    function resetStats() {
        geocodingStats = {
            total: 0,
            success: 0,
            errors: 0,
            cached: 0
        };
        updateStats();
    }
    
    // Criar popup para cliente
    function createClientPopup(client, origem) {
        const nomeFantasia = client['Nome Fantasia'] || client['Cliente'] || 'Cliente';
        const contato = client['Contato'] || 'N/A';
        const telefone = client['Celular'] || client['Telefone Comercial'] || 'N/A';
        const segmento = client['Segmento'] || 'N/A';
        
        let cidade = client['Cidade'] || '';
        if (!cidade && client['Endereço']) {
            if (client['Endereço'].includes('\n')) {
                const linhas = client['Endereço'].split('\n');
                cidade = linhas[2] || '';
            } else {
                const match = client['Endereço'].match(/(.*?)\s*-\s*(.*?)\s*-\s*(\w{2})/);
                if (match) cidade = match[2].trim();
            }
        }
        
        let statusIcon = '🔴';
        let statusColor = '#dc3545';
        
        switch (origem) {
            case 'ativos':
                statusIcon = '🟢';
                statusColor = '#28a745';
                break;
            case 'novos':
                statusIcon = '🆕';
                statusColor = '#17a2b8';
                break;
        }
        
        return `
            <div style="min-width: 250px; font-family: Arial, sans-serif;">
                <div style="background: ${statusColor}; color: white; padding: 10px; margin: -10px -10px 10px -10px; border-radius: 5px 5px 0 0;">
                    <strong>${statusIcon} ${nomeFantasia}</strong>
                </div>
                <p><strong>Contato:</strong> ${contato}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
                <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
                <p><strong>Segmento:</strong> ${segmento}</p>
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="window.clientManager && window.clientManager.openModal && window.clientManager.openModal(window.currentMarkers.find(m => m.id === '${client.id}')?.client || ${JSON.stringify(client).replace(/"/g, '&quot;')}, '${origem}')" 
                            style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        📄 Ver Detalhes
                    </button>
                </div>
            </div>
        `;
    }
    
    // Adicionar marcadores ao mapa (apenas para novos dados ou endereços editados)
    async function addMarkersToMap(clients, origem = 'inativos', forceRefresh = false) {
        if (!map || !markersLayer) {
            console.error('❌ Mapa não está inicializado');
            return;
        }
        
        if (!Array.isArray(clients) || clients.length === 0) {
            console.log(`ℹ️ Nenhum cliente ${origem} para adicionar ao mapa`);
            return;
        }
        
        console.log(`📍 Adicionando ${clients.length} marcadores de clientes ${origem}...`);
        
        geocodingStats.total += clients.length;
        
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            
            try {
                const endereco = client['Endereço'];
                if (!endereco) {
                    console.log(`⚠️ Cliente ${client['Nome Fantasia']} sem endereço`);
                    geocodingStats.errors++;
                    continue;
                }
                
                // Delay para evitar rate limiting apenas se não estiver em cache
                const normalizedAddress = normalizeAddress(endereco);
                if (!geocodingCache.has(normalizedAddress) && i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                const coords = await geocodeAddress(endereco, forceRefresh);
                
                if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
                    let markerColor = 'red';
                    switch (origem) {
                        case 'ativos':
                            markerColor = 'green';
                            break;
                        case 'novos':
                            markerColor = 'blue';
                            break;
                        default:
                            markerColor = 'red';
                    }
                    
                    const marker = L.circleMarker([coords.lat, coords.lng], {
                        radius: 8,
                        fillColor: markerColor,
                        color: 'white',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                    
                    const popupContent = createClientPopup(client, origem);
                    marker.bindPopup(popupContent);
                    marker.addTo(markersLayer);
                    
                    currentMarkers.push({
                        id: client.id,
                        marker: marker,
                        client: client,
                        origem: origem
                    });
                    
                    console.log(`✅ Marcador adicionado para: ${client['Nome Fantasia']}`);
                } else {
                    console.log(`❌ Não foi possível geocodificar: ${client['Nome Fantasia']}`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar cliente ${client['Nome Fantasia']}:`, error);
                geocodingStats.errors++;
            }
        }
        
        // Atualizar estatísticas
        updateStats();
        
        // Ajustar zoom para mostrar todos os marcadores
        if (currentMarkers.length > 0) {
            try {
                const group = new L.featureGroup(currentMarkers.map(m => m.marker));
                map.fitBounds(group.getBounds().pad(0.1));
            } catch (error) {
                console.error('❌ Erro ao ajustar zoom:', error);
            }
        }
        
        console.log(`📊 Geocodificação concluída: ${geocodingStats.success} sucessos, ${geocodingStats.errors} falhas, ${geocodingStats.cached} cache`);
    }
    
    // Limpar marcadores dos clientes
    function clearMarkers() {
        if (markersLayer) {
            markersLayer.clearLayers();
        }
        currentMarkers = [];
        console.log('🧹 Marcadores de clientes limpos');
    }
    
    // Limpar cache de geocodificação
    function clearGeocodingCache() {
        geocodingCache.clear();
        resetStats();
        console.log('🧹 Cache de geocodificação e estatísticas limpos');
    }
    
    // Atualizar mapa com novos dados
    async function updateMap(forceRefresh = false) {
        if (!map || !isMapInitialized) {
            console.log('⏳ Mapa não inicializado, pulando atualização');
            return;
        }
        
        try {
            console.log('🔄 Atualizando mapa...', forceRefresh ? '(refresh forçado)' : '');
            
            // Resetar estatísticas se for refresh forçado
            if (forceRefresh) {
                resetStats();
            }
            
            clearMarkers();
            
            if (!window.clientManager) {
                console.log('⏳ ClientManager não disponível ainda');
                return;
            }
            
            const promises = [];
            
            if (window.clientManager.data && window.clientManager.data.length > 0) {
                promises.push(addMarkersToMap(window.clientManager.data, 'inativos', forceRefresh));
            }
            
            if (window.clientManager.ativos && window.clientManager.ativos.length > 0) {
                promises.push(addMarkersToMap(window.clientManager.ativos, 'ativos', forceRefresh));
            }
            
            if (window.clientManager.novos && window.clientManager.novos.length > 0) {
                promises.push(addMarkersToMap(window.clientManager.novos, 'novos', forceRefresh));
            }
            
            await Promise.all(promises);
            
            console.log('✅ Mapa atualizado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar mapa:', error);
        }
    }
    
    // Inicializar mapa
    async function initializeMap() {
        try {
            console.log('🗺️ Inicializando mapa...');
            
            if (isMapInitialized) {
                console.log('ℹ️ Mapa já inicializado, atualizando localização do usuário...');
                setTimeout(updateUserLocation, 500);
                return;
            }
            
            await waitForLeaflet();
            await setupBaseMap();
            
            isMapInitialized = true;
            
            const sessionLocation = loadUserLocationFromSession();
            if (sessionLocation) {
                userLocation = sessionLocation;
                addUserLocationMarker(userLocation);
            }
            
            updateUserLocation();
            await updateMap();
            
            console.log('✅ Mapa inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro crítico na inicialização do mapa:', error);
            showMapError('Falha na inicialização: ' + error.message);
            isMapInitialized = false;
        }
    }
    
    // Tentar inicialização novamente
    async function retryInitialization() {
        console.log('🔄 Tentando inicializar mapa novamente...');
        isMapInitialized = false;
        map = null;
        markersLayer = null;
        userLocationMarker = null;
        currentMarkers = [];
        
        await initializeMap();
    }
    
    // Expor API global
    window.mapManager = {
        initializeMap,
        updateMap,
        clearMarkers,
        clearGeocodingCache,
        retryInitialization,
        updateUserLocation,
        centerOnUser,
        getUserLocation: () => userLocation,
        reverseGeocode,
        isReady: () => isMapInitialized,
        getStats: () => geocodingStats
    };
    
    // Salvar referência dos marcadores para acesso nos popups
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'currentMarkers', {
            get: () => currentMarkers
        });
    }
    
    console.log('✅ map.js carregado - versão com estatísticas e geocodificação inteligente');
    
})();
