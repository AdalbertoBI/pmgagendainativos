// map.js - Versão adaptada para uso gratuito e sem limitações

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let apiUsageCount = { nominatim: 0, locationiq: 0, mapbox: 0 };
let lastApiCall = { nominatim: 0, locationiq: 0, mapbox: 0 };

// Coordenadas pré-definidas para principais cidades brasileiras
const COORDENADAS_CIDADES = {
    'SAO PAULO': { lat: -23.5505, lng: -46.6333, state: 'SP' },
    'RIO DE JANEIRO': { lat: -22.9068, lng: -43.1729, state: 'RJ' },
    'BRASILIA': { lat: -15.7941, lng: -47.8825, state: 'DF' },
    'BELO HORIZONTE': { lat: -19.9191, lng: -43.9386, state: 'MG' },
    'SALVADOR': { lat: -12.9714, lng: -38.5014, state: 'BA' },
    'CURITIBA': { lat: -25.4284, lng: -49.2733, state: 'PR' },
    'PORTO ALEGRE': { lat: -30.0346, lng: -51.2177, state: 'RS' },
    'RECIFE': { lat: -8.0476, lng: -34.8770, state: 'PE' },
    'FORTALEZA': { lat: -3.7319, lng: -38.5267, state: 'CE' },
    'MANAUS': { lat: -3.1190, lng: -60.0217, state: 'AM' },
    'GOIANIA': { lat: -16.6864, lng: -49.2643, state: 'GO' },
    'CAMPINAS': { lat: -22.9099, lng: -47.0626, state: 'SP' },
    'SAO JOSE DOS CAMPOS': { lat: -23.2237, lng: -45.9009, state: 'SP' },
    'SANTOS': { lat: -23.9618, lng: -46.3322, state: 'SP' },
    'SOROCABA': { lat: -23.5015, lng: -47.4526, state: 'SP' },
    'RIBEIRAO PRETO': { lat: -21.1775, lng: -47.8142, state: 'SP' },
    'UBERLANDIA': { lat: -18.9113, lng: -48.2622, state: 'MG' },
    'CONTAGEM': { lat: -19.9317, lng: -44.0536, state: 'MG' },
    'NATAL': { lat: -5.7945, lng: -35.2110, state: 'RN' },
    'CAMPO GRANDE': { lat: -20.4697, lng: -54.6201, state: 'MS' },
    'TRES LAGOAS': { lat: -20.7519, lng: -51.6782, state: 'MS' },
    'FLORIANOPOLIS': { lat: -27.5954, lng: -48.5480, state: 'SC' },
    'JOINVILLE': { lat: -26.3044, lng: -48.8487, state: 'SC' },
    'LONDRINA': { lat: -23.3045, lng: -51.1696, state: 'PR' },
    'MARINGA': { lat: -23.4205, lng: -51.9331, state: 'PR' }
};

// Configuração das APIs gratuitas
const API_CONFIG = {
    nominatim: {
        url: 'https://nominatim.openstreetmap.org/search',
        limit: 60, // 1 request por segundo
        params: 'format=json&limit=1&countrycodes=br'
    },
    locationiq: {
        url: 'https://us1.locationiq.com/v1/search.php',
        limit: 10000, // 10k requests/mês
        params: 'format=json&limit=1&countrycodes=br'
    },
    mapbox: {
        url: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
        limit: 100000, // 100k requests/mês
        params: 'country=br&limit=1'
    }
};

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa com APIs gratuitas...');
    
    if (map) {
        console.log('Mapa já inicializado');
        return;
    }
    
    map = L.map('map').setView([-23.2237, -45.9009], 11);
    
    // Usar tile layer gratuito do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    loadCaches();
    updateMapStatus('Mapa carregado - Sistema gratuito ativado');
    
    // Configurar botão de edição
    setTimeout(() => {
        setupEditButton();
    }, 500);
    
    // Tentar centralizar no usuário
    obterLocalizacaoUsuario();
    
    console.log('✅ Mapa inicializado com APIs gratuitas');
}

// Obter localização do usuário (API nativa - gratuita)
function obterLocalizacaoUsuario() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                console.log('📍 Localização do usuário obtida:', latitude, longitude);
                
                // Centralizar mapa na localização do usuário
                if (map) {
                    map.setView([latitude, longitude], 13);
                    
                    // Adicionar marcador do usuário
                    const userMarker = L.marker([latitude, longitude], {
                        icon: createUserLocationIcon()
                    }).addTo(map);
                    
                    userMarker.bindPopup('📍 Sua localização atual').openPopup();
                    
                    updateMapStatus('Mapa centralizado na sua localização');
                }
            },
            error => {
                console.log('⚠️ Erro ao obter localização:', error.message);
                updateMapStatus('Usando localização padrão - São José dos Campos');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutos
            }
        );
    }
}

