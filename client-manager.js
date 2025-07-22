// client-manager.js - Gerenciamento de clientes com exclusão robusta

class ClientManager {
    constructor() {
        this.data = [];
        this.ativos = [];
        this.filteredData = [];
        this.schedules = {};
        this.currentItem = null;
        this.currentTab = 'inativos';
        this.savedFilters = {};
        this.today = new Date();
        this.BATCH_SIZE = 500;
        this.MAX_RECORDS = 10000;
    }

    // Inicializar gerenciador
    async init() {
        try {
            this.data = await window.dbManager.loadData('clients') || [];
            this.ativos = await window.dbManager.loadData('ativos') || [];
            this.schedules = await window.dbManager.loadData('schedules') || {};
            this.savedFilters = window.dbManager.loadFilters();

            // Disponibilizar globalmente
            window.data = this.data;
            window.ativos = this.ativos;
            window.filteredData = this.filteredData;

            console.log('✅ ClientManager inicializado');
            console.log(`📊 Dados carregados: ${this.data.length} inativos, ${this.ativos.length} ativos`);
        } catch (error) {
            console.error('❌ Erro ao inicializar ClientManager:', error);
        }
    }

    // Gerar ID único para cliente
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validar dados do cliente
    validateClientData(clientData) {
        const errors = [];

        if (!clientData['Nome Fantasia'] || clientData['Nome Fantasia'].trim() === '') {
            errors.push('Nome Fantasia é obrigatório');
        }

        if (clientData['CNPJ / CPF'] && !this.validateCNPJCPF(clientData['CNPJ / CPF'])) {
            errors.push('CNPJ/CPF inválido');
        }

        if (clientData.Email && !this.validateEmail(clientData.Email)) {
            errors.push('Email inválido');
        }

        if (clientData.CEP && !this.validateCEP(clientData.CEP)) {
            errors.push('CEP inválido');
        }

        return errors;
    }

    // Validar email
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Validar CEP
    validateCEP(cep) {
        const cleanCep = cep.replace(/\D/g, '');
        return cleanCep.length === 8;
    }

    // Validar CNPJ/CPF (básico)
    validateCNPJCPF(doc) {
        const cleanDoc = doc.replace(/\D/g, '');
        return cleanDoc.length === 11 || cleanDoc.length === 14;
    }

