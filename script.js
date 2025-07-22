// script.js - Sistema PMG Agenda MELHORADO E OTIMIZADO
let currentTab = 'inativos';
let isSystemReady = false;
let isProcessingGeocode = false;
let mapInitialized = false;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let isLowEndDevice = navigator.hardwareConcurrency <= 2;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando PMG Agenda Melhorado...');
        console.log(`📱 Dispositivo: ${isMobile ? 'Mobile' : 'Desktop'}`);
        
        showLoadingIndicator();
        
        // Configurações específicas para mobile
        if (isMobile) {
            setupMobileOptimizations();
        }
        
        await initializeSystem();
        
        isSystemReady = true;
        console.log('✅ Sistema melhorado pronto!');
        
        // Inicializar mapa automaticamente
        setTimeout(async () => {
            await initializeMapAutomatically();
            hideLoadingIndicator();
        }, 300);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        hideLoadingIndicator();
        showErrorMessage('Erro ao inicializar sistema: ' + error.message);
        await initializeBasicSystem();
    }
});

function setupMobileOptimizations() {
    console.log('📱 Aplicando otimizações mobile...');
    
    // Viewport otimizado
    let viewport = document.querySelector("meta[name=viewport]");
    if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = "viewport";
        document.head.appendChild(viewport);
    }
    viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    
    // Prevenir zoom acidental
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    
    // Otimizar performance em dispositivos lentos
    if (isLowEndDevice) {
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
    }
    
    console.log('✅ Otimizações mobile aplicadas');
}

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando sistema melhorado...');
        
        // Aguardar dependências com timeouts adequados
        const timeoutBase = isMobile ? 20000 : 15000;
        await waitForLibrary('XLSX', timeoutBase);
        await waitForLibrary('L', timeoutBase);
        
        // Inicializar managers sequencialmente
        console.log('📊 Inicializando DBManager...');
        await window.dbManager?.init();
        
        console.log('👥 Inicializando ClientManager...');
        await window.clientManager?.init();
        
        // Configurar interface
        setupEventListeners();
        setupTabNavigation();
        setupKeyboardShortcuts();
        
        // Renderizar dados existentes
        renderAllTabs();
        updateTabCounts();
        
        // Verificar dados existentes
        await checkExistingData();
        
        console.log('🎉 Sistema melhorado inicializado!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização do sistema:', error);
        throw error;
    }
}

async function checkExistingData() {
    const totalClients = window.clientManager?.getTotalCount() || 0;
    
    if (totalClients > 0) {
        console.log(`✅ Sistema restaurado com ${totalClients} clientes existentes`);
        updateDataInfo(`Dados restaurados (${totalClients} clientes)`);
        
        // Verificar geocodificação existente
        const allClients = [
            ...(window.clientManager.data || []),
            ...(window.clientManager.ativos || []),
            ...(window.clientManager.novos || [])
        ];
        
        const geocodedCount = allClients.filter(c => c.geocoding?.success).length;
        
        if (geocodedCount > 0) {
            // Mostrar dados existentes no mapa
            setTimeout(async () => {
                await updateMapWithResults(allClients);
                showSuccessMessage(`📍 ${geocodedCount} localizações carregadas no mapa`);
            }, 1000);
        } else if (geocodedCount < totalClients && !isMobile) {
            // Oferecer reprocessamento apenas em desktop
            setTimeout(() => {
                if (confirm(`${totalClients} clientes carregados, ${geocodedCount} localizados.\n\nDeseja processar as localizações agora?`)) {
                    startGeocodingProcess();
                }
            }, 2000);
        }
    } else {
        console.log('ℹ️ Sistema iniciado sem dados existentes');
    }
}

async function waitForLibrary(name, timeout = 15000) {
    const start = Date.now();
    while (!window[name] && (Date.now() - start) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!window[name]) {
        throw new Error(`Biblioteca ${name} não carregou em ${timeout}ms`);
    }
    console.log(`✅ ${name} carregado com sucesso`);
}

async function initializeBasicSystem() {
    try {
        console.log('🚑 Modo de emergência ativo...');
        setupBasicEventListeners();
        isSystemReady = true;
        showNotification('Sistema em modo básico. Algumas funcionalidades podem estar limitadas.', 'info');
        console.log('✅ Sistema básico funcionando');
    } catch (error) {
        console.error('❌ Falha crítica no sistema básico:', error);
    }
}

function setupEventListeners() {
    console.log('🔧 Configurando listeners de eventos...');
    
    // Upload de arquivos
    setupFileUpload();
    
    // Modal
    setupModal();
    
    // Filtros e ordenação
    setupFilters();
    
    // Controles do mapa
    setupMapControls();
    
    // Eventos de janela
    setupWindowEvents();
    
    console.log('✅ Event listeners configurados');
}

