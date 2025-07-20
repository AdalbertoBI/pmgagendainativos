// script.js - Sistema com renderizaÃo corrigida

let currentTab = 'inativos';
let dataLoaded = false;

// InicializaÃo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ðŸš€ Inicializando sistema PMG Agenda...');
    
    try {
        // Aguardar bibliotecas
        await waitForLibraries();
        
        // Inicializar componentes
        await window.dbManager.init();
        await window.clientManager.init();
        
        dataLoaded = true;
        
        // Configurar interface
        setupEventListeners();
        setupPWA();
        
        // Renderizar dados se disponÃ­veis
        if (hasData()) {
            populateCidades();
            renderCurrentTab();
            updateHeaderStats();
        }
        
        // Atualizar status
        updateSystemStatus(true);
        console.log(' Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('Erro na inicializaÃo:', error);
        updateSystemStatus(false, error.message);
        alert('Erro ao inicializar o sistema. Verifique o console para detalhes.');
    }
});

// Aguardar bibliotecas carregarem
async function waitForLibraries() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while ((!window.XLSX || !window.L) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        
        if (attempts % 10 === 0) {
            console.log(`â³ Aguardando bibliotecas... (${attempts}/${maxAttempts})`);
        }
    }
    
    if (!window.XLSX || !window.L) {
        throw new Error('Bibliotecas no carregaram corretamente');
    }
    
    console.log(' Bibliotecas carregadas: XLSX e Leaflet');
}

// Verificar se hÃ¡ dados
function hasData() {
    return window.clientManager && 
           (window.clientManager.data.length > 0 || 
            window.clientManager.ativos.length > 0 || 
            window.clientManager.novos.length > 0);
}

// Atualizar estatÃ­sticas do cabeÃalho
function updateHeaderStats() {
    if (!window.clientManager) return;
    
    try {
        const stats = window.clientManager.getStats();
        
        // Atualizar contadores no cabeÃalho
        updateElement('total-clientes', stats.totalClientes);
        updateElement('total-ativos', stats.totalAtivos);
        updateElement('total-novos', stats.totalNovos);
        updateElement('total-inativos', stats.totalInativos);
        
        // Atualizar contadores nas abas
        updateElement('count-ativos', stats.totalAtivos);
        updateElement('count-novos', stats.totalNovos);
        updateElement('count-inativos', stats.totalInativos);
        
        // Atualizar contador da agenda
        window.clientManager.carregarAgendamentos().then(agendamentos => {
            updateElement('count-agenda', agendamentos.length);
        }).catch(() => {
            updateElement('count-agenda', 0);
        });
        
        console.log('ðŸ“Š EstatÃ­sticas atualizadas:', stats);
    } catch (error) {
        console.error('Erro ao atualizar estatÃ­sticas:', error);
    }
}

// Atualizar elemento por ID
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value || '0';
    }
}

// Atualizar status do sistema
function updateSystemStatus(online, errorMessage = '') {
    const indicator = document.getElementById('status-indicator');
    if (!indicator) return;
    
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');
    
    if (online) {
        dot.className = 'status-dot online';
        text.textContent = 'Sistema Online';
        indicator.title = 'Sistema funcionando normalmente';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Sistema Offline';
        indicator.title = errorMessage || 'Sistema com problemas';
    }
}

// Renderizar aba atual - CORRIGIDO
function renderCurrentTab() {
    try {
        console.log(`ðŸ“‚ Renderizando aba: ${currentTab}`);
        
        switch(currentTab) {
            case 'inativos':
                if (window.clientManager.applyFiltersAndSort) {
                    window.clientManager.applyFiltersAndSort();
                }
                break;
                
            case 'novos':
                renderNovos();
                break;
                
            case 'ativos':
                renderAtivos();
                break;
                
            case 'agenda':
                renderAgenda();
                break;
                
            case 'mapa':
                // Inicializar mapa com delay para garantir que a aba estÃ¡ visÃ­vel
                setTimeout(() => {
                    if (typeof window.initMap === 'function') {
                        window.initMap();
                    }
                }, 200);
                break;
        }
        
        // Atualizar estatÃ­sticas apÃ³s renderizaÃo
        updateHeaderStats();
        
    } catch (error) {
        console.error('Erro ao renderizar aba:', error);
    }
}

