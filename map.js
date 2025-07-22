// map.js - Sistema de Mapa com Integração ViaCEP e Geocodificação Precisa
(function() {
    'use strict';

    // ========== VARIÁVEIS GLOBAIS ==========
    let map = null;
    let markersLayer = null;
    let currentMarkers = [];
    let isMapInitialized = false;
    let isProcessingMarkers = false;
    let initializationAttempts = 0;
    let globalTimeout = null;
    let userLocation = null;
    let geocodingCache = new Map();
    let viacepCache = new Map();

    // ========== CONFIGURAÇÕES ==========
    const MAX_INIT_ATTEMPTS = 3;
    const ABSOLUTE_TIMEOUT = 15000;
    const MAX_MARKERS = 50;
    const API_DELAY = 1500; // Delay respeitoso entre consultas
    
    const DEFAULT_BRAZIL_CENTER = [-23.2237, -45.9009]; // São José dos Campos
    const DEFAULT_ZOOM = 12;
    const MAX_ZOOM = 18;
    const MIN_ZOOM = 8;

    // Configurações ViaCEP
    const VIACEP_CONFIG = {
        baseUrl: 'https://viacep.com.br/ws',
        timeout: 8000,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    // Configurações Nominatim
    const NOMINATIM_CONFIG = {
        baseUrl: 'https://nominatim.openstreetmap.org',
        headers: {
            'User-Agent': 'PMG-Agenda-Clientes-ViaCEP/3.0'
        },
        timeout: 10000,
        countryCode: 'BR'
    };

    // ========== CLASSE PROCESSADOR DE ENDEREÇOS BRASILEIROS ==========
    class BrazilianAddressProcessor {
        constructor() {
            this.cepRegex = /\b\d{5}-?\d{3}\b/g;
            this.cepCleanRegex = /\D/g;
        }

        // Extrair CEPs do texto
        extractCEPs(text) {
            if (!text) return [];
            const matches = text.match(this.cepRegex);
            return matches ? matches.map(cep => cep.replace(this.cepCleanRegex, '')) : [];
        }

        // Validar formato de CEP
        isValidCEP(cep) {
            if (!cep) return false;
            const cleanCep = cep.replace(this.cepCleanRegex, '');
            return /^\d{8}$/.test(cleanCep);
        }

        // Processar endereço completo
        processAddress(rawAddress) {
            if (!rawAddress) return null;

            const lines = rawAddress.split('\n')
                .map(line => line.trim())
                .filter(line => line && line !== '');

            const processed = {
                ceps: this.extractCEPs(rawAddress),
                street: null,
                number: null,
                neighborhood: null,
                city: 'São José dos Campos',
                state: 'SP',
                fullAddress: rawAddress,
                components: []
            };

            // Identificar componentes
            for (const line of lines) {
                const lower = line.toLowerCase();
                
                // Identificar rua/avenida
                if (this.isStreetLine(line)) {
                    const streetInfo = this.parseStreetLine(line);
                    processed.street = streetInfo.street;
                    processed.number = streetInfo.number;
                    processed.components.push({ type: 'street', value: line });
                    continue;
                }

                // Identificar cidade
                if (lower.includes('são josé dos campos') || 
                    lower.includes('sao jose dos campos') || 
                    lower === 'sjc') {
                    processed.city = 'São José dos Campos';
                    processed.components.push({ type: 'city', value: line });
                    continue;
                }

                // Identificar estado
                if (lower === 'sp' || lower === 'são paulo') {
                    processed.state = 'SP';
                    processed.components.push({ type: 'state', value: line });
                    continue;
                }

                // Possível bairro
                if (!this.extractCEPs(line).length && !this.isStreetLine(line) && 
                    line.length > 3 && !line.match(/^\d+$/)) {
                    processed.neighborhood = line;
                    processed.components.push({ type: 'neighborhood', value: line });
                }
            }

            return processed;
        }

        isStreetLine(line) {
            const streetTypes = [
                'rua', 'avenida', 'av', 'alameda', 'travessa', 'praça', 'pc',
                'estrada', 'rod', 'rodovia', 'largo', 'viela', 'beco', 'r.'
            ];
            
            const lower = line.toLowerCase();
            return streetTypes.some(type => lower.includes(type)) || 
                   /\b\d+\b/.test(line);
        }

        parseStreetLine(line) {
            const numberMatch = line.match(/\b(\d+)\b/);
            const number = numberMatch ? numberMatch[1] : null;
            
            let street = line;
            if (number) {
                street = street.replace(new RegExp(`\\b${number}\\b`), '').trim();
            }
            
            street = street.replace(/,\s*$/, '').trim();
            
            return { street, number };
        }
    }

    const addressProcessor = new BrazilianAddressProcessor();

    // ========== INTEGRAÇÃO COM VIACEP ==========
    
    async function consultarViaCEP(cep) {
        const cleanCep = cep.replace(/\D/g, '');
        
        if (!addressProcessor.isValidCEP(cleanCep)) {
            throw new Error('CEP inválido - deve conter 8 dígitos');
        }

        // Verificar cache
        if (viacepCache.has(cleanCep)) {
            return viacepCache.get(cleanCep);
        }

        try {
            console.log(`📮 Consultando ViaCEP: ${cleanCep}`);
            
            const url = `${VIACEP_CONFIG.baseUrl}/${cleanCep}/json/`;
            
            const response = await fetchWithTimeout(url, VIACEP_CONFIG.timeout);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Verificar se CEP foi encontrado
            if (data.erro) {
                throw new Error(`CEP ${cleanCep} não encontrado na base ViaCEP`);
            }

            const result = {
                cep: data.cep,
                logradouro: data.logradouro || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                localidade: data.localidade || 'São José dos Campos',
                uf: data.uf || 'SP',
                ibge: data.ibge || '',
                ddd: data.ddd || '',
                siafi: data.siafi || '',
                // Campos adicionais para controle
                source: 'viacep',
                timestamp: Date.now(),
                valid: true
            };

            // Cache resultado válido
            viacepCache.set(cleanCep, result);
            
            console.log(`✅ ViaCEP encontrou: ${result.logradouro}, ${result.bairro}, ${result.localidade}-${result.uf}`);
            
            return result;

        } catch (error) {
            console.warn(`⚠️ Erro ViaCEP para ${cleanCep}:`, error.message);
            
            // Cache erro para evitar consultas repetidas
            const errorResult = {
                cep: cleanCep,
                valid: false,
                error: error.message,
                timestamp: Date.now()
            };
            
            viacepCache.set(cleanCep, errorResult);
            throw error;
        }
    }

    // Construir endereço a partir do ViaCEP
    function buildAddressFromViaCEP(viacepData) {
        const parts = [];
        
        if (viacepData.logradouro) {
            parts.push(viacepData.logradouro);
        }
        
        if (viacepData.complemento) {
            parts.push(viacepData.complemento);
        }
        
        if (viacepData.bairro) {
            parts.push(viacepData.bairro);
        }
        
        if (viacepData.localidade) {
            parts.push(viacepData.localidade);
        }
        
        if (viacepData.uf) {
            parts.push(viacepData.uf);
        }
        
        parts.push('Brasil');
        
        return parts.join(', ');
    }

    // ========== GEOCODIFICAÇÃO AVANÇADA COM VIACEP ==========
    
    async function geocodificarEnderecoComViaCEP(endereco) {
        const cacheKey = endereco.toLowerCase().trim();
        
        if (geocodingCache.has(cacheKey)) {
            return geocodingCache.get(cacheKey);
        }

        console.log(`🔍 Geocodificando com ViaCEP: ${endereco}`);
        
        try {
            // Processar endereço
            const processed = addressProcessor.processAddress(endereco);
            if (!processed) {
                throw new Error('Endereço não pôde ser processado');
            }

            // Estratégia 1: Tentar ViaCEP primeiro se temos CEPs
            if (processed.ceps.length > 0) {
                for (const cep of processed.ceps) {
                    try {
                        const viacepData = await consultarViaCEP(cep);
                        if (viacepData.valid) {
                            const viacepAddress = buildAddressFromViaCEP(viacepData);
                            const coords = await geocodificarNominatim(viacepAddress);
                            
                            if (coords) {
                                const result = {
                                    ...coords,
                                    confidence: 0.95,
                                    method: 'viacep-nominatim',
                                    source: 'viacep+nominatim',
                                    originalCEP: cep,
                                    viacepData: viacepData
                                };
                                
                                geocodingCache.set(cacheKey, result);
                                console.log(`✅ Sucesso ViaCEP+Nominatim: ${coords.display_name}`);
                                return result;
                            }
                        }
                    } catch (viacepError) {
                        console.warn(`⚠️ ViaCEP falhou para CEP ${cep}:`, viacepError.message);
                        continue; // Tentar próximo CEP se houver
                    }
                }
            }

            // Estratégia 2: Geocodificação estruturada sem ViaCEP
            if (processed.street && processed.city) {
                try {
                    const structuredAddress = [
                        processed.street,
                        processed.number,
                        processed.neighborhood,
                        processed.city,
                        processed.state,
                        'Brasil'
                    ].filter(part => part).join(', ');
                    
                    const coords = await geocodificarNominatim(structuredAddress);
                    if (coords) {
                        const result = {
                            ...coords,
                            confidence: 0.8,
                            method: 'structured-nominatim',
                            source: 'nominatim-structured'
                        };
                        
                        geocodingCache.set(cacheKey, result);
                        console.log(`✅ Sucesso estruturado: ${coords.display_name}`);
                        return result;
                    }
                } catch (structError) {
                    console.warn(`⚠️ Geocodificação estruturada falhou:`, structError.message);
                }
            }

            // Estratégia 3: Geocodificação livre
            try {
                const coords = await geocodificarNominatim(processed.fullAddress + ', São José dos Campos, SP, Brasil');
                if (coords) {
                    const result = {
                        ...coords,
                        confidence: 0.6,
                        method: 'free-form-nominatim',
                        source: 'nominatim-free'
                    };
                    
                    geocodingCache.set(cacheKey, result);
                    console.log(`✅ Sucesso forma livre: ${coords.display_name}`);
                    return result;
                }
            } catch (freeError) {
                console.warn(`⚠️ Geocodificação livre falhou:`, freeError.message);
            }

            // Estratégia 4: Fallback para São José dos Campos
            return await geocodingFallback(endereco);

        } catch (error) {
            console.error(`❌ Erro na geocodificação completa:`, error.message);
            return await geocodingFallback(endereco);
        }
    }

    // Geocodificação via Nominatim
    async function geocodificarNominatim(address) {
        try {
            const params = new URLSearchParams({
                q: address,
                format: 'json',
                addressdetails: '1',
                limit: '3',
                countrycodes: NOMINATIM_CONFIG.countryCode,
                'accept-language': 'pt-BR'
            });

            const url = `${NOMINATIM_CONFIG.baseUrl}/search?${params}`;
            console.log(`🌐 Nominatim: ${url}`);

            const response = await fetchWithTimeout(url, NOMINATIM_CONFIG.timeout);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                // Priorizar resultados brasileiros
                const brazilResults = data.filter(item => 
                    item.display_name.toLowerCase().includes('brasil') ||
                    item.display_name.toLowerCase().includes('brazil') ||
                    item.address?.country_code === 'br'
                );

                const results = brazilResults.length > 0 ? brazilResults : data;
                const best = results[0];

                return {
                    lat: parseFloat(best.lat),
                    lon: parseFloat(best.lon),
                    display_name: best.display_name,
                    address: best.address || {},
                    importance: parseFloat(best.importance || 0),
                    place_rank: parseInt(best.place_rank || 0)
                };
            }

            throw new Error('Nenhum resultado encontrado');

        } catch (error) {
            console.warn(`⚠️ Nominatim falhou:`, error.message);
            throw error;
        }
    }

    // Fallback para geocodificação
    async function geocodingFallback(originalAddress) {
        console.warn(`🚨 Usando fallback para: ${originalAddress}`);
        
        try {
            // Tentar pelo menos encontrar São José dos Campos
            const sjcCoords = await geocodificarNominatim('São José dos Campos, SP, Brasil');
            
            if (sjcCoords) {
                return {
                    ...sjcCoords,
                    display_name: `${originalAddress} (aproximado - ${sjcCoords.display_name})`,
                    confidence: 0.3,
                    method: 'fallback-city',
                    source: 'nominatim-fallback',
                    isApproximate: true
                };
            }
        } catch (error) {
            console.error(`❌ Fallback também falhou:`, error);
        }

        // Último recurso - coordenadas hardcoded
        return {
            lat: DEFAULT_BRAZIL_CENTER[0],
            lon: DEFAULT_BRAZIL_CENTER[1],
            display_name: `${originalAddress} (localização aproximada - São José dos Campos)`,
            address: { 
                city: 'São José dos Campos', 
                state: 'SP',
                country: 'Brasil' 
            },
            confidence: 0.1,
            method: 'fallback-hardcoded',
            source: 'hardcoded',
            isApproximate: true
        };
    }

    // ========== UTILITÁRIOS DE REDE ==========
    
    function fetchWithTimeout(url, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error(`Timeout após ${timeout}ms para ${url}`));
            }, timeout);

            const fetchOptions = {
                headers: NOMINATIM_CONFIG.headers,
                signal: controller.signal
            };

            // Para ViaCEP, usar configurações específicas
            if (url.includes('viacep.com.br')) {
                fetchOptions.headers = VIACEP_CONFIG.headers;
            }

            fetch(url, fetchOptions)
            .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    reject(new Error(`Timeout após ${timeout}ms`));
                } else {
                    reject(error);
                }
            });
        });
    }

    // ========== GEOLOCALIZAÇÃO DO USUÁRIO ==========
    async function obterLocalizacaoUsuario() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                resolve(null);
                return;
            }

            console.log('📍 Obtendo localização do usuário...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    console.log('✅ Localização obtida:', coords);
                    resolve(coords);
                },
                (error) => {
                    console.warn('⚠️ Erro de geolocalização:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                }
            );
        });
    }

    // ========== INICIALIZAÇÃO DO MAPA ==========
    async function initializeMap() {
        if (isMapInitialized) {
            console.log('✅ Mapa já inicializado');
            return;
        }

        if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
            console.error('❌ Máximo de tentativas excedido');
            showMapBasic();
            return;
        }

        initializationAttempts++;
        console.log(`🗺️ Inicializando mapa (tentativa ${initializationAttempts}/${MAX_INIT_ATTEMPTS})`);

        if (!isLeafletReady()) {
            console.error('❌ Leaflet não está pronto');
            setTimeout(initializeMap, 2000);
            return;
        }

        try {
            setGlobalTimeout();

            // Obter localização do usuário
            userLocation = await obterLocalizacaoUsuario();
            
            let mapCenter = DEFAULT_BRAZIL_CENTER;
            let initialZoom = DEFAULT_ZOOM;

            if (userLocation) {
                mapCenter = [userLocation.lat, userLocation.lon];
                initialZoom = userLocation.accuracy < 100 ? 15 : 
                           userLocation.accuracy < 1000 ? 13 : DEFAULT_ZOOM;
            }

            // Criar mapa
            map = L.map('map', {
                center: mapCenter,
                zoom: initialZoom,
                maxZoom: MAX_ZOOM,
                minZoom: MIN_ZOOM,
                zoomControl: true,
                attributionControl: true
            });

            // Adicionar tiles do OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: MAX_ZOOM,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Criar layer para marcadores
            markersLayer = L.layerGroup().addTo(map);

            // Adicionar marcador do usuário se disponível
            if (userLocation) {
                await adicionarMarcadorUsuario(userLocation);
            }

            isMapInitialized = true;
            clearGlobalTimeout();

            console.log('✅ Mapa inicializado com sucesso');

            // Processar marcadores dos clientes
            setTimeout(() => {
                processAllMarkersComplete();
            }, 1000);

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            clearGlobalTimeout();
            
            if (initializationAttempts < MAX_INIT_ATTEMPTS) {
                setTimeout(initializeMap, 3000);
            } else {
                showMapBasic();
            }
        }
    }

    // ========== PROCESSAMENTO DE MARCADORES ==========
    async function processAllMarkersComplete() {
        if (isProcessingMarkers || !isMapInitialized) return;

        try {
            isProcessingMarkers = true;
            console.log('🔄 Processando marcadores com ViaCEP...');

            const allClients = getAllClientsData();
            if (!allClients || allClients.length === 0) {
                console.log('ℹ️ Nenhum cliente para processar');
                return;
            }

            const limitedClients = allClients.slice(0, MAX_MARKERS);
            console.log(`📊 Processando ${limitedClients.length} clientes com ViaCEP`);

            // Processar em lotes menores com delay maior
            const batchSize = 2; // Reduzido para ser mais respeitoso com APIs
            for (let i = 0; i < limitedClients.length; i += batchSize) {
                const batch = limitedClients.slice(i, i + batchSize);
                
                console.log(`📦 Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(limitedClients.length/batchSize)}`);
                
                await Promise.allSettled(batch.map(async (client, index) => {
                    try {
                        await new Promise(resolve => setTimeout(resolve, index * 600)); // Delay escalonado
                        await processarMarcadorClienteComViaCEP(client);
                    } catch (error) {
                        console.warn('⚠️ Erro ao processar cliente:', client['Nome Fantasia'], error.message);
                    }
                }));

                // Pausa respeitosa entre lotes
                if (i + batchSize < limitedClients.length) {
                    console.log(`⏳ Aguardando ${API_DELAY}ms...`);
                    await new Promise(resolve => setTimeout(resolve, API_DELAY));
                }
            }

            console.log('✅ Processamento com ViaCEP concluído');
            updateMapStatistics();

        } catch (error) {
            console.error('❌ Erro no processamento geral:', error);
        } finally {
            isProcessingMarkers = false;
        }
    }

    async function processarMarcadorClienteComViaCEP(client) {
        try {
            const endereco = extrairEnderecoLimpo(client);
            if (!endereco) {
                console.warn('⚠️ Cliente sem endereço:', client['Nome Fantasia']);
                return;
            }

            console.log(`🔍 Processando: ${client['Nome Fantasia']} - ${endereco}`);
            
            const coords = await geocodificarEnderecoComViaCEP(endereco);
            if (!coords) {
                console.warn('⚠️ Não foi possível geocodificar:', client['Nome Fantasia']);
                return;
            }

            const marker = criarMarcadorClienteComViaCEP(client, coords);
            if (marker) {
                markersLayer.addLayer(marker);
                currentMarkers.push({
                    client: client,
                    marker: marker,
                    coords: coords,
                    confidence: coords.confidence,
                    method: coords.method
                });

                console.log(`✅ Marcador criado: ${client['Nome Fantasia']} (${coords.method}, confiança: ${coords.confidence})`);
            }

        } catch (error) {
            console.error('❌ Erro ao processar marcador:', client['Nome Fantasia'], error.message);
        }
    }

    function extrairEnderecoLimpo(client) {
        const endereco = client['Endereço'] || client['endereco'] || '';
        if (!endereco || endereco === 'N/A') return null;

        return endereco
            .replace(/\n/g, ', ')
            .replace(/\s+/g, ' ')
            .replace(/,\s*,/g, ',')
            .trim();
    }

    function criarMarcadorClienteComViaCEP(client, coords) {
        try {
            const status = client['Status'] || 'Inativo';
            const categoria = getClientCategory(status);
            
            // Ícone baseado na confiança e método
            let iconClass = `client-marker client-${categoria}`;
            let iconSymbol = getClientIcon(categoria);
            
            if (coords.method?.includes('viacep')) {
                iconClass += ' viacep-verified';
                iconSymbol = '✅'; // Verificado com ViaCEP
            } else if (coords.confidence < 0.5) {
                iconClass += ' low-confidence';
                iconSymbol = '❓'; // Baixa confiança
            }
            
            const icon = L.divIcon({
                className: iconClass,
                html: iconSymbol,
                iconSize: [26, 26],
                iconAnchor: [13, 26]
            });

            const marker = L.marker([coords.lat, coords.lon], { icon: icon });

            const popupContent = criarPopupClienteComViaCEP(client, coords);
            marker.bindPopup(popupContent);

            return marker;

        } catch (error) {
            console.error('❌ Erro ao criar marcador:', error);
            return null;
        }
    }

    function getClientCategory(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower.includes('ativo')) return 'ativo';
        if (statusLower.includes('novo')) return 'novo';
        return 'inativo';
    }

    function getClientIcon(categoria) {
        const icons = {
            'ativo': '🟢',
            'novo': '🆕',
            'inativo': '🔴'
        };
        return icons[categoria] || '📍';
    }

    function criarPopupClienteComViaCEP(client, coords) {
        const nome = client['Nome Fantasia'] || client['Cliente'] || 'Cliente';
        const contato = client['Contato'] || 'N/A';
        const telefone = client['Celular'] || 'N/A';
        const segmento = client['Segmento'] || 'N/A';
        const status = client['Status'] || 'N/A';

        // Indicador de precisão baseado no método
        let precisaoInfo = '';
        let metodoBadge = '';
        
        if (coords.method?.includes('viacep')) {
            precisaoInfo = `<span class="precision-viacep">✅ Verificado ViaCEP</span>`;
            metodoBadge = '<span class="method-badge viacep">ViaCEP</span>';
        } else if (coords.confidence >= 0.8) {
            precisaoInfo = `<span class="precision-high">🎯 Localização precisa</span>`;
            metodoBadge = '<span class="method-badge high">Precisa</span>';
        } else if (coords.confidence >= 0.5) {
            precisaoInfo = `<span class="precision-medium">📍 Localização aproximada</span>`;
            metodoBadge = '<span class="method-badge medium">Aproximada</span>';
        } else {
            precisaoInfo = `<span class="precision-low">❓ Localização estimada</span>`;
            metodoBadge = '<span class="method-badge low">Estimada</span>';
        }

        return `
            <div class="client-popup">
                <div class="popup-header">
                    <h4>${nome}</h4>
                    ${metodoBadge}
                </div>
                <div class="popup-content">
                    <p><strong>Status:</strong> <span class="status-${getClientCategory(status)}">${status}</span></p>
                    <p><strong>Segmento:</strong> ${segmento}</p>
                    <p><strong>Contato:</strong> ${contato}</p>
                    <p><strong>Telefone:</strong> ${telefone}</p>
                    <p><strong>Endereço:</strong> ${coords.display_name}</p>
                    ${coords.originalCEP ? `<p><strong>CEP:</strong> ${coords.originalCEP}</p>` : ''}
                </div>
                <div class="precision-info">
                    ${precisaoInfo}
                    <small>Método: ${coords.method || 'desconhecido'}</small>
                </div>
                <div class="client-actions">
                    <button onclick="window.clientManager?.showClientModal?.(${JSON.stringify(client).replace(/"/g, '&quot;')})">Ver Detalhes</button>
                </div>
            </div>
        `;
    }

    // ========== MARCADOR DO USUÁRIO ==========
    async function adicionarMarcadorUsuario(location) {
        try {
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '📍',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });

            const marker = L.marker([location.lat, location.lon], { icon: userIcon })
                .addTo(markersLayer);

            const popupContent = `
                <div class="user-location-popup">
                    <h4>📍 Sua Localização</h4>
                    <p><strong>Precisão:</strong> ±${Math.round(location.accuracy)}m</p>
                    <p><small>Última atualização: ${new Date(location.timestamp).toLocaleTimeString()}</small></p>
                </div>
            `;

            marker.bindPopup(popupContent);
            console.log('✅ Marcador do usuário adicionado');
        } catch (error) {
            console.error('❌ Erro ao adicionar marcador do usuário:', error);
        }
    }

    // ========== CONTROLE DE TIMEOUT ==========
    function setGlobalTimeout() {
        if (globalTimeout) clearTimeout(globalTimeout);
        globalTimeout = setTimeout(() => {
            console.warn('🚨 TIMEOUT GLOBAL - Parando processamento');
            forceStopEverything();
            showMapBasic();
        }, ABSOLUTE_TIMEOUT);
    }

    function clearGlobalTimeout() {
        if (globalTimeout) {
            clearTimeout(globalTimeout);
            globalTimeout = null;
        }
    }

    function forceStopEverything() {
        isProcessingMarkers = false;
        clearGlobalTimeout();
        console.log('🛑 Processamento interrompido');
    }

    function isLeafletReady() {
        return typeof L !== 'undefined' && L.map && L.tileLayer && L.circleMarker;
    }

    // ========== UTILITÁRIOS ==========
    function getAllClientsData() {
        const allClients = [];
        
        if (window.clientManager) {
            if (window.clientManager.data) allClients.push(...window.clientManager.data);
            if (window.clientManager.ativos) allClients.push(...window.clientManager.ativos);
            if (window.clientManager.novos) allClients.push(...window.clientManager.novos);
        }

        if (allClients.length === 0) {
            if (window.data) allClients.push(...window.data);
            if (window.ativos) allClients.push(...window.ativos);
            if (window.novos) allClients.push(...window.novos);
        }

        return allClients.filter(client => client && (client['Nome Fantasia'] || client['Cliente']));
    }

    function updateMapStatistics() {
        try {
            const stats = {
                total: currentMarkers.length,
                ativos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'ativo').length,
                novos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'novo').length,
                inativos: currentMarkers.filter(m => getClientCategory(m.client['Status']) === 'inativo').length,
                viacepVerified: currentMarkers.filter(m => m.method?.includes('viacep')).length,
                highConfidence: currentMarkers.filter(m => m.confidence >= 0.8).length,
                mediumConfidence: currentMarkers.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length,
                lowConfidence: currentMarkers.filter(m => m.confidence < 0.5).length
            };

            console.log('📊 Estatísticas com ViaCEP:', stats);

            const mapContainer = document.getElementById('map');
            if (mapContainer && mapContainer.parentElement) {
                let statsDiv = mapContainer.parentElement.querySelector('.map-statistics');
                if (!statsDiv) {
                    statsDiv = document.createElement('div');
                    statsDiv.className = 'map-statistics';
                    mapContainer.parentElement.insertBefore(statsDiv, mapContainer);
                }
                
                statsDiv.innerHTML = `
                    <div class="stats-content">
                        <div class="stats-row main-stats">
                            <span class="stat-item">Total: <strong>${stats.total}</strong></span>
                            <span class="stat-item">🟢 Ativos: <strong>${stats.ativos}</strong></span>
                            <span class="stat-item">🆕 Novos: <strong>${stats.novos}</strong></span>
                            <span class="stat-item">🔴 Inativos: <strong>${stats.inativos}</strong></span>
                        </div>
                        <div class="stats-row precision-stats">
                            <span class="stat-item viacep-stat">✅ ViaCEP: <strong>${stats.viacepVerified}</strong></span>
                            <span class="stat-item precision-high">🎯 Precisas: <strong>${stats.highConfidence}</strong></span>
                            <span class="stat-item precision-medium">📍 Aproximadas: <strong>${stats.mediumConfidence}</strong></span>
                            <span class="stat-item precision-low">❓ Estimadas: <strong>${stats.lowConfidence}</strong></span>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar estatísticas:', error);
        }
    }

    function showMapBasic() {
        const container = document.getElementById('map');
        if (!container) return;

        container.style.height = '500px';
        container.innerHTML = `
            <div class="map-fallback">
                <h3>🗺️ Mapa Básico</h3>
                <p>O mapa avançado não pôde ser carregado.</p>
                <p><strong>Localização:</strong> São José dos Campos, SP</p>
                <div class="fallback-stats">
                    <p>Total de clientes: <span id="fallback-count">0</span></p>
                </div>
                <button onclick="location.reload()" class="retry-btn">🔄 Tentar Novamente</button>
            </div>
        `;

        const allClients = getAllClientsData();
        const countElement = container.querySelector('#fallback-count');
        if (countElement && allClients) {
            countElement.textContent = allClients.length;
        }
    }

    // ========== MÉTODOS PÚBLICOS ==========
    function clearAllMarkers() {
        if (markersLayer) {
            markersLayer.clearLayers();
        }
        currentMarkers = [];
        console.log('🧹 Todos os marcadores removidos');
    }

    function clearAllCaches() {
        geocodingCache.clear();
        viacepCache.clear();
        console.log('🧹 Caches de geocodificação e ViaCEP limpos');
    }

    function onMapTabActivated() {
        if (!isMapInitialized) {
            initializeMap();
        } else if (map) {
            setTimeout(() => {
                map.invalidateSize(true);
                console.log('🔄 Tamanho do mapa atualizado');
            }, 300);
        }
    }

    // ========== ESTILOS CSS APRIMORADOS ==========
    function injectMapStyles() {
        const styles = `
            <style>
                .client-marker {
                    border-radius: 50%;
                    border: 2px solid #fff;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: transform 0.2s ease;
                }
                
                .client-marker:hover {
                    transform: scale(1.1);
                }
                
                .client-ativo { background: #28a745; }
                .client-novo { background: #17a2b8; }
                .client-inativo { background: #dc3545; }
                
                .client-marker.viacep-verified { 
                    border: 3px solid #ffd700;
                    box-shadow: 0 3px 15px rgba(255, 215, 0, 0.6);
                }
                
                .client-marker.low-confidence { 
                    border: 2px dashed #ffc107;
                    opacity: 0.8;
                }
                
                .user-location-marker {
                    font-size: 26px;
                    text-align: center;
                    filter: drop-shadow(3px 3px 8px rgba(0,0,0,0.6));
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
                
                .client-popup {
                    font-family: Arial, sans-serif;
                    min-width: 320px;
                    max-width: 400px;
                }
                
                .popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #eee;
                }
                
                .popup-header h4 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                    flex: 1;
                }
                
                .method-badge {
                    font-size: 10px;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-left: 10px;
                }
                
                .method-badge.viacep {
                    background: #ffd700;
                    color: #333;
                }
                
                .method-badge.high {
                    background: #28a745;
                    color: white;
                }
                
                .method-badge.medium {
                    background: #ffc107;
                    color: #333;
                }
                
                .method-badge.low {
                    background: #dc3545;
                    color: white;
                }
                
                .popup-content p {
                    margin: 6px 0;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                .precision-info {
                    margin: 12px 0;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    font-size: 12px;
                    border-left: 3px solid #007bff;
                }
                
                .precision-viacep { 
                    color: #ff8c00; 
                    font-weight: bold; 
                    font-size: 13px;
                }
                
                .precision-high { color: #28a745; font-weight: bold; }
                .precision-medium { color: #ffc107; font-weight: bold; }
                .precision-low { color: #dc3545; font-weight: bold; }
                
                .client-actions {
                    margin-top: 15px;
                    text-align: center;
                }
                
                .client-actions button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s ease;
                }
                
                .client-actions button:hover {
                    background: #0056b3;
                    transform: translateY(-1px);
                }
                
                .status-ativo { color: #28a745; font-weight: bold; }
                .status-novo { color: #17a2b8; font-weight: bold; }
                .status-inativo { color: #dc3545; font-weight: bold; }
                
                .map-statistics {
                    background: linear-gradient(135deg, #f8f9fa, #ffffff);
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .stats-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .stats-row {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .main-stats {
                    font-size: 15px;
                    font-weight: 600;
                }
                
                .precision-stats {
                    border-top: 1px solid #dee2e6;
                    padding-top: 12px;
                    font-size: 13px;
                }
                
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin: 2px 5px;
                    padding: 5px 10px;
                    background: rgba(255,255,255,0.7);
                    border-radius: 15px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .viacep-stat {
                    background: rgba(255, 215, 0, 0.2);
                    border: 1px solid #ffd700;
                }
                
                .map-fallback {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    background: linear-gradient(135deg, #f8f9fa, #ffffff);
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 40px 20px;
                }
                
                .retry-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                
                .retry-btn:hover {
                    background: #0056b3;
                    transform: translateY(-2px);
                }
                
                .user-location-popup {
                    font-family: Arial, sans-serif;
                    min-width: 200px;
                }
                
                .user-location-popup h4 {
                    margin: 0 0 10px 0;
                    color: #007bff;
                    font-size: 16px;
                }
                
                @media (max-width: 768px) {
                    .client-popup {
                        min-width: 280px;
                        max-width: 320px;
                    }
                    
                    .popup-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }
                    
                    .method-badge {
                        margin-left: 0;
                    }
                    
                    .stats-row {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .stat-item {
                        justify-content: center;
                    }
                }
            </style>
        `;
        
        if (!document.querySelector('#map-styles-viacep')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'map-styles-viacep';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }
    }

    // ========== INICIALIZAÇÃO ==========
    function initialize() {
        console.log('🚀 Sistema de mapa com ViaCEP iniciando...');
        injectMapStyles();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeMap);
        } else {
            initializeMap();
        }
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    window.mapManager = {
        init: initializeMap,
        initialized: false,
        map: null,
        currentMarkers: [],
        clearAllMarkers: clearAllMarkers,
        clearAllCaches: clearAllCaches,
        onMapTabActivated: onMapTabActivated,
        processAllMarkersComplete: processAllMarkersComplete,
        
        // Getters
        get isInitialized() { return isMapInitialized; },
        get markersCount() { return currentMarkers.length; },
        get userLocation() { return userLocation; },
        get geocodingCache() { return geocodingCache; },
        get viacepCache() { return viacepCache; },
        
        // Métodos específicos ViaCEP
        consultarViaCEP: consultarViaCEP,
        geocodificarEnderecoComViaCEP: geocodificarEnderecoComViaCEP,
        
        // Estatísticas detalhadas
        getDetailedStats: () => ({
            totalMarkers: currentMarkers.length,
            viacepCacheSize: viacepCache.size,
            geocodingCacheSize: geocodingCache.size,
            confidenceDistribution: {
                viacepVerified: currentMarkers.filter(m => m.method?.includes('viacep')).length,
                high: currentMarkers.filter(m => m.confidence >= 0.8).length,
                medium: currentMarkers.filter(m => m.confidence >= 0.5 && m.confidence < 0.8).length,
                low: currentMarkers.filter(m => m.confidence < 0.5).length
            },
            methodsUsed: currentMarkers.reduce((acc, m) => {
                acc[m.method] = (acc[m.method] || 0) + 1;
                return acc;
            }, {})
        })
    };

    // Auto-inicializar
    initialize();

    console.log('✅ Sistema de mapa com integração ViaCEP carregado');
})();
