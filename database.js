// database.js - Gerenciamento de IndexedDB e localStorage corrigido

class DatabaseManager {
    constructor() {
        this.dbName = 'ClientDatabase';
        this.dbVersion = 1;
        this.db = null;
    }

    // Inicializar IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('clients')) {
                    db.createObjectStore('clients', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('ativos')) {
                    db.createObjectStore('ativos', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('schedules')) {
                    db.createObjectStore('schedules', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB inicializado com sucesso');
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('❌ Erro ao abrir IndexedDB:', event.target.error);
                reject(new Error('Erro ao abrir IndexedDB: ' + event.target.error));
            };
        });
    }

    // Salvar dados em uma store específica - CORRIGIDO
    async saveData(storeName, data) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // CORREÇÃO: Limpar store antes de salvar array
            if (Array.isArray(data)) {
                // Primeiro limpar todos os dados existentes
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                    // Depois adicionar todos os novos dados
                    let completed = 0;
                    const total = data.length;
                    
                    if (total === 0) {
                        // Se array vazio, apenas resolve após limpeza
                        resolve();
                        return;
                    }
                    
                    data.forEach((item, index) => {
                        const putRequest = store.put(item);
                        
                        putRequest.onsuccess = () => {
                            completed++;
                            if (completed === total) {
                                console.log(`✅ ${total} itens salvos em ${storeName}`);
                                resolve();
                            }
                        };
                        
                        putRequest.onerror = () => {
                            console.error(`❌ Erro ao salvar item ${index} em ${storeName}`);
                            reject(new Error(`Erro ao salvar item ${index} em ${storeName}`));
                        };
                    });
                };
                
                clearRequest.onerror = () => {
                    console.error(`❌ Erro ao limpar ${storeName}`);
                    reject(new Error(`Erro ao limpar ${storeName}`));
                };
            } else {
                // Para item único, usar put normal
                const putRequest = store.put(data);
                
                putRequest.onsuccess = () => {
                    console.log(`✅ Item salvo em ${storeName}`);
                    resolve();
                };
                
                putRequest.onerror = () => {
                    console.error(`❌ Erro ao salvar item em ${storeName}`);
                    reject(new Error(`Erro ao salvar item em ${storeName}`));
                };
            }
            
            transaction.onerror = () => {
                console.error(`❌ Erro na transação ${storeName}`);
                reject(new Error(`Erro na transação ${storeName}`));
            };
        });
    }

    // Carregar dados de uma store específica
    async loadData(storeName) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const result = request.result || [];
                console.log(`✅ ${result.length} itens carregados de ${storeName}`);
                resolve(result);
            };
            
            request.onerror = () => {
                console.error(`❌ Erro ao carregar ${storeName}`);
                reject(new Error(`Erro ao carregar ${storeName}`));
            };
        });
    }

    // Limpar dados de uma store específica
    async clearData(storeName) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log(`✅ Store ${storeName} limpa com sucesso`);
                resolve();
            };
            
            request.onerror = () => {
                console.error(`❌ Erro ao limpar ${storeName}`);
                reject(new Error(`Erro ao limpar ${storeName}`));
            };
        });
    }

    // Deletar um item específico
    async deleteItem(storeName, id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log(`✅ Item ${id} deletado de ${storeName}`);
                resolve();
            };
            
            request.onerror = () => {
                console.error(`❌ Erro ao deletar item ${id} de ${storeName}`);
                reject(new Error(`Erro ao deletar item ${id} de ${storeName}`));
            };
        });
    }

    // Função específica para salvar arrays de forma robusta - NOVA
    async saveArrayData(storeName, dataArray) {
        if (!this.db) await this.init();
        
        console.log(`🔄 Salvando ${dataArray.length} itens em ${storeName}...`);
        
        return new Promise(async (resolve, reject) => {
            try {
                // Primeiro, limpar completamente a store
                await this.clearData(storeName);
                
                // Se array vazio, apenas retorna
                if (dataArray.length === 0) {
                    console.log(`✅ Store ${storeName} limpa (array vazio)`);
                    resolve();
                    return;
                }
                
                // Salvar todos os itens
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                let saved = 0;
                const total = dataArray.length;
                
                dataArray.forEach((item, index) => {
                    const request = store.put(item);
                    
                    request.onsuccess = () => {
                        saved++;
                        if (saved === total) {
                            console.log(`✅ ${total} itens salvos com sucesso em ${storeName}`);
                            resolve();
                        }
                    };
                    
                    request.onerror = () => {
                        console.error(`❌ Erro ao salvar item ${index}:`, item);
                        reject(new Error(`Erro ao salvar item ${index} em ${storeName}`));
                    };
                });
                
                transaction.onerror = () => {
                    console.error(`❌ Erro na transação de ${storeName}`);
                    reject(new Error(`Erro na transação de ${storeName}`));
                };
                
            } catch (error) {
                console.error(`❌ Erro ao salvar array em ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Verificar integridade dos dados - NOVA FUNÇÃO
    async verifyDataIntegrity(storeName) {
        try {
            const data = await this.loadData(storeName);
            console.log(`🔍 Verificação de integridade ${storeName}:`, {
                total: data.length,
                ids: data.map(item => item.id).slice(0, 5) // Primeiros 5 IDs
            });
            return data;
        } catch (error) {
            console.error(`❌ Erro na verificação de ${storeName}:`, error);
            return [];
        }
    }

    // Gerenciar filtros no localStorage
    saveFilters(filters) {
        try {
            localStorage.setItem('savedFilters', JSON.stringify(filters));
            console.log('✅ Filtros salvos:', filters);
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
        }
    }

    loadFilters() {
        try {
            const saved = localStorage.getItem('savedFilters');
            const filters = saved ? JSON.parse(saved) : {
                saldoMin: 0,
                cidadesSelecionadas: [],
                sort: 'nome-az'
            };
            console.log('✅ Filtros carregados:', filters);
            return filters;
        } catch (error) {
            console.error('❌ Erro ao carregar filtros:', error);
            return {
                saldoMin: 0,
                cidadesSelecionadas: [],
                sort: 'nome-az'
            };
        }
    }

    // Gerenciar cache de endereços
    saveAddressCache(cache) {
        try {
            localStorage.setItem('addressCache', JSON.stringify(cache));
            console.log(`✅ Cache de endereços salvo: ${Object.keys(cache).length} itens`);
        } catch (error) {
            console.error('❌ Erro ao salvar cache de endereços:', error);
        }
    }

    loadAddressCache() {
        try {
            const saved = localStorage.getItem('addressCache');
            const cache = saved ? JSON.parse(saved) : {};
            console.log(`✅ Cache de endereços carregado: ${Object.keys(cache).length} itens`);
            return cache;
        } catch (error) {
            console.error('❌ Erro ao carregar cache de endereços:', error);
            return {};
        }
    }

    // Gerenciar correções manuais
    saveManualCorrections(corrections) {
        try {
            localStorage.setItem('manualCorrections', JSON.stringify(corrections));
            console.log(`✅ Correções manuais salvas: ${Object.keys(corrections).length} itens`);
        } catch (error) {
            console.error('❌ Erro ao salvar correções manuais:', error);
        }
    }

    loadManualCorrections() {
        try {
            const saved = localStorage.getItem('manualCorrections');
            const corrections = saved ? JSON.parse(saved) : {};
            console.log(`✅ Correções manuais carregadas: ${Object.keys(corrections).length} itens`);
            return corrections;
        } catch (error) {
            console.error('❌ Erro ao carregar correções manuais:', error);
            return {};
        }
    }

    // Salvar observações do cliente
    saveObservation(clientId, observation) {
        try {
            const key = `observacoes_${clientId}`;
            localStorage.setItem(key, observation);
            console.log(`✅ Observação salva para cliente ${clientId}`);
        } catch (error) {
            console.error(`❌ Erro ao salvar observação para ${clientId}:`, error);
        }
    }

    loadObservation(clientId) {
        try {
            const key = `observacoes_${clientId}`;
            const observation = localStorage.getItem(key) || '';
            return observation;
        } catch (error) {
            console.error(`❌ Erro ao carregar observação para ${clientId}:`, error);
            return '';
        }
    }

    // Função de limpeza geral - NOVA
    async clearAllData() {
        try {
            await this.clearData('clients');
            await this.clearData('ativos');
            await this.clearData('schedules');
            
            // Limpar localStorage também
            localStorage.removeItem('savedFilters');
            localStorage.removeItem('addressCache');
            localStorage.removeItem('manualCorrections');
            
            console.log('✅ Todos os dados limpos');
        } catch (error) {
            console.error('❌ Erro ao limpar todos os dados:', error);
        }
    }

    // Função de backup/exportação - NOVA
    async exportAllData() {
        try {
            const clients = await this.loadData('clients');
            const ativos = await this.loadData('ativos');
            const schedules = await this.loadData('schedules');
            
            const backup = {
                timestamp: new Date().toISOString(),
                clients: clients,
                ativos: ativos,
                schedules: schedules,
                filters: this.loadFilters(),
                addressCache: this.loadAddressCache(),
                manualCorrections: this.loadManualCorrections()
            };
            
            console.log('✅ Backup criado:', backup);
            return backup;
        } catch (error) {
            console.error('❌ Erro ao criar backup:', error);
            return null;
        }
    }
}

// Instância global do gerenciador de banco de dados
window.dbManager = new DatabaseManager();

console.log('✅ database.js carregado - versão corrigida com persistência robusta');
