// dbManager.js - Gerenciador unificado de banco de dados corrigido

class DBManager {
    constructor() {
        this.dbName = 'PMG_AgendaClientes_DB';
        this.dbVersion = 5;
        this.db = null;
        this.stores = [
            'clients', // Clientes inativos
            'ativos', // Clientes ativos
            'novos', // Clientes novos
            'schedules', // Agendamentos
            'observations', // Observações
            'filters', // Filtros salvos
            'cache' // Cache de geocodificação
        ];
    }

    async init() {
        try {
            console.log('🔧 Inicializando DBManager...');
            this.db = await this.openDB();
            console.log('✅ DBManager inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar DBManager:', error);
            throw error;
        }
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                console.log('✅ IndexedDB aberto com sucesso');
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`🔄 Atualizando banco da versão ${event.oldVersion} para ${event.newVersion}`);
                
                // Criar todas as stores necessárias
                this.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                        console.log(`📁 Store '${storeName}' criada`);
                    }
                });
            };
        });
    }

    async saveData(storeName, data) {
        if (!this.db) {
            throw new Error('Banco de dados não inicializado');
        }

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Limpar store antes de salvar
            await this.clearStore(store);
            
            if (Array.isArray(data)) {
                // Para arrays, salvar cada item com chave única
                const promises = data.map((item, index) => {
                    return new Promise((resolve, reject) => {
                        const key = item.id || `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
                        const request = store.put(item, key);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                });
                await Promise.all(promises);
            } else {
                // Para objetos únicos
                await new Promise((resolve, reject) => {
                    const request = store.put(data, 'data');
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            console.log(`💾 Dados salvos em '${storeName}': ${Array.isArray(data) ? data.length : 'objeto'} item(s)`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao salvar em '${storeName}':`, error);
            throw error;
        }
    }

    async loadData(storeName) {
        if (!this.db) {
            throw new Error('Banco de dados não inicializado');
        }

        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    let result = request.result || [];
                    
                    // Se não há resultados, tentar buscar por chave 'data'
                    if (result.length === 0) {
                        const dataRequest = store.get('data');
                        dataRequest.onsuccess = () => {
                            const dataResult = dataRequest.result;
                            if (dataResult) {
                                result = dataResult;
                            } else {
                                // Retornar estrutura padrão baseada no store
                                result = (storeName === 'schedules' || storeName === 'observations' || storeName === 'filters' || storeName === 'cache') ? {} : [];
                            }
                            
                            console.log(`📖 Dados carregados de '${storeName}': ${Array.isArray(result) ? result.length : typeof result} item(s)`);
                            resolve(result);
                        };
                        dataRequest.onerror = () => {
                            const defaultResult = (storeName === 'schedules' || storeName === 'observations' || storeName === 'filters' || storeName === 'cache') ? {} : [];
                            console.log(`📖 Dados padrão retornados para '${storeName}': ${Array.isArray(defaultResult) ? defaultResult.length : typeof defaultResult} item(s)`);
                            resolve(defaultResult);
                        };
                    } else {
                        console.log(`📖 Dados carregados de '${storeName}': ${result.length} item(s)`);
                        resolve(result);
                    }
                };
                request.onerror = () => {
                    console.error(`❌ Erro ao carregar de '${storeName}':`, request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`❌ Erro ao carregar dados de '${storeName}':`, error);
            throw error;
        }
    }

    async clearData(storeName) {
        if (!this.db) {
            throw new Error('Banco de dados não inicializado');
        }

        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await this.clearStore(store);
            console.log(`🧹 Store '${storeName}' limpa com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao limpar '${storeName}':`, error);
            throw error;
        }
    }

    clearStore(store) {
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos específicos para observações (usando localStorage como backup)
    saveObservation(clientId, observation) {
        try {
            const observations = this.loadAllObservations();
            observations[clientId] = {
                text: observation,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('client-observations', JSON.stringify(observations));
            console.log(`📝 Observação salva para cliente ${clientId}`);
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
        }
    }

    loadObservation(clientId) {
        try {
            const observations = this.loadAllObservations();
            return observations[clientId]?.text || '';
        } catch (error) {
            console.error('❌ Erro ao carregar observação:', error);
            return '';
        }
    }

    loadAllObservations() {
        try {
            const stored = localStorage.getItem('client-observations');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('❌ Erro ao carregar observações:', error);
            return {};
        }
    }

    // Métodos para filtros (removido campos de saldo)
    saveFilters(filters) {
        try {
            const filtersToSave = {
                cidadesSelecionadas: Array.isArray(filters.cidadesSelecionadas) ? filters.cidadesSelecionadas : [],
                sort: filters.sort || 'nome-az',
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('agenda-filters', JSON.stringify(filtersToSave));
            console.log('💾 Filtros salvos:', filtersToSave);
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
        }
    }

    loadFilters() {
        try {
            const stored = localStorage.getItem('agenda-filters');
            const filters = stored ? JSON.parse(stored) : {};
            return {
                cidadesSelecionadas: Array.isArray(filters.cidadesSelecionadas) ? filters.cidadesSelecionadas : [],
                sort: filters.sort || 'nome-az'
            };
        } catch (error) {
            console.error('❌ Erro ao carregar filtros:', error);
            return {
                cidadesSelecionadas: [],
                sort: 'nome-az'
            };
        }
    }

    // Backup e restauração
    async exportAllData() {
        try {
            const allData = {
                clients: await this.loadData('clients'),
                ativos: await this.loadData('ativos'),
                novos: await this.loadData('novos'),
                schedules: await this.loadData('schedules'),
                observations: this.loadAllObservations(),
                filters: this.loadFilters(),
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

            console.log('📤 Backup exportado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao exportar backup:', error);
            throw error;
        }
    }

    async importAllData(fileContent) {
        try {
            const data = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
            
            // Validar estrutura
            const requiredKeys = ['clients', 'ativos', 'novos', 'schedules'];
            const missingKeys = requiredKeys.filter(key => !data.hasOwnProperty(key));
            
            if (missingKeys.length > 0) {
                throw new Error(`Backup inválido. Chaves ausentes: ${missingKeys.join(', ')}`);
            }

            // Importar dados do IndexedDB
            await this.saveData('clients', Array.isArray(data.clients) ? data.clients : []);
            await this.saveData('ativos', Array.isArray(data.ativos) ? data.ativos : []);
            await this.saveData('novos', Array.isArray(data.novos) ? data.novos : []);
            await this.saveData('schedules', data.schedules || {});

            // Importar observações e filtros
            if (data.observations && typeof data.observations === 'object') {
                localStorage.setItem('client-observations', JSON.stringify(data.observations));
            }

            if (data.filters) {
                this.saveFilters(data.filters);
            }

            console.log('📥 Backup importado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao importar backup:', error);
            throw error;
        }
    }

    // Verificação de integridade
    async checkDataIntegrity() {
        try {
            const clients = await this.loadData('clients');
            const ativos = await this.loadData('ativos');
            const novos = await this.loadData('novos');
            const schedules = await this.loadData('schedules');

            const stats = {
                clients: Array.isArray(clients) ? clients.length : 0,
                ativos: Array.isArray(ativos) ? ativos.length : 0,
                novos: Array.isArray(novos) ? novos.length : 0,
                schedules: typeof schedules === 'object' ? Object.keys(schedules).length : 0,
                observations: Object.keys(this.loadAllObservations()).length,
                issues: []
            };

            // Verificar duplicatas
            const allClients = [...clients, ...ativos, ...novos];
            const ids = allClients.map(c => c.id).filter(id => id);
            const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
            
            if (duplicateIds.length > 0) {
                stats.issues.push(`IDs duplicados: ${duplicateIds.join(', ')}`);
            }

            // Verificar campos obrigatórios
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
}

// Inicializar instância global
if (typeof window !== 'undefined') {
    window.dbManager = new DBManager();
}

console.log('✅ dbManager.js carregado - versão corrigida sem campos de saldo');
