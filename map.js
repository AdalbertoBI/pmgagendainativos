// map.js - Sistema de Geocodificação com APIs Reais - VERSÃO OTIMIZADA COMPLETA

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;
let includeInativos = false;
let precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };

// Configurações de APIs otimizadas
const GEOCODING_CONFIG = {
    nominatim: {
        baseUrl: 'https://nominatim.openstreetmap.org/search',
        userAgent: 'ClienteManagerSJC-Ultra/2.0 (sjc@empresa.com)',
        delay: 1200, // Respeitando rate limit
        maxRetries: 3
    },
    viaCEP: {
        baseUrl: 'https://viacep.com.br/ws',
        delay: 300,
        maxRetries: 2
    },
    // API de backup (opcional)
    opencage: {
        baseUrl: 'https://api.opencagedata.com/geocode/v1/json',
        apiKey: '', // Adicionar chave se disponível
        delay: 1000
    }
};

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa SJC com APIs reais otimizadas...');
    if (map) return;
    
    map = L.map('map').setView([-23.2237, -45.9009], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 20
    }).addTo(map);
    
    loadCaches();
    updateMapStatus('Mapa SJC carregado - Sistema API Real Otimizado ativado');
    
    setTimeout(() => {
        setupEditButton();
        setupIncludeInativosCheckbox();
        obterLocalizacaoUsuario();
    }, 500);
    
    console.log('✅ Mapa SJC inicializado com APIs reais otimizadas');
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
        html: `<div style="background: #4285f4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); animation: pulse 2s infinite;"></div>
               <style>@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(66, 133, 244, 0); } 100% { box-shadow: 0 0 0 0 rgba(66, 133, 244, 0); } }</style>`,
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

// Carregar dados do mapa com estratégia otimizada
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
    
    const statusPrefix = includeInativos ? 'Geocodificando via API (ativos + inativos)' : 'Geocodificando via API (apenas ativos)';
    updateMapStatus(`${statusPrefix}: ${clientsToShow.length} clientes...`);
    
    precisaoStats = { total: 0, alta: 0, media: 0, baixa: 0 };
    let loaded = 0;
    let batchSize = 2; // Processar em lotes pequenos para otimizar
    
    for (let i = 0; i < clientsToShow.length; i += batchSize) {
        const batch = clientsToShow.slice(i, i + batchSize);
        
        const promises = batch.map(async client => {
            try {
                const coords = await geocodificarClienteOtimizado(client);
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
        });
        
        await Promise.all(promises);
        
        // Pausa entre lotes para respeitar rate limits
        await new Promise(resolve => setTimeout(resolve, GEOCODING_CONFIG.nominatim.delay));
        
        const progress = Math.round((loaded / clientsToShow.length) * 100);
        updateMapStatus(`${statusPrefix}... ${progress}% (${loaded}/${clientsToShow.length})`);
    }
    
    const altaPrecisao = precisaoStats.total > 0 ? Math.round((precisaoStats.alta / precisaoStats.total) * 100) : 0;
    const ativosCount = ativos.length;
    const inativosCount = includeInativos ? inativos.length : 0;
    const totalCount = ativosCount + inativosCount;
    
    updateMapStatus(`✅ APIs Reais: ${loaded}/${totalCount} clientes | ${altaPrecisao}% alta precisão (${ativosCount} ativos${includeInativos ? `, ${inativosCount} inativos` : ''})`);
    
    console.log('📊 Estatísticas APIs Reais:', {
        carregados: loaded,
        total: totalCount,
        altaPrecisao: `${altaPrecisao}%`,
        detalhes: precisaoStats
    });
}

