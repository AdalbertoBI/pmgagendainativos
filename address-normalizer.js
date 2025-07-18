// address-normalizer.js - Sistema de Normalização Avançada de Endereços

class AddressNormalizer {
    constructor() {
        // Mapeamento de abreviações de logradouros
        this.streetAbbreviations = {
            'R.': 'Rua',
            'R': 'Rua',
            'RUA': 'Rua',
            'AV.': 'Avenida',
            'AV': 'Avenida',
            'AVENIDA': 'Avenida',
            'AVENIA': 'Avenida',
            'AVENIDA': 'Avenida',
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
            'BECO': 'Beco',
            'QD.': 'Quadra',
            'QD': 'Quadra',
            'QUADRA': 'Quadra',
            'LT.': 'Lote',
            'LT': 'Lote',
            'LOTE': 'Lote'
        };

        // Mapeamento de abreviações de bairros
        this.neighborhoodAbbreviations = {
            'JD.': 'Jardim',
            'JD': 'Jardim',
            'JARDIM': 'Jardim',
            'JRD.': 'Jardim',
            'JRD': 'Jardim',
            'VL.': 'Vila',
            'VL': 'Vila',
            'VILA': 'Vila',
            'VLA.': 'Vila',
            'VLA': 'Vila',
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
            'PRQ.': 'Parque',
            'PRQ': 'Parque',
            'CH.': 'Chácara',
            'CH': 'Chácara',
            'CHÁCARA': 'Chácara',
            'CHACARA': 'Chácara',
            'SIT.': 'Sítio',
            'SIT': 'Sítio',
            'SÍTIO': 'Sítio',
            'SITIO': 'Sítio',
            'FAZ.': 'Fazenda',
            'FAZ': 'Fazenda',
            'FAZENDA': 'Fazenda',
            'LT.': 'Loteamento',
            'LT': 'Loteamento',
            'LOTEAMENTO': 'Loteamento',
            'LOTM.': 'Loteamento',
            'LOTM': 'Loteamento',
            'CENTRO': 'Centro',
            'CTR.': 'Centro',
            'CTR': 'Centro'
        };

        // Preposições que devem ficar em minúsculas
        this.prepositions = [
            'da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
            'pela', 'pelo', 'pelas', 'pelos', 'por', 'para', 'com', 'sobre',
            'sob', 'entre', 'ante', 'após', 'até', 'desde', 'durante', 'mediante',
            'perante', 'segundo', 'sem', 'salvo', 'exceto', 'senão', 'afora',
            'fora', 'menos', 'tirante', 'malgrado', 'apesar'
        ];

        // Termos que devem manter capitalização especial
        this.specialTerms = {
            'SAO': 'São',
            'SÃO': 'São',
            'SANTO': 'Santo',
            'SANTA': 'Santa',
            'DOM': 'Dom',
            'DONA': 'Dona',
            'DR.': 'Dr.',
            'DRA.': 'Dra.',
            'PROF.': 'Prof.',
            'PROFA.': 'Profa.',
            'ENGENHEIRO': 'Engenheiro',
            'ENGENHEIRA': 'Engenheira',
            'GENERAL': 'General',
            'CORONEL': 'Coronel',
            'MAJOR': 'Major',
            'CAPITÃO': 'Capitão',
            'CAPITAO': 'Capitão',
            'TENENTE': 'Tenente',
            'SARGENTO': 'Sargento',
            'CABO': 'Cabo',
            'SOLDADO': 'Soldado',
            'ALMIRANTE': 'Almirante',
            'MARECHAL': 'Marechal',
            'MINISTRO': 'Ministro',
            'MINISTRO': 'Ministro',
            'PRESIDENTE': 'Presidente',
            'GOVERNADOR': 'Governador',
            'PREFEITO': 'Prefeito',
            'VEREADOR': 'Vereador',
            'DEPUTADO': 'Deputado',
            'SENADOR': 'Senador',
            'PADRE': 'Padre',
            'FREI': 'Frei',
            'IRMÃO': 'Irmão',
            'IRMAO': 'Irmão'
        };

        // Regex para validação de CEP
        this.cepRegex = /^\d{5}-?\d{3}$/;
        
        console.log('✅ AddressNormalizer inicializado');
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
        
        // Remover espaços extras e converter para maiúsculas para processamento
        let normalized = street.trim().replace(/\s+/g, ' ').toUpperCase();
        
        // Substituir abreviações
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
        
        // Remover espaços extras e converter para maiúsculas para processamento
        let normalized = neighborhood.trim().replace(/\s+/g, ' ').toUpperCase();
        
        // Substituir abreviações no início
        Object.keys(this.neighborhoodAbbreviations).forEach(abbrev => {
            const regex = new RegExp(`^${abbrev}\\s+`, 'i');
            if (regex.test(normalized)) {
                normalized = normalized.replace(regex, this.neighborhoodAbbreviations[abbrev] + ' ');
            }
        });
        
        // Substituir abreviações no meio (ex: "RESIDENCIAL JD AMERICA" -> "Residencial Jardim America")
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
        
        // Remover espaços extras
        let normalized = city.trim().replace(/\s+/g, ' ').toUpperCase();
        
        // Aplicar capitalização correta
        normalized = this.applyProperCapitalization(normalized);
        
        // Limpeza final
        normalized = normalized.trim().replace(/\s+/g, ' ');
        
        return normalized;
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
        if (!uf || typeof uf !== 'string') return '';
        return uf.trim().toUpperCase();
    }

