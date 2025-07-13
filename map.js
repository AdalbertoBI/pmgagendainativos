// map.js

// Variáveis do mapa
let map = null;
let markers = [];
let addressCache = JSON.parse(localStorage.getItem('addressCache')) || {};
let manualCorrections = JSON.parse(localStorage.getItem('manualCorrections')) || {};
let mapDataCache = JSON.parse(localStorage.getItem('mapDataCache')) || null;
let mapDataCacheValid = mapDataCache !== null;
const GRAPHHOPPER_API_KEY = '55b67cde-e051-409d-9440-171f4d6f52e0';
let editingMarker = null;
let editingClient = null;
const MAX_GEOCODE_PER_BATCH = 100; // Limite de geocodificações por lote
const GEOCODE_DELAY = 200; // Delay entre chamadas de geocodificação (ms)
const DAILY_LIMIT = 1000; // Limite diário de requisições (ajuste conforme a API)
let pendingGeocodes = JSON.parse(localStorage.getItem('pendingGeocodes')) || [];
let geocodeCountToday = parseInt(localStorage.getItem('geocodeCountToday')) || 0;
let lastGeocodeDate = localStorage.getItem('lastGeocodeDate') || null;

// Base de dados de CEP para validação
const CEP_DATABASE = {
    'SAO_JOSE_DOS_CAMPOS': [
        { min: 12200000, max: 12249999, coords: { lat: -23.2237, lng: -45.9009 } },
        { min: 12220000, max: 12239999, coords: { lat: -23.2237, lng: -45.9009 } }
    ],
    'BUQUIRINHA_SJC': [
        { min: 12213730, max: 12213843, coords: { lat: -23.2100, lng: -45.8800 } }
    ]
};

// Coordenadas de referência por cidade/estado
const LOCATION_COORDS = {
    'SAO JOSE DOS CAMPOS': { lat: -23.2237, lng: -45.9009, state: 'SP' },
    'BUQUIRINHA': { lat: -23.2100, lng: -45.8800, state: 'SP' },
    'SAO PAULO': { lat: -23.5505, lng: -46.6333, state: 'SP' },
    'TRES LAGOAS': { lat: -20.7519, lng: -51.6782, state: 'MS' }
};

// Bounding box para São Paulo (estado)
const SAO_PAULO_BBOX = '-50.0,-25.0,-44.0,-19.5';

function initMap() {
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    addCustomControls();
    updateMapStatus('Mapa carregado');
    checkPendingGeocodes(); // Verifica pendências ao inicializar
}

function addCustomControls() {
    const editControl = L.control({ position: 'topleft' });
    editControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.innerHTML = `
            <button id="edit-mode-btn" onclick="toggleEditMode()" style="background: white; border: none; padding: 8px; cursor: pointer;">
                ✏️ Editar Localizações
            </button>
        `;
        return div;
    };
    editControl.addTo(map);
}

function toggleEditMode() {
    const isEditMode = document.getElementById('edit-mode-btn').textContent.includes('Sair');
    
    if (isEditMode) {
        document.getElementById('edit-mode-btn').innerHTML = '✏️ Editar Localizações';
        document.getElementById('edit-mode-btn').style.background = 'white';
        markers.forEach(marker => {
            marker.dragging.disable();
            marker.setOpacity(1);
        });
        updateMapStatus('Modo edição desativado');
    } else {
        document.getElementById('edit-mode-btn').innerHTML = '❌ Sair da Edição';
        document.getElementById('edit-mode-btn').style.background = '#ffebee';
        markers.forEach(marker => {
            marker.dragging.enable();
            marker.setOpacity(0.8);
        });
        updateMapStatus('Modo edição ativado - Arraste os marcadores para corrigi-los');
    }
}

function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log(`📍 Status do mapa: ${message}`);
}

function clearMapDataCache() {
    console.log('🗑️ Cache do mapa limpo');
    mapDataCache = null;
    mapDataCacheValid = false;
    localStorage.removeItem('mapDataCache');
    localStorage.removeItem('addressCache');
    localStorage.removeItem('pendingGeocodes');
    localStorage.removeItem('geocodeCountToday');
    localStorage.removeItem('lastGeocodeDate');
    addressCache = {};
    pendingGeocodes = [];
    geocodeCountToday = 0;
    lastGeocodeDate = null;
}