// Renderizar novos - CORRIGIDO
function renderNovos() {
    console.log('ðŸ†• Renderizando clientes novos...');
    
    const list = document.getElementById('novos-list');
    if (!list) {
        console.warn('âš ï¸ Elemento novos-list no encontrado');
        return;
    }
    
    list.innerHTML = '';
    
    if (!window.clientManager || !window.clientManager.novos || window.clientManager.novos.length === 0) {
        list.innerHTML = '<div class="empty-message">Nenhum cliente novo encontrado</div>';
        return;
    }
    
    // Renderizar em lotes para melhor performance
    const fragment = document.createDocumentFragment();
    
    window.clientManager.novos.forEach(item => {
        const li = createClientListItem(item, 'novos');
        fragment.appendChild(li);
    });
    
    list.appendChild(fragment);
    console.log(` ${window.clientManager.novos.length} clientes novos renderizados`);
}

// Renderizar ativos - CORRIGIDO
function renderAtivos() {
    console.log(' Renderizando clientes ativos...');
    
    const list = document.getElementById('ativos-list');
    if (!list) {
        console.warn('âš ï¸ Elemento ativos-list no encontrado');
        return;
    }
    
    list.innerHTML = '';
    
    if (!window.clientManager || !window.clientManager.ativos || window.clientManager.ativos.length === 0) {
        list.innerHTML = '<div class="empty-message">Nenhum cliente ativo encontrado</div>';
        return;
    }
    
    // Renderizar em lotes para melhor performance
    const fragment = document.createDocumentFragment();
    
    window.clientManager.ativos.forEach(item => {
        const li = createClientListItem(item, 'ativos');
        fragment.appendChild(li);
    });
    
    list.appendChild(fragment);
    console.log(` ${window.clientManager.ativos.length} clientes ativos renderizados`);
}

// Renderizar agenda
function renderAgenda() {
    console.log('Renderizando agenda...');
    
    const list = document.getElementById('agenda-list');
    if (!list) {
        console.warn('âš ï¸ Elemento agenda-list no encontrado');
        return;
    }
    
    list.innerHTML = '';
    
    if (window.clientManager && window.clientManager.carregarAgendamentos) {
        window.clientManager.carregarAgendamentos()
            .then(agendamentos => {
                if (agendamentos.length === 0) {
                    list.innerHTML = '<div class="empty-message">Nenhum agendamento encontrado</div>';
                    return;
                }
                
                const fragment = document.createDocumentFragment();
                
                agendamentos.forEach(agendamento => {
                    const div = document.createElement('div');
                    div.className = 'agenda-item';
                    div.innerHTML = `
                        <div class="agenda-header">
                            <strong>${agendamento.nomeFantasia}</strong>
                            <span class="agenda-status">${agendamento.tipo || 'Visita'}</span>
                        </div>
                        <div class="agenda-details">
                            <div>${agendamento.dia} - ${agendamento.horario}</div>
                            <div> ${agendamento.cidade || 'N/A'}</div>
                            <div>${agendamento.contato || 'N/A'}</div>
                        </div>
                        <div class="agenda-actions">
                            <button class="btn-small save-btn" onclick="window.clientManager?.concluirAgendamento('${agendamento.id}')">
                                 Concluir
                            </button>
                            <button class="btn-small cancel-btn" onclick="window.clientManager?.removerAgendamento('${agendamento.id}')">
                                Remover
                            </button>
                        </div>
                    `;
                    fragment.appendChild(div);
                });
                
                list.appendChild(fragment);
                console.log(` ${agendamentos.length} agendamentos renderizados`);
            })
            .catch(error => {
                console.error('Erro ao carregar agendamentos:', error);
                list.innerHTML = '<div class="error-message">Erro ao carregar agendamentos</div>';
            });
    } else {
        list.innerHTML = '<div class="empty-message">Sistema de agendamento indisponÃ­vel</div>';
    }
}

