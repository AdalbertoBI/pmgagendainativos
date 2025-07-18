// sjc-geo-validator.js - Validador Geoespacial para São José dos Campos

class SJCGeoValidator {
    constructor() {
        // Limites geográficos ultra precisos de São José dos Campos
        this.bounds = {
            minLat: -23.60,  // Sul
            maxLat: -22.80,  // Norte
            minLng: -46.20,  // Oeste
            maxLng: -45.60   // Leste
        };

        // Centro de SJC para fallback
        this.centerSJC = {
            lat: -23.22370,
            lng: -45.90090
        };

        // Coordenadas ultra precisas de bairros críticos
        this.preciseBairros = {
            'CENTRO': { lat: -23.17940, lng: -45.88560 },
            'EUGÊNIO DE MELO': { lat: -23.14500, lng: -45.98500 },
            'PARQUE RESIDENCIAL AQUARIUS': { lat: -23.20560, lng: -45.85000 },
            'JARDIM AQUARIUS': { lat: -23.20940, lng: -45.86110 },
            'JARDIM UIRÁ': { lat: -23.21670, lng: -45.88330 },
            'VILA ADYANA': { lat: -23.18890, lng: -45.88330 },
            'JARDIM SATELITE': { lat: -23.22780, lng: -45.86670 },
            'URBANOVA': { lat: -23.29440, lng: -45.86110 },
            'PINHEIRINHO': { lat: -23.25560, lng: -45.88890 },
            'PUTIM': { lat: -23.16670, lng: -45.83330 },
            'SANTANA': { lat: -23.19440, lng: -45.86670 }
        };

        // Ruas ultra precisas
        this.preciseRuas = {
            'RUA VINTE E UM DE ABRIL': { lat: -23.14450, lng: -45.98550, bairro: 'EUGÊNIO DE MELO' },
            'RUA QUINZE DE NOVEMBRO': { lat: -23.14500, lng: -45.98450, bairro: 'EUGÊNIO DE MELO' },
            'RUA CORONEL JOSÉ VICENTE': { lat: -23.14550, lng: -45.98500, bairro: 'EUGÊNIO DE MELO' },
            'AVENIDA JOÃO XXIII': { lat: -23.14900, lng: -45.98100, bairro: 'EUGÊNIO DE MELO' },
            'AVENIDA PRESIDENTE VARGAS': { lat: -23.17800, lng: -45.88700, bairro: 'CENTRO' },
            'RUA SETE DE SETEMBRO': { lat: -23.17940, lng: -45.88560, bairro: 'CENTRO' }
        };

        console.log('✅ SJCGeoValidator inicializado');
        console.log(`📍 Bounds SJC: ${this.bounds.minLat} a ${this.bounds.maxLat}, ${this.bounds.minLng} a ${this.bounds.maxLng}`);
        console.log(`🎯 ${Object.keys(this.preciseBairros).length} bairros precisos`);
        console.log(`🏠 ${Object.keys(this.preciseRuas).length} ruas precisas`);
    }

    // Verificar se coordenada está dentro dos limites de SJC
    isWithinSJCBounds(coords) {
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
            return false;
        }

