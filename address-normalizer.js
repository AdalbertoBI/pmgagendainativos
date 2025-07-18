// address-normalizer.js - Sistema de Normalização para APIs Reais - VERSÃO COMPLETA

class AddressNormalizer {
    constructor() {
        // Mapeamento completo de abreviações de logradouros
        this.streetAbbreviations = {
            'R.': 'Rua',
            'R': 'Rua',
            'RUA': 'Rua',
            'AV.': 'Avenida',
            'AV': 'Avenida',
            'AVENIDA': 'Avenida',
            'AVENIA': 'Avenida',
            'AL.': 'Alameda',
            'AL': 'Alameda',
            'ALAMEDA': 'Alameda',
            'PÇ.': 'Praça',
            'PÇ': 'Praça',
            'PC.': 'Praça',
            'PC': 'Praça',
            'PRAÇA': 'Praça',
            'PRACA': 'Praça',
            'TV.': 'Travessa',
            'TV': 'Travessa',
            'TRAVESSA': 'Travessa',
            'EST.': 'Estrada',
            'EST': 'Estrada',
            'ESTRADA': 'Estrada',
            'ROD.': 'Rodovia',
            'ROD': 'Rodovia',
            'RODOVIA': 'Rodovia',
            'VIA': 'Via',
            'LG.': 'Largo',
            'LG': 'Largo',
            'LARGO': 'Largo',
            'BCO.': 'Beco',
            'BCO': 'Beco',
            'BECO': 'Beco'
        };

        // Mapeamento completo de abreviações de bairros
        this.neighborhoodAbbreviations = {
            'JD.': 'Jardim',
            'JD': 'Jardim',
            'JARDIM': 'Jardim',
            'VL.': 'Vila',
            'VL': 'Vila',
            'VILA': 'Vila',
            'CJ.': 'Conjunto',
            'CJ': 'Conjunto',
            'CONJUNTO': 'Conjunto',
            'CONJ.': 'Conjunto',
            'CONJ': 'Conjunto',
            'RES.': 'Residencial',
            'RES': 'Residencial',
            'RESIDENCIAL': 'Residencial',
            'RESID.': 'Residencial',
            'RESID': 'Residencial',
            'PQ.': 'Parque',
            'PQ': 'Parque',
            'PARQUE': 'Parque',
            'CH.': 'Chácara',
            'CH': 'Chácara',
            'CHÁCARA': 'Chácara',
            'CHACARA': 'Chácara',
            'CENTRO': 'Centro',
            'CTR.': 'Centro',
            'CTR': 'Centro',
            'DIST.': 'Distrito',
            'DIST': 'Distrito',
            'DISTRITO': 'Distrito'
        };

        // Preposições que devem ficar em minúsculas
        this.prepositions = [
            'da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
            'pela', 'pelo', 'pelas', 'pelos', 'por', 'para', 'com', 'sobre',
            'sob', 'entre', 'ante', 'após', 'até', 'desde', 'durante'
        ];

        // Termos que devem manter capitalização especial
        this.specialTerms = {
            'SAO': 'São',
            'SÃO': 'São',
            'SANTO': 'Santo',
            'SANTA': 'Santa',
            'DR.': 'Dr.',
            'DRA.': 'Dra.',
            'PROF.': 'Prof.',
            'PROFA.': 'Profa.',
            'ENG.': 'Eng.',
            'ENGA.': 'Enga.'
        };

        console.log('✅ AddressNormalizer API Real inicializado');
    }

    // Método principal para normalizar dados do cliente
    normalizeClientData(client) {
        const normalized = { ...client };
        
        // Normalizar endereço
        if (normalized.Endereco) {
            normalized.Endereco = this.normalizeStreet(normalized.Endereco);
        }
        
        // Normalizar bairro
        if (normalized.Bairro) {
            normalized.Bairro = this.normalizeNeighborhood(normalized.Bairro);
        }
        
        // Normalizar cidade
        if (normalized.Cidade) {
            normalized.Cidade = this.normalizeCity(normalized.Cidade);
        }
        
        // Normalizar CEP
        if (normalized.CEP) {
            normalized.CEP = this.normalizeCEP(normalized.CEP);
        }
        
        // Normalizar UF
        if (normalized.UF) {
            normalized.UF = this.normalizeUF(normalized.UF);
        }
        
        // Normalizar número
        if (normalized.Numero) {
            normalized.Numero = this.normalizeNumber(normalized.Numero);
        }
        
        return normalized;
    }

