// Variáveis do mapa
let map = null;
let markers = [];
let addressCache = JSON.parse(localStorage.getItem('addressCache')) || {};
let manualCorrections = JSON.parse(localStorage.getItem('manualCorrections')) || {};
const GRAPHHOPPER_API_KEY = '55b67cde-e051-409f-9440-171f4d6f52e0';
let showInativos = true;
let showAtivos = true;
let editingMarker = null;
let editingClient = null;

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
    
    // Adicionar controles personalizados
    addCustomControls();
    
    updateMapStatus('Mapa carregado');
}

function addCustomControls() {
    // Controle de edição
    const editControl = L.control({ position: 'topleft' });
    editControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.innerHTML = `
            <button id="edit-mode-btn" onclick="toggleEditMode()" style="
                background: white;
                border: 1px solid #ccc;
                padding: 5px 10px;
                cursor: pointer;
                font-size: 12px;
                border-radius: 3px;
            ">
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
        // Sair do modo edição
        document.getElementById('edit-mode-btn').innerHTML = '✏️ Editar Localizações';
        document.getElementById('edit-mode-btn').style.background = 'white';
        markers.forEach(marker => {
            marker.dragging.disable();
            marker.setOpacity(1);
        });
        updateMapStatus('Modo edição desativado');
    } else {
        // Entrar no modo edição
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
}

function extractCEPFromAddress(address) {
    if (!address) return null;
    
    const patterns = [
        /\b(\d{5})-?(\d{3})\b/g,
        /\b(\d{8})\b/g
    ];
    
    for (const pattern of patterns) {
        const matches = address.match(pattern);
        if (matches) {
            const cepStr = matches[0].replace(/\D/g, '');
            if (cepStr.length === 8) {
                return parseInt(cepStr);
            }
        }
    }
    
    return null;
}

function validateCEPLocation(cep, expectedState = 'SP') {
    if (!cep) return null;
    
    for (const [region, ranges] of Object.entries(CEP_DATABASE)) {
        for (const range of ranges) {
            if (cep >= range.min && cep <= range.max) {
                return {
                    region,
                    coords: range.coords,
                    confidence: 0.95
                };
            }
        }
    }
    
    if (expectedState === 'SP') {
        if (cep >= 1000000 && cep <= 19999999) {
            return {
                region: 'SAO_PAULO_STATE',
                coords: LOCATION_COORDS['SAO PAULO'],
                confidence: 0.6
            };
        }
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
    localStorage.setItem('manualCorrections', JSON.stringify(manualCorrections));
    
    // Também salvar no cache principal com prioridade
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
    localStorage.setItem('addressCache', JSON.stringify(addressCache));
    
    console.log(`✅ Correção manual salva para: ${address}`);
}

function validateGeocodingResult(result, expectedAddress, expectedState = 'SP') {
    if (!result || !result.lat || !result.lng) return false;
    
    // Correções manuais sempre passam na validação
    if (result.manuallyEdited) return true;
    
    const cep = extractCEPFromAddress(expectedAddress);
    if (cep) {
        const cepValidation = validateCEPLocation(cep, expectedState);
        if (cepValidation) {
            const distance = calculateDistance(
                result.lat, result.lng,
                cepValidation.coords.lat, cepValidation.coords.lng
            );
            
            const maxDistance = cepValidation.confidence > 0.9 ? 10 : 25;
            
            if (distance > maxDistance) {
                console.warn(`Resultado rejeitado: distância ${distance.toFixed(2)}km do CEP esperado`);
                return false;
            }
        }
    }
    
    if (expectedState === 'SP') {
        const spCenter = LOCATION_COORDS['SAO PAULO'];
        const distanceFromSP = calculateDistance(
            result.lat, result.lng,
            spCenter.lat, spCenter.lng
        );
        
        if (distanceFromSP > 500) {
            console.warn(`Resultado rejeitado: muito longe de SP (${distanceFromSP.toFixed(2)}km)`);
            return false;
        }
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
        {
            name: 'graphhopper',
            url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&locale=pt_BR&country=BR`
        },
        {
            name: 'nominatim',
            url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&provider=nominatim&locale=pt_BR&country=BR`
        },
        {
            name: 'graphhopper_bbox',
            url: `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&key=${GRAPHHOPPER_API_KEY}&locale=pt_BR&bbox=${SAO_PAULO_BBOX}`
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
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return null;
}

async function geocodeAddressEnhanced(address) {
    if (!address || address.trim() === '') return null;
    
    // Verificar correção manual primeiro (prioridade máxima)
    const manualResult = checkManualCorrection(address);
    if (manualResult) {
        console.log(`🎯 Usando correção manual: ${address}`);
        return manualResult;
    }
    
    // Verificar cache normal
    const cacheKey = `enhanced_${address}`;
    if (addressCache[cacheKey]) {
        const cached = addressCache[cacheKey];
        if (cached.validated && validateGeocodingResult(cached, address)) {
            return cached;
        }
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
    
    // Fallback por CEP
    const cep = extractCEPFromAddress(address);
    if (cep) {
        const cepValidation = validateCEPLocation(cep);
        if (cepValidation) {
            const fallbackResult = {
                lat: cepValidation.coords.lat,
                lng: cepValidation.coords.lng,
                display_name: `CEP ${cep} (aproximado)`,
                confidence: cepValidation.confidence * 0.8,
                provider: 'cep_fallback',
                validated: true,
                originalAddress: address
            };
            
            return fallbackResult;
        }
    }
    
    return null;
}

function createEditableMarker(coords, client, isAtivo) {
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createMarkerIcon(isAtivo, coords.confidence),
        draggable: false // Inicia como não arrastrável
    }).addTo(map);
    
    // Evento de arrastar
    marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        editingMarker = marker;
        editingClient = client;
        
        // Mostrar modal de confirmação
        showLocationCorrectionModal(client, coords, newPos);
    });
    
    return marker;
}

function createMarkerIcon(isAtivo, confidence = 0.5) {
    const baseColor = isAtivo ? '#28a745' : '#dc3545';
    const opacity = confidence > 0.8 ? 1.0 : confidence > 0.6 ? 0.8 : 0.6;
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${baseColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); opacity: ${opacity};"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function showLocationCorrectionModal(client, oldCoords, newCoords) {
    const modal = document.createElement('div');
    modal.id = 'location-correction-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    const address = getFullAddress(client);
    
    content.innerHTML = `
        <h3>📍 Confirmar Correção de Localização</h3>
        <p><strong>Cliente:</strong> ${client['Nome Fantasia'] || 'Sem Nome'}</p>
        <p><strong>Endereço:</strong> ${address}</p>
        <p><strong>Nova Posição:</strong><br>
        Latitude: ${newCoords.lat.toFixed(6)}<br>
        Longitude: ${newCoords.lng.toFixed(6)}</p>
        <p style="color: #666; font-size: 14px;">
            Esta correção será aplicada automaticamente em futuras pesquisas do mesmo endereço.
        </p>
        <div style="margin-top: 20px;">
            <button onclick="confirmLocationCorrection()" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-right: 10px;
                cursor: pointer;
            ">✅ Confirmar</button>
            <button onclick="cancelLocationCorrection()" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            ">❌ Cancelar</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Armazenar dados para as funções de callback
    window.tempCorrectionData = {
        client: client,
        oldCoords: oldCoords,
        newCoords: newCoords,
        address: address
    };
}