// Criar ícone para localização do usuário
function createUserLocationIcon() {
    return L.divIcon({
        className: 'user-location-marker',
        html: `
            <div style="
                background: #4285f4; 
                width: 16px; 
                height: 16px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                animation: pulse 2s infinite;
            "></div>
            <style>
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); }
                }
            </style>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

// Configurar botão de edição
function setupEditButton() {
    const editBtn = document.getElementById('edit-mode-btn');
    if (!editBtn) {
        console.error('❌ Botão edit-mode-btn não encontrado');
        return;
    }
    
    editBtn.removeEventListener('click', handleEditButtonClick);
    editBtn.addEventListener('click', handleEditButtonClick);
    
    editBtn.innerHTML = '✏️ Editar Localizações';
    editBtn.style.background = '';
    editBtn.classList.remove('active');
    isEditMode = false;
    
    console.log('✅ Botão de edição configurado');
}

// Manipular clique no botão de edição
function handleEditButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🔄 Alternando modo de edição:', isEditMode);
    
    const editBtn = document.getElementById('edit-mode-btn');
    if (!editBtn) return;
    
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        editBtn.innerHTML = '❌ Sair da Edição';
        editBtn.style.background = '#ffebee';
        editBtn.style.color = '#d32f2f';
        editBtn.classList.add('active');
        
        let enabledCount = 0;
        markers.forEach(marker => {
            if (marker && marker.dragging) {
                marker.dragging.enable();
                marker.setOpacity(0.8);
                enabledCount++;
                
                if (!marker._editEventConfigured) {
                    marker.on('dragend', handleMarkerDragEnd);
                    marker._editEventConfigured = true;
                }
            }
        });
        
        updateMapStatus(`Modo edição ativado - ${enabledCount} marcadores arrastáveis`);
    } else {
        editBtn.innerHTML = '✏️ Editar Localizações';
        editBtn.style.background = '';
        editBtn.style.color = '';
        editBtn.classList.remove('active');
        
        markers.forEach(marker => {
            if (marker && marker.dragging) {
                marker.dragging.disable();
                marker.setOpacity(1);
            }
        });
        
        updateMapStatus('Modo edição desativado');
    }
}

// Manipular fim do arrasto
function handleMarkerDragEnd(event) {
    const marker = event.target;
    const newLatLng = marker.getLatLng();
    const client = marker.clientData;
    
    if (!client) return;
    
    const address = getFullAddress(client);
    const clientName = client['Nome Fantasia'] || 'Cliente';
    
    const confirmMessage = `Confirmar nova posição para:\n\n${clientName}\n${address}\n\nNova posição:\nLat: ${newLatLng.lat.toFixed(6)}\nLng: ${newLatLng.lng.toFixed(6)}`;
    
    if (confirm(confirmMessage)) {
        manualCorrections[address] = {
            lat: newLatLng.lat,
            lng: newLatLng.lng,
            confidence: 1.0,
            provider: 'Manual',
            manuallyEdited: true,
            editedAt: new Date().toISOString()
        };
        
        try {
            if (window.dbManager) {
                window.dbManager.saveManualCorrections(manualCorrections);
                addressCache[address] = manualCorrections[address];
                window.dbManager.saveAddressCache(addressCache);
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
        
        marker.setIcon(createMarkerIcon('blue', 1.0, true));
        marker.setPopupContent(createPopupContent(client, newLatLng, true));
        
        updateMapStatus(`✅ Posição de "${clientName}" salva!`);
    } else {
        const originalCoords = getOriginalCoords(client);
        if (originalCoords) {
            marker.setLatLng([originalCoords.lat, originalCoords.lng]);
        }
    }
}

// Carregar dados do mapa
async function loadMapData() {
    if (!map) return;
    
    clearMarkers();
    
    const ativos = window.ativos || [];
    if (ativos.length === 0) {
        updateMapStatus('Nenhum cliente ativo encontrado');
        return;
    }
    
    updateMapStatus(`Carregando ${ativos.length} clientes - Sistema gratuito`);
    
    let loaded = 0;
    for (const client of ativos) {
        try {
            const coords = await geocodificarCliente(client);
            if (coords) {
                const marker = createEditableMarker(coords, client);
                markers.push(marker);
                loaded++;
            }
        } catch (error) {
            console.error('Erro ao processar cliente:', client['Nome Fantasia'], error);
        }
        
        // Pausa pequena para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    updateMapStatus(`${loaded}/${ativos.length} clientes carregados com APIs gratuitas`);
}

// Geocodificar cliente usando múltiplas estratégias gratuitas
async function geocodificarCliente(client) {
    const address = getFullAddress(client);
    if (!address) return null;
    
    // 1. Verificar correções manuais
    if (manualCorrections[address]) {
        console.log('📍 Usando correção manual:', address);
        return manualCorrections[address];
    }
    
    // 2. Verificar cache
    if (addressCache[address]) {
        console.log('💾 Usando cache:', address);
        return addressCache[address];
    }
    
    // 3. Verificar coordenadas pré-definidas por cidade
    const coordsPredefinidas = buscarCoordenadasPredefinidas(client);
    if (coordsPredefinidas) {
        console.log('🏙️ Usando coordenadas predefinidas:', client.Cidade);
        addressCache[address] = coordsPredefinidas;
        salvarCache();
        return coordsPredefinidas;
    }
    
    // 4. Tentar geocodificação com APIs gratuitas
    const coords = await geocodificarComMultiplasAPIs(address);
    if (coords) {
        console.log('🌐 Geocodificação bem-sucedida:', address);
        addressCache[address] = coords;
        salvarCache();
        return coords;
    }
    
    // 5. Fallback para coordenadas aproximadas
    const fallback = obterCoordenadasFallback(client);
    if (fallback) {
        console.log('🎯 Usando fallback:', client.Cidade || client.UF);
        addressCache[address] = fallback;
        salvarCache();
        return fallback;
    }
    
    return null;
}

// Buscar coordenadas predefinidas para a cidade
function buscarCoordenadasPredefinidas(client) {
    const cidade = (client.Cidade || '').toUpperCase().trim();
    const estado = (client.UF || '').toUpperCase().trim();
    
    if (COORDENADAS_CIDADES[cidade]) {
        return {
            lat: COORDENADAS_CIDADES[cidade].lat,
            lng: COORDENADAS_CIDADES[cidade].lng,
            confidence: 0.8,
            provider: 'Predefinido',
            manuallyEdited: false
        };
    }
    
    // Buscar por cidade similar
    for (const cidadeKey in COORDENADAS_CIDADES) {
        if (cidadeKey.includes(cidade) || cidade.includes(cidadeKey)) {
            return {
                lat: COORDENADAS_CIDADES[cidadeKey].lat,
                lng: COORDENADAS_CIDADES[cidadeKey].lng,
                confidence: 0.7,
                provider: 'Aproximado',
                manuallyEdited: false
            };
        }
    }
    
    return null;
}

// Geocodificar com múltiplas APIs gratuitas
async function geocodificarComMultiplasAPIs(address) {
    const apis = [
        () => geocodificarNominatim(address),
        () => geocodificarLocationIQ(address),
        () => geocodificarMapbox(address)
    ];
    
    for (const apiCall of apis) {
        try {
            const result = await apiCall();
            if (result) {
                return result;
            }
        } catch (error) {
            console.log('Tentando próxima API...');
        }
    }
    
    return null;
}

// Geocodificar com Nominatim (OpenStreetMap - gratuito)
async function geocodificarNominatim(address) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall.nominatim;
    
    // Rate limiting: 1 requisição por segundo
    if (timeSinceLastCall < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
    }
    
    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ClienteManager/1.0'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        lastApiCall.nominatim = Date.now();
        apiUsageCount.nominatim++;
        
        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                confidence: 0.8,
                provider: 'Nominatim',
                manuallyEdited: false
            };
        }
    } catch (error) {
        console.error('Erro Nominatim:', error);
    }
    
    return null;
}

// Geocodificar com LocationIQ (gratuito - 10k requests/mês)
async function geocodificarLocationIQ(address) {
    // Implementar se necessário - requer API key gratuita
    return null;
}

// Geocodificar com Mapbox (gratuito - 100k requests/mês)
async function geocodificarMapbox(address) {
    // Implementar se necessário - requer API key gratuita
    return null;
}

// Obter coordenadas de fallback
function obterCoordenadasFallback(client) {
    const estado = (client.UF || '').toUpperCase().trim();
    
    // Coordenadas centrais dos estados brasileiros
    const coordenadasEstados = {
        'SP': { lat: -23.5505, lng: -46.6333 },
        'RJ': { lat: -22.9068, lng: -43.1729 },
        'MG': { lat: -19.9191, lng: -43.9386 },
        'RS': { lat: -30.0346, lng: -51.2177 },
        'PR': { lat: -25.4284, lng: -49.2733 },
        'SC': { lat: -27.5954, lng: -48.5480 },
        'BA': { lat: -12.9714, lng: -38.5014 },
        'GO': { lat: -16.6864, lng: -49.2643 },
        'MT': { lat: -15.6014, lng: -56.0979 },
        'MS': { lat: -20.4697, lng: -54.6201 },
        'DF': { lat: -15.7941, lng: -47.8825 }
    };
    
    if (coordenadasEstados[estado]) {
        return {
            lat: coordenadasEstados[estado].lat,
            lng: coordenadasEstados[estado].lng,
            confidence: 0.5,
            provider: 'Fallback-Estado',
            manuallyEdited: false
        };
    }
    
    // Fallback final - São Paulo
    return {
        lat: -23.5505,
        lng: -46.6333,
        confidence: 0.3,
        provider: 'Fallback-Brasil',
        manuallyEdited: false
    };
}

// Criar marcador editável
function createEditableMarker(coords, client) {
    const isManuallyEdited = coords.manuallyEdited || false;
    const color = isManuallyEdited ? 'blue' : getColorByConfidence(coords.confidence);
    
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createMarkerIcon(color, coords.confidence, isManuallyEdited),
        draggable: true
    }).addTo(map);
    
    marker.clientData = client;
    marker.bindPopup(createPopupContent(client, coords, isManuallyEdited));
    
    marker.on('click', function(e) {
        if (!isEditMode) {
            marker.openPopup();
            setTimeout(() => {
                const popupElement = document.querySelector('.leaflet-popup-content');
                if (popupElement) {
                    popupElement.style.cursor = 'pointer';
                    popupElement.onclick = function() {
                        marker.closePopup();
                        if (window.clientManager && window.clientManager.openModal) {
                            window.clientManager.openModal(client, 'ativos');
                        }
                    };
                }
            }, 100);
        }
    });
    
    if (marker.dragging) {
        marker.dragging.disable();
    }
    
    return marker;
}

// Obter cor baseada na confiança
function getColorByConfidence(confidence) {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'orange';
    return 'red';
}

// Criar ícone do marcador
function createMarkerIcon(color, confidence, isManual) {
    const symbol = isManual ? '📍' : (confidence < 0.6 ? '❓' : '');
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${color}; 
                width: 22px; 
                height: 22px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
            ">
                ${symbol}
            </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

// Criar conteúdo do popup
function createPopupContent(client, coords, isManuallyEdited) {
    const address = getFullAddress(client);
    const providerText = coords.provider || 'Desconhecido';
    
    return `
        <div style="max-width: 250px; font-family: Arial, sans-serif; line-height: 1.4;">
            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">
                ${client['Nome Fantasia'] || 'Sem Nome'}
            </h4>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> Cliente Ativo</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Endereço:</strong> ${address}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Precisão:</strong> ${Math.round(coords.confidence * 100)}%</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Método:</strong> ${providerText}</p>
            ${isManuallyEdited ? 
                '<p style="margin: 4px 0; font-size: 12px; color: #2196F3; font-weight: bold;">✅ Corrigido manualmente</p>' : 
                ''
            }
            <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <small style="color: #666; font-size: 11px;">Clique para ver detalhes</small>
            </div>
        </div>
    `;
}

// Funções auxiliares
function clearMarkers() {
    markers.forEach(marker => {
        if (marker && map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    markers = [];
}

function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function loadCaches() {
    try {
        if (window.dbManager) {
            addressCache = window.dbManager.loadAddressCache() || {};
            manualCorrections = window.dbManager.loadManualCorrections() || {};
        }
    } catch (error) {
        console.error('Erro ao carregar caches:', error);
    }
}

function salvarCache() {
    try {
        if (window.dbManager) {
            window.dbManager.saveAddressCache(addressCache);
        }
    } catch (error) {
        console.error('Erro ao salvar cache:', error);
    }
}

function getOriginalCoords(client) {
    const address = getFullAddress(client);
    return addressCache[address] || manualCorrections[address] || null;
}

function getFullAddress(client) {
    const parts = [
        client.Endereco || '',
        client.Numero || '',
        client.Bairro || '',
        client.Cidade || '',
        client.UF || '',
        client.CEP || ''
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
}

// Exportar funções globalmente
window.initMap = initMap;
window.loadMapData = loadMapData;
window.toggleEditMode = handleEditButtonClick;
window.setupEditButton = setupEditButton;
window.obterLocalizacaoUsuario = obterLocalizacaoUsuario;

console.log('✅ map.js carregado - Versão gratuita e sem limitações');
