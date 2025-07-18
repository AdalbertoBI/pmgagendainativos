// map.js - Sistema de Geocodificação com APIs Reais
let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let includeInativos = false;
let precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };

// Configurações de APIs
const GEOCODING_CONFIG = {
    nominatim: {
        baseUrl: 'https://nominatim.openstreetmap.org/search',
        userAgent: 'ClienteManagerSJC-APIReal/1.0',
        delay: 1000 // 1 segundo entre requisições
    },
    viaCEP: {
        baseUrl: 'https://viacep.com.br/ws',
        delay: 500
    }
};

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa SJC com APIs reais...');
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 20
    }).addTo(map);
    
    loadCaches();
    updateMapStatus('Mapa SJC carregado - Sistema API Real ativado');
    
    setTimeout(() => {
        setupEditButton();
        setupIncludeInativosCheckbox();
        obterLocalizacaoUsuario();
    }, 500);
    
    console.log('✅ Mapa SJC inicializado com APIs reais');
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
                    const userMarker = L.marker([latitude, longitude], {
                        icon: createUserLocationIcon()
                    }).addTo(map);
                    userMarker.bindPopup('📍 Sua localização atual').openPopup();
                    
                    map.setView([latitude, longitude], 15);
                    updateMapStatus('Mapa centralizado na sua localização');
                }
            },
            error => {
                console.log('⚠️ Geolocalização não disponível:', error.message);
                updateMapStatus('Usando localização padrão - São José dos Campos');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }
}

