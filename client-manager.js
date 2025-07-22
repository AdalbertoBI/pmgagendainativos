// client-manager.js - Sistema COMPLETO com modal avançado e persistência garantida
class ClientManager {
    constructor() {
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.schedules = {};
        this.observations = {};
        this.currentItem = null;
        this.initialized = false;
        this.editMode = false;
        
        // Sistema de cache otimizado - NÃO LIMPAR automaticamente
        this.cacheKey = 'pmg_clients_v2_persistent';
        this.observationsKey = 'pmg_observations_v2';
        this.schedulesKey = 'pmg_schedules_v2';
        
        console.log('✅ ClientManager inicializado com persistência garantida');
    }

    async init() {
        try {
            console.log('🚀 Inicializando ClientManager...');
            
            // SEMPRE carregar dados existentes primeiro
            await this.loadExistingData();
            
            // Aguardar DBManager se necessário
            if (!window.dbManager?.isInitialized && this.getTotalCount() === 0) {
                await this.waitForDbManager();
                await this.loadFromDatabase();
            }
            
            this.initialized = true;
            this.updateGlobals();
            
            const totalLoaded = this.getTotalCount();
            console.log(`✅ ClientManager inicializado - ${totalLoaded} clientes carregados`);
            
            // Se não há dados, mostrar estado vazio
            if (totalLoaded === 0) {
                console.log('ℹ️ Nenhum dado existente encontrado');
            }
            
        } catch (error) {
            console.error('❌ Erro ClientManager:', error);
            this.initializeEmpty();
        }
    }

    async loadExistingData() {
        try {
            console.log('📖 Carregando dados existentes...');
            
            // Tentar localStorage primeiro (mais rápido)
            const stored = localStorage.getItem(this.cacheKey);
            if (stored) {
                const data = JSON.parse(stored);
                if (this.isValidDataStructure(data)) {
                    this.data = data.clients || [];
                    this.ativos = data.ativos || [];
                    this.novos = data.novos || [];
                    this.schedules = data.schedules || {};
                    
                    const total = this.getTotalCount();
                    if (total > 0) {
                        console.log(`📦 ${total} clientes carregados do localStorage`);
                        
                        // Carregar observações e agendamentos
                        await this.loadObservations();
                        await this.loadSchedules();
                        
                        return; // Sucesso, não precisa do IndexedDB
                    }
                }
            }
            
            console.log('📖 Nenhum dado válido no localStorage');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados existentes:', error);
        }
    }

