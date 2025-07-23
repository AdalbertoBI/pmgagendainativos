// script.js - Arquivo principal corrigido
let currentTab = 'inativos';
let mapLoaded = false;
let mapDataLoaded = false; // Nova variável para rastrear se os dados do mapa foram carregados

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
    
    const cancelarCadastroBtn = document.getElementById('cancelar-cadastro');
    if (cancelarCadastroBtn) {
        cancelarCadastroBtn.addEventListener('click', fecharModalCadastro);
    }
    
    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', handleCadastroSubmit);
    }
    
    // Modal de sucesso
    const closeSucessoBtn = document.getElementById('close-sucesso');
    if (closeSucessoBtn) {
        closeSucessoBtn.addEventListener('click', fecharModalSucesso);
    }
    
    const fecharSucessoBtn = document.getElementById('fechar-sucesso');
    if (fecharSucessoBtn) {
        fecharSucessoBtn.addEventListener('click', fecharModalSucesso);
    }
    
    const cadastrarOutroBtn = document.getElementById('cadastrar-outro');
    if (cadastrarOutroBtn) {
        cadastrarOutroBtn.addEventListener('click', () => {
            fecharModalSucesso();
            abrirModalCadastro();
        });
    }
    
    // Botões de exportação
    const exportarInativosBtn = document.getElementById('exportar-inativos');
    if (exportarInativosBtn) {
        exportarInativosBtn.addEventListener('click', () => exportarDados('inativos'));
    }
    
    const exportarAtivosBtn = document.getElementById('exportar-ativos');
    if (exportarAtivosBtn) {
        exportarAtivosBtn.addEventListener('click', () => exportarDados('ativos'));
    }
    
    // Botões de ação do modal - CORRIGIDO
    const tornarAtivoBtn = document.getElementById('tornarAtivo');
    if (tornarAtivoBtn) {
        tornarAtivoBtn.addEventListener('click', handleTornarAtivo);
    }
    
    const confirmarAtivoBtn = document.getElementById('confirmarAtivo');
    if (confirmarAtivoBtn) {
        confirmarAtivoBtn.addEventListener('click', handleConfirmarAtivo);
    }
    
    const excluirAtivoBtn = document.getElementById('excluirAtivo');
    if (excluirAtivoBtn) {
        excluirAtivoBtn.addEventListener('click', handleExcluirAtivo);
    }
    
    // Botão de edição
    const editarClienteBtn = document.getElementById('editarCliente');
    if (editarClienteBtn) {
        editarClienteBtn.addEventListener('click', toggleEditMode);
    }
    
    const salvarEdicaoBtn = document.getElementById('salvarEdicao');
    if (salvarEdicaoBtn) {
        salvarEdicaoBtn.addEventListener('click', salvarEdicaoCliente);
    }
    
    const cancelarEdicaoBtn = document.getElementById('cancelarEdicao');
    if (cancelarEdicaoBtn) {
        cancelarEdicaoBtn.addEventListener('click', cancelarEdicaoCliente);
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

// Manipuladores de eventos para os botões de ação - NOVOS
function handleTornarAtivo() {
    const cliente = window.clientManager.currentItem;
    if (!cliente) return;
    
    // Mostrar campos de edição de data
    document.getElementById('editDataPedido').style.display = 'block';
    document.getElementById('labelEditDataPedido').style.display = 'block';
    document.getElementById('confirmarAtivo').style.display = 'inline-block';
    document.getElementById('tornarAtivo').style.display = 'none';
    
    // Preencher com data atual
    const hoje = new Date();
    const dataFormatada = hoje.getDate().toString().padStart(2, '0') + '/' + 
                         (hoje.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                         hoje.getFullYear();
    document.getElementById('editDataPedido').value = dataFormatada;
}

async function handleConfirmarAtivo() {
    const cliente = window.clientManager.currentItem;
    const novaData = document.getElementById('editDataPedido').value;
    
    if (!cliente || !novaData) {
        alert('❌ Por favor, insira uma data válida!');
        return;
    }
    
    try {
        await window.clientManager.tornarAtivo(cliente, novaData);
        
        // Fechar modal
        document.getElementById('modal').style.display = 'none';
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        renderAtivos();
        
        alert('✅ Cliente tornado ativo com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao tornar cliente ativo:', error);
        alert('❌ Erro ao tornar cliente ativo: ' + error.message);
    }
}

async function handleExcluirAtivo() {
    const cliente = window.clientManager.currentItem;
    if (!cliente) return;
    
    if (confirm('Tem certeza que deseja excluir este cliente dos ativos?')) {
        try {
            await window.clientManager.excluirAtivo(cliente);
            
            // Fechar modal
            document.getElementById('modal').style.display = 'none';
            
            // Atualizar interface
            renderAtivos();
            
            alert('✅ Cliente removido dos ativos com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao excluir cliente ativo:', error);
            alert('❌ Erro ao excluir cliente ativo: ' + error.message);
        }
    }
}

// Funcionalidades de edição - NOVAS
function toggleEditMode() {
    const editFields = document.querySelectorAll('.edit-field');
    const displayFields = document.querySelectorAll('.display-field');
    const editBtn = document.getElementById('editarCliente');
    const saveBtn = document.getElementById('salvarEdicao');
    const cancelBtn = document.getElementById('cancelarEdicao');
    
    // Alternar visibilidade
    editFields.forEach(field => field.style.display = 'block');
    displayFields.forEach(field => field.style.display = 'none');
    
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    // Preencher campos de edição com dados atuais
    const cliente = window.clientManager.currentItem;
    if (cliente) {
        document.getElementById('edit-nome-fantasia').value = cliente['Nome Fantasia'] || '';
        document.getElementById('edit-cliente').value = cliente['Cliente'] || '';
        document.getElementById('edit-cnpj-cpf').value = cliente['CNPJ / CPF'] || '';
        document.getElementById('edit-contato').value = cliente['Contato'] || '';
        document.getElementById('edit-telefone-comercial').value = cliente['Telefone Comercial'] || '';
        document.getElementById('edit-celular').value = cliente['Celular'] || '';
        document.getElementById('edit-email').value = cliente['Email'] || '';
        document.getElementById('edit-endereco').value = cliente['Endereco'] || '';
        document.getElementById('edit-numero').value = cliente['Numero'] || '';
        document.getElementById('edit-bairro').value = cliente['Bairro'] || '';
        document.getElementById('edit-cidade').value = cliente['Cidade'] || '';
        document.getElementById('edit-uf').value = cliente['UF'] || '';
        document.getElementById('edit-cep').value = cliente['CEP'] || '';
        document.getElementById('edit-saldo-credito').value = cliente['Saldo de Credito'] || '';
    }
}

function cancelarEdicaoCliente() {
    const editFields = document.querySelectorAll('.edit-field');
    const displayFields = document.querySelectorAll('.display-field');
    const editBtn = document.getElementById('editarCliente');
    const saveBtn = document.getElementById('salvarEdicao');
    const cancelBtn = document.getElementById('cancelarEdicao');
    
    // Restaurar visibilidade
    editFields.forEach(field => field.style.display = 'none');
    displayFields.forEach(field => field.style.display = 'block');
    
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
}

async function salvarEdicaoCliente() {
    const cliente = window.clientManager.currentItem;
    if (!cliente) return;
    
    try {
        // Coletar dados editados
        const dadosEditados = {
            'Nome Fantasia': document.getElementById('edit-nome-fantasia').value.trim(),
            'Cliente': document.getElementById('edit-cliente').value.trim(),
            'CNPJ / CPF': document.getElementById('edit-cnpj-cpf').value.trim(),
            'Contato': document.getElementById('edit-contato').value.trim(),
            'Telefone Comercial': document.getElementById('edit-telefone-comercial').value.trim(),
            'Celular': document.getElementById('edit-celular').value.trim(),
            'Email': document.getElementById('edit-email').value.trim(),
            'Endereco': document.getElementById('edit-endereco').value.trim(),
            'Numero': document.getElementById('edit-numero').value.trim(),
            'Bairro': document.getElementById('edit-bairro').value.trim(),
            'Cidade': document.getElementById('edit-cidade').value.trim(),
            'UF': document.getElementById('edit-uf').value.trim().toUpperCase(),
            'CEP': document.getElementById('edit-cep').value.trim(),
            'Saldo de Credito': document.getElementById('edit-saldo-credito').value
        };
        
        // Validação básica
        if (!dadosEditados['Nome Fantasia']) {
            alert('❌ Nome Fantasia é obrigatório!');
            return;
        }
        
        // Salvar alterações
        await window.clientManager.editarCliente(cliente.id, dadosEditados);
        
        // Fechar modal
        document.getElementById('modal').style.display = 'none';
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        renderAtivos();
        
        alert('✅ Cliente editado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao editar cliente:', error);
        alert('❌ Erro ao editar cliente: ' + error.message);
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
    mapDataLoaded = false; // Resetar mapDataLoaded para forçar recarregamento do mapa
    
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
            
            const headers = rawData[0].map(h => h ? h.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '');
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
            await window.dbManager.saveArrayData('clients', processedData);
            
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

// Abrir modal de cadastro
function abrirModalCadastro() {
    document.getElementById('modal-cadastro').style.display = 'flex';
    document.getElementById('form-cadastro').reset();
    document.getElementById('nome-fantasia').focus();
}

// Fechar modal de cadastro
function fecharModalCadastro() {
    document.getElementById('modal-cadastro').style.display = 'none';
}

// Abrir modal de sucesso
function abrirModalSucesso(clienteData) {
    const modal = document.getElementById('modal-sucesso');
    const info = document.getElementById('cliente-cadastrado-info');
    
    info.innerHTML = `
        <p><strong>Nome Fantasia:</strong> ${clienteData['Nome Fantasia']}</p>
        <p><strong>Cliente:</strong> ${clienteData['Cliente'] || 'Não informado'}</p>
        <p><strong>Cidade:</strong> ${clienteData['Cidade'] || 'Não informado'}</p>
        <p><strong>Contato:</strong> ${clienteData['Contato'] || 'Não informado'}</p>
    `;
    
    modal.style.display = 'flex';
}

// Fechar modal de sucesso
function fecharModalSucesso() {
    document.getElementById('modal-sucesso').style.display = 'none';
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
        const clienteData = await window.clientManager.cadastrarCliente(formData);
        
        // Fechar modal de cadastro
        fecharModalCadastro();
        
        // Abrir modal de sucesso
        abrirModalSucesso(clienteData);
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        
    } catch (error) {
        alert('❌ Erro ao cadastrar cliente:\n' + error.message);
    }
}

// Função de exportação de dados
function exportarDados(tipo) {
    try {
        let dados = [];
        let nomeArquivo = '';
        
        if (tipo === 'inativos') {
            dados = window.clientManager.data || [];
            nomeArquivo = `clientes-inativos-${new Date().toISOString().split('T')[0]}.xlsx`;
        } else if (tipo === 'ativos') {
            dados = window.clientManager.ativos || [];
            nomeArquivo = `clientes-ativos-${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        
        if (dados.length === 0) {
            alert(`❌ Nenhum cliente ${tipo} encontrado para exportar!`);
            return;
        }
        
        // Estrutura das colunas baseada na planilha original
        const colunas = [
            'ID Cliente',
            'Cliente',
            'Nome Fantasia',
            'CNPJ / CPF',
            'Condição de Pagamento',
            'Condição de Pagamento Padrão',
            'Limite de Crédito',
            'Saldo de Crédito',
            'Limite de Crédito a Vista',
            'Saldo de Crédito a Vista',
            'Nota Fiscal',
            'Inscrição Estadual',
            'Tipo',
            'Finalidade',
            'Regime Tributário',
            'Endereço',
            'Número',
            'Bairro',
            'Cidade',
            'UF',
            'CEP',
            'Contato',
            'Telefone Comercial',
            'Celular',
            'Email',
            'Zona',
            'Zona ID',
            'SubRegião',
            'SubRegião ID',
            'Segmento',
            'Protestar (dias)',
            'Negativar (dias)',
            'Status',
            'Bloqueio',
            'Cliente Desde',
            'Data Último Pedido',
            'Vendedor',
            'Boletos Vencidos',
            'tipoPessoa PJ/PF'
        ];
        
        // Preparar dados para exportação
        const dadosExportacao = dados.map(cliente => {
            const linha = {};
            colunas.forEach(coluna => {
                // Mapear campos do sistema para as colunas da planilha
                switch (coluna) {
                    case 'ID Cliente':
                        linha[coluna] = cliente.id || cliente['ID Cliente'] || '';
                        break;
                    case 'Endereço':
                        linha[coluna] = cliente.Endereco || cliente['Endereço'] || '';
                        break;
                    case 'Número':
                        linha[coluna] = cliente.Numero || cliente['Número'] || '';
                        break;
                    case 'Status':
                        linha[coluna] = tipo === 'ativos' ? 'Ativo' : 'Inativo';
                        break;
                    case 'Cliente Desde':
                        linha[coluna] = cliente['Data Cadastro'] || cliente['Cliente Desde'] || '';
                        break;
                    case 'Saldo de Crédito':
                        linha[coluna] = cliente['Saldo de Credito'] || cliente['Saldo de Crédito'] || '';
                        break;
                    default:
                        linha[coluna] = cliente[coluna] || '';
                }
            });
            return linha;
        });
        
        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosExportacao, { header: colunas });
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, tipo.toUpperCase());
        
        // Salvar arquivo
        XLSX.writeFile(wb, nomeArquivo);
        
        alert(`✅ Dados exportados com sucesso!\n📁 Arquivo: ${nomeArquivo}\n📊 ${dados.length} clientes exportados`);
        
    } catch (error) {
        console.error('❌ Erro ao exportar dados:', error);
        alert('❌ Erro ao exportar dados: ' + error.message);
    }
}

// Navegação entre abas
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
    
    // Controlar visibilidade do upload - APENAS NA ABA INATIVOS
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
                    // Verificar se os dados do mapa já foram carregados
                    if (!mapDataLoaded && typeof window.loadMapData === 'function') {
                        window.loadMapData();
                        mapDataLoaded = true; // Marca que os dados do mapa foram carregados
                    }
                    if (typeof window.setupEditButton === 'function') {
                        window.setupEditButton();
                    }
                    // Adicionar listener para o checkbox "Incluir inativos"
                    const includeInativosCheckbox = document.getElementById('include-inativos-checkbox');
                    if (includeInativosCheckbox) {
                        includeInativosCheckbox.addEventListener('change', () => {
                            mapDataLoaded = false; // Resetar para recarregar os dados do mapa
                            if (!mapDataLoaded && typeof window.loadMapData === 'function') {
                                window.loadMapData();
                                mapDataLoaded = true;
                            }
                        });
                    }
                }, 1000);
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
    
    document.getElementById('cidadeSelectorText').textContent = aberto ? 'Ocultar cidades' : 'Selecionar cidades';
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
    
    window.clientManager.ativos.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item['Nome Fantasia'] || 'Sem Nome'}</strong>
                <span class="days-since">Ativo desde: ${item['Data Ultimo Pedido'] || 'N/A'}</span>
            </div>
            <div style="font-size: 0.9em; color: #666;">
                ${item['Cidade'] || ''} - Saldo: R$ ${item['Saldo de Credito'] || '0'}
            </div>
        `;
        li.onclick = () => window.clientManager.openModal(item, 'ativos');
        list.appendChild(li);
    });
}

// Renderizar agenda
function renderAgenda() {
    const list = document.getElementById('agenda-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const schedules = window.clientManager.schedules;
    const scheduleEntries = Object.entries(schedules);
    
    if (scheduleEntries.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #666;">Nenhum agendamento encontrado</div>';
        return;
    }
    
    scheduleEntries.forEach(([clientId, schedule]) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <div>
                <strong>${schedule.cliente}</strong><br>
                ${schedule.diaSemana} às ${schedule.horario} - ${schedule.tipo}
            </div>
            <button onclick="removerAgendamento('${clientId}')">Remover</button>
        `;
        list.appendChild(div);
    });
}

// Salvar observações
function salvarObservacoes() {
    const observacoes = document.getElementById('observacoes').value;
    const clienteId = window.clientManager.currentItem?.id;
    
    if (clienteId) {
        window.dbManager.saveObservation(clienteId, observacoes);
        alert('✅ Observações salvas com sucesso!');
    }
}

// Salvar agendamento
function salvarAgendamento() {
    const diaSemana = document.getElementById('diaSemana').value;
    const horario = document.getElementById('horario').value;
    const tipo = document.getElementById('tipoAgendamento').value;
    const repeticao = document.getElementById('repeticao').value;
    
    if (!diaSemana || !horario || !tipo) {
        alert('❌ Preencha todos os campos do agendamento!');
        return;
    }
    
    const clienteId = window.clientManager.currentItem?.id;
    const cliente = window.clientManager.currentItem?.['Nome Fantasia'];
    
    if (clienteId) {
        window.clientManager.schedules[clienteId] = {
            cliente,
            diaSemana,
            horario,
            tipo,
            repeticao
        };
        
        window.dbManager.saveData('schedules', window.clientManager.schedules);
        alert('✅ Agendamento salvo com sucesso!');
        
        // Limpar campos
        document.getElementById('diaSemana').value = '';
        document.getElementById('horario').value = '';
        document.getElementById('tipoAgendamento').value = '';
        document.getElementById('repeticao').value = 'Semanal';
    }
}

// Remover agendamento
function removerAgendamento(clientId) {
    if (confirm('Tem certeza que deseja remover este agendamento?')) {
        delete window.clientManager.schedules[clientId];
        window.dbManager.saveData('schedules', window.clientManager.schedules);
        renderAgenda();
    }
}