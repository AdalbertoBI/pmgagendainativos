// clientManager.js - Versão com tratamento aprimorado de endereços e geocodificação inteligente
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
        this.geocodingNeeded = false; // Flag para controlar quando geocodificar
        this.dataLoaded = false; // Flag para controlar se dados foram carregados
    }

    async init() {
        try {
            console.log('🚀 Inicializando ClientManager...');
            
            if (!window.dbManager) {
                console.log('⏳ Aguardando dbManager...');
                await this.waitForDbManager();
            }

            await this.loadAllData();
            this.initialized = true;
            console.log('✅ ClientManager inicializado com sucesso');
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('❌ Erro ao inicializar ClientManager:', error);
            throw error;
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

    async loadAllData() {
        try {
            console.log('📖 Carregando dados salvos...');
            
            const clients = await window.dbManager.loadData('clients');
            this.data = Array.isArray(clients) ? clients : [];
            
            const ativos = await window.dbManager.loadData('ativos');
            this.ativos = Array.isArray(ativos) ? ativos : [];
            
            const novos = await window.dbManager.loadData('novos');
            this.novos = Array.isArray(novos) ? novos : [];
            
            const schedules = await window.dbManager.loadData('schedules');
            this.schedules = (typeof schedules === 'object' && schedules !== null) ? schedules : {};

            // Atualizar variáveis globais
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;

            this.dataLoaded = true;

            console.log(`📊 Dados carregados: 🔴 Inativos: ${this.data.length} 🟢 Ativos: ${this.ativos.length} 🆕 Novos: ${this.novos.length} 📅 Agendamentos: ${Object.keys(this.schedules).length}`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.data = [];
            this.ativos = [];
            this.novos = [];
            this.schedules = {};
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            this.dataLoaded = false;
        }
    }

    // Limpar todos os dados anteriores (chamado ao carregar novo arquivo)
    async clearAllPreviousData() {
        try {
            console.log('🧹 Limpando todos os dados anteriores...');
            
            // Limpar dados em memória
            this.data = [];
            this.ativos = [];
            this.novos = [];
            this.schedules = {};
            this.filteredData = [];
            
            // Limpar variáveis globais
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            
            // Limpar dados no IndexedDB
            await window.dbManager.clearData('clients');
            await window.dbManager.clearData('ativos');
            await window.dbManager.clearData('novos');
            await window.dbManager.clearData('schedules');
            
            // Limpar cache de geocodificação
            if (window.mapManager && typeof window.mapManager.clearGeocodingCache === 'function') {
                window.mapManager.clearGeocodingCache();
            }
            
            // Limpar observações do localStorage
            localStorage.removeItem('client-observations');
            
            this.geocodingNeeded = true;
            this.dataLoaded = false;
            
            console.log('✅ Todos os dados anteriores foram limpos');
            
        } catch (error) {
            console.error('❌ Erro ao limpar dados anteriores:', error);
            throw error;
        }
    }

    // Salvar todos os dados no IndexedDB (chamado após carregar novos dados)
    async saveAllData() {
        try {
            console.log('💾 Salvando todos os dados...');
            
            await window.dbManager.saveData('clients', this.data);
            await window.dbManager.saveData('ativos', this.ativos);
            await window.dbManager.saveData('novos', this.novos);
            await window.dbManager.saveData('schedules', this.schedules);
            
            this.dataLoaded = true;
            
            console.log('✅ Todos os dados foram salvos com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            throw error;
        }
    }

    // Processar novos dados (chamado ao carregar planilha)
    async processNewData(newData) {
        try {
            console.log('📊 Processando novos dados...');
            
            // Primeiro, limpar todos os dados anteriores
            await this.clearAllPreviousData();
            
            // Processar e validar novos dados
            if (newData.clients && Array.isArray(newData.clients)) {
                this.data = newData.clients;
            }
            
            if (newData.ativos && Array.isArray(newData.ativos)) {
                this.ativos = newData.ativos;
            }
            
            if (newData.novos && Array.isArray(newData.novos)) {
                this.novos = newData.novos;
            }
            
            if (newData.schedules && typeof newData.schedules === 'object') {
                this.schedules = newData.schedules;
            }
            
            // Atualizar variáveis globais
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            
            // Salvar novos dados
            await this.saveAllData();
            
            // Marcar que geocodificação é necessária
            this.markGeocodingNeeded();
            
            // Aplicar filtros e renderizar
            this.applyFiltersAndSort();
            
            console.log(`✅ Novos dados processados: 🔴 Inativos: ${this.data.length} 🟢 Ativos: ${this.ativos.length} 🆕 Novos: ${this.novos.length}`);
            
        } catch (error) {
            console.error('❌ Erro ao processar novos dados:', error);
            throw error;
        }
    }

    // Marcar que geocodificação é necessária (nova planilha carregada)
    markGeocodingNeeded() {
        this.geocodingNeeded = true;
        if (window.mapManager && typeof window.mapManager.clearGeocodingCache === 'function') {
            window.mapManager.clearGeocodingCache();
            console.log('🧹 Cache de geocodificação limpo devido à nova planilha');
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

        // Atualizar contador de caracteres
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

        try {
            const agendamento = {
                clientId: this.currentItem.id,
                cliente: this.currentItem['Nome Fantasia'] || this.currentItem['Cliente'],
                data: data,
                hora: hora,
                createdAt: new Date().toISOString()
            };

            const scheduleId = `${this.currentItem.id}_${Date.now()}`;
            this.schedules[scheduleId] = agendamento;

            await window.dbManager.saveData('schedules', this.schedules);

            if (typeof window.showSuccessMessage === 'function') {
                window.showSuccessMessage('Agendamento salvo com sucesso!');
            }

            this.closeModal();

            if (typeof window.renderAllTabs === 'function') {
                window.renderAllTabs();
            }

        } catch (error) {
            console.error('❌ Erro ao salvar agendamento:', error);
            alert('Erro ao salvar agendamento');
        }
    }

    salvarObservacao() {
        if (!this.currentItem) return;

        const observacao = document.getElementById('observacoes')?.value || '';
        
        try {
            if (window.dbManager && typeof window.dbManager.saveObservation === 'function') {
                window.dbManager.saveObservation(this.currentItem.id, observacao);
                
                if (typeof window.showSuccessMessage === 'function') {
                    window.showSuccessMessage('Observação salva com sucesso!');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
            alert('Erro ao salvar observação');
        }
    }

    loadObservacao(clientId) {
        try {
            if (window.dbManager && typeof window.dbManager.loadObservation === 'function') {
                return window.dbManager.loadObservation(clientId);
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

    // Verificar se há dados carregados
    hasData() {
        return this.dataLoaded && (this.data.length > 0 || this.ativos.length > 0 || this.novos.length > 0);
    }

    // Obter estatísticas dos dados
    getDataStats() {
        return {
            inativos: this.data.length,
            ativos: this.ativos.length,
            novos: this.novos.length,
            agendamentos: Object.keys(this.schedules).length,
            total: this.data.length + this.ativos.length + this.novos.length
        };
    }
}

// Inicializar instância global
if (typeof window !== 'undefined') {
    window.clientManager = new ClientManager();
}

console.log('✅ client-manager.js carregado');
