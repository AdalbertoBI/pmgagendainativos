let currentTab = 'inativos';
let mapLoaded = false;
let mapDataLoaded = false;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicação...');
    
    try {
        if (!window.dbManager) {
            console.error('❌ dbManager não está definido. Verifique a inicialização.');
            return;
        }
        
        await window.dbManager.init();
        await window.clientManager.init();
        
        // Carregar dados dos clientes do dbManager
        const savedClients = await window.dbManager.loadData('clients') || [];
        const savedAtivos = await window.dbManager.loadData('ativos') || [];
        
        if (savedClients.length > 0 || savedAtivos.length > 0) {
            window.clientManager.data = savedClients;
            window.clientManager.ativos = savedAtivos;
            window.data = savedClients;
            window.ativos = savedAtivos;
        }
        
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

// Manipular upload de arquivo
async function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validação de formato
        const validFormats = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validFormats.includes(file.type)) {
            alert('❌ Formato de arquivo inválido! Use apenas arquivos .xls ou .xlsx.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande! O limite é 10MB.');
            return;
        }
        
        console.log('📁 Processando arquivo:', file.name);
        
        // Criar backup antes de limpar dados
        await window.clientManager.createBackup('clients', window.clientManager.data);
        await window.clientManager.createBackup('ativos', window.clientManager.ativos);
        
        // Limpar dados existentes
        await window.dbManager.clearData('clients');
        await window.dbManager.clearData('ativos');
        
        window.clientManager.data = [];
        window.clientManager.ativos = [];
        window.data = [];
        window.ativos = [];
        mapDataLoaded = false;
        
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
                
                // Normalizar headers
                const headers = rawData[0].map(h => {
                    if (!h) return '';
                    return window.clientManager.mapColumnToField(h);
                });
                
                const dataRows = rawData.slice(1);
                const ativos = [];
                const inativos = [];
                
                dataRows.forEach((row, index) => {
                    const hasValidData = row.some(cell => cell && cell.toString().trim() !== '');
                    if (hasValidData) {
                        let obj = {};
                        headers.forEach((header, j) => {
                            obj[header] = row[j] ? row[j].toString().trim() : '';
                        });
                        obj.id = `client-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
                        
                        // Verificar status e separar
                        if (obj.Status && obj.Status.toLowerCase() === 'ativo') {
                            ativos.push(obj);
                        } else {
                            inativos.push(obj);
                        }
                    }
                });
                
                if (ativos.length === 0 && inativos.length === 0) {
                    alert('❌ Nenhum cliente válido encontrado no arquivo!');
                    return;
                }
                
                // Salvar dados
                window.clientManager.data = inativos;
                window.clientManager.ativos = ativos;
                window.data = inativos;
                window.ativos = ativos;
                
                await window.dbManager.saveArrayData('clients', inativos);
                await window.dbManager.saveArrayData('ativos', ativos);
                
                // Atualizar interface
                populateCidades();
                window.clientManager.applyFiltersAndSort();
                renderAtivos();
                
                alert(`✅ Arquivo carregado com sucesso!\n📊 ${ativos.length} clientes ativos e ${inativos.length} inativos encontrados`);
                
            } catch (error) {
                console.error('❌ Erro ao processar arquivo durante leitura:', error);
                alert('❌ Erro ao processar o arquivo: ' + error.message);
            }
        };
        
        reader.onerror = (error) => {
            console.error('❌ Erro ao ler arquivo:', error);
            alert('❌ Erro ao ler o arquivo: ' + error.message);
        };
        
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error('❌ Erro ao manipular upload de arquivo:', error);
        alert('❌ Erro ao processar o arquivo: ' + error.message);
    }



};

// Aplicar filtros salvos
function applySavedFilters() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros salvos:', error);
    }
}

// Configurar eventos da interface
function setupEventListeners() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao configurar event listeners:', error);
    }
}

// Manipuladores de eventos para os botões de ação - NOVOS
function handleTornarAtivo() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao tornar cliente ativo:', error);
    }
}

async function handleConfirmarAtivo() {
    try {
        const cliente = window.clientManager.currentItem;
        const novaData = document.getElementById('editDataPedido').value;
        
        if (!cliente || !novaData) {
            alert('❌ Por favor, insira uma data válida!');
            return;
        }
        
        await window.clientManager.tornarAtivo(cliente, novaData);
        
        // Fechar modal
        document.getElementById('modal').style.display = 'none';
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        renderAtivos();
        
        alert('✅ Cliente tornado ativo com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao confirmar tornar cliente ativo:', error);
        alert('❌ Erro ao tornar cliente ativo: ' + error.message);
    }
}

async function handleExcluirAtivo() {
    try {
        const cliente = window.clientManager.currentItem;
        if (!cliente) return;
        
        if (confirm('Tem certeza que deseja excluir este cliente dos ativos?')) {
            await window.clientManager.excluirAtivo(cliente);
            
            // Fechar modal
            document.getElementById('modal').style.display = 'none';
            
            // Atualizar interface
            renderAtivos();
            
            alert('✅ Cliente removido dos ativos com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir cliente ativo:', error);
        alert('❌ Erro ao excluir cliente ativo: ' + error.message);
    }
}

// Funcionalidades de edição - NOVAS
function toggleEditMode() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao alternar modo de edição:', error);
    }
}

function cancelarEdicaoCliente() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao cancelar edição:', error);
    }
}

async function salvarEdicaoCliente() {
    try {
        const cliente = window.clientManager.currentItem;
        if (!cliente) return;
        
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
        console.error('❌ Erro ao salvar edição do cliente:', error);
        alert('❌ Erro ao editar cliente: ' + error.message);
    }
}


// Configurar PWA com atualização forçada
function setupPWA() {
    try {
        // Pular service worker em desenvolvimento local
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            console.log('⚠️ Service Worker desabilitado para desenvolvimento local');
            return;
        }

        if ('serviceWorker' in navigator) {
            // DESREGISTRAR SERVICE WORKER ANTIGO PRIMEIRO
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    console.log('🗑️ Removendo service worker antigo:', registration.scope);
                    registration.unregister();
                });
            });

            // REGISTRAR NOVO SERVICE WORKER
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado:', registration);
                    
                    // VERIFICAR POR ATUALIZAÇÕES
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 Nova versão do Service Worker encontrada');
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // NOVA VERSÃO DISPONÍVEL - RECARREGAR AUTOMATICAMENTE
                                console.log('🔄 Nova versão detectada! Recarregando...');
                                window.location.reload();
                            }
                        });
                    });

                    // FORÇAR VERIFICAÇÃO DE ATUALIZAÇÃO
                    setInterval(() => {
                        registration.update();
                    }, 60000); // Verificar a cada 1 minuto
                })
                .catch(error => {
                    console.error('❌ Erro ao registrar Service Worker:', error);
                });
        }

        // Botão de instalação PWA
        let deferredPrompt;
        const installBtn = document.getElementById('install-btn');

        function isPWAInstalled() {
            return window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true || 
                   document.referrer.includes('android-app://');
        }

        function updateInstallButton() {
            if (isPWAInstalled()) {
                if (installBtn) installBtn.style.display = 'none';
            }
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!isPWAInstalled() && installBtn) {
                installBtn.style.display = 'block';
            }
        });

        if (installBtn) {
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
        }

        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.style.display = 'none';
            deferredPrompt = null;
        });

        updateInstallButton();

    } catch (error) {
        console.error('❌ Erro ao configurar PWA:', error);
    }
}

// Configurar upload de arquivos
function setupUploadHandler() {
    try {
        const xlsxFile = document.getElementById('xlsxFile');
        if (xlsxFile) {
            xlsxFile.addEventListener('change', handleFileUpload);
        }
    } catch (error) {
        console.error('❌ Erro ao configurar upload handler:', error);
    }
}

// Manipular upload de arquivo
async function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validação de formato
        const validFormats = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validFormats.includes(file.type)) {
            alert('❌ Formato de arquivo inválido! Use apenas arquivos .xls ou .xlsx.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Arquivo muito grande! O limite é 10MB.');
            return;
        }
        
        console.log('📁 Processando arquivo:', file.name);
        
        // Criar backup antes de limpar dados
        await window.clientManager.createBackup('clients', window.clientManager.data);
        await window.clientManager.createBackup('ativos', window.clientManager.ativos);
        
        // Limpar dados existentes
        await window.dbManager.clearData('clients');
        await window.dbManager.clearData('ativos');
        
        // Limpar variáveis globais
        window.clientManager.data = [];
        window.clientManager.ativos = [];
        window.data = [];
        window.ativos = [];
        window.filteredData = [];
        
        // Limpar interfaces
        document.getElementById('list').innerHTML = '<li style="text-align: center; color: #666;">Carregando novos dados...</li>';
        document.getElementById('ativos-list').innerHTML = '<li style="text-align: center; color: #666;">Carregando novos dados...</li>';
        document.getElementById('agenda-list').innerHTML = '<div style="text-align: center; color: #666;">Carregando novos dados...</div>';
        
        // Resetar mapa se estiver visível
        if (currentTab === 'mapa') {
            if (typeof window.clearMarkers === 'function') {
                window.clearMarkers();
            }
            document.getElementById('map-status').textContent = 'Dados resetados - carregando novo arquivo...';
            mapDataLoaded = false;
        }

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
                
                // Normalizar headers
                const headers = rawData[0].map(h => {
                    if (!h) return '';
                    return window.clientManager.mapColumnToField(h);
                });
                
                const dataRows = rawData.slice(1);
                const ativos = [];
                const inativos = [];
                
                dataRows.forEach((row, index) => {
                    const hasValidData = row.some(cell => cell && cell.toString().trim() !== '');
                    if (hasValidData) {
                        let obj = {};
                        headers.forEach((header, j) => {
                            obj[header] = row[j] ? row[j].toString().trim() : '';
                        });
                        obj.id = `client-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
                        
                        // Verificar status e separar
                        if (obj.Status && obj.Status.toLowerCase() === 'ativo') {
                            ativos.push(obj);
                        } else {
                            inativos.push(obj);
                        }
                    }
                });
                
                if (ativos.length === 0 && inativos.length === 0) {
                    alert('❌ Nenhum cliente válido encontrado no arquivo!');
                    return;
                }
                
                // Salvar dados
                window.clientManager.data = inativos;
                window.clientManager.ativos = ativos;
                window.data = inativos;
                window.ativos = ativos;
                
                await window.dbManager.saveArrayData('clients', inativos);
                await window.dbManager.saveArrayData('ativos', ativos);
                
                // Atualizar interface baseada na aba atual
                if (currentTab === 'inativos') {
                    window.clientManager.applyFiltersAndSort();
                } else if (currentTab === 'ativos') {
                    renderAtivos();
                } else if (currentTab === 'mapa' && typeof window.loadMapData === 'function') {
                    window.loadMapData();
                    mapDataLoaded = true;
                } else if (currentTab === 'agenda') {
                    renderAgenda();
                }
                
                // Atualizar componentes compartilhados
                populateCidades();
                updateMapStatus('Dados carregados com sucesso');
                
                alert(`✅ Arquivo carregado com sucesso!\n📊 ${ativos.length} clientes ativos e ${inativos.length} inativos encontrados`);
                
            } catch (error) {
                console.error('❌ Erro ao processar arquivo:', error);
                
                // Restaurar mensagens de estado vazio em caso de erro
                document.getElementById('list').innerHTML = '<li style="text-align: center; color: #666;">Erro ao carregar dados</li>';
                document.getElementById('ativos-list').innerHTML = '<li style="text-align: center; color: #666;">Erro ao carregar dados</li>';
                document.getElementById('agenda-list').innerHTML = '<div style="text-align: center; color: #666;">Erro ao carregar dados</div>';
                
                if (currentTab === 'mapa') {
                    document.getElementById('map-status').textContent = 'Erro ao carregar dados';
                }
                
                alert('❌ Erro ao processar o arquivo: ' + error.message);
            }
        };
        
        reader.onerror = (error) => {
            console.error('❌ Erro ao ler arquivo:', error);
            alert('❌ Erro ao ler o arquivo: ' + error.message);
        };
        
        reader.readAsBinaryString(file);
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        alert('❌ Erro no upload: ' + error.message);
    }
}