function confirmLocationCorrection() {
    const data = window.tempCorrectionData;
    if (!data) return;
    
    // Salvar correção manual
    saveManualCorrection(
        data.address,
        data.newCoords.lat,
        data.newCoords.lng,
        data.client['Nome Fantasia'] || 'Cliente'
    );
    
    // Atualizar marcador
    if (editingMarker) {
        editingMarker.setLatLng([data.newCoords.lat, data.newCoords.lng]);
        
        // Atualizar popup
        const whatsappPhone = data.client['Telefone Comercial'] || data.client.Celular || '';
        const whatsappMessage = `Olá ${data.client['Nome Fantasia'] || 'cliente'}!`;
        const whatsappLink = generateWhatsAppLink(whatsappPhone, whatsappMessage);
        const mapsLink = generateMapsLink(data.address);
        
        const popupContent = `
            <div style="min-width: 240px;">
                <h4>${data.client['Nome Fantasia'] || 'Sem Nome'}</h4>
                <p><strong>Status:</strong> ${data.client.isAtivo ? 'Ativo' : 'Inativo'}</p>
                <p><strong>Cidade:</strong> ${data.client.Cidade || 'N/A'}</p>
                <p><strong>Método:</strong> manual_correction</p>
                <p><strong>Validação:</strong> ✅ Corrigido pelo usuário</p>
                <div style="margin-top: 10px;">
                    <button onclick="showDetailsFromMap('${data.client.id}')" style="margin-right: 5px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Ver Detalhes</button>
                    ${whatsappPhone ? `<a href="${whatsappLink}" target="_blank" style="margin-right: 5px; padding: 5px 10px; background: #25D366; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">📱 WhatsApp</a>` : ''}
                    ${data.address ? `<a href="${mapsLink}" target="_blank" style="padding: 5px 10px; background: #17a2b8; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">🗺️ Rota</a>` : ''}
                </div>
            </div>
        `;
        
        editingMarker.setPopupContent(popupContent);
    }
    
    // Fechar modal
    const modal = document.getElementById('location-correction-modal');
    if (modal) modal.remove();
    
    updateMapStatus('Correção salva com sucesso!');
    
    // Limpar dados temporários
    delete window.tempCorrectionData;
    editingMarker = null;
    editingClient = null;
}

