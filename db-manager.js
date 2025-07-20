// db-manager.js - Sistema de banco com tratamento robusto de erros

class DBManager {
    constructor() {
        this.dbName = 'pmg_agenda_db';
        this.version = 7;
        this.db = null;
        this.stores = {
            clients: 'clients',
            ativos: 'ativos',
            novos: 'novos',
            settings: 'settings'
        };
        this.initializationPromise = null;
    }

    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initWithRetry();
        return this.initializationPromise;
    }

    async _initWithRetry(maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${maxRetries} de inicialização do banco...`);
                await this._initDatabase();
                console.log('✅ Banco de dados inicializado com sucesso');
                return;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        throw new Error(`Falha ao inicializar banco após ${maxRetries} tentativas: ${lastError.message}`);
    }

    async _initDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB não é suportado neste navegador'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                const error = request.error || new Error('Erro desconhecido ao abrir banco');
                reject(error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.db.onerror = (event) => {
                    console.error('❌ Erro no banco:', event.target.error);
                };
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                try {
                    this._createStores();
                } catch (error) {
                    reject(error);
                }
            };
        });
    }

    _createStores() {
        Object.entries(this.stores).forEach(([key, storeName]) => {
            if (!this.db.objectStoreNames.contains(storeName)) {
                const store = this.db.createObjectStore(storeName, {
                    keyPath: key === 'settings' ? 'key' : 'id',
                    autoIncrement: false
                });

                if (['clients', 'ativos', 'novos'].includes(key)) {
                    try {
                        store.createIndex('nomeFantasia', 'Nome Fantasia', { unique: false });
                        store.createIndex('cidade', 'Cidade', { unique: false });
                    } catch (indexError) {
                        console.warn(`⚠️ Erro ao criar índices:`, indexError);
                    }
                }
            }
        });
    }

    async saveArrayData(storeName, dataArray) {
        if (!this.db || !dataArray || !Array.isArray(dataArray)) {
            console.warn('⚠️ Dados inválidos para salvar');
            return;
        }

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });

            for (const item of dataArray) {
                if (item && typeof item === 'object') {
                    if (!item.id) {
                        item.id = this.generateId(storeName);
                    }

                    await new Promise((resolve, reject) => {
                        const request = store.add(item);
                        request.onsuccess = () => resolve();
                        request.onerror = () => {
                            console.warn(`⚠️ Erro ao inserir item:`, request.error);
                            resolve();
                        };
                    });
                }
            }

            console.log(`✅ ${dataArray.length} registros salvos em '${storeName}'`);
        } catch (error) {
            console.error(`❌ Erro ao salvar dados:`, error);
            throw error;
        }
    }

    async loadData(storeName) {
        if (!this.db) return [];

        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const data = request.result || [];
                    console.log(`📂 ${data.length} registros carregados de '${storeName}'`);
                    resolve(data);
                };
                request.onerror = () => {
                    console.error(`❌ Erro ao carregar '${storeName}':`, request.error);
                    resolve([]);
                };
            });
        } catch (error) {
            console.error(`❌ Erro ao acessar '${storeName}':`, error);
            return [];
        }
    }

    async clearData(storeName) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            await new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`❌ Erro ao limpar '${storeName}':`, error);
        }
    }

    async saveData(key, data) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            await new Promise((resolve, reject) => {
                const request = store.put({ key: key, value: data, timestamp: Date.now() });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`❌ Erro ao salvar '${key}':`, error);
        }
    }

    async loadDataByKey(key) {
        if (!this.db) return null;

        try {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');

            return new Promise((resolve) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            return null;
        }
    }

    generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Métodos localStorage seguros
    saveFilters(filters) {
        try {
            localStorage.setItem('pmg_filters', JSON.stringify(filters));
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
        }
    }

    loadFilters() {
        try {
            const saved = localStorage.getItem('pmg_filters');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }

    saveObservation(clientId, observation) {
        try {
            localStorage.setItem(`obs_${clientId}`, observation);
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
        }
    }

    loadObservation(clientId) {
        try {
            return localStorage.getItem(`obs_${clientId}`) || '';
        } catch (error) {
            return '';
        }
    }
}

window.dbManager = new DBManager();
console.log('✅ db-manager.js carregado - versão estável');
