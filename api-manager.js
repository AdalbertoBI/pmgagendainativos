// api-manager.js - Gerenciamento de APIs e serviços externos para PMG

class APIManager {
    constructor() {
        this.version = '1.0.0';
        this.apis = {
            cep: {
                primary: 'https://viacep.com.br/ws',
                fallback: ['https://cep.awesomeapi.com.br/json', 'https://ws.apicep.com/cep']
            },
            geocoding: {
                primary: 'https://nominatim.openstreetmap.org',
                fallback: ['https://api.opencagedata.com/geocode/v1/json']
            }
        };
        this.cache = new Map();
        this.requestQueue = [];
        this.rateLimit = {
            requests: 0,
            lastReset: Date.now(),
            maxPerMinute: 60
        };
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
        };
    }

    // Buscar CEP com fallbacks
    async buscarCEP(cep) {
        const cleanCEP = cep.replace(/\D/g, '');
        
        if (cleanCEP.length !== 8) {
            throw new Error('CEP deve ter 8 dígitos');
        }

        const cacheKey = `cep_${cleanCEP}`;
        
        // Verificar cache primeiro
        if (this.cache.has(cacheKey)) {
            console.log('📦 CEP encontrado no cache');
            return this.cache.get(cacheKey);
        }

        // Tentar API principal
        try {
            const result = await this.fetchWithRetry(`${this.apis.cep.primary}/${cleanCEP}/json/`);
            
            if (result && !result.erro) {
                const formatted = this.formatCEPResponse(result);
                this.cache.set(cacheKey, formatted);
                return formatted;
            }
        } catch (error) {
            console.warn('⚠️ API principal de CEP falhou:', error.message);
        }

        // Tentar APIs de fallback
        for (const fallbackAPI of this.apis.cep.fallback) {
            try {
                let url;
                if (fallbackAPI.includes('awesomeapi')) {
                    url = `${fallbackAPI}/${cleanCEP}`;
                } else if (fallbackAPI.includes('apicep')) {
                    url = `${fallbackAPI}/${cleanCEP}.json`;
                }

                const result = await this.fetchWithRetry(url);
                
                if (result && result.status !== 400) {
                    const formatted = this.formatCEPResponse(result, fallbackAPI);
                    this.cache.set(cacheKey, formatted);
                    return formatted;
                }
            } catch (error) {
                console.warn(`⚠️ Fallback CEP ${fallbackAPI} falhou:`, error.message);
            }
        }

        throw new Error('Não foi possível buscar informações do CEP');
    }

    // Formatar resposta do CEP
    formatCEPResponse(data, source = 'viacep') {
        const response = {
            cep: data.cep || data.code,
            logradouro: data.logradouro || data.address || data.street,
            complemento: data.complemento || '',
            bairro: data.bairro || data.neighborhood,
            localidade: data.localidade || data.city,
            uf: data.uf || data.state,
            ibge: data.ibge || '',
            gia: data.gia || '',
            ddd: data.ddd || '',
            siafi: data.siafi || '',
            source: source
        };

        return response;
    }

    // Buscar coordenadas com geocodificação
    async buscarCoordenadas(endereco, cidade = 'São José dos Campos', uf = 'SP') {
        const query = `${endereco}, ${cidade}, ${uf}, Brasil`;
        const cacheKey = `geo_${query.toLowerCase().replace(/\s+/g, '_')}`;

        // Verificar cache
        if (this.cache.has(cacheKey)) {
            console.log('📦 Coordenadas encontradas no cache');
            return this.cache.get(cacheKey);
        }

        try {
            const url = `${this.apis.geocoding.primary}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br&addressdetails=1`;
            
            const result = await this.fetchWithRetry(url, {
                headers: {
                    'User-Agent': 'PMG-Agenda/1.0 (contato@pmg.com.br)'
                }
            });

            if (result && result.length > 0) {
                const location = result[0];
                const formatted = {
                    lat: parseFloat(location.lat),
                    lng: parseFloat(location.lon),
                    display_name: location.display_name,
                    address: location.address,
                    confidence: this.calculateGeoConfidence(location),
                    source: 'nominatim'
                };

                this.cache.set(cacheKey, formatted);
                return formatted;
            }
        } catch (error) {
            console.warn('⚠️ Geocodificação falhou:', error.message);
        }

        // Fallback: retornar coordenadas aproximadas baseadas na cidade
        return this.getFallbackCoordinates(cidade, uf);
    }

    // Obter coordenadas de fallback
    getFallbackCoordinates(cidade, uf) {
        const cidadesBrasil = {
            'são josé dos campos': { lat: -23.1794, lng: -45.8869 },
            'taubaté': { lat: -23.0264, lng: -45.5553 },
            'jacareí': { lat: -23.3055, lng: -45.9656 },
            'guaratinguetá': { lat: -22.8166, lng: -45.1933 },
            'caçapava': { lat: -23.1044, lng: -45.7122 },
            'são paulo': { lat: -23.5505, lng: -46.6333 },
            'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
            'belo horizonte': { lat: -19.9167, lng: -43.9345 }
        };

        const chave = cidade.toLowerCase();
        const coords = cidadesBrasil[chave];

        if (coords) {
            return {
                ...coords,
                display_name: `${cidade}, ${uf}, Brasil`,
                confidence: 0.7,
                source: 'fallback'
            };
        }

        // Coordenadas padrão para SP
        return {
            lat: -23.5505 + (Math.random() - 0.5) * 0.1,
            lng: -46.6333 + (Math.random() - 0.5) * 0.1,
            display_name: `${cidade}, ${uf}, Brasil`,
            confidence: 0.5,
            source: 'approximate'
        };
    }

    // Calcular confiança da geocodificação
    calculateGeoConfidence(location) {
        let confidence = 0.5;

        if (location.address) {
            const addr = location.address;
            if (addr.house_number) confidence = 0.95;
            else if (addr.road) confidence = 0.85;
            else if (addr.neighbourhood) confidence = 0.75;
            else if (addr.city) confidence = 0.65;
        }

        // Ajustar baseado na importância OSM
        if (location.importance) {
            confidence = Math.max(confidence, location.importance);
        }

        return Math.min(confidence, 1.0);
    }

    // Fetch com retry automático
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        await this.checkRateLimit();

        try {
            console.log(`🌐 Fazendo requisição: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            this.rateLimit.requests++;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.warn(`⚠️ Requisição falhou (tentativa ${retryCount + 1}):`, error.message);

            if (retryCount < this.retryConfig.maxRetries) {
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(2, retryCount),
                    this.retryConfig.maxDelay
                );

                console.log(`⏱️ Tentando novamente em ${delay}ms...`);
                await this.sleep(delay);

                return this.fetchWithRetry(url, options, retryCount + 1);
            }

            throw error;
        }
    }

    // Verificar rate limit
    async checkRateLimit() {
        const now = Date.now();
        
        // Reset contador a cada minuto
        if (now - this.rateLimit.lastReset > 60000) {
            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = now;
        }

        // Se excedeu o limite, aguardar
        if (this.rateLimit.requests >= this.rateLimit.maxPerMinute) {
            const waitTime = 60000 - (now - this.rateLimit.lastReset);
            if (waitTime > 0) {
                console.log(`⏱️ Rate limit atingido. Aguardando ${waitTime}ms...`);
                await this.sleep(waitTime);
                this.rateLimit.requests = 0;
                this.rateLimit.lastReset = Date.now();
            }
        }
    }

    // Função de sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Buscar informações de empresa por CNPJ
    async buscarCNPJ(cnpj) {
        const cleanCNPJ = cnpj.replace(/\D/g, '');
        
        if (cleanCNPJ.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos');
        }

        const cacheKey = `cnpj_${cleanCNPJ}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Usar API gratuita ReceitaWS
            const url = `https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`;
            const result = await this.fetchWithRetry(url);

            if (result && result.status === 'OK') {
                const formatted = this.formatCNPJResponse(result);
                this.cache.set(cacheKey, formatted);
                return formatted;
            }
        } catch (error) {
            console.warn('⚠️ Busca de CNPJ falhou:', error.message);
        }

        throw new Error('Não foi possível buscar informações do CNPJ');
    }

    // Formatar resposta do CNPJ
    formatCNPJResponse(data) {
        return {
            cnpj: data.cnpj,
            nome: data.nome,
            fantasia: data.fantasia,
            situacao: data.situacao,
            tipo: data.tipo,
            porte: data.porte,
            natureza_juridica: data.natureza_juridica,
            endereco: {
                logradouro: data.logradouro,
                numero: data.numero,
                complemento: data.complemento,
                bairro: data.bairro,
                municipio: data.municipio,
                uf: data.uf,
                cep: data.cep
            },
            telefone: data.telefone,
            email: data.email,
            atividade_principal: data.atividade_principal,
            atividades_secundarias: data.atividades_secundarias,
            capital_social: data.capital_social,
            data_situacao: data.data_situacao,
            source: 'receitaws'
        };
    }

    // Validar telefone e formatar
    validarTelefone(telefone) {
        const cleaned = telefone.replace(/\D/g, '');
        
        if (cleaned.length >= 10 && cleaned.length <= 11) {
            // Formato brasileiro
            if (cleaned.length === 11) {
                return {
                    formatted: `(${cleaned.substring(0,2)}) ${cleaned.substring(2,7)}-${cleaned.substring(7)}`,
                    whatsapp: `55${cleaned}`,
                    valid: true
                };
            } else {
                return {
                    formatted: `(${cleaned.substring(0,2)}) ${cleaned.substring(2,6)}-${cleaned.substring(6)}`,
                    whatsapp: `55${cleaned}`,
                    valid: true
                };
            }
        }

        return {
            formatted: telefone,
            whatsapp: null,
            valid: false
        };
    }

    // Validar email
    validarEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            valid: regex.test(email),
            formatted: email.toLowerCase().trim()
        };
    }

    // Validar CNPJ
    validarCNPJ(cnpj) {
        const cleaned = cnpj.replace(/\D/g, '');
        
        if (cleaned.length !== 14) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cleaned)) return false;

        // Validar dígitos verificadores
        let tamanho = cleaned.length - 2;
        let numeros = cleaned.substring(0, tamanho);
        let digitos = cleaned.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;

        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }

        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado != digitos.charAt(0)) return false;

        tamanho = tamanho + 1;
        numeros = cleaned.substring(0, tamanho);
        soma = 0;
        pos = tamanho - 7;

        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }

        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        return resultado == digitos.charAt(1);
    }

    // Validar CPF
    validarCPF(cpf) {
        const cleaned = cpf.replace(/\D/g, '');
        
        if (cleaned.length !== 11) return false;
        if (/^(\d)\1+$/.test(cleaned)) return false;

        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cleaned.charAt(i)) * (10 - i);
        }

        let resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cleaned.charAt(9))) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cleaned.charAt(i)) * (11 - i);
        }

        resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        return resto === parseInt(cleaned.charAt(10));
    }

    // Limpar cache
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache de APIs limpo');
    }

    // Obter estatísticas
    getStats() {
        return {
            cacheSize: this.cache.size,
            requestsThisMinute: this.rateLimit.requests,
            rateLimitStatus: `${this.rateLimit.requests}/${this.rateLimit.maxPerMinute}`
        };
    }

    // Testar conectividade das APIs
    async testAPIs() {
        const results = {
            cep: false,
            geocoding: false,
            timestamp: new Date().toISOString()
        };

        // Testar API de CEP
        try {
            await this.fetchWithRetry(`${this.apis.cep.primary}/01310-100/json/`);
            results.cep = true;
        } catch (error) {
            console.warn('❌ API de CEP indisponível');
        }

        // Testar API de geocodificação
        try {
            const url = `${this.apis.geocoding.primary}/search?q=São José dos Campos&format=json&limit=1`;
            await this.fetchWithRetry(url);
            results.geocoding = true;
        } catch (error) {
            console.warn('❌ API de geocodificação indisponível');
        }

        return results;
    }

    // Configurar timeout customizado
    setTimeout(ms) {
        this.timeout = ms;
    }

    // Configurar rate limit customizado
    setRateLimit(requestsPerMinute) {
        this.rateLimit.maxPerMinute = requestsPerMinute;
    }

    // Adicionar API personalizada
    addCustomAPI(name, config) {
        this.apis[name] = config;
        console.log(`🔧 API personalizada '${name}' adicionada`);
    }

    // Remover API personalizada
    removeCustomAPI(name) {
        if (this.apis[name]) {
            delete this.apis[name];
            console.log(`🗑️ API personalizada '${name}' removida`);
        }
    }
}

// Instância global
window.apiManager = new APIManager();
console.log('🌐 api-manager.js carregado - Gerenciador de APIs');
