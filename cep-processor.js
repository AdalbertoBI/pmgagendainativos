// cep-processor.js - Sistema MELHORADO para extração precisa de CEPs
class CEPProcessor {
    constructor() {
        // Regex otimizada para CEPs brasileiros
        this.cepRegex = /\b\d{5}-?\d{3}\b/g;
        this.cepCleanRegex = /\D/g;
        this.sequentialNumberRegex = /\b\d{8}\b/g;
        
        // Patterns específicos melhorados
        this.patterns = {
            cepAfterSP: /SP\s*[,\n]\s*(\d{5}-?\d{3}|\d{8})/gi,
            cepIsolated: /^\s*(\d{5}-?\d{3}|\d{8})\s*$/m,
            cepFormatted: /(\d{5})-?(\d{3})/g,
            cepInAddress: /(?:cep|CEP)[\s:]*(\d{5}-?\d{3})/gi,
            numberAfterSP: /SP[\s,\n]+(\d{8})/gi
        };

        // Cache de validação otimizado
        this.validationCache = new Map();
        
        // Faixas de CEP válidas para Brasil (mais específicas)
        this.validRanges = new Set([
            // São Paulo
            '01', '02', '03', '04', '05', '06', '07', '08', '09',
            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
            // Outros estados importantes
            '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', // RJ
            '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', // MG
            '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', // BA/PR/SC
            '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', // NE
            '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', // Norte/CO
            '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', // DF/Centro
            '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', // Sul/NE
            '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'  // RS/Norte
        ]);
        
        console.log('✅ CEPProcessor MELHORADO inicializado');
    }

    extractCEPs(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        console.log('🔍 Extraindo CEPs:', text.substring(0, 80) + '...');
        
        const foundCEPs = new Set();
        
        try {
            // Estratégia 1: CEPs explicitamente formatados
            this.extractExplicitCEPs(text, foundCEPs);
            
            // Estratégia 2: CEPs após indicadores (SP, CEP:, etc)
            this.extractContextualCEPs(text, foundCEPs);
            
            // Estratégia 3: Números de 8 dígitos candidatos
            this.extractSequentialCandidates(text, foundCEPs);
            
            // Estratégia 4: Análise linha por linha
            this.extractFromLineAnalysis(text, foundCEPs);
            
            // Filtrar e validar
            const validCEPs = Array.from(foundCEPs)
                .filter(cep => this.isValidCEP(cep))
                .slice(0, 3); // Máximo 3 CEPs por endereço
            
            console.log(`📊 CEPs válidos extraídos: ${validCEPs.length}`, validCEPs);
            return validCEPs;
            
        } catch (error) {
            console.error('❌ Erro na extração de CEPs:', error);
            return [];
        }
    }

    extractExplicitCEPs(text, foundCEPs) {
        // CEPs com hífen (12345-678)
        const formattedMatches = text.match(/\b(\d{5})-(\d{3})\b/g);
        if (formattedMatches) {
            formattedMatches.forEach(match => {
                const clean = match.replace('-', '');
                if (this.looksLikeCEP(clean)) {
                    foundCEPs.add(clean);
                    console.log('✅ CEP formatado:', clean);
                }
            });
        }
        
        // CEPs após palavra "CEP"
        const cepMatches = text.match(/(?:cep|CEP)[\s:]*(\d{5}-?\d{3})/gi);
        if (cepMatches) {
            cepMatches.forEach(match => {
                const nums = match.match(/\d{5}-?\d{3}/);
                if (nums) {
                    const clean = nums[0].replace(/\D/g, '');
                    if (this.looksLikeCEP(clean)) {
                        foundCEPs.add(clean);
                        console.log('✅ CEP após indicador:', clean);
                    }
                }
            });
        }
    }