    async loadFromDatabase() {
        try {
            if (!window.dbManager?.isInitialized) return;
            
            console.log('📖 Carregando do IndexedDB...');
            
            const [clients, ativos, novos, schedules] = await Promise.all([
                window.dbManager.loadData('clients'),
                window.dbManager.loadData('ativos'),
                window.dbManager.loadData('novos'),
                window.dbManager.loadData('schedules')
            ]);
            
            this.data = Array.isArray(clients) ? clients : [];
            this.ativos = Array.isArray(ativos) ? ativos : [];
            this.novos = Array.isArray(novos) ? novos : [];
            this.schedules = schedules || {};
            
            const total = this.getTotalCount();
            console.log(`📊 IndexedDB: ${total} clientes carregados`);
            
            if (total > 0) {
                await this.saveToLocalStorage(); // Sync com localStorage
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar do IndexedDB:', error);
        }
    }

    async loadObservations() {
        try {
            const stored = localStorage.getItem(this.observationsKey);
            if (stored) {
                this.observations = JSON.parse(stored);
                console.log(`📝 ${Object.keys(this.observations).length} observações carregadas`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar observações:', error);
            this.observations = {};
        }
    }

    async loadSchedules() {
        try {
            const stored = localStorage.getItem(this.schedulesKey);
            if (stored) {
                this.schedules = { ...this.schedules, ...JSON.parse(stored) };
                console.log(`📅 ${Object.keys(this.schedules).length} agendamentos carregados`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar agendamentos:', error);
        }
    }

    isValidDataStructure(data) {
        return data && 
               typeof data === 'object' && 
               (Array.isArray(data.clients) || Array.isArray(data.ativos) || Array.isArray(data.novos));
    }

    async waitForDbManager() {
        let attempts = 0;
        while (!window.dbManager?.isInitialized && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    updateGlobals() {
        window.data = this.data;
        window.ativos = this.ativos;
        window.novos = this.novos;
    }

    initializeEmpty() {
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.schedules = {};
        this.observations = {};
        this.updateGlobals();
    }

    getTotalCount() {
        return this.data.length + this.ativos.length + this.novos.length;
    }

    async processNewData(newData) {
        try {
            console.log('📊 Processando NOVOS dados (substituindo anteriores)...');
            
            const inputTotal = (newData.clients?.length || 0) + 
                             (newData.ativos?.length || 0) + 
                             (newData.novos?.length || 0);
            
            if (inputTotal === 0) {
                throw new Error('Dados de entrada vazios');
            }
            
            // LIMPAR dados anteriores apenas com novo upload
            console.log('🧹 Limpando dados anteriores devido a novo upload...');
            await this.clearAllData();
            
            // Processar novos dados
            this.data = Array.isArray(newData.clients) ? [...newData.clients] : [];
            this.ativos = Array.isArray(newData.ativos) ? [...newData.ativos] : [];
            this.novos = Array.isArray(newData.novos) ? [...newData.novos] : [];
            this.schedules = {};
            this.observations = {};
            
            this.updateGlobals();
            
            const finalTotal = this.getTotalCount();
            
            if (finalTotal !== inputTotal) {
                throw new Error(`Perda de dados: ${inputTotal} → ${finalTotal}`);
            }
            
            // Salvar dados
            await this.saveAllData();
            
            console.log(`✅ Novos dados processados: 🔴${this.data.length} 🟢${this.ativos.length} 🆕${this.novos.length}`);
            
        } catch (error) {
            console.error('❌ Erro ao processar novos dados:', error);
            throw error;
        }
    }

    async clearAllData() {
        try {
            // Limpar IndexedDB
            if (window.dbManager?.isInitialized) {
                await Promise.all([
                    window.dbManager.clearData('clients'),
                    window.dbManager.clearData('ativos'),
                    window.dbManager.clearData('novos'),
                    window.dbManager.clearData('schedules')
                ]);
            }
            
            // Limpar localStorage
            localStorage.removeItem(this.cacheKey);
            localStorage.removeItem(this.observationsKey);
            localStorage.removeItem(this.schedulesKey);
            
            this.initializeEmpty();
            
            console.log('🧹 Todos os dados limpos');
            
        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
        }
    }

    async saveAllData() {
        try {
            const saveData = {
                clients: this.data,
                ativos: this.ativos,
                novos: this.novos,
                schedules: this.schedules,
                timestamp: Date.now(),
                version: '2.0'
            };
            
            // Salvar no localStorage (prioridade)
            await this.saveToLocalStorage(saveData);
            
            // Salvar no IndexedDB (backup)
            if (window.dbManager?.isInitialized) {
                await Promise.all([
                    window.dbManager.saveData('clients', this.data),
                    window.dbManager.saveData('ativos', this.ativos),
                    window.dbManager.saveData('novos', this.novos),
                    window.dbManager.saveData('schedules', this.schedules)
                ]);
                console.log('✅ Dados salvos no IndexedDB');
            }
            
            // Salvar observações e agendamentos
            await this.saveObservations();
            await this.saveSchedules();
            
            console.log('✅ Todos os dados salvos com segurança');
            
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
        }
    }

    async saveToLocalStorage(saveData = null) {
        try {
            const data = saveData || {
                clients: this.data,
                ativos: this.ativos,
                novos: this.novos,
                schedules: this.schedules,
                timestamp: Date.now(),
                version: '2.0'
            };
            
            localStorage.setItem(this.cacheKey, JSON.stringify(data));
            console.log('💾 Dados salvos no localStorage');
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ Quota localStorage excedida, tentando limpar...');
                this.clearOldCache();
                // Tentar novamente
                localStorage.setItem(this.cacheKey, JSON.stringify(data));
            } else {
                throw error;
            }
        }
    }

    async saveObservations() {
        try {
            if (Object.keys(this.observations).length > 0) {
                localStorage.setItem(this.observationsKey, JSON.stringify(this.observations));
            }
        } catch (error) {
            console.error('❌ Erro ao salvar observações:', error);
        }
    }

    async saveSchedules() {
        try {
            if (Object.keys(this.schedules).length > 0) {
                localStorage.setItem(this.schedulesKey, JSON.stringify(this.schedules));
            }
        } catch (error) {
            console.error('❌ Erro ao salvar agendamentos:', error);
        }
    }

    clearOldCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('pmg_') && key !== this.cacheKey && key !== this.observationsKey && key !== this.schedulesKey) {
                localStorage.removeItem(key);
                console.log('🧹 Cache antigo removido:', key);
            }
        });
    }

    // MODAL COMPLETO COM TODAS AS FUNCIONALIDADES
    showClientModal(cliente) {
        this.currentItem = cliente;
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalTitle || !modalBody) {
            console.error('❌ Elementos do modal não encontrados');
            return;
        }
        
        const clientId = this.getClientId(cliente);
        const nome = cliente['Nome Fantasia'] || cliente['Cliente'] || 'Cliente';
        const contato = cliente['Contato'] || 'N/A';
        const telefone = cliente['Celular'] || 'N/A';
        const endereco = cliente['Endereço'] || 'N/A';
        const status = cliente['Status'] || 'N/A';
        const segmento = cliente['Segmento'] || 'N/A';
        const cnpj = cliente['CNPJ / CPF'] || 'N/A';
        
        // Informações de geocodificação
        const geocodingInfo = cliente.geocoding?.success ? 
            `<div class="geocoding-info">
                <p><strong>📍 Localização:</strong> ${cliente.geocoding.method} (${Math.round((cliente.geocoding.confidence || 0) * 100)}% confiança)</p>
                ${cliente.geocoding.coordinates ? 
                    `<p><strong>Coordenadas:</strong> ${cliente.geocoding.coordinates.lat.toFixed(6)}, ${cliente.geocoding.coordinates.lon.toFixed(6)}</p>` 
                    : ''}
            </div>` : '';
        
        // Observações existentes
        const currentObservation = this.observations[clientId] || '';
        
        // Agendamento existente
        const currentSchedule = this.schedules[clientId];
        const scheduleInfo = currentSchedule ? 
            `<div class="current-schedule">
                <strong>📅 Agendamento atual:</strong> ${new Date(currentSchedule.date).toLocaleDateString('pt-BR')} às ${currentSchedule.time}
                <button onclick="window.clientManager.removeSchedule('${clientId}')" class="btn-small btn-danger" style="margin-left: 10px;">Remover</button>
            </div>` : '';
        
        modalTitle.innerHTML = `
            <span>${nome}</span>
            <div class="modal-status">
                <span class="status-badge status-${status.toLowerCase().includes('ativo') ? 'active' : status.toLowerCase().includes('novo') ? 'new' : 'inactive'}">${status}</span>
            </div>
        `;
        
        modalBody.innerHTML = `
            <div class="client-details-advanced">
                <!-- Informações Básicas -->
                <div class="detail-section">
                    <h4>📋 Informações Básicas</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Nome/Razão Social:</label>
                            <div class="detail-value">${nome}</div>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <div class="detail-value">${status}</div>
                        </div>
                        <div class="detail-item">
                            <label>Segmento:</label>
                            <div class="detail-value">${segmento}</div>
                        </div>
                        <div class="detail-item">
                            <label>CNPJ/CPF:</label>
                            <div class="detail-value">${cnpj}</div>
                        </div>
                    </div>
                </div>

                <!-- Contato -->
                <div class="detail-section">
                    <h4>📞 Contato</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Pessoa de Contato:</label>
                            <div class="detail-value">${contato}</div>
                        </div>
                        <div class="detail-item">
                            <label>Telefone:</label>
                            <div class="detail-value">
                                ${telefone}
                                ${this.createWhatsAppButton(telefone, nome)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Endereço -->
                <div class="detail-section">
                    <h4>📍 Endereço e Localização</h4>
                    <div class="detail-item full-width">
                        <label>Endereço Completo:</label>
                        <div class="detail-value">${this.formatAddress(endereco)}</div>
                        ${this.createRouteButton(cliente)}
                    </div>
                    ${geocodingInfo}
                </div>

                <!-- Agendamento -->
                <div class="detail-section">
                    <h4>📅 Agendamento</h4>
                    ${scheduleInfo}
                    <div class="schedule-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="schedule-date">Data:</label>
                                <input type="date" id="schedule-date" class="form-control" 
                                       value="${currentSchedule ? currentSchedule.date : ''}" 
                                       min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label for="schedule-time">Hora:</label>
                                <input type="time" id="schedule-time" class="form-control" 
                                       value="${currentSchedule ? currentSchedule.time : '09:00'}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="schedule-notes">Observações do Agendamento:</label>
                            <textarea id="schedule-notes" class="form-control" rows="2" 
                                      placeholder="Adicione observações sobre o agendamento...">${currentSchedule ? currentSchedule.notes || '' : ''}</textarea>
                        </div>
                        <button onclick="window.clientManager.saveSchedule('${clientId}')" class="btn btn-primary">
                            📅 ${currentSchedule ? 'Atualizar' : 'Agendar'} Visita
                        </button>
                    </div>
                </div>

                <!-- Observações -->
                <div class="detail-section">
                    <h4>📝 Observações</h4>
                    <div class="form-group">
                        <textarea id="client-observations" class="form-control" rows="4" 
                                  placeholder="Adicione suas observações sobre este cliente...">${currentObservation}</textarea>
                    </div>
                    <button onclick="window.clientManager.saveObservation('${clientId}')" class="btn btn-secondary">
                        💾 Salvar Observações
                    </button>
                </div>

                <!-- Ações -->
                <div class="detail-section">
                    <h4>⚡ Ações Rápidas</h4>
                    <div class="action-buttons">
                        ${this.createWhatsAppButton(telefone, nome, true)}
                        ${this.createRouteButton(cliente, true)}
                        <button onclick="window.clientManager.editClient('${clientId}')" class="btn btn-warning">
                            ✏️ Editar Dados
                        </button>
                        <button onclick="window.clientManager.duplicateClient('${clientId}')" class="btn btn-info">
                            📋 Duplicar Cliente
                        </button>
                        ${this.createStatusButtons(clientId, status)}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        
        // Focar no primeiro input se existir
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    createWhatsAppButton(telefone, nome, isActionButton = false) {
        if (!telefone || telefone === 'N/A') {
            return isActionButton ? '<button class="btn btn-disabled" disabled>📱 WhatsApp Indisponível</button>' : '';
        }
        
        const cleanPhone = telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return isActionButton ? '<button class="btn btn-disabled" disabled>📱 Número Inválido</button>' : '';
        }
        
        const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
        const message = encodeURIComponent(`Olá ${nome}, tudo bem? Sou da PMG e gostaria de conversar sobre nossos serviços.`);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        
        if (isActionButton) {
            return `<a href="${whatsappUrl}" target="_blank" class="btn btn-success">📱 Abrir WhatsApp</a>`;
        } else {
            return `<br><a href="${whatsappUrl}" target="_blank" class="whatsapp-link">📱 WhatsApp</a>`;
        }
    }

    createRouteButton(cliente, isActionButton = false) {
        const endereco = cliente['Endereço'] || '';
        const nome = cliente['Nome Fantasia'] || 'Cliente';
        
        if (!endereco || endereco === 'N/A') {
            return isActionButton ? '<button class="btn btn-disabled" disabled>🗺️ Endereço Indisponível</button>' : '';
        }
        
        let routeUrl = '';
        
        // Se tem coordenadas, usar elas
        if (cliente.geocoding?.success && cliente.geocoding.coordinates) {
            const lat = cliente.geocoding.coordinates.lat;
            const lon = cliente.geocoding.coordinates.lon;
            routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
        } else {
            // Usar endereço textual
            const addressForUrl = encodeURIComponent(endereco + ', São José dos Campos, SP');
            routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressForUrl}&travelmode=driving`;
        }
        
        if (isActionButton) {
            return `<a href="${routeUrl}" target="_blank" class="btn btn-primary">🗺️ Traçar Rota</a>`;
        } else {
            return `<br><a href="${routeUrl}" target="_blank" class="route-link">🗺️ Como chegar</a>`;
        }
    }

