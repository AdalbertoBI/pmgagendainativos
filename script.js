// script.js - Arquivo principal TOTALMENTE corrigido com processamento adequado da planilha

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

// Inicializar sistema completo
async function initializeSystem() {
    try {
        // 1. Aguardar dependências externas
        await waitForDependencies();
        
        // 2. Inicializar dbManager
        if (!window.dbManager) {
            throw new Error('dbManager não encontrado');
        }
        await window.dbManager.init();
        console.log('✅ dbManager inicializado');

        // 3. Inicializar clientManager
        if (!window.clientManager) {
            throw new Error('clientManager não encontrado');
        }
        await window.clientManager.init();
        console.log('✅ clientManager inicializado');

        // 4. Configurar manipuladores de eventos
        setupEventListeners();

        // 5. Configurar navegação de abas
        setupTabNavigation();

        // 6. Renderizar interface
        await renderAllTabs();

        // 7. Atualizar filtros de cidade
        updateCityFilter();

        // 8. Inicializar mapa com delay
        setTimeout(() => {
            initializeMap();
        }, 1500);

        console.log('🎉 Sistema totalmente inicializado!');
        
    } catch (error) {
        console.error('❌ Falha na inicialização completa:', error);
        throw error;
    }
}

// Aguardar dependências externas
async function waitForDependencies() {
    console.log('⏳ Aguardando dependências...');
    
    // Aguardar XLSX
    await waitForGlobal('XLSX');
    console.log('✅ XLSX carregado');
    
    // Aguardar Leaflet
    await waitForGlobal('L');
    console.log('✅ Leaflet carregado');
    
    // Aguardar managers
    await waitForGlobal('dbManager');
    await waitForGlobal('clientManager');
    console.log('✅ Managers carregados');
}

