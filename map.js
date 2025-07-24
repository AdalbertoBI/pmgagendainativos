// map.js - Versão otimizada com consulta sequencial de APIs

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let includeInativos = false;
let precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };
let lastApiCallTime = 0; // Controle de taxa global

// Padrões de CEP por estado para validação
const PADROES_CEP = {
    'SP': { inicio: '01000', fim: '19999' },
    'RJ': { inicio: '20000', fim: '28999' },
    'MG': { inicio: '30000', fim: '39999' },
    'BA': { inicio: '40000', fim: '48999' },
    'PR': { inicio: '80000', fim: '87999' },
    'RS': { inicio: '90000', fim: '99999' },
    'SC': { inicio: '88000', fim: '89999' },
    'GO': { inicio: '72800', fim: '76999' },
    'MT': { inicio: '78000', fim: '78899' },
    'MS': { inicio: '79000', fim: '79999' },
    'DF': { inicio: '70000', fim: '72799' }
};

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa com precisão otimizada...');
    
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 12);
    
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
    
    console.log('✅ Mapa inicializado com sistema de precisão otimizado');
}

// Configurar checkbox "Incluir inativos"
function setupIncludeInativosCheckbox() {
    const checkbox = document.getElementById('include-inativos-checkbox');
    if (!checkbox) return;
    
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
                    map.setView([latitude, longitude], 14);
                    
                    const userMarker = L.marker([latitude, longitude], {
                        icon: createUserLocationIcon()
                    }).addTo(map);
                    
                    userMarker.bindPopup('📍 Sua localização atual').openPopup();
                    updateMapStatus('Mapa centralizado na sua localização');
                }
            },
            error => {
                console.log('⚠️ Geolocalização não disponível:', error.message);
                updateMapStatus('Usando localização padrão');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
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
                background: linear-gradient(45deg, #4285f4, #34a853);
                width: 18px; 
                height: 18px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);
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
        iconSize: [24, 24],
        iconAnchor: [12, 12]
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
    
    if (confirm(`Confirmar correção para "${clientName}"?\n\nNova posição:\nLat: ${newLatLng.lat.toFixed(6)}\nLng: ${newLatLng.lng.toFixed(6)}`)) {
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

// Carregar dados do mapa com processamento otimizado
async function loadMapData() {
    if (!map) return;
    
    clearMarkers();
    
    const ativos = window.ativos || [];
    const inativos = window.data || [];
    
    let clientsToShow = ativos.slice();
    if (includeInativos) {
        clientsToShow = clientsToShow.concat(inativos);
    }
    
    if (clientsToShow.length === 0) {
        updateMapStatus('Nenhum cliente encontrado para exibir');
        return;
    }
    
    const statusPrefix = includeInativos ? 'Geocodificando ativos + inativos' : 'Geocodificando apenas ativos';
    updateMapStatus(`${statusPrefix}: ${clientsToShow.length} clientes...`);
    
    precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };
    
    let loaded = 0;
    for (const client of clientsToShow) {
        try {
            const coords = await geocodificarClienteComMaximaPrecisao(client);
            if (coords) {
                const marker = createEditableMarker(coords, client);
                markers.push(marker);
                loaded++;
                
                precisaoStats.total++;
                if (coords.confidence >= 0.8) precisaoStats.alta++;
                else if (coords.confidence >= 0.6) precisaoStats.media++;
                else precisaoStats.baixa++;
            }
        } catch (error) {
            console.error('Erro ao processar cliente:', client['Nome Fantasia'], error);
        }
        
        // Atualizar progresso
        const progress = Math.round((loaded / clientsToShow.length) * 100);
        updateMapStatus(`${statusPrefix}... ${progress}% (${loaded}/${clientsToShow.length})`);
        
        // Controle de taxa: esperar pelo menos 1 segundo desde a última chamada
        const now = Date.now();
        const timeSinceLastCall = now - lastApiCallTime;
        if (timeSinceLastCall < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
        }
        lastApiCallTime = Date.now();
    }
    
    const altaPrecisao = precisaoStats.total > 0 ? Math.round((precisaoStats.alta / precisaoStats.total) * 100) : 0;
    const ativosCount = ativos.length;
    const inativosCount = includeInativos ? inativos.length : 0;
    const totalCount = ativosCount + inativosCount;
    
    updateMapStatus(`${loaded}/${totalCount} clientes | ${altaPrecisao}% alta precisão (${ativosCount} ativos${includeInativos ? `, ${inativosCount} inativos` : ''})`);
    
    console.log('📊 Estatísticas finais:', {
        carregados: loaded,
        total: totalCount,
        altaPrecisao: `${altaPrecisao}%`,
        detalhes: precisaoStats
    });
}

// Geocodificar cliente com máxima precisão usando APIs sequencialmente
async function geocodificarClienteComMaximaPrecisao(client) {
    const address = getFullAddress(client);
    if (!address) return null;
    
    console.log(`🔍 Geocodificando: ${client['Nome Fantasia']} - ${address}`);
    
    // 1. Verificar correções manuais (prioridade máxima)
    if (manualCorrections[address]) {
        console.log('📍 Usando correção manual');
        return manualCorrections[address];
    }
    
    // 2. Verificar cache de alta qualidade
    if (addressCache[address] && addressCache[address].confidence >= 0.8) {
        console.log('💾 Usando cache de alta qualidade');
        return addressCache[address];
    }
    
    // 3. Geocodificação por CEP usando ViaCEP
    const cep = (client.CEP || '').replace(/\D/g, '');
    if (cep.length === 8) {
        const cepData = await geocodificarPorCEP(cep);
        if (cepData && !cepData.erro) {
            const enderecoCompleto = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
            const coordsNominatim = await geocodificarNominatimOtimizado(enderecoCompleto);
            if (coordsNominatim && validarCoordenadas(coordsNominatim, client)) {
                console.log('🏠 Geocodificação por Nominatim a partir de ViaCEP bem-sucedida');
                addressCache[address] = coordsNominatim;
                salvarCache();
                return coordsNominatim;
            }
        }
    }
    
    // 4. Geocodificação por endereço completo com Nominatim
    const coordsEndereco = await geocodificarEnderecoCompleto(client);
    if (coordsEndereco && validarCoordenadas(coordsEndereco, client)) {
        console.log('🏠 Geocodificação por Nominatim bem-sucedida');
        addressCache[address] = coordsEndereco;
        salvarCache();
        return coordsEndereco;
    }
    
    // 5. Fallback com Geonames
    const coordsGeonames = await geocodificarComGeonames(address, client.Cidade, client.UF);
    if (coordsGeonames && validarCoordenadas(coordsGeonames, client)) {
        console.log('🌍 Geocodificação por Geonames bem-sucedida');
        addressCache[address] = coordsGeonames;
        salvarCache();
        return coordsGeonames;
    }
    
    console.log('❌ Geocodificação falhou para:', address);
    return null;
}

// Geocodificar por CEP usando ViaCEP
async function geocodificarPorCEP(cep) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            timeout: 5000
        });
        
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.log('Erro ao geocodificar CEP:', error.message);
        return { erro: true };
    }
}