    // Normalizar endereço/logradouro
    normalizeStreet(street) {
        if (!street || typeof street !== 'string') return '';
        
        let normalized = street.trim().replace(/\s+/g, ' ').toUpperCase();
        
        // Substituir abreviações no início
        Object.keys(this.streetAbbreviations).forEach(abbrev => {
            const regex = new RegExp(`^${abbrev}\\s+`, 'i');
            if (regex.test(normalized)) {
                normalized = normalized.replace(regex, this.streetAbbreviations[abbrev] + ' ');
            }
        });
        
        // Aplicar capitalização correta
        normalized = this.applyProperCapitalization(normalized);
        
        // Limpeza final
        normalized = normalized.trim().replace(/\s+/g, ' ');
        
        return normalized;
    }

    // Normalizar bairro
    normalizeNeighborhood(neighborhood) {
        if (!neighborhood || typeof neighborhood !== 'string') return '';
        
        let normalized = neighborhood.trim().replace(/\s+/g, ' ').toUpperCase();
        
        // Substituir abreviações no início
        Object.keys(this.neighborhoodAbbreviations).forEach(abbrev => {
            const regex = new RegExp(`^${abbrev}\\s+`, 'i');
            if (regex.test(normalized)) {
                normalized = normalized.replace(regex, this.neighborhoodAbbreviations[abbrev] + ' ');
            }
        });
        
        // Substituir abreviações no meio
        Object.keys(this.neighborhoodAbbreviations).forEach(abbrev => {
            const regex = new RegExp(`\\s${abbrev}\\s`, 'gi');
            normalized = normalized.replace(regex, ` ${this.neighborhoodAbbreviations[abbrev]} `);
        });
        
        // Aplicar capitalização correta
        normalized = this.applyProperCapitalization(normalized);
        
        // Limpeza final
        normalized = normalized.trim().replace(/\s+/g, ' ');
        
        return normalized;
    }

    // Normalizar cidade
    normalizeCity(city) {
        if (!city || typeof city !== 'string') return '';
        
        const normalized = city.trim();
        
        // Variações comuns de São José dos Campos
        const sjcVariations = [
            'SAO JOSE DOS CAMPOS',
            'SÃO JOSE DOS CAMPOS', 
            'SAO JOSE',
            'SÃO JOSE',
            'SJC',
            'S J C',
            'S.J.C.',
            'SAO JOSE DO CAMPOS',
            'SÃO JOSE DO CAMPOS'
        ];
        
        const upperCity = normalized.toUpperCase();
        for (const variation of sjcVariations) {
            if (upperCity.includes(variation)) {
                return 'São José dos Campos';
            }
        }
        
        // Aplicar capitalização correta para outras cidades
        return this.applyProperCapitalization(normalized);
    }

    // Normalizar CEP
    normalizeCEP(cep) {
        if (!cep || typeof cep !== 'string') return '';
        
        // Remover caracteres não numéricos
        const cleanCep = cep.replace(/\D/g, '');
        
        // Validar comprimento
        if (cleanCep.length === 0) return '';
        if (cleanCep.length < 8) {
            // Adicionar zeros à esquerda se necessário
            const paddedCep = cleanCep.padStart(8, '0');
            return this.formatCEP(paddedCep);
        }
        if (cleanCep.length === 8) {
            return this.formatCEP(cleanCep);
        }
        if (cleanCep.length > 8) {
            // Truncar se muito longo
            return this.formatCEP(cleanCep.substring(0, 8));
        }
        
        return cleanCep;
    }