// FUNÇÃO PRINCIPAL: Geocodificar cliente com estratégia otimizada
async function geocodificarClienteOtimizado(client) {
    console.log(`🎯 Geocodificando OTIMIZADO: ${client['Nome Fantasia']}`);
    
    // 1. Validar e formatar endereço
    let enderecoFormatado = null;
    if (window.AddressValidator) {
        const validacao = window.AddressValidator.validateAndCorrectAddress(client);
        enderecoFormatado = validacao.enderecoFormatado;
        console.log(`✅ Endereço validado: ${validacao.correcoes.length} correções`);
    }
    
    // 2. Normalizar dados
    const normalizedClient = window.AddressNormalizer ? 
        window.AddressNormalizer.normalizeClientData(client) : client;
    
    const address = getFullAddress(normalizedClient);
    if (!address) return null;
    
    // 3. Verificar correções manuais (prioridade máxima)
    if (manualCorrections[address]) {
        console.log('📍 Usando correção manual');
        return manualCorrections[address];
    }
    
    // 4. Verificar cache
    if (addressCache[address]) {
        console.log('💾 Usando cache');
        return addressCache[address];
    }
    
    // 5. ESTRATÉGIA MULTI-API COM CRUZAMENTO DE DADOS
    const resultados = await executarEstrategiaMultiAPI(normalizedClient, enderecoFormatado);
    
    if (resultados.melhorResultado) {
        console.log(`🏆 Melhor resultado: ${resultados.melhorResultado.provider} (${Math.round(resultados.melhorResultado.confidence * 100)}% confiança)`);
        addressCache[address] = resultados.melhorResultado;
        salvarCache();
        return resultados.melhorResultado;
    }
    
    // 6. Fallback final
    console.log('🎯 Usando fallback');
    const fallback = await geocodificarFallback(normalizedClient);
    if (fallback) {
        addressCache[address] = fallback;
        salvarCache();
        return fallback;
    }
    
    console.log('❌ Geocodificação falhou para:', address);
    return null;
}

// ESTRATÉGIA MULTI-API: Executar múltiplas APIs e cruzar resultados
async function executarEstrategiaMultiAPI(client, enderecoFormatado) {
    const resultados = [];
    
    console.log('🔄 Executando estratégia multi-API...');
    
    // Tentativa 1: ViaCEP + Nominatim (se CEP disponível)
    if (client.CEP) {
        const viaCepResult = await geocodificarViaCEPOtimizado(client);
        if (viaCepResult) {
            resultados.push(viaCepResult);
            console.log(`✅ ViaCEP: ${Math.round(viaCepResult.confidence * 100)}% confiança`);
        }
    }
    
    // Tentativa 2: Nominatim com múltiplas variações
    if (enderecoFormatado && enderecoFormatado.variacoes) {
        const nominatimResults = await geocodificarNominatimOtimizado(enderecoFormatado.variacoes);
        resultados.push(...nominatimResults);
    }
    
    // Tentativa 3: OpenCage (se chave disponível)
    if (GEOCODING_CONFIG.opencage.apiKey) {
        const opencageResult = await geocodificarOpenCage(enderecoFormatado?.completo);
        if (opencageResult) {
            resultados.push(opencageResult);
            console.log(`✅ OpenCage: ${Math.round(opencageResult.confidence * 100)}% confiança`);
        }
    }
    
    // Analisar e cruzar resultados
    const melhorResultado = analisarECruzarResultados(resultados, client);
    
    return {
        resultados: resultados,
        melhorResultado: melhorResultado,
        totalTentativas: resultados.length
    };
}

