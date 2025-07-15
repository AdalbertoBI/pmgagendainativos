// map.js - Mapa corrigido para carregar apenas clientes ativos (sem botão "Mostrar Ativos")

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
const GRAPHHOPPER_API_KEY = '55b67cde-e051-409f-9440-171f4d6f52e0';
let editingMarker = null;
let editingClient = null;

// Coordenadas de referência por cidade/estado
const LOCATION_COORDS = {
    'SAO JOSE DOS CAMPOS': { lat: -23.2237, lng: -45.9009, state: 'SP' },
    'BUQUIRINHA': { lat: -23.2100, lng: -45.8800, state: 'SP' },
    'SAO PAULO': { lat: -23.5505, lng: -46.6333, state: 'SP' },
    'TRES LAGOAS': { lat: -20.7519, lng: -51.6782, state: 'MS' }
};

const SAO_PAULO_BBOX = '-50.0,-25.0,-44.0,-19.5';

function initMap() {
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Adicionar apenas controle de edição
    addEditControl();
    
    // Carregar cache de endereços
    loadCaches();
    
    updateMapStatus('Mapa carregado - Exibindo apenas clientes ativos');
}

function addEditControl() {
    const editControl = L.control({ position: 'topleft' });
    
    editControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.innerHTML = `
            <button id="edit-mode-btn" onclick="toggleEditMode()" style="padding: 5px 10px; background: white; border: none; cursor: pointer;">
                ✏️ Editar Localizações
            </button>
        `;
        return div;
    };
    
    editControl.addTo(map);
}

function loadCaches() {
    addressCache = window.dbManager.loadAddressCache();
    manualCorrections = window.dbManager.loadManualCorrections();
}

function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function toggleEditMode() {
    const editBtn = document.getElementById('edit-mode-btn');
    const isEditMode = editBtn.textContent.includes('Sair');
    
    if (isEditMode) {
        // Sair do modo edição
        editBtn.innerHTML = '✏️ Editar Localizações';
        editBtn.style.background = 'white';
        markers.forEach(marker => {
            marker.dragging.disable();
            marker.setOpacity(1);
        });
        updateMapStatus('Modo edição desativado - Exibindo apenas clientes ativos');
    } else {
        // Entrar no modo edição
        editBtn.innerHTML = '❌ Sair da Edição';
        editBtn.style.background = '#ffebee';
        markers.forEach(marker => {
            marker.dragging.enable();
            marker.setOpacity(0.8);
        });
        updateMapStatus('Modo edição ativado - Arraste os marcadores para corrigi-los');
    }
}

// Carregar dados do mapa - APENAS CLIENTES ATIVOS
async function loadMapData() {
    if (!map) {
        console.log('🗺️ Mapa não inicializado');
        return;
    }

    // Limpar marcadores existentes
    clearMarkers();

    // Carregar apenas clientes ativos
    const ativos = window.ativos || [];
    
    if (ativos.length === 0) {
        updateMapStatus('Nenhum cliente ativo encontrado');
        return;
    }

    updateMapStatus(`Carregando ${ativos.length} clientes ativos...`);

    let processedCount = 0;
    const totalCount = ativos.length;

    for (const client of ativos) {
        try {
            const address = getFullAddress(client);
            if (address) {
                const coords = await geocodeAddressEnhanced(address);
                if (coords) {
                    const marker = createEditableMarker(coords, client);
                    markers.push(marker);
                    processedCount++;
                }
            }
        } catch (error) {
            console.error(`Erro ao processar cliente ${client['Nome Fantasia']}:`, error);
        }
    }

    updateMapStatus(`${processedCount}/${totalCount} clientes ativos carregados no mapa`);
}

function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

function createEditableMarker(coords, client) {
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createActiveMarkerIcon(coords.confidence),
        draggable: false
    }).addTo(map);

    // Popup com informações do cliente
    const popupContent = `
        <div>
            <h4>${client['Nome Fantasia'] || 'Sem Nome'}</h4>
            <p><strong>Status:</strong> Ativo</p>
            <p><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p><strong>Precisão:</strong> ${Math.round(coords.confidence * 100)}%</p>
            <p><strong>Método:</strong> ${coords.provider || 'N/A'}</p>
            ${coords.manuallyEdited ? '<p><strong>✅ Corrigido pelo usuário</strong></p>' : ''}
        </div>
    `;

    marker.bindPopup(popupContent);

    // Evento de arrastar
    marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        editingMarker = marker;
        editingClient = client;
        showLocationCorrectionModal(client, coords, newPos);
    });

    return marker;
}