// Abrir modal de cadastro
function abrirModalCadastro() {
    try {
        document.getElementById('modal-cadastro').style.display = 'flex';
        document.getElementById('form-cadastro').reset();
        document.getElementById('nome-fantasia').focus();
    } catch (error) {
        console.error('❌ Erro ao abrir modal de cadastro:', error);
    }
}

// Fechar modal de cadastro
function fecharModalCadastro() {
    try {
        document.getElementById('modal-cadastro').style.display = 'none';
    } catch (error) {
        console.error('❌ Erro ao fechar modal de cadastro:', error);
    }
}

// Abrir modal de sucesso
function abrirModalSucesso(clienteData) {
    try {
        const modal = document.getElementById('modal-sucesso');
        const info = document.getElementById('cliente-cadastrado-info');
        
        info.innerHTML = `
            <p><strong>Nome Fantasia:</strong> ${clienteData['Nome Fantasia']}</p>
            <p><strong>Cliente:</strong> ${clienteData['Cliente'] || 'Não informado'}</p>
            <p><strong>Cidade:</strong> ${clienteData['Cidade'] || 'Não informado'}</p>
            <p><strong>Contato:</strong> ${clienteData['Contato'] || 'Não informado'}</p>
        `;
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('❌ Erro ao abrir modal de sucesso:', error);
    }
}

