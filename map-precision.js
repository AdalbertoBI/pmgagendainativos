// map-precision.js - Sistema de geolocalização de alta precisão para PMG

class MapPrecision {
    constructor() {
        this.version = '1.0.0';
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.config = {
            geocodeAPI: 'https://api.opencagedata.com/geocode/v1/json',
            apiKey: null, // Configurar se necessário
            fallbackAPIs: [
                'https://nominatim.openstreetmap.org/search',
                'https://api.mapbox.com/geocoding/v5/mapbox.places'
            ],
            precision: {
                city: 0.01, // ~1km
                street: 0.001, // ~100m
                number: 0.0001 // ~10m
            },
            timeout: 10000,
            retries: 3
        };
        this.locationDatabase = new Map();
        this.initDatabase();
    }

    // Inicializar base de dados de localizações conhecidas
    initDatabase() {
        // Base de conhecimento para São José dos Campos e região
        this.locationDatabase.set('são josé dos campos', {
            lat: -23.1794,
            lng: -45.8869,
            bounds: {
                north: -23.1000,
                south: -23.2500,
                east: -45.8000,
                west: -46.0000
            }
        });

        // Bairros principais de São José dos Campos
        const bairros = {
            'centro': { lat: -23.1794, lng: -45.8869 },
            'vila adyana': { lat: -23.1650, lng: -45.8920 },
            'jardim das colinas': { lat: -23.1580, lng: -45.8750 },
            'vale do sol': { lat: -23.1900, lng: -45.8400 },
            'urbanova': { lat: -23.1200, lng: -45.8300 },
            'bosque dos eucaliptos': { lat: -23.1700, lng: -45.8200 },
            'jardim satélite': { lat: -23.1950, lng: -45.8650 },
            'vila ema': { lat: -23.1850, lng: -45.8950 },
            'parque industrial': { lat: -23.2100, lng: -45.8800 },
            'jardim aquarius': { lat: -23.1400, lng: -45.8600 }
        };

        Object.entries(bairros).forEach(([nome, coords]) => {
            this.locationDatabase.set(nome.toLowerCase(), coords);
        });

        // Cidades da região
        const cidadesRegiao = {
            'jacareí': { lat: -23.3055, lng: -45.9656 },
            'taubaté': { lat: -23.0264, lng: -45.5553 },
            'guaratinguetá': { lat: -22.8166, lng: -45.1933 },
            'caçapava': { lat: -23.1044, lng: -45.7122 },
            'monteiro lobato': { lat: -22.9578, lng: -45.8394 },
            'igaratá': { lat: -23.2044, lng: -46.1378 },
            'santa branca': { lat: -23.4022, lng: -45.8833 },
            'são luís do paraitinga': { lat: -23.2244, lng: -45.3067 }
        };

        Object.entries(cidadesRegiao).forEach(([nome, coords]) => {
            this.locationDatabase.set(nome.toLowerCase(), coords);
        });

        console.log('📍 Base de dados de localizações carregada');
    }

