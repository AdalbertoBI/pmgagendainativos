// map.js - Versão completa com funcionalidade "Incluir Inativos"

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let includeInativos = false; // Estado do checkbox
let precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };

// Coordenadas precisas das principais cidades brasileiras
const COORDENADAS_PRECISAS = {
    'SAO PAULO': { lat: -23.5505, lng: -46.6333, precision: 'centro' },
    'RIO DE JANEIRO': { lat: -22.9068, lng: -43.1729, precision: 'centro' },
    'BELO HORIZONTE': { lat: -19.9191, lng: -43.9386, precision: 'centro' },
    'SALVADOR': { lat: -12.9714, lng: -38.5014, precision: 'centro' },
    'BRASILIA': { lat: -15.7941, lng: -47.8825, precision: 'centro' },
    'FORTALEZA': { lat: -3.7319, lng: -38.5267, precision: 'centro' },
    'CURITIBA': { lat: -25.4284, lng: -49.2733, precision: 'centro' },
    'RECIFE': { lat: -8.0476, lng: -34.8770, precision: 'centro' },
    'PORTO ALEGRE': { lat: -30.0346, lng: -51.2177, precision: 'centro' },
    'MANAUS': { lat: -3.1190, lng: -60.0217, precision: 'centro' },
    'GOIANIA': { lat: -16.6864, lng: -49.2643, precision: 'centro' },
    'CAMPINAS': { lat: -22.9099, lng: -47.0626, precision: 'centro' },
    'SAO JOSE DOS CAMPOS': { lat: -23.2237, lng: -45.9009, precision: 'centro' },
    'SANTOS': { lat: -23.9618, lng: -46.3322, precision: 'centro' },
    'SOROCABA': { lat: -23.5015, lng: -47.4526, precision: 'centro' },
    'RIBEIRAO PRETO': { lat: -21.1775, lng: -47.8142, precision: 'centro' },
    'UBERLANDIA': { lat: -18.9113, lng: -48.2622, precision: 'centro' },
    'CONTAGEM': { lat: -19.9317, lng: -44.0536, precision: 'centro' },
    'NATAL': { lat: -5.7945, lng: -35.2110, precision: 'centro' },
    'CAMPO GRANDE': { lat: -20.4697, lng: -54.6201, precision: 'centro' },
    'TRES LAGOAS': { lat: -20.7519, lng: -51.6782, precision: 'centro' },
    'FLORIANOPOLIS': { lat: -27.5954, lng: -48.5480, precision: 'centro' },
    'JOINVILLE': { lat: -26.3044, lng: -48.8487, precision: 'centro' },
    'LONDRINA': { lat: -23.3045, lng: -51.1696, precision: 'centro' },
    'MARINGA': { lat: -23.4205, lng: -51.9331, precision: 'centro' },
    'VITORIA': { lat: -20.2976, lng: -40.2958, precision: 'centro' },
    'MACEIO': { lat: -9.6476, lng: -35.7175, precision: 'centro' },
    'JOAO PESSOA': { lat: -7.1195, lng: -34.8450, precision: 'centro' },
    'ARACAJU': { lat: -10.9472, lng: -37.0731, precision: 'centro' },
    'TERESINA': { lat: -5.0892, lng: -42.8019, precision: 'centro' },
    'PALMAS': { lat: -10.1689, lng: -48.3317, precision: 'centro' },
    'CUIABA': { lat: -15.6014, lng: -56.0979, precision: 'centro' },
    'BOA VISTA': { lat: 2.8235, lng: -60.6758, precision: 'centro' },
    'MACAPA': { lat: 0.0389, lng: -51.0664, precision: 'centro' },
    'RIO BRANCO': { lat: -9.9754, lng: -67.8249, precision: 'centro' },
    'PORTO VELHO': { lat: -8.7619, lng: -63.9039, precision: 'centro' }
};

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa com opção de incluir inativos...');
    
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    loadCaches();
    updateMapStatus('Mapa carregado - Sistema de alta precisão ativado');
    
    setTimeout(() => {
        setupEditButton();
        setupIncludeInativosCheckbox();
        obterLocalizacaoUsuario();
    }, 500);
    
    console.log('✅ Mapa inicializado com opção de incluir inativos');
}

// Configurar checkbox "Incluir inativos"
function setupIncludeInativosCheckbox() {
    const checkbox = document.getElementById('include-inativos-checkbox');
    if (!checkbox) {
        console.warn('⚠️ Checkbox "Incluir inativos" não encontrado');
        return;
    }
    
    checkbox.addEventListener('change', (event) => {
        includeInativos = event.target.checked;
        console.log('🔄 Checkbox alterado:', includeInativos ? 'Incluir inativos' : 'Apenas ativos');
        loadMapData();
    });
    
    console.log('✅ Checkbox "Incluir inativos" configurado');
}