// Fechar modal de sucesso
function fecharModalSucesso() {
    try {
        document.getElementById('modal-sucesso').style.display = 'none';
    } catch (error) {
        console.error('❌ Erro ao fechar modal de sucesso:', error);
    }
}

// Manipular submissão do formulário de cadastro
async function handleCadastroSubmit(event) {
    try {
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
        
        const clienteData = await window.clientManager.cadastrarCliente(formData);
        
        // Fechar modal de cadastro
        fecharModalCadastro();
        
        // Abrir modal de sucesso
        abrirModalSucesso(clienteData);
        
        // Atualizar interface
        populateCidades();
        window.clientManager.applyFiltersAndSort();
        
    } catch (error) {
        console.error('❌ Erro ao cadastrar cliente:', error);
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
            'Saldo de Credito',
            'Limite de Crédito a Vista',
            'Saldo de Credito a Vista',
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
    try {
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
                        // Carregar dados do mapa se houver dados disponíveis
                        if (window.clientManager.data.length > 0 && !mapDataLoaded && typeof window.loadMapData === 'function') {
                            window.loadMapData();
                            mapDataLoaded = true;
                        }

                        if (typeof window.setupEditButton === 'function') {
                            window.setupEditButton();
                        }

                        // Adicionar listener para o checkbox "Incluir inativos"
                        const includeInativosCheckbox = document.getElementById('include-inativos-checkbox');
                        if (includeInativosCheckbox) {
                            includeInativosCheckbox.addEventListener('change', () => {
                                mapDataLoaded = false;
                                if (window.clientManager.data.length > 0 && !mapDataLoaded && typeof window.loadMapData === 'function') {
                                    window.loadMapData();
                                    mapDataLoaded = true;
                                }
                            });
                        }
                    }, 1000);
                }
            }, 100);
        } else if (tab === 'catalogo') {
            console.log('📦 Inicializando aba catálogo...');
            setTimeout(() => {
                if (window.catalogManager && typeof window.catalogManager.init === 'function') {
                    window.catalogManager.init();
                }
            }, 100);
            } else if (tab === 'prospeccao') {
    console.log('🎯 Inicializando aba prospecção...');
    // A funcionalidade está toda contida no iframe

        }

    } catch (error) {
        console.error('❌ Erro ao abrir aba:', error);
    }
}


