// map.js - Sistema de mapa com precisão otimizada e cache inteligente

let map;
let markersLayer;
let isEditMode = false;
let currentMarkers = [];
let markersCache = new Map();
let lastDataHash = '';
let geocodingQueue = [];
let isProcessingQueue = false;

// Configurações de precisão para São José dos Campos
const SJC_CONFIG = {
    center: [-23.1794, -45.8869],
    bounds: [
        [-23.2800, -46.0500], // SW
        [-23.0500, -45.7500]  // NE
    ],
    defaultZoom: 12,
    maxZoom: 18,
    minZoom: 10
};

// Inicializar mapa com configurações otimizadas
function initMap() {
    try {
        console.log('🗺️ Inicializando mapa com precisão aprimorada...');
        
        if (map) {
            console.log('⚠️ Mapa já inicializado, apenas atualizando marcadores');
            loadMarkersFromCache();
            return;
        }

        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Container do mapa não encontrado');
            return;
        }

        updateMapStatus('Inicializando mapa...');

        // Configurar mapa centrado em São José dos Campos
        map = L.map('map', {
            center: SJC_CONFIG.center,
            zoom: SJC_CONFIG.defaultZoom,
            maxZoom: SJC_CONFIG.maxZoom,
            minZoom: SJC_CONFIG.minZoom,
            maxBounds: SJC_CONFIG.bounds,
            maxBoundsViscosity: 0.5
        });

        // Múltiplas camadas de tiles com fallback
        const tileProviders = [
            {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: SJC_CONFIG.maxZoom
                }
            },
            {
                url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
                options: {
                    attribution: '© OpenStreetMap contributors'
                }
            }
        ];

        let currentProviderIndex = 0;
        
        function loadTileLayer(index = 0) {
            if (index >= tileProviders.length) {
                console.error('❌ Todos os provedores de tiles falharam');
                return;
            }

            const provider = tileProviders[index];
            const tileLayer = L.tileLayer(provider.url, provider.options);
            
            tileLayer.on('tileerror', () => {
                console.warn(`⚠️ Erro no provedor ${index}, tentando próximo...`);
                map.removeLayer(tileLayer);
                loadTileLayer(index + 1);
            });

            tileLayer.on('tileload', () => {
                if (currentProviderIndex !== index) {
                    console.log(`✅ Tiles carregados com provedor ${index}`);
                    currentProviderIndex = index;
                }
            });

            tileLayer.addTo(map);
        }

        loadTileLayer();

        // Camada para marcadores
        markersLayer = L.layerGroup().addTo(map);

        // Event listeners
        setupMapEventListeners();

        // Carregar cache de marcadores
        loadMarkersCache();

        // Verificar se deve atualizar marcadores
        setTimeout(() => {
            checkAndUpdateMarkers();
            updateMapStatus('Mapa pronto');
        }, 1000);

        console.log('✅ Mapa inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        updateMapStatus('Erro ao carregar mapa');
    }
}

// Configurar event listeners do mapa
function setupMapEventListeners() {
    const editModeBtn = document.getElementById('edit-mode-btn');
    const reloadMapBtn = document.getElementById('reload-map-btn');
    const includeInativosCheckbox = document.getElementById('include-inativos-checkbox');
    const includeNovosCheckbox = document.getElementById('include-novos-checkbox');

    if (editModeBtn) {
        editModeBtn.addEventListener('click', toggleEditMode);
    }

    if (reloadMapBtn) {
        reloadMapBtn.addEventListener('click', () => {
            forceUpdateMarkers();
        });
    }

    if (includeInativosCheckbox) {
        includeInativosCheckbox.addEventListener('change', checkAndUpdateMarkers);
    }

    if (includeNovosCheckbox) {
        includeNovosCheckbox.addEventListener('change', checkAndUpdateMarkers);
    }
}