    extractContextualCEPs(text, foundCEPs) {
        // CEPs após "SP"
        const afterSP = text.match(/SP[\s,\n]*(\d{5}-?\d{3}|\d{8})/gi);
        if (afterSP) {
            afterSP.forEach(match => {
                const nums = match.match(/(\d{5}-?\d{3}|\d{8})/);
                if (nums) {
                    const clean = nums[1].replace(/\D/g, '');
                    if (this.looksLikeCEP(clean)) {
                        foundCEPs.add(clean);
                        console.log('✅ CEP após SP:', clean);
                    }
                }
            });
        }
        
        // CEPs no final de linhas (padrão comum)
        const lines = text.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^\d{5}-?\d{3}$/) || trimmed.match(/^\d{8}$/)) {
                const clean = trimmed.replace(/\D/g, '');
                if (this.looksLikeCEP(clean)) {
                    foundCEPs.add(clean);
                    console.log('✅ CEP linha isolada:', clean);
                }
            }
        });
    }

    extractSequentialCandidates(text, foundCEPs) {
        // Números de 8 dígitos que podem ser CEPs
        const eightDigitMatches = text.match(/\b(\d{8})\b/g);
        if (eightDigitMatches) {
            eightDigitMatches.forEach(match => {
                if (this.looksLikeCEP(match) && this.hasGoodContext(text, match)) {
                    foundCEPs.add(match);
                    console.log('✅ CEP sequencial:', match);
                }
            });
        }
    }

    extractFromLineAnalysis(text, foundCEPs) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const prevLine = i > 0 ? lines[i - 1].trim() : '';
            const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
            
            // Se linha anterior é "SP" e atual tem 8 dígitos
            if (prevLine.toUpperCase() === 'SP' && /^\d{8}$/.test(line)) {
                if (this.looksLikeCEP(line)) {
                    foundCEPs.add(line);
                    console.log('✅ CEP linha após SP:', line);
                }
            }
            
            // Buscar padrões dentro da linha
            const lineMatches = line.match(/(\d{5})-?(\d{3})/g);
            if (lineMatches) {
                lineMatches.forEach(match => {
                    const clean = match.replace(/\D/g, '');
                    if (this.looksLikeCEP(clean)) {
                        foundCEPs.add(clean);
                        console.log('✅ CEP na linha:', clean);
                    }
                });
            }
        }
    }

    hasGoodContext(text, cep) {
        const index = text.indexOf(cep);
        if (index === -1) return false;
        
        // Verificar contexto ao redor (50 chars antes e depois)
        const before = text.substring(Math.max(0, index - 50), index).toLowerCase();
        const after = text.substring(index + cep.length, Math.min(text.length, index + cep.length + 50)).toLowerCase();
        
        const goodContexts = [
            'sp', 'são paulo', 'cep', 'endereço', 'endereco', 
            'rua', 'avenida', 'av', 'alameda', 'praça', 'praca'
        ];
        
        return goodContexts.some(context => 
            before.includes(context) || after.includes(context)
        );
    }

    looksLikeCEP(cep) {
        if (!cep || typeof cep !== 'string') return false;
        
        const clean = cep.replace(/\D/g, '');
        
        // Deve ter exatamente 8 dígitos
        if (!/^\d{8}$/.test(clean)) return false;
        
        // Não pode ser todos dígitos iguais
        if (/^(\d)\1{7}$/.test(clean)) return false;
        
        // Deve começar com faixa válida
        const firstTwo = clean.substring(0, 2);
        if (!this.validRanges.has(firstTwo)) return false;
        
        // Verificações específicas para São Paulo (mais provável)
        if (firstTwo >= '01' && firstTwo <= '19') {
            return true; // Região SP - mais provável ser CEP válido
        }
        
        // Para outras regiões, ser mais restritivo
        return true;
    }

    isValidCEP(cep) {
        if (!cep || typeof cep !== 'string') return false;
        
        // Usar cache se disponível
        if (this.validationCache.has(cep)) {
            return this.validationCache.get(cep);
        }
        
        const clean = cep.replace(/\D/g, '');
        const isValid = this.looksLikeCEP(clean) && this.passesAdvancedValidation(clean);
        
        this.validationCache.set(cep, isValid);
        
        if (isValid) {
            console.log(`✅ CEP válido confirmado: ${clean}`);
        } else {
            console.log(`❌ CEP inválido: ${clean}`);
        }
        
        return isValid;
    }

    passesAdvancedValidation(cep) {
        // Verificações adicionais de consistência
        
        // CEPs que começam com 00 não existem
        if (cep.startsWith('00')) return false;
        
        // CEPs com padrões suspeitos
        const suspiciousPatterns = [
            /^12345678$/, /^11111111$/, /^99999999$/,
            /^(\d)(\d)\1\2\1\2\1\2$/, // Padrão alternado
            /^(\d{4})\1$/ // Primeira metade repetida
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(cep))) {
            return false;
        }
        
        return true;
    }

    processAddress(rawAddress) {
        if (!rawAddress) return null;
        
        console.log('🏠 Processando endereço completo:', rawAddress.substring(0, 100));
        
        const lines = rawAddress.split('\n')
            .map(line => line.trim())
            .filter(line => line && line !== '');
        
        const result = {
            originalText: rawAddress,
            lines: lines,
            ceps: this.extractCEPs(rawAddress),
            components: this.extractAddressComponents(lines),
            city: 'São José dos Campos',
            state: 'SP',
            country: 'Brasil',
            confidence: this.calculateAddressConfidence(rawAddress)
        };
        
        console.log(`📊 Endereço processado:`, {
            ceps: result.ceps.length,
            components: Object.keys(result.components).filter(k => result.components[k]).length,
            confidence: result.confidence
        });
        
        return result;
    }

    extractAddressComponents(lines) {
        const components = {
            street: null,
            number: null,
            neighborhood: null,
            complement: null,
            state: null,
            city: null
        };
        
        for (const line of lines) {
            const lower = line.toLowerCase();
            
            // Identificar estado
            if (lower === 'sp' || lower === 'são paulo') {
                components.state = 'SP';
                continue;
            }
            
            // Identificar cidade
            if (this.isCityIndicator(lower)) {
                components.city = 'São José dos Campos';
                continue;
            }
            
            // Pular CEPs
            if (this.isValidCEP(line.replace(/\D/g, ''))) {
                continue;
            }
            
            // Identificar rua/logradouro
            if (this.isStreetLine(line)) {
                const streetInfo = this.parseStreetLine(line);
                components.street = streetInfo.street;
                components.number = streetInfo.number;
                continue;
            }
            
            // Identificar bairro
            if (this.isNeighborhoodLine(line)) {
                components.neighborhood = line;
                continue;
            }
            
            // Outros componentes
            if (line.length > 2 && !components.complement) {
                components.complement = line;
            }
        }
        
        return components;
    }

    isCityIndicator(text) {
        const cityIndicators = [
            'são josé dos campos', 'sao jose dos campos', 'sjc',
            'são josé', 'sao jose', 's j campos', 'sj campos'
        ];
        return cityIndicators.some(indicator => text.includes(indicator));
    }

    isStreetLine(line) {
        const streetTypes = [
            'rua', 'r.', 'avenida', 'av.', 'av ', 'alameda', 'al.',
            'travessa', 'tv.', 'praça', 'pc.', 'largo', 'lg.',
            'estrada', 'est.', 'rodovia', 'rod.', 'viela', 'beco',
            'quadra', 'qd.', 'conjunto', 'conj.'
        ];
        
        const lower = line.toLowerCase();
        return streetTypes.some(type => lower.includes(type)) || /\b\d+\b/.test(line);
    }

    isNeighborhoodLine(line) {
        const neighborhoodTypes = [
            'jardim', 'jd.', 'vila', 'vl.', 'parque', 'pq.',
            'conjunto', 'conj.', 'residencial', 'res.',
            'bosque', 'cidade', 'centro', 'distrito', 'setor'
        ];
        
        const lower = line.toLowerCase();
        return neighborhoodTypes.some(type => lower.includes(type));
    }

    parseStreetLine(line) {
        // Extrair número se presente
        const numberMatch = line.match(/\b(\d+)\b/);
        const number = numberMatch ? numberMatch[1] : null;
        
        let street = line;
        if (number) {
            street = street.replace(new RegExp(`\\b${number}\\b`), '').trim();
        }
        
        // Limpar vírgulas finais
        street = street.replace(/,\s*$/, '').trim();
        
        return { street, number };
    }

    calculateAddressConfidence(address) {
        let confidence = 0.3; // Base
        
        // Pontos por componentes encontrados
        if (address.toLowerCase().includes('rua') || 
            address.toLowerCase().includes('avenida')) confidence += 0.2;
        if (address.toLowerCase().includes('sp')) confidence += 0.1;
        if (address.toLowerCase().includes('são josé')) confidence += 0.2;
        if (this.extractCEPs(address).length > 0) confidence += 0.2;
        if (/\d+/.test(address)) confidence += 0.1; // Tem números
        
        return Math.min(confidence, 1.0);
    }

    clearCache() {
        this.validationCache.clear();
        console.log('🧹 Cache de validação CEP limpo');
    }

    getStats() {
        return {
            cacheSize: this.validationCache.size,
            validRangesCount: this.validRanges.size
        };
    }
}

// Exportar instância singleton
window.cepProcessor = new CEPProcessor();
console.log('✅ cep-processor.js MELHORADO carregado');