// Geocodificar via ViaCEP otimizado
async function geocodificarViaCEPOtimizado(client) {
    const cep = (client.CEP || '').replace(/\D/g, '');
    if (cep.length !== 8) return null;
    
    try {
        const response = await fetchWithRetry(`${GEOCODING_CONFIG.viaCEP.baseUrl}/${cep}/json/`, GEOCODING_CONFIG.viaCEP.maxRetries);
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const cepData = await response.json();
        if (cepData.erro) throw new Error('CEP inválido');
        
        console.log('📮 Dados do CEP obtidos:', cepData);
        
        // Geocodificar o endereço do CEP via Nominatim
        const enderecoViaCEP = `${cepData.logradouro || ''}, ${cepData.bairro || ''}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
        const coordsNominatim = await geocodificarNominatimSimples(enderecoViaCEP);
        
        if (coordsNominatim) {
            return {
                lat: coordsNominatim.lat,
                lng: coordsNominatim.lng,
                confidence: Math.min(coordsNominatim.confidence + 0.3, 1.0), // Bonus por ter CEP válido
                provider: 'ViaCEP+Nominatim',
                manuallyEdited: false,
                cepData: cepData,
                source: 'viacep'
            };
        }
        
        return null;
    } catch (error) {
        console.log('❌ Erro ao geocodificar CEP:', error.message);
        return null;
    }
}

// Geocodificar via Nominatim otimizado
async function geocodificarNominatimOtimizado(variacoes) {
    const resultados = [];
    
    for (let i = 0; i < Math.min(variacoes.length, 5); i++) { // Limitar a 5 tentativas
        const endereco = variacoes[i];
        const coords = await geocodificarNominatimSimples(endereco);
        
        if (coords) {
            coords.source = 'nominatim';
            coords.tentativa = i + 1;
            resultados.push(coords);
            console.log(`✅ Nominatim (${i + 1}): ${Math.round(coords.confidence * 100)}% confiança`);
        }
        
        // Pausa entre tentativas
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return resultados;
}

// Geocodificar via Nominatim simples
async function geocodificarNominatimSimples(endereco) {
    if (!endereco || endereco.length < 10) return null;
    
    try {
        const encodedAddress = encodeURIComponent(endereco);
        const url = `${GEOCODING_CONFIG.nominatim.baseUrl}?format=json&q=${encodedAddress}&limit=3&countrycodes=br&addressdetails=1`;
        
        const response = await fetchWithRetry(url, GEOCODING_CONFIG.nominatim.maxRetries, {
            'User-Agent': GEOCODING_CONFIG.nominatim.userAgent
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (!data || data.length === 0) return null;
        
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
            const score = calcularScoreNominatimOtimizado(result, endereco);
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
            
            return {
                lat: coords.lat,
                lng: coords.lng,
                confidence: confidence,
                provider: 'Nominatim',
                manuallyEdited: false,
                details: bestResult.address,
                display_name: bestResult.display_name,
                importance: bestResult.importance
            };
        }
        
        return null;
    } catch (error) {
        console.error('❌ Erro Nominatim:', error);
        return null;
    }
}

// Calcular score do resultado Nominatim otimizado
function calcularScoreNominatimOtimizado(result, endereco) {
    let score = 0.3; // Base score
    
    // Verificar tipo de lugar (peso maior)
    const placeType = result.type;
    if (placeType === 'house' || placeType === 'building') score += 0.4;
    else if (placeType === 'street' || placeType === 'road') score += 0.35;
    else if (placeType === 'neighbourhood' || placeType === 'suburb') score += 0.25;
    else if (placeType === 'city' || placeType === 'town') score += 0.15;
    else if (placeType === 'village') score += 0.1;
    
    // Verificar importância
    const importance = parseFloat(result.importance) || 0;
    score += importance * 0.3;
    
    // Verificar detalhes do endereço (peso maior para endereços completos)
    const address = result.address || {};
    if (address.house_number) score += 0.15;
    if (address.road) score += 0.1;
    if (address.neighbourhood || address.suburb) score += 0.08;
    if (address.city || address.town) score += 0.05;
    if (address.state) score += 0.03;
    if (address.postcode) score += 0.05;
    
    // Verificar se contém palavras do endereço original
    const displayName = (result.display_name || '').toLowerCase();
    const enderecoWords = endereco.toLowerCase().split(/[,\s]+/);
    let wordMatches = 0;
    let importantWordMatches = 0;
    
    enderecoWords.forEach(word => {
        if (word.length > 3 && displayName.includes(word)) {
            wordMatches++;
            // Palavras importantes têm peso maior
            if (word.length > 5 || ['rua', 'avenida', 'jardim', 'vila'].includes(word)) {
                importantWordMatches++;
            }
        }
    });
    
    const wordMatchRatio = wordMatches / enderecoWords.length;
    const importantWordRatio = importantWordMatches / Math.max(1, enderecoWords.filter(w => w.length > 5).length);
    
    score += wordMatchRatio * 0.2;
    score += importantWordRatio * 0.15;
    
    // Bonus para São José dos Campos
    if (displayName.includes('josé dos campos') || displayName.includes('sjc')) {
        score += 0.1;
    }
    
    return score;
}

// Geocodificar via OpenCage
async function geocodificarOpenCage(endereco) {
    if (!GEOCODING_CONFIG.opencage.apiKey || !endereco) return null;
    
    try {
        const encodedAddress = encodeURIComponent(endereco);
        const url = `${GEOCODING_CONFIG.opencage.baseUrl}?q=${encodedAddress}&key=${GEOCODING_CONFIG.opencage.apiKey}&limit=1&countrycode=br&language=pt`;
        
        const response = await fetchWithRetry(url, 2);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const result = data.results[0];
        
        if (!result) return null;
        
        return {
            lat: result.geometry.lat,
            lng: result.geometry.lng,
            confidence: result.confidence / 100,
            provider: 'OpenCage',
            manuallyEdited: false,
            details: result.components,
            source: 'opencage'
        };
    } catch (error) {
        console.error('❌ Erro OpenCage:', error);
        return null;
    }
}

// Analisar e cruzar resultados para encontrar o melhor
function analisarECruzarResultados(resultados, client) {
    if (resultados.length === 0) return null;
    
    console.log(`📊 Analisando ${resultados.length} resultados...`);
    
    // Se só tem um resultado, retornar ele
    if (resultados.length === 1) {
        return resultados[0];
    }
    
    // Agrupar resultados próximos geograficamente
    const grupos = agruparResultadosProximos(resultados);
    
    // Encontrar o grupo com maior confiança total
    let melhorGrupo = null;
    let maiorConfiancaTotal = 0;
    
    grupos.forEach(grupo => {
        const confiancaTotal = grupo.reduce((sum, r) => sum + r.confidence, 0);
        const confiancaMedia = confiancaTotal / grupo.length;
        const bonus = grupo.length > 1 ? 0.1 : 0; // Bonus para consenso
        
        const scoreFinal = confiancaMedia + bonus;
        
        if (scoreFinal > maiorConfiancaTotal) {
            maiorConfiancaTotal = scoreFinal;
            melhorGrupo = grupo;
        }
    });
    
    if (!melhorGrupo) return resultados[0];
    
    // Retornar o resultado com maior confiança do melhor grupo
    const melhorDoGrupo = melhorGrupo.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
    );
    
    // Aplicar bonus se houve consenso
    if (melhorGrupo.length > 1) {
        melhorDoGrupo.confidence = Math.min(melhorDoGrupo.confidence + 0.1, 1.0);
        melhorDoGrupo.consenso = melhorGrupo.length;
        console.log(`🤝 Consenso entre ${melhorGrupo.length} APIs`);
    }
    
    return melhorDoGrupo;
}

// Agrupar resultados próximos geograficamente
function agruparResultadosProximos(resultados, distanciaMaxima = 0.01) { // ~1km
    const grupos = [];
    const processados = new Set();
    
    resultados.forEach((resultado, index) => {
        if (processados.has(index)) return;
        
        const grupo = [resultado];
        processados.add(index);
        
        resultados.forEach((outro, outroIndex) => {
            if (processados.has(outroIndex) || index === outroIndex) return;
            
            const distancia = calcularDistanciaHaversine(
                resultado.lat, resultado.lng,
                outro.lat, outro.lng
            );
            
            if (distancia <= distanciaMaxima) {
                grupo.push(outro);
                processados.add(outroIndex);
            }
        });
        
        grupos.push(grupo);
    });
    
    return grupos;
}

// Calcular distância Haversine entre dois pontos
function calcularDistanciaHaversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Fetch com retry
async function fetchWithRetry(url, maxRetries = 3, headers = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, { headers });
            if (response.ok) return response;
            
            if (attempt === maxRetries) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (attempt === maxRetries) throw error;
            console.log(`⚠️ Tentativa ${attempt} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Geocodificar fallback
async function geocodificarFallback(client) {
    const cidade = client.Cidade || 'São José dos Campos';
    const uf = client.UF || 'SP';
    
    const enderecoFallback = `${cidade}, ${uf}, Brasil`;
    
    console.log(`🎯 Tentando fallback: ${enderecoFallback}`);
    
    const coords = await geocodificarNominatimSimples(enderecoFallback);
    if (coords) {
        return {
            lat: coords.lat,
            lng: coords.lng,
            confidence: Math.min(coords.confidence * 0.4, 0.5), // Reduzir confiança para fallback
            provider: 'Fallback-Cidade',
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
    if (confidence >= 0.9) return 'darkgreen';
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.7) return 'lightgreen';
    if (confidence >= 0.6) return 'orange';
    return 'red';
}

// Criar ícone do marcador
function createMarkerIcon(color, confidence, isManual, isAtivo) {
    const symbol = isManual ? '📍' : 
                   confidence >= 0.9 ? '🎯' :
                   confidence >= 0.8 ? '✓' : 
                   confidence >= 0.7 ? '◉' :
                   confidence >= 0.6 ? '~' : '?';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        ">${symbol}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
}

// Criar conteúdo do popup
function createPopupContent(client, coords, isManuallyEdited, isAtivo) {
    const statusText = isAtivo ? '🟢 Ativo' : '🔴 Inativo';
    const confidenceText = Math.round(coords.confidence * 100);
    const providerText = coords.provider || 'N/A';
    
    const address = getFullAddress(client);
    
    let consensoText = '';
    if (coords.consenso && coords.consenso > 1) {
        consensoText = `<p><strong>🤝 Consenso:</strong> ${coords.consenso} APIs</p>`;
    }
    
    return `
        <div style="min-width: 300px; max-width: 400px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">${client['Nome Fantasia'] || 'Cliente'}</h4>
            
            <p><strong>Status:</strong> ${statusText}</p>
            <p><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p><strong>Bairro:</strong> ${client.Bairro || 'N/A'}</p>
            <p><strong>CEP:</strong> ${client.CEP || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${address}</p>
            
            <p><strong>Precisão API:</strong> <span style="color: ${getColorByConfidence(coords.confidence)};">${confidenceText}%</span></p>
            
            ${isManuallyEdited ? '<p style="color: #2196f3;"><strong>✅ Corrigido manualmente</strong></p>' : ''}
            
            <p><strong>Fonte:</strong> ${providerText}</p>
            
            ${consensoText}
            
            <p><strong>Coordenadas:</strong> ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</p>
            
            ${coords.display_name ? `<p style="font-size: 12px; color: #666;"><strong>Local:</strong> ${coords.display_name.substring(0, 100)}...</p>` : ''}
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
        if (marker && map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    markers = [];
}

// Carregar caches
function loadCaches() {
    try {
        if (window.dbManager) {
            addressCache = window.dbManager.loadAddressCache() || {};
            manualCorrections = window.dbManager.loadManualCorrections() || {};
            console.log(`📦 Cache carregado: ${Object.keys(addressCache).length} endereços, ${Object.keys(manualCorrections).length} correções`);
        }
    } catch (error) {
        console.error('Erro ao carregar cache:', error);
        addressCache = {};
        manualCorrections = {};
    }
}

// Salvar cache
function salvarCache() {
    try {
        if (window.dbManager) {
            window.dbManager.saveAddressCache(addressCache);
        }
    } catch (error) {
        console.error('Erro ao salvar cache:', error);
    }
}

// Atualizar status do mapa
function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.padding = '8px 12px';
        statusElement.style.backgroundColor = '#f5f5f5';
        statusElement.style.border = '1px solid #ddd';
        statusElement.style.borderRadius = '4px';
        statusElement.style.fontSize = '14px';
        statusElement.style.color = '#333';
    }
    console.log('🗺️ Status:', message);
}

// Disponibilizar funções globalmente
window.initMap = initMap;
window.loadMapData = loadMapData;
window.setupEditButton = setupEditButton;

console.log('✅ map.js API Real OTIMIZADO carregado - Sistema multi-API com cruzamento de dados');