// Geocodificar por endereço completo com controle de taxa
async function geocodificarEnderecoCompleto(client) {
    const variacoes = criarVariacoesEndereco(client);
    
    for (const endereco of variacoes) {
        try {
            const coords = await geocodificarNominatimOtimizado(endereco);
            if (coords && validarCoordenadas(coords, client)) {
                return coords;
            }
        } catch (error) {
            console.log('Tentando próxima variação...', error);
        }
        
        // Controle de taxa: esperar 1 segundo
        const now = Date.now();
        const timeSinceLastCall = now - lastApiCallTime;
        if (timeSinceLastCall < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
        }
        lastApiCallTime = now;
    }
    
    return null;
}

// Geocodificar com Nominatim otimizado com controle de taxa
async function geocodificarNominatimOtimizado(endereco) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastCall));
    }
    lastApiCallTime = now;

    try {
        const encodedAddress = encodeURIComponent(endereco);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ClienteManager/3.0 (contato@empresa.com)'
            },
            timeout: 5000
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const confidence = calcularConfiancaDetalhada(result, endereco);
            
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                confidence: confidence,
                provider: 'Nominatim-Otimizado',
                manuallyEdited: false,
                details: result.address
            };
        }
    } catch (error) {
        console.error('Erro Nominatim otimizado:', error);
    }
    
    return null;
}

// Nova função: geocodificação usando Geonames (pública, sem API key)
async function geocodificarComGeonames(address, cidade, uf) {
    try {
        const cidadeLimpa = (cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '');
        if (!cidadeLimpa) return null;
        const res = await fetch(`https://secure.geonames.org/searchJSON?name_equals=${encodeURIComponent(cidadeLimpa)}&country=BR&maxRows=1`);
        if (res.ok) {
            const data = await res.json();
            if (data.geonames && data.geonames.length > 0) {
                return {
                    lat: parseFloat(data.geonames[0].lat),
                    lng: parseFloat(data.geonames[0].lng),
                    confidence: 0.7,
                    provider: 'Geonames',
                    manuallyEdited: false
                };
            }
        }
    } catch (error) {}
    return null;
}

// Calcular confiança detalhada
function calcularConfiancaDetalhada(result, endereco) {
    let confidence = 0.5;
    const placeType = result.type;
    if (placeType === 'house' || placeType === 'building') confidence += 0.4;
    else if (placeType === 'street' || placeType === 'road') confidence += 0.3;
    else if (placeType === 'neighbourhood') confidence += 0.2;
    else if (placeType === 'city' || placeType === 'town') confidence += 0.1;
    
    const importance = parseFloat(result.importance) || 0;
    confidence += importance * 0.3;
    
    const address = result.address || {};
    if (address.house_number) confidence += 0.15;
    if (address.road) confidence += 0.1;
    if (address.neighbourhood) confidence += 0.05;
    if (address.city || address.town) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
}

