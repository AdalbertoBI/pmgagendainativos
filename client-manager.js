// client-manager.js - Sistema robusto de cache e persistência com tratamento de erro
class ClientManager {
    constructor() {
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.filteredData = [];
        this.schedules = {};
        this.currentItem = null;
        this.currentTab = 'inativos';
        this.initialized = false;
        this.editMode = false;
        this.geocodingNeeded = false;
        this.dataLoaded = false;
        this.newDataProcessed = false; // Flag para controlar se novos dados foram processados
        
        // Sistema de cache robusto
        this.cacheVersion = '1.1'; // Incrementado para forçar limpeza
        this.cacheKeys = {
            clients: 'clients_cache_v' + this.cacheVersion,
            ativos: 'ativos_cache_v' + this.cacheVersion,
            novos: 'novos_cache_v' + this.cacheVersion,
            schedules: 'schedules_cache_v' + this.cacheVersion,
            markers: 'markers_cache_v' + this.cacheVersion,
            observations: 'observations_cache_v' + this.cacheVersion,
            filters: 'filters_cache_v' + this.cacheVersion,
            sessionFlag: 'session_flag_v' + this.cacheVersion
        };
        
        // Controle de integridade dos dados
        this.dataIntegrity = {
            lastSaveTime: null,
            checksumClients: null,
            checksumAtivos: null,
            checksumNovos: null
        };
        
        // Sistema de retry para operações críticas
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };

        // Bind methods para preservar contexto
        this.handleStorageError = this.handleStorageError.bind(this);
        this.validateDataIntegrity = this.validateDataIntegrity.bind(this);
        this.retryOperation = this.retryOperation.bind(this);
    }

    async init() {
        try {
            console.log('🚀 Inicializando ClientManager com cache robusto...');
            
            // Verificar disponibilidade dos sistemas de storage
            await this.checkStorageSupport();
            
            if (!window.dbManager) {
                console.log('⏳ Aguardando dbManager...');
                await this.waitForDbManager();
            }

            // Tentar carregar dados com fallbacks múltiplos
            await this.loadAllDataWithFallbacks();
            
            // Verificar integridade dos dados carregados
            await this.validateDataIntegrity();
            
            // Configurar listeners para detectar problemas de storage
            this.setupStorageListeners();
            
            this.initialized = true;
            console.log('✅ ClientManager inicializado com sucesso');
            
            // Aplicar filtros de forma assíncrona para não bloquear a inicialização
            setTimeout(() => {
                this.applyFiltersAndSort();
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro crítico ao inicializar ClientManager:', error);
            await this.handleInitializationError(error);
        }
    }

    async checkStorageSupport() {
        const storageSupport = {
            indexedDB: false,
            localStorage: false,
            sessionStorage: false
        };

        try {
            // Testar IndexedDB
            if ('indexedDB' in window) {
                storageSupport.indexedDB = true;
                console.log('✅ IndexedDB disponível');
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB não disponível:', error);
        }

        try {
            // Testar localStorage
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            storageSupport.localStorage = true;
            console.log('✅ localStorage disponível');
        } catch (error) {
            console.warn('⚠️ localStorage não disponível:', error);
        }

        try {
            // Testar sessionStorage
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            storageSupport.sessionStorage = true;
            console.log('✅ sessionStorage disponível');
        } catch (error) {
            console.warn('⚠️ sessionStorage não disponível:', error);
        }

        this.storageSupport = storageSupport;

        if (!storageSupport.indexedDB && !storageSupport.localStorage) {
            throw new Error('Nenhum sistema de armazenamento disponível');
        }
    }

    async waitForDbManager() {
        return new Promise((resolve) => {
            const checkDbManager = () => {
                if (window.dbManager && window.dbManager.db) {
                    resolve();
                } else {
                    setTimeout(checkDbManager, 100);
                }
            };
            checkDbManager();
        });
    }

    async loadAllDataWithFallbacks() {
        // CORREÇÃO: Verificar se novos dados foram processados nesta sessão
        if (this.newDataProcessed) {
            console.log('✅ Usando dados processados na sessão atual (novos dados têm prioridade)');
            this.dataLoaded = true;
            return;
        }

        // Verificar se há flag de sessão indicando novos dados
        const sessionFlag = sessionStorage.getItem(this.cacheKeys.sessionFlag);
        if (sessionFlag) {
            console.log('📋 Flag de sessão detectada, carregando dados mais recentes...');
        }

        const fallbackMethods = [
            () => this.loadFromIndexedDB(),
            () => this.loadFromLocalStorage(),
            () => this.loadFromSessionStorage(),
            () => this.loadFromMemoryBackup()
        ];

        let lastError = null;
        let dataLoaded = false;

        for (const method of fallbackMethods) {
            try {
                console.log(`📖 Tentando carregar dados com método: ${method.name}`);
                await method();
                
                if (this.hasValidData()) {
                    console.log(`✅ Dados carregados com sucesso via ${method.name}`);
                    this.dataLoaded = true;
                    dataLoaded = true;
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ Falha no método ${method.name}:`, error);
                lastError = error;
                continue;
            }
        }

        if (!dataLoaded) {
            console.warn('⚠️ Todos os métodos de carregamento falharam, inicializando com dados vazios');
            this.initializeEmptyData();
            
            if (lastError) {
                throw new Error(`Falha ao carregar dados: ${lastError.message}`);
            }
        }
    }

    async loadFromIndexedDB() {
        if (!this.storageSupport.indexedDB || !window.dbManager) {
            throw new Error('IndexedDB não disponível');
        }

        const data = await Promise.all([
            window.dbManager.loadData('clients'),
            window.dbManager.loadData('ativos'),
            window.dbManager.loadData('novos'),
            window.dbManager.loadData('schedules'),
            window.dbManager.loadData('markers'),
            window.dbManager.loadData('observations')
        ]);

        this.data = Array.isArray(data[0]) ? data[0] : [];
        this.ativos = Array.isArray(data[1]) ? data[1] : [];
        this.novos = Array.isArray(data[2]) ? data[2] : [];
        this.schedules = (typeof data[3] === 'object' && data[3] !== null) ? data[3] : {};
        
        // Restaurar marcadores se disponível
        if (data[4] && window.mapManager && typeof window.mapManager.restoreMarkers === 'function') {
            await window.mapManager.restoreMarkers(data[4]);
        }

        this.updateGlobalVariables();
    }

    async loadFromLocalStorage() {
        if (!this.storageSupport.localStorage) {
            throw new Error('localStorage não disponível');
        }

        const loadFromLS = (key, defaultValue) => {
            try {
                const stored = localStorage.getItem(key);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (error) {
                console.warn(`Erro ao carregar ${key} do localStorage:`, error);
                return defaultValue;
            }
        };

        this.data = loadFromLS(this.cacheKeys.clients, []);
        this.ativos = loadFromLS(this.cacheKeys.ativos, []);
        this.novos = loadFromLS(this.cacheKeys.novos, []);
        this.schedules = loadFromLS(this.cacheKeys.schedules, {});

        // Restaurar marcadores
        const markersData = loadFromLS(this.cacheKeys.markers, null);
        if (markersData && window.mapManager && typeof window.mapManager.restoreMarkers === 'function') {
            await window.mapManager.restoreMarkers(markersData);
        }

        this.updateGlobalVariables();
    }

    async loadFromSessionStorage() {
        if (!this.storageSupport.sessionStorage) {
            throw new Error('sessionStorage não disponível');
        }

        const loadFromSS = (key, defaultValue) => {
            try {
                const stored = sessionStorage.getItem(key);
                return stored ? JSON.parse(stored) : defaultValue;
            } catch (error) {
                console.warn(`Erro ao carregar ${key} do sessionStorage:`, error);
                return defaultValue;
            }
        };

        this.data = loadFromSS(this.cacheKeys.clients, []);
        this.ativos = loadFromSS(this.cacheKeys.ativos, []);
        this.novos = loadFromSS(this.cacheKeys.novos, []);
        this.schedules = loadFromSS(this.cacheKeys.schedules, {});

        this.updateGlobalVariables();
    }

    async loadFromMemoryBackup() {
        // Último recurso: tentar recuperar de backup na memória
        if (window._clientDataBackup) {
            console.log('📦 Restaurando de backup na memória');
            const backup = window._clientDataBackup;
            
            this.data = backup.data || [];
            this.ativos = backup.ativos || [];
            this.novos = backup.novos || [];
            this.schedules = backup.schedules || {};
            
            this.updateGlobalVariables();
        } else {
            throw new Error('Nenhum backup disponível na memória');
        }
    }

    updateGlobalVariables() {
        window.data = this.data;
        window.ativos = this.ativos;
        window.novos = this.novos;
    }

    hasValidData() {
        return (Array.isArray(this.data) && Array.isArray(this.ativos) && 
                Array.isArray(this.novos) && typeof this.schedules === 'object');
    }

    initializeEmptyData() {
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.schedules = {};
        this.updateGlobalVariables();
        this.dataLoaded = false;
        this.newDataProcessed = false;
    }

    async validateDataIntegrity() {
        try {
            const currentChecksums = {
                clients: this.calculateChecksum(this.data),
                ativos: this.calculateChecksum(this.ativos),
                novos: this.calculateChecksum(this.novos)
            };

            // Se há checksums anteriores, verificar integridade
            if (this.dataIntegrity.checksumClients) {
                if (currentChecksums.clients !== this.dataIntegrity.checksumClients ||
                    currentChecksums.ativos !== this.dataIntegrity.checksumAtivos ||
                    currentChecksums.novos !== this.dataIntegrity.checksumNovos) {
                    
                    console.warn('⚠️ Possível corrupção de dados detectada');
                    await this.handleDataCorruption();
                }
            }

            // Atualizar checksums
            this.dataIntegrity = {
                lastSaveTime: Date.now(),
                checksumClients: currentChecksums.clients,
                checksumAtivos: currentChecksums.ativos,
                checksumNovos: currentChecksums.novos
            };

        } catch (error) {
            console.error('❌ Erro na validação de integridade:', error);
        }
    }

    calculateChecksum(data) {
        // Função simples de hash para detectar mudanças nos dados
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Converter para 32 bits
        }
        return hash.toString();
    }

    async handleDataCorruption() {
        console.log('🔧 Tentando recuperar dados corrompidos...');
        
        try {
            // Tentar recarregar de uma fonte alternativa
            await this.loadAllDataWithFallbacks();
        } catch (error) {
            console.error('❌ Falha na recuperação de dados:', error);
            // Como último recurso, notificar o usuário
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Dados corrompidos detectados. Por favor, recarregue a planilha.');
            }
        }
    }

    setupStorageListeners() {
        // Listener para mudanças no localStorage de outras abas
        if (this.storageSupport.localStorage) {
            window.addEventListener('storage', (e) => {
                if (Object.values(this.cacheKeys).includes(e.key)) {
                    console.log('🔄 Detectada mudança no storage de outra aba');
                    // Recarregar dados após breve delay
                    setTimeout(() => {
                        this.loadAllDataWithFallbacks().catch(console.error);
                    }, 500);
                }
            });
        }

        // Listener para erros de quota excedida
        window.addEventListener('error', (e) => {
            if (e.message && e.message.toLowerCase().includes('quota')) {
                this.handleStorageQuotaError();
            }
        });

        // Backup periódico na memória
        setInterval(() => {
            this.createMemoryBackup();
        }, 30000); // A cada 30 segundos
    }

    createMemoryBackup() {
        try {
            window._clientDataBackup = {
                data: [...this.data],
                ativos: [...this.ativos],
                novos: [...this.novos],
                schedules: {...this.schedules},
                timestamp: Date.now()
            };
        } catch (error) {
            console.warn('⚠️ Falha ao criar backup na memória:', error);
        }
    }

    async handleStorageQuotaError() {
        console.warn('⚠️ Quota de armazenamento excedida, limpando dados antigos...');
        
        try {
            // Limpar caches antigos
            await this.clearOldCacheVersions();
            
            // Comprimir dados se possível
            await this.compressStoredData();
            
        } catch (error) {
            console.error('❌ Erro ao lidar com quota de armazenamento:', error);
        }
    }

    async clearOldCacheVersions() {
        if (this.storageSupport.localStorage) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('_cache_v') && !key.includes(this.cacheVersion))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🧹 Cache antigo removido: ${key}`);
            });
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

    async clearAllPreviousData() {
        await this.retryOperation(async () => {
            console.log('🧹 Limpando TODOS os dados anteriores (cache completo)...');
            
            // Limpar dados em memória
            this.data = [];
            this.ativos = [];
            this.novos = [];
            this.schedules = {};
            this.filteredData = [];
            
            this.updateGlobalVariables();
            
            // Limpar TODAS as versões de cache (não apenas a atual)
            const clearPromises = [];
            
            // IndexedDB - limpar completamente
            if (this.storageSupport.indexedDB && window.dbManager) {
                clearPromises.push(
                    window.dbManager.clearData('clients'),
                    window.dbManager.clearData('ativos'),
                    window.dbManager.clearData('novos'),
                    window.dbManager.clearData('schedules'),
                    window.dbManager.clearData('markers'),
                    window.dbManager.clearData('observations')
                );
            }
            
            // localStorage - limpar TUDO relacionado a cache de clientes
            if (this.storageSupport.localStorage) {
                clearPromises.push(Promise.resolve().then(() => {
                    // Limpar todas as versões de cache
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (
                            key.includes('clients_cache') ||
                            key.includes('ativos_cache') ||
                            key.includes('novos_cache') ||
                            key.includes('schedules_cache') ||
                            key.includes('markers_cache') ||
                            key.includes('observations_cache') ||
                            key.includes('filters_cache') ||
                            key.includes('session_flag')
                        )) {
                            keysToRemove.push(key);
                        }
                    }
                    
                    keysToRemove.forEach(key => {
                        localStorage.removeItem(key);
                        console.log(`🧹 Cache removido: ${key}`);
                    });
                    
                    localStorage.removeItem('client-observations');
                }));
            }
            
            // sessionStorage - limpar completamente
            if (this.storageSupport.sessionStorage) {
                clearPromises.push(Promise.resolve().then(() => {
                    sessionStorage.clear();
                }));
            }
            
            await Promise.allSettled(clearPromises);
            
            // Limpar cache do mapa
            if (window.mapManager) {
                if (typeof window.mapManager.clearGeocodingCache === 'function') {
                    window.mapManager.clearGeocodingCache();
                }
                if (typeof window.mapManager.clearAllMarkers === 'function') {
                    window.mapManager.clearAllMarkers();
                }
            }
            
            // Limpar backup da memória
            delete window._clientDataBackup;
            
            this.geocodingNeeded = true;
            this.dataLoaded = false;
            this.newDataProcessed = false;
            
            // Resetar integridade
            this.dataIntegrity = {
                lastSaveTime: null,
                checksumClients: null,
                checksumAtivos: null,
                checksumNovos: null
            };
            
            console.log('✅ TODOS os dados e cache foram completamente limpos');
            
        }, 'Limpeza completa de dados');
    }

    async saveAllDataRobust() {
        await this.retryOperation(async () => {
            console.log('💾 Salvando todos os dados com método robusto...');
            
            const savePromises = [];
            const currentTime = Date.now();
            
            // Preparar dados para salvar
            const dataToSave = {
                clients: this.data,
                ativos: this.ativos,
                novos: this.novos,
                schedules: this.schedules,
                timestamp: currentTime
            };
            
            // Salvar no IndexedDB (prioridade)
            if (this.storageSupport.indexedDB && window.dbManager) {
                savePromises.push(
                    window.dbManager.saveData('clients', this.data),
                    window.dbManager.saveData('ativos', this.ativos),
                    window.dbManager.saveData('novos', this.novos),
                    window.dbManager.saveData('schedules', this.schedules)
                );
                
                // Salvar dados dos marcadores se disponível
                if (window.mapManager && typeof window.mapManager.getMarkersData === 'function') {
                    const markersData = window.mapManager.getMarkersData();
                    savePromises.push(window.dbManager.saveData('markers', markersData));
                }
            }
            
            // Salvar no localStorage (backup)
            if (this.storageSupport.localStorage) {
                savePromises.push(Promise.resolve().then(async () => {
                    try {
                        localStorage.setItem(this.cacheKeys.clients, JSON.stringify(this.data));
                        localStorage.setItem(this.cacheKeys.ativos, JSON.stringify(this.ativos));
                        localStorage.setItem(this.cacheKeys.novos, JSON.stringify(this.novos));
                        localStorage.setItem(this.cacheKeys.schedules, JSON.stringify(this.schedules));
                        
                        if (window.mapManager && typeof window.mapManager.getMarkersData === 'function') {
                            const markersData = window.mapManager.getMarkersData();
                            localStorage.setItem(this.cacheKeys.markers, JSON.stringify(markersData));
                        }
                        
                        // Marcar que novos dados foram salvos nesta sessão
                        sessionStorage.setItem(this.cacheKeys.sessionFlag, currentTime.toString());
                        
                    } catch (error) {
                        if (error.name === 'QuotaExceededError') {
                            await this.handleStorageQuotaError();
                            throw error;
                        }
                        throw error;
                    }
                }));
            }
            
            // Salvar no sessionStorage (backup secundário)
            if (this.storageSupport.sessionStorage) {
                savePromises.push(Promise.resolve().then(() => {
                    try {
                        sessionStorage.setItem(this.cacheKeys.clients, JSON.stringify(this.data));
                        sessionStorage.setItem(this.cacheKeys.ativos, JSON.stringify(this.ativos));
                        sessionStorage.setItem(this.cacheKeys.novos, JSON.stringify(this.novos));
                        sessionStorage.setItem(this.cacheKeys.schedules, JSON.stringify(this.schedules));
                    } catch (error) {
                        console.warn('⚠️ Falha ao salvar no sessionStorage:', error);
                    }
                }));
            }
            
            const results = await Promise.allSettled(savePromises);
            
            // Verificar se pelo menos uma operação foi bem-sucedida
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            
            if (successCount === 0) {
                throw new Error('Falha em todos os métodos de salvamento');
            }
            
            // Atualizar informações de integridade
            await this.validateDataIntegrity();
            
            this.dataLoaded = true;
            
            console.log(`✅ Dados salvos com sucesso (${successCount}/${savePromises.length} métodos)`);
            
        }, 'Salvamento de dados');
    }

    async processNewData(newData) {
        await this.retryOperation(async () => {
            console.log('📊 Processando novos dados com limpeza completa...');
            
            // Primeiro, limpar COMPLETAMENTE todos os dados anteriores
            await this.clearAllPreviousData();
            
            // Aguardar um momento para garantir que a limpeza foi efetiva
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Validar e processar novos dados
            if (newData.clients && Array.isArray(newData.clients)) {
                this.data = [...newData.clients]; // Criar cópia para evitar referências
            }
            
            if (newData.ativos && Array.isArray(newData.ativos)) {
                this.ativos = [...newData.ativos];
            }
            
            if (newData.novos && Array.isArray(newData.novos)) {
                this.novos = [...newData.novos];
            }
            
            if (newData.schedules && typeof newData.schedules === 'object') {
                this.schedules = {...newData.schedules};
            }
            
            this.updateGlobalVariables();
            
            // Marcar que novos dados foram processados
            this.newDataProcessed = true;
            
            // Salvar novos dados
            await this.saveAllDataRobust();
            
            // Marcar que geocodificação é necessária
            this.markGeocodingNeeded();
            
            // Criar backup imediato na memória
            this.createMemoryBackup();
            
            // Aplicar filtros de forma assíncrona
            setTimeout(() => {
                this.applyFiltersAndSort();
            }, 100);
            
            console.log(`✅ Novos dados processados: 🔴 Inativos: ${this.data.length} 🟢 Ativos: ${this.ativos.length} 🆕 Novos: ${this.novos.length}`);
            
        }, 'Processamento de novos dados');
    }

    markGeocodingNeeded() {
        this.geocodingNeeded = true;
        if (window.mapManager) {
            if (typeof window.mapManager.clearGeocodingCache === 'function') {
                window.mapManager.clearGeocodingCache();
            }
            if (typeof window.mapManager.clearAllMarkers === 'function') {
                window.mapManager.clearAllMarkers();
            }
            console.log('🧹 Cache de geocodificação e marcadores limpos devido à nova planilha');
        }
    }

    async handleStorageError(error, operation) {
        console.error(`❌ Erro de armazenamento em ${operation}:`, error);
        
        if (error.name === 'QuotaExceededError') {
            await this.handleStorageQuotaError();
        } else if (error.name === 'DataError' || error.message.includes('corrupted')) {
            await this.handleDataCorruption();
        }
        
        if (typeof window.showErrorMessage === 'function') {
            window.showErrorMessage(`Erro no sistema de cache: ${error.message}`);
        }
    }

    async handleInitializationError(error) {
        console.error('❌ Erro de inicialização crítico:', error);
        
        // Tentar recuperação de emergência
        try {
            console.log('🚨 Tentando recuperação de emergência...');
            this.initializeEmptyData();
            
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Sistema iniciado em modo de recuperação. Alguns dados podem não estar disponíveis.');
            }
        } catch (recoveryError) {
            console.error('❌ Falha na recuperação de emergência:', recoveryError);
            throw new Error(`Falha crítica na inicialização: ${error.message}`);
        }
    }

    applyFiltersAndSort() {
        try {
            if (!Array.isArray(this.data)) {
                this.data = [];
            }

            const sortOption = document.getElementById('sortOption')?.value || 'nome-az';
            const cidadesSelecionadas = Array.from(document.querySelectorAll('#cidadeList input:checked'))
                .map(input => input.value);

            let filtered = [...this.data];

            if (cidadesSelecionadas.length > 0) {
                filtered = filtered.filter(item => 
                    cidadesSelecionadas.includes(this.extrairCidadeDoItem(item))
                );
            }

            this.sortData(filtered, sortOption);
            this.filteredData = filtered;
            this.renderList(filtered);
            this.saveCurrentFilters();

            console.log(`🔍 Filtros aplicados: ${filtered.length}/${this.data.length} itens`);

        } catch (error) {
            console.error('❌ Erro ao aplicar filtros:', error);
            this.filteredData = [...this.data];
            this.renderList(this.filteredData);
        }
    }

    sortData(data, sortOption) {
        data.sort((a, b) => {
            switch (sortOption) {
                case 'nome-az':
                    return (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || '', 'pt-BR', {sensitivity: 'base'});
                case 'nome-za':
                    return (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || '', 'pt-BR', {sensitivity: 'base'});
                case 'cidade-az':
                    return this.extrairCidadeDoItem(a).localeCompare(this.extrairCidadeDoItem(b), 'pt-BR', {sensitivity: 'base'});
                case 'cidade-za':
                    return this.extrairCidadeDoItem(b).localeCompare(this.extrairCidadeDoItem(a), 'pt-BR', {sensitivity: 'base'});
                default:
                    return 0;
            }
        });
    }

    extrairCidadeDoItem(item) {
        if (item['Cidade']) {
            return item['Cidade'];
        }
        return this.extrairCidadeDoEndereco(item['Endereço'] || '');
    }

    saveCurrentFilters() {
        try {
            const filters = {
                sort: document.getElementById('sortOption')?.value || 'nome-az',
                cidadesSelecionadas: Array.from(document.querySelectorAll('#cidadeList input:checked'))
                    .map(input => input.value)
            };

            if (this.storageSupport.localStorage) {
                localStorage.setItem(this.cacheKeys.filters, JSON.stringify(filters));
            }

            if (window.dbManager && typeof window.dbManager.saveFilters === 'function') {
                window.dbManager.saveFilters(filters);
            }
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
        }
    }

    renderList(data) {
        const list = document.getElementById('client-list');
        if (!list) return;

        list.innerHTML = '';

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state">Nenhum cliente encontrado com os filtros aplicados.</div>';
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'inativo');
            
            const cidade = this.extrairCidadeDoItem(item);
            
            div.innerHTML = `
                <h4>${item['Nome Fantasia'] || item['Cliente'] || 'N/A'}</h4>
                <p><strong>Contato:</strong> ${item['Contato'] || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${item['Celular'] || 'N/A'}</p>
                <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
                <p><strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}</p>
            `;

            div.onclick = () => this.showClientModal(item);
            list.appendChild(div);
        });
    }

    showClientModal(cliente) {
        this.currentItem = cliente;
        const modal = document.getElementById('modal');
        
        if (!modal) {
            console.error('Modal não encontrado');
            return;
        }

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (!modalTitle || !modalBody) {
            console.error('Elementos do modal não encontrados');
            return;
        }

        modalTitle.textContent = cliente['Nome Fantasia'] || cliente['Cliente'] || 'Cliente';
        
        const cidade = this.extrairCidadeDoItem(cliente);
        const endereco = this.formatarEndereco(cliente['Endereço'] || '');
        
        modalBody.innerHTML = `
            <div class="client-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Nome Fantasia:</label>
                        <div class="detail-value">${cliente['Nome Fantasia'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Contato:</label>
                        <div class="detail-value">${cliente['Contato'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Telefone:</label>
                        <div class="detail-value">${cliente['Celular'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>CNPJ/CPF:</label>
                        <div class="detail-value">${cliente['CNPJ / CPF'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Cidade:</label>
                        <div class="detail-value">${cidade || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Segmento:</label>
                        <div class="detail-value">${cliente['Segmento'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item full-width">
                        <label>Endereço:</label>
                        <div class="detail-value">${endereco || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>🗓️ Agendamento</h3>
                <div class="agenda-form">
                    <div>
                        <label>Data:</label>
                        <input type="date" id="agendaData" class="agenda-select">
                    </div>
                    <div>
                        <label>Hora:</label>
                        <select id="agendaHora" class="agenda-select">
                            <option value="">Selecione</option>
                            <option value="08:00">08:00</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                        </select>
                    </div>
                    <button class="btn btn-success" onclick="window.clientManager.salvarAgendamento()">
                        📅 Agendar
                    </button>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📝 Observações</h3>
                <div class="observacoes-container">
                    <textarea 
                        id="observacoes" 
                        class="observacoes-textarea" 
                        placeholder="Digite suas observações sobre este cliente..."
                        oninput="updateCharCounter()"
                        maxlength="2000"
                    >${this.loadObservacao(cliente.id) || ''}</textarea>
                    <div class="observacoes-footer">
                        <button class="btn btn-primary" onclick="window.clientManager.salvarObservacao()">
                            💾 Salvar Observação
                        </button>
                        <div id="observacoes-contador" class="char-counter">0/2000</div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof updateCharCounter === 'function') {
                updateCharCounter();
            }
        }, 100);

        modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentItem = null;
    }

    async salvarAgendamento() {
        if (!this.currentItem) return;

        const data = document.getElementById('agendaData')?.value;
        const hora = document.getElementById('agendaHora')?.value;

        if (!data || !hora) {
            alert('Por favor, selecione data e hora');
            return;
        }

        await this.retryOperation(async () => {
            const agendamento = {
                clientId: this.currentItem.id,
                cliente: this.currentItem['Nome Fantasia'] || this.currentItem['Cliente'],
                data: data,
                hora: hora,
                createdAt: new Date().toISOString()
            };

            const scheduleId = `${this.currentItem.id}_${Date.now()}`;
            this.schedules[scheduleId] = agendamento;

            await this.saveAllDataRobust();

            if (typeof window.showSuccessMessage === 'function') {
                window.showSuccessMessage('Agendamento salvo com sucesso!');
            }

            this.closeModal();

            if (typeof window.renderAllTabs === 'function') {
                window.renderAllTabs();
            }

        }, 'Salvamento de agendamento');
    }

    async salvarObservacao() {
        if (!this.currentItem) return;

        const observacao = document.getElementById('observacoes')?.value || '';
        
        try {
            await this.retryOperation(async () => {
                if (window.dbManager && typeof window.dbManager.saveObservation === 'function') {
                    window.dbManager.saveObservation(this.currentItem.id, observacao);
                }
                
                // Backup no localStorage também
                if (this.storageSupport.localStorage) {
                    const observations = JSON.parse(localStorage.getItem(this.cacheKeys.observations) || '{}');
                    observations[this.currentItem.id] = observacao;
                    localStorage.setItem(this.cacheKeys.observations, JSON.stringify(observations));
                }
                
                if (typeof window.showSuccessMessage === 'function') {
                    window.showSuccessMessage('Observação salva com sucesso!');
                }
            }, 'Salvamento de observação');
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
            alert('Erro ao salvar observação');
        }
    }

    loadObservacao(clientId) {
        try {
            // Tentar carregar do dbManager primeiro
            if (window.dbManager && typeof window.dbManager.loadObservation === 'function') {
                const observation = window.dbManager.loadObservation(clientId);
                if (observation) return observation;
            }
            
            // Fallback para localStorage
            if (this.storageSupport.localStorage) {
                const observations = JSON.parse(localStorage.getItem(this.cacheKeys.observations) || '{}');
                return observations[clientId] || '';
            }
            
            return '';
        } catch (error) {
            console.error('❌ Erro ao carregar observação:', error);
            return '';
        }
    }

    extrairCidadeDoEndereco(endereco) {
        if (!endereco) return '';
        
        const linhas = endereco.split('\n').map(linha => linha.trim()).filter(linha => linha);
        
        if (linhas.length >= 3) {
            return linhas[2];
        }
        
        const cidadeMatch = endereco.match(/([A-ZÁÊÔÇÃÉÍ\s]+)(?:\s*-\s*[A-Z]{2})?/);
        return cidadeMatch ? cidadeMatch[1].trim() : '';
    }

    formatarEndereco(endereco) {
        if (!endereco) return '';
        return endereco.replace(/\r?\n/g, ', ').replace(/,\s*,/g, ',').trim();
    }

    hasData() {
        return this.dataLoaded && (this.data.length > 0 || this.ativos.length > 0 || this.novos.length > 0);
    }

    getDataStats() {
        return {
            inativos: this.data.length,
            ativos: this.ativos.length,
            novos: this.novos.length,
            agendamentos: Object.keys(this.schedules).length,
            total: this.data.length + this.ativos.length + this.novos.length,
            cacheHealth: this.storageSupport,
            lastSave: this.dataIntegrity.lastSaveTime,
            newDataProcessed: this.newDataProcessed
        };
    }

    // Método para diagnóstico do sistema
    async diagnoseSystem() {
        console.log('🔍 Executando diagnóstico do sistema...');
        
        const diagnosis = {
            storage: this.storageSupport,
            dataLoaded: this.dataLoaded,
            newDataProcessed: this.newDataProcessed,
            dataStats: this.getDataStats(),
            integrity: this.dataIntegrity,
            hasMapManager: !!window.mapManager,
            hasDbManager: !!window.dbManager,
            cacheVersion: this.cacheVersion
        };
        
        console.table(diagnosis);
        return diagnosis;
    }
}

// Inicializar instância global
if (typeof window !== 'undefined') {
    window.clientManager = new ClientManager();
}

console.log('✅ client-manager.js carregado com sistema robusto de cache v1.1');
