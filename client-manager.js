// client-manager.js - Gerenciador de clientes corrigido
class ClientManager {
    constructor() {
        this.version = '2.1.0';
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.currentSource = 'inativos';
        this.currentTab = 'inativos';
        this.lastUpdate = null;
        this.isInitialized = false;
        
        // Configurações de renderização
        this.renderConfig = {
            itemsPerPage: 50,
            currentPage: 1,
            totalPages: 1
        };
        
        console.log('👥 ClientManager corrigido inicializado v' + this.version);
    }

    // Inicializar ClientManager
    async init() {
        try {
            console.log('🔄 Inicializando ClientManager...');
            
            // Carregar dados salvos
            await this.loadSavedData();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ ClientManager inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ClientManager:', error);
            throw error;
        }
    }

    // Carregar dados salvos
    async loadSavedData() {
        try {
            if (window.dbManager && window.dbManager.isReady) {
                console.log('📖 Carregando dados salvos...');
                
                const [clients, ativos, novos] = await Promise.all([
                    window.dbManager.loadData('clients'),
                    window.dbManager.loadData('ativos'),
                    window.dbManager.loadData('novos')
                ]);
                
                this.data = Array.isArray(clients) ? clients : [];
                this.ativos = Array.isArray(ativos) ? ativos : [];
                this.novos = Array.isArray(novos) ? novos : [];
                
                this.lastUpdate = new Date().toISOString();
                
                console.log(`📊 Dados carregados: ${this.data.length} inativos, ${this.ativos.length} ativos, ${this.novos.length} novos`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Event listeners específicos serão configurados no app.js
        console.log('🔧 Event listeners do ClientManager configurados');
    }

    // Carregar dados do upload (CORRIGIDO)
    async carregarDadosUpload(dadosProcessados, categoria = 'clients') {
        try {
            console.log(`📊 Carregando ${dadosProcessados.length} registros na categoria ${categoria}`);
            
            let targetArray;
            let storeName;
            
            // Determinar array de destino
            switch (categoria) {
                case 'ativos':
                    targetArray = this.ativos;
                    storeName = 'ativos';
                    break;
                case 'novos':
                    targetArray = this.novos;
                    storeName = 'novos';
                    break;
                default:
                    targetArray = this.data;
                    storeName = 'clients';
                    categoria = 'inativos';
            }
            
            let successCount = 0;
            let errorCount = 0;
            
            // Processar cada registro
            for (const registro of dadosProcessados) {
                try {
                    // Garantir que tenha ID
                    if (!registro.id) {
                        registro.id = this.generateClientId(registro);
                    }
                    
                    // Definir categoria e dados de importação
                    registro.categoria = categoria;
                    registro.dataImportacao = new Date().toISOString();
                    registro.loteImportacao = Date.now();
                    
                    // Verificar se já existe
                    const existingIndex = targetArray.findIndex(item => 
                        item.id === registro.id || 
                        (item['Nome Fantasia'] === registro['Nome Fantasia'] && 
                         item['Celular'] === registro['Celular'])
                    );
                    
                    if (existingIndex >= 0) {
                        // Atualizar existente
                        targetArray[existingIndex] = { ...targetArray[existingIndex], ...registro };
                        console.log(`🔄 Cliente atualizado: ${registro['Nome Fantasia']}`);
                    } else {
                        // Adicionar novo
                        targetArray.push(registro);
                        console.log(`➕ Cliente adicionado: ${registro['Nome Fantasia']}`);
                    }
                    
                    successCount++;
                    
                } catch (error) {
                    console.error(`❌ Erro ao processar cliente ${registro['Nome Fantasia']}:`, error);
                    errorCount++;
                }
            }
            
            // Salvar dados no banco
            if (window.dbManager) {
                await window.dbManager.saveData(storeName, targetArray);
                console.log(`💾 Dados salvos no banco: ${storeName}`);
            }
            
            // Atualizar timestamp
            this.lastUpdate = new Date().toISOString();
            
            // Renderizar lista atualizada se estamos na aba correspondente
            if (this.currentTab === categoria) {
                this.renderCurrentTab();
            }
            
            const resultado = {
                success: successCount,
                errors: errorCount,
                category: categoria,
                total: dadosProcessados.length
            };
            
            console.log(`✅ Upload concluído:`, resultado);
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro no carregamento dos dados:', error);
            throw error;
        }
    }

    // Renderizar lista de clientes (CORRIGIDO)
    renderClientList(clients, containerId) {
        try {
            console.log(`🖼️ Renderizando ${clients.length} clientes em ${containerId}`);
            
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`❌ Container ${containerId} não encontrado`);
                return;
            }
            
            // Limpar container
            container.innerHTML = '';
            
            if (!clients || clients.length === 0) {
                this.showEmptyState(container, containerId);
                return;
            }
            
            // Renderizar clientes
            clients.forEach((client, index) => {
                const clientElement = this.createClientElement(client, index);
                container.appendChild(clientElement);
            });
            
            // Atualizar contador
            this.updateListCount(containerId, clients.length);
            
            console.log(`✅ ${clients.length} clientes renderizados em ${containerId}`);
            
        } catch (error) {
            console.error(`❌ Erro ao renderizar lista ${containerId}:`, error);
        }
    }

    // Criar elemento de cliente (CORRIGIDO)
    createClientElement(client, index) {
        const li = document.createElement('li');
        li.className = 'client-item';
        li.dataset.clientId = client.id;
        li.dataset.index = index;
        
        // Calcular completude dos dados
        const completeness = this.calculateDataCompleteness(client);
        const completenessClass = this.getCompletenessClass(completeness);
        
        // Determinar segmento e badge
        const segmento = client['Segmento'] || 'Não informado';
        const segmentoBadge = this.getSegmentoBadge(segmento);
        
        // Status do cliente
        const status = client['Status'] || 'Inativo';
        const statusIcon = this.getStatusIcon(status);
        
        li.innerHTML = `
            <div class="client-info">
                <div class="client-header">
                    <div class="client-name-section">
                        ${statusIcon}
                        <h4 class="client-name">${this.escapeHtml(client['Nome Fantasia'] || 'Nome não informado')}</h4>
                        ${segmentoBadge}
                        <span class="completeness-indicator ${completenessClass}">${completeness}%</span>
                    </div>
                </div>
                
                <div class="client-details">
                    ${client['Contato'] ? `
                        <div class="detail-item">
                            <i class="fas fa-user" title="Contato"></i>
                            <span>${this.escapeHtml(client['Contato'])}</span>
                        </div>
                    ` : ''}
                    
                    ${client['Celular'] ? `
                        <div class="detail-item">
                            <i class="fas fa-phone" title="Celular"></i>
                            <span>${this.escapeHtml(client['Celular'])}</span>
                        </div>
                    ` : ''}
                    
                    ${client['Endereço'] ? `
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt" title="Endereço"></i>
                            <span>${this.escapeHtml(client['Endereço'])}</span>
                        </div>
                    ` : ''}
                    
                    ${client['CNPJ / CPF'] ? `
                        <div class="detail-item">
                            <i class="fas fa-id-card" title="CNPJ/CPF"></i>
                            <span>${this.escapeHtml(client['CNPJ / CPF'])}</span>
                        </div>
                    ` : ''}
                    
                    ${client['Cidade'] ? `
                        <div class="detail-item">
                            <i class="fas fa-city" title="Cidade"></i>
                            <span>${this.escapeHtml(client['Cidade'])}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${client.dataImportacao ? `
                    <div class="import-info">
                        <small><i class="fas fa-clock"></i> Importado em ${this.formatDate(client.dataImportacao)}</small>
                        ${client.enrichedAt ? `<small><i class="fas fa-magic"></i> Enriquecido</small>` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="client-actions">
                <button class="btn-sm btn-outline" onclick="viewClientDetails('${client.id}')" title="Ver detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-sm btn-primary" onclick="editClient('${client.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-sm btn-success" onclick="scheduleClient('${client.id}')" title="Agendar">
                    <i class="fas fa-calendar"></i>
                </button>
                <button class="btn-sm btn-info" onclick="enrichSingleClient('${client.id}')" title="Enriquecer">
                    <i class="fas fa-magic"></i>
                </button>
                <button class="btn-sm btn-danger" onclick="deleteClient('${client.id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Event listeners para o item
        li.addEventListener('click', (e) => {
            if (!e.target.closest('.client-actions')) {
                this.selectClient(client);
            }
        });
        
        li.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, client);
        });
        
        return li;
    }

    // Mostrar estado vazio
    showEmptyState(container, containerId) {
        const tabName = containerId.replace('-list', '').replace('client-', '');
        
        const emptyStates = {
            'client': {
                icon: 'fas fa-users',
                title: 'Nenhum cliente inativo encontrado',
                subtitle: 'Faça upload de uma planilha para começar'
            },
            'ativos': {
                icon: 'fas fa-check-circle',
                title: 'Nenhum cliente ativo encontrado',
                subtitle: 'Faça upload de uma planilha ou adicione manualmente'
            },
            'novos': {
                icon: 'fas fa-star',
                title: 'Nenhum cliente novo encontrado',
                subtitle: 'Faça upload de uma planilha ou adicione manualmente'
            }
        };
        
        const state = emptyStates[tabName] || emptyStates['client'];
        
        container.innerHTML = `
            <div class="no-results">
                <i class="${state.icon}" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>${state.title}</p>
                <p><small>${state.subtitle}</small></p>
            </div>
        `;
    }

    // Renderizar aba atual
    renderCurrentTab() {
        let clients, containerId;
        
        switch (this.currentTab) {
            case 'ativos':
                clients = this.ativos;
                containerId = 'ativos-list';
                break;
            case 'novos':
                clients = this.novos;
                containerId = 'novos-list';
                break;
            default:
                clients = this.data;
                containerId = 'client-list';
        }
        
        this.renderClientList(clients, containerId);
    }

    // Buscar clientes (CORRIGIDO)
    buscarClientes(searchTerm, tab = null) {
        if (!searchTerm || searchTerm.trim() === '') {
            return this.getCurrentTabClients(tab);
        }
        
        const clients = this.getCurrentTabClients(tab);
        const term = searchTerm.toLowerCase().trim();
        
        return clients.filter(client => {
            const searchableFields = [
                client['Nome Fantasia'] || '',
                client['Contato'] || '',
                client['Celular'] || '',
                client['Endereço'] || '',
                client['CNPJ / CPF'] || '',
                client['Segmento'] || '',
                client['Cidade'] || ''
            ];
            
            return searchableFields.some(field => 
                field.toString().toLowerCase().includes(term)
            );
        });
    }

    // Obter clientes da aba atual
    getCurrentTabClients(tab = null) {
        const currentTab = tab || this.currentTab;
        
        switch (currentTab) {
            case 'ativos':
                return this.ativos;
            case 'novos':
                return this.novos;
            default:
                return this.data;
        }
    }

    // Atualizar contador da lista
    updateListCount(containerId, count) {
        const countId = containerId.replace('-list', '').replace('client', 'inativos');
        const countElement = document.getElementById(`list-count-${countId}`);
        
        if (countElement) {
            countElement.textContent = `${count} cliente${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
        }
    }

    // Calcular completude dos dados
    calculateDataCompleteness(client) {
        const fields = [
            'Nome Fantasia', 'Contato', 'Celular', 'Endereço', 
            'CNPJ / CPF', 'Segmento', 'Cidade'
        ];
        
        const filledFields = fields.filter(field => 
            client[field] && client[field].toString().trim() !== ''
        );
        
        return Math.round((filledFields.length / fields.length) * 100);
    }

    // Obter classe de completude
    getCompletenessClass(percentage) {
        if (percentage >= 80) return 'completeness-high';
        if (percentage >= 50) return 'completeness-medium';
        return 'completeness-low';
    }

    // Obter badge do segmento
    getSegmentoBadge(segmento) {
        const badges = {
            'Pizzaria': 'badge-pizza',
            'Restaurante': 'badge-restaurant',
            'Padaria': 'badge-bakery',
            'Supermercado': 'badge-supermarket',
            'Hamburgueria': 'badge-burger',
            'Confeitaria': 'badge-confectionery',
            'Adega': 'badge-wine'
        };
        
        const badgeClass = badges[segmento] || 'badge-other';
        return `<span class="badge ${badgeClass}">${segmento}</span>`;
    }

    // Obter ícone do status
    getStatusIcon(status) {
        const icons = {
            'Ativo': '<i class="fas fa-check-circle" style="color: #28a745;" title="Cliente Ativo"></i>',
            'Novo': '<i class="fas fa-star" style="color: #007bff;" title="Cliente Novo"></i>',
            'Inativo': '<i class="fas fa-pause-circle" style="color: #6c757d;" title="Cliente Inativo"></i>'
        };
        
        return icons[status] || icons['Inativo'];
    }

    // Gerar ID de cliente
    generateClientId(client) {
        const timestamp = Date.now();
        const name = (client['Nome Fantasia'] || 'cliente').toLowerCase();
        const hash = this.simpleHash(name);
        return `client-${timestamp}-${hash}`;
    }

    // Hash simples
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 6);
    }

    // Escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Formatar data
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Data inválida';
        }
    }

    // Obter estatísticas
    getStats() {
        return {
            totalInativos: this.data.length,
            totalAtivos: this.ativos.length,
            totalNovos: this.novos.length,
            totalGeral: this.data.length + this.ativos.length + this.novos.length,
            lastUpdate: this.lastUpdate
        };
    }

    // Selecionar cliente
    selectClient(client) {
        console.log('👤 Cliente selecionado:', client['Nome Fantasia']);
        
        // Remover seleção anterior
        document.querySelectorAll('.client-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Selecionar novo item
        const clientElement = document.querySelector(`[data-client-id="${client.id}"]`);
        if (clientElement) {
            clientElement.classList.add('selected');
        }
        
        // Disparar evento de seleção
        window.dispatchEvent(new CustomEvent('clientSelected', { 
            detail: { client, source: this.currentSource } 
        }));
    }

    // Aplicar filtros e ordenação
    applyFiltersAndSort() {
        try {
            const tab = this.currentTab;
            let clients = this.getCurrentTabClients(tab);
            
            // Aplicar ordenação
            const sortSelect = document.getElementById(`sort-${tab}`);
            if (sortSelect) {
                const sortValue = sortSelect.value;
                clients = this.sortClients(clients, sortValue);
            }
            
            // Aplicar filtro de segmento
            const segmentoSelect = document.getElementById(`filter-segmento-${tab}`);
            if (segmentoSelect && segmentoSelect.value) {
                clients = clients.filter(client => 
                    client['Segmento'] === segmentoSelect.value
                );
            }
            
            // Renderizar resultados filtrados
            const containerId = tab === 'inativos' ? 'client-list' : `${tab}-list`;
            this.renderClientList(clients, containerId);
            
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    }

    // Ordenar clientes
    sortClients(clients, sortType) {
        const sorted = [...clients];
        
        switch (sortType) {
            case 'nome-az':
                return sorted.sort((a, b) => 
                    (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || '')
                );
            case 'nome-za':
                return sorted.sort((a, b) => 
                    (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || '')
                );
            case 'cidade-az':
                return sorted.sort((a, b) => 
                    (a['Cidade'] || '').localeCompare(b['Cidade'] || '')
                );
            case 'cidade-za':
                return sorted.sort((a, b) => 
                    (b['Cidade'] || '').localeCompare(a['Cidade'] || '')
                );
            case 'completude':
                return sorted.sort((a, b) => 
                    this.calculateDataCompleteness(b) - this.calculateDataCompleteness(a)
                );
            case 'data-novo':
                return sorted.sort((a, b) => 
                    new Date(b.dataImportacao || 0) - new Date(a.dataImportacao || 0)
                );
            case 'data-antigo':
                return sorted.sort((a, b) => 
                    new Date(a.dataImportacao || 0) - new Date(b.dataImportacao || 0)
                );
            default:
                return sorted;
        }
    }

    // Mostrar menu de contexto
    showContextMenu(event, client) {
        // Implementar menu de contexto se necessário
        console.log('Menu de contexto para:', client['Nome Fantasia']);
    }

    // Obter dados para salvar
    getDataForSave() {
        return {
            clients: this.data,
            ativos: this.ativos,
            novos: this.novos
        };
    }
}

// Funções globais para compatibilidade
window.viewClientDetails = (clientId) => {
    console.log('👁️ Ver detalhes do cliente:', clientId);
    if (window.modalManager) {
        // Implementar visualização de detalhes
    }
};

window.editClient = (clientId) => {
    console.log('✏️ Editar cliente:', clientId);
    if (window.modalManager) {
        // Implementar edição
    }
};

window.scheduleClient = (clientId) => {
    console.log('📅 Agendar cliente:', clientId);
    if (window.agendaManager) {
        // Implementar agendamento
    }
};

window.enrichSingleClient = (clientId) => {
    console.log('✨ Enriquecer cliente:', clientId);
    if (window.pmgApp) {
        // Implementar enriquecimento individual
    }
};

window.deleteClient = (clientId) => {
    console.log('🗑️ Excluir cliente:', clientId);
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        // Implementar exclusão
    }
};

// Instância global
window.clientManager = new ClientManager();
console.log('👥 client-manager.js corrigido - Upload e navegação funcionais');