// Obter localização do usuário
function obterLocalizacaoUsuario() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                console.log('📍 Localização do usuário:', latitude, longitude);
                
                if (map) {
                    map.setView([latitude, longitude], 13);
                    
                    const userMarker = L.marker([latitude, longitude], {
                        icon: createUserLocationIcon()
                    }).addTo(map);
                    
                    userMarker.bindPopup('📍 Sua localização atual').openPopup();
                    updateMapStatus('Mapa centralizado na sua localização');
                }
            },
            error => {
                console.log('⚠️ Erro ao obter localização:', error.message);
                updateMapStatus('Usando localização padrão');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }
}

// Criar ícone de localização do usuário
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
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
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
    if (!editBtn) return;
    
    editBtn.removeEventListener('click', handleEditButtonClick);
    editBtn.addEventListener('click', handleEditButtonClick);
    
    editBtn.innerHTML = '✏️ Editar Localizações';
    editBtn.style.background = '';
    editBtn.classList.remove('active');
    isEditMode = false;
}

// Manipular clique no botão de edição
function handleEditButtonClick(event) {
    event.preventDefault();
    
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
    
    if (confirm(`Confirmar nova posição para "${clientName}"?\n\nLat: ${newLatLng.lat.toFixed(6)}\nLng: ${newLatLng.lng.toFixed(6)}`)) {
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
        
        updateMapStatus(`✅ Posição de "${clientName}" corrigida!`);
    } else {
        const originalCoords = getOriginalCoords(client);
        if (originalCoords) {
            marker.setLatLng([originalCoords.lat, originalCoords.lng]);
        }
    }
}