// Aguardar variável global
function waitForGlobal(globalName, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkGlobal = () => {
            if (window[globalName]) {
                resolve(window[globalName]);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout esperando por ${globalName}`));
                return;
            }
            
            setTimeout(checkGlobal, 100);
        };
        
        checkGlobal();
    });
}

// Inicializar sistema básico em caso de falha
async function initializeBasicSystem() {
    try {
        console.log('🚑 Inicializando sistema básico...');
        
        // Configurar handlers básicos
        setupBasicEventListeners();
        
        // Mostrar interface de upload
        showUploadInterface();
        
        isSystemReady = true;
        hideLoadingIndicator();
        console.log('✅ Sistema básico pronto');
        
    } catch (error) {
        console.error('❌ Falha crítica no sistema básico:', error);
        showErrorMessage('Sistema não pôde ser inicializado. Recarregue a página.');
    }
}

// Configurar navegação de abas - CORRIGIDA
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            try {
                const tabName = button.getAttribute('data-tab');
                console.log(`🔄 Alternando para aba: ${tabName}`);
                
                // Remover classe active de todos os botões e conteúdos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Adicionar classe active ao botão e conteúdo selecionados
                button.classList.add('active');
                const targetContent = document.getElementById(`${tabName}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                } else {
                    console.warn(`⚠️ Conteúdo da aba ${tabName} não encontrado`);
                }
                
                currentTab = tabName;
                
                // Renderizar conteúdo da aba com tratamento específico
                switch(tabName) {
                    case 'inativos':
                        if (typeof renderInativos === 'function') {
                            renderInativos();
                        } else {
                            console.warn('⚠️ Função renderInativos não encontrada');
                        }
                        break;
                        
                    case 'ativos':
                        if (typeof renderAtivos === 'function') {
                            renderAtivos();
                        } else {
                            console.warn('⚠️ Função renderAtivos não encontrada');
                        }
                        break;
                        
                    case 'novos':
                        if (typeof renderNovos === 'function') {
                            renderNovos();
                        } else {
                            console.warn('⚠️ Função renderNovos não encontrada');
                        }
                        break;
                        
                    case 'agenda':
                        if (typeof renderAgenda === 'function') {
                            renderAgenda();
                        } else {
                            console.warn('⚠️ Função renderAgenda não encontrada');
                        }
                        break;
                        
                    case 'mapa':
                        // TRATAMENTO ESPECIAL PARA O MAPA - CORRIGIDO
                        await handleMapTabActivation();
                        break;
                        
                    default:
                        console.log(`ℹ️ Aba ${tabName} ativada sem ação específica`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao alternar para aba ${button.getAttribute('data-tab')}:`, error);
                // Não impedir a mudança de aba mesmo com erro
            }
        });
    });
}

// Função específica para lidar com ativação da aba do mapa - NOVA
async function handleMapTabActivation() {
    try {
        console.log('🗺️ Ativando aba do mapa...');
        
        // Verificar se mapManager existe
        if (!window.mapManager) {
            console.log('⚠️ MapManager não encontrado, tentando inicializar...');
            
            // Tentar aguardar o mapManager ser carregado
            await waitForMapManager();
            
            if (!window.mapManager) {
                throw new Error('MapManager não pôde ser carregado');
            }
        }

        // Verificar se o mapa foi inicializado
        if (!window.mapManager.initialized) {
            console.log('🗺️ Mapa não inicializado, inicializando agora...');
            
            try {
                await window.mapManager.init();
                console.log('✅ Mapa inicializado com sucesso');
            } catch (initError) {
                console.error('❌ Erro ao inicializar mapa:', initError);
                showMapError('Erro ao inicializar mapa. Clique em "Tentar Novamente".');
                return;
            }
        }

        // Usar o método específico para ativação da aba
        if (typeof window.mapManager.onMapTabActivated === 'function') {
            console.log('🔄 Notificando mapManager sobre ativação da aba');
            window.mapManager.onMapTabActivated();
        } else {
            // Fallback - invalidar tamanho e processar marcadores
            console.log('🔄 Usando método fallback para ativar mapa');
            
            setTimeout(() => {
                try {
                    // Invalidar tamanho do mapa
                    if (window.mapManager.map && typeof window.mapManager.map.invalidateSize === 'function') {
                        window.mapManager.map.invalidateSize(true);
                        console.log('✅ Tamanho do mapa invalidado');
                    }
                    
                    // Processar TODOS os marcadores se não há nenhum
                    if (window.mapManager.currentMarkers && window.mapManager.currentMarkers.length === 0) {
                        if (typeof window.mapManager.processAllMarkersComplete === 'function') {
                            window.mapManager.processAllMarkersComplete();
                            console.log('✅ Processamento de todos os marcadores iniciado');
                        }
                    }
                } catch (updateError) {
                    console.error('❌ Erro ao atualizar mapa:', updateError);
                }
            }, 300);
        }

    } catch (error) {
        console.error('❌ Erro crítico ao ativar aba do mapa:', error);
        
        // Mostrar erro no container do mapa
        showMapError('Erro ao carregar mapa. Verifique sua conexão e tente novamente.');
    }
}

// Adicione também esta função melhorada para mostrar erro no mapa:
function showMapError(message) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('⚠️ Container do mapa não encontrado para mostrar erro');
        return;
    }

    mapContainer.style.height = '500px';
    mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; padding: 2rem; background: #f8f9fa;">
            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
            <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Problema no Mapa</h3>
            <p style="margin: 0 0 1.5rem 0; font-size: 1rem; max-width: 400px; line-height: 1.5;">${message}</p>
            <button onclick="retryMapInitialization()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s ease;">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
}

// Função para retry do mapa
function retryMapInitialization() {
    console.log('🔄 Tentando reinicializar mapa pelo usuário...');
    
    // Resetar estado se mapManager existir
    if (window.mapManager && typeof window.mapManager.forceRetry === 'function') {
        window.mapManager.forceRetry();
    } else {
        // Tentar recarregar a aba do mapa
        handleMapTabActivation().catch(error => {
            console.error('❌ Retry falhou:', error);
            showMapError('Falha persistente. Recarregue a página completamente.');
        });
    }
}

console.log('✅ script.js - seção do mapa corrigida para carregar TODOS os clientes');

// Função para aguardar mapManager - NOVA
function waitForMapManager(timeout = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkMapManager = () => {
            if (window.mapManager && typeof window.mapManager.init === 'function') {
                console.log('✅ MapManager encontrado');
                resolve(true);
                return;
            }
            
            if (Date.now() - startTime > timeout) {
                console.warn('⏰ Timeout aguardando mapManager');
                resolve(false);
                return;
            }
            
            setTimeout(checkMapManager, 100);
        };
        
        checkMapManager();
    });
}

// Função melhorada para mostrar erro no mapa - NOVA
function showMapError(message) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('⚠️ Container do mapa não encontrado para mostrar erro');
        return;
    }

    mapContainer.style.height = '500px';
    mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; padding: 2rem; background: #f8f9fa;">
            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🗺️</div>
            <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Problema no Mapa</h3>
            <p style="margin: 0 0 1.5rem 0; font-size: 1rem; max-width: 400px; line-height: 1.5;">${message}</p>
            <button onclick="retryMapInitialization()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: all 0.3s ease;">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
}

// Função para retry do mapa - NOVA
function retryMapInitialization() {
    console.log('🔄 Tentando reinicializar mapa pelo usuário...');
    
    // Resetar estado se mapManager existir
    if (window.mapManager && typeof window.mapManager.forceRetry === 'function') {
        window.mapManager.forceRetry();
    } else {
        // Tentar recarregar a aba do mapa
        handleMapTabActivation().catch(error => {
            console.error('❌ Retry falhou:', error);
            showMapError('Falha persistente. Recarregue a página completamente.');
        });
    }
}

console.log('✅ setupTabNavigation corrigido com tratamento robusto para mapa');


// Configurar manipuladores de eventos
function setupEventListeners() {
    try {
        // Upload de arquivo
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        
        if (fileInput && uploadArea) {
            // Click no upload area
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);
            
            // Mudança de arquivo
            fileInput.addEventListener('change', handleFileSelect);
        }

        // Filtros
        const sortOption = document.getElementById('sortOption');
        if (sortOption) {
            sortOption.addEventListener('change', () => {
                if (window.clientManager) {
                    window.clientManager.applyFiltersAndSort();
                }
            });
        }

        // Filtro de cidades
        const cidadeSelector = document.getElementById('cidade-selector');
        if (cidadeSelector) {
            cidadeSelector.addEventListener('click', toggleCityFilter);
        }

        // Botão atualizar mapa
        const atualizarMapaBtn = document.getElementById('atualizar-mapa');
        if (atualizarMapaBtn) {
            atualizarMapaBtn.addEventListener('click', () => {
                if (window.mapManager) {
                    window.mapManager.updateAllMarkers();
                    switchToTab('mapa');
                }
            });
        }

        // Modal
        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        console.log('✅ Event listeners configurados');
        
    } catch (error) {
        console.error('❌ Erro ao configurar event listeners:', error);
    }
}

// Configurar handlers básicos
function setupBasicEventListeners() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    
    if (fileInput && uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Processar arquivo Excel - FUNÇÃO COMPLETAMENTE CORRIGIDA
async function processExcelFile(file) {
    try {
        console.log('📊 Processando arquivo:', file.name);
        showLoadingMessage('Processando planilha...');

        if (!window.XLSX) {
            throw new Error('Biblioteca XLSX não carregada');
        }

        // Ler arquivo
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });

        // Processar workbook
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (!jsonData || jsonData.length === 0) {
            throw new Error('Planilha vazia ou sem dados válidos');
        }

        console.log(`📋 ${jsonData.length} registros encontrados`);

        // Categorizar dados CORRETAMENTE baseado na coluna Status
        const inativos = [];
        const ativos = [];
        const novos = [];

        jsonData.forEach((row, index) => {
            try {
                // Gerar ID único se não existir
                if (!row['ID Cliente'] && !row.id) {
                    row.id = `gen_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
                } else {
                    row.id = row['ID Cliente'] || row.id || `row_${index}`;
                }

                // Padronizar campos obrigatórios
                const cliente = {
                    ...row,
                    id: row.id,
                    'ID Cliente': row['ID Cliente'] || row.id,
                    'Nome Fantasia': row['Nome Fantasia'] || row['Cliente'] || 'N/A',
                    'Contato': row['Contato'] || 'N/A',
                    'Celular': row['Celular'] || 'N/A',
                    'Endereço': row['Endereço'] || 'N/A',
                    'Segmento': row['Segmento'] || 'N/A',
                    'Status': row['Status'] || 'Inativo',
                    'CNPJ / CPF': row['CNPJ / CPF'] || 'N/A'
                };

                // Categorizar CORRETAMENTE por status da coluna Status
                const status = (cliente.Status || '').toString().trim().toLowerCase();
                
                if (status === 'ativo') {
                    ativos.push(cliente);
                    console.log(`✅ Cliente ATIVO: ${cliente['Nome Fantasia']}`);
                } else if (status === 'novo') {
                    novos.push(cliente);
                    console.log(`🆕 Cliente NOVO: ${cliente['Nome Fantasia']}`);
                } else {
                    // Default para inativo (inclui 'inativo' e valores vazios)
                    inativos.push(cliente);
                    console.log(`🔴 Cliente INATIVO: ${cliente['Nome Fantasia']}`);
                }

            } catch (rowError) {
                console.warn(`⚠️ Erro na linha ${index}:`, rowError);
            }
        });

        // Salvar dados usando ClientManager
        const processedData = {
            clients: inativos,
            ativos: ativos,
            novos: novos,
            schedules: {}
        };

        if (window.clientManager) {
            await window.clientManager.processNewData(processedData);
        } else {
            throw new Error('ClientManager não disponível');
        }

        // Atualizar interface
        await renderAllTabs();
        updateTabCounts();
        updateCityFilter();
        updateDataInfo(file.name);

        hideLoadingMessage();
        
        showSuccessMessage(`✅ Planilha processada com sucesso!
        🔴 Inativos: ${inativos.length}
        🟢 Ativos: ${ativos.length}  
        🆕 Novos: ${novos.length}`);

        console.log('✅ Processamento concluído com sucesso');
        
        // Forçar atualização do mapa após processamento
        setTimeout(() => {
            if (window.mapManager && typeof window.mapManager.updateAllMarkers === 'function') {
                window.mapManager.updateAllMarkers();
            }
        }, 1000);
        
        return true;

    } catch (error) {
        console.error('❌ Erro ao processar Excel:', error);
        hideLoadingMessage();
        showErrorMessage('Erro ao processar planilha: ' + error.message);
        return false;
    }
}