function isCacheValid() {
    if (!mapDataCache || !window.data || !window.ativos || !window.filteredData) return false;
    
    const totalItems = (window.filteredData.length || 0) + (window.ativos.length || 0);
    if (mapDataCache.length !== totalItems) return false;
    
    const cacheIds = new Set(mapDataCache.map(item => item.client.id));
    const dataIds = new Set([...window.filteredData, ...window.ativos].map(item => item.id));
    if (cacheIds.size !== dataIds.size) return false;
    
    for (const id of cacheIds) {
        if (!dataIds.has(id)) return false;
    }
    
    return true;
}

// Verifica se há geocodificações pendentes e agenda para o próximo dia
function checkPendingGeocodes() {
    const today = new Date().toISOString().split('T')[0];
    if (lastGeocodeDate !== today && pendingGeocodes.length > 0) {
        console.log('📅 Processando geocodificações pendentes do dia anterior...');
        geocodeCountToday = 0;
        localStorage.setItem('geocodeCountToday', geocodeCountToday);
        localStorage.setItem('lastGeocodeDate', today);
        loadAndProcessMapData(true); // Processa pendências
    } else if (pendingGeocodes.length > 0) {
        updateMapStatus(`Aguardando próximo dia para processar ${pendingGeocodes.length} endereços pendentes`);
    }
}

async function loadMapData() {
    console.log('🔄 loadMapData chamada');
    
    const today = new Date().toISOString().split('T')[0];
    if (lastGeocodeDate !== today) {
        geocodeCountToday = 0;
        localStorage.setItem('geocodeCountToday', geocodeCountToday);
        localStorage.setItem('lastGeocodeDate', today);
    }
    
    if (mapDataCacheValid && mapDataCache && isCacheValid()) {
        console.log('📋 Usando dados do cache do mapa');
        await renderCachedMapData();
    } else {
        console.log('🔄 Carregando dados do mapa pela primeira vez ou cache inválido...');
        await loadAndProcessMapData();
    }
    
    // Agenda verificação diária para pendências
    setTimeout(checkPendingGeocodes, 24 * 60 * 60 * 1000); // Verifica a cada 24 horas
}

async function loadAndProcessMapData(processPending = false) {
    updateMapStatus('Processando dados do mapa...');
    
    if (!map) {
        console.warn('Mapa não inicializado');
        updateMapStatus('Erro: Mapa não inicializado');
        return;
    }
    
    clearMarkers();
    
    let allData = [];
    
    if (processPending && pendingGeocodes.length > 0) {
        allData = pendingGeocodes;
        pendingGeocodes = [];
        localStorage.setItem('pendingGeocodes', JSON.stringify(pendingGeocodes));
    } else {
        if (window.filteredData && Array.isArray(window.filteredData) && window.filteredData.length > 0) {
            const inativosWithType = window.filteredData.map(item => ({ ...item, isAtivo: false }));
            allData.push(...inativosWithType);
        }
        
        if (window.ativos && Array.isArray(window.ativos) && window.ativos.length > 0) {
            const ativosWithType = window.ativos.map(item => ({ ...item, isAtivo: true }));
            allData.push(...ativosWithType);
        }
    }
    
    if (allData.length === 0) {
        updateMapStatus('Nenhum dado encontrado para exibir no mapa');
        console.warn('❌ Nenhum dado disponível para o mapa');
        return;
    }
    
    updateMapStatus(`Geocodificando ${allData.length} endereços...`);
    
    const geocodedData = [];
    let processedCount = 0;
    
    for (let i = 0; i < allData.length; i += MAX_GEOCODE_PER_BATCH) {
        if (geocodeCountToday >= DAILY_LIMIT) {
            pendingGeocodes.push(...allData.slice(i));
            localStorage.setItem('pendingGeocodes', JSON.stringify(pendingGeocodes));
            updateMapStatus(`Limite diário atingido. ${pendingGeocodes.length} endereços serão processados amanhã.`);
            break;
        }
        
        const batch = allData.slice(i, i + MAX_GEOCODE_PER_BATCH);
        const batchPromises = batch.map(async (client) => {
            const address = getFullAddress(client);
            if (!address) return null;
            
            try {
                const coords = await geocodeAddressEnhanced(address);
                if (coords) {
                    geocodeCountToday++;
                    localStorage.setItem('geocodeCountToday', geocodeCountToday);
                    return { client, coords, address };
                }
            } catch (error) {
                if (error.message.includes('429')) { // Limite de requisições atingido
                    pendingGeocodes.push(client);
                    return null;
                }
                console.error(`❌ Erro ao geocodificar ${address}:`, error);
            }
            return null;
        });
        
        const batchResults = (await Promise.all(batchPromises)).filter(result => result !== null);
        geocodedData.push(...batchResults);
        processedCount += batch.length;
        updateMapStatus(`Processando: ${processedCount}/${allData.length}`);
        await new Promise(resolve => setTimeout(resolve, GEOCODE_DELAY));
    }
    
    mapDataCache = geocodedData;
    mapDataCacheValid = true;
    localStorage.setItem('mapDataCache', JSON.stringify(mapDataCache));
    console.log(`💾 ${geocodedData.length} endereços salvos no cache`);
    
    await renderMapData(geocodedData);
}

