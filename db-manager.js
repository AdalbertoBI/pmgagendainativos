// db-manager.js - Gerenciador de banco de dados robusto com tratamento de erros
class DBManager {
    constructor() {
        this.dbName = 'PMG_ClientsDB';
        this.version = 3; // Incrementado para forçar upgrade
        this.db = null;
        this.isReady = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Stores disponíveis
        this.stores = [
            'clients',
            'ativos', 
            'novos',
            'agendamentos',
            'settings',
            'cache',
            'error_logs'
        ];
        
        console.log('💾 DBManager inicializado');
    }

    // Inicializar banco de dados com retry automático
    async init() {
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                console.log(`💾 Tentativa ${attempt + 1} de inicializar IndexedDB...`);
                await this.openDatabase();
                this.isReady = true;
                console.log('✅ IndexedDB inicializado com sucesso');
                return true;
            } catch (error) {
                console.error(`❌ Tentativa ${attempt + 1} falhou:`, error);
                
                if (attempt === this.maxRetries - 1) {
                    console.warn('⚠️ Usando fallback localStorage');
                    return this.initLocalStorageFallback();
                }
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    // Abrir banco de dados
    async openDatabase() {
        return new Promise((resolve, reject) => {
            // Verificar suporte ao IndexedDB
            if (!('indexedDB' in window)) {
                throw new Error('IndexedDB não suportado');
            }

            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Banco de dados aberto');
                
                // Configurar tratamento de erros
                this.db.onerror = (event) => {
                    console.error('Erro no banco de dados:', event.target.error);
                };
                
                // Configurar fechamento inesperado
                this.db.onclose = () => {
                    console.warn('⚠️ Banco de dados fechado inesperadamente');
                    this.isReady = false;
                };
                
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('🔄 Atualizando estrutura do banco...');
                this.db = event.target.result;
                this.createStores(event);
            };
            
            request.onblocked = () => {
                console.warn('⚠️ Atualização do banco bloqueada');
                reject(new Error('Atualização bloqueada - feche outras abas'));
            };
        });
    }

