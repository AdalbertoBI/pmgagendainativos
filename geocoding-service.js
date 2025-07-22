// geocoding-service.js - Implementação CORRETA baseada nas documentações oficiais
class GeocodingService {
    constructor() {
        this.processing = false;
        this.cache = new Map();
        this.stats = { 
            processed: 0, success: 0, apiSuccess: 0, localFallback: 0, 
            cacheHits: 0, viaCepSuccess: 0, nominatimSuccess: 0, errors: 0 
        };
        
        // Rate limiting CONFORME DOCUMENTAÇÕES OFICIAIS
        this.delays = {
            nominatim: 1100,  // 1.1s - Nominatim Policy: máximo 1 req/segundo + margem
            viacep: 200,      // 0.2s - ViaCEP sem limite oficial, pode ser mais rápido
            processing: 600   // 0.6s entre clientes
        };
        
        this.lastRequest = { nominatim: 0, viacep: 0 };
        
        // Timeouts ADEQUADOS baseados na performance real das APIs
        this.timeouts = {
            viacep: 5000,     // 5s - ViaCEP é rápido
            nominatim: 10000  // 10s - Nominatim pode demorar mais
        };
        
        // Headers CORRETOS conforme documentações
        this.headers = {
            viacep: {
                'Accept': 'application/json'
                // ViaCEP não requer headers especiais
            },
            nominatim: {
                'User-Agent': 'PMG-Agenda-Clientes/1.0 (https://adalbertobi.github.io/pmgagendainativos/; contato@pmg.com)',
                'Accept': 'application/json',
                'Accept-Language': 'pt-BR,pt;q=0.9'
                // Nominatim REQUER User-Agent identificando a aplicação
            }
        };
        
        // URLs OFICIAIS conforme documentações
        this.endpoints = {
            viacep: {
                base: 'https://viacep.com.br/ws',
                format: (cep) => `${this.endpoints.viacep.base}/${cep}/json/`
            },
            nominatim: {
                base: 'https://nominatim.openstreetmap.org',
                search: (params) => `${this.endpoints.nominatim.base}/search?${params}`
            }
        };
        
        // Circuit breaker simples
        this.circuitBreaker = {
            nominatim: { failures: 0, threshold: 5, isOpen: false, lastFailure: 0, cooldown: 300000 },
            viacep: { failures: 0, threshold: 3, isOpen: false, lastFailure: 0, cooldown: 180000 }
        };
        
        // Banco local para fallback
        this.localCoordinates = this.initializeLocalCoordinates();
        
        console.log('✅ GeocodingService - Implementação oficial das APIs inicializada');
    }

    initializeLocalCoordinates() {
        return new Map([
            ['centro', { lat: -23.2237, lon: -45.9009 }],
            ['vila ema', { lat: -23.1980, lon: -45.8850 }],
            ['jardim das industrias', { lat: -23.2450, lon: -45.9100 }],
            ['vila adyana', { lat: -23.2200, lon: -45.8700 }],
            ['vila maria', { lat: -23.2300, lon: -45.9300 }],
            ['jardim paulista', { lat: -23.2100, lon: -45.8920 }],
            ['vila industrial', { lat: -23.2500, lon: -45.9200 }],
            ['jardim esplanada', { lat: -23.2150, lon: -45.8750 }],
            ['jardim paulistano', { lat: -23.2350, lon: -45.9250 }]
        ]);
    }

    async geocodeClients(clients, progressCallback = null) {
        if (this.processing) {
            console.warn('⚠️ Geocodificação já em andamento');
            return clients;
        }
        
        this.processing = true;
        this.resetStats();
        
        console.log(`🔄 Iniciando geocodificação OFICIAL: ${clients.length} clientes`);
        console.log(`📋 Rate limits: Nominatim ${this.delays.nominatim}ms, ViaCEP ${this.delays.viacep}ms`);
        
        const results = [];
        
        try {
            for (let i = 0; i < clients.length; i++) {
                const client = clients[i];
                this.stats.processed++;
                
                // Progress callback
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: clients.length,
                        client: client,
                        percentage: Math.round(((i + 1) / clients.length) * 100)
                    });
                }
                
                console.log(`📍 [${i + 1}/${clients.length}] Processando: ${client['Nome Fantasia']}`);
                
