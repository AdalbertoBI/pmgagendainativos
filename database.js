// database.js - Gerenciamento de IndexedDB e localStorage corrigido

class DatabaseManager {
    constructor() {
        this.dbName = 'ClientDatabase';
        this.dbVersion = 2; // Versão corrigida para evitar conflitos
        this.db = null;
    }

    // Inicializar IndexedDB
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('ativos')) db.createObjectStore('ativos', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('schedules')) db.createObjectStore('schedules', { keyPath: 'id' });
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

    // Salvar dados em uma store específica
    async saveData(storeName, data) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            if (Array.isArray(data)) {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => {
                    let completed = 0, total = data.length;
                    if (total === 0) return resolve();
                    data.forEach((item, index) => {
                        const putRequest = store.put(item);
                        putRequest.onsuccess = () => { if (++completed === total) resolve(); };
                        putRequest.onerror = () => reject(new Error(`Erro ao salvar item ${index}`));
                    });
                };
                clearRequest.onerror = () => reject(new Error(`Erro ao limpar ${storeName}`));
            } else {
                const putRequest = store.put(data);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(new Error(`Erro ao salvar item em ${storeName}`));
            }
            transaction.onerror = () => reject(new Error(`Erro na transação ${storeName}`));
        });
    }

    // Carregar dados de uma store
    async loadData(storeName) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => { resolve(request.result || []); };
            request.onerror = () => reject(new Error(`Erro ao carregar ${storeName}`));
        });
    }

    // Limpar dados de uma store
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

    // Deletar item específico
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

    // Salvar arrays de dados
    async saveArrayData(storeName, dataArray) {
        if (!this.db) await this.init();
        await this.clearData(storeName);
        if (dataArray.length === 0) return;
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        let saved = 0, total = dataArray.length;
        await new Promise((resolve, reject) => {
            dataArray.forEach((item, idx) => {
                const request = store.put(item);
                request.onsuccess = () => { if (++saved === total) resolve(); };
                request.onerror = () => reject(new Error(`Erro ao salvar item ${idx} em ${storeName}`));
            });
            transaction.onerror = () => reject(new Error(`Erro na transação de ${storeName}`));
        });
    }

    async verifyDataIntegrity(storeName) {
        try {
            return await this.loadData(storeName);
        } catch { return []; }
    }

    // Filtros, caches e observações (localStorage)
    saveFilters(filters)     { try { localStorage.setItem('savedFilters', JSON.stringify(filters)); } catch {} }
    loadFilters()            { try { let saved = localStorage.getItem('savedFilters'); return saved ? JSON.parse(saved) : { saldoMin: 0, cidadesSelecionadas: [], sort: 'nome-az' }; } catch { return { saldoMin: 0, cidadesSelecionadas: [], sort: 'nome-az' }; } }
    saveAddressCache(cache)  { try { localStorage.setItem('addressCache', JSON.stringify(cache)); } catch {} }
    loadAddressCache()       { try { let s = localStorage.getItem('addressCache'); return s ? JSON.parse(s) : {}; } catch { return {}; } }
    saveManualCorrections(c) { try { localStorage.setItem('manualCorrections', JSON.stringify(c)); } catch {} }
    loadManualCorrections()  { try { let s = localStorage.getItem('manualCorrections'); return s ? JSON.parse(s) : {}; } catch { return {}; } }
    saveObservation(id, obs) { try { localStorage.setItem(`observacoes_${id}`, obs); } catch {} }
    loadObservation(id)      { try { return localStorage.getItem(`observacoes_${id}`) || ''; } catch { return ''; } }

    // Limpeza geral
    async clearAllData() {
        await this.clearData('clients');
        await this.clearData('ativos');
        await this.clearData('schedules');
        localStorage.removeItem('savedFilters');
        localStorage.removeItem('addressCache');
        localStorage.removeItem('manualCorrections');
    }

    async exportAllData() {
        try {
            const clients = await this.loadData('clients');
            const ativos = await this.loadData('ativos');
            const schedules = await this.loadData('schedules');
            return {
                timestamp: new Date().toISOString(),
                clients: clients, ativos: ativos, schedules: schedules,
                filters: this.loadFilters(),
                addressCache: this.loadAddressCache(),
                manualCorrections: this.loadManualCorrections()
            };
        } catch { return null; }
    }
}
window.dbManager = new DatabaseManager();
