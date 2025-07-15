// script.js - Arquivo principal corrigido

let currentTab = 'inativos';

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicação...');
    
    // Inicializar gerenciadores
    try {
        await window.dbManager.init();
        await window.clientManager.init();
        
        // Configurar eventos
        setupEventListeners();
        
        // Configurar PWA
        setupPWA();
        
        // Configurar upload inicial
        setupUploadHandler();
        
        // Aplicar filtros salvos
        applySavedFilters();
        
        // Renderizar interface
        populateCidades();
        renderAtivos();
        renderAgenda();
        
        console.log('✅ Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar aplicação:', error);
    }
});

// Aplicar filtros salvos
function applySavedFilters() {
    const savedFilters = window.dbManager.loadFilters();
    
    if (savedFilters.saldoMin) {
        const saldoFilter = document.getElementById('saldoFilter');
        if (saldoFilter) saldoFilter.value = savedFilters.saldoMin;
    }
    
    if (savedFilters.sort) {
        const sortOption = document.getElementById('sortOption');
        if (sortOption) sortOption.value = savedFilters.sort;
    }
    
    // Aplicar filtros
    window.clientManager.applyFiltersAndSort();
}

// Configurar eventos da interface
function setupEventListeners() {
    // Modal de detalhes
    const closeBtn = document.getElementById('close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('modal').style.display = 'none';
        });
    }

    // Filtros
    const saldoFilter = document.getElementById('saldoFilter');
    if (saldoFilter) {
        saldoFilter.addEventListener('input', () => {
            window.clientManager.applyFiltersAndSort();
            saveFilters();
        });
    }

    const sortOption = document.getElementById('sortOption');
    if (sortOption) {
        sortOption.addEventListener('change', () => {
            window.clientManager.applyFiltersAndSort();
            saveFilters();
        });
    }

    // Seletor de cidades
    const cidadeSelector = document.getElementById('cidadeSelector');
    if (cidadeSelector) {
        cidadeSelector.addEventListener('click', toggleCidades);
    }

    const cidadeList = document.getElementById('cidadeList');
    if (cidadeList) {
        cidadeList.addEventListener('change', () => {
            window.clientManager.applyFiltersAndSort();
            saveFilters();
        });
    }

    // Botão de cadastro
    const cadastrarBtn = document.getElementById('cadastrar-cliente-btn');
    if (cadastrarBtn) {
        cadastrarBtn.addEventListener('click', abrirModalCadastro);
    }

    // Modal de cadastro
    const closeCadastroBtn = document.getElementById('close-cadastro');
    if (closeCadastroBtn) {
        closeCadastroBtn.addEventListener('click', fecharModalCadastro);
    }

    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', handleCadastroSubmit);
    }

    // Observações
    const observacoes = document.getElementById('observacoes');
    if (observacoes) {
        observacoes.addEventListener('input', function() {
            const contador = document.getElementById('observacoes-contador');
            if (contador) {
                contador.textContent = this.value.length + '/2000';
            }
        });
    }

    const salvarObsBtn = document.getElementById('salvarObservacoes');
    if (salvarObsBtn) {
        salvarObsBtn.addEventListener('click', salvarObservacoes);
    }

    // Formatação de data
    const editDataPedido = document.getElementById('editDataPedido');
    if (editDataPedido) {
        editDataPedido.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '').slice(0, 8);
            if (value.length > 4) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
            } else if (value.length > 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            this.value = value;
        });
    }
}

// Configurar PWA
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/pmgagendainativos/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registrado');
                
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            alert('Nova versão disponível, a página será atualizada agora.');
                            window.location.reload();
                        }
                    };
                };
            })
            .catch(error => console.error('❌ Erro ao registrar Service Worker:', error));
    }

    // Botão de instalação
    let deferredPrompt;
    const installBtn = document.getElementById('install-btn');

    function isPWAInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    }

    function updateInstallButton() {
        if (isPWAInstalled()) {
            installBtn.style.display = 'none';
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isPWAInstalled()) {
            installBtn.style.display = 'block';
        }
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        installBtn.style.display = 'none';
        deferredPrompt = null;
    });

    updateInstallButton();
}