function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✅ Input de arquivo configurado');
    }
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput?.click());
        setupDragDrop(uploadArea);
        console.log('✅ Área de upload configurada');
    }
}

function setupDragDrop(element) {
    const events = ['dragover', 'dragenter'];
    const leaveEvents = ['dragleave', 'dragend'];
    
    events.forEach(event => {
        element.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('drag-over');
        });
    });
    
    leaveEvents.forEach(event => {
        element.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
        });
    });
    
    element.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const excelFile = files.find(file => 
            file.type.includes('sheet') || file.name.match(/\.(xlsx|xls)$/i)
        );
        
        if (excelFile) {
            await processFile(excelFile);
        } else {
            showErrorMessage('Por favor, solte um arquivo Excel (.xlsx ou .xls)');
        }
    });
}

function setupModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
}

function setupFilters() {
    const sortOption = document.getElementById('sortOption');
    if (sortOption) {
        sortOption.addEventListener('change', () => {
            window.clientManager?.applyFiltersAndSort();
        });
    }
}

function setupMapControls() {
    const refreshMapBtn = document.getElementById('refresh-map');
    const clearCacheBtn = document.getElementById('clear-cache');
    
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', async () => {
            await handleRefreshMap(refreshMapBtn);
        });
    }
    
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            handleClearCache();
        });
    }
}

async function handleRefreshMap(button) {
    const originalText = button.innerHTML;
    try {
        button.disabled = true;
        button.innerHTML = '🔄 Atualizando...';
        
        await refreshMapWithClients();
        showSuccessMessage('Mapa atualizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar mapa:', error);
        showErrorMessage('Erro ao atualizar mapa: ' + error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function handleClearCache() {
    try {
        if (window.geocodingService) {
            window.geocodingService.clearCache();
        }
        
        if (window.cepProcessor) {
            window.cepProcessor.clearCache();
        }
        
        // Limpar localStorage temporário
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('temp_') || key.includes('cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        showSuccessMessage('Cache limpo com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        showErrorMessage('Erro ao limpar cache: ' + error.message);
    }
}

function setupWindowEvents() {
    // Salvar dados antes de sair
    window.addEventListener('beforeunload', () => {
        if (window.clientManager?.saveAllData) {
            window.clientManager.saveAllData();
        }
    });
    
    // Redimensionar mapa quando janela muda
    window.addEventListener('resize', debounce(() => {
        if (window.mapInstance) {
            setTimeout(() => {
                window.mapInstance.invalidateSize(true);
            }, 100);
        }
    }, 300));
    
    // Detectar mudanças de conectividade
    window.addEventListener('online', () => {
        showNotification('Conexão restaurada', 'success');
    });
    
    window.addEventListener('offline', () => {
        showNotification('Conexão perdida - funcionando offline', 'info');
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + teclas
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    switchToTab('inativos');
                    break;
                case '2':
                    e.preventDefault();
                    switchToTab('ativos');
                    break;
                case '3':
                    e.preventDefault();
                    switchToTab('novos');
                    break;
                case '4':
                    e.preventDefault();
                    switchToTab('agenda');
                    break;
                case '5':
                    e.preventDefault();
                    switchToTab('mapa');
                    break;
                case 'u':
                    e.preventDefault();
                    document.getElementById('file-input')?.click();
                    break;
            }
        }
    });
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.getAttribute('data-tab');
            await switchToTab(tabName);
        });
    });
}

