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
            
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
            
            console.log(`📊 Dados carregados:
                🔴 Inativos: ${this.data.length}
                🟢 Ativos: ${this.ativos.length}
                🆕 Novos: ${this.novos.length}
                📅 Agendamentos: ${Object.keys(this.schedules).length}`);
                
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.data = [];
            this.ativos = [];
            this.novos = [];
            this.schedules = {};
            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;
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
            list.innerHTML = '<p class="empty-state">Nenhum cliente encontrado com os filtros aplicados.</p>';
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'inativo');

            const cidade = this.extrairCidadeDoItem(item);

            div.innerHTML = `
                <div class="client-info">
                    <strong>Cliente:</strong> ${item['Nome Fantasia'] || item['Cliente'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Contato:</strong> ${item['Contato'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Celular:</strong> ${item['Celular'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Cidade:</strong> ${cidade || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}
                </div>
            `;

            div.addEventListener('click', () => {
                this.currentItem = item;
                this.currentTab = 'inativos';
                this.openModal(item, 'inativos');
            });

            list.appendChild(div);
        });
    }

    openModal(item, origem = 'inativos') {
        try {
            this.currentItem = item;
            this.currentTab = origem;
            this.editMode = false;
            
            const modal = document.getElementById('modal');
            if (!modal) return;

            this.populateModalFields(item);
            this.configureModalButtons(origem);

            const observacoes = window.dbManager.loadObservation(item.id);
            const obsTextarea = document.getElementById('observacoes');
            if (obsTextarea) {
                obsTextarea.value = observacoes;
                
                const contador = document.getElementById('observacoes-contador');
                if (contador) {
                    contador.textContent = observacoes.length + '/2000';
                }
            }

            modal.style.display = 'block';
            console.log(`📄 Modal aberto para: ${item['Nome Fantasia']} (origem: ${origem})`);
        } catch (error) {
            console.error('❌ Erro ao abrir modal:', error);
        }
    }

    populateModalFields(item) {
        let endereco = '', numero = '', bairro = '', cidade = '', uf = '', cep = '';

        if (item['Endereço']) {
            const enderecoInfo = this.parseEndereco(item['Endereço']);
            endereco = enderecoInfo.endereco;
            numero = enderecoInfo.numero;
            bairro = enderecoInfo.bairro;
            cidade = enderecoInfo.cidade;
            uf = enderecoInfo.uf;
            cep = enderecoInfo.cep;
        }

        if (item['Cidade']) {
            cidade = item['Cidade'];
        }

        const fields = [
            { display: 'display-nome-fantasia', key: 'Nome Fantasia' },
            { display: 'display-cliente', key: 'Cliente' },
            { display: 'display-cnpj-cpf', key: 'CNPJ / CPF' },
            { display: 'display-contato', key: 'Contato' },
            { display: 'display-telefone-comercial', key: 'Telefone Comercial' },
            { display: 'display-celular', key: 'Celular' },
            { display: 'display-email', key: 'Email' },
            { display: 'display-endereco', value: endereco },
            { display: 'display-numero', value: numero },
            { display: 'display-bairro', value: bairro },
            { display: 'display-cidade', value: cidade },
            { display: 'display-uf', value: uf },
            { display: 'display-cep', value: cep }
        ];

        fields.forEach(field => {
            const element = document.getElementById(field.display);
            if (element) {
                let value = field.value !== undefined ? field.value : (item[field.key] || '');
                
                if (!this.editMode) {
                    element.textContent = value || '-';
                } else {
                    this.createEditField(element, field.display, value);
                }
            }
        });
    }

    // Método aprimorado para parsing de endereços com múltiplos formatos
    parseEndereco(endereco) {
        let result = {
            endereco: '',
            numero: '',
            bairro: '',
            cidade: '',
            uf: 'SP',
            cep: ''
        };

        if (!endereco) return result;

        try {
            // Formato 1: Endereço estruturado (quebras de linha)
            if (endereco.includes('\n')) {
                const linhas = endereco.split('\n').map(linha => linha.trim());
                result.uf = linhas[0] || 'SP';
                result.cep = linhas[1] || '';
                result.cidade = linhas[2] || '';
                result.bairro = linhas[3] || '';
                result.numero = linhas[5] || '';
                result.endereco = linhas[6] || '';
                return result;
            }

            // Formato 2: "Avenida X, 300 - Bairro Cidade - SP CEP: XXXXX"
            let match = endereco.match(/^(.+?),?\s*(\d+)?\s*-\s*(.+?)\s*-\s*(\w{2})\s*CEP:\s*(\d{5}-?\d{3})/);
            if (match) {
                const [, rua, numero, cidadeBairro, uf, cep] = match;
                result.endereco = rua.trim();
                result.numero = numero || '';
                result.uf = uf.trim();
                result.cep = cep.trim();
                
                // Tentar separar cidade e bairro
                const cidadeBairroMatch = cidadeBairro.match(/^(.+?)\s+(.+)$/);
                if (cidadeBairroMatch) {
                    result.bairro = cidadeBairroMatch[1].trim();
                    result.cidade = cidadeBairroMatch[2].trim();
                } else {
                    result.cidade = cidadeBairro.trim();
                }
                return result;
            }

            // Formato 3: "Rua X, 65 – Sala 03, Bairro, Cidade, SP, CEP XXXXX"
            match = endereco.match(/^(.+?),\s*(\d+)(?:\s*[–-]\s*(.+?))?,\s*(.+?),\s*(.+?),\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (match) {
                const [, rua, numero, complemento, bairro, cidade, uf, cep] = match;
                result.endereco = rua.trim() + (complemento ? ', ' + complemento.trim() : '');
                result.numero = numero || '';
                result.bairro = bairro.trim();
                result.cidade = cidade.trim();
                result.uf = uf.trim();
                result.cep = cep.replace('‑', '-').trim();
                return result;
            }

            // Formato 4: "Avenida X, 1800 - Bairro Cidade SP CEP: XXXXX"
            match = endereco.match(/^(.+?),\s*(\d+)\s*-\s*(.+?)\s+(\w{2})\s*CEP:\s*(\d{5}-?\d{3})/);
            if (match) {
                const [, rua, numero, cidadeBairro, uf, cep] = match;
                result.endereco = rua.trim();
                result.numero = numero || '';
                result.uf = uf.trim();
                result.cep = cep.trim();
                
                // Assumir que a última palavra é a cidade
                const parts = cidadeBairro.trim().split(/\s+/);
                if (parts.length > 1) {
                    result.cidade = parts.slice(-1)[0];
                    result.bairro = parts.slice(0, -1).join(' ');
                } else {
                    result.cidade = cidadeBairro.trim();
                }
                return result;
            }

            // Formato 5: "Avenida X, 1904\nConjuntos Y, Bairro — Cidade, SP, CEP XX"
            match = endereco.match(/^(.+?),\s*(\d+)\s*(.+?)—\s*(.+?),\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (match) {
                const [, rua, numero, complemento, cidadeBairro, uf, cep] = match;
                result.endereco = rua.trim();
                result.numero = numero || '';
                result.uf = uf.trim();
                result.cep = cep.replace('‑', '-').trim();
                
                // Processar complemento
                const complementoLimpo = complemento.replace('\n', ' ').trim();
                if (complementoLimpo) {
                    result.endereco += ', ' + complementoLimpo;
                }
                
                // Separar cidade e bairro
                const cidadeBairroMatch = cidadeBairro.match(/^(.+?)\s+(.+)$/);
                if (cidadeBairroMatch) {
                    result.bairro = cidadeBairroMatch[1].trim();
                    result.cidade = cidadeBairroMatch[2].trim();
                } else {
                    result.cidade = cidadeBairro.trim();
                }
                return result;
            }

            // Formato 6: "Av. das X, 234 – Bairro, Cidade – SP, CEP XXXXX"
            match = endereco.match(/^(.+?),\s*(\d+)\s*[–-]\s*(.+?),\s*(.+?)\s*[–-]\s*(\w{2}),?\s*CEP\s*(\d{5}[‑-]?\d{3})/);
            if (match) {
                const [, rua, numero, bairro, cidade, uf, cep] = match;
                result.endereco = rua.trim();
                result.numero = numero || '';
                result.bairro = bairro.trim();
                result.cidade = cidade.trim();
                result.uf = uf.trim();
                result.cep = cep.replace('‑', '-').trim();
                return result;
            }

            // Fallback: endereço simples
            result.endereco = endereco;
            
        } catch (error) {
            console.error('❌ Erro ao fazer parse do endereço:', error);
            result.endereco = endereco;
        }

        return result;
    }

    createEditField(element, fieldId, value) {
        const isAddressField = ['display-endereco', 'display-numero', 'display-bairro', 'display-cidade', 'display-uf', 'display-cep'].includes(fieldId);
        
        let inputHtml = `<input type="text" id="edit-${fieldId}" value="${value || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
        
        if (fieldId === 'display-endereco') {
            inputHtml += `
                <button type="button" onclick="window.clientManager.useCurrentLocation('edit-${fieldId}')" 
                        style="margin-top: 5px; background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    📍 Usar Localização Atual
                </button>
            `;
        }
        
        element.innerHTML = inputHtml;
    }

    async useCurrentLocation(fieldId) {
        try {
            console.log('📍 Obtendo localização atual para preenchimento...');
            
            let userLocation = null;
            if (window.mapManager && typeof window.mapManager.getUserLocation === 'function') {
                userLocation = window.mapManager.getUserLocation();
            }
            
            if (!userLocation && navigator.geolocation) {
                userLocation = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            resolve({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            });
                        },
                        (error) => {
                            reject(error);
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                });
            }
            
            if (!userLocation) {
                throw new Error('Não foi possível obter localização');
            }
            
            let addressInfo = null;
            if (window.mapManager && typeof window.mapManager.reverseGeocode === 'function') {
                addressInfo = await window.mapManager.reverseGeocode(userLocation.lat, userLocation.lng);
            }
            
            if (addressInfo) {
                const fieldMappings = {
                    'edit-display-endereco': addressInfo.endereco || '',
                    'edit-display-cidade': addressInfo.cidade || '',
                    'edit-display-uf': addressInfo.uf || '',
                    'edit-display-cep': addressInfo.cep || '',
                    'edit-display-bairro': addressInfo.bairro || ''
                };
                
                Object.entries(fieldMappings).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.value = value;
                    }
                });
                
                window.showSuccessMessage('📍 Localização atual preenchida nos campos de endereço!');
            } else {
                throw new Error('Não foi possível obter endereço da localização');
            }
            
        } catch (error) {
            console.error('❌ Erro ao usar localização atual:', error);
            window.showErrorMessage('Erro ao obter localização: ' + error.message);
        }
    }

    configureModalButtons(origem) {
        const buttons = ['tornarAtivo', 'excluirAtivo', 'editarCliente'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });

        if (origem === 'inativos') {
            const tornarAtivoBtn = document.getElementById('tornarAtivo');
            if (tornarAtivoBtn) tornarAtivoBtn.style.display = 'inline-block';
        } else if (origem === 'ativos') {
            const excluirAtivoBtn = document.getElementById('excluirAtivo');
            if (excluirAtivoBtn) excluirAtivoBtn.style.display = 'inline-block';
        }

        const editarBtn = document.getElementById('editarCliente');
        if (editarBtn) {
            editarBtn.style.display = 'inline-block';
            
            if (this.editMode) {
                editarBtn.textContent = '💾 Salvar Edição';
                editarBtn.onclick = () => this.saveEdit();
            } else {
                editarBtn.textContent = '✏️ Editar';
                editarBtn.onclick = () => this.handleEditarCliente();
            }
        }
    }

    handleEditarCliente() {
        this.editMode = true;
        this.populateModalFields(this.currentItem);
        this.configureModalButtons(this.currentTab);
    }

    async saveEdit() {
        try {
            if (!this.currentItem) return;
            
            const updatedData = {};
            const editFields = {
                'edit-display-nome-fantasia': 'Nome Fantasia',
                'edit-display-cliente': 'Cliente',
                'edit-display-cnpj-cpf': 'CNPJ / CPF',
                'edit-display-contato': 'Contato',
                'edit-display-telefone-comercial': 'Telefone Comercial',
                'edit-display-celular': 'Celular',
                'edit-display-email': 'Email'
            };
            
            Object.entries(editFields).forEach(([fieldId, key]) => {
                const field = document.getElementById(fieldId);
                if (field) {
                    updatedData[key] = field.value.trim();
                }
            });
            
            const enderecoFields = {
                endereco: document.getElementById('edit-display-endereco')?.value.trim() || '',
                numero: document.getElementById('edit-display-numero')?.value.trim() || '',
                bairro: document.getElementById('edit-display-bairro')?.value.trim() || '',
                cidade: document.getElementById('edit-display-cidade')?.value.trim() || '',
                uf: document.getElementById('edit-display-uf')?.value.trim() || 'SP',
                cep: document.getElementById('edit-display-cep')?.value.trim() || ''
            };
            
            // Verificar se o endereço foi alterado
            const enderecoOriginal = this.currentItem['Endereço'] || '';
            const enderecoFormatado = [
                enderecoFields.uf,
                enderecoFields.cep,
                enderecoFields.cidade,
                enderecoFields.bairro,
                '',
                enderecoFields.numero,
                enderecoFields.endereco
            ].join('\n');
            
            updatedData['Endereço'] = enderecoFormatado;
            updatedData['Cidade'] = enderecoFields.cidade;
            
            // Se o endereço foi alterado, marcar para re-geocodificação
            if (enderecoOriginal !== enderecoFormatado) {
                console.log('📍 Endereço alterado, será re-geocodificado no próximo carregamento do mapa');
                this.geocodingNeeded = true;
            }
            
            await this.editarCliente(this.currentItem.id, updatedData);
            this.editMode = false;
            this.closeModal();
            
            if (typeof window.renderAllTabs === 'function') {
                window.renderAllTabs();
            }
            
            // Atualizar mapa se endereço foi alterado
            if (enderecoOriginal !== enderecoFormatado && window.mapManager && typeof window.mapManager.updateMap === 'function') {
                setTimeout(() => {
                    window.mapManager.updateMap(true); // Force refresh para endereços alterados
                }, 500);
            }
            
            window.showSuccessMessage('✅ Cliente editado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao salvar edição:', error);
            window.showErrorMessage('Erro ao salvar edição: ' + error.message);
        }
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.style.display = 'none';
            
            const observacoesTextarea = document.getElementById('observacoes');
            if (observacoesTextarea && this.currentItem) {
                const observacao = observacoesTextarea.value.trim();
                window.dbManager.saveObservation(this.currentItem.id, observacao);
            }
            
            this.editMode = false;
        }
    }

    async tornarAtivo(cliente, novaData) {
        try {
            console.log('🔄 Tornando cliente ativo:', cliente['Nome Fantasia']);

            cliente['Data Ultimo Pedido'] = novaData;
            cliente.Status = 'Ativo';

            this.data = this.data.filter(c => c.id !== cliente.id);
            this.ativos.push(cliente);

            await window.dbManager.saveData('clients', this.data);
            await window.dbManager.saveData('ativos', this.ativos);

            window.data = this.data;
            window.ativos = this.ativos;

            console.log('✅ Cliente tornado ativo com sucesso');
        } catch (error) {
            console.error('❌ Erro ao tornar cliente ativo:', error);
            throw error;
        }
    }

    async excluirAtivo(cliente) {
        try {
            console.log('🗑️ Removendo cliente dos ativos:', cliente['Nome Fantasia']);

            this.ativos = this.ativos.filter(c => c.id !== cliente.id);
            cliente.Status = 'Inativo';
            cliente['Data Ultimo Pedido'] = '';
            this.data.push(cliente);

            await window.dbManager.saveData('ativos', this.ativos);
            await window.dbManager.saveData('clients', this.data);

            window.ativos = this.ativos;
            window.data = this.data;

            console.log('✅ Cliente removido dos ativos');
        } catch (error) {
            console.error('❌ Erro ao excluir cliente ativo:', error);
            throw error;
        }
    }

    async editarCliente(clienteId, dadosEditados) {
        try {
            console.log('✏️ Editando cliente:', clienteId);
            let clienteEncontrado = false;

            this.data = this.data.map(c => {
                if (c.id === clienteId) {
                    clienteEncontrado = true;
                    return { ...c, ...dadosEditados };
                }
                return c;
            });

            this.ativos = this.ativos.map(c => {
                if (c.id === clienteId) {
                    clienteEncontrado = true;
                    return { ...c, ...dadosEditados };
                }
                return c;
            });

            this.novos = this.novos.map(c => {
                if (c.id === clienteId) {
                    clienteEncontrado = true;
                    return { ...c, ...dadosEditados };
                }
                return c;
            });

            if (!clienteEncontrado) {
                throw new Error('Cliente não encontrado');
            }

            await window.dbManager.saveData('clients', this.data);
            await window.dbManager.saveData('ativos', this.ativos);
            await window.dbManager.saveData('novos', this.novos);

            window.data = this.data;
            window.ativos = this.ativos;
            window.novos = this.novos;

            console.log('✅ Cliente editado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao editar cliente:', error);
            throw error;
        }
    }

    async cadastrarCliente(formData) {
        try {
            console.log('➕ Cadastrando novo cliente...');

            const clienteData = {
                id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                'ID Cliente': '',
                'Nome Fantasia': formData.nomeFantasia,
                'Cliente': formData.cliente || formData.nomeFantasia,
                'CNPJ / CPF': formData.cnpjCpf,
                'Contato': formData.contato,
                'Telefone Comercial': formData.telefoneComercial,
                'Celular': formData.celular,
                'Email': formData.email,
                'Endereço': this.formatarEndereco(formData),
                'Status': 'Novo',
                'Segmento': formData.segmento || 'Novo Cliente',
                'Data Cadastro': new Date().toLocaleDateString('pt-BR')
            };
            this.novos.push(clienteData);

            await window.dbManager.saveData('novos', this.novos);
            window.novos = this.novos;

            console.log('✅ Cliente cadastrado com sucesso:', clienteData['Nome Fantasia']);
            return clienteData;
        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            throw error;
        }
    }

    formatarEndereco(formData) {
        const endereco = [
            formData.uf || 'SP',
            formData.cep || '',
            formData.cidade || '',
            formData.bairro || '',
            '',
            formData.numero || '',
            formData.endereco || ''
        ].join('\n');
        return endereco;
    }

    addToAgenda(item, dayOfWeek) {
        try {
            const scheduleId = `schedule-${item.id}-${dayOfWeek}`;
            this.schedules[scheduleId] = {
                id: scheduleId,
                clientId: item.id,
                clientName: item['Nome Fantasia'],
                dayOfWeek: dayOfWeek,
                type: 'visita',
                createdAt: new Date().toISOString()
            };

            window.dbManager.saveData('schedules', this.schedules);
            console.log('📅 Cliente adicionado à agenda:', item['Nome Fantasia'], dayOfWeek);
            return true;
        } catch (error) {
            console.error('❌ Erro ao adicionar à agenda:', error);
            return false;
        }
    }

    removeSchedule(scheduleId) {
        try {
            if (this.schedules[scheduleId]) {
                delete this.schedules[scheduleId];
                window.dbManager.saveData('schedules', this.schedules);
                console.log('🗑️ Agendamento removido:', scheduleId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erro ao remover agendamento:', error);
            return false;
        }
    }

    // Método para extrair cidade do endereço estruturado com tratamento aprimorado
    extrairCidadeDoEndereco(endereco) {
        if (!endereco) return '';

        try {
            // Formato estruturado (quebras de linha)
            if (endereco.includes('\n')) {
                const linhas = endereco.split('\n').map(linha => linha.trim());
                return linhas[2] || '';
            }

            // Formato: "Avenida X, 300 - Bairro Cidade - SP CEP: XXXXX"
            let match = endereco.match(/^.+?-\s*(.+?)\s*-\s*\w{2}\s*CEP:/);
            if (match) {
                const cidadeBairro = match[1].trim();
                // Assumir que a última palavra é a cidade
                const parts = cidadeBairro.split(/\s+/);
                return parts.length > 1 ? parts.slice(-1)[0] : cidadeBairro;
            }

            // Formato: "Rua X, 65 – Sala 03, Bairro, Cidade, SP, CEP XXXXX"
            match = endereco.match(/^.+?,\s*\d+.+?,\s*.+?,\s*(.+?),\s*\w{2},?\s*CEP/);
            if (match) {
                return match[1].trim();
            }

            // Formato: "Av. das X, 234 – Bairro, Cidade – SP, CEP XXXXX"
            match = endereco.match(/^.+?,\s*\d+\s*[–-]\s*.+?,\s*(.+?)\s*[–-]\s*\w{2},?\s*CEP/);
            if (match) {
                return match[1].trim();
            }

            // Fallback: tentar extrair qualquer coisa que pareça uma cidade
            const cepMatch = endereco.match(/CEP/i);
            if (cepMatch) {
                const beforeCep = endereco.substring(0, cepMatch.index).trim();
                const parts = beforeCep.split(/[,-–—]/);
                if (parts.length >= 2) {
                    return parts[parts.length - 2].trim();
                }
            }

            return '';
        } catch (error) {
            console.error('❌ Erro ao extrair cidade do endereço:', error);
            return '';
        }
    }

    // Método para processar dados da planilha
    processarDadosPlanilha(dados) {
        return dados.map((item, index) => {
            // Extrair cidade do endereço se não existir campo cidade separado
            if (!item.Cidade && item['Endereço']) {
                item.Cidade = this.extrairCidadeDoEndereco(item['Endereço']);
            }

            // Garantir ID único
            if (!item.id && item['ID Cliente']) {
                item.id = item['ID Cliente'].toString();
            } else if (!item.id) {
                item.id = `imported-${Date.now()}-${index}`;
            }

            // Normalizar status
            if (item.Status) {
                item.Status = item.Status.trim();
            }

            return item;
        });
    }

    // Verificar se geocodificação é necessária
    needsGeocoding() {
        return this.geocodingNeeded;
    }

    // Marcar geocodificação como concluída
    markGeocodingComplete() {
        this.geocodingNeeded = false;
    }
}

// Inicializar e expor globalmente
if (typeof window !== 'undefined') {
    window.clientManager = new ClientManager();
    
    // Aguardar DOM e inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.clientManager.init(), 100);
        });
    } else {
        setTimeout(() => window.clientManager.init(), 100);
    }
}

console.log('✅ clientManager.js carregado - versão com tratamento aprimorado de endereços');