// Handlers de drag and drop
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

async function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showErrorMessage('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
    }
    
    await processExcelFile(file);
}

// Renderizar todas as abas
async function renderAllTabs() {
    renderInativos();
    renderAtivos();
    renderNovos();
    renderAgenda();
    updateTabCounts();
}

// Renderizar clientes inativos
function renderInativos() {
    const list = document.getElementById('client-list');
    if (!list) return;

    if (!window.clientManager || !window.clientManager.filteredData || window.clientManager.filteredData.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum cliente inativo encontrado. Faça o upload de uma planilha.</div>';
        return;
    }

    list.innerHTML = '';
    
    window.clientManager.filteredData.forEach(item => {
        const cidade = window.clientManager.extrairCidadeDoItem(item);
        
        const div = document.createElement('div');
        div.className = 'client-item';
        div.innerHTML = `
            <h4>${item['Nome Fantasia'] || 'N/A'}</h4>
            <p><strong>Contato:</strong> ${item['Contato'] || 'N/A'}</p>
            <p><strong>Telefone:</strong> ${item['Celular'] || 'N/A'}</p>
            <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
            <p><strong>Segmento:</strong> ${item['Segmento'] || 'N/A'}</p>
            <p><strong>Status:</strong> ${item['Status'] || 'Inativo'}</p>
        `;
        
        div.onclick = () => window.clientManager.showClientModal(item);
        list.appendChild(div);
    });
}