async function switchToTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remover active de todos
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Ativar selecionado
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}-tab`);
    
    if (targetButton) targetButton.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
    
    currentTab = tabName;
    
    // Renderizar conteúdo específico
    switch(tabName) {
        case 'inativos':
            renderInativos();
            break;
        case 'ativos':
            renderAtivos();
            break;
        case 'novos':
            renderNovos();
            break;
        case 'agenda':
            renderAgenda();
            break;
        case 'mapa':
            await handleMapTabActivation();
            break;
    }
}

async function handleMapTabActivation() {
    try {
        console.log('🗺️ Ativando aba do mapa...');
        
        if (!mapInitialized) {
            showNotification('Inicializando mapa...', 'info');
            await initializeMapAutomatically();
        }
        
        // Redimensionar mapa
        if (window.mapInstance) {
            setTimeout(() => {
                window.mapInstance.invalidateSize(true);
                console.log('🔄 Mapa redimensionado');
            }, 200);
        }
        
        updateMapStatus('Ativo');
        
    } catch (error) {
        console.error('❌ Erro ao ativar mapa:', error);
        updateMapStatus('Erro');
        showMapFallback();
    }
}

async function initializeMapAutomatically() {
    try {
        if (mapInitialized) return;
        
        console.log('🗺️ Inicializando mapa automaticamente...');
        
        // Verificar Leaflet
        if (typeof L === 'undefined') {
            console.log('⏳ Aguardando Leaflet...');
            await waitForLibrary('L', isMobile ? 15000 : 10000);
        }
        
        // Criar mapa
        await createMapInstance();
        
        mapInitialized = true;
        updateMapStatus('Mapa carregado');
        
        console.log('✅ Mapa inicializado automaticamente');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mapa:', error);
        updateMapStatus('Erro no mapa');
        showMapFallback();
    }
}

async function createMapInstance() {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            throw new Error('Container do mapa não encontrado');
        }
        
        // Configurar container
        mapContainer.innerHTML = '';
        mapContainer.style.cssText = `
            height: ${isMobile ? '400px' : '500px'};
            width: 100%;
            border-radius: 8px;
            overflow: hidden;
        `;
        
        console.log('🗺️ Criando instância do mapa...');
        
        // Obter localização do usuário
        const userLocation = await getUserLocationSafely();
        
        // Configurações do mapa
        let center = [-23.2237, -45.9009]; // São José dos Campos
        let zoom = isMobile ? 11 : 12;
        
        if (userLocation && userLocation.accuracy < 5000) {
            center = [userLocation.lat, userLocation.lon];
            zoom = userLocation.accuracy < 500 ? (isMobile ? 13 : 14) : zoom;
            console.log('📍 Usando localização do usuário:', center);
        }
        
        // Criar mapa
        const map = L.map('map', {
            center: center,
            zoom: zoom,
            zoomControl: !isMobile,
            attributionControl: !isMobile,
            maxZoom: 17,
            minZoom: isMobile ? 9 : 8,
            preferCanvas: isLowEndDevice,
            tap: true,
            tapTolerance: 15,
            touchZoom: true,
            scrollWheelZoom: !isMobile
        });
        
        // Adicionar tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: isMobile ? '' : '© OpenStreetMap',
            errorTileUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23f0f0f0"/><text x="128" y="128" text-anchor="middle" font-family="Arial" font-size="14" fill="%23999">Tile não disponível</text></svg>'
        }).addTo(map);
        
        // Controles personalizados para mobile
        if (isMobile) {
            addMobileControls(map);
        }
        
        // Marcador do usuário
        if (userLocation) {
            addUserLocationMarker(map, userLocation);
        }
        
        // Salvar referência
        window.mapInstance = map;
        
        // Eventos do mapa
        setupMapEvents(map);
        
        // Redimensionar após criação
        setTimeout(() => {
            map.invalidateSize(true);
        }, 300);
        
        console.log('✅ Mapa criado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao criar mapa:', error);
        throw error;
    }
}

function addMobileControls(map) {
    // Botão de localização
    const locationControl = L.control({position: 'bottomright'});
    locationControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'mobile-location-control');
        div.innerHTML = `
            <button onclick="centerMapOnUser()" style="
                background: #007bff;
                color: white;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                font-size: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                cursor: pointer;
            ">📍</button>
        `;
        return div;
    };
    locationControl.addTo(map);
}

function addUserLocationMarker(map, userLocation) {
    const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '📍',
        iconSize: isMobile ? [35, 35] : [30, 30],
        iconAnchor: isMobile ? [17.5, 35] : [15, 30]
    });
    
    const userMarker = L.marker([userLocation.lat, userLocation.lon], {
        icon: userIcon,
        zIndexOffset: 1000
    }).addTo(map);
    
    userMarker.bindPopup(`
        <div style="text-align: center; font-size: ${isMobile ? '14px' : '12px'};">
            <h4>📍 Sua Localização</h4>
            <p><strong>Precisão:</strong> ±${Math.round(userLocation.accuracy)}m</p>
            <p><strong>Atualização:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
    `, {
        closeButton: !isMobile,
        maxWidth: isMobile ? 200 : 300
    });
}

function setupMapEvents(map) {
    // Otimizar performance durante movimentação
    let moveTimeout;
    map.on('move', () => {
        clearTimeout(moveTimeout);
        moveTimeout = setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });
    
    // Eventos para mobile
    if (isMobile) {
        map.on('zoomstart', () => {
            document.body.style.overflow = 'hidden';
        });
        
        map.on('zoomend', () => {
            document.body.style.overflow = '';
        });
    }
}

async function getUserLocationSafely() {
    return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
            console.warn('⚠️ Geolocalização não suportada');
            resolve(null);
            return;
        }
        
        console.log('📍 Obtendo localização do usuário...');
        
        const timeout = isMobile ? 12000 : 8000;
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Timeout na geolocalização');
            resolve(null);
        }, timeout);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeoutId);
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                console.log('✅ Localização obtida:', location);
                resolve(location);
            },
            (error) => {
                clearTimeout(timeoutId);
                console.warn('⚠️ Erro de geolocalização:', error.message);
                resolve(null);
            },
            {
                enableHighAccuracy: !isLowEndDevice,
                timeout: timeout - 1000,
                maximumAge: isMobile ? 600000 : 300000
            }
        );
    });
}

// Função global para botão de localização
window.centerMapOnUser = async function() {
    try {
        if (!window.mapInstance) return;
        
        showNotification('📍 Obtendo sua localização...', 'info');
        
        const location = await getUserLocationSafely();
        
        if (location) {
            window.mapInstance.setView([location.lat, location.lon], isMobile ? 13 : 14, {
                animate: true,
                duration: 1
            });
            showNotification('✅ Mapa centralizado na sua localização', 'success');
        } else {
            showNotification('⚠️ Não foi possível obter sua localização', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao centralizar mapa:', error);
        showNotification('❌ Erro ao obter localização', 'error');
    }
};

function showMapFallback() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: ${isMobile ? '400px' : '500px'}; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 8px; 
                color: white;
                text-align: center;
                padding: 2rem;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🗺️</div>
                <h3 style="margin-bottom: 1rem; font-weight: 600;">Mapa Indisponível</h3>
                <p style="margin-bottom: 1.5rem; opacity: 0.9; line-height: 1.5;">
                    O mapa será carregado assim que os clientes forem geocodificados.
                </p>
                <button onclick="initializeMapAutomatically()" class="btn" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 2px solid white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 25px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        await processFile(file);
    }
}

async function processFile(file) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showErrorMessage('Formato inválido. Use arquivos Excel (.xlsx ou .xls)');
        return;
    }
    
    try {
        console.log('📊 Processando arquivo:', file.name);
        showNotification(`Carregando ${file.name}...`, 'info');
        
        // Verificar tamanho do arquivo
        if (file.size > 10 * 1024 * 1024) { // 10MB
            showErrorMessage('Arquivo muito grande. Máximo 10MB.');
            return;
        }
        
        // Ler arquivo
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            codepage: 65001 // UTF-8
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            blankrows: false
        });
        
        if (jsonData.length === 0) {
            throw new Error('Planilha vazia ou sem dados válidos');
        }
        
        console.log(`📈 ${jsonData.length} linhas extraídas da planilha`);
        
        // Validar estrutura dos dados
        validateDataStructure(jsonData);
        
        // Categorizar dados
        const processedData = categorizeData(jsonData);
        
        // Processar no clientManager
        if (!window.clientManager) {
            throw new Error('Sistema de clientes não disponível');
        }
        
        await window.clientManager.processNewData(processedData);
        
        // Atualizar interface
        renderAllTabs();
        updateTabCounts();
        updateDataInfo(file.name);
        
        showSuccessMessage(`${jsonData.length} clientes carregados com sucesso!`);
        
        // Iniciar geocodificação
        setTimeout(() => {
            if (jsonData.length <= 50) {
                startGeocodingProcess();
            } else {
                if (confirm(`${jsonData.length} clientes carregados.\n\nIniciar processo de localização? (Pode demorar alguns minutos)`)) {
                    startGeocodingProcess();
                }
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        showErrorMessage(`Erro ao processar planilha: ${error.message}`);
    }
}

function validateDataStructure(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos ou planilha vazia');
    }
    
    const requiredFields = ['Nome Fantasia', 'Status'];
    const firstRow = data[0];
    
    const missingFields = requiredFields.filter(field => !(field in firstRow));
    if (missingFields.length > 0) {
        console.warn(`⚠️ Campos recomendados não encontrados: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ Estrutura de dados validada');
}