    // Cadastrar novo cliente
    async cadastrarCliente(formData) {
        try {
            const clientData = {
                id: this.generateClientId(),
                'Nome Fantasia': formData.nomeFantasia,
                'Cliente': formData.cliente,
                'CNPJ / CPF': formData.cnpjCpf,
                'Contato': formData.contato,
                'Telefone Comercial': formData.telefoneComercial,
                'Celular': formData.celular,
                'Email': formData.email,
                'Endereco': formData.endereco,
                'Numero': formData.numero,
                'Bairro': formData.bairro,
                'Cidade': formData.cidade,
                'UF': formData.uf,
                'CEP': formData.cep,
                'Saldo de Credito': formData.saldoCredito || 0,
                'Data Ultimo Pedido': formData.dataUltimoPedido || this.formatDate(new Date()),
                'Data Cadastro': this.formatDate(new Date())
            };

            // Validar dados
            const errors = this.validateClientData(clientData);
            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }

            // Adicionar à lista de inativos
            this.data.push(clientData);
            window.data = this.data;

            // Salvar no banco usando método robusto
            await window.dbManager.saveArrayData('clients', this.data);

            console.log('✅ Cliente cadastrado:', clientData['Nome Fantasia']);
            return clientData;

        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            throw error;
        }
    }

    // Editar cliente - FUNÇÃO CORRIGIDA
    async editarCliente(clienteId, dadosEditados) {
        try {
            // Validar dados
            const errors = this.validateClientData(dadosEditados);
            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }

            let clienteEditado = false;

            // Encontrar cliente na lista de inativos
            const indexInativo = this.data.findIndex(c => c.id === clienteId);
            if (indexInativo !== -1) {
                // Atualizar dados mantendo ID e data de cadastro
                this.data[indexInativo] = {
                    ...this.data[indexInativo],
                    ...dadosEditados
                };
                await window.dbManager.saveArrayData('clients', this.data);
                window.data = this.data;
                clienteEditado = true;
                console.log('✅ Cliente inativo editado:', dadosEditados['Nome Fantasia']);
            }

            // Encontrar cliente na lista de ativos
            const indexAtivo = this.ativos.findIndex(c => c.id === clienteId);
            if (indexAtivo !== -1) {
                // Atualizar dados mantendo ID e data de cadastro
                this.ativos[indexAtivo] = {
                    ...this.ativos[indexAtivo],
                    ...dadosEditados
                };
                await window.dbManager.saveArrayData('ativos', this.ativos);
                window.ativos = this.ativos;
                clienteEditado = true;
                console.log('✅ Cliente ativo editado:', dadosEditados['Nome Fantasia']);
            }

            if (!clienteEditado) {
                throw new Error('Cliente não encontrado');
            }

        } catch (error) {
            console.error('❌ Erro ao editar cliente:', error);
            throw error;
        }
    }

    // Tornar cliente ativo - CORRIGIDA
    async tornarAtivo(cliente, novaData = null) {
        try {
            console.log('🔄 Tornando cliente ativo:', cliente['Nome Fantasia']);

            // Remover da lista de inativos
            const index = this.data.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                this.data.splice(index, 1);
                console.log('✅ Cliente removido dos inativos');
            }

            // Adicionar à lista de ativos
            if (novaData) {
                cliente['Data Ultimo Pedido'] = novaData;
            }
            cliente.isAtivo = true;
            
            // Verificar se já existe nos ativos para evitar duplicatas
            const existeAtivo = this.ativos.findIndex(c => c.id === cliente.id);
            if (existeAtivo === -1) {
                this.ativos.push(cliente);
                console.log('✅ Cliente adicionado aos ativos');
            }

            // Salvar ambas as listas usando método robusto
            await window.dbManager.saveArrayData('clients', this.data);
            await window.dbManager.saveArrayData('ativos', this.ativos);

            // Atualizar variáveis globais
            window.data = this.data;
            window.ativos = this.ativos;

            console.log(`✅ Cliente "${cliente['Nome Fantasia']}" tornado ativo com sucesso`);
            console.log(`📊 Estado atual: ${this.data.length} inativos, ${this.ativos.length} ativos`);
            
            return cliente;

        } catch (error) {
            console.error('❌ Erro ao tornar cliente ativo:', error);
            throw error;
        }
    }

    // Excluir cliente dos ativos - MÉTODO ROBUSTO CORRIGIDO
    async excluirAtivo(cliente) {
        try {
            const clienteNome = cliente['Nome Fantasia'] || 'Cliente sem nome';
            console.log('🗑️ Excluindo cliente ativo:', clienteNome);
            console.log('📊 Estado antes da exclusão:', {
                totalAtivos: this.ativos.length,
                clienteId: cliente.id
            });

            // Encontrar e remover o cliente
            const index = this.ativos.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                // Remover do array
                this.ativos.splice(index, 1);
                console.log(`✅ Cliente removido do array (posição ${index})`);
                
                // Salvar usando método robusto que limpa e reinsere todos os dados
                await window.dbManager.saveArrayData('ativos', this.ativos);
                
                // Atualizar variável global
                window.ativos = this.ativos;
                
                console.log('✅ Dados salvos no IndexedDB');
                console.log('📊 Estado após exclusão:', {
                    totalAtivos: this.ativos.length,
                    idsRestantes: this.ativos.map(c => c.id).slice(0, 3)
                });
                
                // Verificar se a exclusão foi salva corretamente
                const verificacao = await window.dbManager.verifyDataIntegrity('ativos');
                console.log('🔍 Verificação de integridade:', {
                    totalCarregado: verificacao.length,
                    clienteAindaExiste: verificacao.some(c => c.id === cliente.id)
                });
                
                return true;
            } else {
                console.warn('⚠️ Cliente não encontrado na lista de ativos');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao excluir cliente ativo:', error);
            throw error;
        }
    }

    // Excluir cliente ativo por ID - NOVA FUNÇÃO ESPECÍFICA
    async excluirAtivoPorId(clienteId) {
        try {
            console.log('🗑️ Excluindo cliente ativo por ID:', clienteId);

            // Encontrar o cliente
            const cliente = this.ativos.find(c => c.id === clienteId);
            if (!cliente) {
                console.warn('⚠️ Cliente não encontrado:', clienteId);
                return false;
            }

            // Usar a função robusta de exclusão
            return await this.excluirAtivo(cliente);

        } catch (error) {
            console.error('❌ Erro ao excluir cliente por ID:', error);
            throw error;
        }
    }

    // Recarregar dados dos ativos - NOVA FUNÇÃO
    async recarregarAtivos() {
        try {
            console.log('🔄 Recarregando dados dos ativos...');
            
            this.ativos = await window.dbManager.loadData('ativos') || [];
            window.ativos = this.ativos;
            
            console.log(`✅ Ativos recarregados: ${this.ativos.length} clientes`);
            return this.ativos;
        } catch (error) {
            console.error('❌ Erro ao recarregar ativos:', error);
            return [];
        }
    }

    // Aplicar filtros e ordenação
    applyFiltersAndSort() {
        try {
            const saldoMin = parseFloat(document.getElementById('saldoFilter')?.value) || this.savedFilters.saldoMin || 0;
            const cidadesSelecionadas = Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value) || this.savedFilters.cidadesSelecionadas;
            const sort = document.getElementById('sortOption')?.value || this.savedFilters.sort || 'nome-az';

            if (this.currentTab === 'inativos') {
                this.filteredData = this.data.filter(item => {
                    const saldo = parseFloat(item['Saldo de Credito']) || 0;
                    const itemCidade = item['Cidade'] || '';
                    return saldo >= saldoMin && (cidadesSelecionadas.length === 0 || cidadesSelecionadas.includes(itemCidade));
                });

                // Aplicar ordenação
                this.applySorting(sort);
                window.filteredData = this.filteredData;
                this.renderList();
            } else if (this.currentTab === 'ativos') {
                this.filteredData = this.ativos.slice();
                this.renderList();
            }

            console.log(`🔍 Filtros aplicados: ${this.filteredData.length}/${this.data.length} clientes exibidos`);
        } catch (error) {
            console.error('❌ Erro ao aplicar filtros:', error);
        }
    }

    // Aplicar ordenação
    applySorting(sort) {
        switch (sort) {
            case 'nome-az':
                this.filteredData.sort((a, b) => (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || ''));
                break;
            case 'nome-za':
                this.filteredData.sort((a, b) => (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || ''));
                break;
            case 'saldo-desc':
                this.filteredData.sort((a, b) => parseFloat(b['Saldo de Credito']) - parseFloat(a['Saldo de Credito']));
                break;
            case 'saldo-asc':
                this.filteredData.sort((a, b) => parseFloat(a['Saldo de Credito']) - parseFloat(b['Saldo de Credito']));
                break;
            case 'data-asc':
                this.filteredData.sort((a, b) => this.parseDate(this.formatDateUS2BR(a['Data Ultimo Pedido'])) - this.parseDate(this.formatDateUS2BR(b['Data Ultimo Pedido'])));
                break;
            case 'data-desc':
                this.filteredData.sort((a, b) => this.parseDate(this.formatDateUS2BR(b['Data Ultimo Pedido'])) - this.parseDate(this.formatDateUS2BR(a['Data Ultimo Pedido'])));
                break;
        }
    }

    // Utilitários de data
    parseDate(dateStr) {
        if (!dateStr) return 0;
        const regex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!regex.test(dateStr)) return 0;
        
        const [dayStr, monthStr, yearStr] = dateStr.split('/');
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        
        if (month < 1 || month > 12 || day < 1 || day > 31) return 0;
        
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 0;
        
        return date.getTime();
    }

    formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    formatDateUS2BR(dateStr) {
        if (!dateStr) return '';
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
        
        const parts = dateStr.split('/');
        if (parts.length !== 3) return dateStr;
        
        let [month, day, year] = parts;
        if (year.length === 2) year = '20' + year;
        
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    daysSince(dateStr) {
        const lastDate = new Date(this.parseDate(this.formatDateUS2BR(dateStr)));
        const diff = Math.floor((this.today - lastDate) / (1000 * 60 * 60 * 24));
        return isNaN(diff) ? 'N/A' : diff;
    }

    // Renderizar lista
    renderList() {
        const listElement = document.getElementById(this.currentTab === 'inativos' ? 'list' : 'ativos-list');
        if (!listElement) return;

        listElement.innerHTML = '';

        if (this.filteredData.length === 0) {
            listElement.innerHTML = '<li style="text-align: center; color: #666;">Nenhum cliente encontrado</li>';
            return;
        }

        this.filteredData.forEach(item => {
            const li = document.createElement('li');
            const daysSince = this.daysSince(item['Data Ultimo Pedido']);
            
            li.innerHTML = `
                <div>
                    <strong>${item['Nome Fantasia'] || 'Sem Nome'}</strong>
                    <span class="days-since">${daysSince} dias sem pedido</span>
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    ${item['Cidade'] || ''} - Saldo: R$ ${item['Saldo de Credito'] || '0'}
                </div>
            `;
            li.onclick = () => this.openModal(item, this.currentTab);
            listElement.appendChild(li);
        });
    }

    // Abrir modal de detalhes - ATUALIZADO COM FUNÇÃO DE EXCLUSÃO ROBUSTA
    openModal(item, tab) {
        this.currentItem = item;
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2 id="modal-title">${item['Nome Fantasia'] || 'Sem Nome'}</h2>
            
            <!-- Campos de exibição -->
            <div class="display-field" id="display-info">
                <p><strong>Cliente:</strong> <span id="display-cliente">${item.Cliente || ''}</span></p>
                <p><strong>CNPJ/CPF:</strong> <span id="display-cnpj">${item['CNPJ / CPF'] || ''}</span></p>
                <p><strong>Contato:</strong> <span id="display-contato">${item.Contato || ''}</span></p>
                <p><strong>Telefone Comercial:</strong> <span id="display-telefone">${item['Telefone Comercial'] || ''}</span></p>
                <p><strong>Celular:</strong> <span id="display-celular">${item.Celular || ''}</span></p>
                <p><strong>Email:</strong> <span id="display-email">${item.Email || ''}</span></p>
                <p><strong>Endereço:</strong> <span id="display-endereco-completo">${item.Endereco || ''}</span></p>
                <p><strong>Número:</strong> <span id="display-numero">${item.Numero || ''}</span></p>
                <p><strong>Bairro:</strong> <span id="display-bairro">${item.Bairro || ''}</span></p>
                <p><strong>Cidade:</strong> <span id="display-cidade">${item.Cidade || ''}</span></p>
                <p><strong>UF:</strong> <span id="display-uf">${item.UF || ''}</span></p>
                <p><strong>CEP:</strong> <span id="display-cep">${item.CEP || ''}</span></p>
                <p><strong>Saldo de Crédito:</strong> <span id="display-saldo">R$ ${item['Saldo de Credito'] || '0'}</span></p>
                <p><strong>Data Último Pedido:</strong> <span id="display-data">${this.formatDateUS2BR(item['Data Ultimo Pedido']) || ''}</span></p>
            </div>
            
            <!-- Campos de edição (inicialmente ocultos) -->
            <div class="edit-field" id="edit-form" style="display: none;">
                <div class="edit-row">
                    <label><strong>Nome Fantasia:</strong></label>
                    <input type="text" id="edit-nome-fantasia" class="edit-input" value="${item['Nome Fantasia'] || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Cliente:</strong></label>
                    <input type="text" id="edit-cliente" class="edit-input" value="${item.Cliente || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>CNPJ/CPF:</strong></label>
                    <input type="text" id="edit-cnpj-cpf" class="edit-input" value="${item['CNPJ / CPF'] || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Contato:</strong></label>
                    <input type="text" id="edit-contato" class="edit-input" value="${item.Contato || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Telefone Comercial:</strong></label>
                    <input type="tel" id="edit-telefone-comercial" class="edit-input" value="${item['Telefone Comercial'] || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Celular:</strong></label>
                    <input type="tel" id="edit-celular" class="edit-input" value="${item.Celular || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Email:</strong></label>
                    <input type="email" id="edit-email" class="edit-input" value="${item.Email || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Endereço:</strong></label>
                    <input type="text" id="edit-endereco" class="edit-input" value="${item.Endereco || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Número:</strong></label>
                    <input type="text" id="edit-numero" class="edit-input" value="${item.Numero || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Bairro:</strong></label>
                    <input type="text" id="edit-bairro" class="edit-input" value="${item.Bairro || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Cidade:</strong></label>
                    <input type="text" id="edit-cidade" class="edit-input" value="${item.Cidade || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>UF:</strong></label>
                    <input type="text" id="edit-uf" class="edit-input" maxlength="2" value="${item.UF || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>CEP:</strong></label>
                    <input type="text" id="edit-cep" class="edit-input" maxlength="9" value="${item.CEP || ''}">
                </div>
                
                <div class="edit-row">
                    <label><strong>Saldo de Crédito:</strong></label>
                    <input type="number" id="edit-saldo-credito" class="edit-input" min="0" step="0.01" value="${item['Saldo de Credito'] || ''}">
                </div>
            </div>
            
            <!-- Botões de ação -->
            <div class="action-buttons" style="margin-top: 20px;">
                <button id="editarCliente" class="action-btn edit-btn">✏️ Editar Cliente</button>
                <button id="salvarEdicao" class="action-btn save-btn" style="display: none;">💾 Salvar</button>
                <button id="cancelarEdicao" class="action-btn cancel-btn" style="display: none;">❌ Cancelar</button>
            </div>
        `;

        // Configurar event listeners para os botões de edição
        setTimeout(() => {
            const editBtn = document.getElementById('editarCliente');
            const saveBtn = document.getElementById('salvarEdicao');
            const cancelBtn = document.getElementById('cancelarEdicao');
            
            if (editBtn) {
                editBtn.addEventListener('click', () => this.toggleEditMode());
            }
            
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.salvarEdicaoCliente());
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.cancelarEdicaoCliente());
            }
        }, 100);

        // Configurar botões WhatsApp e Maps
        const whatsappBtn = document.getElementById('whatsapp-btn');
        const mapsBtn = document.getElementById('maps-btn');

        if (whatsappBtn) {
            const phone = item['Telefone Comercial'] || item.Celular || '';
            const message = `Olá ${item['Nome Fantasia'] || 'cliente'}! Estou entrando em contato para verificar se podemos retomar nosso relacionamento comercial.`;
            whatsappBtn.href = this.generateWhatsAppLink(phone, message);
            whatsappBtn.style.display = phone ? 'inline-block' : 'none';
        }

        if (mapsBtn) {
            const address = this.getFullAddress(item);
            mapsBtn.href = this.generateMapsLink(address);
            mapsBtn.style.display = address ? 'inline-block' : 'none';
        }

        // Configurar botões de status
        document.getElementById('tornarAtivo').style.display = (tab === 'inativos') ? 'inline-block' : 'none';
        document.getElementById('excluirAtivo').style.display = (tab === 'ativos') ? 'inline-block' : 'none';
        document.getElementById('editDataPedido').style.display = 'none';
        document.getElementById('labelEditDataPedido').style.display = 'none';
        document.getElementById('confirmarAtivo').style.display = 'none';

        // Carregar observações
        const obsTextarea = document.getElementById('observacoes');
        if (obsTextarea) {
            obsTextarea.value = window.dbManager.loadObservation(item.id);
            document.getElementById('observacoes-contador').textContent = obsTextarea.value.length + '/2000';
        }

        document.getElementById('modal').style.display = 'flex';
    }

    // Alternar modo de edição
    toggleEditMode() {
        const displayField = document.getElementById('display-info');
        const editField = document.getElementById('edit-form');
        const editBtn = document.getElementById('editarCliente');
        const saveBtn = document.getElementById('salvarEdicao');
        const cancelBtn = document.getElementById('cancelarEdicao');
        
        if (displayField && editField && editBtn && saveBtn && cancelBtn) {
            displayField.style.display = 'none';
            editField.style.display = 'block';
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
        }
    }

    // Cancelar edição
    cancelarEdicaoCliente() {
        const displayField = document.getElementById('display-info');
        const editField = document.getElementById('edit-form');
        const editBtn = document.getElementById('editarCliente');
        const saveBtn = document.getElementById('salvarEdicao');
        const cancelBtn = document.getElementById('cancelarEdicao');
        
        if (displayField && editField && editBtn && saveBtn && cancelBtn) {
            displayField.style.display = 'block';
            editField.style.display = 'none';
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }

    // Salvar edição do cliente
    async salvarEdicaoCliente() {
        const cliente = this.currentItem;
        if (!cliente) return;
        
        try {
            // Coletar dados editados
            const dadosEditados = {
                'Nome Fantasia': document.getElementById('edit-nome-fantasia')?.value?.trim() || '',
                'Cliente': document.getElementById('edit-cliente')?.value?.trim() || '',
                'CNPJ / CPF': document.getElementById('edit-cnpj-cpf')?.value?.trim() || '',
                'Contato': document.getElementById('edit-contato')?.value?.trim() || '',
                'Telefone Comercial': document.getElementById('edit-telefone-comercial')?.value?.trim() || '',
                'Celular': document.getElementById('edit-celular')?.value?.trim() || '',
                'Email': document.getElementById('edit-email')?.value?.trim() || '',
                'Endereco': document.getElementById('edit-endereco')?.value?.trim() || '',
                'Numero': document.getElementById('edit-numero')?.value?.trim() || '',
                'Bairro': document.getElementById('edit-bairro')?.value?.trim() || '',
                'Cidade': document.getElementById('edit-cidade')?.value?.trim() || '',
                'UF': document.getElementById('edit-uf')?.value?.trim()?.toUpperCase() || '',
                'CEP': document.getElementById('edit-cep')?.value?.trim() || '',
                'Saldo de Credito': document.getElementById('edit-saldo-credito')?.value || '0'
            };
            
            // Validação básica
            if (!dadosEditados['Nome Fantasia']) {
                alert('❌ Nome Fantasia é obrigatório!');
                return;
            }
            
            // Salvar alterações
            await this.editarCliente(cliente.id, dadosEditados);
            
            // Fechar modal
            document.getElementById('modal').style.display = 'none';
            
            // Atualizar interface
            this.applyFiltersAndSort();
            
            alert('✅ Cliente editado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao editar cliente:', error);
            alert('❌ Erro ao editar cliente: ' + error.message);
        }
    }

    // Utilitários
    getFullAddress(item) {
        const parts = [
            item.Endereco || '',
            item.Numero || '',
            item.Bairro || '',
            item.Cidade || '',
            item.UF || '',
            item.CEP || ''
        ].filter(part => part.trim());
        
        return parts.join(', ');
    }

    generateWhatsAppLink(phone, message) {
        if (!phone) return '#';
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    }

    generateMapsLink(address) {
        if (!address) return '#';
        const encodedAddress = encodeURIComponent(address);
        return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }
}

// Função global para exclusão robusta de ativos - NOVA
window.excluirAtivoRobusto = async function(clienteId) {
    try {
        console.log('🗑️ Iniciando exclusão robusta do cliente:', clienteId);
        
        if (!window.clientManager) {
            console.error('❌ ClientManager não encontrado');
            return false;
        }
        
        // Confirmar exclusão
        const cliente = window.clientManager.ativos.find(c => c.id === clienteId);
        if (!cliente) {
            console.error('❌ Cliente não encontrado nos ativos');
            return false;
        }
        
        const nomeCliente = cliente['Nome Fantasia'] || 'Cliente sem nome';
        if (!confirm(`Tem certeza que deseja excluir "${nomeCliente}" dos clientes ativos?`)) {
            return false;
        }
        
        // Executar exclusão
        const sucesso = await window.clientManager.excluirAtivo(cliente);
        
        if (sucesso) {
            console.log('✅ Exclusão robusta concluída com sucesso');
            
            // Atualizar interface imediatamente
            if (typeof renderAtivos === 'function') {
                renderAtivos();
            }
            
            // Fechar modal se estiver aberto
            const modal = document.getElementById('modal');
            if (modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
            
            alert(`✅ Cliente "${nomeCliente}" excluído com sucesso!`);
            return true;
        } else {
            alert('❌ Erro ao excluir cliente');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro na exclusão robusta:', error);
        alert('❌ Erro ao excluir cliente: ' + error.message);
        return false;
    }
};

// Instância global do gerenciador de clientes
window.clientManager = new ClientManager();

console.log('✅ client-manager.js carregado - versão com exclusão robusta corrigida');
