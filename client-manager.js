// client-manager.js - Gerenciamento de clientes e formulários
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

            // Salvar no banco
            await window.dbManager.saveData('clients', this.data);

            console.log('✅ Cliente cadastrado:', clientData['Nome Fantasia']);
            return clientData;

        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            throw error;
        }
    }

    // Tornar cliente ativo
    async tornarAtivo(cliente, novaData = null) {
        try {
            // Remover da lista de inativos
            const index = this.data.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                this.data.splice(index, 1);
            }

            // Adicionar à lista de ativos
            if (novaData) {
                cliente['Data Ultimo Pedido'] = novaData;
            }
            cliente.isAtivo = true;
            this.ativos.push(cliente);

            // Salvar no banco
            await window.dbManager.saveData('clients', this.data);
            await window.dbManager.saveData('ativos', this.ativos);

            // Atualizar variáveis globais
            window.data = this.data;
            window.ativos = this.ativos;

            console.log('✅ Cliente tornado ativo:', cliente['Nome Fantasia']);
            return cliente;

        } catch (error) {
            console.error('❌ Erro ao tornar cliente ativo:', error);
            throw error;
        }
    }

    // Excluir cliente dos ativos
    async excluirAtivo(cliente) {
        try {
            const index = this.ativos.findIndex(c => c.id === cliente.id);
            if (index !== -1) {
                this.ativos.splice(index, 1);
                await window.dbManager.saveData('ativos', this.ativos);
                window.ativos = this.ativos;
                console.log('✅ Cliente removido dos ativos:', cliente['Nome Fantasia']);
            }
        } catch (error) {
            console.error('❌ Erro ao excluir cliente ativo:', error);
            throw error;
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

    // Abrir modal de detalhes
    openModal(item, tab) {
        this.currentItem = item;
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>${item['Nome Fantasia'] || 'Sem Nome'}</h2>
            <p><strong>Cliente:</strong> ${item.Cliente || ''}</p>
            <p><strong>CNPJ/CPF:</strong> ${item['CNPJ / CPF'] || ''}</p>
            <p><strong>Contato:</strong> ${item.Contato || ''}</p>
            <p><strong>Telefone Comercial:</strong> ${item['Telefone Comercial'] || ''}</p>
            <p><strong>Celular:</strong> ${item.Celular || ''}</p>
            <p><strong>Email:</strong> ${item.Email || ''}</p>
            <p><strong>Saldo de Crédito:</strong> ${item['Saldo de Credito'] || ''}</p>
            <p><strong>Data Último Pedido:</strong> ${this.formatDateUS2BR(item['Data Ultimo Pedido']) || ''}</p>
            <p><strong>Cidade:</strong> ${item.Cidade || ''}</p>
            <p><strong>Endereço Completo:</strong> ${this.getFullAddress(item)}</p>
        `;

        // Configurar botões
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

        // Configurar botões de ação
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

// Instância global do gerenciador de clientes
window.clientManager = new ClientManager();