    // Criar stores necessários
    createStores(event) {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        
        console.log(`📦 Criando stores... (versão ${oldVersion} → ${db.version})`);
        
        this.stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                console.log(`📦 Criando store: ${storeName}`);
                
                const store = db.createObjectStore(storeName, { 
                    keyPath: 'id',
                    autoIncrement: false 
                });
                
                // Índices específicos por store
                switch (storeName) {
                    case 'clients':
                    case 'ativos':
                    case 'novos':
                        this.createClientIndexes(store);
                        break;
                    case 'agendamentos':
                        this.createAgendaIndexes(store);
                        break;
                    case 'error_logs':
                        store.createIndex('timestamp', 'timestamp');
                        break;
                }
            }
        });
    }

    // Criar índices para clientes
    createClientIndexes(store) {
        try {
            store.createIndex('nomeFantasia', 'Nome Fantasia');
            store.createIndex('contato', 'Contato');
            store.createIndex('celular', 'Celular');
            store.createIndex('endereco', 'Endereço');
            store.createIndex('status', 'Status');
            store.createIndex('segmento', 'Segmento');
            store.createIndex('dataImportacao', 'dataImportacao');
        } catch (error) {
            console.warn('Alguns índices já existem:', error);
        }
    }

    // Criar índices para agenda
    createAgendaIndexes(store) {
        try {
            store.createIndex('dataHora', 'dataHora');
            store.createIndex('clienteId', 'clienteId');
            store.createIndex('status', 'status');
            store.createIndex('tipo', 'tipo');
        } catch (error) {
            console.warn('Alguns índices já existem:', error);
        }
    }

    // Fallback para localStorage
    async initLocalStorageFallback() {
        console.log('📱 Inicializando fallback localStorage...');
        
        try {
            // Testar se localStorage está disponível
            const testKey = 'pmg_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            this.isReady = true;
            this.usingFallback = true;
            console.log('✅ localStorage fallback pronto');
            return true;
        } catch (error) {
            console.error('❌ localStorage não disponível');
            throw new Error('Nenhum método de armazenamento disponível');
        }
    }

    // Salvar dados
    async saveData(storeName, data) {
        try {
            if (this.usingFallback) {
                return this.saveToLocalStorage(storeName, data);
            }
            
            if (!this.isReady || !this.db) {
                throw new Error('Banco não inicializado');
            }

            // Garantir que data seja um array
            const dataArray = Array.isArray(data) ? data : [data];
            
            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    
                    transaction.oncomplete = () => {
                        console.log(`💾 Dados salvos em ${storeName}: ${dataArray.length} registros`);
                        resolve(true);
                    };
                    
                    transaction.onerror = () => {
                        console.error(`Erro na transação ${storeName}:`, transaction.error);
                        reject(transaction.error);
                    };
                    
                    transaction.onabort = () => {
                        console.error(`Transação ${storeName} abortada`);
                        reject(new Error('Transação abortada'));
                    };
                    
                    // Limpar store antes de salvar array completo
                    if (dataArray.length > 1) {
                        store.clear();
                    }
                    
                    // Salvar cada item
                    dataArray.forEach(item => {
                        if (item && typeof item === 'object') {
                            // Garantir que cada item tenha um ID
                            if (!item.id) {
                                item.id = this.generateId();
                            }
                            store.put(item);
                        }
                    });
                    
                } catch (error) {
                    console.error(`Erro ao criar transação para ${storeName}:`, error);
                    reject(error);
                }
            });
            
        } catch (error) {
            console.error(`Erro ao salvar em ${storeName}:`, error);
            
            // Tentar fallback se IndexedDB falhar
            if (!this.usingFallback) {
                console.log('🔄 Tentando fallback localStorage...');
                return this.saveToLocalStorage(storeName, data);
            }
            
            throw error;
        }
    }

    // Carregar dados
    async loadData(storeName) {
        try {
            if (this.usingFallback) {
                return this.loadFromLocalStorage(storeName);
            }
            
            if (!this.isReady || !this.db) {
                console.warn(`Banco não inicializado, usando fallback para ${storeName}`);
                return this.loadFromLocalStorage(storeName);
            }

            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        const data = request.result || [];
                        console.log(`📖 Dados carregados de ${storeName}: ${data.length} registros`);
                        resolve(data);
                    };
                    
                    request.onerror = () => {
                        console.error(`Erro ao carregar ${storeName}:`, request.error);
                        reject(request.error);
                    };
                    
                    transaction.onerror = () => {
                        console.error(`Erro na transação de leitura ${storeName}:`, transaction.error);
                        reject(transaction.error);
                    };
                    
                } catch (error) {
                    console.error(`Erro ao criar transação de leitura para ${storeName}:`, error);
                    reject(error);
                }
            });
            
        } catch (error) {
            console.error(`Erro ao carregar de ${storeName}:`, error);
            
            // Tentar fallback
            if (!this.usingFallback) {
                console.log('🔄 Usando fallback localStorage para leitura...');
                return this.loadFromLocalStorage(storeName);
            }
            
            return [];
        }
    }

    // Salvar no localStorage (fallback)
    saveToLocalStorage(storeName, data) {
        try {
            const key = `pmg_${storeName}`;
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            console.log(`💾 Dados salvos no localStorage: ${storeName}`);
            return Promise.resolve(true);
        } catch (error) {
            console.error(`Erro ao salvar no localStorage ${storeName}:`, error);
            throw error;
        }
    }

    // Carregar do localStorage (fallback)
    loadFromLocalStorage(storeName) {
        try {
            const key = `pmg_${storeName}`;
            const jsonData = localStorage.getItem(key);
            
            if (!jsonData) {
                return Promise.resolve([]);
            }
            
            const data = JSON.parse(jsonData);
            console.log(`📖 Dados carregados do localStorage: ${storeName}`);
            return Promise.resolve(Array.isArray(data) ? data : [data]);
        } catch (error) {
            console.error(`Erro ao carregar do localStorage ${storeName}:`, error);
            return Promise.resolve([]);
        }
    }

    // Auto-save periódico
    async autoSave() {
        if (!this.isReady) return;
        
        try {
            console.log('💾 Executando auto-save...');
            
            // Salvar apenas dados que podem ter mudado
            const managers = ['clientManager', 'agendaManager'];
            
            for (const managerName of managers) {
                const manager = window[managerName];
                if (manager && typeof manager.getDataForSave === 'function') {
                    const data = manager.getDataForSave();
                    if (data && Object.keys(data).length > 0) {
                        for (const [storeName, storeData] of Object.entries(data)) {
                            await this.saveData(storeName, storeData);
                        }
                    }
                }
            }
            
            console.log('✅ Auto-save concluído');
        } catch (error) {
            console.error('❌ Erro no auto-save:', error);
        }
    }

    // Limpar dados
    async clearData(storeName) {
        try {
            if (this.usingFallback) {
                localStorage.removeItem(`pmg_${storeName}`);
                return Promise.resolve(true);
            }
            
            if (!this.isReady || !this.db) {
                throw new Error('Banco não inicializado');
            }

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log(`🗑️ Store ${storeName} limpo`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error(`Erro ao limpar ${storeName}:`, error);
            throw error;
        }
    }

    // Obter estatísticas
    async getStats() {
        const stats = {
            isReady: this.isReady,
            usingFallback: this.usingFallback,
            stores: {}
        };
        
        for (const storeName of this.stores) {
            try {
                const data = await this.loadData(storeName);
                stats.stores[storeName] = data.length;
            } catch (error) {
                stats.stores[storeName] = 'erro';
            }
        }
        
        return stats;
    }

    // Gerar ID único
    generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Verificar saúde do banco
    async healthCheck() {
        try {
            if (this.usingFallback) {
                return { status: 'ok', method: 'localStorage' };
            }
            
            if (!this.isReady || !this.db) {
                return { status: 'error', message: 'Banco não inicializado' };
            }
            
            // Teste de leitura/escrita
            const testData = { id: 'health_test', timestamp: Date.now() };
            await this.saveData('cache', testData);
            await this.loadData('cache');
            
            return { status: 'ok', method: 'IndexedDB' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    // Reparar banco de dados
    async repair() {
        console.log('🔧 Tentando reparar banco de dados...');
        
        try {
            if (this.db) {
                this.db.close();
            }
            
            // Deletar banco atual
            await new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(this.dbName);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
                deleteReq.onblocked = () => {
                    console.warn('Delete bloqueado');
                    resolve(); // Continuar mesmo assim
                };
            });
            
            // Reinicializar
            this.isReady = false;
            this.db = null;
            await this.init();
            
            console.log('✅ Banco reparado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao reparar banco:', error);
            return false;
        }
    }

    // Destruir instância
    destroy() {
        if (this.db) {
            this.db.close();
        }
        this.isReady = false;
        this.db = null;
    }
}

// Instância global
window.dbManager = new DBManager();
console.log('💾 db-manager.js carregado - Gerenciador de banco robusto');