// Carregar dados do mapa - MODIFICADO PARA INCLUIR INATIVOS
async function loadMapData() {
    if (!map) return;
    
    clearMarkers();
    
    const ativos = window.ativos || [];
    const inativos = window.data || [];
    
    // Determinar quais clientes mostrar baseado no checkbox
    let clientsToShow = ativos.slice();
    if (includeInativos) {
        clientsToShow = clientsToShow.concat(inativos);
    }
    
    if (clientsToShow.length === 0) {
        updateMapStatus('Nenhum cliente encontrado para exibir');
        return;
    }
    
    const statusPrefix = includeInativos ? 'Carregando ativos + inativos' : 'Carregando apenas ativos';
    updateMapStatus(`${statusPrefix}: ${clientsToShow.length} clientes...`);
    
    let loaded = 0;
    let batchSize = 5;
    
    for (let i = 0; i < clientsToShow.length; i += batchSize) {
        const batch = clientsToShow.slice(i, i + batchSize);
        
        const promises = batch.map(async client => {
            try {
                const coords = await geocodificarClienteComPrecisao(client);
                if (coords) {
                    const marker = createEditableMarker(coords, client);
                    markers.push(marker);
                    loaded++;
                    
                    // Atualizar estatísticas
                    precisaoStats.total++;
                    if (coords.confidence >= 0.8) precisaoStats.alta++;
                    else if (coords.confidence >= 0.6) precisaoStats.media++;
                    else precisaoStats.baixa++;
                }
            } catch (error) {
                console.error('Erro ao processar cliente:', client['Nome Fantasia'], error);
            }
        });
        
        await Promise.all(promises);
        
        // Atualizar progresso
        const progress = Math.round((loaded / clientsToShow.length) * 100);
        updateMapStatus(`${statusPrefix}... ${progress}% (${loaded}/${clientsToShow.length})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const ativosCount = ativos.length;
    const inativosCount = includeInativos ? inativos.length : 0;
    const totalCount = ativosCount + inativosCount;
    
    updateMapStatus(`${loaded}/${totalCount} clientes carregados (${ativosCount} ativos${includeInativos ? `, ${inativosCount} inativos` : ''})`);
    
    console.log(`📊 Mapa carregado: ${loaded} marcadores (${ativosCount} ativos, ${inativosCount} inativos)`);
}

// Geocodificar cliente com precisão aprimorada
async function geocodificarClienteComPrecisao(client) {
    const address = getFullAddress(client);
    if (!address) return null;
    
    // 1. Verificar correções manuais
    if (manualCorrections[address]) {
        return manualCorrections[address];
    }
    
    // 2. Verificar cache
    if (addressCache[address]) {
        return addressCache[address];
    }
    
    // 3. Coordenadas precisas da cidade
    const coordsCidade = obterCoordenadasCidadePrecisa(client);
    if (coordsCidade) {
        addressCache[address] = coordsCidade;
        salvarCache();
        return coordsCidade;
    }
    
    // 4. Geocodificação básica
    const coords = await geocodeBasic(address);
    if (coords) {
        addressCache[address] = coords;
        salvarCache();
        return coords;
    }
    
    // 5. Fallback
    const fallback = obterFallbackCorrigido(client);
    if (fallback) {
        addressCache[address] = fallback;
        salvarCache();
        return fallback;
    }
    
    return null;
}

// Obter coordenadas precisas da cidade
function obterCoordenadasCidadePrecisa(client) {
    const cidade = (client.Cidade || '').toUpperCase().trim();
    
    if (COORDENADAS_PRECISAS[cidade]) {
        const coords = COORDENADAS_PRECISAS[cidade];
        const variacao = obterVariacaoParaCliente(client);
        
        return {
            lat: coords.lat + variacao.lat,
            lng: coords.lng + variacao.lng,
            confidence: 0.75,
            provider: 'Cidade-Precisa',
            manuallyEdited: false
        };
    }
    
    return null;
}

// Obter variação para cliente (evitar sobreposição)
function obterVariacaoParaCliente(client) {
    const clientId = client.id || client['Nome Fantasia'] || 'default';
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
        hash = ((hash << 5) - hash + clientId.charCodeAt(i)) & 0xffffffff;
    }
    
    return {
        lat: ((hash % 200) - 100) * 0.00005,
        lng: ((hash % 300) - 150) * 0.00005
    };
}

// Obter fallback corrigido
function obterFallbackCorrigido(client) {
    const estado = (client.UF || '').toUpperCase().trim();
    
    const coordenadasEstados = {
        'SP': { lat: -23.5505, lng: -46.6333 },
        'RJ': { lat: -22.9068, lng: -43.1729 },
        'MG': { lat: -19.9191, lng: -43.9386 },
        'BA': { lat: -12.9714, lng: -38.5014 },
        'PR': { lat: -25.4284, lng: -49.2733 },
        'RS': { lat: -30.0346, lng: -51.2177 },
        'SC': { lat: -27.5954, lng: -48.5480 },
        'GO': { lat: -16.6864, lng: -49.2643 },
        'MT': { lat: -15.6014, lng: -56.0979 },
        'MS': { lat: -20.4697, lng: -54.6201 },
        'DF': { lat: -15.7941, lng: -47.8825 }
    };
    
    if (coordenadasEstados[estado]) {
        const coords = coordenadasEstados[estado];
        const variacao = obterVariacaoParaCliente(client);
        
        return {
            lat: coords.lat + variacao.lat,
            lng: coords.lng + variacao.lng,
            confidence: 0.4,
            provider: 'Estado-Fallback',
            manuallyEdited: false
        };
    }
    
    return {
        lat: -23.5505,
        lng: -46.6333,
        confidence: 0.3,
        provider: 'Brasil-Fallback',
        manuallyEdited: false
    };
}

// Criar marcador editável - MODIFICADO PARA DIFERENCIAR ATIVOS/INATIVOS
function createEditableMarker(coords, client) {
    const isManuallyEdited = coords.manuallyEdited || false;
    const isAtivo = (window.ativos || []).some(c => c.id === client.id);
    
    // Cores diferentes para ativos e inativos
    let color;
    if (isManuallyEdited) {
        color = 'blue';
    } else if (isAtivo) {
        color = 'green'; // Ativos em verde
    } else {
        color = 'gray'; // Inativos em cinza
    }
    
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createMarkerIcon(color, coords.confidence, isManuallyEdited, isAtivo),
        draggable: true
    }).addTo(map);
    
    marker.clientData = client;
    marker.bindPopup(createPopupContent(client, coords, isManuallyEdited, isAtivo));
    
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
                            window.clientManager.openModal(client, isAtivo ? 'ativos' : 'inativos');
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

// Criar ícone do marcador - MODIFICADO PARA INCLUIR STATUS
function createMarkerIcon(color, confidence, isManual, isAtivo) {
    const symbol = isManual ? '📍' : '';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${color}; 
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
                opacity: ${isAtivo ? '1' : '0.8'};
            ">
                ${symbol}
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// Criar conteúdo do popup - MODIFICADO PARA MOSTRAR STATUS
function createPopupContent(client, coords, isManuallyEdited, isAtivo) {
    const address = getFullAddress(client);
    const providerText = coords.provider || 'Desconhecido';
    const confidenceText = Math.round(coords.confidence * 100);
    const statusText = isAtivo ? 'Ativo' : 'Inativo';
    const statusColor = isAtivo ? '#28a745' : '#6c757d';
    
    return `
        <div style="max-width: 260px; font-family: Arial, sans-serif; line-height: 1.4;">
            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 15px;">
                ${client['Nome Fantasia'] || 'Sem Nome'}
            </h4>
            <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> 
                <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Endereço:</strong> ${address}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Precisão:</strong> ${confidenceText}%</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Método:</strong> ${providerText}</p>
            ${isManuallyEdited ? 
                '<p style="margin: 4px 0; font-size: 12px; color: #2196F3; font-weight: bold;">✅ Corrigido manualmente</p>' : 
                ''
            }
            <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <small style="color: #666; font-size: 11px;">Clique para ver detalhes completos</small>
            </div>
        </div>
    `;
}

// Geocodificação básica
async function geocodeBasic(address) {
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
        console.error('Erro na geocodificação básica:', error);
    }
    
    return null;
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

console.log('✅ map.js carregado - Versão com opção "Incluir inativos"');
