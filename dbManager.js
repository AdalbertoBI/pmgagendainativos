// dbManager.js - Gerenciador robusto de IndexedDB com fallbacks e recuperação de erro

class DBManager {
    constructor() {
        this.dbName = 'PMG_AgendaClientes_DB';
        this.dbVersion = 8; // Incrementado para resolver conflitos
        this.db = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // Definir stores necessárias
        this.stores = [
            'clients',      // Clientes inativos
            'ativos',       // Clientes ativos
            'novos',        // Clientes novos
            'schedules',    // Agendamentos
            'observations', // Observações dos clientes
            'filters',      // Filtros aplicados
            'cache',        // Cache geral
            'markers',      // Cache de marcadores do mapa
            'geocoding'     // Cache de geocodificação
        ];

        // Sistema de retry para operações críticas
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };

        // Controle de versões e migração
        this.migrationHandlers = {
            1: this.migration_v1,
            2: this.migration_v2,
            3: this.migration_v3,
            4: this.migration_v4,
            5: this.migration_v5,
            6: this.migration_v6,
            7: this.migration_v7,
            8: this.migration_v8
        };

        // Bind methods
        this.handleVersionConflict = this.handleVersionConflict.bind(this);
        this.performUpgrade = this.performUpgrade.bind(this);
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ DBManager já inicializado');
            return true;
        }

        if (this.initializationPromise) {
            console.log('⏳ Aguardando inicialização em progresso...');
            return await this.initializationPromise;
        }

        this.initializationPromise = this._performInit();
        return await this.initializationPromise;
    }

    async _performInit() {
        try {
            console.log('🔧 Inicializando DBManager versão', this.dbVersion);
            
            // Verificar suporte ao IndexedDB
            if (!this.checkIndexedDBSupport()) {
                throw new Error('IndexedDB não suportado neste navegador');
            }

            // Tentar abrir banco de dados
            this.db = await this.retryOperation(() => this.openDB());

            // Configurar handlers de erro e versionamento
            this.setupErrorHandlers();

            this.isInitialized = true;
            console.log('✅ DBManager inicializado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro crítico ao inicializar DBManager:', error);
            
            if (error.message.includes('version') || error.name === 'VersionError') {
                console.log('🔄 Tentando resolver conflito de versão...');
                const resolved = await this.handleVersionConflict();
                if (resolved) {
                    return await this._performInit();
                }
            }
            
            throw error;
        } finally {
            this.initializationPromise = null;
        }
    }

    checkIndexedDBSupport() {
        try {
            return !!(window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB);
        } catch (error) {
            console.error('❌ Erro ao verificar suporte IndexedDB:', error);
            return false;
        }
    }

    async retryOperation(operation, context = 'Operação') {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                console.log(`🔄 ${context} - Tentativa ${attempt}/${this.retryConfig.maxRetries}`);
                const result = await operation();
                
                if (attempt > 1) {
                    console.log(`✅ ${context} bem-sucedida na tentativa ${attempt}`);
                }
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ ${context} falhou na tentativa ${attempt}:`, error.message);
                
                if (attempt < this.retryConfig.maxRetries) {
                    const delay = Math.min(
                        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
                        this.retryConfig.maxDelay
                    );
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`${context} falhou após ${this.retryConfig.maxRetries} tentativas: ${lastError.message}`);
    }

    openDB() {
        return new Promise((resolve, reject) => {
            console.log(`📡 Abrindo banco ${this.dbName} versão ${this.dbVersion}`);
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            let upgradeNeeded = false;

            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                const db = request.result;
                console.log(`✅ IndexedDB aberto com sucesso (versão ${db.version})`);
                
                // Verificar se todas as stores existem
                const missingStores = this.stores.filter(store => !db.objectStoreNames.contains(store));
                if (missingStores.length > 0 && !upgradeNeeded) {
                    console.warn(`⚠️ Stores faltando: ${missingStores.join(', ')}`);
                    // Fechar e tentar reabrir com versão incrementada
                    db.close();
                    this.dbVersion++;
                    resolve(this.openDB());
                    return;
                }

                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                upgradeNeeded = true;
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                
                console.log(`🔄 Upgrade necessário da versão ${oldVersion} para ${newVersion}`);
                
                try {
                    this.performUpgrade(db, oldVersion, newVersion);
                } catch (upgradeError) {
                    console.error('❌ Erro durante upgrade:', upgradeError);
                    reject(upgradeError);
                }
            };

            request.onblocked = () => {
                console.warn('🚧 Operação bloqueada - outras abas podem estar abertas');
                // Tentar novamente após um delay
                setTimeout(() => {
                    reject(new Error('Database upgrade bloqueado. Feche outras abas e tente novamente.'));
                }, 3000);
            };
        });
    }

    performUpgrade(db, oldVersion, newVersion) {
        console.log(`🔧 Realizando upgrade ${oldVersion} → ${newVersion}`);

        // Criar stores que não existem
        this.stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName);
                console.log(`📁 Store '${storeName}' criada`);
                
                // Adicionar índices específicos se necessário
                if (storeName === 'clients' || storeName === 'ativos' || storeName === 'novos') {
                    try {
                        store.createIndex('nome', 'Nome Fantasia', { unique: false });
                        store.createIndex('cidade', 'cidade', { unique: false });
                        store.createIndex('status', 'Status', { unique: false });
                    } catch (indexError) {
                        console.warn(`⚠️ Erro ao criar índice em ${storeName}:`, indexError);
                    }
                }
            }
        });

        // Executar migrações específicas por versão
        for (let version = oldVersion + 1; version <= newVersion; version++) {
            if (this.migrationHandlers[version]) {
                try {
                    console.log(`🔄 Executando migração para versão ${version}`);
                    this.migrationHandlers[version](db, version - 1, version);
                } catch (migrationError) {
                    console.error(`❌ Erro na migração v${version}:`, migrationError);
                }
            }
        }

        console.log('✅ Upgrade concluído com sucesso');
    }

    setupErrorHandlers() {
        if (!this.db) return;

        this.db.onversionchange = (event) => {
            console.log('🔄 Versão do banco alterada por outra aba');
            this.db.close();
            this.isInitialized = false;
            
            // Notificar aplicação para recarregar
            if (typeof window.showSuccessMessage === 'function') {
                window.showSuccessMessage('Base de dados atualizada. Recarregando...');
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        };

        this.db.onerror = (event) => {
            console.error('❌ Erro geral do IndexedDB:', event);
        };
    }

    async handleVersionConflict() {
        try {
            console.log('🔧 Resolvendo conflito de versão...');
            
            // Fechar conexão atual
            if (this.db) {
                this.db.close();
                this.db = null;
            }

            // Tentar deletar banco existente
            const deleted = await this.deleteDatabase();
            if (deleted) {
                console.log('✅ Banco antigo removido, recriando...');
                this.isInitialized = false;
                return true;
            } else {
                console.warn('⚠️ Não foi possível deletar banco antigo');
                return false;
            }

        } catch (error) {
            console.error('❌ Erro ao resolver conflito:', error);
            return false;
        }
    }

    deleteDatabase() {
        return new Promise((resolve) => {
            console.log(`🗑️ Deletando banco ${this.dbName}...`);
            
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            
            deleteRequest.onsuccess = () => {
                console.log('✅ Banco deletado com sucesso');
                resolve(true);
            };
            
            deleteRequest.onerror = (event) => {
                console.error('❌ Erro ao deletar banco:', event);
                resolve(false);
            };
            
            deleteRequest.onblocked = () => {
                console.warn('🚧 Delete bloqueado, forçando...');
                // Tentar fechar todas as conexões
                setTimeout(() => resolve(false), 5000);
            };
        });
    }

    async saveData(storeName, data) {
        if (!this.isInitialized || !this.db) {
            await this.init();
        }

        return await this.retryOperation(async () => {
            console.log(`💾 Salvando dados em '${storeName}'...`);
            
            if (!this.stores.includes(storeName)) {
                throw new Error(`Store '${storeName}' não existe`);
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Limpar store primeiro
            await this.clearStore(store);

            if (Array.isArray(data)) {
                // Salvar array de dados
                const promises = data.map((item, index) => {
                    return this.putItem(store, item, this.generateKey(item, index));
                });
                
                await Promise.all(promises);
                console.log(`✅ ${data.length} itens salvos em '${storeName}'`);
                
            } else if (typeof data === 'object' && data !== null) {
                // Salvar objeto único ou mapa de dados
                if (storeName === 'schedules' || storeName === 'observations' || storeName === 'cache') {
                    // Para stores de objetos/mapas, salvar como objeto único
                    await this.putItem(store, data, 'data');
                } else {
                    await this.putItem(store, data, 'item');
                }
                console.log(`✅ Dados salvos em '${storeName}'`);
                
            } else {
                throw new Error(`Tipo de dados inválido para '${storeName}': ${typeof data}`);
            }

            return true;
        }, `Salvamento em ${storeName}`);
    }

    async loadData(storeName) {
        if (!this.isInitialized || !this.db) {
            await this.init();
        }

        return await this.retryOperation(async () => {
            console.log(`📖 Carregando dados de '${storeName}'...`);
            
            if (!this.stores.includes(storeName)) {
                console.warn(`⚠️ Store '${storeName}' não existe`);
                return this.getDefaultValue(storeName);
            }

            if (!this.db.objectStoreNames.contains(storeName)) {
                console.warn(`⚠️ Store '${storeName}' não encontrada no banco`);
                return this.getDefaultValue(storeName);
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            // Primeiro tentar buscar todos os dados
            const allData = await this.getAllItems(store);
            
            if (allData && allData.length > 0) {
                console.log(`📖 ${allData.length} itens carregados de '${storeName}'`);
                return allData;
            }

            // Se não há dados, tentar buscar item único
            const singleData = await this.getItem(store, 'data');
            if (singleData !== undefined) {
                console.log(`📖 Dados únicos carregados de '${storeName}'`);
                return singleData;
            }

            // Retornar valor padrão
            const defaultValue = this.getDefaultValue(storeName);
            console.log(`📖 Valor padrão retornado para '${storeName}'`);
            return defaultValue;

        }, `Carregamento de ${storeName}`);
    }

    async clearData(storeName) {
        if (!this.isInitialized || !this.db) {
            await this.init();
        }

        return await this.retryOperation(async () => {
            console.log(`🧹 Limpando store '${storeName}'...`);
            
            if (!this.stores.includes(storeName)) {
                console.warn(`⚠️ Store '${storeName}' não existe`);
                return true;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await this.clearStore(store);
            console.log(`✅ Store '${storeName}' limpa`);
            return true;

        }, `Limpeza de ${storeName}`);
    }

    // Métodos auxiliares para operações de store
    putItem(store, data, key) {
        return new Promise((resolve, reject) => {
            const request = store.put(data, key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getItem(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAllItems(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    clearStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    generateKey(item, index) {
        if (item && (item.id || item['ID Cliente'])) {
            return item.id || item['ID Cliente'];
        }
        return `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
    }

    getDefaultValue(storeName) {
        const objectStores = ['schedules', 'observations', 'filters', 'cache', 'geocoding'];
        return objectStores.includes(storeName) ? {} : [];
    }

    // Métodos de conveniência para observações
    async saveObservation(clientId, observation) {
        try {
            const observations = await this.loadData('observations');
            observations[clientId] = {
                text: observation,
                updatedAt: new Date().toISOString()
            };
            
            await this.saveData('observations', observations);
            
            // Backup em localStorage como fallback
            localStorage.setItem('client-observations', JSON.stringify(observations));
            
            console.log(`📝 Observação salva para cliente ${clientId}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
            
            // Fallback para localStorage
            try {
                const observations = JSON.parse(localStorage.getItem('client-observations') || '{}');
                observations[clientId] = {
                    text: observation,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('client-observations', JSON.stringify(observations));
                return true;
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
                return false;
            }
        }
    }

    async loadObservation(clientId) {
        try {
            const observations = await this.loadData('observations');
            return observations[clientId]?.text || '';
        } catch (error) {
            console.error('❌ Erro ao carregar observação:', error);
            
            // Fallback para localStorage
            try {
                const observations = JSON.parse(localStorage.getItem('client-observations') || '{}');
                return observations[clientId]?.text || '';
            } catch (fallbackError) {
                console.error('❌ Fallback de carregamento falhou:', fallbackError);
                return '';
            }
        }
    }

    async loadAllObservations() {
        try {
            return await this.loadData('observations');
        } catch (error) {
            console.error('❌ Erro ao carregar observações:', error);
            try {
                return JSON.parse(localStorage.getItem('client-observations') || '{}');
            } catch (fallbackError) {
                return {};
            }
        }
    }

    // Métodos para filtros
    async saveFilters(filters) {
        try {
            const filtersToSave = {
                cidadesSelecionadas: Array.isArray(filters.cidadesSelecionadas) ? filters.cidadesSelecionadas : [],
                sort: filters.sort || 'nome-az',
                savedAt: new Date().toISOString()
            };
            
            await this.saveData('filters', filtersToSave);
            
            // Backup em localStorage
            localStorage.setItem('agenda-filters', JSON.stringify(filtersToSave));
            
            console.log('💾 Filtros salvos:', filtersToSave);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
            return false;
        }
    }

    async loadFilters() {
        try {
            const filters = await this.loadData('filters');
            return {
                cidadesSelecionadas: Array.isArray(filters.cidadesSelecionadas) ? filters.cidadesSelecionadas : [],
                sort: filters.sort || 'nome-az'
            };
        } catch (error) {
            console.error('❌ Erro ao carregar filtros:', error);
            try {
                const stored = localStorage.getItem('agenda-filters');
                const filters = stored ? JSON.parse(stored) : {};
                return {
                    cidadesSelecionadas: Array.isArray(filters.cidadesSelecionadas) ? filters.cidadesSelecionadas : [],
                    sort: filters.sort || 'nome-az'
                };
            } catch (fallbackError) {
                return {
                    cidadesSelecionadas: [],
                    sort: 'nome-az'
                };
            }
        }
    }

    // Métodos de backup e recuperação
    async exportAllData() {
        try {
            console.log('📤 Exportando todos os dados...');
            
            const allData = {
                clients: await this.loadData('clients'),
                ativos: await this.loadData('ativos'),
                novos: await this.loadData('novos'),
                schedules: await this.loadData('schedules'),
                observations: await this.loadAllObservations(),
                filters: await this.loadFilters(),
                exportedAt: new Date().toISOString(),
                version: this.dbVersion
            };

            const dataStr = JSON.stringify(allData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `pmg-agenda-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            console.log('✅ Backup exportado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro ao exportar backup:', error);
            throw error;
        }
    }

    async importAllData(fileContent) {
        try {
            console.log('📥 Importando backup...');
            
            const data = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
            
            // Validar estrutura do backup
            const requiredKeys = ['clients', 'ativos', 'novos', 'schedules'];
            const missingKeys = requiredKeys.filter(key => !data.hasOwnProperty(key));
            
            if (missingKeys.length > 0) {
                throw new Error(`Backup inválido. Chaves ausentes: ${missingKeys.join(', ')}`);
            }

            // Importar dados
            await this.saveData('clients', Array.isArray(data.clients) ? data.clients : []);
            await this.saveData('ativos', Array.isArray(data.ativos) ? data.ativos : []);
            await this.saveData('novos', Array.isArray(data.novos) ? data.novos : []);
            await this.saveData('schedules', data.schedules || {});

            // Importar observações se existirem
            if (data.observations && typeof data.observations === 'object') {
                await this.saveData('observations', data.observations);
            }

            // Importar filtros se existirem
            if (data.filters) {
                await this.saveFilters(data.filters);
            }

            console.log('✅ Backup importado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro ao importar backup:', error);
            throw error;
        }
    }

    // Verificação de integridade
    async checkDataIntegrity() {
        try {
            console.log('🔍 Verificando integridade dos dados...');
            
            const clients = await this.loadData('clients');
            const ativos = await this.loadData('ativos');
            const novos = await this.loadData('novos');
            const schedules = await this.loadData('schedules');
            const observations = await this.loadAllObservations();

            const stats = {
                clients: Array.isArray(clients) ? clients.length : 0,
                ativos: Array.isArray(ativos) ? ativos.length : 0,
                novos: Array.isArray(novos) ? novos.length : 0,
                schedules: typeof schedules === 'object' ? Object.keys(schedules).length : 0,
                observations: typeof observations === 'object' ? Object.keys(observations).length : 0,
                issues: []
            };

            // Verificar duplicatas de ID
            const allClients = [...clients, ...ativos, ...novos];
            const ids = allClients.map(c => c.id).filter(id => id);
            const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
            
            if (duplicateIds.length > 0) {
                stats.issues.push(`IDs duplicados: ${duplicateIds.join(', ')}`);
            }

            // Verificar clientes sem nome
            allClients.forEach((cliente, index) => {
                if (!cliente['Nome Fantasia'] && !cliente['Cliente']) {
                    stats.issues.push(`Cliente sem nome no índice ${index}`);
                }
                if (!cliente.id) {
                    stats.issues.push(`Cliente sem ID no índice ${index}`);
                }
            });

            console.log('🔍 Verificação de integridade concluída:', stats);
            return stats;

        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
            throw error;
        }
    }

    // Métodos de migração por versão
    migration_v1(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Configuração inicial`);
    }

    migration_v2(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Adição de índices`);
    }

    migration_v3(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Store de observações`);
    }

    migration_v4(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Store de cache`);
    }

    migration_v5(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Store de marcadores`);
    }

    migration_v6(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Store de geocodificação`);
    }

    migration_v7(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Correções de estrutura`);
    }

    migration_v8(db, oldVersion, newVersion) {
        console.log(`Migração v${newVersion}: Otimizações finais`);
    }

    // Método para obter estatísticas do banco
    async getStats() {
        try {
            const stats = {
                dbName: this.dbName,
                dbVersion: this.dbVersion,
                isInitialized: this.isInitialized,
                stores: {},
                totalSize: 0
            };

            for (const storeName of this.stores) {
                try {
                    const data = await this.loadData(storeName);
                    const size = JSON.stringify(data).length;
                    
                    stats.stores[storeName] = {
                        itemCount: Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1),
                        sizeBytes: size
                    };
                    
                    stats.totalSize += size;
                } catch (error) {
                    stats.stores[storeName] = { error: error.message };
                }
            }

            return stats;
        } catch (error) {
            return { error: error.message };
        }
    }

    // Cleanup ao destruir instância
    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.isInitialized = false;
        console.log('🔧 DBManager destruído');
    }
}

// Inicializar instância global
if (typeof window !== 'undefined') {
    window.dbManager = new DBManager();
}

console.log('✅ dbManager.js carregado com sistema robusto de IndexedDB');