// Renderizar clientes ativos  
function renderAtivos() {
    const list = document.getElementById('ativos-list');
    if (!list) return;

    if (!window.clientManager || !window.clientManager.ativos || window.clientManager.ativos.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum cliente ativo encontrado.</div>';
        return;
    }

    list.innerHTML = '';
    
    window.clientManager.ativos.forEach(cliente => {
        const cidade = window.clientManager.extrairCidadeDoItem(cliente);
        
        const div = document.createElement('div');
        div.className = 'client-item';
        div.innerHTML = `
            <h4>${cliente['Nome Fantasia'] || 'N/A'}</h4>
            <p><strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}</p>
            <p><strong>Contato:</strong> ${cliente['Contato'] || 'N/A'}</p>
            <p><strong>Telefone:</strong> ${cliente['Celular'] || 'N/A'}</p>
            <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
            <p><strong>Status:</strong> ${cliente['Status'] || 'Ativo'}</p>
        `;
        
        div.onclick = () => window.clientManager.showClientModal(cliente);
        list.appendChild(div);
    });
}

// Renderizar clientes novos
function renderNovos() {
    const list = document.getElementById('novos-list');
    if (!list) return;

    if (!window.clientManager || !window.clientManager.novos || window.clientManager.novos.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum cliente novo encontrado.</div>';
        return;
    }

    list.innerHTML = '';
    
    window.clientManager.novos.forEach(cliente => {
        const cidade = window.clientManager.extrairCidadeDoItem(cliente);
        
        const div = document.createElement('div');
        div.className = 'client-item';
        div.innerHTML = `
            <h4>${cliente['Nome Fantasia'] || 'N/A'}</h4>
            <p><strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}</p>
            <p><strong>Contato:</strong> ${cliente['Contato'] || 'N/A'}</p>
            <p><strong>Telefone:</strong> ${cliente['Celular'] || 'N/A'}</p>
            <p><strong>Cidade:</strong> ${cidade || 'N/A'}</p>
            <p><strong>Status:</strong> ${cliente['Status'] || 'Novo'}</p>
        `;
        
        div.onclick = () => window.clientManager.showClientModal(cliente);
        list.appendChild(div);
    });
}