// Criar ícone de localização do usuário
function createUserLocationIcon() {
    return L.divIcon({
        className: 'user-location-marker',
        html: `<div style="background: #4285f4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
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
    }
}

// Carregar dados do mapa com APIs reais
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
    
    const statusPrefix = includeInativos ? 'Geocodificando via API ativos + inativos' : 'Geocodificando via API apenas ativos';
    updateMapStatus(`${statusPrefix}: ${clientsToShow.length} clientes...`);
    
    precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };
    let loaded = 0;
    let batchSize = 1; // Processar um por vez para respeitar rate limits das APIs
    
    for (let i = 0; i < clientsToShow.length; i += batchSize) {
        const batch = clientsToShow.slice(i, i + batchSize);
        
        for (const client of batch) {
            try {
                const coords = await geocodificarClienteComAPIsReais(client);
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
            
            // Pausa entre requisições para respeitar rate limits
            await new Promise(resolve => setTimeout(resolve, GEOCODING_CONFIG.nominatim.delay));
        }
        
        const progress = Math.round((loaded / clientsToShow.length) * 100);
        updateMapStatus(`${statusPrefix}... ${progress}% (${loaded}/${clientsToShow.length})`);
    }
    
    const altaPrecisao = precisaoStats.total > 0 ? Math.round((precisaoStats.alta / precisaoStats.total) * 100) : 0;
    const ativosCount = ativos.length;
    const inativosCount = includeInativos ? inativos.length : 0;
    const totalCount = ativosCount + inativosCount;
    
    updateMapStatus(`APIs Reais: ${loaded}/${totalCount} clientes | ${altaPrecisao}% alta precisão (${ativosCount} ativos${includeInativos ? `, ${inativosCount} inativos` : ''})`);
    
    console.log('📊 Estatísticas APIs Reais:', {
        carregados: loaded,
        total: totalCount,
        altaPrecisao: `${altaPrecisao}%`,
        detalhes: precisaoStats
    });
}

// Geocodificar cliente com APIs reais
async function geocodificarClienteComAPIsReais(client) {
    console.log(`🌐 Geocodificando via APIs reais: ${client['Nome Fantasia']}`);
    
    // 1. Validar e formatar endereço
    let enderecoFormatado = null;
    if (window.AddressValidator) {
        const validacao = window.AddressValidator.validateAndCorrectAddress(client);
        enderecoFormatado = validacao.enderecoFormatado;
        console.log(`✅ Endereço validado e formatado para APIs`);
    }
    
    // 2. Normalizar dados
    const normalizedClient = window.AddressNormalizer ? 
        window.AddressNormalizer.normalizeClientData(client) : client;
    
    const address = getFullAddress(normalizedClient);
    if (!address) return null;
    
    // 3. Verificar correções manuais
    if (manualCorrections[address]) {
        console.log('📍 Usando correção manual');
        return manualCorrections[address];
    }
    
    // 4. Verificar cache
    if (addressCache[address]) {
        console.log('💾 Usando cache');
        return addressCache[address];
    }
    
    // 5. Geocodificar via CEP (ViaCEP + Nominatim)
    const coordsCEP = await geocodificarViaCEP(normalizedClient);
    if (coordsCEP && coordsCEP.confidence >= 0.7) {
        console.log('🏢 Geocodificação via CEP bem-sucedida');
        addressCache[address] = coordsCEP;
        salvarCache();
        return coordsCEP;
    }
    
    // 6. Geocodificar via endereço formatado (Nominatim)
    if (enderecoFormatado && enderecoFormatado.variacoes) {
        for (const endereco of enderecoFormatado.variacoes) {
            const coordsNominatim = await geocodificarNominatim(endereco);
            if (coordsNominatim && coordsNominatim.confidence >= 0.6) {
                console.log('🏠 Geocodificação via Nominatim bem-sucedida');
                addressCache[address] = coordsNominatim;
                salvarCache();
                return coordsNominatim;
            }
            
            // Pausa entre tentativas
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // 7. Fallback simples
    const fallback = await geocodificarFallback(normalizedClient);
    if (fallback) {
        console.log('🎯 Usando fallback via API');
        addressCache[address] = fallback;
        salvarCache();
        return fallback;
    }
    
    console.log('❌ Geocodificação via APIs falhou para:', address);
    return null;
}

// Geocodificar via ViaCEP
async function geocodificarViaCEP(client) {
    const cep = (client.CEP || '').replace(/\D/g, '');
    if (cep.length !== 8) return null;
    
    try {
        const response = await fetch(`${GEOCODING_CONFIG.viaCEP.baseUrl}/${cep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const cepData = await response.json();
        if (cepData.erro) throw new Error('CEP inválido');
        
        console.log('📮 Dados do CEP obtidos:', cepData);
        
        // Geocodificar o endereço do CEP via Nominatim
        const enderecoViaCEP = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
        const coordsNominatim = await geocodificarNominatim(enderecoViaCEP);
        
        if (coordsNominatim) {
            return {
                lat: coordsNominatim.lat,
                lng: coordsNominatim.lng,
                confidence: Math.min(coordsNominatim.confidence + 0.2, 1.0), // Bonus por ter CEP
                provider: 'ViaCEP+Nominatim',
                manuallyEdited: false,
                cepData: cepData
            };
        }
        
        return null;
    } catch (error) {
        console.log('Erro ao geocodificar CEP:', error.message);
        return null;
    }
}

// Geocodificar via Nominatim
async function geocodificarNominatim(endereco) {
    if (!endereco || endereco.length < 10) return null;
    
    try {
        const encodedAddress = encodeURIComponent(endereco);
        const url = `${GEOCODING_CONFIG.nominatim.baseUrl}?format=json&q=${encodedAddress}&limit=5&countrycodes=br&addressdetails=1`;
        
        console.log(`🌐 Consultando Nominatim: ${endereco}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': GEOCODING_CONFIG.nominatim.userAgent
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (!data || data.length === 0) {
            console.log('❌ Nenhum resultado encontrado no Nominatim');
            return null;
        }
        
        // Filtrar resultados brasileiros
        const brazilResults = data.filter(result => {
            const address = result.address || {};
            return address.country_code === 'br' || 
                   (address.country && address.country.toLowerCase().includes('brasil'));
        });
        
        const results = brazilResults.length > 0 ? brazilResults : data;
        
        // Buscar o melhor resultado
        let bestResult = null;
        let bestScore = 0;
        
        results.forEach(result => {
            const score = calcularScoreNominatim(result, endereco);
            if (score > bestScore) {
                bestScore = score;
                bestResult = result;
            }
        });
        
        if (bestResult) {
            const coords = {
                lat: parseFloat(bestResult.lat),
                lng: parseFloat(bestResult.lon)
            };
            
            // Validar se está no Brasil
            if (coords.lat < -35 || coords.lat > 5 || coords.lng < -75 || coords.lng > -30) {
                console.log('⚠️ Coordenadas fora do Brasil:', coords);
                return null;
            }
            
            const confidence = Math.min(bestScore, 1.0);
            
            console.log(`✅ Nominatim encontrou coordenadas: ${coords.lat}, ${coords.lng} (${Math.round(confidence * 100)}% confiança)`);
            
            return {
                lat: coords.lat,
                lng: coords.lng,
                confidence: confidence,
                provider: 'Nominatim',
                manuallyEdited: false,
                details: bestResult.address,
                display_name: bestResult.display_name
            };
        }
        
        return null;
    } catch (error) {
        console.error('Erro Nominatim:', error);
        return null;
    }
}

// Calcular score do resultado Nominatim
function calcularScoreNominatim(result, endereco) {
    let score = 0.3; // Base score
    
    // Verificar tipo de lugar
    const placeType = result.type;
    if (placeType === 'house' || placeType === 'building') score += 0.4;
    else if (placeType === 'street' || placeType === 'road') score += 0.3;
    else if (placeType === 'neighbourhood' || placeType === 'suburb') score += 0.2;
    else if (placeType === 'city' || placeType === 'town') score += 0.1;
    
    // Verificar importância
    const importance = parseFloat(result.importance) || 0;
    score += importance * 0.2;
    
    // Verificar detalhes do endereço
    const address = result.address || {};
    if (address.house_number) score += 0.1;
    if (address.road) score += 0.05;
    if (address.neighbourhood || address.suburb) score += 0.05;
    if (address.city || address.town) score += 0.05;
    if (address.state) score += 0.05;
    
    // Verificar se contém palavras do endereço original
    const displayName = (result.display_name || '').toLowerCase();
    const enderecoWords = endereco.toLowerCase().split(/[,\s]+/);
    let wordMatches = 0;
    enderecoWords.forEach(word => {
        if (word.length > 3 && displayName.includes(word)) {
            wordMatches++;
        }
    });
    score += (wordMatches / enderecoWords.length) * 0.2;
    
    return score;
}

// Geocodificar fallback
async function geocodificarFallback(client) {
    const cidade = client.Cidade || 'São José dos Campos';
    const uf = client.UF || 'SP';
    
    const enderecoFallback = `${cidade}, ${uf}, Brasil`;
    
    console.log(`🎯 Tentando fallback: ${enderecoFallback}`);
    
    const coords = await geocodificarNominatim(enderecoFallback);
    if (coords) {
        return {
            lat: coords.lat,
            lng: coords.lng,
            confidence: Math.min(coords.confidence * 0.5, 0.5), // Reduzir confiança para fallback
            provider: 'Fallback-API',
            manuallyEdited: false
        };
    }
    
    return null;
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
    const symbol = isManual ? '📍' : 
                   confidence >= 0.8 ? '✓' : 
                   confidence >= 0.6 ? '~' : '?';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: ${color};
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">${symbol}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
}

// Criar conteúdo do popup
function createPopupContent(client, coords, isManuallyEdited, isAtivo) {
    const statusText = isAtivo ? '🟢 Ativo' : '🔴 Inativo';
    const confidenceText = Math.round(coords.confidence * 100);
    const providerText = coords.provider || 'N/A';
    
    const address = getFullAddress(client);
    
    return `
        <div style="min-width: 280px;">
            <h4>${client['Nome Fantasia'] || 'Cliente'}</h4>
            <p><strong>Status:</strong> ${statusText}</p>
            <p><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p><strong>Bairro:</strong> ${client.Bairro || 'N/A'}</p>
            <p><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${address}</p>
            <p><strong>Precisão API:</strong> ${confidenceText}%</p>
            ${isManuallyEdited ? '<p><strong>✅ Corrigido manualmente</strong></p>' : ''}
            <p><strong>Fonte:</strong> ${providerText}</p>
            <p><strong>Coordenadas:</strong> ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</p>
            ${coords.display_name ? `<p><strong>Local:</strong> ${coords.display_name.substring(0, 100)}...</p>` : ''}
        </div>
    `;
}

// Obter endereço completo
function getFullAddress(client) {
    const parts = [
        client.Endereco || '',
        client.Numero || '',
        client.Bairro || '',
        client.Cidade || '',
        client.UF || ''
    ].filter(p => p && p.trim());
    
    return parts.join(', ');
}

// Limpar marcadores
function clearMarkers() {
    markers.forEach(marker => {
        if (marker) {
            map.removeLayer(marker);
        }
    });
    markers = [];
}

// Carregar caches
function loadCaches() {
    if (window.dbManager) {
        addressCache = window.dbManager.loadAddressCache();
        manualCorrections = window.dbManager.loadManualCorrections();
    }
}

// Salvar cache
function salvarCache() {
    if (window.dbManager) {
        window.dbManager.saveAddressCache(addressCache);
    }
}

// Atualizar status do mapa
function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('🗺️ Status:', message);
}

// Disponibilizar funções globalmente
window.initMap = initMap;
window.loadMapData = loadMapData;
window.setupEditButton = setupEditButton;

console.log('✅ map.js API Real carregado - Sistema 100% baseado em APIs');