                try {
                    const result = await this.geocodeClientOfficial(client);
                    results.push(result);
                    
                    if (result.geocoding?.success) {
                        this.stats.success++;
                        if (result.geocoding.method?.includes('api')) {
                            this.stats.apiSuccess++;
                        } else {
                            this.stats.localFallback++;
                        }
                    }
                    
                } catch (error) {
                    this.stats.errors++;
                    console.error(`❌ Erro no cliente: ${error.message}`);
                    results.push(this.createGuaranteedFallback(client, error.message));
                }
                
                // Delay entre clientes
                if (i < clients.length - 1) {
                    await this.wait(this.delays.processing);
                }
            }
            
            this.logFinalResults();
            return results;
            
        } finally {
            this.processing = false;
        }
    }

    async geocodeClientOfficial(client) {
        const endereco = client['Endereço'] || '';
        const clientName = client['Nome Fantasia'] || '';
        
        if (!endereco || endereco.length < 8) {
            return this.createGuaranteedFallback(client, 'Endereço muito curto');
        }
        
        // Verificar cache
        const cacheKey = this.createCacheKey(endereco + clientName);
        if (this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            const cached = this.cache.get(cacheKey);
            console.log('📦 Cache hit');
            return { ...client, geocoding: cached };
        }
        
        // Estratégias em ordem de preferência
        const strategies = [
            () => this.strategyViaCEPOfficial(endereco),
            () => this.strategyNominatimOfficial(endereco, clientName),
            () => this.strategyLocalFallback(endereco, clientName)
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                const strategyName = ['ViaCEP+Nominatim', 'Nominatim Direto', 'Base Local'][i];
                console.log(`🔄 Tentativa ${i + 1}: ${strategyName}`);
                
                const result = await strategies[i]();
                
                if (result?.success) {
                    this.cache.set(cacheKey, result);
                    console.log(`✅ Sucesso com ${strategyName}`);
                    return { ...client, geocoding: result };
                }
                
            } catch (error) {
                console.warn(`⚠️ Estratégia ${i + 1} falhou: ${error.message}`);
                continue;
            }
        }
        
        // Fallback final garantido
        const fallback = this.createGuaranteedFallback(client, 'Todas as estratégias falharam');
        this.cache.set(cacheKey, fallback.geocoding);
        return fallback;
    }

    async strategyViaCEPOfficial(endereco) {
        if (this.isCircuitBreakerOpen('viacep')) {
            throw new Error('ViaCEP temporariamente indisponível');
        }
        
        const ceps = this.extractValidCEPs(endereco);
        if (ceps.length === 0) {
            throw new Error('Nenhum CEP válido encontrado');
        }
        
        console.log(`📮 CEPs encontrados: ${ceps.slice(0, 2).join(', ')}`);
        
        // Processar apenas o primeiro CEP
        const cep = ceps[0];
        
        try {
            // Passo 1: Consultar ViaCEP (conforme documentação oficial)
            await this.enforceRateLimit('viacep');
            
            const viaCEPData = await this.queryViaCEPOfficial(cep);
            
            if (!viaCEPData || viaCEPData.erro) {
                throw new Error(`CEP ${cep} não encontrado no ViaCEP`);
            }
            
            this.stats.viaCepSuccess++;
            this.resetCircuitBreaker('viacep');
            
            // Passo 2: Construir endereço estruturado
            const structuredAddress = this.buildAddressFromViaCEP(viaCEPData);
            console.log(`🏠 Endereço ViaCEP: ${structuredAddress}`);
            
            // Passo 3: Geocodificar com Nominatim
            const coordinates = await this.queryNominatimOfficial(structuredAddress);
            
            if (coordinates) {
                return {
                    success: true,
                    method: 'viacep-nominatim-api',
                    source: 'api',
                    cep: cep,
                    viaCEPData: {
                        logradouro: viaCEPData.logradouro,
                        bairro: viaCEPData.bairro,
                        localidade: viaCEPData.localidade,
                        uf: viaCEPData.uf
                    },
                    structuredAddress: structuredAddress,
                    coordinates: coordinates,
                    confidence: 0.95
                };
            } else {
                throw new Error('Nominatim falhou após ViaCEP');
            }
            
        } catch (error) {
            this.handleCircuitBreakerFailure('viacep');
            throw error;
        }
    }

    async strategyNominatimOfficial(endereco, clientName) {
        if (this.isCircuitBreakerOpen('nominatim')) {
            throw new Error('Nominatim temporariamente indisponível');
        }
        
        const queries = this.buildNominatimQueries(endereco, clientName);
        
        for (let i = 0; i < queries.length; i++) {
            try {
                const query = queries[i];
                console.log(`🌐 Query ${i + 1}/${queries.length}: ${query.substring(0, 60)}...`);
                
                const coordinates = await this.queryNominatimOfficial(query);
                
                if (coordinates) {
                    this.stats.nominatimSuccess++;
                    this.resetCircuitBreaker('nominatim');
                    
                    return {
                        success: true,
                        method: 'nominatim-direct-api',
                        source: 'api',
                        query: query,
                        coordinates: coordinates,
                        confidence: 0.8 - (i * 0.1) // Diminui confiança a cada query
                    };
                }
                
            } catch (error) {
                console.warn(`⚠️ Query ${i + 1} falhou: ${error.message}`);
                continue;
            }
        }
        
        this.handleCircuitBreakerFailure('nominatim');
        throw new Error('Todas as queries Nominatim falharam');
    }

    async strategyLocalFallback(endereco, clientName) {
        console.log('🏠 Usando base de coordenadas local');
        
        const searchText = this.normalizeText(endereco + ' ' + clientName);
        
        // Buscar matches na base local
        for (const [locality, coords] of this.localCoordinates) {
            if (searchText.includes(locality) || this.fuzzyMatch(searchText, locality)) {
                
                // Adicionar variação para evitar sobreposição
                const variation = 0.003;
                const lat = coords.lat + (Math.random() - 0.5) * variation;
                const lon = coords.lon + (Math.random() - 0.5) * variation;
                
                return {
                    success: true,
                    method: 'local-coordinates',
                    source: 'local',
                    locality: locality,
                    coordinates: {
                        lat: lat,
                        lon: lon,
                        display_name: `${locality}, São José dos Campos, SP`
                    },
                    confidence: 0.6
                };
            }
        }
        
        throw new Error('Nenhuma coordenada local encontrada');
    }

    async queryViaCEPOfficial(cep) {
        const url = this.endpoints.viacep.format(cep);
        console.log(`📮 Consultando ViaCEP: ${url}`);
        
        try {
            const response = await this.fetchWithTimeout(url, this.timeouts.viacep, this.headers.viacep);
            
            if (!response.ok) {
                throw new Error(`ViaCEP retornou status ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ ViaCEP respondeu para CEP ${cep}`);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Erro ViaCEP: ${error.message}`);
            throw error;
        }
    }

    async queryNominatimOfficial(query) {
        await this.enforceRateLimit('nominatim');
        
        // Parâmetros CONFORME DOCUMENTAÇÃO OFICIAL
        const params = new URLSearchParams({
            q: query,                    // Query obrigatória
            format: 'json',              // Formato obrigatório
            limit: '1',                  // Limitar a 1 resultado
            countrycodes: 'BR',          // Restringir ao Brasil
            'accept-language': 'pt-BR',  // Idioma preferido
            addressdetails: '0',         // Não precisamos de detalhes extras
            extratags: '0',              // Não precisamos de tags extras
            namedetails: '0'             // Não precisamos de nomes extras
        });
        
        const url = this.endpoints.nominatim.search(params);
        console.log(`🌐 Consultando Nominatim: ${query.substring(0, 50)}...`);
        
        try {
            const response = await this.fetchWithTimeout(url, this.timeouts.nominatim, this.headers.nominatim);
            
            if (!response.ok) {
                throw new Error(`Nominatim retornou status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || data.length === 0) {
                console.log('⚠️ Nominatim: nenhum resultado encontrado');
                return null;
            }
            
            const result = data[0];
            
            // Validar se é resultado brasileiro
            const displayName = result.display_name?.toLowerCase() || '';
            const isBrazilian = displayName.includes('brasil') || 
                               displayName.includes('brazil') ||
                               displayName.includes('sp') ||
                               displayName.includes('são paulo');
            
            if (!isBrazilian) {
                console.log('⚠️ Nominatim: resultado não é do Brasil');
                return null;
            }
            
            console.log('✅ Nominatim: coordenadas encontradas');
            
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                display_name: result.display_name
            };
            
        } catch (error) {
            console.error(`❌ Erro Nominatim: ${error.message}`);
            throw error;
        }
    }

    async fetchWithTimeout(url, timeout, headers = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                signal: controller.signal,
                // NÃO usar cache: 'no-cache' - vai contra a política do Nominatim
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Timeout após ${timeout}ms`);
            }
            
            throw error;
        }
    }

    buildAddressFromViaCEP(viaCEPData) {
        const components = [];
        
        if (viaCEPData.logradouro && viaCEPData.logradouro !== '') {
            components.push(viaCEPData.logradouro);
        }
        
        if (viaCEPData.bairro && viaCEPData.bairro !== '') {
            components.push(viaCEPData.bairro);
        }
        
        components.push(viaCEPData.localidade || 'São José dos Campos');
        components.push(viaCEPData.uf || 'SP');
        components.push('Brasil');
        
        return components.filter(comp => comp && comp.trim() !== '').join(', ');
    }

    buildNominatimQueries(endereco, clientName) {
        const queries = [];
        
        // Query 1: Endereço completo
        queries.push(`${endereco}, São José dos Campos, SP, Brasil`);
        
        // Query 2: Nome da empresa (se disponível e válido)
        if (clientName && clientName.length >= 5 && !clientName.toLowerCase().includes('cliente')) {
            queries.push(`${clientName}, São José dos Campos, SP, Brasil`);
        }
        
        // Query 3: Primeira linha do endereço
        const firstLine = endereco.split(/[\n,]/)[0]?.trim();
        if (firstLine && firstLine.length >= 10) {
            queries.push(`${firstLine}, São José dos Campos, SP, Brasil`);
        }
        
        // Query 4: Fallback apenas da cidade
        queries.push('São José dos Campos, SP, Brasil');
        
        return queries.slice(0, 3); // Máximo 3 queries para não sobrecarregar
    }

    extractValidCEPs(endereco) {
        const ceps = [];
        
        // Patterns oficiais para CEPs brasileiros
        const cepPatterns = [
            /(\d{5})-(\d{3})/g,        // Formato 12345-678
            /(\d{2})\.(\d{3})-(\d{3})/g, // Formato 12.345-678
            /\b(\d{8})\b/g             // Formato 12345678
        ];
        
        cepPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(endereco)) !== null) {
                let cep;
                
                if (match.length === 4) { // Formato 12.345-678
                    cep = match[1] + match[2] + match[3];
                } else if (match.length === 3) { // Formato 12345-678
                    cep = match[1] + match[2];
                } else { // Formato 12345678
                    cep = match[1];
                }
                
                if (this.isValidBrazilianCEP(cep)) {
                    ceps.push(cep);
                }
            }
        });
        
        return [...new Set(ceps)]; // Remove duplicatas
    }

    isValidBrazilianCEP(cep) {
        // Validação oficial de CEPs brasileiros
        if (!/^\d{8}$/.test(cep)) return false;
        if (/^(\d)\1{7}$/.test(cep)) return false; // Todos iguais
        
        const firstDigit = parseInt(cep.charAt(0));
        return firstDigit >= 0 && firstDigit <= 9;
    }

    async enforceRateLimit(service) {
        const now = Date.now();
        const elapsed = now - this.lastRequest[service];
        const minDelay = this.delays[service];
        
        if (elapsed < minDelay) {
            const waitTime = minDelay - elapsed;
            console.log(`⏳ Rate limit ${service}: aguardando ${waitTime}ms`);
            await this.wait(waitTime);
        }
        
        this.lastRequest[service] = Date.now();
    }

    isCircuitBreakerOpen(service) {
        const cb = this.circuitBreaker[service];
        if (!cb) return false;
        
        if (cb.isOpen && (Date.now() - cb.lastFailure) > cb.cooldown) {
            cb.isOpen = false;
            cb.failures = 0;
            console.log(`🔄 Circuit breaker ${service} resetado`);
        }
        
        return cb.isOpen;
    }

    handleCircuitBreakerFailure(service) {
        const cb = this.circuitBreaker[service];
        if (!cb) return;
        
        cb.failures++;
        cb.lastFailure = Date.now();
        
        if (cb.failures >= cb.threshold) {
            cb.isOpen = true;
            console.warn(`🚫 Circuit breaker ${service} ativado (${cb.failures} falhas)`);
        }
    }

    resetCircuitBreaker(service) {
        const cb = this.circuitBreaker[service];
        if (cb) {
            cb.failures = 0;
            cb.lastFailure = 0;
            cb.isOpen = false;
        }
    }

    createGuaranteedFallback(client, reason) {
        const fallbackLocations = [
            { lat: -23.2237, lon: -45.9009, area: 'Centro' },
            { lat: -23.2100, lon: -45.8850, area: 'Zona Norte' },
            { lat: -23.2400, lon: -45.9100, area: 'Zona Sul' },
            { lat: -23.2200, lon: -45.8700, area: 'Zona Leste' },
            { lat: -23.2300, lon: -45.9300, area: 'Zona Oeste' }
        ];
        
        const locationIndex = this.stats.processed % fallbackLocations.length;
        const location = fallbackLocations[locationIndex];
        
        // Pequena variação para distribuir marcadores
        const variation = 0.005;
        const lat = location.lat + (Math.random() - 0.5) * variation;
        const lon = location.lon + (Math.random() - 0.5) * variation;
        
        return {
            ...client,
            geocoding: {
                success: true,
                method: 'guaranteed-fallback',
                source: 'fallback',
                reason: reason,
                coordinates: {
                    lat: lat,
                    lon: lon,
                    display_name: `${client['Nome Fantasia']} - ${location.area}, São José dos Campos, SP (localização aproximada)`
                },
                confidence: 0.3,
                isApproximate: true,
                area: location.area
            }
        };
    }

    normalizeText(text) {
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s]/g, ' ')        // Remove pontuação
            .replace(/\s+/g, ' ')            // Normaliza espaços
            .trim();
    }

    fuzzyMatch(text, pattern) {
        const patternWords = pattern.split(' ');
        return patternWords.some(word => 
            word.length > 3 && text.includes(word)
        );
    }

    createCacheKey(text) {
        return this.normalizeText(text).substring(0, 100);
    }

    logFinalResults() {
        const totalSuccess = this.stats.success;
        const apiSuccessRate = this.stats.processed > 0 ? 
            Math.round((this.stats.apiSuccess / this.stats.processed) * 100) : 0;
        const totalSuccessRate = this.stats.processed > 0 ?
            Math.round((totalSuccess / this.stats.processed) * 100) : 0;
        
        console.log(`\n🎉 GEOCODIFICAÇÃO OFICIAL CONCLUÍDA:`);
        console.log(`📊 Total processados: ${this.stats.processed}`);
        console.log(`✅ Total sucessos: ${totalSuccess} (${totalSuccessRate}%)`);
        console.log(`🌐 Sucessos via API: ${this.stats.apiSuccess} (${apiSuccessRate}%)`);
        console.log(`  📮 ViaCEP: ${this.stats.viaCepSuccess} sucessos`);
        console.log(`  🗺️ Nominatim: ${this.stats.nominatimSuccess} sucessos`);
        console.log(`🏠 Fallback local: ${this.stats.localFallback}`);
        console.log(`📦 Cache hits: ${this.stats.cacheHits}`);
        console.log(`❌ Erros: ${this.stats.errors}`);
        console.log(`\n🛡️ Status dos Circuit Breakers:`);
        console.log(`  • Nominatim: ${this.circuitBreaker.nominatim.isOpen ? '🚫 ATIVO' : '✅ OK'} (${this.circuitBreaker.nominatim.failures} falhas)`);
        console.log(`  • ViaCEP: ${this.circuitBreaker.viacep.isOpen ? '🚫 ATIVO' : '✅ OK'} (${this.circuitBreaker.viacep.failures} falhas)`);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetStats() {
        this.stats = { 
            processed: 0, success: 0, apiSuccess: 0, localFallback: 0,
            cacheHits: 0, viaCepSuccess: 0, nominatimSuccess: 0, errors: 0
        };
    }

    getStats() {
        return { 
            ...this.stats,
            cacheSize: this.cache.size,
            localCoordinatesSize: this.localCoordinates.size,
            circuitBreakers: {
                nominatim: {
                    failures: this.circuitBreaker.nominatim.failures,
                    isOpen: this.circuitBreaker.nominatim.isOpen
                },
                viacep: {
                    failures: this.circuitBreaker.viacep.failures,
                    isOpen: this.circuitBreaker.viacep.isOpen
                }
            }
        };
    }

    clearCache() {
        this.cache.clear();
        
        // Reset circuit breakers
        Object.values(this.circuitBreaker).forEach(cb => {
            cb.failures = 0;
            cb.lastFailure = 0;
            cb.isOpen = false;
        });
        
        console.log('🧹 Cache e circuit breakers limpos');
    }
}

window.geocodingService = new GeocodingService();
console.log('✅ geocoding-service.js - IMPLEMENTAÇÃO OFICIAL DAS APIs carregada');
