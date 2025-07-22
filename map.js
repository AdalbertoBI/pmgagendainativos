// map.js - Versão com precisão de geocodificação restaurada e otimizada

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let includeInativos = false;
let precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };

// Coordenadas precisas das principais cidades brasileiras (expandidas)
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
    let batchSize = 3; // Reduzido para melhor controle
    
    for (let i = 0; i < clientsToShow.length; i += batchSize) {
        const batch = clientsToShow.slice(i, i + batchSize);
        
        const promises = batch.map(async client => {
            try {
                const coords = await geocodificarClienteComMaximaPrecisao(client);
                if (coords) {
                    const marker = createEditableMarker(coords, client);
                    markers.push(marker);
                    loaded++;
                    
                    // Estatísticas de precisão
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
        
        // Pausa entre lotes para não sobrecarregar APIs
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Estatísticas finais
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

// Geocodificar cliente com máxima precisão - SISTEMA OTIMIZADO
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
    
    // 3. Geocodificação por CEP (mais precisa)
    const coordsPorCEP = await geocodificarPorCEP(client);
    if (coordsPorCEP && coordsPorCEP.confidence >= 0.8) {
        console.log('🏢 Geocodificação por CEP bem-sucedida');
        addressCache[address] = coordsPorCEP;
        salvarCache();
        return coordsPorCEP;
    }
    
    // 4. Geocodificação por endereço completo melhorada
    const coordsEndereco = await geocodificarEnderecoCompleto(client);
    if (coordsEndereco && coordsEndereco.confidence >= 0.7) {
        console.log('🏠 Geocodificação por endereço bem-sucedida');
        addressCache[address] = coordsEndereco;
        salvarCache();
        return coordsEndereco;
    }
    
    // 5. Geocodificação por cidade precisa
    const coordsCidade = obterCoordenadasCidadePrecisa(client);
    if (coordsCidade) {
        console.log('🏙️ Usando coordenadas precisas da cidade');
        addressCache[address] = coordsCidade;
        salvarCache();
        return coordsCidade;
    }
    
    // 6. Fallback otimizado
    const fallback = obterFallbackOtimizado(client);
    if (fallback) {
        console.log('🎯 Usando fallback otimizado');
        addressCache[address] = fallback;
        salvarCache();
        return fallback;
    }
    
    console.log('❌ Geocodificação falhou para:', address);
    return null;
}async function geocodificarClienteComMaximaPrecisao(client) {
    const address = getFullAddress(client);
    if (!address) return null;
    // 1. Correção manual
    if (manualCorrections[address]) return manualCorrections[address];
    // 2. Cache
    if (addressCache[address] && addressCache[address].confidence >= 0.8)
        return addressCache[address];
    // 3. Nominatim com mais variações
    const variacoes = criarVariacoesEndereco(client);
    for (const endereco of variacoes) {
        try {
            const coords = await geocodificarNominatimOtimizado(endereco);
            if (coords && validarCoordenadas(coords, client)) {
                addressCache[address] = coords; salvarCache();
                return coords;
            }
        } catch (error) { }
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    // 4. Consulta Geonames (sem chave)
    const geonamesCoords = await geocodificarComGeonames(address, client['Cidade'], client['UF']);
    if (geonamesCoords && validarCoordenadas(geonamesCoords, client)) {
        addressCache[address] = geonamesCoords; salvarCache();
        return geonamesCoords;
    }
    // 5. CEP e cidade/estado fallback — como já existia
    const coordsPorCEP = await geocodificarPorCEP(client);
    if (coordsPorCEP && coordsPorCEP.confidence >= 0.8) {
        addressCache[address] = coordsPorCEP; salvarCache();
        return coordsPorCEP;
    }
    const coordsCidade = obterCoordenadasCidadePrecisa(client);
    if (coordsCidade) {
        addressCache[address] = coordsCidade; salvarCache();
        return coordsCidade;
    }
    const fallback = obterFallbackOtimizado(client);
    if (fallback) {
        addressCache[address] = fallback; salvarCache();
        return fallback;
    }
    return null;
}

// Nova função: geocodificação usando Geonames (pública, sem API key)
async function geocodificarComGeonames(address, cidade, uf) {
    try {
        const cidadeLimpa = (cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '');
        if (!cidadeLimpa) return null;
        const url = `https://www.geonames.org/search.html?q=${encodeURIComponent(cidadeLimpa + ' ' + (uf || ''))}&country=BR`;
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
    } catch (error) { }
    return null;
}

// Geocodificar por CEP usando ViaCEP
async function geocodificarPorCEP(client) {
    const cep = (client.CEP || '').replace(/\D/g, '');
    if (cep.length !== 8) return null;
    
    // Validar CEP por estado
    const estado = (client.UF || '').toUpperCase();
    if (!validarCEPPorEstado(cep, estado)) {
        console.log('⚠️ CEP inválido para o estado:', cep, estado);
        return null;
    }
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            timeout: 5000
        });
        
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const data = await response.json();
        if (data.erro) throw new Error('CEP inválido');
        
        // Usar coordenadas estimadas baseadas no CEP
        const coordsEstimadas = await estimarCoordenadasPorCEP(data);
        if (coordsEstimadas) {
            return {
                lat: coordsEstimadas.lat,
                lng: coordsEstimadas.lng,
                confidence: 0.85,
                provider: 'ViaCEP',
                manuallyEdited: false,
                cepData: data
            };
        }
    } catch (error) {
        console.log('Erro ao geocodificar CEP:', error.message);
    }
    
    return null;
}

// Validar CEP por estado
function validarCEPPorEstado(cep, estado) {
    const padrao = PADROES_CEP[estado];
    if (!padrao) return true;
    
    const cepNum = parseInt(cep);
    const inicioNum = parseInt(padrao.inicio);
    const fimNum = parseInt(padrao.fim);
    
    return cepNum >= inicioNum && cepNum <= fimNum;
}

// Estimar coordenadas por CEP com maior precisão
async function estimarCoordenadasPorCEP(cepData) {
    const cidade = cepData.localidade?.toUpperCase();
    const bairro = cepData.bairro || '';
    const logradouro = cepData.logradouro || '';
    
    // Tentar geocodificar o endereço específico primeiro
    if (logradouro && cidade) {
        const enderecoCompleto = `${logradouro}, ${bairro}, ${cidade}, ${cepData.uf}`;
        const coordsEspecificas = await geocodificarNominatimOtimizado(enderecoCompleto);
        if (coordsEspecificas && coordsEspecificas.confidence >= 0.7) {
            return coordsEspecificas;
        }
    }
    
    // Usar coordenadas da cidade como base
    const coordsCidade = COORDENADAS_PRECISAS[cidade];
    if (!coordsCidade) return null;
    
    // Adicionar variação baseada no bairro
    const variacao = calcularVariacaoPorBairro(bairro, logradouro);
    
    return {
        lat: coordsCidade.lat + variacao.lat,
        lng: coordsCidade.lng + variacao.lng
    };
}

// Calcular variação por bairro com melhor distribuição
function calcularVariacaoPorBairro(bairro, logradouro) {
    const seed = (bairro + logradouro).toLowerCase().replace(/\s/g, '');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
    }
    
    // Variação mais realista (até 3km do centro)
    const variacao = {
        lat: ((hash % 600) - 300) * 0.0001, // ±0.03 grau ≈ 3km
        lng: ((hash % 800) - 400) * 0.0001  // ±0.04 grau ≈ 3km
    };
    
    return variacao;
}

// Geocodificar endereço completo com melhorias
async function geocodificarEnderecoCompleto(client) {
    const variacoes = criarVariacoesEndereco(client);
    
    for (const endereco of variacoes) {
        try {
            const coords = await geocodificarNominatimOtimizado(endereco);
            if (coords && validarCoordenadas(coords, client)) {
                return coords;
            }
        } catch (error) {
            console.log('Tentando próxima variação...');
        }
        
        // Pausa pequena entre tentativas
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
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

// Geocodificar com Nominatim otimizado
async function geocodificarNominatimOtimizado(endereco) {
    try {
        const encodedAddress = encodeURIComponent(endereco);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ClienteManager/3.0 (contato@empresa.com)'
            }
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

// Calcular confiança detalhada
function calcularConfiancaDetalhada(result, endereco) {
    let confidence = 0.5; // Base
    
    // Verificar tipo de lugar
    const placeType = result.type;
    if (placeType === 'house' || placeType === 'building') confidence += 0.4;
    else if (placeType === 'street' || placeType === 'road') confidence += 0.3;
    else if (placeType === 'neighbourhood') confidence += 0.2;
    else if (placeType === 'city' || placeType === 'town') confidence += 0.1;
    
    // Verificar importância
    const importance = parseFloat(result.importance) || 0;
    confidence += importance * 0.3;
    
    // Verificar detalhes do endereço
    const address = result.address || {};
    if (address.house_number) confidence += 0.15;
    if (address.road) confidence += 0.1;
    if (address.neighbourhood) confidence += 0.05;
    if (address.city || address.town) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
}

// Validar coordenadas com verificação rigorosa
function validarCoordenadas(coords, client) {
    // Verificar se está no Brasil
    if (coords.lat < -35 || coords.lat > 5 || coords.lng < -75 || coords.lng > -30) {
        console.log('⚠️ Coordenadas fora do Brasil:', coords);
        return false;
    }
    
    // Verificar se está no estado correto
    const estado = (client.UF || '').toUpperCase();
    if (!validarCoordenadasPorEstado(coords, estado)) {
        console.log('⚠️ Coordenadas incompatíveis com o estado:', coords, estado);
        return false;
    }
    
    return true;
}

// Validar coordenadas por estado
function validarCoordenadasPorEstado(coords, estado) {
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
    if (!box) return true;
    
    return coords.lat >= box.minLat && coords.lat <= box.maxLat &&
           coords.lng >= box.minLng && coords.lng <= box.maxLng;
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
            confidence: 0.7,
            provider: 'Cidade-Precisa',
            manuallyEdited: false
        };
    }
    
    // Buscar por similaridade
    for (const cidadeKey in COORDENADAS_PRECISAS) {
        const similarity = calcularSimilaridade(cidade, cidadeKey);
        if (similarity > 0.8) {
            const coords = COORDENADAS_PRECISAS[cidadeKey];
            const variacao = obterVariacaoParaCliente(client);
            
            return {
                lat: coords.lat + variacao.lat,
                lng: coords.lng + variacao.lng,
                confidence: 0.6,
                provider: 'Cidade-Similar',
                manuallyEdited: false
            };
        }
    }
    
    return null;
}

// Calcular similaridade entre strings
function calcularSimilaridade(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

// Distância de Levenshtein
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Obter variação para cliente
function obterVariacaoParaCliente(client) {
    const clientId = client.id || client['Nome Fantasia'] || 'default';
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
        hash = ((hash << 5) - hash + clientId.charCodeAt(i)) & 0xffffffff;
    }
    
    // Variação pequena para evitar sobreposição
    return {
        lat: ((hash % 200) - 100) * 0.00003, // ±0.003 grau ≈ 300m
        lng: ((hash % 300) - 150) * 0.00003  // ±0.0045 grau ≈ 300m
    };
}

// Obter fallback otimizado
function obterFallbackOtimizado(client) {
    const estado = (client.UF || '').toUpperCase().trim();
    
    // Coordenadas centrais dos estados (precisas)
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
        'DF': { lat: -15.7941, lng: -47.8825 },
        'PE': { lat: -8.0476, lng: -34.8770 },
        'CE': { lat: -3.7319, lng: -38.5267 },
        'PB': { lat: -7.1195, lng: -34.8450 },
        'RN': { lat: -5.7945, lng: -35.2110 },
        'AL': { lat: -9.6476, lng: -35.7175 },
        'SE': { lat: -10.9472, lng: -37.0731 },
        'PI': { lat: -5.0892, lng: -42.8019 },
        'MA': { lat: -2.5307, lng: -44.3068 },
        'PA': { lat: -1.4558, lng: -48.4902 },
        'AM': { lat: -3.1190, lng: -60.0217 },
        'RR': { lat: 2.8235, lng: -60.6758 },
        'AP': { lat: 0.0389, lng: -51.0664 },
        'TO': { lat: -10.1689, lng: -48.3317 },
        'AC': { lat: -9.9754, lng: -67.8249 },
        'RO': { lat: -8.7619, lng: -63.9039 },
        'ES': { lat: -20.2976, lng: -40.2958 }
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
    
    // Fallback final - São Paulo
    return {
        lat: -23.5505,
        lng: -46.6333,
        confidence: 0.3,
        provider: 'Brasil-Fallback',
        manuallyEdited: false
    };
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

console.log('✅ map.js carregado - Versão com precisão otimizada e restaurada');