// Renderizar agenda
function renderAgenda() {
    const list = document.getElementById('agenda-list');
    if (!list) return;

    if (!window.clientManager || !window.clientManager.schedules || Object.keys(window.clientManager.schedules).length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado.</div>';
        return;
    }

    list.innerHTML = '';
    
    Object.entries(window.clientManager.schedules).forEach(([clienteId, schedule]) => {
        const cliente = findClientById(clienteId);
        if (!cliente) return;
        
        const div = document.createElement('div');
        div.className = 'client-item';
        div.innerHTML = `
            <h4>${cliente['Nome Fantasia'] || 'N/A'}</h4>
            <p><strong>Segmento:</strong> ${cliente['Segmento'] || 'N/A'}</p>
            <p><strong>Data:</strong> ${new Date(schedule.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Hora:</strong> ${schedule.time}</p>
        `;
        
        div.onclick = () => window.clientManager.showClientModal(cliente);
        list.appendChild(div);
    });
}

// Encontrar cliente por ID
function findClientById(id) {
    if (!window.clientManager) return null;
    
    const allClients = [
        ...(window.clientManager.data || []),
        ...(window.clientManager.ativos || []),
        ...(window.clientManager.novos || [])
    ];
    
    return allClients.find(c => c.id === id);
}

// Atualizar contadores das abas
function updateTabCounts() {
    if (!window.clientManager) return;
    
    const inativosCount = document.getElementById('inativos-count');
    const ativosCount = document.getElementById('ativos-count');
    const novosCount = document.getElementById('novos-count');
    const agendaCount = document.getElementById('agenda-count');
    
    if (inativosCount) inativosCount.textContent = window.clientManager.data?.length || 0;
    if (ativosCount) ativosCount.textContent = window.clientManager.ativos?.length || 0;
    if (novosCount) novosCount.textContent = window.clientManager.novos?.length || 0;
    if (agendaCount) agendaCount.textContent = Object.keys(window.clientManager.schedules || {}).length;
}

// Atualizar info de dados
function updateDataInfo(fileName) {
    const dataInfo = document.getElementById('data-info');
    if (dataInfo && fileName) {
        dataInfo.textContent = `📁 ${fileName}`;
    }
}

// Filtro de cidades
function toggleCityFilter() {
    const cidadeList = document.getElementById('cidade-list');
    const cidadeSelector = document.getElementById('cidade-selector');
    
    if (cidadeList && cidadeSelector) {
        if (cidadeList.classList.contains('escondido')) {
            cidadeList.classList.remove('escondido');
            cidadeList.classList.add('visivel');
            cidadeSelector.classList.add('aberto');
        } else {
            cidadeList.classList.add('escondido');
            cidadeList.classList.remove('visivel');
            cidadeSelector.classList.remove('aberto');
        }
    }
}

