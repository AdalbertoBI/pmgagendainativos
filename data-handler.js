// data-handler.js - Tratamento especializado de dados da planilha
class DataHandler {
    constructor() {
        this.version = '1.0.0';
        this.processedData = new Map();
        this.validationRules = {
            requiredFields: ['Nome Fantasia', 'Contato', 'Celular'],
            optionalFields: ['CNPJ / CPF', 'Endereço', 'Status', 'Segmento'],
            statusValues: ['Ativo', 'Inativo', 'Novo'],
            phoneFormats: [/^\+55\d{10,11}$/, /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/]
        };
        
        // Sistema de normalização de dados
        this.normalizers = {
            endereco: new AddressNormalizer(),
            telefone: new PhoneNormalizer(),
            cnpj: new CNPJNormalizer(),
            status: new StatusNormalizer()
        };
        
        // Mapeamento de colunas flexível
        this.columnMapping = {
            'ID Cliente': ['id', 'ID', 'codigo', 'client_id'],
            'Nome Fantasia': ['nome', 'fantasia', 'razao_social', 'empresa'],
            'Contato': ['contato', 'responsavel', 'pessoa'],
            'Celular': ['telefone', 'phone', 'whatsapp', 'cel'],
            'Cliente': ['cliente', 'nome_cliente'],
            'CNPJ / CPF': ['cnpj', 'cpf', 'documento'],
            'Endereço': ['endereco', 'address', 'localizacao'],
            'Status': ['situacao', 'ativo'],
            'Segmento': ['categoria', 'tipo', 'ramo']
        };
        
        console.log('📊 DataHandler inicializado v' + this.version);
    }
    
    // Processar dados da planilha com tratamento robusto
    async processSpreadsheetData(rawData) {
        console.log(`📊 Processando ${rawData.length} registros da planilha...`);
        
        const processedRecords = [];
        const errors = [];
        let processedCount = 0;
        
        for (let i = 0; i < rawData.length; i++) {
            try {
                const rawRecord = rawData[i];
                const processedRecord = await this.processRecord(rawRecord, i);
                
                if (processedRecord) {
                    processedRecords.push(processedRecord);
                    processedCount++;
                }
            } catch (error) {
                console.error(`Erro ao processar registro ${i + 1}:`, error);
                errors.push({
                    line: i + 1,
                    data: rawData[i],
                    error: error.message
                });
            }
            
            // Atualizar progresso a cada 50 registros
            if ((i + 1) % 50 === 0) {
                console.log(`📊 Progresso: ${i + 1}/${rawData.length} registros processados`);
            }
        }
        
        console.log(`✅ Processamento concluído: ${processedCount} sucessos, ${errors.length} erros`);
        
        return {
            success: processedRecords,
            errors: errors,
            stats: this.generateProcessingStats(processedRecords, errors)
        };
    }
    
    // Processar registro individual
    async processRecord(rawRecord, index) {
        if (!rawRecord || typeof rawRecord !== 'object') {
            throw new Error('Registro inválido ou vazio');
        }
        
        // Mapear colunas automaticamente
        const mappedRecord = this.mapColumns(rawRecord);
        
        // Gerar ID se não existir
        if (!mappedRecord.id || mappedRecord.id === '') {
            mappedRecord.id = this.generateClientId(mappedRecord, index);
        }
        
        // Processar cada campo
        const processedRecord = {
            id: mappedRecord.id,
            originalIndex: index,
            processedAt: new Date().toISOString()
        };
        
        // Nome Fantasia (obrigatório)
        processedRecord['Nome Fantasia'] = this.processNomeFantasia(mappedRecord);
        
        // Contato
        processedRecord['Contato'] = this.processContato(mappedRecord);
        
        // Celular/Telefone
        processedRecord['Celular'] = await this.processCelular(mappedRecord);
        
        // Cliente (pode ser igual ao Nome Fantasia)
        processedRecord['Cliente'] = mappedRecord.cliente || processedRecord['Nome Fantasia'];
        
        // CNPJ/CPF
        processedRecord['CNPJ / CPF'] = await this.processCNPJ(mappedRecord);
        
        // Endereço
        processedRecord['Endereço'] = await this.processEndereco(mappedRecord);
        
        // Status
        processedRecord['Status'] = this.processStatus(mappedRecord);
        
        // Segmento
        processedRecord['Segmento'] = this.processSegmento(mappedRecord);
        
        // Campos adicionais
        processedRecord.dataImportacao = new Date().toISOString();
        processedRecord.loteImportacao = Date.now();
        processedRecord.source = this.determineSource(processedRecord);
        
        // Validar registro final
        this.validateProcessedRecord(processedRecord);
        
        return processedRecord;
    }
    
