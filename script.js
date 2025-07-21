// script.js - Arquivo principal com filtros recolhíveis e geocodificação inteligente

let currentTab = 'inativos';
let isSystemReady = false;

// Aguardar DOM e inicializar sistema
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando sistema PMG Agenda Inativos...');
        
        showLoadingIndicator();
        await initializeSystem();
        
        console.log('✅ Sistema inicializado com sucesso!');
        isSystemReady = true;
        
        hideLoadingIndicator();
        
    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        showErrorMessage('Erro ao inicializar sistema: ' + error.message);
        await initializeBasicSystem();
    }
});

// Mostrar indicador de carregamento
function showLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Inicializando sistema...</p>
            <small>Aguarde enquanto carregamos todos os recursos...</small>
        </div>
    `;
    document.body.appendChild(indicator);
}

// Esconder indicador de carregamento
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Inicializar sistema completo
async function initializeSystem() {
    try {
        console.log('🔧 Inicializando componentes...');
        
        if (window.dbManager) {
            await window.dbManager.init();
            console.log('✅ DBManager inicializado');
        }
        
        if (window.clientManager) {
            if (!window.clientManager.initialized) {
                await window.clientManager.init();
            }
            console.log('✅ ClientManager inicializado');
        }
        
        setupEventListeners();
        console.log('✅ Event listeners configurados');
        
        renderAllTabs();
        console.log('✅ Dados iniciais renderizados');
        
        updateCityFilter();
        console.log('✅ Filtros de cidades atualizados');
        
    } catch (error) {
        console.error('❌ Erro na inicialização do sistema:', error);
        throw error;
    }
}

// Inicialização básica em caso de erro
async function initializeBasicSystem() {
    try {
        console.log('⚠️ Inicializando sistema básico...');
        
        setupEventListeners();
        
        const container = document.querySelector('.container');
        if (container) {
            const warning = document.createElement('div');
            warning.innerHTML = `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; color: #856404;">
                    <h4>⚠️ Sistema em modo básico</h4>
                    <p>Alguns recursos podem não estar disponíveis. Tente recarregar a página.</p>
                </div>
            `;
            container.insertBefore(warning, container.firstChild);
        }
        
        hideLoadingIndicator();
    } catch (error) {
        console.error('❌ Erro na inicialização básica:', error);
        hideLoadingIndicator();
    }
}

// Configurar event listeners
function setupEventListeners() {
    try {
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.querySelector('.upload-area');
        
        if (fileInput) {
            fileInput.addEventListener('change', handleFileUpload);
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('drop', handleFileDrop);
            uploadArea.addEventListener('dragleave', handleDragLeave);
        }
        
        const sortOption = document.getElementById('sortOption');
        if (sortOption) {
            sortOption.addEventListener('change', applyFilters);
        }
        
        const observacoesTextarea = document.getElementById('observacoes');
        if (observacoesTextarea) {
            observacoesTextarea.addEventListener('input', updateCharCounter);
        }
        
        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }
        
        console.log('👂 Event listeners configurados');
        
    } catch (error) {
        console.error('❌ Erro ao configurar event listeners:', error);
    }
}

// Drag and Drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

// Processar upload de arquivo
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Processar arquivo Excel
async function processFile(file) {
    try {
        console.log('📁 Processando arquivo:', file.name);
        showLoadingIndicator();
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length === 0) {
                    throw new Error('Planilha vazia ou sem dados válidos');
                }
                
                console.log(`📊 ${jsonData.length} registros encontrados na planilha`);
                
                await processSpreadsheetData(jsonData);
                
                showSuccessMessage(`✅ Planilha processada! ${jsonData.length} registros carregados.`);
                
            } catch (error) {
                console.error('❌ Erro ao processar planilha:', error);
                showErrorMessage('Erro ao processar planilha: ' + error.message);
            } finally {
                hideLoadingIndicator();
            }
        };
        
        reader.onerror = () => {
            hideLoadingIndicator();
            showErrorMessage('Erro ao ler arquivo');
        };
        
        reader.readAsArrayBuffer(file);
        
    } catch (error) {
        console.error('❌ Erro no processamento do arquivo:', error);
        showErrorMessage('Erro ao processar arquivo: ' + error.message);
        hideLoadingIndicator();
    }
}

// Processar dados da planilha
async function processSpreadsheetData(data) {
    try {
        if (!window.clientManager) {
            throw new Error('ClientManager não inicializado');
        }
        
        console.log('🔄 Processando dados da planilha...');
        
        // Marcar que geocodificação será necessária para nova planilha
        window.clientManager.markGeocodingNeeded();
        
        const processedData = window.clientManager.processarDadosPlanilha(data);
        
        const inativos = [];
        const ativos = [];
        const novos = [];
        
        processedData.forEach(item => {
            switch (item.Status?.trim().toLowerCase()) {
                case 'ativo':
                    ativos.push(item);
                    break;
                case 'novo':
                    novos.push(item);
                    break;
                default:
                    inativos.push(item);
            }
        });
        
        window.clientManager.data = inativos;
        window.clientManager.ativos = ativos;
        window.clientManager.novos = novos;
        
        await window.dbManager.saveData('clients', inativos);
        await window.dbManager.saveData('ativos', ativos);
        await window.dbManager.saveData('novos', novos);
        
        window.data = inativos;
        window.ativos = ativos;
        window.novos = novos;
        
        console.log(`📊 Dados processados:
            🔴 Inativos: ${inativos.length}
            🟢 Ativos: ${ativos.length}
            🆕 Novos: ${novos.length}`);
        
        renderAllTabs();
        updateCityFilter();
        
        // Atualizar mapa se estiver na aba mapa (forçar refresh para nova planilha)
        if (currentTab === 'mapa' && window.mapManager) {
            setTimeout(() => {
                window.mapManager.updateMap(true);
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Erro ao processar dados da planilha:', error);
        throw error;
    }
}

// Renderizar todas as abas
function renderAllTabs() {
    renderInativos();
    renderAtivos();
    renderNovos();
    renderAgenda();
}

// Renderizar inativos
function renderInativos() {
    try {
        const list = document.getElementById('client-list');
        if (!list) {
            console.error('❌ Lista de inativos não encontrada');
            return;
        }
        
        if (!window.clientManager || !Array.isArray(window.clientManager.filteredData)) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente inativo encontrado. Faça o upload de uma planilha.</p>';
            return;
        }
        
        const data = window.clientManager.filteredData;
        list.innerHTML = '';
        
        if (data.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente inativo encontrado com os filtros aplicados.</p>';
            return;
        }
        
        data.forEach(cliente => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'inativo');
            
            const cidade = window.clientManager.extrairCidadeDoItem(cliente);
            
            div.innerHTML = `
                <div class="client-info">
                    <strong>Cliente:</strong> ${cliente['Nome Fantasia'] || cliente['Cliente'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Contato:</strong> ${cliente['Contato'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Celular:</strong> ${cliente['Celular'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Cidade:</strong> ${cidade || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}
                </div>
            `;
            
            div.onclick = () => {
                if (window.clientManager) {
                    window.clientManager.currentItem = cliente;
                    window.clientManager.currentTab = 'inativos';
                    window.clientManager.openModal(cliente, 'inativos');
                }
            };
            
            list.appendChild(div);
        });
        
        console.log(`✅ ${window.clientManager.filteredData.length} clientes inativos renderizados`);
    } catch (error) {
        console.error('❌ Erro ao renderizar inativos:', error);
    }
}

// Renderizar ativos
function renderAtivos() {
    try {
        const list = document.getElementById('ativos-list');
        if (!list) {
            console.error('❌ Lista de ativos não encontrada');
            return;
        }
        
        if (!window.clientManager || !Array.isArray(window.clientManager.ativos)) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente ativo encontrado.</p>';
            return;
        }
        
        const ativos = window.clientManager.ativos;
        list.innerHTML = '';
        
        if (ativos.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente ativo encontrado.</p>';
            return;
        }
        
        ativos.forEach(cliente => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'ativo');
            
            const cidade = window.clientManager.extrairCidadeDoItem(cliente);
            
            div.innerHTML = `
                <div class="client-info">
                    <strong>Cliente:</strong> ${cliente['Nome Fantasia'] || cliente['Cliente'] || 'N/A'}
                </div>
                ${cliente['Data Ultimo Pedido'] ? `<div class="client-info">
                    <strong>Último Pedido:</strong> ${cliente['Data Ultimo Pedido']}
                </div>` : ''}
                <div class="client-info">
                    <strong>Contato:</strong> ${cliente['Contato'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Celular:</strong> ${cliente['Celular'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Cidade:</strong> ${cidade || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}
                </div>
            `;
            
            div.onclick = () => {
                if (window.clientManager) {
                    window.clientManager.currentItem = cliente;
                    window.clientManager.currentTab = 'ativos';
                    window.clientManager.openModal(cliente, 'ativos');
                }
            };
            
            list.appendChild(div);
        });
        
        console.log(`✅ ${window.clientManager.ativos.length} clientes ativos renderizados`);
    } catch (error) {
        console.error('❌ Erro ao renderizar ativos:', error);
    }
}

// Renderizar novos
function renderNovos() {
    try {
        const list = document.getElementById('novos-list');
        if (!list) {
            console.error('❌ Lista de novos não encontrada');
            return;
        }
        
        if (!window.clientManager || !Array.isArray(window.clientManager.novos)) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente novo encontrado.</p>';
            return;
        }
        
        const novos = window.clientManager.novos;
        list.innerHTML = '';
        
        if (novos.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhum cliente novo encontrado.</p>';
            return;
        }
        
        novos.forEach(cliente => {
            const div = document.createElement('div');
            div.className = 'client-item';
            div.setAttribute('data-status', 'novo');
            
            const cidade = window.clientManager.extrairCidadeDoItem(cliente);
            
            div.innerHTML = `
                <div class="client-info">
                    <strong>Cliente:</strong> ${cliente['Nome Fantasia'] || cliente['Cliente'] || 'N/A'}
                </div>
                ${cliente['Data Cadastro'] ? `<div class="client-info">
                    <strong>Cadastrado em:</strong> ${cliente['Data Cadastro']}
                </div>` : ''}
                <div class="client-info">
                    <strong>Contato:</strong> ${cliente['Contato'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Celular:</strong> ${cliente['Celular'] || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Cidade:</strong> ${cidade || 'N/A'}
                </div>
                <div class="client-info">
                    <strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}
                </div>
            `;
            
            div.onclick = () => {
                if (window.clientManager) {
                    window.clientManager.currentItem = cliente;
                    window.clientManager.currentTab = 'novos';
                    window.clientManager.openModal(cliente, 'novos');
                }
            };
            
            list.appendChild(div);
        });
        
        console.log(`✅ ${window.clientManager.novos.length} clientes novos renderizados`);
    } catch (error) {
        console.error('❌ Erro ao renderizar novos:', error);
    }
}

// Renderizar agenda
function renderAgenda() {
    try {
        const list = document.getElementById('agenda-list');
        if (!list) {
            console.error('❌ Lista de agenda não encontrada');
            return;
        }
        
        if (!window.clientManager || !window.clientManager.schedules) {
            list.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado.</p>';
            return;
        }
        
        const schedules = window.clientManager.schedules;
        const scheduleKeys = Object.keys(schedules);
        list.innerHTML = '';
        
        if (scheduleKeys.length === 0) {
            list.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado.</p>';
            return;
        }
        
        scheduleKeys.forEach(scheduleId => {
            const schedule = schedules[scheduleId];
            const cliente = window.clientManager.data.find(c => c.id === schedule.clientId) ||
                           window.clientManager.ativos.find(c => c.id === schedule.clientId) ||
                           window.clientManager.novos.find(c => c.id === schedule.clientId);
                           
            if (!cliente) return;
            
            const div = document.createElement('div');
            div.className = 'client-item';
            
            div.innerHTML = `
                <div class="client-info">
                    <strong>Cliente:</strong> ${schedule.clientName}
                </div>
                <div class="client-info">
                    <strong>Tipo:</strong> ${schedule.type}
                </div>
                <div class="client-info">
                    <strong>Dia:</strong> ${schedule.dayOfWeek}
                </div>
                <button onclick="removeSchedule('${scheduleId}')" 
                        style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    🗑️ Remover
                </button>
            `;
            
            list.appendChild(div);
        });
        
        console.log(`✅ ${scheduleKeys.length} agendamentos renderizados`);
    } catch (error) {
        console.error('❌ Erro ao renderizar agenda:', error);
    }
}

// Inicializar mapa
function initializeMap() {
    if (window.mapManager && typeof window.mapManager.initializeMap === 'function') {
        console.log('🗺️ Inicializando mapa...');
        window.mapManager.initializeMap();
    }
}

// Handlers dos botões
async function handleTornarAtivo() {
    if (!window.clientManager.currentItem) return;
    
    const novaData = prompt('Digite a data do último pedido (dd/mm/aaaa):');
    if (!novaData) return;
    
    try {
        await window.clientManager.tornarAtivo(window.clientManager.currentItem, novaData);
        closeModal();
        renderAllTabs();
        showSuccessMessage('Cliente tornado ativo com sucesso!');
    } catch (error) {
        showErrorMessage('Erro ao tornar cliente ativo: ' + error.message);
    }
}

async function handleExcluirAtivo() {
    if (!window.clientManager.currentItem) return;
    
    if (!confirm('Deseja realmente remover este cliente dos ativos?')) return;
    
    try {
        await window.clientManager.excluirAtivo(window.clientManager.currentItem);
        closeModal();
        renderAllTabs();
        showSuccessMessage('Cliente removido dos ativos!');
    } catch (error) {
        showErrorMessage('Erro ao remover cliente: ' + error.message);
    }
}

function handleEditarCliente() {
    if (window.clientManager) {
        window.clientManager.handleEditarCliente();
    }
}

async function handleLimparDados() {
    if (!confirm('Deseja realmente limpar todos os dados? Esta ação não pode ser desfeita.')) return;
    
    try {
        window.clientManager.data = [];
        window.clientManager.ativos = [];
        window.clientManager.novos = [];
        window.clientManager.schedules = {};
        window.clientManager.filteredData = [];
        
        await window.dbManager.clearData('clients');
        await window.dbManager.clearData('ativos');
        await window.dbManager.clearData('novos');
        await window.dbManager.clearData('schedules');
        
        if (window.mapManager) {
            window.mapManager.clearGeocodingCache();
        }
        
        renderAllTabs();
        updateCityFilter();
        
        showSuccessMessage('Todos os dados foram removidos!');
    } catch (error) {
        showErrorMessage('Erro ao limpar dados: ' + error.message);
    }
}

async function handleExportarDados() {
    try {
        await window.dbManager.exportAllData();
        showSuccessMessage('Backup exportado com sucesso!');
    } catch (error) {
        showErrorMessage('Erro ao exportar dados: ' + error.message);
    }
}

function handleCadastrarCliente() {
    showErrorMessage('Funcionalidade de cadastro em desenvolvimento.');
}

// Remover agendamento
function removeSchedule(scheduleId) {
    if (window.clientManager && window.clientManager.removeSchedule(scheduleId)) {
        renderAgenda();
        showSuccessMessage('Agendamento removido!');
    }
}

// Mostrar mensagem de sucesso
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.innerHTML = `
        <div class="success-message">
            ${message}
        </div>
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Mostrar mensagem de erro
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div class="error-message">
            ${message}
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Aplicar filtros
function applyFilters() {
    if (window.clientManager && typeof window.clientManager.applyFiltersAndSort === 'function') {
        window.clientManager.applyFiltersAndSort();
    }
}

// Atualizar filtro de cidades com funcionalidade recolhível
function updateCityFilter() {
    try {
        const cidadeList = document.getElementById('cidadeList');
        const filterText = document.getElementById('cidade-filter-text');
        const selectedCount = document.getElementById('cidade-selected-count');
        
        if (!cidadeList || !window.clientManager) return;
        
        const cidades = new Set();
        
        [...window.clientManager.data, ...window.clientManager.ativos, ...window.clientManager.novos].forEach(cliente => {
            const cidade = window.clientManager.extrairCidadeDoItem(cliente);
            if (cidade) cidades.add(cidade);
        });
        
        const cidadesArray = Array.from(cidades).sort();
        
        cidadeList.innerHTML = '';
        
        if (cidadesArray.length === 0) {
            cidadeList.innerHTML = '<p style="padding: 10px; color: #666;">Nenhuma cidade encontrada</p>';
            return;
        }
        
        cidadesArray.forEach(cidade => {
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" value="${cidade}" onchange="updateCityFilterCount(); applyFilters();">
                ${cidade}
            `;
            cidadeList.appendChild(label);
        });
        
        // Atualizar contador
        updateCityFilterCount();
        
        console.log(`🏙️ ${cidadesArray.length} cidades adicionadas ao filtro`);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar filtro de cidades:', error);
    }
}

// Atualizar contador de cidades selecionadas
function updateCityFilterCount() {
    try {
        const selectedCheckboxes = document.querySelectorAll('#cidadeList input:checked');
        const selectedCount = document.getElementById('cidade-selected-count');
        const filterText = document.getElementById('cidade-filter-text');
        
        if (selectedCheckboxes.length > 0) {
            selectedCount.textContent = selectedCheckboxes.length;
            selectedCount.style.display = 'inline-block';
            filterText.textContent = `${selectedCheckboxes.length} cidade(s) selecionada(s)`;
        } else {
            selectedCount.style.display = 'none';
            filterText.textContent = 'Selecionar cidades';
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar contador de cidades:', error);
    }
}

// Controle de abas
function showTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Inicializar mapa se necessário
    if (tabName === 'mapa') {
        setTimeout(initializeMap, 100);
    }
}

// Controle do modal
function closeModal() {
    if (window.clientManager) {
        window.clientManager.closeModal();
    }
}

// Atualizar contador de caracteres
function updateCharCounter() {
    const textarea = document.getElementById('observacoes');
    const counter = document.getElementById('observacoes-contador');
    
    if (textarea && counter) {
        const currentLength = textarea.value.length;
        counter.textContent = `${currentLength}/2000`;
        
        if (currentLength > 2000) {
            counter.style.color = '#dc3545';
            textarea.value = textarea.value.substring(0, 2000);
            counter.textContent = '2000/2000';
        } else {
            counter.style.color = '#666';
        }
    }
}

// Expor funções globalmente para compatibilidade
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;
window.renderAllTabs = renderAllTabs;
window.updateCityFilterCount = updateCityFilterCount;

console.log('✅ script.js carregado - versão com filtros recolhíveis');