function updateCityFilter() {
    if (!window.clientManager || !window.clientManager.data) return;
    
    const cidadeList = document.getElementById('cidade-list');
    const cidadeSelected = document.getElementById('cidade-selected');
    
    if (!cidadeList) return;
    
    // Extrair cidades únicas
    const cidades = [...new Set(
        window.clientManager.data.map(item => 
            window.clientManager.extrairCidadeDoItem(item)
        )
    )].filter(cidade => cidade && cidade !== 'N/A').sort();
    
    cidadeList.innerHTML = '';
    
    // Adicionar opção "Todas"
    const todasDiv = document.createElement('div');
    todasDiv.innerHTML = `
        <input type="checkbox" id="cidade-todas" value="todas" checked>
        <label for="cidade-todas">Todas as cidades</label>
    `;
    cidadeList.appendChild(todasDiv);
    
    // Adicionar cidades
    cidades.forEach(cidade => {
        const div = document.createElement('div');
        const inputId = `cidade-${cidade.replace(/\s+/g, '-').toLowerCase()}`;
        div.innerHTML = `
            <input type="checkbox" id="${inputId}" value="${cidade}">
            <label for="${inputId}">${cidade}</label>
        `;
        cidadeList.appendChild(div);
    });
    
    // Event listeners para checkboxes
    cidadeList.addEventListener('change', (e) => {
        if (e.target.value === 'todas') {
            const allCheckboxes = cidadeList.querySelectorAll('input[type="checkbox"]');
            allCheckboxes.forEach(cb => {
                if (cb.value !== 'todas') {
                    cb.checked = e.target.checked;
                }
            });
        }
        
        // Atualizar texto selecionado
        const selecionadas = Array.from(cidadeList.querySelectorAll('input:checked'))
            .map(input => input.value)
            .filter(value => value !== 'todas');
            
        if (selecionadas.length === 0 || selecionadas.length === cidades.length) {
            cidadeSelected.textContent = 'Todas as cidades';
        } else if (selecionadas.length === 1) {
            cidadeSelected.textContent = selecionadas[0];
        } else {
            cidadeSelected.textContent = `${selecionadas.length} cidades selecionadas`;
        }
        
        // Aplicar filtros
        if (window.clientManager) {
            window.clientManager.applyFiltersAndSort();
        }
    });
}

// Inicializar mapa
function initializeMap() {
    try {
        if (window.mapManager && typeof window.mapManager.init === 'function') {
            console.log('🗺️ Inicializando mapa...');
            window.mapManager.init();
            console.log('✅ Mapa inicializado com sucesso');
        } else {
            console.warn('⚠️ mapManager não disponível, tentando novamente...');
            setTimeout(initializeMap, 2000);
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        showMapError('Erro ao carregar mapa: ' + error.message);
    }
}

// Mostrar erro no mapa
function showMapError(message) {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
                <p style="text-align: center; margin: 0;">${message}</p>
                <button onclick="initializeMap()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Trocar de aba
function switchToTab(tabName) {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton) {
        tabButton.click();
    }
}

// Mostrar interface de upload
function showUploadInterface() {
    // Interface básica já está no HTML
    console.log('📁 Interface de upload ativa');
}

// Modal functions
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Utility functions
function showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function showLoadingMessage(message) {
    const existing = document.getElementById('loading-message');
    if (existing) existing.remove();
    
    const div = document.createElement('div');
    div.id = 'loading-message';
    div.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000; text-align: center; min-width: 300px;
    `;
    div.innerHTML = `
        <div class="loading-spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin: 0; font-weight: 500;">${message}</p>
    `;
    document.body.appendChild(div);
}

function hideLoadingMessage() {
    const message = document.getElementById('loading-message');
    if (message) {
        message.remove();
    }
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('error-container') || document.body;
    
    const div = document.createElement('div');
    div.className = `notification notification-${type}`;
    div.style.cssText = `
        background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
        color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
        padding: 1rem; margin: 0.5rem 0; border-radius: 6px; border-left: 4px solid;
        border-left-color: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; white-space: pre-line;
        position: fixed; top: 80px; right: 20px; z-index: 10001; animation: slideIn 0.3s ease-out;
    `;
    div.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="
            position: absolute; top: 0.5rem; right: 0.5rem; background: none; border: none;
            font-size: 1.2rem; cursor: pointer; color: inherit; opacity: 0.7;
        ">&times;</button>
    `;
    
    container.appendChild(div);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (div.parentElement) {
            div.remove();
        }
    }, 5000);
}

// CSS para animação das notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .drag-over {
        border-color: #007bff !important;
        background: rgba(0, 123, 255, 0.1) !important;
    }
`;
document.head.appendChild(style);

console.log('✅ script.js carregado completamente corrigido');