    // Mapear colunas flexivelmente
    mapColumns(rawRecord) {
        const mappedRecord = {};
        
        // Primeiro, copiar campos exatos
        Object.keys(rawRecord).forEach(key => {
            mappedRecord[key] = rawRecord[key];
        });
        
        // Depois, tentar mapear campos com nomes diferentes
        Object.entries(this.columnMapping).forEach(([standardName, alternatives]) => {
            if (!mappedRecord[standardName]) {
                for (const alt of alternatives) {
                    const found = Object.keys(rawRecord).find(key => 
                        key.toLowerCase().includes(alt.toLowerCase())
                    );
                    if (found && rawRecord[found]) {
                        mappedRecord[standardName] = rawRecord[found];
                        break;
                    }
                }
            }
        });
        
        return mappedRecord;
    }
    
    // Gerar ID único para cliente
    generateClientId(record, index) {
        const timestamp = Date.now();
        const nome = (record['Nome Fantasia'] || record.nome || 'cliente').toLowerCase();
        const hash = this.simpleHash(nome);
        return `client-${timestamp}-${index}-${hash}`;
    }
    
    // Processar Nome Fantasia
    processNomeFantasia(record) {
        const nome = record['Nome Fantasia'] || record.nome || record.fantasia || record.empresa;
        
        if (!nome || nome.trim() === '') {
            throw new Error('Nome Fantasia é obrigatório');
        }
        
        return this.cleanText(nome);
    }
    
    // Processar Contato
    processContato(record) {
        const contato = record['Contato'] || record.contato || record.responsavel;
        return contato ? this.cleanText(contato) : 'N/A';
    }
    
    // Processar Celular com normalização
    async processCelular(record) {
        const celular = record['Celular'] || record.telefone || record.phone || record.cel;
        
        if (!celular) return '';
        
        // Usar normalizer
        return this.normalizers.telefone.normalize(celular);
    }
    
    // Processar CNPJ/CPF
    async processCNPJ(record) {
        const cnpj = record['CNPJ / CPF'] || record.cnpj || record.cpf || record.documento;
        
        if (!cnpj || cnpj.toString().trim() === '') return '';
        
        // Usar normalizer
        return this.normalizers.cnpj.normalize(cnpj);
    }
    
    // Processar Endereço com normalização avançada
    async processEndereco(record) {
        const endereco = record['Endereço'] || record.endereco || record.address;
        
        if (!endereco || endereco.toString().trim() === '') return '';
        
        // Usar normalizer
        return this.normalizers.endereco.normalize(endereco);
    }
    
    // Processar Status
    processStatus(record) {
        const status = record['Status'] || record.situacao || record.ativo || 'Inativo';
        
        // Usar normalizer
        return this.normalizers.status.normalize(status);
    }
    
    // Processar Segmento
    processSegmento(record) {
        const segmento = record['Segmento'] || record.categoria || record.tipo || record.ramo || '';
        
        if (!segmento) return 'Não informado';
        
        const segmentoStr = segmento.toString().trim();
        
        // Normalizar segmentos comuns
        const segmentMap = {
            'pizza': 'Pizzaria',
            'pizzaria': 'Pizzaria',
            'restaurante': 'Restaurante',
            'lanchonete': 'Restaurante',
            'bar': 'Restaurante',
            'padaria': 'Padaria',
            'panificadora': 'Padaria',
            'supermercado': 'Supermercado',
            'mercado': 'Supermercado',
            'mercearia': 'Supermercado',
            'confeitaria': 'Confeitaria',
            'doces': 'Confeitaria',
            'hamburgueria': 'Hamburgueria',
            'burger': 'Hamburgueria',
            'pastelaria': 'Pastelaria',
            'adega': 'Adega',
            'distribuidora': 'Distribuidora'
        };
        
        const normalized = segmentMap[segmentoStr.toLowerCase()] || 
                          this.capitalizeWords(segmentoStr);
        
        return normalized;
    }
    
    // Determinar source baseado no status
    determineSource(record) {
        switch (record['Status']) {
            case 'Ativo': return 'ativos';
            case 'Novo': return 'novos';
            default: return 'inativos';
        }
    }
    
    // Validar registro processado
    validateProcessedRecord(record) {
        const errors = [];
        
        // Campos obrigatórios
        if (!record['Nome Fantasia'] || record['Nome Fantasia'].trim() === '') {
            errors.push('Nome Fantasia é obrigatório');
        }
        
        if (!record.id) {
            errors.push('ID é obrigatório');
        }
        
        if (errors.length > 0) {
            throw new Error(`Registro inválido: ${errors.join(', ')}`);
        }
    }
    
    // Utilitários
    cleanText(text) {
        if (!text) return '';
        return text.toString()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\sÀ-ÿ&.,()-]/g, '');
    }
    
    capitalizeWords(text) {
        return text.replace(/\b\w/g, char => char.toUpperCase());
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 6);
    }
    
    // Gerar estatísticas do processamento
    generateProcessingStats(processed, errors) {
        const stats = {
            totalProcessed: processed.length,
            totalErrors: errors.length,
            successRate: processed.length / (processed.length + errors.length) * 100,
            byStatus: {},
            bySegment: {},
            withCNPJ: 0,
            withPhone: 0,
            withAddress: 0
        };
        
        processed.forEach(record => {
            // Por status
            const status = record['Status'];
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            
            // Por segmento
            const segment = record['Segmento'];
            stats.bySegment[segment] = (stats.bySegment[segment] || 0) + 1;
            
            // Completude dos dados
            if (record['CNPJ / CPF']) stats.withCNPJ++;
            if (record['Celular']) stats.withPhone++;
            if (record['Endereço']) stats.withAddress++;
        });
        
        return stats;
    }
    
    // Exportar dados processados
    exportProcessedData() {
        return {
            data: Array.from(this.processedData.values()),
            stats: this.generateProcessingStats(
                Array.from(this.processedData.values()), 
                []
            ),
            timestamp: new Date().toISOString()
        };
    }
}