    // Geocodificar endereço com alta precisão
    async geocodeAddress(address, city = 'São José dos Campos', uf = 'SP') {
        const fullAddress = this.normalizeAddress(address, city, uf);
        const cacheKey = this.getCacheKey(fullAddress);

        // Verificar cache
        if (this.cache.has(cacheKey)) {
            console.log('📍 Endereço encontrado no cache');
            return this.cache.get(cacheKey);
        }

        // Verificar se já existe uma requisição pendente
        if (this.pendingRequests.has(cacheKey)) {
            return await this.pendingRequests.get(cacheKey);
        }

        // Criar nova requisição
        const requestPromise = this.performGeocode(fullAddress, city, uf);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            this.cache.set(cacheKey, result);
            this.pendingRequests.delete(cacheKey);
            return result;
        } catch (error) {
            this.pendingRequests.delete(cacheKey);
            throw error;
        }
    }

    // Normalizar endereço
    normalizeAddress(address, city, uf) {
        let normalized = address.trim().toLowerCase();
        
        // Remover caracteres especiais e normalizar
        normalized = normalized
            .replace(/[áàâãä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôõö]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/ç/g, 'c')
            .replace(/[^\w\s,.-]/g, '')
            .replace(/\s+/g, ' ');

        // Expandir abreviações comuns
        normalized = normalized
            .replace(/\br\.\s*/g, 'rua ')
            .replace(/\bav\.\s*/g, 'avenida ')
            .replace(/\bpç\.\s*/g, 'praça ')
            .replace(/\bal\.\s*/g, 'alameda ')
            .replace(/\btv\.\s*/g, 'travessa ')
            .replace(/\best\.\s*/g, 'estrada ')
            .replace(/\brod\.\s*/g, 'rodovia ')
            .replace(/\bn\.\s*(\d+)/g, 'número $1')
            .replace(/\bs\/n\b/g, 'sem número');

        return `${normalized}, ${city.toLowerCase()}, ${uf.toLowerCase()}, brasil`;
    }

    // Realizar geocodificação
    async performGeocode(fullAddress, city, uf) {
        console.log(`📍 Geocodificando: ${fullAddress}`);

        // Primeiro, tentar busca na base local
        const localResult = this.searchLocalDatabase(fullAddress, city);
        if (localResult) {
            console.log('📍 Encontrado na base local');
            return {
                ...localResult,
                precision: 'city',
                source: 'local',
                confidence: 0.8
            };
        }

        // Se não encontrou localmente, usar APIs externas
        return await this.geocodeWithAPIs(fullAddress);
    }

    // Buscar na base de dados local
    searchLocalDatabase(address, city) {
        const cityKey = city.toLowerCase();
        
        // Busca exata por cidade
        if (this.locationDatabase.has(cityKey)) {
            return this.locationDatabase.get(cityKey);
        }

        // Busca por bairros em São José dos Campos
        if (cityKey.includes('são josé') || cityKey.includes('sjc')) {
            const addressLower = address.toLowerCase();
            
            for (const [bairro, coords] of this.locationDatabase.entries()) {
                if (addressLower.includes(bairro)) {
                    return coords;
                }
            }
            
            // Retornar centro se for SJC
            return this.locationDatabase.get('são josé dos campos');
        }

        return null;
    }

    // Geocodificar usando APIs externas
    async geocodeWithAPIs(address) {
        const errors = [];

        // Tentar OpenStreetMap Nominatim primeiro (gratuito)
        try {
            const result = await this.geocodeWithNominatim(address);
            if (result) {
                return result;
            }
        } catch (error) {
            errors.push(`Nominatim: ${error.message}`);
        }

        // Se falhou, tentar busca simplificada
        try {
            const simplifiedResult = await this.simplifiedGeocode(address);
            if (simplifiedResult) {
                return simplifiedResult;
            }
        } catch (error) {
            errors.push(`Simplified: ${error.message}`);
        }

        // Se tudo falhou, retornar coordenadas aproximadas
        console.warn('⚠️ Geocodificação falhou, usando coordenadas aproximadas');
        return this.getApproximateCoordinates(address);
    }

    // Geocodificar com Nominatim
    async geocodeWithNominatim(address) {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', address);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');
        url.searchParams.set('countrycodes', 'br');
        url.searchParams.set('addressdetails', '1');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'PMG-Agenda/1.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    precision: this.determinePrecision(result),
                    source: 'nominatim',
                    confidence: this.calculateConfidence(result),
                    address: result.display_name
                };
            }

            return null;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Geocodificação simplificada
    async simplifiedGeocode(fullAddress) {
        // Extrair apenas a cidade para busca simplificada
        const parts = fullAddress.split(',');
        const city = parts[1] ? parts[1].trim() : parts[0].trim();

        // Buscar apenas a cidade
        if (this.locationDatabase.has(city.toLowerCase())) {
            const coords = this.locationDatabase.get(city.toLowerCase());
            return {
                ...coords,
                precision: 'city',
                source: 'simplified',
                confidence: 0.7
            };
        }

        // Tentar busca fuzzy
        return this.fuzzySearch(city);
    }

    // Busca fuzzy para cidades similares
    fuzzySearch(target) {
        const targetLower = target.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;

        for (const [name, coords] of this.locationDatabase.entries()) {
            const score = this.calculateSimilarity(targetLower, name);
            if (score > bestScore && score > 0.6) {
                bestScore = score;
                bestMatch = {
                    ...coords,
                    precision: 'approximate',
                    source: 'fuzzy',
                    confidence: score
                };
            }
        }

        return bestMatch;
    }

    // Calcular similaridade entre strings
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    // Calcular distância Levenshtein
    levenshteinDistance(str1, str2) {
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

    // Obter coordenadas aproximadas como fallback
    getApproximateCoordinates(address) {
        // Verificar se contém "são josé" ou "sjc"
        const addressLower = address.toLowerCase();
        
        if (addressLower.includes('são josé') || addressLower.includes('sjc')) {
            const baseCoords = this.locationDatabase.get('são josé dos campos');
            return {
                ...baseCoords,
                lat: baseCoords.lat + (Math.random() - 0.5) * 0.02,
                lng: baseCoords.lng + (Math.random() - 0.5) * 0.02,
                precision: 'approximate',
                source: 'fallback',
                confidence: 0.5
            };
        }

        // Coordenadas padrão para SP
        return {
            lat: -23.5505 + (Math.random() - 0.5) * 2,
            lng: -46.6333 + (Math.random() - 0.5) * 2,
            precision: 'state',
            source: 'fallback',
            confidence: 0.3
        };
    }

    // Determinar precisão baseada na resposta da API
    determinePrecision(result) {
        if (!result.address) return 'unknown';

        const address = result.address;
        
        if (address.house_number) return 'exact';
        if (address.road || address.street) return 'street';
        if (address.suburb || address.neighbourhood) return 'neighbourhood';
        if (address.city || address.town || address.village) return 'city';
        if (address.state) return 'state';
        
        return 'country';
    }

    // Calcular confiança baseada na resposta
    calculateConfidence(result) {
        let confidence = 0.5;

        // Aumentar confiança baseada na precisão
        const precision = this.determinePrecision(result);
        switch (precision) {
            case 'exact': confidence = 0.95; break;
            case 'street': confidence = 0.85; break;
            case 'neighbourhood': confidence = 0.75; break;
            case 'city': confidence = 0.65; break;
            default: confidence = 0.5;
        }

        // Ajustar baseado no display_name
        if (result.display_name) {
            const displayLower = result.display_name.toLowerCase();
            if (displayLower.includes('brasil') || displayLower.includes('brazil')) {
                confidence += 0.1;
            }
            if (displayLower.includes('são paulo')) {
                confidence += 0.1;
            }
        }

        return Math.min(confidence, 1.0);
    }

    // Gerar chave para cache
    getCacheKey(address) {
        return address.toLowerCase().replace(/\s+/g, '_');
    }

    // Validar coordenadas
    validateCoordinates(lat, lng) {
        return (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180 &&
            !isNaN(lat) && !isNaN(lng)
        );
    }

    // Calcular distância entre dois pontos
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raio da Terra em km
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Converter graus para radianos
    toRad(value) {
        return value * Math.PI / 180;
    }

    // Limpar cache
    clearCache() {
        this.cache.clear();
        console.log('📍 Cache de geocodificação limpo');
    }

    // Obter estatísticas do cache
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
            locations: this.locationDatabase.size
        };
    }

    // Adicionar localização personalizada
    addCustomLocation(name, lat, lng, metadata = {}) {
        if (!this.validateCoordinates(lat, lng)) {
            throw new Error('Coordenadas inválidas');
        }

        this.locationDatabase.set(name.toLowerCase(), {
            lat,
            lng,
            ...metadata,
            custom: true,
            added: Date.now()
        });

        console.log(`📍 Localização personalizada adicionada: ${name}`);
    }

    // Remover localização personalizada
    removeCustomLocation(name) {
        const key = name.toLowerCase();
        const location = this.locationDatabase.get(key);
        
        if (location && location.custom) {
            this.locationDatabase.delete(key);
            console.log(`📍 Localização personalizada removida: ${name}`);
            return true;
        }
        
        return false;
    }

    // Exportar localizações personalizadas
    exportCustomLocations() {
        const customLocations = {};
        
        for (const [name, data] of this.locationDatabase.entries()) {
            if (data.custom) {
                customLocations[name] = data;
            }
        }
        
        return customLocations;
    }

    // Importar localizações personalizadas
    importCustomLocations(locations) {
        let imported = 0;
        
        Object.entries(locations).forEach(([name, data]) => {
            if (this.validateCoordinates(data.lat, data.lng)) {
                this.locationDatabase.set(name.toLowerCase(), {
                    ...data,
                    custom: true,
                    imported: Date.now()
                });
                imported++;
            }
        });
        
        console.log(`📍 ${imported} localizações personalizadas importadas`);
        return imported;
    }

    // Buscar localizações próximas
    findNearbyLocations(lat, lng, radiusKm = 10) {
        if (!this.validateCoordinates(lat, lng)) {
            return [];
        }

        const nearby = [];
        
        for (const [name, location] of this.locationDatabase.entries()) {
            const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
            if (distance <= radiusKm) {
                nearby.push({
                    name,
                    ...location,
                    distance
                });
            }
        }
        
        return nearby.sort((a, b) => a.distance - b.distance);
    }

    // Geocodificação reversa (coordenadas para endereço)
    async reverseGeocode(lat, lng) {
        if (!this.validateCoordinates(lat, lng)) {
            throw new Error('Coordenadas inválidas');
        }

        const cacheKey = `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const url = new URL('https://nominatim.openstreetmap.org/reverse');
            url.searchParams.set('lat', lat.toString());
            url.searchParams.set('lon', lng.toString());
            url.searchParams.set('format', 'json');
            url.searchParams.set('addressdetails', '1');

            const response = await fetch(url.toString(), {
                headers: { 'User-Agent': 'PMG-Agenda/1.0' }
            });

            if (response.ok) {
                const data = await response.json();
                const result = {
                    address: data.display_name,
                    components: data.address,
                    source: 'nominatim'
                };
                
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.warn('⚠️ Geocodificação reversa falhou:', error.message);
        }

        // Fallback: buscar localização mais próxima na base local
        const nearby = this.findNearbyLocations(lat, lng, 5);
        if (nearby.length > 0) {
            const closest = nearby[0];
            return {
                address: `Próximo a ${closest.name}`,
                components: { city: closest.name },
                source: 'local',
                distance: closest.distance
            };
        }

        return {
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            components: {},
            source: 'coordinates'
        };
    }
}

// Instância global
window.mapPrecision = new MapPrecision();
console.log('📍 map-precision.js carregado - Sistema de alta precisão');