// Salvar filtros
function saveFilters() {
    try {
        const filters = {
            saldoMin: parseFloat(document.getElementById('saldoFilter')?.value) || 0,
            cidadesSelecionadas: Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value),
            sort: document.getElementById('sortOption')?.value || 'nome-az'
        };
        
        window.dbManager.saveFilters(filters);
    } catch (error) {
        console.error('❌ Erro ao salvar filtros:', error);
    }
}

// Popular lista de cidades
function populateCidades() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao popular lista de cidades:', error);
    }
}

// Alternar visibilidade da lista de cidades
function toggleCidades() {
    try {
        const selector = document.getElementById('cidadeSelector');
        const list = document.getElementById('cidadeList');
        
        if (!selector || !list) return;
        
        const aberto = list.classList.toggle('visivel');
        list.classList.toggle('escondido', !aberto);
        selector.classList.toggle('aberto', aberto);
        
        document.getElementById('cidadeSelectorText').textContent = aberto ? 'Ocultar cidades' : 'Selecionar cidades';
    } catch (error) {
        console.error('❌ Erro ao alternar visibilidade de cidades:', error);
    }
}

// Renderizar lista de ativos
function renderAtivos() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao renderizar lista de ativos:', error);
    }
}

// Renderizar agenda
function renderAgenda() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao renderizar agenda:', error);
    }
}