// Sistema de cache melhorado
function loadMarkersCache() {
    try {
        const cached = localStorage.getItem('markers_cache_v2'); // Nova versão
        if (cached) {
            const parsedCache = JSON.parse(cached);
            markersCache = new Map(parsedCache);
            console.log(`📋 Cache de marcadores carregado: ${markersCache.size} marcadores`);
            
            // Limpar entradas inválidas
            cleanInvalidCacheEntries();
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar cache de marcadores:', error);
        markersCache = new Map();
    }
}

function saveMarkersCache() {
    try {
        const cacheArray = Array.from(markersCache.entries());
        localStorage.setItem('markers_cache_v2', JSON.stringify(cacheArray));
        console.log(`💾 Cache de marcadores salvo: ${markersCache.size} marcadores`);
    } catch (error) {
        console.warn('⚠️ Erro ao salvar cache de marcadores:', error);
    }
}

// Limpar entradas inválidas do cache
function cleanInvalidCacheEntries() {
    let cleaned = 0;
    const validEntries = new Map();
    
    markersCache.forEach((markerData, clientId) => {
        if (isValidCacheEntry(markerData)) {
            validEntries.set(clientId, markerData);
        } else {
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        markersCache = validEntries;
        console.log(`🧹 ${cleaned} entradas inválidas removidas do cache`);
        saveMarkersCache();
    }
}

function isValidCacheEntry(markerData) {
    return markerData && 
           markerData.client && 
           typeof markerData.lat === 'number' && 
           typeof markerData.lng === 'number' &&
           isValidSJCCoordinate(markerData.lat, markerData.lng) &&
           markerData.timestamp && 
           (Date.now() - markerData.timestamp) < (7 * 24 * 60 * 60 * 1000); // 7 dias
}

// Validação aprimorada de coordenadas para SJC
function isValidSJCCoordinate(lat, lng) {
    return lat >= -23.2800 && lat <= -23.0500 && 
           lng >= -46.0500 && lng <= -45.7500;
}

// Gerar hash dos dados com mais precisão
function generateDataHash() {
    if (!window.clientManager) return '';
    
    const data = {
        inativos: window.clientManager.data.length,
        ativos: window.clientManager.ativos.length,
        novos: window.clientManager.novos.length,
        includeInativos: document.getElementById('include-inativos-checkbox')?.checked || false,
        includeNovos: document.getElementById('include-novos-checkbox')?.checked || false,
        timestamp: Math.floor(Date.now() / 300000) // 5 minutos de granularidade
    };
    
    return btoa(JSON.stringify(data));
}

// Verificar atualizações necessárias
function checkAndUpdateMarkers() {
    const currentHash = generateDataHash();
    if (currentHash !== lastDataHash) {
        console.log('📊 Dados alterados, atualizando marcadores...');
        lastDataHash = currentHash;
        updateMapMarkers();
    } else {
        console.log('📋 Dados inalterados, carregando do cache...');
        loadMarkersFromCache();
    }
}

function forceUpdateMarkers() {
    console.log('🔄 Forçando atualização de marcadores...');
    markersCache.clear();
    lastDataHash = '';
    updateMapMarkers();
}

// Carregar marcadores do cache com melhor filtragem
function loadMarkersFromCache() {
    if (!map || !markersLayer) return;

    const includeInativos = document.getElementById('include-inativos-checkbox')?.checked || false;
    const includeNovos = document.getElementById('include-novos-checkbox')?.checked || false;

    markersLayer.clearLayers();
    currentMarkers = [];
    
    let loaded = 0;
    let skipped = 0;

    markersCache.forEach((markerData, clientId) => {
        const client = markerData.client;
        
        // Filtros aprimorados
        if (client.source === 'inativos' && !includeInativos) {
            skipped++;
            return;
        }
        if (client.source === 'novos' && !includeNovos) {
            skipped++;
            return;
        }

        // Validar coordenadas antes de criar marcador
        if (!isValidSJCCoordinate(markerData.lat, markerData.lng)) {
            console.warn(`⚠️ Coordenadas inválidas para ${client['Nome Fantasia']}: ${markerData.lat}, ${markerData.lng}`);
            return;
        }

        const marker = createClientMarker(client, markerData.lat, markerData.lng);
        if (marker) {
            markersLayer.addLayer(marker);
            currentMarkers.push({ client, marker });
            loaded++;
        }
    });

    updateMapStatus(`${loaded} marcadores carregados (${skipped} filtrados)`);
    console.log(`📋 ${loaded} marcadores carregados, ${skipped} filtrados`);
}

// Atualizar status do mapa
function updateMapStatus(message) {
    const statusDiv = document.getElementById('map-status');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    if (message.includes('carregados') || message.includes('pronto')) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Sistema de processamento em fila para geocodificação
async function updateMapMarkers() {
    if (!map || !markersLayer) {
        console.warn('⚠️ Mapa não inicializado');
        return;
    }

    try {
        updateMapStatus('Processando endereços...');
        
        markersLayer.clearLayers();
        currentMarkers = [];

        const includeInativos = document.getElementById('include-inativos-checkbox')?.checked || false;
        const includeNovos = document.getElementById('include-novos-checkbox')?.checked || false;

        let clientsToMap = [];

        if (window.clientManager) {
            if (window.clientManager.ativos) {
                clientsToMap.push(...window.clientManager.ativos.map(c => ({...c, source: 'ativos'})));
            }
            
            if (includeInativos && window.clientManager.data) {
                clientsToMap.push(...window.clientManager.data.map(c => ({...c, source: 'inativos'})));
            }
            
            if (includeNovos && window.clientManager.novos) {
                clientsToMap.push(...window.clientManager.novos.map(c => ({...c, source: 'novos'})));
            }
        }

        if (clientsToMap.length === 0) {
            updateMapStatus('Nenhum cliente para mapear');
            return;
        }

        console.log(`🗺️ Processando ${clientsToMap.length} clientes para o mapa`);

        // Processar em lotes menores com prioridade
        const results = await processClientsInBatches(clientsToMap);
        
        saveMarkersCache();
        
        const message = `${results.success} marcadores processados (${results.cached} do cache, ${results.geocoded} geocodificados)`;
        updateMapStatus(message);
        console.log(`✅ ${message}`);

    } catch (error) {
        console.error('❌ Erro ao atualizar marcadores:', error);
        updateMapStatus('Erro ao processar marcadores');
    }
}

// Processamento em lotes com prioridade
async function processClientsInBatches(clientsToMap) {
    const batchSize = 2; // Reduzido para evitar rate limiting
    const results = { success: 0, cached: 0, geocoded: 0, failed: 0 };
    
    // Ordenar por prioridade (ativos primeiro, depois cache hits)
    clientsToMap.sort((a, b) => {
        const aHasCache = markersCache.has(a.id);
        const bHasCache = markersCache.has(b.id);
        
        if (aHasCache && !bHasCache) return -1;
        if (!aHasCache && bHasCache) return 1;
        
        const priorityOrder = { 'ativos': 0, 'novos': 1, 'inativos': 2 };
        return priorityOrder[a.source] - priorityOrder[b.source];
    });

    for (let i = 0; i < clientsToMap.length; i += batchSize) {
        const batch = clientsToMap.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (client) => {
            try {
                const result = await processClientForMap(client);
                if (result.success) {
                    results.success++;
                    if (result.fromCache) results.cached++;
                    else results.geocoded++;
                } else {
                    results.failed++;
                }
                return result;
            } catch (error) {
                console.error(`❌ Erro ao processar ${client['Nome Fantasia']}:`, error);
                results.failed++;
                return { success: false };
            }
        });

        await Promise.allSettled(batchPromises);
        
        // Atualizar status do progresso
        const processed = Math.min(i + batchSize, clientsToMap.length);
        updateMapStatus(`Processando... ${processed}/${clientsToMap.length} (${results.success} ok)`);
        
        // Pausa entre lotes para evitar sobrecarga
        if (i + batchSize < clientsToMap.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    return results;
}

// Processamento individual melhorado
async function processClientForMap(client) {
    try {
        let lat, lng;
        let fromCache = false;
        let precision = 'unknown';
        let source = 'default';

        // 1. Verificar cache primeiro
        if (markersCache.has(client.id)) {
            const cached = markersCache.get(client.id);
            if (isValidCacheEntry(cached)) {
                lat = cached.lat;
                lng = cached.lng;
                fromCache = true;
                precision = cached.precision || 'cached';
                source = cached.source || 'cached';
            } else {
                markersCache.delete(client.id); // Remover entrada inválida
            }
        }

        // 2. Coordenadas customizadas (editadas manualmente)
        if (!fromCache && client.customLat && client.customLng) {
            lat = parseFloat(client.customLat);
            lng = parseFloat(client.customLng);
            if (isValidSJCCoordinate(lat, lng)) {
                source = 'manual';
                precision = 'exact';
            }
        }

        // 3. Coordenadas já geocodificadas válidas
        if (!fromCache && !lat && client.lat && client.lng) {
            const testLat = parseFloat(client.lat);
            const testLng = parseFloat(client.lng);
            if (isValidSJCCoordinate(testLat, testLng)) {
                lat = testLat;
                lng = testLng;
                source = client.geocodeSource || 'existing';
                precision = client.geocodePrecision || 'approximate';
            }
        }

        // 4. Geocodificar novo endereço
        if (!lat || !lng) {
            const rawAddress = buildRawAddress(client);
            if (rawAddress && window.MapPrecision) {
                const geocodeResult = await window.MapPrecision.geocodeAddress(rawAddress);
                if (geocodeResult && isValidSJCCoordinate(geocodeResult.lat, geocodeResult.lng)) {
                    lat = geocodeResult.lat;
                    lng = geocodeResult.lng;
                    precision = geocodeResult.precision;
                    source = geocodeResult.source;
                    
                    // Salvar no cliente para próximas consultas
                    client.lat = lat;
                    client.lng = lng;
                    client.geocodePrecision = precision;
                    client.geocodeSource = source;
                }
            }
        }

        // 5. Fallback para posição padrão com dispersão inteligente
        if (!lat || !lng || !isValidSJCCoordinate(lat, lng)) {
            const offset = getSmartOffset(client);
            lat = SJC_CONFIG.center[0] + offset.lat;
            lng = SJC_CONFIG.center[1] + offset.lng;
            source = 'fallback';
            precision = 'city';
        }

        // Criar marcador
        const marker = createClientMarker(client, lat, lng, precision, source);
        if (marker) {
            markersLayer.addLayer(marker);
            currentMarkers.push({ client, marker });

            // Salvar no cache se não veio do cache
            if (!fromCache) {
                markersCache.set(client.id, {
                    client: client,
                    lat: lat,
                    lng: lng,
                    precision: precision,
                    source: source,
                    timestamp: Date.now()
                });
            }
        }

        return { success: true, fromCache };
    } catch (error) {
        console.error(`❌ Erro ao processar cliente ${client['Nome Fantasia']}:`, error);
        return { success: false, fromCache: false };
    }
}

// Dispersão inteligente para fallback
function getSmartOffset(client) {
    // Usar hash do nome para posicionamento consistente
    const hash = hashString(client['Nome Fantasia'] || client.id || '');
    const radius = 0.03; // Raio maior para melhor dispersão
    
    const angle = (hash % 360) * (Math.PI / 180);
    const distance = (hash % 100) / 100 * radius;
    
    return {
        lat: Math.cos(angle) * distance,
        lng: Math.sin(angle) * distance
    };
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Construir endereço melhorado
function buildRawAddress(client) {
    if (client['EnderecoCompleto']) {
        return client['EnderecoCompleto'];
    }

    const parts = [];
    
    // Endereço principal
    const endereco = client['Endereco'] || client['Endereço'];
    if (endereco) {
        let enderecoCompleto = endereco;
        if (client['Numero']) {
            enderecoCompleto += `, ${client['Numero']}`;
        }
        parts.push(enderecoCompleto);
    }

    // Bairro
    if (client['Bairro']) {
        parts.push(client['Bairro']);
    }

    // Cidade (sempre São José dos Campos para este projeto)
    const cidade = client['Cidade'] || 'São José dos Campos';
    parts.push(cidade);

    // UF
    const uf = client['UF'] || 'SP';
    parts.push(uf);

    // CEP
    if (client['CEP']) {
        parts.push(client['CEP']);
    }

    return parts.length > 0 ? parts.join(', ') : null;
}

// Criar marcador com informações aprimoradas
function createClientMarker(client, lat, lng, precision = 'unknown', source = 'unknown') {
    try {
        const nomeFantasia = client['Nome Fantasia'] || 'Cliente';
        const endereco = buildRawAddress(client);
        const contato = client['Contato'] || 'N/A';
        const celular = client['Celular'] || 'N/A';

        // Definir cor e ícone baseado na fonte e precisão
        let cor = '#6c757d';
        let emoji = '💤';
        
        if (client.source === 'ativos') {
            cor = '#28a745';
            emoji = '✅';
        } else if (client.source === 'novos') {
            cor = '#6f42c1';
            emoji = '🆕';
        }

        // Indicador de precisão aprimorado
        let precisionIcon = '';
        let precisionText = '';
        
        switch(precision) {
            case 'exact':
                precisionIcon = '🎯';
                precisionText = 'Exato';
                break;
            case 'street':
                precisionIcon = '🛣️';
                precisionText = 'Rua';
                break;
            case 'approximate':
                precisionIcon = '📍';
                precisionText = 'Aproximado';
                break;
            case 'city':
                precisionIcon = '🏙️';
                precisionText = 'Cidade';
                break;
            default:
                precisionIcon = '❓';
                precisionText = 'Desconhecido';
        }

        // Ícone customizado melhorado
        const customIcon = L.divIcon({
            html: `<div style="background: ${cor}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });

        const marker = L.marker([lat, lng], { 
            icon: customIcon,
            draggable: isEditMode
        });

        // Popup aprimorado
        const popupContent = `
            <div style="min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: ${cor}; font-size: 16px; font-weight: 600;">
                    ${emoji} ${nomeFantasia}
                </h3>
                
                <div style="margin-bottom: 8px;">
                    <strong>📍 Endereço:</strong><br>
                    <span style="color: #666; font-size: 14px;">${endereco || 'N/A'}</span>
                </div>
                
                <div style="margin-bottom: 8px;">
                    <strong>👤 Contato:</strong> ${contato}<br>
                    <strong>📞 Celular:</strong> ${celular}
                </div>
                
                <div style="margin-bottom: 8px; padding: 6px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                    <strong>🎯 Precisão:</strong> ${precisionIcon} ${precisionText}<br>
                    <strong>🔍 Fonte:</strong> ${source}<br>
                    <strong>📊 Coordenadas:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
                </div>
                
                <div style="text-align: center; margin-top: 10px;">
                    <button onclick="openWhatsApp('${celular}')" style="background: #25d366; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; margin-right: 5px; cursor: pointer;">
                        💬 WhatsApp
                    </button>
                    <button onclick="openMapsRoute('${lat}', '${lng}')" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        🗺️ Rota
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        return marker;
    } catch (error) {
        console.error(`❌ Erro ao criar marcador para ${client['Nome Fantasia']}:`, error);
        return null;
    }
}

// Toggle modo edição
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('edit-mode-btn');
    
    if (editBtn) {
        editBtn.textContent = isEditMode ? '💾 Salvar Posições' : '✏️ Editar Posições';
        editBtn.classList.toggle('active', isEditMode);
    }

    // Atualizar marcadores para modo edição
    currentMarkers.forEach(markerInfo => {
        if (markerInfo.marker) {
            if (isEditMode) {
                markerInfo.marker.dragging.enable();
                markerInfo.marker.on('dragend', (e) => {
                    handleMarkerDragEnd(e, markerInfo.client);
                });
            } else {
                markerInfo.marker.dragging.disable();
                markerInfo.marker.off('dragend');
            }
        }
    });

    updateMapStatus(isEditMode ? 'Modo edição: arraste os marcadores' : 'Modo visualização');
}

// Handle drag end aprimorado
async function handleMarkerDragEnd(event, client) {
    const newPosition = event.target.getLatLng();
    
    // Validar se a nova posição está dentro dos bounds de SJC
    if (!isValidSJCCoordinate(newPosition.lat, newPosition.lng)) {
        alert('Esta posição está fora dos limites de São José dos Campos!');
        event.target.setLatLng([client.lat || SJC_CONFIG.center[0], client.lng || SJC_CONFIG.center[1]]);
        return;
    }
    
    if (confirm(`Atualizar posição de ${client['Nome Fantasia']}?\n\nNova localização: ${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`)) {
        try {
            // Salvar nova posição no cliente
            client.customLat = newPosition.lat;
            client.customLng = newPosition.lng;
            client.geocodePrecision = 'exact';
            client.geocodeSource = 'manual';

            // Atualizar no banco se disponível
            if (window.clientManager && typeof window.clientManager.editarCliente === 'function') {
                await window.clientManager.editarCliente(client.id, {
                    customLat: newPosition.lat,
                    customLng: newPosition.lng,
                    geocodePrecision: 'exact',
                    geocodeSource: 'manual'
                });
            }

            // Atualizar cache
            markersCache.set(client.id, {
                client: client,
                lat: newPosition.lat,
                lng: newPosition.lng,
                precision: 'exact',
                source: 'manual',
                timestamp: Date.now()
            });
            
            saveMarkersCache();
            updateMapStatus(`Posição de ${client['Nome Fantasia']} atualizada com precisão`);
            
            console.log(`✅ Posição atualizada: ${client['Nome Fantasia']} -> ${newPosition.lat}, ${newPosition.lng}`);
        } catch (error) {
            console.error('❌ Erro ao salvar posição:', error);
            updateMapStatus('Erro ao salvar posição');
            // Reverter posição
            event.target.setLatLng([client.lat || SJC_CONFIG.center[0], client.lng || SJC_CONFIG.center[1]]);
        }
    } else {
        // Reverter posição
        event.target.setLatLng([client.lat || SJC_CONFIG.center[0], client.lng || SJC_CONFIG.center[1]]);
    }
}

// Funções auxiliares para botões do popup
window.openWhatsApp = function(celular) {
    if (celular && celular !== 'N/A') {
        const numeroLimpo = celular.replace(/\D/g, '');
        if (numeroLimpo.length >= 10) {
            window.open(`https://wa.me/55${numeroLimpo}`, '_blank');
        } else {
            alert('Número de WhatsApp inválido');
        }
    } else {
        alert('Número de WhatsApp não disponível');
    }
};

window.openMapsRoute = function(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
};

console.log('✅ map.js carregado com precisão aprimorada para São José dos Campos');