    createStatusButtons(clientId, currentStatus) {
        const statuses = [
            { key: 'ativo', label: 'Ativo', color: 'success' },
            { key: 'inativo', label: 'Inativo', color: 'danger' },
            { key: 'novo', label: 'Novo', color: 'warning' }
        ];
        
        return statuses
            .filter(s => !currentStatus.toLowerCase().includes(s.key))
            .map(s => `<button onclick="window.clientManager.changeStatus('${clientId}', '${s.key}')" class="btn btn-${s.color}">
                         ${s.key === 'ativo' ? '🟢' : s.key === 'novo' ? '🆕' : '🔴'} Marcar como ${s.label}
                       </button>`)
            .join('');
    }

    formatAddress(endereco) {
        if (!endereco || endereco === 'N/A') return 'Endereço não disponível';
        
        return endereco.split('\n')
            .map(linha => linha.trim())
            .filter(linha => linha)
            .join('<br>');
    }

    getClientId(cliente) {
        return cliente.id || cliente['ID Cliente'] || 
               cliente['Nome Fantasia']?.replace(/\s+/g, '_').toLowerCase() || 
               'client_' + Date.now();
    }

    // FUNCIONALIDADES DO MODAL

    async saveObservation(clientId) {
        try {
            const textarea = document.getElementById('client-observations');
            if (!textarea) return;
            
            const observation = textarea.value.trim();
            
            if (observation) {
                this.observations[clientId] = observation;
                await this.saveObservations();
                
                this.showToast('Observação salva com sucesso!', 'success');
                console.log(`📝 Observação salva para cliente ${clientId}`);
            } else {
                delete this.observations[clientId];
                await this.saveObservations();
                this.showToast('Observação removida', 'info');
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar observação:', error);
            this.showToast('Erro ao salvar observação', 'error');
        }
    }

    async saveSchedule(clientId) {
        try {
            const dateInput = document.getElementById('schedule-date');
            const timeInput = document.getElementById('schedule-time');
            const notesInput = document.getElementById('schedule-notes');
            
            if (!dateInput || !timeInput) return;
            
            const date = dateInput.value;
            const time = timeInput.value;
            const notes = notesInput ? notesInput.value.trim() : '';
            
            if (!date || !time) {
                this.showToast('Data e hora são obrigatórios', 'error');
                return;
            }
            
            const scheduleDate = new Date(date + 'T' + time);
            const now = new Date();
            
            if (scheduleDate <= now) {
                this.showToast('Agendamento deve ser para o futuro', 'error');
                return;
            }
            
            this.schedules[clientId] = {
                date: date,
                time: time,
                notes: notes,
                createdAt: new Date().toISOString(),
                clientName: this.currentItem['Nome Fantasia'] || 'Cliente'
            };
            
            await this.saveSchedules();
            await this.saveAllData(); // Salvar também no cache principal
            
            this.showToast('Agendamento salvo com sucesso!', 'success');
            
            // Atualizar modal
            setTimeout(() => {
                if (this.currentItem) {
                    this.showClientModal(this.currentItem);
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Erro ao salvar agendamento:', error);
            this.showToast('Erro ao salvar agendamento', 'error');
        }
    }

    removeSchedule(clientId) {
        if (confirm('Tem certeza que deseja remover este agendamento?')) {
            delete this.schedules[clientId];
            this.saveSchedules();
            this.saveAllData();
            
            this.showToast('Agendamento removido', 'info');
            
            // Atualizar modal
            setTimeout(() => {
                if (this.currentItem) {
                    this.showClientModal(this.currentItem);
                }
            }, 500);
        }
    }

    changeStatus(clientId, newStatus) {
        try {
            const client = this.findClientById(clientId);
            if (!client) {
                this.showToast('Cliente não encontrado', 'error');
                return;
            }
            
            const oldStatus = client['Status'] || 'Inativo';
            client['Status'] = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
            
            // Mover cliente entre arrays se necessário
            this.moveClientBetweenArrays(client, oldStatus, newStatus);
            
            this.saveAllData();
            this.updateGlobals();
            
            // Atualizar contadores e listas
            if (typeof window.updateTabCounts === 'function') {
                window.updateTabCounts();
            }
            if (typeof window.renderAllTabs === 'function') {
                window.renderAllTabs();
            }
            
            this.showToast(`Status alterado para ${newStatus}`, 'success');
            
            // Fechar modal e atualizar interface
            document.getElementById('modal').style.display = 'none';
            
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
            this.showToast('Erro ao alterar status', 'error');
        }
    }

    moveClientBetweenArrays(client, oldStatus, newStatus) {
        // Remover de array atual
        this.removeClientFromArray(client, oldStatus);
        
        // Adicionar ao novo array
        if (newStatus.toLowerCase().includes('ativo')) {
            this.ativos.push(client);
        } else if (newStatus.toLowerCase().includes('novo')) {
            this.novos.push(client);
        } else {
            this.data.push(client);
        }
    }

    removeClientFromArray(client, status) {
        const clientId = this.getClientId(client);
        
        this.data = this.data.filter(c => this.getClientId(c) !== clientId);
        this.ativos = this.ativos.filter(c => this.getClientId(c) !== clientId);
        this.novos = this.novos.filter(c => this.getClientId(c) !== clientId);
    }

    findClientById(clientId) {
        const allClients = [...this.data, ...this.ativos, ...this.novos];
        return allClients.find(client => this.getClientId(client) === clientId);
    }

    editClient(clientId) {
        this.showToast('Funcionalidade de edição em desenvolvimento', 'info');
        // TODO: Implementar edição de dados do cliente
    }

    duplicateClient(clientId) {
        try {
            const client = this.findClientById(clientId);
            if (!client) return;
            
            const duplicated = { 
                ...client,
                'Nome Fantasia': (client['Nome Fantasia'] || 'Cliente') + ' (Cópia)',
                id: 'client_copy_' + Date.now()
            };
            
            // Adicionar à lista de inativos por padrão
            duplicated['Status'] = 'Inativo';
            this.data.push(duplicated);
            
            this.saveAllData();
            this.updateGlobals();
            
            if (typeof window.updateTabCounts === 'function') {
                window.updateTabCounts();
            }
            if (typeof window.renderAllTabs === 'function') {
                window.renderAllTabs();
            }
            
            this.showToast('Cliente duplicado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao duplicar cliente:', error);
            this.showToast('Erro ao duplicar cliente', 'error');
        }
    }

    showToast(message, type = 'info') {
        // Usar função global se disponível
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // APLICAR FILTROS E ORDENAÇÃO
    applyFiltersAndSort() {
        try {
            if (!Array.isArray(this.data)) {
                this.data = [];
            }
            
            const sortOption = document.getElementById('sortOption')?.value || 'nome-az';
            
            let filtered = [...this.data];
            
            // Ordenação
            filtered.sort((a, b) => {
                const nameA = a['Nome Fantasia'] || '';
                const nameB = b['Nome Fantasia'] || '';
                
                switch(sortOption) {
                    case 'nome-za':
                        return nameB.localeCompare(nameA, 'pt-BR');
                    case 'cidade-az':
                        return this.extrairCidade(a).localeCompare(this.extrairCidade(b), 'pt-BR');
                    case 'cidade-za':
                        return this.extrairCidade(b).localeCompare(this.extrairCidade(a), 'pt-BR');
                    default: // nome-az
                        return nameA.localeCompare(nameB, 'pt-BR');
                }
            });
            
            this.renderList(filtered);
            
        } catch (error) {
            console.error('❌ Erro ao aplicar filtros:', error);
            this.renderList(this.data);
        }
    }

    renderList(data) {
        const list = document.getElementById('client-list');
        if (!list) return;
        
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty-state">Nenhum cliente encontrado</div>';
            return;
        }
        
        list.innerHTML = '';
        
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'client-item';
            
            const geocodingInfo = item.geocoding?.success ? 
                `<div class="geocoding-status">📍 Localizado (${Math.round((item.geocoding.confidence || 0) * 100)}%)</div>` : 
                '<div class="geocoding-status pending">📍 Aguardando localização</div>';
            
            const scheduleInfo = this.schedules[this.getClientId(item)] ? 
                `<div class="schedule-status">📅 Agendado: ${new Date(this.schedules[this.getClientId(item)].date).toLocaleDateString('pt-BR')}</div>` : '';
            
            const observationInfo = this.observations[this.getClientId(item)] ? 
                '<div class="observation-status">📝 Com observações</div>' : '';
            
            div.innerHTML = `
                <div class="client-header">
                    <h4>${item['Nome Fantasia'] || 'Cliente'}</h4>
                    <span class="status-badge status-${item['Status']?.toLowerCase().includes('ativo') ? 'active' : item['Status']?.toLowerCase().includes('novo') ? 'new' : 'inactive'}">
                        ${item['Status'] || 'Inativo'}
                    </span>
                </div>
                <div class="client-info">
                    <p><strong>Contato:</strong> ${item['Contato'] || 'N/A'}</p>
                    <p><strong>Telefone:</strong> ${item['Celular'] || 'N/A'}</p>
                    <p><strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}</p>
                    <p><strong>Cidade:</strong> ${this.extrairCidade(item)}</p>
                </div>
                <div class="client-status">
                    ${geocodingInfo}
                    ${scheduleInfo}
                    ${observationInfo}
                </div>
            `;
            
            div.onclick = () => this.showClientModal(item);
            list.appendChild(div);
        });
    }

    extrairCidade(item) {
        if (item['Cidade']) return item['Cidade'];
        return 'São José dos Campos';
    }

    // Método para uso externo
    extrairCidadeDoItem(item) {
        return this.extrairCidade(item);
    }
}

window.clientManager = new ClientManager();
console.log('✅ client-manager.js COMPLETO carregado com todas as funcionalidades');