// Criar item da lista - CORRIGIDO
function createClientListItem(item, source) {
    const li = document.createElement('li');
    li.onclick = () => {
        if (window.clientManager && window.clientManager.openModal) {
            window.clientManager.openModal(item, source);
        }
    };
    
    const nomeFantasia = item['Nome Fantasia'] || 'N/A';
    const cidade = item['Cidade'] || 'N/A';
    const contato = item['Contato'] || 'N/A';
    const celular = item['Celular'] || 'N/A';
    const segmento = item['Segmento'] || 'N/A';
    
    li.innerHTML = `
        <div class="client-info">
            <strong>${nomeFantasia}</strong>
            <div class="client-details">
                <div>${segmento}</div>
                <div>${cidade}</div>
                <div> ${contato}</div>
                <div>${celular}</div>
            </div>
        </div>
    `;
    
    return li;
}

// Configurar eventos
function setupEventListeners() {
    try {
        // Upload
        const xlsxFile = document.getElementById('xlsxFile');
        if (xlsxFile) {
            xlsxFile.addEventListener('change', handleFileUpload);
        }
        
        // Modal
        setupModalEvents();
        
        // Filtros
        setupFilterEvents();
        
        // BotÃµes de aÃo
        setupActionButtons();
        
        // Cadastro
        setupCadastroEvents();
        
        // ExportaÃo
        setupExportEvents();
        
        console.log(' Eventos configurados');
    } catch (error) {
        console.error('Erro ao configurar eventos:', error);
    }
}

// Configurar eventos de modal - CORRIGIDO
function setupModalEvents() {
    // Modal de detalhes
    const modal = document.getElementById('clientModal');
    const modalCadastro = document.getElementById('cadastroModal');
    
    // Fechar modais ao clicar no X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            if (modalCadastro) modalCadastro.style.display = 'none';
        });
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === modalCadastro) {
            modalCadastro.style.display = 'none';
        }
    });
    
    // Contador de observaÃÃµes
    const observacoesTextarea = document.getElementById('observacoes-textarea');
    const observacoesCount = document.getElementById('observacoes-count');
    
    if (observacoesTextarea && observacoesCount) {
        observacoesTextarea.addEventListener('input', () => {
            const length = observacoesTextarea.value.length;
            observacoesCount.textContent = `${length}/1000`;
        });
    }
}

// Configurar eventos de filtro
function setupFilterEvents() {
    const sortOption = document.getElementById('sortOption');
    const cidadeSelector = document.getElementById('cidadeSelector');
    const cidadeList = document.getElementById('cidadeList');
    
    if (sortOption) {
        sortOption.addEventListener('change', () => {
            if (window.clientManager && window.clientManager.applyFiltersAndSort) {
                window.clientManager.applyFiltersAndSort();
            }
        });
    }
    
    if (cidadeSelector && cidadeList) {
        cidadeSelector.addEventListener('click', () => {
            cidadeList.classList.toggle('escondido');
            cidadeList.classList.toggle('visivel');
        });
    }
}