function categorizeData(rawData) {
    const clients = [];
    const ativos = [];
    const novos = [];
    let processedCount = 0;
    
    rawData.forEach((row, index) => {
        try {
            // Gerar ID único
            if (!row.id && !row['ID Cliente']) {
                row.id = `client_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
            }
            
            // Limpar dados
            Object.keys(row).forEach(key => {
                if (typeof row[key] === 'string') {
                    row[key] = row[key].trim();
                }
            });
            
            const status = (row['Status'] || '').toLowerCase().trim();
            
            if (status.includes('ativo') && !status.includes('inativo')) {
                ativos.push(row);
            } else if (status.includes('novo')) {
                novos.push(row);
            } else {
                clients.push(row);
            }
            
            processedCount++;
            
        } catch (error) {
            console.warn(`⚠️ Erro ao processar linha ${index}:`, error.message);
        }
    });
    
    console.log(`📊 ${processedCount} clientes categorizados: 🔴${clients.length} 🟢${ativos.length} 🆕${novos.length}`);
    
    return { 
        clients, 
        ativos, 
        novos, 
        schedules: {} 
    };
}

async function startGeocodingProcess() {
    if (isProcessingGeocode) {
        showNotification('Geocodificação já em andamento', 'info');
        return;
    }
    
    if (!window.geocodingService) {
        showErrorMessage('Serviço de geocodificação não disponível');
        return;
    }
    
    try {
        isProcessingGeocode = true;
        
        // Coletar todos os clientes
        const allClients = [
            ...(window.clientManager.data || []),
            ...(window.clientManager.ativos || []),
            ...(window.clientManager.novos || [])
        ];
        
        if (allClients.length === 0) {
            showNotification('Nenhum cliente para processar', 'info');
            return;
        }
        
        console.log(`🗺️ Iniciando geocodificação de ${allClients.length} clientes`);
        
        // Mostrar progresso
        showProgressSection();
        updateMapStatus('Processando localizações...');
        
        // Mostrar informações do processo
        const estimatedTime = Math.ceil(allClients.length * 2.5 / 60);
        showNotification(
            `Iniciando localização de ${allClients.length} clientes.\n\n` +
            `Tempo estimado: ${estimatedTime} minutos\n` +
            `O processo é otimizado para evitar erros.`,
            'info'
        );
        
        // Processar clientes
        const results = await window.geocodingService.geocodeClients(
            allClients,
            (progress) => updateProgress(progress)
        );
        
        // Atualizar mapa
        await updateMapWithResults(results);
        
        // Esconder progresso
        hideProgressSection();
        
        // Mostrar resultados
        const stats = window.geocodingService.getStats();
        const successCount = results.filter(r => r.geocoding?.success).length;
        
        updateMapStatus(`${successCount} localizações encontradas`);
        
        showSuccessMessage(
            `🎉 Geocodificação concluída!\n\n` +
            `✅ Sucessos: ${successCount}/${allClients.length}\n` +
            `📦 Cache: ${stats.cacheHits || 0} hits\n` +
            `🌐 Requests: ${stats.requests || 0}\n\n` +
            `Taxa de sucesso: ${Math.round((successCount / allClients.length) * 100)}%`
        );
        
        // Salvar resultados
        await saveGeocodingResults(results);
        
    } catch (error) {
        hideProgressSection();
        updateMapStatus('Erro na geocodificação');
        
        console.error('❌ Erro na geocodificação:', error);
        showErrorMessage(`Erro na geocodificação: ${error.message}`);
        
    } finally {
        isProcessingGeocode = false;
    }
}

async function updateMapWithResults(results) {
    try {
        console.log('🗺️ Atualizando mapa com resultados...');
        
        if (!mapInitialized || !window.mapInstance) {
            await initializeMapAutomatically();
        }
        
        if (!window.mapInstance) {
            console.warn('⚠️ Mapa não disponível');
            return;
        }
        
        // Limpar marcadores existentes (exceto usuário)
        window.mapInstance.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.options.zIndexOffset !== 1000) {
                window.mapInstance.removeLayer(layer);
            }
        });
        
        // Adicionar marcadores em lotes
        const batchSize = isMobile ? 10 : 20;
        const markersAdded = [];
        let successCount = 0;
        
        for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            
            batch.forEach((client) => {
                if (client.geocoding?.success && client.geocoding.coordinates) {
                    try {
                        const marker = createOptimizedMarker(client);
                        if (marker) {
                            marker.addTo(window.mapInstance);
                            markersAdded.push(marker);
                            successCount++;
                        }
                    } catch (markerError) {
                        console.warn(`⚠️ Erro ao criar marcador: ${markerError.message}`);
                    }
                }
            });
            
            // Pausa entre lotes em mobile
            if (isMobile && i + batchSize < results.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`✅ ${successCount} marcadores adicionados`);
        
        // Ajustar zoom
        if (markersAdded.length > 0) {
            try {
                const group = new L.featureGroup(markersAdded);
                window.mapInstance.fitBounds(group.getBounds(), {
                    padding: isMobile ? [30, 30] : [20, 20],
                    maxZoom: isMobile ? 14 : 15
                });
            } catch (boundsError) {
                console.warn('⚠️ Erro ao ajustar zoom:', boundsError.message);
            }
        }
        
        updateMapStatus(`${successCount} localizações no mapa`);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar mapa:', error);
        updateMapStatus('Erro ao atualizar mapa');
    }
}

function createOptimizedMarker(client) {
    try {
        const coords = client.geocoding.coordinates;
        const status = client['Status'] || 'Inativo';
        const isApproximate = client.geocoding.isApproximate;
        const confidence = client.geocoding.confidence || 0;
        
        // Definir ícone
        let iconSymbol = '📍';
        let iconClass = 'client-marker';
        
        if (status.toLowerCase().includes('ativo')) {
            iconSymbol = '🟢';
            iconClass += ' client-active';
        } else if (status.toLowerCase().includes('novo')) {
            iconSymbol = '🆕';
            iconClass += ' client-new';
        } else {
            iconSymbol = '🔴';
            iconClass += ' client-inactive';
        }
        
        if (isApproximate || confidence < 0.5) {
            iconSymbol = '❓';
            iconClass += ' client-approximate';
        } else if (client.geocoding.method?.includes('viacep')) {
            iconSymbol = '✅';
            iconClass += ' client-verified';
        }
        
        const iconSize = isMobile ? [28, 28] : [24, 24];
        const iconAnchor = isMobile ? [14, 28] : [12, 24];
        
        const icon = L.divIcon({
            className: iconClass,
            html: iconSymbol,
            iconSize: iconSize,
            iconAnchor: iconAnchor
        });
        
        const marker = L.marker([coords.lat, coords.lon], { icon });
        
        // Popup otimizado
        const popupContent = createOptimizedPopup(client);
        marker.bindPopup(popupContent, {
            closeButton: !isMobile,
            maxWidth: isMobile ? 280 : 300,
            className: isMobile ? 'mobile-popup' : ''
        });
        
        return marker;
        
    } catch (error) {
        console.error('❌ Erro ao criar marcador:', error);
        return null;
    }
}

function createOptimizedPopup(client) {
    const nome = client['Nome Fantasia'] || 'Cliente';
    const contato = client['Contato'] || 'N/A';
    const telefone = client['Celular'] || 'N/A';
    const endereco = client['Endereço'] || 'N/A';
    const status = client['Status'] || 'N/A';
    
    const geocoding = client.geocoding || {};
    const confidence = Math.round((geocoding.confidence || 0) * 100);
    
    // Links de ação
    let actionButtons = '';
    
    // WhatsApp
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
        const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
        const message = encodeURIComponent(`Olá ${nome}, sou da PMG.`);
        actionButtons += `
            <a href="https://wa.me/${whatsappNumber}?text=${message}" 
               target="_blank" 
               class="popup-button whatsapp-button">
               📱 WhatsApp
            </a>
        `;
    }
    
    // Rota
    if (geocoding.coordinates) {
        const lat = geocoding.coordinates.lat;
        const lon = geocoding.coordinates.lon;
        actionButtons += `
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving" 
               target="_blank" 
               class="popup-button route-button">
               🗺️ Rota
            </a>
        `;
    }
    
    return `
        <div class="client-popup-optimized">
            <h4>${nome}</h4>
            <div class="popup-info">
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Contato:</strong> ${contato}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
            </div>
            <div class="popup-actions">
                ${actionButtons}
            </div>
            <div class="popup-footer">
                Precisão: ${confidence}%${geocoding.isApproximate ? ' (aproximado)' : ''}
            </div>
        </div>
    `;
}

async function saveGeocodingResults(results) {
    try {
        console.log('💾 Salvando resultados da geocodificação...');
        
        if (!window.clientManager) return;
        
        // Função para atualizar cliente
        const updateClientArray = (clientArray, results) => {
            return clientArray.map(client => {
                const clientId = getClientId(client);
                const result = results.find(r => getClientId(r) === clientId);
                
                if (result && result.geocoding) {
                    return { ...client, geocoding: result.geocoding };
                }
                return client;
            });
        };
        
        // Atualizar arrays
        if (window.clientManager.data) {
            window.clientManager.data = updateClientArray(window.clientManager.data, results);
        }
        if (window.clientManager.ativos) {
            window.clientManager.ativos = updateClientArray(window.clientManager.ativos, results);
        }
        if (window.clientManager.novos) {
            window.clientManager.novos = updateClientArray(window.clientManager.novos, results);
        }
        
        // Salvar
        await window.clientManager.saveAllData();
        
        console.log('✅ Resultados salvos');
        
    } catch (error) {
        console.error('❌ Erro ao salvar resultados:', error);
    }
}

function getClientId(client) {
    return client.id || 
           client['ID Cliente'] || 
           client['Nome Fantasia'] || 
           `client_${Math.random().toString(36).substr(2, 9)}`;
}

async function refreshMapWithClients() {
    try {
        if (!mapInitialized) {
            await initializeMapAutomatically();
        }
        
        if (window.clientManager) {
            const allClients = [
                ...(window.clientManager.data || []),
                ...(window.clientManager.ativos || []),
                ...(window.clientManager.novos || [])
            ];
            
            const geocodedClients = allClients.filter(c => c.geocoding?.success);
            
            if (geocodedClients.length > 0) {
                await updateMapWithResults(geocodedClients);
                showSuccessMessage(`${geocodedClients.length} localizações atualizadas no mapa`);
            } else {
                showNotification('Nenhum cliente geocodificado encontrado', 'info');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar mapa:', error);
        throw error;
    }
}

function showProgressSection() {
    const section = document.getElementById('progress-section');
    if (section) {
        section.style.display = 'block';
        window.geocodingStartTime = Date.now();
    }
}

function hideProgressSection() {
    const section = document.getElementById('progress-section');
    if (section) {
        section.style.display = 'none';
    }
}

function updateProgress(progress) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const currentClient = document.getElementById('current-client');
    
    if (progressBar) {
        progressBar.style.width = `${progress.percentage}%`;
    }
    
    if (progressText) {
        const elapsed = Math.floor((Date.now() - (window.geocodingStartTime || Date.now())) / 1000);
        const avgTime = elapsed / progress.current;
        const remaining = Math.ceil((progress.total - progress.current) * avgTime);
        
        progressText.innerHTML = `
            ${progress.current} de ${progress.total} (${progress.percentage}%)
            <br><small>Restam ~${Math.floor(remaining / 60)}min ${remaining % 60}s</small>
        `;
    }
    
    if (currentClient && progress.client) {
        currentClient.innerHTML = `
            <strong>${progress.client['Nome Fantasia']}</strong>
            <br><small>Processando cliente ${progress.current} de ${progress.total}</small>
        `;
    }
}

function renderAllTabs() {
    renderInativos();
    renderAtivos();
    renderNovos();
    renderAgenda();
}

function renderInativos() {
    if (window.clientManager?.applyFiltersAndSort) {
        window.clientManager.applyFiltersAndSort();
    } else {
        renderClientList('client-list', window.clientManager?.data || []);
    }
}

function renderAtivos() {
    renderClientList('ativos-list', window.clientManager?.ativos || []);
}

function renderNovos() {
    renderClientList('novos-list', window.clientManager?.novos || []);
}

function renderAgenda() {
    const list = document.getElementById('agenda-list');
    if (list) {
        const schedules = window.clientManager?.schedules || {};
        const scheduleList = Object.values(schedules);
        
        if (scheduleList.length === 0) {
            list.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado</div>';
        } else {
            list.innerHTML = scheduleList.map(schedule => `
                <div class="schedule-item">
                    <h4>${schedule.clientName}</h4>
                    <p><strong>Data:</strong> ${new Date(schedule.date).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Hora:</strong> ${schedule.time}</p>
                    ${schedule.notes ? `<p><strong>Observações:</strong> ${schedule.notes}</p>` : ''}
                </div>
            `).join('');
        }
    }
}

function renderClientList(containerId, clients) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum cliente encontrado</div>';
        return;
    }
    
    container.innerHTML = '';
    
    clients.forEach(client => {
        const div = document.createElement('div');
        div.className = 'client-item';
        
        const geocodingStatus = client.geocoding?.success ? 
            `<div class="status-indicator geocoded">📍 Localizado (${Math.round((client.geocoding.confidence || 0) * 100)}%)</div>` : 
            '<div class="status-indicator pending">📍 Aguardando localização</div>';
        
        const scheduleStatus = window.clientManager?.schedules?.[getClientId(client)] ? 
            '<div class="status-indicator scheduled">📅 Agendado</div>' : '';
        
        div.innerHTML = `
            <div class="client-header">
                <h4>${client['Nome Fantasia'] || 'Cliente'}</h4>
                <span class="status-badge status-${getStatusClass(client['Status'])}">
                    ${client['Status'] || 'Inativo'}
                </span>
            </div>
            <div class="client-info">
                <p><strong>Contato:</strong> ${client['Contato'] || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${client['Celular'] || 'N/A'}</p>
                <p><strong>Segmento:</strong> ${client['Segmento'] || 'N/A'}</p>
            </div>
            <div class="client-status">
                ${geocodingStatus}
                ${scheduleStatus}
            </div>
        `;
        
        div.onclick = () => {
            if (window.clientManager?.showClientModal) {
                window.clientManager.showClientModal(client);
            }
        };
        
        container.appendChild(div);
    });
}

function getStatusClass(status) {
    if (!status) return 'inactive';
    const lower = status.toLowerCase();
    if (lower.includes('ativo') && !lower.includes('inativo')) return 'active';
    if (lower.includes('novo')) return 'new';
    return 'inactive';
}

function updateTabCounts() {
    const counts = {
        'inativos-count': window.clientManager?.data?.length || 0,
        'ativos-count': window.clientManager?.ativos?.length || 0,
        'novos-count': window.clientManager?.novos?.length || 0,
        'agenda-count': Object.keys(window.clientManager?.schedules || {}).length
    };
    
    Object.entries(counts).forEach(([id, count]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = count;
        }
    });
}

function updateDataInfo(fileName) {
    const dataInfo = document.getElementById('data-info');
    if (dataInfo && fileName) {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        dataInfo.textContent = `📁 ${fileName} - ${timestamp}`;
    }
}

function updateMapStatus(status) {
    const mapStatus = document.getElementById('map-status');
    if (mapStatus) {
        mapStatus.textContent = status;
    }
}

function setupBasicEventListeners() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Utilitários
function showLoadingIndicator() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoadingIndicator() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const container = document.body;
    const notification = document.createElement('div');
    
    const colors = {
        error: { bg: '#f8d7da', color: '#721c24', border: '#dc3545' },
        success: { bg: '#d4edda', color: '#155724', border: '#28a745' },
        info: { bg: '#d1ecf1', color: '#0c5460', border: '#17a2b8' },
        warning: { bg: '#fff3cd', color: '#856404', border: '#ffc107' }
    };
    
    const style = colors[type] || colors.info;
    
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${style.bg};
        color: ${style.color};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border-left: 4px solid ${style.border};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        z-index: 10000;
        white-space: pre-line;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
        cursor: pointer;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div>${message}</div>
            <button onclick="this.closest('.notification').remove()" style="
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: inherit;
                padding: 0;
                line-height: 1;
            ">&times;</button>
        </div>
    `;
    
    // Auto-remover
    notification.onclick = () => notification.remove();
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, type === 'error' ? 8000 : 5000);
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showSuccessMessage(message) {
    showNotification(message, 'success');
}

// Função utilitária debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// CSS adicional para melhorias
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    /* Animações otimizadas */
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Marcadores do mapa */
    .user-location-marker {
        background: radial-gradient(circle, #007bff, #0056b3);
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0, 123, 255, 0.6);
        animation: pulse-location 2s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isMobile ? '18px' : '16px'};
    }
    
    @keyframes pulse-location {
        0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
        70% { box-shadow: 0 0 0 ${isMobile ? '20px' : '15px'} rgba(0, 123, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }
    
    .client-marker {
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        font-size: ${isMobile ? '16px' : '14px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .client-marker:hover {
        transform: scale(${isMobile ? '1.1' : '1.2'});
        z-index: 1000;
    }
    
    .client-active { border-color: #28a745; }
    .client-inactive { border-color: #dc3545; }
    .client-new { border-color: #ffc107; }
    .client-verified { border-color: #17a2b8; background: linear-gradient(45deg, #fff, #e7f3ff); }
    .client-approximate { border-style: dashed; opacity: 0.8; }
    
    /* Popup otimizado */
    .client-popup-optimized {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: ${isMobile ? '280px' : '300px'};
        font-size: ${isMobile ? '14px' : '13px'};
    }
    
    .client-popup-optimized h4 {
        margin: 0 0 0.5rem 0;
        color: #007bff;
        font-size: ${isMobile ? '16px' : '14px'};
        font-weight: 600;
    }
    
    .popup-info p {
        margin: 0.25rem 0;
        line-height: 1.4;
    }
    
    .popup-actions {
        display: flex;
        gap: 0.5rem;
        margin: 0.75rem 0;
        flex-wrap: wrap;
    }
    
    .popup-button {
        display: inline-block;
        padding: ${isMobile ? '8px 12px' : '6px 10px'};
        border-radius: 20px;
        text-decoration: none;
        font-size: ${isMobile ? '13px' : '11px'};
        font-weight: 500;
        color: white;
        transition: all 0.2s ease;
        flex: 1;
        text-align: center;
        min-width: ${isMobile ? '80px' : '70px'};
    }
    
    .whatsapp-button { background: #25d366; }
    .whatsapp-button:hover { background: #1da851; }
    .route-button { background: #007bff; }
    .route-button:hover { background: #0056b3; }
    
    .popup-footer {
        margin-top: 0.5rem;
        font-size: ${isMobile ? '11px' : '10px'};
        color: #666;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 0.5rem;
    }
    
    /* Status indicators */
    .status-indicator {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        margin: 0.25rem 0.25rem 0 0;
    }
    
    .status-indicator.geocoded { background: #d4edda; color: #155724; }
    .status-indicator.pending { background: #fff3cd; color: #856404; }
    .status-indicator.scheduled { background: #cce5ff; color: #004085; }
    
    /* Drag and drop */
    .drag-over {
        border-color: #007bff !important;
        background: rgba(0, 123, 255, 0.1) !important;
        transform: scale(1.02);
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
        .client-item {
            padding: 1rem;
            margin-bottom: 0.5rem;
        }
        
        .client-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }
        
        .notification {
            right: 10px !important;
            left: 10px !important;
            max-width: none !important;
        }
        
        .popup-actions {
            flex-direction: column;
        }
        
        .popup-button {
            flex: none;
            width: 100%;
        }
    }
    
    /* Performance optimizations for low-end devices */
    ${isLowEndDevice ? `
        .client-marker {
            transition: none;
        }
        .client-marker:hover {
            transform: none;
        }
        * {
            animation-duration: 0.2s !important;
        }
    ` : ''}
`;

document.head.appendChild(additionalStyles);

console.log('✅ script.js MELHORADO E OTIMIZADO carregado com sucesso');