function createActiveMarkerIcon(confidence = 0.5) {
    const opacity = confidence > 0.8 ? 1.0 : confidence > 0.6 ? 0.8 : 0.6;
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; opacity: ${opacity}; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function showLocationCorrectionModal(client, oldCoords, newCoords) {
    const modal = document.createElement('div');
    modal.id = 'location-correction-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white; padding: 20px; border-radius: 10px; max-width: 400px;
        text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    const address = getFullAddress(client);
    content.innerHTML = `
        <h3>Correção de Localização</h3>
        <p><strong>Cliente:</strong> ${client['Nome Fantasia'] || 'Sem Nome'}</p>
        <p><strong>Endereço:</strong> ${address}</p>
        <p><strong>Nova Posição:</strong><br>
        Latitude: ${newCoords.lat.toFixed(6)}<br>
        Longitude: ${newCoords.lng.toFixed(6)}</p>
        <p>Esta correção será aplicada automaticamente em futuras pesquisas do mesmo endereço.</p>
        <div style="margin-top: 20px;">
            <button onclick="confirmLocationCorrection()" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">
                Confirmar Correção
            </button>
            <button onclick="cancelLocationCorrection()" style="background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                Cancelar
            </button>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);
}

function confirmLocationCorrection() {
    if (editingMarker && editingClient) {
        const newPos = editingMarker.getLatLng();
        const address = getFullAddress(editingClient);
        
        // Salvar correção manual
        saveManualCorrection(address, newPos.lat, newPos.lng, editingClient['Nome Fantasia']);
        
        console.log(`✅ Correção salva para ${editingClient['Nome Fantasia']}`);
        updateMapStatus(`Correção aplicada para ${editingClient['Nome Fantasia']}`);
    }
    
    cancelLocationCorrection();
}

function cancelLocationCorrection() {
    if (editingMarker) {
        // Restaurar posição original
        loadMapData();
    }
    
    const modal = document.getElementById('location-correction-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    editingMarker = null;
    editingClient = null;
}

function saveManualCorrection(address, lat, lng, clientName) {
    const cacheKey = `manual_${address}`;
    const correction = {
        lat: lat,
        lng: lng,
        display_name: `${clientName} (corrigido manualmente)`,
        date: new Date().toISOString(),
        originalAddress: address,
        clientName: clientName
    };
    
    manualCorrections[cacheKey] = correction;
    window.dbManager.saveManualCorrections(manualCorrections);
    
    // Também salvar no cache principal
    const enhancedCacheKey = `enhanced_${address}`;
    addressCache[enhancedCacheKey] = {
        lat: lat,
        lng: lng,
        display_name: correction.display_name,
        confidence: 1.0,
        provider: 'manual_correction',
        validated: true,
        manuallyEdited: true,
        correctionDate: correction.date
    };
    
    window.dbManager.saveAddressCache(addressCache);
    console.log(`✅ Correção manual salva para: ${address}`);
}

// Geocodificação de endereços
async function geocodeAddressEnhanced(address) {
    if (!address || address.trim() === '') return null;

    // Verificar correção manual primeiro
    const manualResult = checkManualCorrection(address);
    if (manualResult) {
        console.log(`🎯 Usando correção manual: ${address}`);
        return manualResult;
    }

    // Verificar cache
    const cacheKey = `enhanced_${address}`;
    if (addressCache[cacheKey]) {
        const cached = addressCache[cacheKey];
        if (cached.validated) {
            return cached;
        }
    }

    // Fazer geocodificação
    const searchVariations = generateSearchVariations(address);
    for (const variation of searchVariations) {
        const result = await tryMultipleProviders(variation);
        if (result) {
            result.validated = true;
            result.originalAddress = address;
            result.searchVariation = variation;
            
            addressCache[cacheKey] = result;
            window.dbManager.saveAddressCache(addressCache);
            
            return result;
        }
        
        // Delay entre tentativas
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return null;
}

function checkManualCorrection(address) {
    const cacheKey = `manual_${address}`;
    if (manualCorrections[cacheKey]) {
        const correction = manualCorrections[cacheKey];
        return {
            lat: correction.lat,
            lng: correction.lng,
            display_name: correction.display_name || address,
            confidence: 1.0,
            provider: 'manual_correction',
            validated: true,
            manuallyEdited: true,
            correctionDate: correction.date
        };
    }
    return null;
}

function generateSearchVariations(address) {
    if (!address) return [];
    
    const variations = [];
    variations.push(`${address}, Brasil`);
    
    if (!address.includes('SP') && !address.includes('São Paulo')) {
        variations.push(`${address}, SP, Brasil`);
        variations.push(`${address}, São Paulo, Brasil`);
    }
    
    return [...new Set(variations)];
}

async function tryMultipleProviders(query) {
    const providers = [
        {
            name: 'graphhopper',
            url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&locale=pt_BR&country=BR`
        },
        {
            name: 'nominatim',
            url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&provider=nominatim&locale=pt_BR&country=BR`
        }
    ];

    for (const provider of providers) {
        try {
            const response = await fetch(provider.url);
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data.hits && data.hits.length > 0) {
                const hit = data.hits[0];
                const result = {
                    lat: hit.point.lat,
                    lng: hit.point.lng,
                    display_name: hit.name || query,
                    confidence: hit.confidence || 0.5,
                    provider: provider.name
                };
                return result;
            }
        } catch (error) {
            console.error(`Erro com provider ${provider.name}:`, error);
        }
        
        // Delay entre providers
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return null;
}

function getFullAddress(item) {
    const parts = [
        item.Endereco || '',
        item.Numero || '',
        item.Bairro || '',
        item.Cidade || '',
        item.UF || '',
        item.CEP || ''
    ].filter(part => part.trim());
    return parts.join(', ');
}

// Função para atualizar mapa quando cliente for tornado ativo
function updateMapOnClientStatusChange() {
    if (map && window.currentTab === 'mapa') {
        loadMapData();
    }
}

// Disponibilizar função globalmente
window.updateMapOnClientStatusChange = updateMapOnClientStatusChange;
window.loadMapData = loadMapData;
window.initMap = initMap;
window.toggleEditMode = toggleEditMode;
window.confirmLocationCorrection = confirmLocationCorrection;
window.cancelLocationCorrection = cancelLocationCorrection;