// Upload de arquivo - CORRIGIDO
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande! Limite: 10MB');
        return;
    }
    
    console.log('ðŸ“ Processando planilha:', file.name);
    updateSystemStatus(false, 'Processando planilha...');
    
    try {
        const bytes = await readFileAsArrayBuffer(file);
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        if (rawData.length <= 1) {
            alert('Arquivo invÃ¡lido ou vazio!');
            updateSystemStatus(true);
            return;
        }
        
        const headers = rawData[0].map(h => h ? h.toString().trim() : '');
        const dataRows = rawData.slice(1);
        
        console.log('ðŸ“‹ Headers encontrados:', headers);
        
        // Processar dados
        const clientesAtivos = [];
        const clientesInativos = [];
        const clientesNovos = [];
        
        dataRows.forEach((row, index) => {
            const hasValidData = row.some(cell => cell && cell.toString().trim() !== '');
            if (!hasValidData) return;
            
            let cliente = {};
            headers.forEach((header, j) => {
                cliente[header] = row[j] ? row[j].toString().trim() : '';
            });
            
            cliente.id = `client-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
            
            // Parsing de endereÃo
            const enderecoRaw = cliente['EndereÃo'] || '';
            if (enderecoRaw) {
                const enderecoParsed = parseEnderecoMultiLinha(enderecoRaw);
                Object.assign(cliente, enderecoParsed);
                cliente['EnderecoCompleto'] = enderecoRaw;
            }
            
            cliente['Data Cadastro'] = formatDate(new Date());
            
            // Classificar por status
            const status = (cliente.Status || '').toString().trim().toLowerCase();
            if (status === 'ativo') {
                clientesAtivos.push(cliente);
            } else if (status === 'novo') {
                clientesNovos.push(cliente);
            } else {
                clientesInativos.push(cliente);
            }
        });
        
        // LIMPAR TODOS OS CACHES antes de carregar novos dados
        await window.dbManager.clearData('clients');
        await window.dbManager.clearData('ativos');
        await window.dbManager.clearData('novos');
        
        // Limpar cache do mapa
        if (window.clearMapCache) {
            window.clearMapCache();
        }
        
        // Salvar novos dados
        if (clientesInativos.length > 0) {
            await window.dbManager.saveArrayData('clients', clientesInativos);
        }
        
        if (clientesAtivos.length > 0) {
            await window.dbManager.saveArrayData('ativos', clientesAtivos);
        }
        
        if (clientesNovos.length > 0) {
            await window.dbManager.saveArrayData('novos', clientesNovos);
        }
        
        // Atualizar ClientManager
        window.clientManager.data = clientesInativos;
        window.clientManager.ativos = clientesAtivos;
        window.clientManager.novos = clientesNovos;
        
        // Invalidar cache do mapa
        window.clientManager.invalidateMapCache();
        
        // Atualizar variÃ¡veis globais
        window.data = clientesInativos;
        window.ativos = clientesAtivos;
        window.novos = clientesNovos;
        
        dataLoaded = true;
        
        // Atualizar interface
        populateCidades();
        renderCurrentTab();
        updateHeaderStats();
        updateSystemStatus(true);
        
        const totalClientes = clientesAtivos.length + clientesInativos.length + clientesNovos.length;
        
        alert(` Planilha carregada com sucesso!\ Total: ${totalClientes} clientes\ Ativos: ${clientesAtivos.length}\ Inativos: ${clientesInativos.length}\• Novos: ${clientesNovos.length}\n\Os marcadores do mapa sero atualizados automaticamente.`);
        
    } catch (error) {
        console.error('Erro ao processar planilha:', error);
        alert('Erro ao processar arquivo: ' + error.message);
        updateSystemStatus(true);
    }
}

// NavegaÃo entre abas - CORRIGIDO
function openTab(tab) {
    console.log(`ðŸ“‚ Abrindo aba: ${tab}`);
    
    try {
        // Remover classe active
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
        
        // Ativar aba selecionada
        const tabContent = document.getElementById(tab + '-content');
        const tabButton = document.querySelector(`[data-tab="${tab}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');
        
        currentTab = tab;
        
        if (window.clientManager) {
            window.clientManager.currentTab = tab;
        }
        
        // Controlar visibilidade do upload
        const uploadDiv = document.getElementById('upload');
        if (uploadDiv) {
            uploadDiv.style.display = (tab === 'inativos') ? 'block' : 'none';
        }
        
        // Renderizar conteÃºdo
        if (dataLoaded) {
            renderCurrentTab();
        }
        
        // Inicializar mapa se necessÃ¡rio e verificar cache
        if (tab === 'mapa') {
            setTimeout(() => {
                if (typeof window.initMap === 'function') {
                    window.initMap();
                    
                    // Verificar se precisa atualizar marcadores
                    if (window.clientManager && window.clientManager.needsMapUpdate()) {
                        if (window.forceUpdateMarkers) {
                            window.forceUpdateMarkers();
                        }
                        window.clientManager.validateMapCache();
                    }
                }
            }, 200);
        }
        
    } catch (error) {
        console.error('Erro ao abrir aba:', error);
    }
}

// FunÃÃµes auxiliares
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
    });
}

