// client-manager.js - Gerenciador completo com todas as funcionalidades corrigidas

class ClientManager {
    constructor() {
        this.data = [];
        this.ativos = [];
        this.novos = [];
        this.filteredData = [];
        this.currentItem = null;
        this.currentTab = 'inativos';
        this.currentSource = null;
        this.isEditMode = false;
        this.mapCacheInvalidated = false;
    }

    // Inicializar - CORRIGIDO
    async init() {
        try {
            console.log('ðŸ”„ Inicializando ClientManager...');
            
            this.data = await window.dbManager.loadData('clients') || [];
            this.ativos = await window.dbManager.loadData('ativos') || [];
            this.novos = await window.dbManager.loadData('novos') || [];
            
            // Disponibilizar globalmente
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            window.filteredData = this.filteredData;
            
            // Marcar cache do mapa como vÃ¡lido se hÃ¡ dados
            if (this.data.length > 0 || this.ativos.length > 0 || this.novos.length > 0) {
                this.mapCacheInvalidated = false;
            }
            
            console.log('… ClientManager inicializado');
            console.log(`ðŸ“Š Dados carregados: ${this.data.length} inativos, ${this.ativos.length} ativos, ${this.novos.length} novos`);
            
            return true;
        } catch (error) {
            console.error('Erro ao inicializar ClientManager:', error);
            throw error;
        }
    }

    // Obter estatÃ­sticas - CORRIGIDO
    getStats() {
        return {
            totalClientes: this.data.length + this.ativos.length + this.novos.length,
            totalAtivos: this.ativos.length,
            totalNovos: this.novos.length,
            totalInativos: this.data.length
        };
    }

