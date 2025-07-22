// dbManager.js - Versão CORRIGIDA sem reset automático de dados
class DBManager {
    constructor() {
        this.dbName = 'PMG_AgendaClientes_DB_PERSISTENT';
        this.dbVersion = 1; // Versão fixa para evitar conflitos
        this.db = null;
        this.isInitialized = false;
        
        this.stores = ['clients', 'ativos', 'novos', 'schedules', 'observations', 'cache'];
        this.retryConfig = { maxRetries: 2, baseDelay: 1000 };
        
        console.log('✅ DBManager inicializado - modo persistente');
    }

    async init() {
        if (this.isInitialized) {
            console.log('✅ DBManager já inicializado');
            return true;
        }

        try {
            console.log('🔧 Inicializando DBManager persistente...');
            
            // NÃO fazer limpeza automática - apenas abrir o banco
            this.db = await this.openDatabase();
            this.setupHandlers();
            this.isInitialized = true;
            
            console.log('✅ DBManager inicializado (dados preservados)');
            return true;
            
        } catch (error) {
            console.error('❌ Erro DBManager:', error);
            
            // Só resetar se realmente for necessário
            if (error.name === 'VersionError') {
                console.log('🔄 Tentando resolver conflito de versão...');
                await this.handleVersionConflict();
                return await this.init();
            }
            
            throw error;
        }
    }

    async handleVersionConflict() {
        try {
            console.log('🔧 Resolvendo conflito de versão...');
            
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // Apenas incrementar versão, NÃO deletar dados
            this.dbVersion++;
            this.isInitialized = false;
            
            console.log(`🔄 Nova versão: ${this.dbVersion}`);
            
        } catch (error) {
            console.error('❌ Erro ao resolver conflito:', error);
        }
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            console.log(`📡 Abrindo ${this.dbName} v${this.dbVersion}`);
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('❌ Erro IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onblocked = () => {
                console.warn('🚧 Operação bloqueada');
                setTimeout(() => reject(new Error('Bloqueado')), 3000);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                
                console.log(`🔄 Upgrade ${oldVersion} → ${newVersion}`);
                
                // Criar stores que não existem (preservar dados existentes)
                this.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName);
                        console.log(`📁 Store ${storeName} criada`);
                        
                        // Adicionar índices se necessário
                        if (['clients', 'ativos', 'novos'].includes(storeName)) {
                            try {
                                store.createIndex('nome', 'Nome Fantasia', { unique: false });
                                store.createIndex('status', 'Status', { unique: false });
                            } catch (indexError) {
                                console.warn(`⚠️ Índice em ${storeName}:`, indexError);
                            }
                        }
                    }
                });
            };
            
            request.onsuccess = () => {
                const db = request.result;
                console.log(`✅ Database aberto v${db.version}`);
                resolve(db);
            };
        });
    }

    setupHandlers() {
        if (!this.db) return;
        
        this.db.onversionchange = () => {
            console.log('🔄 Versão alterada por outra aba');
            this.db.close();
            this.isInitialized = false;
            
            // Recarregar apenas se necessário
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        };
        
        this.db.onerror = (event) => {
            console.error('❌ Erro DB:', event);
        };
    }

    async saveData(storeName, data) {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log(`💾 Salvando em ${storeName}...`);
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Limpar store atual
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });
            
            // Salvar novos dados
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    const key = item.id || item['ID Cliente'] || `item_${i}_${Date.now()}`;
                    
                    await new Promise((resolve, reject) => {
                        const putRequest = store.put(item, key);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    });
                }
                console.log(`✅ ${data.length} itens salvos em ${storeName}`);
            } else {
                await new Promise((resolve, reject) => {
                    const putRequest = store.put(data, 'data');
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                });
                console.log(`✅ Objeto salvo em ${storeName}`);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao salvar ${storeName}:`, error);
            return false;
        }
    }

    async loadData(storeName) {
        if (!this.isInitialized) await this.init();
        
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            // Tentar carregar todos os itens
            const allRequest = store.getAll();
            const result = await new Promise((resolve, reject) => {
                allRequest.onsuccess = () => resolve(allRequest.result);
                allRequest.onerror = () => reject(allRequest.error);
            });
            
            if (result && result.length > 0) {
                console.log(`📖 ${result.length} itens carregados de ${storeName}`);
                return result;
            }
            
            // Tentar item único
            const singleRequest = store.get('data');
            const singleResult = await new Promise((resolve, reject) => {
                singleRequest.onsuccess = () => resolve(singleRequest.result);
                singleRequest.onerror = () => reject(singleRequest.error);
            });
            
            if (singleResult !== undefined) {
                console.log(`📖 Item único carregado de ${storeName}`);
                return singleResult;
            }
            
            // Retornar valor padrão
            const defaultValue = ['schedules', 'observations', 'cache'].includes(storeName) ? {} : [];
            console.log(`📖 Valor padrão para ${storeName}`);
            return defaultValue;
            
        } catch (error) {
            console.error(`❌ Erro ao carregar ${storeName}:`, error);
            return ['schedules', 'observations', 'cache'].includes(storeName) ? {} : [];
        }
    }

    async clearData(storeName) {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log(`🧹 Limpando ${storeName}...`);
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });
            
            console.log(`✅ ${storeName} limpo`);
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao limpar ${storeName}:`, error);
            return false;
        }
    }

    // Métodos de conveniência para observações
    async saveObservation(clientId, observation) {
        try {
            const observations = await this.loadData('observations');
            observations[clientId] = {
                text: observation,
                updatedAt: new Date().toISOString()
            };
            return await this.saveData('observations', observations);
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
            return false;
        }
    }

    async loadObservation(clientId) {
        try {
            const observations = await this.loadData('observations');
            return observations[clientId]?.text || '';
        } catch (error) {
            console.error('❌ Erro ao carregar observação:', error);
            return '';
        }
    }

    // Método para forçar reset (apenas quando explicitamente solicitado)
    async forceReset() {
        try {
            console.log('🚨 RESET FORÇADO do banco de dados...');
            
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            await this.deleteDatabase();
            this.isInitialized = false;
            
            console.log('✅ Reset forçado concluído');
            
        } catch (error) {
            console.error('❌ Erro no reset forçado:', error);
        }
    }

    async deleteDatabase() {
        return new Promise((resolve) => {
            console.log('🗑️ Deletando database...');
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('✅ Database deletado');
                resolve(true);
            };
            
            request.onerror = () => {
                console.warn('⚠️ Erro ao deletar');
                resolve(false);
            };
            
            request.onblocked = () => {
                console.warn('🚧 Delete bloqueado');
                setTimeout(() => resolve(false), 2000);
            };
        });
    }

    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.isInitialized = false;
        console.log('🔧 DBManager destruído');
    }
}

window.dbManager = new DBManager();
console.log('✅ dbManager.js PERSISTENTE carregado');
