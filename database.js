// database.js - Gerenciamento de IndexedDB e localStorage

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
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject(new Error('Erro ao abrir IndexedDB: ' + event.target.error));
            };
        });
    }

    // Salvar dados em uma store específica
    async saveData(storeName, data) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            if (Array.isArray(data)) {
                data.forEach(item => store.put(item));
            } else {
                store.put(data);
            }
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error(`Erro ao salvar em ${storeName}`));
        });
    }

    // Carregar dados de uma store específica
    async loadData(storeName) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Erro ao carregar ${storeName}`));
        });
    }

    // Limpar dados de uma store específica
    async clearData(storeName) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Erro ao limpar ${storeName}`));
        });
    }

    // Deletar um item específico
    async deleteItem(storeName, id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Erro ao deletar item ${id} de ${storeName}`));
        });
    }

    // Gerenciar filtros no localStorage
    saveFilters(filters) {
        localStorage.setItem('savedFilters', JSON.stringify(filters));
    }

    loadFilters() {
        const saved = localStorage.getItem('savedFilters');
        return saved ? JSON.parse(saved) : {
            saldoMin: 0,
            cidadesSelecionadas: [],
            sort: 'nome-az'
        };
    }

    // Gerenciar cache de endereços
    saveAddressCache(cache) {
        localStorage.setItem('addressCache', JSON.stringify(cache));
    }

    loadAddressCache() {
        const saved = localStorage.getItem('addressCache');
        return saved ? JSON.parse(saved) : {};
    }

    // Gerenciar correções manuais
    saveManualCorrections(corrections) {
        localStorage.setItem('manualCorrections', JSON.stringify(corrections));
    }

    loadManualCorrections() {
        const saved = localStorage.getItem('manualCorrections');
        return saved ? JSON.parse(saved) : {};
    }

    // Salvar observações do cliente
    saveObservation(clientId, observation) {
        const key = `observacoes_${clientId}`;
        localStorage.setItem(key, observation);
    }

    loadObservation(clientId) {
        const key = `observacoes_${clientId}`;
        return localStorage.getItem(key) || '';
    }
}

// Instância global do gerenciador de banco de dados
window.dbManager = new DatabaseManager();