        return (
            coords.lat >= this.bounds.minLat &&
            coords.lat <= this.bounds.maxLat &&
            coords.lng >= this.bounds.minLng &&
            coords.lng <= this.bounds.maxLng
        );
    }

    // Calcular distância entre duas coordenadas (Haversine)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Verificar se coordenada está próxima do centro de SJC
    isNearSJCCenter(coords, maxDistanceKm = 30) {
        const distance = this.calculateDistance(
            coords.lat, coords.lng,
            this.centerSJC.lat, this.centerSJC.lng
        );
        return distance <= maxDistanceKm;
    }

    // Validar e corrigir coordenadas
    validateAndCorrect(coords, client) {
        if (!coords) {
            console.log('⚠️ Coordenadas nulas - usando fallback');
            return this.getFallbackCoords(client);
        }

        // Verificar se está dentro dos limites de SJC
        if (this.isWithinSJCBounds(coords)) {
            console.log('✅ Coordenadas válidas para SJC');
            return {
                ...coords,
                confidence: Math.min((coords.confidence || 0.8) + 0.1, 1.0),
                provider: coords.provider + '-Validado',
                validated: true
            };
        }

        console.warn('⚠️ Coordenadas fora de SJC detectadas:', coords);
        console.warn('⚠️ Cliente:', client['Nome Fantasia']);

        // Tentar correção inteligente
        const correctedCoords = this.getIntelligentFallback(client);
        
        console.log('🔧 Coordenadas corrigidas:', correctedCoords);
        
        return correctedCoords;
    }

    // Obter coordenadas de fallback inteligente
    getIntelligentFallback(client) {
        // 1. Tentar por rua específica
        const endereco = (client.Endereco || '').toUpperCase().trim();
        for (const [rua, coords] of Object.entries(this.preciseRuas)) {
            if (endereco.includes(rua) || this.calculateSimilarity(endereco, rua) > 0.8) {
                console.log(`🎯 Fallback por rua específica: ${rua}`);
                return {
                    lat: coords.lat,
                    lng: coords.lng,
                    confidence: 0.95,
                    provider: 'SJCValidator-Rua',
                    validated: true,
                    fallbackReason: 'Rua específica'
                };
            }
        }

        // 2. Tentar por bairro específico
        const bairro = (client.Bairro || '').toUpperCase().trim();
        for (const [bairroKey, coords] of Object.entries(this.preciseBairros)) {
            if (bairro.includes(bairroKey) || this.calculateSimilarity(bairro, bairroKey) > 0.7) {
                console.log(`🎯 Fallback por bairro específico: ${bairroKey}`);
                
                // Adicionar pequena variação baseada no cliente
                const variation = this.getClientVariation(client);
                
                return {
                    lat: coords.lat + variation.lat,
                    lng: coords.lng + variation.lng,
                    confidence: 0.90,
                    provider: 'SJCValidator-Bairro',
                    validated: true,
                    fallbackReason: 'Bairro específico'
                };
            }
        }

        // 3. Fallback para centro de SJC
        console.log('🎯 Fallback para centro de SJC');
        const variation = this.getClientVariation(client);
        
        return {
            lat: this.centerSJC.lat + variation.lat,
            lng: this.centerSJC.lng + variation.lng,
            confidence: 0.60,
            provider: 'SJCValidator-Centro',
            validated: true,
            fallbackReason: 'Centro de SJC'
        };
    }

    // Obter fallback básico
    getFallbackCoords(client) {
        const variation = this.getClientVariation(client);
        
        return {
            lat: this.centerSJC.lat + variation.lat,
            lng: this.centerSJC.lng + variation.lng,
            confidence: 0.50,
            provider: 'SJCValidator-Fallback',
            validated: true,
            fallbackReason: 'Coordenadas indisponíveis'
        };
    }

    // Gerar variação única baseada no cliente
    getClientVariation(client) {
        const clientId = client.id || client['Nome Fantasia'] || 'default';
        let hash = 0;
        
        for (let i = 0; i < clientId.length; i++) {
            hash = ((hash << 5) - hash + clientId.charCodeAt(i)) & 0xffffffff;
        }
        
        // Variação pequena para espalhar marcadores
        return {
            lat: ((hash % 200) - 100) * 0.00005,  // ±0.005 grau ≈ 550m
            lng: ((hash % 240) - 120) * 0.00005   // ±0.006 grau ≈ 520m
        };
    }

    // Calcular similaridade entre strings
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    // Distância de Levenshtein
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

    // Verificar se localização do usuário está em SJC
    validateUserLocation(coords) {
        if (!coords) return false;
        
        const isValid = this.isWithinSJCBounds(coords) && this.isNearSJCCenter(coords);
        
        if (!isValid) {
            console.log('🛰️ Localização do usuário fora de SJC:', coords);
        } else {
            console.log('📍 Localização do usuário válida em SJC:', coords);
        }
        
        return isValid;
    }

    // Obter estatísticas de validação
    getValidationStats(results) {
        const stats = {
            total: results.length,
            validCoords: 0,
            correctedCoords: 0,
            fallbackCoords: 0,
            byProvider: {},
            byFallbackReason: {}
        };

        results.forEach(result => {
            if (result.validated) {
                if (result.fallbackReason) {
                    stats.correctedCoords++;
                    stats.byFallbackReason[result.fallbackReason] = 
                        (stats.byFallbackReason[result.fallbackReason] || 0) + 1;
                } else {
                    stats.validCoords++;
                }
            }

            if (result.provider) {
                stats.byProvider[result.provider] = 
                    (stats.byProvider[result.provider] || 0) + 1;
            }
        });

        return stats;
    }

    // Debug de coordenadas
    debugCoords(coords, client) {
        console.log('🔍 DEBUG SJCGeoValidator:');
        console.log('  Cliente:', client['Nome Fantasia']);
        console.log('  Endereço:', client.Endereco, client.Numero, client.Bairro);
        console.log('  Coordenadas originais:', coords);
        console.log('  Dentro de SJC:', this.isWithinSJCBounds(coords));
        console.log('  Próximo ao centro:', this.isNearSJCCenter(coords));
        
        if (coords) {
            const distance = this.calculateDistance(
                coords.lat, coords.lng,
                this.centerSJC.lat, this.centerSJC.lng
            );
            console.log('  Distância do centro SJC:', Math.round(distance * 100) / 100, 'km');
        }
        
        const validated = this.validateAndCorrect(coords, client);
        console.log('  Coordenadas validadas:', validated);
        
        return validated;
    }
}

// Instanciar globalmente
window.SJCGeoValidator = new SJCGeoValidator();

console.log('✅ sjc-geo-validator.js carregado');