    // Aplicar filtros e ordenaçÃ£o - CORRIGIDO
    applyFiltersAndSort() {
        try {
            let filtered = [...this.data];
            
            // Filtro por cidades selecionadas
            const cidadesSelecionadas = this.getSelectedCidades();
            if (cidadesSelecionadas.length > 0) {
                filtered = filtered.filter(item => 
                    cidadesSelecionadas.includes(item['Cidade'] || '')
                );
            }
            
            // OrdenaçÃ£o
            const sortOption = document.getElementById('sortOption')?.value || 'nome-az';
            filtered.sort((a, b) => {
                switch(sortOption) {
                    case 'nome-az':
                        return (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || '', 'pt-BR');
                    case 'nome-za':
                        return (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || '', 'pt-BR');
                    case 'cidade-az':
                        return (a['Cidade'] || '').localeCompare(b['Cidade'] || '', 'pt-BR');
                    case 'cidade-za':
                        return (b['Cidade'] || '').localeCompare(a['Cidade'] || '', 'pt-BR');
                    default:
                        return 0;
                }
            });
            
            this.filteredData = filtered;
            this.renderClientList(filtered);
            
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    }

    // Obter cidades selecionadas
    getSelectedCidades() {
        const checkboxes = document.querySelectorAll('#cidadeList input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Renderizar lista de clientes
    renderClientList(clients) {
        const list = document.getElementById('client-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (!clients || clients.length === 0) {
            list.innerHTML = '<div class="empty-message">Nenhum cliente encontrado com os filtros aplicados</div>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        clients.forEach(item => {
            const li = document.createElement('li');
            li.onclick = () => this.openModal(item, 'inativos');
            
            const nomeFantasia = item['Nome Fantasia'] || 'N/A';
            const cidade = item['Cidade'] || 'N/A';
            const contato = item['Contato'] || 'N/A';
            const celular = item['Celular'] || 'N/A';
            const segmento = item['Segmento'] || 'N/A';
            
            li.innerHTML = `
                <div class="client-info">
                    <strong>${nomeFantasia}</strong>
                    <div class="client-details">
                        <div> ${segmento}</div>
                        <div>${cidade}</div>
                        <div>${contato}</div>
                        <div>${celular}</div>
                    </div>
                </div>
            `;
            
            fragment.appendChild(li);
        });
        
        list.appendChild(fragment);
    }

    // Cache do mapa
    invalidateMapCache() {
        this.mapCacheInvalidated = true;
        console.log('ðŸ—ºï¸ Cache do mapa invalidado');
    }

    needsMapUpdate() {
        return this.mapCacheInvalidated;
    }

    validateMapCache() {
        this.mapCacheInvalidated = false;
    }

    // Gerar ID Ãºnico
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar dados do cliente
    validateClientData(clientData) {
        const errors = [];
        
        if (!clientData['Nome Fantasia'] || clientData['Nome Fantasia'].trim() === '') {
            errors.push('Nome Fantasia Ã© obrigatÃ³rio');
        }
        
        if (clientData['CNPJ / CPF']) {
            const doc = clientData['CNPJ / CPF'].replace(/\D/g, '');
            if (doc.length !== 11 && doc.length !== 14) {
                errors.push('CNPJ/CPF deve ter 11 ou 14 dÃ­gitos');
            }
        }
        
        if (clientData.Email && !this.validateEmail(clientData.Email)) {
            errors.push('Email invÃ¡lido');
        }
        
        return errors;
    }

    // Validar email
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Abrir modal - CORRIGIDO
    openModal(item, source = 'inativos') {
        console.log('ðŸ“‹ Abrindo modal para:', item['Nome Fantasia'], 'Fonte:', source);
        
        this.currentItem = item;
        this.currentSource = source;
        this.isEditMode = false;
        
        const modal = document.getElementById('clientModal');
        if (!modal) {
            console.error('çModal nÃ£o encontrado');
            return;
        }
        
        // Preencher dados no modal
        this.populateModalFields(item);
        
        // Configurar botÃµes baseado na fonte
        this.configureModalButtons(source);
        
        // Carregar observaçÃµes
        this.loadObservations(item.id);
        
        // Mostrar modal
        modal.style.display = 'flex';
        
        // Analytics
        if (window.Analytics) {
            window.Analytics.trackClientAction('view', item);
        }
    }

    // Preencher campos do modal - CORRIGIDO
    populateModalFields(item) {
        const fields = {
            'modal-nome-fantasia': item['Nome Fantasia'] || '',
            'modal-cliente': item['Cliente'] || '',
            'modal-contato': item['Contato'] || '',
            'modal-celular': item['Celular'] || '',
            'modal-cnpj-cpf': item['CNPJ / CPF'] || '',
            'modal-email': item['Email'] || '',
            'modal-endereco': this.formatEndereco(item),
            'modal-cidade': item['Cidade'] || '',
            'modal-uf': item['UF'] || '',
            'modal-cep': item['CEP'] || '',
            'modal-segmento': item['Segmento'] || ''
        };
        
        // Preencher campos de exibiçÃ£o
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        // Preencher campos de ediçÃ£o
        const editFields = {
            'edit-nome-fantasia': item['Nome Fantasia'] || '',
            'edit-cliente': item['Cliente'] || '',
            'edit-contato': item['Contato'] || '',
            'edit-celular': item['Celular'] || '',
            'edit-cnpj-cpf': item['CNPJ / CPF'] || '',
            'edit-email': item['Email'] || '',
            'edit-endereco': this.formatEndereco(item),
            'edit-cidade': item['Cidade'] || '',
            'edit-uf': item['UF'] || '',
            'edit-cep': item['CEP'] || '',
            'edit-segmento': item['Segmento'] || ''
        };
        
        Object.entries(editFields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    // Formatar endereço completo - CORRIGIDO
    formatEndereco(item) {
        if (item['EnderecoCompleto']) {
            return item['EnderecoCompleto'];
        }
        
        const endereco = item['Endereco'] || item['Endereço'] || '';
        const numero = item['Numero'] || '';
        const bairro = item['Bairro'] || '';
        const cidade = item['Cidade'] || '';
        const uf = item['UF'] || '';
        const cep = item['CEP'] || '';
        
        let enderecoFormatado = '';
        
        if (endereco) {
            enderecoFormatado = endereco;
            if (numero) enderecoFormatado += `, ${numero}`;
        }
        
        if (bairro) {
            if (enderecoFormatado) enderecoFormatado += ` - ${bairro}`;
            else enderecoFormatado = bairro;
        }
        
        if (cidade) {
            if (enderecoFormatado) enderecoFormatado += `, ${cidade}`;
            else enderecoFormatado = cidade;
        }
        
        if (uf) {
            enderecoFormatado += `/${uf}`;
        }
        
        if (cep) {
            if (enderecoFormatado) enderecoFormatado += ` - ${cep}`;
            else enderecoFormatado = cep;
        }
        
        return enderecoFormatado || 'Endereço nÃ£o informado';
    }

    // Configurar botÃµes do modal - CORRIGIDO
    configureModalButtons(source) {
        const buttons = {
            'edit-btn': true,
            'save-btn': false,
            'cancel-btn': false,
            'activate-btn': source === 'inativos' || source === 'novos',
            'confirm-btn': false,
            'remove-active-btn': source === 'ativos',
            'move-inactive-btn': source === 'ativos'
        };
        
        Object.entries(buttons).forEach(([buttonId, show]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.style.display = show ? 'inline-flex' : 'none';
            }
        });
        
        const dataPedidoRow = document.getElementById('data-pedido-row');
        if (dataPedidoRow) {
            dataPedidoRow.style.display = 'none';
        }
    }

    // Toggle modo ediçÃ£o - CORRIGIDO
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        const displayFields = document.querySelectorAll('.display-field');
        const editFields = document.querySelectorAll('.edit-field');
        
        displayFields.forEach(field => {
            field.style.display = this.isEditMode ? 'none' : 'inline';
        });
        
        editFields.forEach(field => {
            field.style.display = this.isEditMode ? 'block' : 'none';
        });
        
        const editBtn = document.getElementById('edit-btn');
        const saveBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (editBtn) editBtn.style.display = this.isEditMode ? 'none' : 'inline-flex';
        if (saveBtn) saveBtn.style.display = this.isEditMode ? 'inline-flex' : 'none';
        if (cancelBtn) cancelBtn.style.display = this.isEditMode ? 'inline-flex' : 'none';
        
        console.log('çï¸ Modo ediçÃ£o:', this.isEditMode ? 'ATIVADO' : 'DESATIVADO');
    }

    // Salvar ediçÃ£o - CORRIGIDO
    async salvarEdicao() {
        if (!this.currentItem || !this.isEditMode) {
            console.warn('âš ï¸ Nenhum item em ediçÃ£o');
            return;
        }
        
        try {
            const dadosEditados = {
                'Nome Fantasia': document.getElementById('edit-nome-fantasia')?.value || '',
                'Cliente': document.getElementById('edit-cliente')?.value || '',
                'Contato': document.getElementById('edit-contato')?.value || '',
                'Celular': document.getElementById('edit-celular')?.value || '',
                'CNPJ / CPF': document.getElementById('edit-cnpj-cpf')?.value || '',
                'Email': document.getElementById('edit-email')?.value || '',
                'Endereco': document.getElementById('edit-endereco')?.value || '',
                'Cidade': document.getElementById('edit-cidade')?.value || '',
                'UF': document.getElementById('edit-uf')?.value || '',
                'CEP': document.getElementById('edit-cep')?.value || '',
                'Segmento': document.getElementById('edit-segmento')?.value || ''
            };
            
            const errors = this.validateClientData(dadosEditados);
            if (errors.length > 0) {
                alert('Erro na validaçÃ£o:\n' + errors.join('\n'));
                return;
            }
            
            await this.editarCliente(this.currentItem.id, dadosEditados);
            
            Object.assign(this.currentItem, dadosEditados);
            
            this.populateModalFields(this.currentItem);
            this.toggleEditMode();
            
            if (window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert('… Cliente editado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao salvar ediçÃ£o:', error);
            alert('Erro ao salvar: ' + error.message);
        }
    }

    // Cancelar ediçÃ£o
    cancelarEdicao() {
        if (this.isEditMode) {
            this.toggleEditMode();
        }
    }

    // Confirmar ativaçÃ£o - CORRIGIDO
    async confirmarAtivacao() {
        if (!this.currentItem) return;
        
        try {
            const dataPedidoRow = document.getElementById('data-pedido-row');
            const confirmBtn = document.getElementById('confirm-btn');
            const activateBtn = document.getElementById('activate-btn');
            
            if (dataPedidoRow && confirmBtn && activateBtn) {
                dataPedidoRow.style.display = 'block';
                confirmBtn.style.display = 'inline-flex';
                activateBtn.style.display = 'none';
                
                const dataInput = document.getElementById('data-pedido-input');
                if (dataInput) {
                    dataInput.value = new Date().toISOString().split('T')[0];
                }
            }
            
        } catch (error) {
            console.error('Erro ao confirmar ativaçÃ£o:', error);
        }
    }

    // Confirmar pedido - CORRIGIDO
    async confirmarPedido() {
        if (!this.currentItem) return;
        
        try {
            const dataInput = document.getElementById('data-pedido-input');
            const dataPedido = dataInput?.value || new Date().toISOString().split('T')[0];
            
            await this.tornarAtivo(this.currentItem, dataPedido);
            
            const modal = document.getElementById('clientModal');
            if (modal) modal.style.display = 'none';
            
            if (window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert(`… Cliente "${this.currentItem['Nome Fantasia']}" tornado ativo!`);
            
        } catch (error) {
            console.error('Erro ao confirmar pedido:', error);
            alert('Erro ao ativar cliente: ' + error.message);
        }
    }

    // Remover ativo - CORRIGIDO
    async removerAtivo() {
        if (!this.currentItem || this.currentSource !== 'ativos') return;
        
        if (!confirm(`Remover "${this.currentItem['Nome Fantasia']}" dos ativos?`)) {
            return;
        }
        
        try {
            await this.excluirAtivo(this.currentItem);
            
            const modal = document.getElementById('clientModal');
            if (modal) modal.style.display = 'none';
            
            if (window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert('… Cliente removido dos ativos');
            
        } catch (error) {
            console.error('Erro ao remover ativo:', error);
            alert('Erro: ' + error.message);
        }
    }

    // Mover para inativo - CORRIGIDO
    async moverParaInativo() {
        if (!this.currentItem) return;
        
        if (!confirm(`Mover "${this.currentItem['Nome Fantasia']}" para inativos?`)) {
            return;
        }
        
        try {
            await this.moverParaInativos(this.currentItem);
            
            const modal = document.getElementById('clientModal');
            if (modal) modal.style.display = 'none';
            
            if (window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert('… Cliente movido para inativos');
            
        } catch (error) {
            console.error('Erro ao mover para inativo:', error);
            alert('Erro: ' + error.message);
        }
    }

    // Abrir WhatsApp - CORRIGIDO
    abrirWhatsApp() {
        if (!this.currentItem) return;
        
        const celular = this.currentItem['Celular'] || '';
        const numero = celular.replace(/\D/g, '');
        
        if (!numero) {
            alert('NÃºmero de celular nÃ£o encontrado');
            return;
        }
        
        const nomeFantasia = this.currentItem['Nome Fantasia'] || '';
        const mensagem = encodeURIComponent(`OlÃ¡! Gostaria de falar sobre produtos PMG para ${nomeFantasia}.`);
        
        const url = `https://wa.me/55${numero}?text=${mensagem}`;
        window.open(url, '_blank');
        
        if (window.Analytics) {
            window.Analytics.trackEvent('whatsapp_contact', {
                clientName: nomeFantasia,
                number: numero
            });
        }
    }

    // Traçar rota - CORRIGIDO
    tracarRota() {
        if (!this.currentItem) return;
        
        const endereco = this.formatEndereco(this.currentItem);
        
        if (!endereco || endereco === 'Endereço nÃ£o informado') {
            alert('Endereço nÃ£o encontrado');
            return;
        }
        
        const enderecoEncoded = encodeURIComponent(endereco);
        const url = `https://www.google.com/maps/dir//${enderecoEncoded}`;
        
        window.open(url, '_blank');
        
        if (window.Analytics) {
            window.Analytics.trackEvent('route_opened', {
                clientName: this.currentItem['Nome Fantasia'],
                address: endereco
            });
        }
    }

    // Carregar observaçÃµes
    loadObservations(clientId) {
        const textarea = document.getElementById('observacoes-textarea');
        const counter = document.getElementById('observacoes-count');
        
        if (textarea && counter) {
            const observacoes = window.dbManager?.loadObservation(clientId) || '';
            textarea.value = observacoes;
            counter.textContent = `${observacoes.length}/1000`;
        }
    }

    // Salvar observaçÃµes
    async salvarObservacoes() {
        if (!this.currentItem) return;
        
        const textarea = document.getElementById('observacoes-textarea');
        if (!textarea) return;
        
        const observacoes = textarea.value;
        
        try {
            if (window.dbManager?.saveObservation) {
                window.dbManager.saveObservation(this.currentItem.id, observacoes);
            }
            
            alert('… ObservaçÃµes salvas!');
            
            if (window.Analytics) {
                window.Analytics.trackEvent('observations_saved', {
                    clientId: this.currentItem.id,
                    length: observacoes.length
                });
            }
            
        } catch (error) {
            console.error('Erro ao salvar observaçÃµes:', error);
            alert('Erro ao salvar observaçÃµes');
        }
    }

    // Agendar visita
    async agendarVisita() {
        if (!this.currentItem) return;
        
        const dia = document.getElementById('agenda-dia')?.value;
        const horario = document.getElementById('agenda-horario')?.value;
        const tipo = document.getElementById('agenda-tipo')?.value;
        const data = document.getElementById('agenda-data')?.value;
        
        if (!dia || !horario || !tipo) {
            alert('çPreencha todos os campos do agendamento');
            return;
        }
        
        try {
            const agendamento = {
                id: this.generateClientId(),
                clienteId: this.currentItem.id,
                nomeFantasia: this.currentItem['Nome Fantasia'],
                contato: this.currentItem['Contato'],
                celular: this.currentItem['Celular'],
                cidade: this.currentItem['Cidade'],
                endereco: this.formatEndereco(this.currentItem),
                dia: dia,
                horario: horario,
                tipo: tipo,
                data: data || null,
                status: 'agendado',
                dataCriacao: new Date().toISOString()
            };
            
            await this.salvarAgendamento(agendamento);
            
            alert(`… Visita agendada para ${dia} Ã s ${horario}!`);
            
            document.getElementById('agenda-dia').value = '';
            document.getElementById('agenda-horario').value = '';
            document.getElementById('agenda-tipo').value = '';
            document.getElementById('agenda-data').value = '';
            
            if (window.Analytics) {
                window.Analytics.trackScheduleAction('create', agendamento);
            }
            
        } catch (error) {
            console.error('Erro ao agendar visita:', error);
            alert('Erro ao agendar: ' + error.message);
        }
    }

    // Salvar agendamento
    async salvarAgendamento(agendamento) {
        try {
            let agendamentos = await window.dbManager.loadDataByKey('agendamentos') || [];
            agendamentos.push(agendamento);
            await window.dbManager.saveData('agendamentos', agendamentos);
            
            console.log('… Agendamento salvo:', agendamento);
        } catch (error) {
            console.error('Erro ao salvar agendamento:', error);
            throw error;
        }
    }

    // Carregar agendamentos
    async carregarAgendamentos() {
        try {
            const agendamentos = await window.dbManager.loadDataByKey('agendamentos') || [];
            return agendamentos.filter(a => a.status === 'agendado');
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            return [];
        }
    }

    // Concluir agendamento
    async concluirAgendamento(agendamentoId) {
        try {
            let agendamentos = await window.dbManager.loadDataByKey('agendamentos') || [];
            const index = agendamentos.findIndex(a => a.id === agendamentoId);
            
            if (index !== -1) {
                agendamentos[index].status = 'concluido';
                agendamentos[index].dataConclusao = new Date().toISOString();
                
                await window.dbManager.saveData('agendamentos', agendamentos);
                
                if (window.renderCurrentTab && this.currentTab === 'agenda') {
                    window.renderCurrentTab();
                }
                
                alert('… Agendamento concluÃ­do!');
            }
        } catch (error) {
            console.error('Erro ao concluir agendamento:', error);
        }
    }

    // Remover agendamento
    async removerAgendamento(agendamentoId) {
        if (!confirm('Remover este agendamento?')) return;
        
        try {
            let agendamentos = await window.dbManager.loadDataByKey('agendamentos') || [];
            agendamentos = agendamentos.filter(a => a.id !== agendamentoId);
            
            await window.dbManager.saveData('agendamentos', agendamentos);
            
            if (window.renderCurrentTab && this.currentTab === 'agenda') {
                window.renderCurrentTab();
            }
            
            alert('… Agendamento removido!');
        } catch (error) {
            console.error('Erro ao remover agendamento:', error);
        }
    }

    // Limpar agenda
    async limparAgenda() {
        if (!confirm('Limpar toda a agenda?')) return;
        
        try {
            await window.dbManager.saveData('agendamentos', []);
            
            if (window.renderCurrentTab && this.currentTab === 'agenda') {
                window.renderCurrentTab();
            }
            
            alert('… Agenda limpa!');
        } catch (error) {
            console.error('Erro ao limpar agenda:', error);
        }
    }

    // CRUD Operations - CORRIGIDAS

    // Tornar ativo - CORRIGIDO
    async tornarAtivo(cliente, dataPedido) {
        try {
            const clienteAtivo = {
                ...cliente,
                'Data Pedido': dataPedido,
                'Data Ativacao': new Date().toISOString().split('T')[0],
                Status: 'ativo'
            };
            
            this.ativos.push(clienteAtivo);
            await window.dbManager.saveArrayData('ativos', this.ativos);
            
            if (this.currentSource === 'inativos') {
                this.data = this.data.filter(c => c.id !== cliente.id);
                await window.dbManager.saveArrayData('clients', this.data);
            } else if (this.currentSource === 'novos') {
                this.novos = this.novos.filter(c => c.id !== cliente.id);
                await window.dbManager.saveArrayData('novos', this.novos);
            }
            
            window.ativos = this.ativos;
            window.data = this.data;
            window.novos = this.novos;
            
            this.invalidateMapCache();
            
            console.log('… Cliente tornado ativo:', clienteAtivo['Nome Fantasia']);
            
        } catch (error) {
            console.error('Erro ao tornar ativo:', error);
            throw error;
        }
    }

    // Editar cliente - CORRIGIDO
    async editarCliente(clienteId, dadosEditados) {
        try {
            let encontrado = false;
            let enderecoMudou = false;
            
            const camposEndereco = ['Endereco', 'Endereço', 'Numero', 'Bairro', 'Cidade', 'UF', 'CEP'];
            enderecoMudou = Object.keys(dadosEditados).some(campo => camposEndereco.includes(campo));
            
            this.data = this.data.map(cliente => {
                if (cliente.id === clienteId) {
                    encontrado = true;
                    if (enderecoMudou) {
                        delete cliente.lat;
                        delete cliente.lng;
                        delete cliente.geocodePrecision;
                        delete cliente.geocodeSource;
                    }
                    return { ...cliente, ...dadosEditados };
                }
                return cliente;
            });
            
            if (!encontrado) {
                this.ativos = this.ativos.map(cliente => {
                    if (cliente.id === clienteId) {
                        encontrado = true;
                        if (enderecoMudou) {
                            delete cliente.lat;
                            delete cliente.lng;
                            delete cliente.geocodePrecision;
                            delete cliente.geocodeSource;
                        }
                        return { ...cliente, ...dadosEditados };
                    }
                    return cliente;
                });
            }
            
            if (!encontrado) {
                this.novos = this.novos.map(cliente => {
                    if (cliente.id === clienteId) {
                        encontrado = true;
                        if (enderecoMudou) {
                            delete cliente.lat;
                            delete cliente.lng;
                            delete cliente.geocodePrecision;
                            delete cliente.geocodeSource;
                        }
                        return { ...cliente, ...dadosEditados };
                    }
                    return cliente;
                });
            }
            
            if (!encontrado) {
                throw new Error('Cliente nÃ£o encontrado');
            }
            
            await window.dbManager.saveArrayData('clients', this.data);
            await window.dbManager.saveArrayData('ativos', this.ativos);
            await window.dbManager.saveArrayData('novos', this.novos);
            
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            
            if (enderecoMudou) {
                this.invalidateMapCache();
                
                if (window.clearMapCache) {
                    const markersCache = JSON.parse(localStorage.getItem('markers_cache') || '[]');
                    const updatedCache = markersCache.filter(([id]) => id !== clienteId);
                    localStorage.setItem('markers_cache', JSON.stringify(updatedCache));
                }
            }
            
            console.log('… Cliente editado:', dadosEditados['Nome Fantasia']);
            
        } catch (error) {
            console.error('Erro ao editar cliente:', error);
            throw error;
        }
    }

    // Excluir ativo - CORRIGIDO
    async excluirAtivo(cliente) {
        try {
            this.ativos = this.ativos.filter(c => c.id !== cliente.id);
            await window.dbManager.saveArrayData('ativos', this.ativos);
            
            window.ativos = this.ativos;
            
            this.invalidateMapCache();
            
            console.log('… Cliente removido dos ativos:', cliente['Nome Fantasia']);
            
        } catch (error) {
            console.error('Erro ao excluir ativo:', error);
            throw error;
        }
    }

    // Mover para inativos - CORRIGIDO
    async moverParaInativos(cliente) {
        try {
            const clienteInativo = {
                ...cliente,
                Status: 'inativo',
                'Data Inativacao': new Date().toISOString().split('T')[0]
            };
            
            this.data.push(clienteInativo);
            await window.dbManager.saveArrayData('clients', this.data);
            
            if (this.currentSource === 'ativos') {
                this.ativos = this.ativos.filter(c => c.id !== cliente.id);
                await window.dbManager.saveArrayData('ativos', this.ativos);
            } else if (this.currentSource === 'novos') {
                this.novos = this.novos.filter(c => c.id !== cliente.id);
                await window.dbManager.saveArrayData('novos', this.novos);
            }
            
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            
            this.invalidateMapCache();
            
            console.log('… Cliente movido para inativos:', clienteInativo['Nome Fantasia']);
            
        } catch (error) {
            console.error('Erro ao mover para inativos:', error);
            throw error;
        }
    }

    // Cadastro de novos clientes

    abrirModalCadastro() {
        const modal = document.getElementById('cadastroModal');
        if (modal) {
            document.getElementById('cadastroForm').reset();
            document.getElementById('cadastro-cidade').value = 'SÃ£o JosÃ© dos Campos';
            document.getElementById('cadastro-uf').value = 'SP';
            modal.style.display = 'flex';
        }
    }

    fecharModalCadastro() {
        const modal = document.getElementById('cadastroModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async cadastrarCliente(dadosFormulario) {
        try {
            const errors = this.validateClientData(dadosFormulario);
            if (errors.length > 0) {
                alert('Erro na validaçÃ£o:\n' + errors.join('\n'));
                return false;
            }
            
            const novoCliente = {
                id: this.generateClientId(),
                ...dadosFormulario,
                'Data Cadastro': new Date().toISOString().split('T')[0],
                Status: 'novo'
            };
            
            this.novos.push(novoCliente);
            await window.dbManager.saveArrayData('novos', this.novos);
            
            window.novos = this.novos;
            
            this.invalidateMapCache();
            
            console.log('… Novo cliente cadastrado:', novoCliente['Nome Fantasia']);
            
            this.fecharModalCadastro();
            
            if (this.currentTab === 'novos' && window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert(`… Cliente "${novoCliente['Nome Fantasia']}" cadastrado com sucesso!`);
            
            return true;
            
        } catch (error) {
            console.error('Erro ao cadastrar cliente:', error);
            alert('Erro ao cadastrar: ' + error.message);
            return false;
        }
    }

    async moverTodosNovosParaInativos() {
        if (this.novos.length === 0) {
            alert('Não ha¡ clientes novos para mover');
            return;
        }
        
        if (!confirm(`Mover todos os ${this.novos.length} clientes novos para inativos?`)) {
            return;
        }
        
        try {
            const clientesParaInativos = this.novos.map(cliente => ({
                ...cliente,
                Status: 'inativo',
                'Data Inativacao': new Date().toISOString().split('T')[0]
            }));
            
            this.data.push(...clientesParaInativos);
            await window.dbManager.saveArrayData('clients', this.data);
            
            this.novos = [];
            await window.dbManager.saveArrayData('novos', []);
            
            window.data = this.data;
            window.novos = this.novos;
            
            this.invalidateMapCache();
            
            if (window.renderCurrentTab) {
                window.renderCurrentTab();
            }
            
            if (window.updateHeaderStats) {
                window.updateHeaderStats();
            }
            
            alert(`… ${clientesParaInativos.length} clientes movidos para inativos!`);
            
        } catch (error) {
            console.error('Erro ao mover todos para inativos:', error);
            alert('Erro: ' + error.message);
        }
    }

    // ExportaçÃ£o de dados - CORRIGIDO
    exportarDados(tipo = 'inativos') {
        try {
            let dados = [];
            let nomeArquivo = '';
            
            switch(tipo) {
                case 'inativos':
                    dados = this.filteredData.length > 0 ? this.filteredData : this.data;
                    nomeArquivo = 'clientes_inativos';
                    break;
                case 'ativos':
                    dados = this.ativos;
                    nomeArquivo = 'clientes_ativos';
                    break;
                case 'novos':
                    dados = this.novos;
                    nomeArquivo = 'clientes_novos';
                    break;
                default:
                    dados = [...this.data, ...this.ativos, ...this.novos];
                    nomeArquivo = 'todos_clientes';
            }
            
            if (dados.length === 0) {
                alert('Não ha¡ dados para exportar');
                return;
            }
            
            const dadosExportacao = dados.map(cliente => ({
                'Nome Fantasia': cliente['Nome Fantasia'] || '',
                'Cliente': cliente['Cliente'] || '',
                'Contato': cliente['Contato'] || '',
                'Celular': cliente['Celular'] || '',
                'CNPJ / CPF': cliente['CNPJ / CPF'] || '',
                'Email': cliente['Email'] || '',
                'Endereço': this.formatEndereco(cliente),
                'Cidade': cliente['Cidade'] || '',
                'UF': cliente['UF'] || '',
                'CEP': cliente['CEP'] || '',
                'Segmento': cliente['Segmento'] || '',
                'Status': cliente.Status || 'inativo',
                'Data Cadastro': cliente['Data Cadastro'] || '',
                'Data Pedido': cliente['Data Pedido'] || '',
                'Data Ativacao': cliente['Data Ativacao'] || ''
            }));
            
            this.exportToExcel(dadosExportacao, nomeArquivo);
            
            console.log(`… Dados exportados: ${dados.length} registros`);
            
            if (window.Analytics) {
                window.Analytics.trackEvent('data_export', {
                    type: tipo,
                    count: dados.length
                });
            }
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            alert('Erro ao exportar: ' + error.message);
        }
    }

    exportToExcel(dados, nomeArquivo) {
        try {
            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Clientes");
            
            const range = XLSX.utils.decode_range(ws['!ref']);
            ws['!cols'] = Array(range.e.c + 1).fill({ wch: 15 });
            
            const dataAtual = new Date().toISOString().split('T')[0];
            const nomeCompleto = `${nomeArquivo}_${dataAtual}.xlsx`;
            
            XLSX.writeFile(wb, nomeCompleto);
            
        } catch (error) {
            console.error('Erro ao gerar Excel:', error);
            throw new Error('Erro ao gerar arquivo Excel');
        }
    }
}

// Inicializar e disponibilizar globalmente
window.clientManager = new ClientManager();

// Event Listeners para formulÃ¡rios
document.addEventListener('DOMContentLoaded', () => {
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const dadosFormulario = {
                'Nome Fantasia': document.getElementById('cadastro-nome-fantasia').value.trim(),
                'Cliente': document.getElementById('cadastro-cliente').value.trim(),
                'Contato': document.getElementById('cadastro-contato').value.trim(),
                'Celular': document.getElementById('cadastro-celular').value.trim(),
                'CNPJ / CPF': document.getElementById('cadastro-cnpj-cpf').value.trim(),
                'Email': document.getElementById('cadastro-email').value.trim(),
                'Endereco': document.getElementById('cadastro-endereco').value.trim(),
                'Cidade': document.getElementById('cadastro-cidade').value.trim(),
                'UF': document.getElementById('cadastro-uf').value.trim(),
                'CEP': document.getElementById('cadastro-cep').value.trim(),
                'Segmento': document.getElementById('cadastro-segmento').value.trim()
            };
            
            await window.clientManager.cadastrarCliente(dadosFormulario);
        });
    }
    
    console.log('… client-manager.js carregado com todas as correçÃµes');
});