function cancelLocationCorrection() {
    const data = window.tempCorrectionData;
    if (!data && editingMarker) {
        // Retornar marcador à posição original
        editingMarker.setLatLng([data.oldCoords.lat, data.oldCoords.lng]);
    }
    
    // Fechar modal
    const modal = document.getElementById('location-correction-modal');
    if (modal) modal.remove();
    
    // Limpar dados temporários
    delete window.tempCorrectionData;
    editingMarker = null;
    editingClient = null;
}

function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

async function loadMapData() {
    if (!map) return;
    
    updateMapStatus('Carregando localizações...');
    clearMarkers();
    
    const allClients = [];
    
    if (showInativos) {
        data.forEach(client => {
            allClients.push({...client, isAtivo: false});
        });
    }
    
    if (showAtivos) {
        ativos.forEach(client => {
            allClients.push({...client, isAtivo: true});
        });
    }
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let manualCount = 0;
    
    for (const client of allClients) {
        const address = getFullAddress(client);
        if (address) {
            const coords = await geocodeAddressEnhanced(address);
            if (coords) {
                const marker = createEditableMarker(coords, client, client.isAtivo);
                
                const whatsappPhone = client['Telefone Comercial'] || client.Celular || '';
                const whatsappMessage = `Olá ${client['Nome Fantasia'] || 'cliente'}!`;
                const whatsappLink = generateWhatsAppLink(whatsappPhone, whatsappMessage);
                const mapsLink = generateMapsLink(address);
                
                const confidence = coords.confidence ? `${Math.round(coords.confidence * 100)}%` : 'N/A';
                const provider = coords.provider || 'desconhecido';
                const validated = coords.validated ? '✅ Validado' : '⚠️ Não validado';
                
                if (coords.provider === 'manual_correction') {
                    manualCount++;
                }
                
                const popupContent = `
                    <div style="min-width: 240px;">
                        <h4>${client['Nome Fantasia'] || 'Sem Nome'}</h4>
                        <p><strong>Status:</strong> ${client.isAtivo ? 'Ativo' : 'Inativo'}</p>
                        <p><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
                        <p><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
                        <p><strong>Precisão:</strong> ${confidence}</p>
                        <p><strong>Método:</strong> ${provider}</p>
                        <p><strong>Validação:</strong> ${validated}</p>
                        ${coords.manuallyEdited ? '<p><strong>🎯 Corrigido pelo usuário</strong></p>' : ''}
                        <div style="margin-top: 10px;">
                            <button onclick="showDetailsFromMap('${client.id}')" style="margin-right: 5px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">Ver Detalhes</button>
                            ${whatsappPhone ? `<a href="${whatsappLink}" target="_blank" style="margin-right: 5px; padding: 5px 10px; background: #25D366; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">📱 WhatsApp</a>` : ''}
                            ${address ? `<a href="${mapsLink}" target="_blank" style="padding: 5px 10px; background: #17a2b8; color: white; text-decoration: none; border-radius: 3px; font-size: 12px;">🗺️ Rota</a>` : ''}
                        </div>
                    </div>
                `;
                
                marker.bindPopup(popupContent);
                markers.push(marker);
                successCount++;
            } else {
                errorCount++;
            }
            
            processedCount++;
            updateMapStatus(`Processando... ${processedCount}/${allClients.length}`);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    updateMapStatus(`${successCount} localizações (${manualCount} corrigidas, ${errorCount} falhas)`);
    
    if (markers.length > 0) {
        fitMapToMarkers();
    }
}

function showDetailsFromMap(clientId) {
    const client = [...data, ...ativos].find(c => c.id === clientId);
    if (client) {
        const isAtivo = ativos.includes(client);
        showDetails(client, isAtivo ? 'ativos' : 'inativos');
    }
}

function fitMapToMarkers() {
    if (markers.length === 0) return;
    
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
}

function toggleClientType(type) {
    if (type === 'inativos') {
        showInativos = !showInativos;
        document.getElementById('showInativos').classList.toggle('active', showInativos);
    } else if (type === 'ativos') {
        showAtivos = !showAtivos;
        document.getElementById('showAtivos').classList.toggle('active', showAtivos);
    }
    
    if (map) {
        loadMapData();
    }
}

// Função para visualizar correções manuais
function showManualCorrections() {
    console.log('📍 Correções Manuais:', manualCorrections);
    console.table(Object.entries(manualCorrections).map(([key, value]) => ({
        Endereço: value.originalAddress,
        Cliente: value.clientName,
        Latitude: value.lat,
        Longitude: value.lng,
        Data: new Date(value.date).toLocaleString('pt-BR')
    })));
}

// Função para remover correção específica
function removeManualCorrection(address) {
    const cacheKey = `manual_${address}`;
    if (manualCorrections[cacheKey]) {
        delete manualCorrections[cacheKey];
        localStorage.setItem('manualCorrections', JSON.stringify(manualCorrections));
        
        // Também remover do cache principal
        const enhancedCacheKey = `enhanced_${address}`;
        if (addressCache[enhancedCacheKey] && addressCache[enhancedCacheKey].manuallyEdited) {
            delete addressCache[enhancedCacheKey];
            localStorage.setItem('addressCache', JSON.stringify(addressCache));
        }
        
        console.log(`❌ Correção removida para: ${address}`);
        return true;
    }
    return false;
}

// Funções globais
window.initMap = initMap;
window.loadMapData = loadMapData;
window.toggleClientType = toggleClientType;
window.fitMapToMarkers = fitMapToMarkers;
window.showDetailsFromMap = showDetailsFromMap;
window.toggleEditMode = toggleEditMode;
window.confirmLocationCorrection = confirmLocationCorrection;
window.cancelLocationCorrection = cancelLocationCorrection;
window.showManualCorrections = showManualCorrections;
window.removeManualCorrection = removeManualCorrection;