// Classes Normalizadoras (que estavam faltando)
class AddressNormalizer {
    constructor() {
        this.patterns = {
            cep: /(\d{5})-?(\d{3})/,
            numero: /(?:n[°º]?\s*|num\s*|número\s*)(\d+)/i,
            estado: /\b([A-Z]{2})\b/,
            cidade: /([A-ZÀ-ÿ][a-zà-ÿ\s]+)(?=\s*[-,]\s*[A-Z]{2})/
        };
    }
    
    normalize(endereco) {
        if (!endereco) return '';
        
        let enderecoStr = endereco.toString().trim();
        
        // Corrigir endereços quebrados em múltiplas linhas
        enderecoStr = this.fixBrokenAddress(enderecoStr);
        
        // Normalizar para São José dos Campos se não especificado
        if (!enderecoStr.toLowerCase().includes('são josé dos campos') && 
            !enderecoStr.toLowerCase().includes('sjc')) {
            enderecoStr += ', São José dos Campos, SP';
        }
        
        return enderecoStr;
    }
    
    fixBrokenAddress(endereco) {
        if (!endereco) return '';
        
        // Remover quebras de linha e múltiplos espaços
        let fixed = endereco
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Padrões comuns de endereços quebrados
        const patterns = [
            // SP\n12345678\nCidade → SP, 12345-678, Cidade
            /(\w{2})\s+(\d{8})\s+([A-Za-zÀ-ÿ\s]+)/g,
            // CEP sem hífen
            /(\d{5})(\d{3})/g
        ];
        
        patterns.forEach(pattern => {
            if (pattern.global) {
                fixed = fixed.replace(pattern, (match, ...groups) => {
                    if (groups.length === 3) {
                        const cep = `${groups[1].substring(0,5)}-${groups[1].substring(5)}`;
                        return `${groups[2]}, ${groups[0]}, ${cep}`;
                    } else if (groups.length === 2) {
                        return `${groups[0]}-${groups[1]}`;
                    }
                    return match;
                });
            } else {
                fixed = fixed.replace(pattern, '$1-$2');
            }
        });
        
        return fixed;
    }
}

class PhoneNormalizer {
    constructor() {
        this.patterns = {
            celular: /^(\d{2})([9]\d{8})$/,
            fixo: /^(\d{2})([2-5]\d{7})$/,
            internacional: /^55(\d{2})([9]?\d{8})$/
        };
    }
    
    normalize(telefone) {
        if (!telefone) return '';
        
        const cleaned = telefone.toString().replace(/\D/g, '');
        
        // Tentar cada padrão
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const match = cleaned.match(pattern);
            if (match) {
                if (type === 'celular') {
                    return `(${match[1]}) ${match[2].substring(0,1)} ${match[2].substring(1,5)}-${match[2].substring(5)}`;
                } else if (type === 'fixo') {
                    return `(${match[1]}) ${match[2].substring(0,4)}-${match[2].substring(4)}`;
                }
            }
        }
        
        // Se não reconhecer o padrão, retornar limpo
        return telefone.toString().trim();
    }
}

class CNPJNormalizer {
    constructor() {
        // Configurações para normalização de CNPJ/CPF
    }
    
    normalize(documento) {
        if (!documento) return '';
        
        const cleaned = documento.toString().replace(/\D/g, '');
        
        if (cleaned.length === 14) {
            // CNPJ
            return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        } else if (cleaned.length === 11) {
            // CPF
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        
        return documento.toString().trim();
    }
}

class StatusNormalizer {
    constructor() {
        this.statusMap = {
            'ativo': 'Ativo',
            'active': 'Ativo',
            '1': 'Ativo',
            'true': 'Ativo',
            'sim': 'Ativo',
            'inativo': 'Inativo',
            'inactive': 'Inativo',
            '0': 'Inativo',
            'false': 'Inativo',
            'não': 'Inativo',
            'nao': 'Inativo',
            'novo': 'Novo',
            'new': 'Novo',
            'pendente': 'Novo'
        };
    }
    
    normalize(status) {
        if (!status) return 'Inativo';
        
        const statusStr = status.toString().toLowerCase().trim();
        return this.statusMap[statusStr] || 'Inativo';
    }
}

// Instância global
window.dataHandler = new DataHandler();
console.log('📊 data-handler.js corrigido - Classes normalizadoras adicionadas');