function parseEnderecoMultiLinha(enderecoRaw) {
    if (!enderecoRaw) return {};
    
    const linhas = enderecoRaw.split(/[\n\r]+/).map(linha => linha.trim()).filter(linha => linha);
    
    let resultado = {
        Endereco: '',
        Numero: '',
        Bairro: '',
        Cidade: 'So JosÃ© dos Campos',
        UF: 'SP',
        CEP: ''
    };
    
    linhas.forEach((linha) => {
        // CEP
        const cepMatch = linha.match(/\b\d{8}\b/);
        if (cepMatch && !resultado.CEP) {
            resultado.CEP = cepMatch[0];
            return;
        }
        
        // UF
        if (/^SP$/i.test(linha.trim())) {
            resultado.UF = 'SP';
            return;
        }
        
        // Cidade
        if (linha.toLowerCase().includes('so josÃ© dos campos') ||
            linha.toLowerCase().includes('sjc')) {
            resultado.Cidade = 'So JosÃ© dos Campos';
            return;
        }
        
        // NÃºmero (linha que comeÃa com nÃºmero)
        const numeroMatch = linha.match(/^\d+/);
        if (numeroMatch && !resultado.Numero) {
            resultado.Numero = numeroMatch[0];
            resultado.Endereco = linha.replace(/^\d+\s*/, '').trim();
            return;
        }
        
        // Rua/Avenida (linha que contÃ©m Rua, Av, Avenida)
        if ((linha.toLowerCase().includes('rua ') || 
             linha.toLowerCase().includes('av ') || 
             linha.toLowerCase().includes('avenida ')) && !resultado.Endereco) {
            resultado.Endereco = linha;
            return;
        }
        
        // Bairro (outras linhas que no so cidade/uf/cep)
        if (!resultado.Bairro && linha.length > 3) {
            resultado.Bairro = linha;
        }
    });
    
    return resultado;
}

function formatDate(date) {
    if (!date) return '';
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('pt-BR');
}

function populateCidades() {
    if (!dataLoaded || !window.clientManager) return;
    
    try {
        const todasCidades = [
            ...(window.clientManager.data || []).map(item => (item['Cidade'] || '').trim()),
            ...(window.clientManager.ativos || []).map(item => (item['Cidade'] || '').trim()),
            ...(window.clientManager.novos || []).map(item => (item['Cidade'] || '').trim())
        ];
        
        const cidades = [...new Set(todasCidades)]
            .filter(c => c)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        
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
        
        console.log(`${cidades.length} cidades carregadas`);
    } catch (error) {
        console.error('Erro ao popular cidades:', error);
    }
}

// Configurar outros eventos
function setupActionButtons() {
    // Implementado conforme necessÃ¡rio pelos outros mÃ³dulos
}

function setupCadastroEvents() {
    // Implementado conforme necessÃ¡rio pelos outros mÃ³dulos
}

function setupExportEvents() {
    // Implementado conforme necessÃ¡rio pelos outros mÃ³dulos
}

// PWA
function setupPWA() {
    try {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(() => console.log(' Service Worker registrado'))
                .catch(error => console.error('Erro SW:', error));
        }
        
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');
        
        if (installBtn) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                installBtn.style.display = 'block';
            });
            
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                }
                deferredPrompt = null;
            });
        }
    } catch (error) {
        console.error('Erro ao configurar PWA:', error);
    }
}

// Disponibilizar globalmente
window.openTab = openTab;

console.log(' script.js carregado - verso corrigida com renderizaÃo funcional');