async function renderCachedMapData() {
    if (!mapDataCache || mapDataCache.length === 0) {
        await loadAndProcessMapData();
        return;
    }
    
    updateMapStatus('Carregando do cache...');
    clearMarkers();
    
    const filteredData = mapDataCache.filter(item => {
        if (item.client.isAtivo) return true;
        return window.filteredData.some(fd => fd.id === item.client.id);
    });
    
    await renderMapData(filteredData);
}

async function renderMapData(geocodedData) {
    if (!geocodedData || geocodedData.length === 0) {
        updateMapStatus('Nenhum endereço válido encontrado');
        return;
    }
    
    updateMapStatus('Adicionando marcadores ao mapa...');
    const bounds = L.latLngBounds();
    let validMarkers = 0;
    
    for (const data of geocodedData) {
        const { client, coords, address } = data;
        try {
            const marker = createEditableMarker(coords, client, client.isAtivo);
            const popupContent = createPopupContent(client, coords, address);
            marker.bindPopup(popupContent, { maxWidth: 300 });
            markers.push(marker);
            bounds.extend([coords.lat, coords.lng]);
            validMarkers++;
        } catch (error) {
            console.error('❌ Erro ao criar marcador:', error);
        }
    }
    
    if (validMarkers > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
        updateMapStatus(`${validMarkers} marcadores adicionados ao mapa`);
    } else {
        updateMapStatus('Nenhum marcador válido pôde ser criado');
    }
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function createPopupContent(client, coords, address) {
    const confidence = coords.confidence || 0;
    const provider = coords.provider || 'desconhecido';
    const validated = coords.validated ? '✅ Validado' : '❌ Não validado';
    
    return `
        <div style="max-width: 280px;">
            <h4>${client['Nome Fantasia'] || 'Sem Nome'}</h4>
            <p><strong>Endereço:</strong> ${address}</p>
            <p><strong>Status:</strong> ${client.isAtivo ? 'Ativo' : 'Inativo'}</p>
            <p><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p><strong>Precisão:</strong> ${(confidence * 100).toFixed(0)}%</p>
            <p><strong>Método:</strong> ${provider}</p>
            <p><strong>Validação:</strong> ${validated}</p>
            ${coords.manuallyEdited ? '<p style="color: #28a745;"><strong>🎯 Corrigido pelo usuário</strong></p>' : ''}
        </div>
    `;
}

function extractCEPFromAddress(address) {
    if (!address) return null;
    const patterns = [/\b(\d{5})-?(\d{3})\b/g, /\b(\d{8})\b/g];
    for (const pattern of patterns) {
        const matches = address.match(pattern);
        if (matches) {
            const cepStr = matches[0].replace(/\D/g, '');
            if (cepStr.length === 8) return parseInt(cepStr);
        }
    }
    return null;
}

function validateCEPLocation(cep, expectedState = 'SP') {
    if (!cep) return null;
    for (const [region, ranges] of Object.entries(CEP_DATABASE)) {
        for (const range of ranges) {
            if (cep >= range.min && cep <= range.max) {
                return { region, coords: range.coords, confidence: 0.95 };
            }
        }
    }
    if (expectedState === 'SP' && cep >= 1000000 && cep <= 19999999) {
        return { region: 'SAO_PAULO_STATE', coords: LOCATION_COORDS['SAO PAULO'], confidence: 0.6 };
    }
    return null;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function checkManualCorrection(address) {
    const cacheKey = `manual_${address}`;
    if (manualCorrections[cacheKey]) {
        const correction = manualCorrections[cacheKey];
        return {
            lat: correction.lat, lng: correction.lng, display_name: correction.display_name || address,
            confidence: 1.0, provider: 'manual_correction', validated: true, manuallyEdited: true,
            correctionDate: correction.date
        };
    }
    return null;
}

function saveManualCorrection(address, lat, lng, clientName) {
    const cacheKey = `manual_${address}`;
    manualCorrections[cacheKey] = {
        lat, lng, display_name: `${clientName} (corrigido manualmente)`,
        date: new Date().toISOString(), originalAddress: address, clientName
    };
    localStorage.setItem('manualCorrections', JSON.stringify(manualCorrections));
    
    const enhancedCacheKey = `enhanced_${address}`;
    addressCache[enhancedCacheKey] = {
        lat, lng, display_name: `${clientName} (corrigido manualmente)`,
        confidence: 1.0, provider: 'manual_correction', validated: true, manuallyEdited: true,
        correctionDate: new Date().toISOString()
    };
    localStorage.setItem('addressCache', JSON.stringify(addressCache));
}

function validateGeocodingResult(result, expectedAddress, expectedState = 'SP') {
    if (!result || !result.lat || !result.lng) return false;
    if (result.manuallyEdited) return true;
    const cep = extractCEPFromAddress(expectedAddress);
    if (cep) {
        const cepValidation = validateCEPLocation(cep, expectedState);
        if (cepValidation) {
            const distance = calculateDistance(result.lat, result.lng, cepValidation.coords.lat, cepValidation.coords.lng);
            const maxDistance = cepValidation.confidence > 0.9 ? 10 : 25;
            if (distance > maxDistance) return false;
        }
    }
    if (expectedState === 'SP') {
        const spCenter = LOCATION_COORDS['SAO PAULO'];
        const distanceFromSP = calculateDistance(result.lat, result.lng, spCenter.lat, spCenter.lng);
        if (distanceFromSP > 500) return false;
    }
    return true;
}

function generateSearchVariations(address, prioritizeCEP = true) {
    if (!address) return [];
    const variations = [];
    const cep = extractCEPFromAddress(address);
    if (prioritizeCEP && cep) {
        const cepFormatted = `${Math.floor(cep/1000).toString().padStart(5, '0')}-${(cep%1000).toString().padStart(3, '0')}`;
        variations.push(`${cepFormatted}, Brasil`);
        variations.push(`${cepFormatted}, São Paulo, Brasil`);
        variations.push(`${cepFormatted}, SP, Brasil`);
        const parts = address.split(',');
        if (parts.length >= 2) {
            const city = parts[parts.length - 2].trim();
            variations.push(`${cepFormatted}, ${city}, SP, Brasil`);
        }
    }
    variations.push(`${address}, Brasil`);
    if (!address.includes('SP') && !address.includes('São Paulo')) {
        variations.push(`${address}, SP, Brasil`);
        variations.push(`${address}, São Paulo, Brasil`);
    }
    const parts = address.split(',');
    if (parts.length >= 2) {
        const city = parts[parts.length - 2].trim();
        variations.push(`${city}, SP, Brasil`);
    }
    return [...new Set(variations)];
}

async function tryMultipleProviders(query, options = {}) {
    const providers = [
        { name: 'graphhopper', url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&locale=pt_BR&country=BR` },
        { name: 'nominatim', url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&provider=nominatim&locale=pt_BR&country=BR` },
        { name: 'graphhopper_bbox', url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&locale=pt_BR&bbox=${SAO_PAULO_BBOX}` }
    ];
    for (const provider of providers) {
        try {
            const response = await fetch(provider.url);
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('429 Too Many Requests');
                }
                continue;
            }
            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
                const hit = data.hits[0];
                return {
                    lat: hit.point.lat, lng: hit.point.lng, display_name: hit.name || query,
                    confidence: hit.confidence || 0.5, provider: provider.name
                };
            }
        } catch (error) {
            console.error(`Erro com provider ${provider.name}:`, error);
            if (error.message.includes('429')) {
                throw error; // Propaga erro de limite
            }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return null;
}

async function geocodeAddressEnhanced(address) {
    if (!address || address.trim() === '') return null;
    const manualResult = checkManualCorrection(address);
    if (manualResult) return manualResult;
    const cacheKey = `enhanced_${address}`;
    if (addressCache[cacheKey]) {
        const cached = addressCache[cacheKey];
        if (cached.validated && validateGeocodingResult(cached, address)) return cached;
    }
    const searchVariations = generateSearchVariations(address, true);
    for (const variation of searchVariations) {
        const result = await tryMultipleProviders(variation);
        if (result && validateGeocodingResult(result, address)) {
            result.validated = true;
            result.originalAddress = address;
            result.searchVariation = variation;
            addressCache[cacheKey] = result;
            localStorage.setItem('addressCache', JSON.stringify(addressCache));
            return result;
        }
    }
    const cep = extractCEPFromAddress(address);
    if (cep) {
        const cepValidation = validateCEPLocation(cep);
        if (cepValidation) {
            return {
                lat: cepValidation.coords.lat, lng: cepValidation.coords.lng,
                display_name: `CEP ${cep} (aproximado)`, confidence: cepValidation.confidence * 0.8,
                provider: 'cep_fallback', validated: true, originalAddress: address
            };
        }
    }
    return null;
}

function createEditableMarker(coords, client, isAtivo) {
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createMarkerIcon(isAtivo, coords.confidence),
        draggable: false
    }).addTo(map);
    marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        editingMarker = marker;
        editingClient = client;
        showLocationCorrectionModal(client, coords, newPos);
    });
    return marker;
}

function createMarkerIcon(isAtivo, confidence = 0.5) {
    const baseColor = isAtivo ? '#28a745' : '#dc3545';
    const opacity = confidence > 0.8 ? 1.0 : confidence > 0.6 ? 0.8 : 0.6;
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${baseColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; opacity: ${opacity};"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function showLocationCorrectionModal(client, oldCoords, newCoords) {
    const modal = document.createElement('div');
    modal.id = 'location-correction-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
        z-index: 1000;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 5px; max-width: 400px;">
            <h3>Confirmar Correção de Localização</h3>
            <p><strong>Cliente:</strong> ${client['Nome Fantasia'] || 'Sem Nome'}</p>
            <p><strong>Endereço:</strong> ${getFullAddress(client)}</p>
            <p><strong>Coordenadas Antigas:</strong> ${oldCoords.lat.toFixed(4)}, ${oldCoords.lng.toFixed(4)}</p>
            <p><strong>Novas Coordenadas:</strong> ${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)}</p>
            <button onclick="confirmLocationCorrection('${getFullAddress(client)}', ${newCoords.lat}, ${newCoords.lng}, '${client['Nome Fantasia'] || 'Sem Nome'}')">Confirmar</button>
            <button onclick="cancelLocationCorrection()">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function confirmLocationCorrection(address, lat, lng, clientName) {
    if (editingMarker && editingClient) {
        saveManualCorrection(address, lat, lng, clientName);
        editingMarker.setLatLng([lat, lng]);
        const updatedPopup = createPopupContent(editingClient, { lat, lng, confidence: 1.0, provider: 'manual_correction', validated: true, manuallyEdited: true }, address);
        editingMarker.setPopupContent(updatedPopup);
        
        mapDataCache = mapDataCache.map(item => {
            if (item.client.id === editingClient.id) {
                return { ...item, coords: { lat, lng, confidence: 1.0, provider: 'manual_correction', validated: true, manuallyEdited: true } };
            }
            return item;
        });
        localStorage.setItem('mapDataCache', JSON.stringify(mapDataCache));
    }
    const modal = document.getElementById('location-correction-modal');
    if (modal) modal.remove();
    editingMarker = null;
    editingClient = null;
    updateMapStatus('Correção de localização salva');
}

function cancelLocationCorrection() {
    if (editingMarker && editingClient) {
        const originalCoords = mapDataCache.find(item => item.client.id === editingClient.id)?.coords;
        if (originalCoords) {
            editingMarker.setLatLng([originalCoords.lat, originalCoords.lng]);
        }
    }
    const modal = document.getElementById('location-correction-modal');
    if (modal) modal.remove();
    editingMarker = null;
    editingClient = null;
    updateMapStatus('Correção de localização cancelada');
}

function getFullAddress(client) {
    const parts = [
        client.Endereco || '',
        client.Numero || '',
        client.Bairro || '',
        client.Cidade || '',
        client.UF || '',
        client.CEP || ''
    ].filter(part => part.trim());
    return parts.join(', ');
}

// Funções globais
window.initMap = initMap;
window.loadMapData = loadMapData;
window.clearMapDataCache = clearMapDataCache;
window.toggleEditMode = toggleEditMode;
window.confirmLocationCorrection = confirmLocationCorrection;
window.cancelLocationCorrection = cancelLocationCorrection;
window.getFullAddress = getFullAddress;

console.log('🚀 map.js carregado com sucesso');