    // Normalizar número
    normalizeNumber(number) {
        if (!number) return '';
        
        // Converter para string se for número
        const numStr = number.toString().trim();
        
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

    // Método para limpar e padronizar endereço completo
    normalizeFullAddress(client) {
        const normalized = this.normalizeClientData(client);
        
        const parts = [];
        
        if (normalized.Endereco) parts.push(normalized.Endereco);
        if (normalized.Numero) parts.push(normalized.Numero);
        if (normalized.Bairro) parts.push(normalized.Bairro);
        if (normalized.Cidade) parts.push(normalized.Cidade);
        if (normalized.UF) parts.push(normalized.UF);
        if (normalized.CEP) parts.push(normalized.CEP);
        
        return parts.join(', ');
    }

    // Método para validar dados de endereço
    validateAddressData(client) {
        const errors = [];
        
        if (!client.Cidade || client.Cidade.trim() === '') {
            errors.push('Cidade é obrigatória');
        }
        
        if (!client.UF || client.UF.trim() === '') {
            errors.push('UF é obrigatória');
        }
        
        if (client.CEP && !this.validateCEP(client.CEP)) {
            errors.push('CEP inválido');
        }
        
        return errors;
    }

    // Método para detectar e corrigir inconsistências comuns
    detectAndFixInconsistencies(client) {
        const fixed = this.normalizeClientData(client);
        const issues = [];
        
        // Verificar inconsistências entre CEP e cidade/UF
        if (fixed.CEP && fixed.UF) {
            const cepDigits = fixed.CEP.replace(/\D/g, '');
            const expectedRange = this.getCEPRangeForState(fixed.UF);
            
            if (expectedRange && !this.isCEPInRange(cepDigits, expectedRange)) {
                issues.push({
                    type: 'CEP_UF_MISMATCH',
                    message: `CEP ${fixed.CEP} não compatível com UF ${fixed.UF}`,
                    field: 'CEP',
                    value: fixed.CEP
                });
            }
        }
        
        // Verificar se bairro contém cidade
        if (fixed.Bairro && fixed.Cidade) {
            const bairroUpper = fixed.Bairro.toUpperCase();
            const cidadeUpper = fixed.Cidade.toUpperCase();
            
            if (bairroUpper.includes(cidadeUpper)) {
                issues.push({
                    type: 'BAIRRO_CONTAINS_CITY',
                    message: `Bairro "${fixed.Bairro}" contém nome da cidade`,
                    field: 'Bairro',
                    value: fixed.Bairro
                });
            }
        }
        
        return { normalized: fixed, issues };
    }

    // Obter faixa de CEP para estado
    getCEPRangeForState(uf) {
        const ranges = {
            'SP': { min: 1000, max: 19999 },
            'ES': { min: 29000, max: 29999 }
        };
        
        return ranges[uf] || null;
    }

    // Verificar se CEP está na faixa do estado
    isCEPInRange(cep, range) {
        const cepNum = parseInt(cep.substring(0, 5));
        return cepNum >= range.min && cepNum <= range.max;
    }

    // Método para processar em lote
    normalizeClientDataBatch(clients) {
        const results = [];
        
        clients.forEach((client, index) => {
            try {
                const result = this.detectAndFixInconsistencies(client);
                results.push({
                    index,
                    original: client,
                    normalized: result.normalized,
                    issues: result.issues,
                    success: true
                });
            } catch (error) {
                results.push({
                    index,
                    original: client,
                    normalized: null,
                    issues: [],
                    success: false,
                    error: error.message
                });
            }
        });
        
        return results;
    }

    // Método para gerar relatório de normalização
    generateNormalizationReport(clients) {
        const results = this.normalizeClientDataBatch(clients);
        const report = {
            total: results.length,
            normalized: 0,
            errors: 0,
            issues: {
                total: 0,
                byType: {}
            },
            details: []
        };
        
        results.forEach(result => {
            if (result.success) {
                report.normalized++;
                
                if (result.issues.length > 0) {
                    report.issues.total += result.issues.length;
                    
                    result.issues.forEach(issue => {
                        if (!report.issues.byType[issue.type]) {
                            report.issues.byType[issue.type] = 0;
                        }
                        report.issues.byType[issue.type]++;
                    });
                }
            } else {
                report.errors++;
            }
            
            report.details.push(result);
        });
        
        return report;
    }
}

// Instanciar e disponibilizar globalmente
window.AddressNormalizer = new AddressNormalizer();

console.log('✅ address-normalizer.js carregado - Sistema de normalização avançada pronto');