// Configurar upload de arquivos
function setupUploadHandler() {
    const xlsxFile = document.getElementById('xlsxFile');
    if (xlsxFile) {
        xlsxFile.addEventListener('change', handleFileUpload);
    }
}

// Manipular upload de arquivo
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande! O limite é 10MB.');
        return;
    }

    console.log('📁 Processando arquivo:', file.name);
    
    // Limpar dados de inativos
    await window.dbManager.clearData('clients');
    window.clientManager.data = [];
    window.data = [];

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const bytes = e.target.result;
            const workbook = XLSX.read(bytes, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

            if (rawData.length <= 1) {
                alert('❌ Arquivo inválido ou vazio!');
                return;
            }

            const headers = rawData[0].map(h => 
                h ? h.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''
            );
            
            const dataRows = rawData.slice(1);
            const processedData = [];

            dataRows.forEach((row, index) => {
                const hasValidData = row.some(cell => cell && cell.toString().trim() !== '');
                if (hasValidData) {
                    let obj = {};
                    headers.forEach((header, j) => {
                        obj[header] = row[j] || '';
                    });
                    obj.id = `inactive-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
                    processedData.push(obj);
                }
            });

            if (processedData.length === 0) {
                alert('❌ Nenhum cliente válido encontrado no arquivo!');
                return;
            }

            // Salvar dados
            window.clientManager.data = processedData;
            window.data = processedData;
            
            await window.dbManager.saveData('clients', processedData);
            
            // Atualizar interface
            populateCidades();
            window.clientManager.applyFiltersAndSort();
            
            alert(`✅ Arquivo carregado com sucesso!\n📊 ${processedData.length} clientes inativos encontrados`);
            
        } catch (error) {
            console.error('❌ Erro ao processar arquivo:', error);
            alert('❌ Erro ao processar o arquivo: ' + error.message);
        }
    };

    reader.readAsBinaryString(file);
}

// Abrir modal de cadastro - MODAL VAZIO
function abrirModalCadastro() {
    document.getElementById('modal-cadastro').style.display = 'flex';
    // Limpar todos os campos do formulário
    document.getElementById('form-cadastro').reset();
    
    // Garantir que todos os campos estão vazios
    document.getElementById('nome-fantasia').value = '';
    document.getElementById('cliente').value = '';
    document.getElementById('cnpj-cpf').value = '';
    document.getElementById('contato').value = '';
    document.getElementById('telefone-comercial').value = '';
    document.getElementById('celular').value = '';
    document.getElementById('email').value = '';
    document.getElementById('endereco').value = '';
    document.getElementById('numero').value = '';
    document.getElementById('bairro').value = '';
    document.getElementById('cidade').value = '';
    document.getElementById('uf').value = '';
    document.getElementById('cep').value = '';
    document.getElementById('saldo-credito').value = '';
    document.getElementById('data-ultimo-pedido').value = '';
    
    // Focar no primeiro campo
    document.getElementById('nome-fantasia').focus();
}

// Fechar modal de cadastro
function fecharModalCadastro() {
    document.getElementById('modal-cadastro').style.display = 'none';
}

// Manipular submissão do formulário de cadastro
async function handleCadastroSubmit(event) {
    event.preventDefault();
    
    const formData = {
        nomeFantasia: document.getElementById('nome-fantasia').value.trim(),
        cliente: document.getElementById('cliente').value.trim(),
        cnpjCpf: document.getElementById('cnpj-cpf').value.trim(),
        contato: document.getElementById('contato').value.trim(),
        telefoneComercial: document.getElementById('telefone-comercial').value.trim(),
        celular: document.getElementById('celular').value.trim(),
        email: document.getElementById('email').value.trim(),
        endereco: document.getElementById('endereco').value.trim(),
        numero: document.getElementById('numero').value.trim(),
        bairro: document.getElementById('bairro').value.trim(),
        cidade: document.getElementById('cidade').value.trim(),
        uf: document.getElementById('uf').value.trim().toUpperCase(),
        cep: document.getElementById('cep').value.trim(),
        saldoCredito: document.getElementById('saldo-credito').value,
        dataUltimoPedido: document.getElementById('data-ultimo-pedido').value
    };

    // Validação básica
    if (!formData.nomeFantasia) {
        alert('❌ Nome Fantasia é obrigatório!');
        document.getElementById('nome-fantasia').focus();
        return;
    }

    try {
        await window.clientManager.cadastrarCliente(formData);
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        
        fecharModalCadastro();
        alert('✅ Cliente cadastrado com sucesso!');
        
    } catch (error) {
        alert('❌ Erro ao cadastrar cliente:\n' + error.message);
    }
}

// Navegação entre abas - CORRIGIDO para mostrar/esconder botão cadastrar
function openTab(tab) {
    console.log(`📂 Abrindo aba: ${tab}`);
    
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tabs button').forEach(el => el.classList.remove('active'));
    
    // Ativar aba selecionada
    const tabContent = document.getElementById(tab + '-content');
    const tabButton = document.querySelector(`button[onclick="openTab('${tab}')"]`);
    
    if (tabContent) tabContent.classList.add('active');
    if (tabButton) tabButton.classList.add('active');
    
    currentTab = tab;
    window.clientManager.currentTab = tab;
    
    // Controlar visibilidade do upload e botão cadastrar - APENAS NA ABA INATIVOS
    const uploadDiv = document.getElementById('upload');
    if (uploadDiv) {
        uploadDiv.style.display = (tab === 'inativos') ? 'block' : 'none';
    }
    
    // Ações específicas por aba
    if (tab === 'inativos') {
        window.clientManager.applyFiltersAndSort();
    } else if (tab === 'ativos') {
        renderAtivos();
    } else if (tab === 'agenda') {
        renderAgenda();
    } else if (tab === 'mapa') {
        console.log('🗺️ Inicializando aba mapa...');
        setTimeout(() => {
            if (typeof window.initMap === 'function') {
                window.initMap();
                setTimeout(() => {
                    if (typeof window.loadMapData === 'function') {
                        window.loadMapData();
                    }
                }, 500);
            }
        }, 100);
    }
}

// Salvar filtros
function saveFilters() {
    const filters = {
        saldoMin: parseFloat(document.getElementById('saldoFilter')?.value) || 0,
        cidadesSelecionadas: Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value),
        sort: document.getElementById('sortOption')?.value || 'nome-az'
    };
    
    window.dbManager.saveFilters(filters);
}

// Popular lista de cidades
function populateCidades() {
    const cidades = [...new Set(window.clientManager.data.map(item => (item['Cidade'] || '').trim()))]
        .filter(c => c)
        .sort((a, b) => a.localeCompare(b, 'pt-BR', {sensitivity: 'base'}));

    const list = document.getElementById('cidadeList');
    if (!list) return;

    list.innerHTML = '';
    cidades.forEach(cidade => {
        const div = document.createElement('div');
        div.innerHTML = `
            <input type="checkbox" id="cidade-${cidade}" value="${cidade}">
            <label for="cidade-${cidade}">${cidade}</label>
        `;
        list.appendChild(div);
    });

    console.log(`🏙️ ${cidades.length} cidades encontradas`);
}

// Alternar visibilidade da lista de cidades
function toggleCidades() {
    const selector = document.getElementById('cidadeSelector');
    const list = document.getElementById('cidadeList');
    if (!selector || !list) return;

    const aberto = list.classList.toggle('visivel');
    list.classList.toggle('escondido', !aberto);
    selector.classList.toggle('aberto', aberto);
    
    document.getElementById('cidadeSelectorText').textContent = 
        aberto ? 'Ocultar cidades' : 'Selecionar cidades';
}

// Renderizar lista de ativos
function renderAtivos() {
    const list = document.getElementById('ativos-list');
    if (!list) return;

    list.innerHTML = '';
    
    if (window.clientManager.ativos.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #666;">Nenhum cliente ativo encontrado</li>';
        return;
    }

    const sortedAtivos = [...window.clientManager.ativos].sort((a, b) => 
        (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || '')
    );

    sortedAtivos.forEach((item, index) => {
        const li = document.createElement('li');
        const daysSinceOrder = window.clientManager.daysSince(item['Data Ultimo Pedido']);
        
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'}</span>
                <span class="days-since">${daysSinceOrder} dias sem pedir</span>
            </div>
        `;
        
        li.addEventListener('click', () => window.clientManager.showDetails(item, 'ativos'));
        list.appendChild(li);
    });
}

// Renderizar agenda
function renderAgenda() {
    const agendaList = document.getElementById('agenda-list');
    if (!agendaList) return;

    agendaList.innerHTML = '';
    
    const schedules = window.clientManager.schedules || {};
    let agendaItems = [];

    Object.entries(schedules).forEach(([id, schArray]) => {
        if (Array.isArray(schArray)) {
            schArray.forEach((sch, schIndex) => {
                const client = [...window.clientManager.data, ...window.clientManager.ativos]
                    .find(c => c.id === id);
                
                if (client && sch.dateTime) {
                    agendaItems.push({
                        dateTime: sch.dateTime,
                        client: client['Nome Fantasia'],
                        tipo: sch.tipo,
                        id,
                        schIndex,
                        clientData: client
                    });
                }
            });
        }
    });

    agendaItems.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    if (agendaItems.length === 0) {
        agendaList.innerHTML = '<div style="text-align: center; color: #666;">Nenhum agendamento encontrado</div>';
        return;
    }

    agendaItems.forEach(item => {
        const dt = new Date(item.dateTime);
        const dataStr = isNaN(dt) ? 'Data inválida' : 
            dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        const div = document.createElement('div');
        div.style.cssText = 'cursor: pointer; margin: 10px 0; padding: 10px; background: #fff; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;';
        
        div.innerHTML = `
            <span>${dataStr} - ${item.client} (${item.tipo})</span>
            <button onclick="removeAgendamento('${item.id}', ${item.schIndex})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                Remover
            </button>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                window.clientManager.showDetails(item.clientData, 'agenda');
            }
        });
        
        agendaList.appendChild(div);
    });
}

// Salvar agendamento
async function salvarAgendamento() {
    if (!window.clientManager.currentItem) return;

    const dia = document.getElementById('diaSemana').value;
    const horario = document.getElementById('horario').value;
    const tipo = document.getElementById('tipo').value;
    const repeticao = document.getElementById('repeticao').value;

    if (!dia || !horario || !tipo) {
        alert('Por favor, preencha todos os campos do agendamento.');
        return;
    }

    const agendamento = {
        dia,
        horario,
        tipo,
        repeticao,
        dateTime: calcularProximaData(dia, horario)
    };

    const clientId = window.clientManager.currentItem.id;
    
    if (!window.clientManager.schedules[clientId]) {
        window.clientManager.schedules[clientId] = [];
    }
    
    window.clientManager.schedules[clientId].push(agendamento);
    
    await window.dbManager.saveData('schedules', window.clientManager.schedules);
    
    alert('Agendamento salvo com sucesso!');
    renderAgenda();
}

// Calcular próxima data baseada no dia da semana
function calcularProximaData(diaSemana, horario) {
    const dias = {
        'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3,
        'Quinta': 4, 'Sexta': 5, 'Sábado': 6
    };

    const hoje = new Date();
    const diaAlvo = dias[diaSemana];
    const diasAteAlvo = (diaAlvo + 7 - hoje.getDay()) % 7;
    
    const proximaData = new Date(hoje);
    proximaData.setDate(hoje.getDate() + (diasAteAlvo || 7));
    
    const [hora, minuto] = horario.split(':');
    proximaData.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    
    return proximaData.toISOString();
}

// Remover agendamento
async function removeAgendamento(clientId, schIndex) {
    if (window.clientManager.schedules[clientId] && window.clientManager.schedules[clientId][schIndex]) {
        window.clientManager.schedules[clientId].splice(schIndex, 1);
        
        if (window.clientManager.schedules[clientId].length === 0) {
            delete window.clientManager.schedules[clientId];
        }
        
        await window.dbManager.saveData('schedules', window.clientManager.schedules);
        renderAgenda();
    }
}

// Tornar cliente ativo
async function tornarAtivo() {
    if (!window.clientManager.currentItem) return;

    const editDataPedido = document.getElementById('editDataPedido');
    const confirmarAtivo = document.getElementById('confirmarAtivo');
    const tornarAtivo = document.getElementById('tornarAtivo');
    const labelEditDataPedido = document.getElementById('labelEditDataPedido');

    if (editDataPedido.style.display === 'none') {
        editDataPedido.style.display = 'inline-block';
        confirmarAtivo.style.display = 'inline-block';
        tornarAtivo.style.display = 'none';
        labelEditDataPedido.style.display = 'inline-block';
        editDataPedido.focus();
    }
}

// Confirmar cliente ativo
async function confirmarAtivo() {
    if (!window.clientManager.currentItem) return;

    const novaData = document.getElementById('editDataPedido').value;
    
    if (!novaData || !/^\d{2}\/\d{2}\/\d{4}$/.test(novaData)) {
        alert('Por favor, insira uma data válida no formato DD/MM/AAAA.');
        return;
    }

    try {
        await window.clientManager.tornarAtivo(window.clientManager.currentItem, novaData);
        
        // Atualizar interface
        window.clientManager.applyFiltersAndSort();
        renderAtivos();
        
        // Atualizar mapa se necessário
        if (typeof window.updateMapOnClientStatusChange === 'function') {
            window.updateMapOnClientStatusChange();
        }
        
        document.getElementById('modal').style.display = 'none';
        alert('✅ Cliente tornado ativo com sucesso!');
        
    } catch (error) {
        alert('❌ Erro ao tornar cliente ativo: ' + error.message);
    }
}

// Excluir cliente dos ativos
async function excluirAtivo() {
    if (!window.clientManager.currentItem) return;

    if (confirm('Tem certeza que deseja excluir este cliente dos ativos?')) {
        try {
            await window.clientManager.excluirAtivo(window.clientManager.currentItem);
            
            renderAtivos();
            
            // Atualizar mapa se necessário
            if (typeof window.updateMapOnClientStatusChange === 'function') {
                window.updateMapOnClientStatusChange();
            }
            
            document.getElementById('modal').style.display = 'none';
            alert('✅ Cliente removido dos ativos com sucesso!');
            
        } catch (error) {
            alert('❌ Erro ao remover cliente: ' + error.message);
        }
    }
}

// Salvar observações
function salvarObservacoes() {
    if (!window.clientManager.currentItem) return;

    const observacoes = document.getElementById('observacoes').value;
    window.dbManager.saveObservation(window.clientManager.currentItem.id, observacoes);
    alert('✅ Observações salvas com sucesso!');
}

// Fechar modal ao clicar fora
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    const modalCadastro = document.getElementById('modal-cadastro');
    
    if (event.target === modal) {
        modal.style.display = 'none';
    }
    
    if (event.target === modalCadastro) {
        modalCadastro.style.display = 'none';
    }
});

// Disponibilizar funções globalmente
window.openTab = openTab;
window.salvarAgendamento = salvarAgendamento;
window.removeAgendamento = removeAgendamento;
window.tornarAtivo = tornarAtivo;
window.confirmarAtivo = confirmarAtivo;
window.excluirAtivo = excluirAtivo;
window.salvarObservacoes = salvarObservacoes;
window.abrirModalCadastro = abrirModalCadastro;
window.fecharModalCadastro = fecharModalCadastro;
