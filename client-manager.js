// client-manager.js - Sistema robusto TOTALMENTE corrigido

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
        this.newDataProcessed = false;
        
        // Sistema de cache robusto
        this.cacheVersion = '2.1';
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
        
        // Controle de integridade
        this.dataIntegrity = {
            lastSaveTime: null,
            checksumClients: null,
            checksumAtivos: null,
            checksumNovos: null
        };
        
        // Sistema de retry
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000
        };
        
        // Bind methods
        this.handleStorageError = this.handleStorageError.bind(this);
        this.validateDataIntegrity = this.validateDataIntegrity.bind(this);
        this.retryOperation = this.retryOperation.bind(this);
    }

    async init() {
        try {
            console.log('🚀 Inicializando ClientManager...');
            
            // Verificar storage
            await this.checkStorageSupport();
            
            // Aguardar dbManager
            if (!window.dbManager) {
                await this.waitForDbManager();
            }
            
            // Carregar dados
            await this.loadAllDataWithFallbacks();
            
            // Validar integridade
            await this.validateDataIntegrity();
            
            // Setup listeners
            this.setupStorageListeners();
            
            this.initialized = true;
            console.log('✅ ClientManager inicializado');
            
            // Aplicar filtros
            setTimeout(() => {
                this.applyFiltersAndSort();
            }, 100);
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ClientManager:', error);
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
            if ('indexedDB' in window) {
                storageSupport.indexedDB = true;
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB não disponível:', error);
        }

        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            storageSupport.localStorage = true;
        } catch (error) {
            console.warn('⚠️ localStorage não disponível:', error);
        }

        try {
            sessionStorage.setItem('test', 'test');
            sessionStorage.removeItem('test');
            storageSupport.sessionStorage = true;
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
        // Se novos dados processados nesta sessão
        if (this.newDataProcessed) {
            console.log('✅ Usando dados processados na sessão atual');
            this.dataLoaded = true;
            return;
        }

        const sessionFlag = sessionStorage.getItem(this.cacheKeys.sessionFlag);
        if (sessionFlag) {
            console.log('📋 Flag de sessão detectada');
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
                console.log(`📖 Tentando: ${method.name}`);
                await method();
                if (this.hasValidData()) {
                    console.log(`✅ Dados carregados via ${method.name}`);
                    this.dataLoaded = true;
                    dataLoaded = true;
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ Falha em ${method.name}:`, error);
                lastError = error;
                continue;
            }
        }

        if (!dataLoaded) {
            console.warn('⚠️ Todos os métodos falharam, dados vazios');
            this.initializeEmptyData();
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
            window.dbManager.loadData('schedules')
        ]);

        this.data = Array.isArray(data[0]) ? data[0] : [];
        this.ativos = Array.isArray(data[1]) ? data[1] : [];
        this.novos = Array.isArray(data[2]) ? data[2] : [];
        this.schedules = (typeof data[3] === 'object' && data[3] !== null) ? data[3] : {};

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
                console.warn(`Erro ao carregar ${key}:`, error);
                return defaultValue;
            }
        };

        this.data = loadFromLS(this.cacheKeys.clients, []);
        this.ativos = loadFromLS(this.cacheKeys.ativos, []);
        this.novos = loadFromLS(this.cacheKeys.novos, []);
        this.schedules = loadFromLS(this.cacheKeys.schedules, {});

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
                console.warn(`Erro ao carregar ${key}:`, error);
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
        return (Array.isArray(this.data) && 
                Array.isArray(this.ativos) && 
                Array.isArray(this.novos) && 
                typeof this.schedules === 'object');
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

            if (this.dataIntegrity.checksumClients) {
                if (currentChecksums.clients !== this.dataIntegrity.checksumClients ||
                    currentChecksums.ativos !== this.dataIntegrity.checksumAtivos ||
                    currentChecksums.novos !== this.dataIntegrity.checksumNovos) {
                    console.warn('⚠️ Possível corrupção detectada');
                    await this.handleDataCorruption();
                }
            }

            this.dataIntegrity = {
                lastSaveTime: Date.now(),
                checksumClients: currentChecksums.clients,
                checksumAtivos: currentChecksums.ativos,
                checksumNovos: currentChecksums.novos
            };
        } catch (error) {
            console.error('❌ Erro na validação:', error);
        }
    }

    calculateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    async handleDataCorruption() {
        console.log('🔧 Recuperando dados corrompidos...');
        try {
            await this.loadAllDataWithFallbacks();
        } catch (error) {
            console.error('❌ Falha na recuperação:', error);
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Dados corrompidos. Recarregue a planilha.');
            }
        }
    }

    setupStorageListeners() {
        if (this.storageSupport.localStorage) {
            window.addEventListener('storage', (e) => {
                if (Object.values(this.cacheKeys).includes(e.key)) {
                    console.log('🔄 Mudança detectada em outra aba');
                    setTimeout(() => {
                        this.loadAllDataWithFallbacks().catch(console.error);
                    }, 500);
                }
            });
        }

        window.addEventListener('error', (e) => {
            if (e.message && e.message.toLowerCase().includes('quota')) {
                this.handleStorageQuotaError();
            }
        });

        // Backup periódico
        setInterval(() => {
            this.createMemoryBackup();
        }, 30000);
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
            console.warn('⚠️ Falha ao criar backup:', error);
        }
    }

    async handleStorageQuotaError() {
        console.warn('⚠️ Quota excedida, limpando...');
        try {
            await this.clearOldCacheVersions();
            await this.compressStoredData();
        } catch (error) {
            console.error('❌ Erro ao lidar com quota:', error);
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
                    console.log(`✅ ${context} sucesso na tentativa ${attempt}`);
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
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw new Error(`${context} falhou após ${this.retryConfig.maxRetries} tentativas: ${lastError.message}`);
    }

    async clearAllPreviousData() {
        await this.retryOperation(async () => {
            console.log('🧹 Limpando TODOS os dados anteriores...');
            
            this.data = [];
            this.ativos = [];
            this.novos = [];
            this.schedules = {};
            this.filteredData = [];
            this.updateGlobalVariables();

            const clearPromises = [];

            // IndexedDB
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

            // localStorage
            if (this.storageSupport.localStorage) {
                clearPromises.push(Promise.resolve().then(() => {
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

            // sessionStorage
            if (this.storageSupport.sessionStorage) {
                clearPromises.push(Promise.resolve().then(() => {
                    sessionStorage.clear();
                }));
            }

            await Promise.allSettled(clearPromises);

            // Limpar mapa
            if (window.mapManager) {
                if (typeof window.mapManager.clearGeocodingCache === 'function') {
                    window.mapManager.clearGeocodingCache();
                }
                if (typeof window.mapManager.clearAllMarkers === 'function') {
                    window.mapManager.clearAllMarkers();
                }
            }

            delete window._clientDataBackup;

            this.geocodingNeeded = true;
            this.dataLoaded = false;
            this.newDataProcessed = false;
            this.dataIntegrity = {
                lastSaveTime: null,
                checksumClients: null,
                checksumAtivos: null,
                checksumNovos: null
            };

            console.log('✅ TODOS os dados foram limpos');
        }, 'Limpeza completa de dados');
    }

    async saveAllDataRobust() {
        await this.retryOperation(async () => {
            console.log('💾 Salvando todos os dados...');
            
            const savePromises = [];
            const currentTime = Date.now();

            // IndexedDB (prioridade)
            if (this.storageSupport.indexedDB && window.dbManager) {
                savePromises.push(
                    window.dbManager.saveData('clients', this.data),
                    window.dbManager.saveData('ativos', this.ativos),
                    window.dbManager.saveData('novos', this.novos),
                    window.dbManager.saveData('schedules', this.schedules)
                );
            }

            // localStorage (backup)
            if (this.storageSupport.localStorage) {
                savePromises.push(Promise.resolve().then(async () => {
                    try {
                        localStorage.setItem(this.cacheKeys.clients, JSON.stringify(this.data));
                        localStorage.setItem(this.cacheKeys.ativos, JSON.stringify(this.ativos));
                        localStorage.setItem(this.cacheKeys.novos, JSON.stringify(this.novos));
                        localStorage.setItem(this.cacheKeys.schedules, JSON.stringify(this.schedules));
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

            const results = await Promise.allSettled(savePromises);
            const successCount = results.filter(r => r.status === 'fulfilled').length;

            if (successCount === 0) {
                throw new Error('Falha em todos os métodos de salvamento');
            }

            await this.validateDataIntegrity();
            this.dataLoaded = true;
            console.log(`✅ Dados salvos (${successCount}/${savePromises.length} métodos)`);
        }, 'Salvamento de dados');
    }

    async processNewData(newData) {
        await this.retryOperation(async () => {
            console.log('📊 Processando novos dados...');
            
            // Limpar dados anteriores
            await this.clearAllPreviousData();
            await new Promise(resolve => setTimeout(resolve, 500));

            // Processar novos dados
            if (newData.clients && Array.isArray(newData.clients)) {
                this.data = [...newData.clients];
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
            this.newDataProcessed = true;

            // Salvar dados
            await this.saveAllDataRobust();

            // Marcar para geocodificação
            this.markGeocodingNeeded();
            this.createMemoryBackup();

            // Aplicar filtros
            setTimeout(() => {
                this.applyFiltersAndSort();
            }, 100);

            console.log(`✅ Novos dados processados: 🔴 ${this.data.length} 🟢 ${this.ativos.length} 🆕 ${this.novos.length}`);
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
            console.log('🧹 Cache de geocodificação limpo');
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
            window.showErrorMessage(`Erro no cache: ${error.message}`);
        }
    }

    async handleInitializationError(error) {
        console.error('❌ Erro de inicialização:', error);
        try {
            console.log('🚨 Recuperação de emergência...');
            this.initializeEmptyData();
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Sistema em modo de recuperação. Alguns dados podem não estar disponíveis.');
            }
        } catch (recoveryError) {
            console.error('❌ Falha na recuperação:', recoveryError);
            throw new Error(`Falha crítica: ${error.message}`);
        }
    }

    applyFiltersAndSort() {
        try {
            if (!Array.isArray(this.data)) {
                this.data = [];
            }

            const sortOption = document.getElementById('sortOption')?.value || 'nome-az';
            
            // Obter cidades selecionadas
            const cidadesSelecionadas = this.getSelectedCities();

            let filtered = [...this.data];

            // Aplicar filtro de cidade
            if (cidadesSelecionadas.length > 0 && !cidadesSelecionadas.includes('todas')) {
                filtered = filtered.filter(item => {
                    const cidadeItem = this.extrairCidadeDoItem(item);
                    return cidadesSelecionadas.includes(cidadeItem);
                });
            }

            // Aplicar ordenação
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

    getSelectedCities() {
        const cidadeList = document.getElementById('cidade-list');
        if (!cidadeList) return [];

        const checkboxes = cidadeList.querySelectorAll('input[type="checkbox"]:checked');
        const selected = Array.from(checkboxes).map(cb => cb.value).filter(value => value !== 'todas');

        // Se "todas" está marcado ou nenhuma específica
        const todasChecked = cidadeList.querySelector('input[value="todas"]')?.checked;
        if (todasChecked || selected.length === 0) {
            return [];
        }

        return selected;
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

 // client-manager.js - SEÇÃO CORRIGIDA para processamento adequado da planilha

// Substituir APENAS estas funções no client-manager.js existente:

// Função extrairCidadeDoItem CORRIGIDA
extrairCidadeDoItem(item) {
    // Primeiro, verificar se existe campo Cidade direto
    if (item['Cidade'] && item['Cidade'] !== 'N/A') {
        return item['Cidade'];
    }
    
    // Senão, extrair do endereço
    const endereco = item['Endereço'] || '';
    return this.extrairCidadeDoEndereco(endereco);
}

// Função extrairCidadeDoEndereco MELHORADA
extrairCidadeDoEndereco(endereco) {
    if (!endereco || endereco === 'N/A') return 'N/A';
    
    const linhas = endereco.split('\n')
        .map(linha => linha.trim())
        .filter(linha => linha && linha !== '');
    
    // Procurar especificamente por "São José dos Campos" primeiro
    for (const linha of linhas) {
        if (linha.toLowerCase().includes('são josé dos campos') || 
            linha.toLowerCase().includes('sao jose dos campos')) {
            return 'São José dos Campos';
        }
    }
    
    // Procurar por linha que pareça ser cidade (não é número, rua, CEP, etc.)
    for (const linha of linhas) {
        // Ignorar CEPs
        if (linha.match(/^\d{5}-?\d{3}$/)) continue;
        
        // Ignorar números puros
        if (linha.match(/^\d+$/)) continue;
        
        // Ignorar linhas que começam com tipos de logradouro
        if (linha.match(/^(RUA|AVENIDA|AV|R|ALAMEDA|ESTRADA|ROD|RODOVIA)/i)) continue;
        
        // Ignorar estado
        if (linha.toUpperCase() === 'SP') continue;
        
        // Ignorar complementos típicos
        if (linha.match(/^(LOJA|SALA|APTO|APARTAMENTO|BLOCO|CONJUNTO)/i)) continue;
        
        // Se chegou até aqui e tem mais que 2 caracteres, provavelmente é cidade
        if (linha.length > 2) {
            return linha;
        }
    }
    
    return 'São José dos Campos'; // Default para a cidade base
}

// Função applyFiltersAndSort CORRIGIDA
applyFiltersAndSort() {
    try {
        if (!Array.isArray(this.data)) {
            this.data = [];
        }

        const sortOption = document.getElementById('sortOption')?.value || 'nome-az';
        
        // Obter cidades selecionadas do filtro
        const cidadesSelecionadas = this.getSelectedCities();

        let filtered = [...this.data];

        // Aplicar filtro de cidade se alguma específica foi selecionada
        if (cidadesSelecionadas.length > 0 && !cidadesSelecionadas.includes('todas')) {
            filtered = filtered.filter(item => {
                const cidadeItem = this.extrairCidadeDoItem(item);
                return cidadesSelecionadas.includes(cidadeItem);
            });
        }

        // Aplicar ordenação
        this.sortData(filtered, sortOption);

        this.filteredData = filtered;
        this.renderList(filtered);
        this.saveCurrentFilters();

        console.log(`🔍 Filtros aplicados: ${filtered.length}/${this.data.length} itens exibidos`);
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros:', error);
        this.filteredData = [...this.data];
        this.renderList(this.filteredData);
    }
}

// Função getSelectedCities CORRIGIDA
getSelectedCities() {
    const cidadeList = document.getElementById('cidade-list');
    if (!cidadeList) return [];

    const checkboxes = cidadeList.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value).filter(value => value !== 'todas');

    // Se "todas" está marcado ou nenhuma específica foi selecionada
    const todasChecked = cidadeList.querySelector('input[value="todas"]')?.checked;
    if (todasChecked && selected.length === 0) {
        return []; // Retorna array vazio para mostrar todas
    }

    return selected;
}


    formatarEndereco(endereco) {
        if (!endereco) return 'N/A';
        return endereco.split('\n')
            .map(linha => linha.trim())
            .filter(linha => linha)
            .join(', ');
    }

    saveCurrentFilters() {
        try {
            const filters = {
                sort: document.getElementById('sortOption')?.value || 'nome-az',
                cidadesSelecionadas: this.getSelectedCities()
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
            list.innerHTML = '<div class="empty-state">Nenhum cliente encontrado com os filtros selecionados.</div>';
            return;
        }

        data.forEach(item => {
            const cidade = this.extrairCidadeDoItem(item);
            
            const div = document.createElement('div');
            div.className = 'client-item';
            div.innerHTML = `
                <h4>${item['Nome Fantasia'] || item['Cliente'] || 'N/A'}</h4>
                <p><strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}</p>
                <p><strong>Contato:</strong> ${item['Contato'] || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${item['Celular'] || 'N/A'}</p>
                <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
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
        const telefone = cliente['Celular'] || 'N/A';
        const telefoneClean = telefone.replace(/\D/g, '');

        modalBody.innerHTML = `
            <div class="client-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Nome Fantasia:</label>
                        <div class="detail-value">${cliente['Nome Fantasia'] || cliente['Cliente'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Contato:</label>
                        <div class="detail-value">${cliente['Contato'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Telefone:</label>
                        <div class="detail-value">
                            ${telefone !== 'N/A' ? 
                                `<a href="tel:${telefoneClean}" style="color: #007bff; text-decoration: none;">${telefone}</a>` : 
                                'N/A'
                            }
                        </div>
                    </div>
                    <div class="detail-item">
                        <label>CNPJ/CPF:</label>
                        <div class="detail-value">${cliente['CNPJ / CPF'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Cidade:</label>
                        <div class="detail-value">${cidade}</div>
                    </div>
                    <div class="detail-item">
                        <label>Segmento:</label>
                        <div class="detail-value">${cliente['Segmento'] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <div class="detail-value">${cliente['Status'] || 'Inativo'}</div>
                    </div>
                    <div class="detail-item full-width">
                        <label>Endereço:</label>
                        <div class="detail-value">${endereco}</div>
                    </div>
                </div>
            </div>

            <div class="modal-section">
                <h3>🗺️ Localização</h3>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="window.clientManager.openInMaps('${endereco}')">
                        <span>📍</span> Abrir no Maps
                    </button>
                    <button class="btn btn-secondary" onclick="window.clientManager.showOnInternalMap('${cliente.id || 'temp'}')">
                        <span>🗺️</span> Ver no Mapa Interno
                    </button>
                </div>
            </div>

            <div class="modal-section">
                <h3>📞 Contato</h3>
                <div class="action-buttons">
                    ${telefone !== 'N/A' ? 
                        `<a href="tel:${telefoneClean}" class="btn btn-success">
                            <span>📞</span> Ligar
                        </a>
                        <a href="https://wa.me/${telefoneClean.replace(/^\+?55/, '')}" target="_blank" class="btn btn-success">
                            <span>💬</span> WhatsApp  
                        </a>` : 
                        '<span class="text-muted">Telefone não disponível</span>'
                    }
                </div>
            </div>

            <div class="modal-section">
                <h3>📅 Agendamento</h3>
                <div class="agenda-form">
                    <div>
                        <label>Data:</label>
                        <input type="date" id="agenda-date" class="agenda-select">
                    </div>
                    <div>
                        <label>Hora:</label>
                        <select id="agenda-time" class="agenda-select">
                            <option value="">Selecionar hora</option>
                            <option value="08:00">08:00</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="13:00">13:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="window.clientManager.scheduleVisit()">
                        <span>📅</span> Agendar
                    </button>
                </div>
            </div>

            <div class="modal-section">
                <h3>📝 Observações</h3>
                <div class="observacoes-container">
                    <textarea 
                        id="observacoes-text" 
                        class="observacoes-textarea" 
                        placeholder="Digite observações sobre este cliente..."
                        maxlength="500"
                    >${this.getClientObservation(cliente.id || cliente['ID Cliente'] || '')}</textarea>
                    <div class="observacoes-footer">
                        <span class="char-counter">
                            <span id="char-count">0</span>/500 caracteres
                        </span>
                        <button class="btn btn-secondary" onclick="window.clientManager.saveClientObservation()">
                            <span>💾</span> Salvar Observação
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Configurar contador de caracteres
        const textarea = document.getElementById('observacoes-text');
        const charCount = document.getElementById('char-count');
        if (textarea && charCount) {
            charCount.textContent = textarea.value.length;
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
        }

        // Mostrar modal
        modal.style.display = 'block';
    }

    openInMaps(endereco) {
        if (endereco && endereco !== 'N/A') {
            const url = `https://maps.google.com/maps?q=${encodeURIComponent(endereco)}`;
            window.open(url, '_blank');
        }
    }

    showOnInternalMap(clientId) {
        if (typeof window.switchToTab === 'function') {
            window.switchToTab('mapa');
        }
        
        // Fechar modal
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Atualizar mapa após delay
        setTimeout(() => {
            if (window.mapManager && typeof window.mapManager.updateAllMarkers === 'function') {
                window.mapManager.updateAllMarkers();
            }
        }, 500);
    }

    scheduleVisit() {
        const dateInput = document.getElementById('agenda-date');
        const timeInput = document.getElementById('agenda-time');
        
        if (!dateInput || !timeInput || !this.currentItem) {
            console.error('Elementos não encontrados para agendamento');
            return;
        }

        const date = dateInput.value;
        const time = timeInput.value;

        if (!date || !time) {
            alert('Por favor, selecione data e hora para o agendamento.');
            return;
        }

        const clientId = this.currentItem.id || this.currentItem['ID Cliente'] || `temp_${Date.now()}`;
        
        this.schedules[clientId] = {
            date: date,
            time: time,
            createdAt: new Date().toISOString()
        };

        // Salvar agendamentos
        this.saveAllDataRobust().then(() => {
            if (typeof window.showSuccessMessage === 'function') {
                window.showSuccessMessage('Agendamento salvo com sucesso!');
            }
            
            // Atualizar contador da aba agenda
            if (typeof window.updateTabCounts === 'function') {
                window.updateTabCounts();
            }
        }).catch(error => {
            console.error('Erro ao salvar agendamento:', error);
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Erro ao salvar agendamento: ' + error.message);
            }
        });
    }

    getClientObservation(clientId) {
        try {
            if (!clientId) return '';
            const observations = JSON.parse(localStorage.getItem('client-observations') || '{}');
            return observations[clientId]?.text || '';
        } catch (error) {
            console.error('Erro ao carregar observação:', error);
            return '';
        }
    }

    saveClientObservation() {
        const textarea = document.getElementById('observacoes-text');
        if (!textarea || !this.currentItem) {
            console.error('Elementos não encontrados para salvar observação');
            return;
        }

        const clientId = this.currentItem.id || this.currentItem['ID Cliente'] || `temp_${Date.now()}`;
        const observation = textarea.value;

        try {
            const observations = JSON.parse(localStorage.getItem('client-observations') || '{}');
            observations[clientId] = {
                text: observation,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('client-observations', JSON.stringify(observations));
            
            if (typeof window.showSuccessMessage === 'function') {
                window.showSuccessMessage('Observação salva com sucesso!');
            }
            console.log('📝 Observação salva para cliente:', clientId);
        } catch (error) {
            console.error('Erro ao salvar observação:', error);
            if (typeof window.showErrorMessage === 'function') {
                window.showErrorMessage('Erro ao salvar observação: ' + error.message);
            }
        }
    }
}

// Inicializar instância global
if (typeof window !== 'undefined') {
    window.clientManager = new ClientManager();
}

console.log('✅ client-manager.js carregado completamente corrigido');
