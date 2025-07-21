// clientManager.js - Versão com persistência robusta e sem perda de dados
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
        this.autoSaveInterval = null;
        this.pendingChanges = false;
        this.lastSaveTime = null;
    }

    async init() {
        try {
            console.log('🚀 Inicializando ClientManager...');
            
            if (!window.dbManager) {
                console.log('⏳ Aguardando dbManager...');
                await this.waitForDbManager();
            }

            // Carregar dados com retry automático
            await this.loadAllDataWithRetry();
            
            this.initialized = true;
            console.log('✅ ClientManager inicializado com sucesso');
            
            // Iniciar auto-save
            this.startAutoSave();
            
            // Salvar dados na visibilidade e antes de fechar
            this.setupVisibilityHandlers();
            
            this.applyFiltersAndSort();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ClientManager:', error);
            // Tentar carregar dados básicos mesmo com erro
            await this.initializeEmptyData();
            this.initialized = true;
            throw error;
        }
    }

    async initializeEmptyData() {
        console.log('⚠️ Inicializando com dados vazios devido a erro');
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.schedules = {};
        window.data = this.data;
        window.ativos = this.ativos;
        window.novos = this.novos;
    }

    async waitForDbManager() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100;
            
            const checkDbManager = () => {
                attempts++;
                if (window.dbManager && window.dbManager.db) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkDbManager, 100);
                } else {
                    console.error('❌ Timeout: dbManager não inicializou');
                    resolve(); // Continuar mesmo com erro
                }
            };
            checkDbManager();
        });
    }

    async loadAllDataWithRetry(maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📖 Tentativa ${attempt}/${maxRetries} - Carregando dados salvos...`);
                await this.loadAllData();
                console.log('✅ Dados carregados com sucesso');
                return;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativa ${attempt} falhou:`, error);
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        
        console.error('❌ Falha ao carregar dados após todas as tentativas:', lastError);
        // Inicializar com dados vazios para não quebrar o sistema
        await this.initializeEmptyData();
    }

    async loadAllData() {
        try {
            // Carregar dados principais
            const [clients, ativos, novos, schedules] = await Promise.all([
                this.safeLoadData('clients', []),
                this.safeLoadData('ativos', []),
                this.safeLoadData('novos', []),
                this.safeLoadData('schedules', {})
            ]);

            this.data = Array.isArray(clients) ? clients : [];
            this.ativos = Array.isArray(ativos) ? ativos : [];
            this.novos = Array.isArray(novos) ? novos : [];
            this.schedules = (typeof schedules === 'object' && schedules !== null) ? schedules : {};

            // Garantir IDs únicos
            this.ensureUniqueIds();

            // Atualizar referências globais
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;

            this.lastSaveTime = new Date();
            this.pendingChanges = false;

            console.log(`📊 Dados carregados: 🔴 Inativos: ${this.data.length} 🟢 Ativos: ${this.ativos.length} 🆕 Novos: ${this.novos.length} 📅 Agendamentos: ${Object.keys(this.schedules).length}`);

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            throw error;
        }
    }

    async safeLoadData(storeName, defaultValue) {
        try {
            if (!window.dbManager) {
                throw new Error('dbManager não disponível');
            }
            
            const data = await window.dbManager.loadData(storeName);
            return data !== undefined && data !== null ? data : defaultValue;
            
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar ${storeName}, usando valor padrão:`, error);
            return defaultValue;
        }
    }

    ensureUniqueIds() {
        const allArrays = [
            { name: 'data', array: this.data },
            { name: 'ativos', array: this.ativos },
            { name: 'novos', array: this.novos }
        ];

        allArrays.forEach(({ name, array }) => {
            const usedIds = new Set();
            
            array.forEach((item, index) => {
                if (!item.id || usedIds.has(item.id)) {
                    item.id = this.generateUniqueId();
                    console.log(`🔧 ID único gerado para item em ${name}[${index}]: ${item.id}`);
                }
                usedIds.add(item.id);
            });
        });
    }

    generateUniqueId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Auto-save system
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Auto-save a cada 30 segundos se houver mudanças pendentes
        this.autoSaveInterval = setInterval(async () => {
            if (this.pendingChanges) {
                try {
                    await this.saveAllData();
                    console.log('💾 Auto-save executado com sucesso');
                } catch (error) {
                    console.error('❌ Erro no auto-save:', error);
                }
            }
        }, 30000);

        console.log('⏰ Auto-save iniciado (30s)');
    }

    markDataChanged() {
        this.pendingChanges = true;
        console.log('📝 Dados marcados como alterados');
        
        // Debounced save - salvar após 5 segundos de inatividade
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(async () => {
            try {
                await this.saveAllData();
                console.log('💾 Salvamento automático executado');
            } catch (error) {
                console.error('❌ Erro no salvamento automático:', error);
            }
        }, 5000);
    }

    async saveAllData() {
        if (!window.dbManager) {
            console.warn('⚠️ dbManager não disponível para salvar');
            return;
        }

        try {
            console.log('💾 Salvando todos os dados...');
            
            await Promise.all([
                window.dbManager.saveData('clients', this.data),
                window.dbManager.saveData('ativos', this.ativos),
                window.dbManager.saveData('novos', this.novos),
                window.dbManager.saveData('schedules', this.schedules)
            ]);

            this.lastSaveTime = new Date();
            this.pendingChanges = false;
            
            console.log('✅ Todos os dados salvos com sucesso');

        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            throw error;
        }
    }

    setupVisibilityHandlers() {
        // Salvar quando a página ficar oculta ou antes de fechar
        const saveOnExit = async () => {
            if (this.pendingChanges) {
                try {
                    await this.saveAllData();
                    console.log('💾 Dados salvos antes de sair/ocultar página');
                } catch (error) {
                    console.error('❌ Erro ao salvar antes de sair:', error);
                }
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveOnExit();
            }
        });

        window.addEventListener('beforeunload', (event) => {
            if (this.pendingChanges) {
                saveOnExit();
                // Opcional: mostrar confirmação para usuário
                event.preventDefault();
                return 'Existem dados não salvos. Deseja realmente sair?';
            }
        });

        // Salvar periodicamente quando em foco
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.pendingChanges) {
                setTimeout(() => this.saveAllData(), 1000);
            }
        });

        console.log('👁️ Handlers de visibilidade configurados');
    }

    // Marcar que geocodificação é necessária (nova planilha carregada)
    markGeocodingNeeded() {
        this.geocodingNeeded = true;
        if (window.mapManager && typeof window.mapManager.clearGeocodingCache === 'function') {
            window.mapManager.clearGeocodingCache();
            console.log('🧹 Cache de geocodificação limpo devido à nova planilha');
        }
    }

    // Método melhorado para processar planilha
    async processSpreadsheetData(data) {
        try {
            console.log('📊 Processando dados da planilha...');
            
            // Processar dados
            this.data = Array.isArray(data) ? data : [];
            this.ensureUniqueIds();
            
            // Marcar mudanças e salvar
            this.markDataChanged();
            this.markGeocodingNeeded();
            
            // Atualizar referências globais
            window.data = this.data;
            
            // Salvar imediatamente
            await this.saveAllData();
            
            console.log(`✅ Planilha processada: ${this.data.length} registros`);
            
        } catch (error) {
            console.error('❌ Erro ao processar planilha:', error);
            throw error;
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

    extrairCidadeDoEndereco(endereco) {
        if (!endereco) return '';
        
        // Remover CEP primeiro
        let enderecoLimpo = endereco.replace(/\d{5}-?\d{3}/, '').trim();
        
        // Padrões para extrair cidade
        const padroes = [
            /,\s*([^,\-]+)\s*-\s*SP\s*$/i,
            /,\s*([^,\-]+)\s*,?\s*SP\s*$/i,
            /,\s*([^,\-]+)\s*$/i,
            /-\s*([^,\-]+)\s*-\s*SP\s*$/i,
            /([^,\-]+)\s*-\s*SP\s*$/i
        ];
        
        for (const padrao of padroes) {
            const match = enderecoLimpo.match(padrao);
            if (match) {
                return match[1].trim();
            }
        }
        
        return '';
    }

    saveCurrentFilters() {
        try {
            const filters = {
                sort: document.getElementById('sortOption')?.value || 'nome-az',
                cidadesSelecionadas: Array.from(document.querySelectorAll('#cidadeList input:checked'))
                    .map(input => input.value)
            };

            if (window.dbManager && typeof window.dbManager.saveFilters === 'function') {
                window.dbManager.saveFilters(filters);
            }
        } catch (error) {
            console.error('❌ Erro ao salvar filtros:', error);
        }
    }

    // Método melhorado para mover cliente
    async moverCliente(clienteId, origem, destino) {
        try {
            console.log(`🔄 Movendo cliente ${clienteId} de ${origem} para ${destino}`);
            
            let cliente = null;
            let origemArray = null;
            let destinoArray = null;
            
            // Identificar arrays de origem e destino
            switch (origem) {
                case 'inativos':
                    origemArray = this.data;
                    break;
                case 'ativos':
                    origemArray = this.ativos;
                    break;
                case 'novos':
                    origemArray = this.novos;
                    break;
            }
            
            switch (destino) {
                case 'inativos':
                    destinoArray = this.data;
                    break;
                case 'ativos':
                    destinoArray = this.ativos;
                    break;
                case 'novos':
                    destinoArray = this.novos;
                    break;
            }
            
            if (!origemArray || !destinoArray) {
                throw new Error('Arrays de origem ou destino não encontrados');
            }
            
            // Encontrar cliente
            const index = origemArray.findIndex(c => c.id === clienteId);
            if (index === -1) {
                throw new Error('Cliente não encontrado na origem');
            }
            
            // Mover cliente
            cliente = origemArray.splice(index, 1)[0];
            destinoArray.push(cliente);
            
            // Marcar mudanças e salvar
            this.markDataChanged();
            
            console.log(`✅ Cliente movido com sucesso para ${destino}`);
            
        } catch (error) {
            console.error('❌ Erro ao mover cliente:', error);
            throw error;
        }
    }

    // Método melhorado para agendar
    async agendarCliente(clienteId, dataHora, observacao = '') {
        try {
            console.log(`📅 Agendando cliente ${clienteId} para ${dataHora}`);
            
            const agendamentoId = `schedule_${clienteId}_${Date.now()}`;
            
            this.schedules[agendamentoId] = {
                id: agendamentoId,
                clientId: clienteId,
                dataHora: dataHora,
                observacao: observacao,
                criadoEm: new Date().toISOString(),
                status: 'agendado'
            };
            
            // Marcar mudanças e salvar
            this.markDataChanged();
            
            console.log(`✅ Agendamento criado: ${agendamentoId}`);
            return agendamentoId;
            
        } catch (error) {
            console.error('❌ Erro ao agendar cliente:', error);
            throw error;
        }
    }

    // Método melhorado para salvar observação
    async salvarObservacao(clienteId, observacao) {
        try {
            if (window.dbManager && typeof window.dbManager.saveObservation === 'function') {
                window.dbManager.saveObservation(clienteId, observacao);
                console.log(`📝 Observação salva para cliente ${clienteId}`);
            }
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
        }
    }

    renderList(data) {
        const list = document.getElementById('client-list');
        if (!list) return;

        list.innerHTML = '';

        if (data.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente encontrado com os filtros aplicados.</p>';
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'inativo');

            const cidade = this.extrairCidadeDoItem(item);
            
            div.innerHTML = `
                <h4>${item['Nome Fantasia'] || item['Cliente'] || 'Cliente sem nome'}</h4>
                <p><strong>Contato:</strong> ${item['Contato'] || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${item['Telefone'] || 'N/A'}</p>
                <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
                <p><strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}</p>
                <p><strong>Endereço:</strong> ${item['Endereço'] || 'N/A'}</p>
            `;

            div.addEventListener('click', () => {
                if (typeof window.openClientModal === 'function') {
                    window.openClientModal(item);
                }
            });

            list.appendChild(div);
        });
    }

    // Método para limpeza ao destruir
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Salvar dados pendentes antes de destruir
        if (this.pendingChanges) {
            this.saveAllData().catch(error => {
                console.error('❌ Erro ao salvar dados na destruição:', error);
            });
        }
        
        console.log('🧹 ClientManager destruído');
    }

    // Método para verificar status dos dados
    getDataStatus() {
        return {
            initialized: this.initialized,
            pendingChanges: this.pendingChanges,
            lastSaveTime: this.lastSaveTime,
            dataCount: {
                inativos: this.data.length,
                ativos: this.ativos.length,
                novos: this.novos.length,
                agendamentos: Object.keys(this.schedules).length
            }
        };
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ClientManager = ClientManager;
}

console.log('✅ client-manager.js carregado - versão com persistência robusta');