    // Formatar CEP com hífen
    formatCEP(cep) {
        if (!cep || cep.length !== 8) return cep;
        return `${cep.substring(0, 5)}-${cep.substring(5, 8)}`;
    }

    // Normalizar UF
    normalizeUF(uf) {
        if (!uf || typeof uf !== 'string') return 'SP';
        return uf.trim().toUpperCase();
    }

    // Normalizar número
    normalizeNumber(number) {
        if (!number) return '';
        
        // Converter para string se for número
        const numStr = number.toString().trim();
        
        // Padrões especiais
        const patterns = {
            'SN': 'S/N',
            'S/N': 'S/N',
            'S.N': 'S/N',
            'SEM NUMERO': 'S/N',
            'SEM NÚMERO': 'S/N',
            'SEM NUM': 'S/N',
            'S N': 'S/N'
        };
        
        const upperNum = numStr.toUpperCase();
        if (patterns[upperNum]) {
            return patterns[upperNum];
        }
        
        // Remover caracteres especiais, manter apenas números, letras e hífen
        const cleaned = numStr.replace(/[^0-9a-zA-Z-]/g, '');
        
        return cleaned;
    }

    // Aplicar capitalização correta
    applyProperCapitalization(text) {
        if (!text) return '';
        
        // Dividir em palavras
        const words = text.toLowerCase().split(' ');
        
        // Capitalizar cada palavra
        const capitalizedWords = words.map((word, index) => {
            if (!word) return word;
            
            // Verificar se é uma preposição (exceto primeira palavra)
            if (index > 0 && this.prepositions.includes(word.toLowerCase())) {
                return word.toLowerCase();
            }
            
            // Verificar termos especiais
            const upperWord = word.toUpperCase();
            if (this.specialTerms[upperWord]) {
                return this.specialTerms[upperWord];
            }
            
            // Capitalização padrão
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
        
        return capitalizedWords.join(' ');
    }

    // Validar CEP
    validateCEP(cep) {
        if (!cep) return false;
        const cleanCep = cep.replace(/\D/g, '');
        return cleanCep.length === 8;
    }

    // Método para formatar endereço completo para APIs
    formatAddressForAPI(client) {
        const normalized = this.normalizeClientData(client);
        
        const rua = normalized.Endereco || '';
        const numero = normalized.Numero || '';
        const bairro = normalized.Bairro || '';
        const cidade = normalized.Cidade || 'São José dos Campos';
        const uf = normalized.UF || 'SP';
        const cep = normalized.CEP || '';
        
        // Diferentes formatos para diferentes APIs
        return {
            completo: `${rua}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            semNumero: `${rua}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            comCEP: `${cep}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            bairroECidade: `${bairro}, ${cidade}, ${uf}, Brasil`,
            apenasRua: `${rua}, ${cidade}, ${uf}, Brasil`,
            cidadeUF: `${cidade}, ${uf}, Brasil`,
            // Formatos específicos para Nominatim
            nominatimCompleto: `${rua} ${numero}, ${bairro}, ${cidade}, São Paulo, Brasil`,
            nominatimSemNumero: `${rua}, ${bairro}, ${cidade}, São Paulo, Brasil`,
            // Formatos específicos para outras APIs
            googleFormat: `${rua}, ${numero} - ${bairro}, ${cidade} - ${uf}, Brasil`,
            hereFormat: `${numero} ${rua}, ${bairro}, ${cidade}, ${uf}, Brasil`
        };
    }

    // Método para debug
    debugNormalization(client) {
        console.log('🔍 DEBUG - Normalizando:', client);
        
        const original = { ...client };
        const normalized = this.normalizeClientData(client);
        const formatted = this.formatAddressForAPI(normalized);
        
        console.log('📊 Resultado da normalização:');
        console.log('  Original:', original);
        console.log('  Normalizado:', normalized);
        console.log('  Formatado para APIs:', formatted);
        
        return { original, normalized, formatted };
    }
}

// Instanciar e disponibilizar globalmente
window.AddressNormalizer = new AddressNormalizer();

console.log('✅ address-normalizer.js API Real carregado');