// Validar coordenadas com verificação rigorosa
function validarCoordenadas(coords, client) {
    if (coords.lat < -35 || coords.lat > 5 || coords.lng < -75 || coords.lng > -30) {
        console.log('⚠️ Coordenadas fora do Brasil:', coords);
        return false;
    }
    
    const estado = (client.UF || '').toUpperCase();
    const boundingBoxes = {
        'SP': { minLat: -25.3, maxLat: -19.8, minLng: -53.1, maxLng: -44.2 },
        'RJ': { minLat: -23.4, maxLat: -20.8, minLng: -45.1, maxLng: -40.9 },
        'MG': { minLat: -22.9, maxLat: -14.2, minLng: -51.0, maxLng: -39.9 },
        'BA': { minLat: -18.3, maxLat: -8.5, minLng: -46.6, maxLng: -37.3 },
        'PR': { minLat: -26.7, maxLat: -22.5, minLng: -54.6, maxLng: -48.0 },
        'RS': { minLat: -33.7, maxLat: -27.1, minLng: -57.6, maxLng: -49.7 },
        'SC': { minLat: -29.4, maxLat: -25.9, minLng: -53.8, maxLng: -48.3 },
        'GO': { minLat: -19.5, maxLat: -12.4, minLng: -53.2, maxLng: -45.9 },
        'MS': { minLat: -24.1, maxLat: -17.7, minLng: -58.2, maxLng: -51.0 }
    };
    
    const box = boundingBoxes[estado];
    if (box && (coords.lat < box.minLat || coords.lat > box.maxLat || coords.lng < box.minLng || coords.lng > box.maxLng)) {
        console.log('⚠️ Coordenadas incompatíveis com o estado:', coords, estado);
        return false;
    }
    
    return true;
}

// Criar variações de endereço
function criarVariacoesEndereco(client) {
    const endereco = (client.Endereco || '').trim();
    const numero = (client.Numero || '').trim();
    const bairro = (client.Bairro || '').trim();
    const cidade = (client.Cidade || '').trim();
    const uf = (client.UF || '').trim().toUpperCase();
    const cep = (client.CEP || '').replace(/\D/g, '');
    
    if (!cidade) return [];
    
    return [
        `${endereco}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil`,
        `${endereco}, ${bairro}, ${cidade}, ${uf}, Brasil`,
        `${endereco}, ${cidade}, ${uf}, Brasil`,
        `${bairro}, ${cidade}, ${uf}, Brasil`,
        `${cidade}, ${uf}, Brasil`,
        `${cep}, Brasil`
    ].filter(addr => addr.length > 10);
}

// Criar marcador editável
function createEditableMarker(coords, client) {
    const isManuallyEdited = coords.manuallyEdited || false;
    const isAtivo = (window.ativos || []).some(c => c.id === client.id);
    
    let color;
    if (isManuallyEdited) {
        color = 'blue';
    } else if (isAtivo) {
        color = getColorByConfidence(coords.confidence);
    } else {
        color = 'gray';
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

// Obter cor baseada na confiança
function getColorByConfidence(confidence) {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'orange';
    return 'red';
}

// Criar ícone do marcador
function createMarkerIcon(color, confidence, isManual, isAtivo) {
    const symbol = isManual ? '📍' : confidence >= 0.8 ? '✓' : confidence >= 0.6 ? '~' : '?';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${color}; 
                width: 26px; 
                height: 26px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                opacity: ${isAtivo ? '1' : '0.85'};
                transition: all 0.2s ease;
            ">
                ${symbol}
            </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
    });
}

// Criar conteúdo do popup
function createPopupContent(client, coords, isManuallyEdited, isAtivo) {
    const address = getFullAddress(client);
    const providerText = coords.provider || 'Desconhecido';
    const confidenceText = Math.round(coords.confidence * 100);
    const statusText = isAtivo ? 'Ativo' : 'Inativo';
    const statusColor = isAtivo ? '#28a745' : '#6c757d';
    
    return `
        <div style="max-width: 280px; font-family: Arial, sans-serif; line-height: 1.4;">
            <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold;">
                ${client['Nome Fantasia'] || 'Sem Nome'}
            </h4>
            <p style="margin: 6px 0; font-size: 13px;">
                <strong>Status:</strong> 
                <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Endereço:</strong> ${address}</p>
            <p style="margin: 6px 0; font-size: 13px;">
                <strong>Precisão:</strong> 
                <span style="color: ${confidenceText >= 80 ? '#28a745' : confidenceText >= 60 ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                    ${confidenceText}%
                </span>
            </p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Método:</strong> ${providerText}</p>
            ${isManuallyEdited ? 
                '<p style="margin: 6px 0; font-size: 13px; color: #2196F3; font-weight: bold;">✅ Corrigido manualmente</p>' : 
                ''
            }
            <div style="text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">
                <small style="color: #666; font-size: 12px; font-style: italic;">Clique para ver detalhes completos</small>
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

console.log('✅ map.js carregado - Versão com consulta sequencial de APIs');