// Salvar observações
function salvarObservacoes() {
    try {
        const observacoes = document.getElementById('observacoes').value;
        const clienteId = window.clientManager.currentItem?.id;
        
        if (clienteId) {
            window.dbManager.saveObservation(clienteId, observacoes);
            alert('✅ Observações salvas com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar observações:', error);
        alert('❌ Erro ao salvar observações: ' + error.message);
    }
}

// Salvar agendamento
function salvarAgendamento() {
    try {
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
    } catch (error) {
        console.error('❌ Erro ao salvar agendamento:', error);
        alert('❌ Erro ao salvar agendamento: ' + error.message);
    }
}

// Remover agendamento
function removerAgendamento(clientId) {
    try {
        if (confirm('Tem certeza que deseja remover este agendamento?')) {
            delete window.clientManager.schedules[clientId];
            window.dbManager.saveData('schedules', window.clientManager.schedules);
            renderAgenda();
            alert('✅ Agendamento removido com sucesso!');
        }
    } catch (error) {
        console.error('❌ Erro ao remover agendamento:', error);
        alert('❌ Erro ao remover agendamento: ' + error.message);
    }
}
// FUNÇÃO DE EMERGÊNCIA - LIMPAR TUDO
function limparTudoERecarregar() {
    if (confirm('⚠️ Isso vai limpar todos os dados salvos. Continuar?')) {
        // Limpar Service Workers
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(reg => reg.unregister());
        });
        
        // Limpar todos os storages
        localStorage.clear();
        sessionStorage.clear();
        
        // Limpar IndexedDB
        if (window.dbManager) {
            window.dbManager.clearAllData();
        }
        
        // Limpar caches
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
        
        alert('✅ Limpeza concluída! A página será recarregada.');
        window.location.reload(true);
    }
}

// Disponibilizar no console para emergências
window.limparTudoERecarregar = limparTudoERecarregar;

//teste