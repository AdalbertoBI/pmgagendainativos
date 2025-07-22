// script.js - Sistema PMG Agenda COMPLETO E FUNCIONAL
let currentTab = 'inativos';
let isSystemReady = false;
let isProcessingGeocode = false;
let mapInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando PMG Agenda...');
        showLoadingIndicator();
        
        await initializeSystem();
        
        isSystemReady = true;
        console.log('✅ Sistema pronto!');
        
        // INICIALIZAR MAPA AUTOMATICAMENTE
        setTimeout(async () => {
            await initializeMapAutomatically();
            hideLoadingIndicator();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        hideLoadingIndicator();
        showErrorMessage('Erro ao inicializar: ' + error.message);
        await initializeBasicSystem();
    }
});

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando sistema (preservando dados existentes)...');
        
        // Aguardar dependências essenciais
        await waitForLibrary('XLSX', 15000);
        await waitForLibrary('L', 15000);
        
        // Inicializar managers de forma sequencial
        console.log('📊 Inicializando DBManager...');
        await window.dbManager.init();
        
        console.log('👥 Inicializando ClientManager...');
        await window.clientManager.init();
        
        // Configurar interface
        setupEventListeners();
        setupTabNavigation();
        
        // Renderizar dados existentes (se houver)
        renderAllTabs();
        updateTabCounts();
        
        // Verificar se há dados existentes
        const totalClients = window.clientManager.getTotalCount();
        if (totalClients > 0) {
            console.log(`✅ Sistema restaurado com ${totalClients} clientes existentes`);
            updateDataInfo(`Dados restaurados (${totalClients} clientes)`);
            
            // Se há dados mas sem geocodificação, oferecer reprocessar
            const geocodedCount = [
                ...(window.clientManager.data || []),
                ...(window.clientManager.ativos || []),
                ...(window.clientManager.novos || [])
            ].filter(c => c.geocoding?.success).length;
            
            if (geocodedCount < totalClients) {
                setTimeout(() => {
                    const shouldReprocess = confirm(
                        `Encontrados ${totalClients} clientes, mas apenas ${geocodedCount} estão localizados no mapa.\n\n` +
                        `Deseja reprocessar as localizações agora?`
                    );
                    
                    if (shouldReprocess) {
                        startGeocodingProcess();
                    }
                }, 2000);
            }
        } else {
            console.log('ℹ️ Sistema iniciado sem dados existentes');
        }
        
        console.log('🎉 Sistema base inicializado!');
        
    } catch (error) {
        console.error('❌ Falha na inicialização:', error);
        throw error;
    }
}

async function waitForLibrary(name, timeout = 15000) {
    const start = Date.now();
    while (!window[name] && (Date.now() - start) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!window[name]) {
        throw new Error(`${name} não carregou em ${timeout}ms`);
    }
    console.log(`✅ ${name} carregado`);
}

async function initializeBasicSystem() {
    try {
        console.log('🚑 Sistema básico de emergência...');
        setupBasicEventListeners();
        isSystemReady = true;
        console.log('✅ Sistema básico pronto');
    } catch (error) {
        console.error('❌ Sistema básico falhou:', error);
    }
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Upload de arquivo
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✅ File input configurado');
    }
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput?.click());
        setupDragDrop(uploadArea);
        console.log('✅ Upload area configurada');
    }
    
    // Modal
    setupModal();
    
    // Filtros
    const sortOption = document.getElementById('sortOption');
    if (sortOption) {
        sortOption.addEventListener('change', () => {
            if (window.clientManager?.applyFiltersAndSort) {
                window.clientManager.applyFiltersAndSort();
            }
        });
        console.log('✅ Filtros configurados');
    }
    
    // Controles do mapa
    setupMapControls();
}

function setupMapControls() {
    const refreshMapBtn = document.getElementById('refresh-map');
    const clearCacheBtn = document.getElementById('clear-cache');
    
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', async () => {
            try {
                refreshMapBtn.disabled = true;
                refreshMapBtn.innerHTML = '<span>🔄</span> Atualizando...';
                
                await refreshMapWithClients();
                showSuccessMessage('Mapa atualizado com sucesso!');
                
            } catch (error) {
                console.error('❌ Erro ao atualizar mapa:', error);
                showErrorMessage('Erro ao atualizar mapa: ' + error.message);
            } finally {
                refreshMapBtn.disabled = false;
                refreshMapBtn.innerHTML = '<span>🔄</span> Atualizar Mapa';
            }
        });
    }
    
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            try {
                // Limpar caches
                if (window.geocodingService) {
                    window.geocodingService.clearCache();
                }
                
                if (window.cepProcessor) {
                    window.cepProcessor.clearCache();
                }
                
                showSuccessMessage('Cache limpo com sucesso!');
                
            } catch (error) {
                console.error('❌ Erro ao limpar cache:', error);
                showErrorMessage('Erro ao limpar cache: ' + error.message);
            }
        });
    }
}

function setupBasicEventListeners() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function setupDragDrop(element) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', async (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    });
}

function setupModal() {
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remover active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Ativar selecionado
            button.classList.add('active');
            const targetContent = document.getElementById(`${tabName}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
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
        });
    });
}

async function handleMapTabActivation() {
    try {
        console.log('🗺️ Ativando aba do mapa...');
        
        if (!mapInitialized) {
            await initializeMapAutomatically();
        }
        
        // Forçar redimensionamento do mapa
        if (window.mapInstance) {
            setTimeout(() => {
                window.mapInstance.invalidateSize(true);
                console.log('🔄 Mapa redimensionado na ativação da aba');
            }, 200);
        }
        
        updateMapStatus('Ativo');
        
    } catch (error) {
        console.error('❌ Erro ao ativar aba do mapa:', error);
        updateMapStatus('Erro');
        showMapFallback();
    }
}

async function initializeMapAutomatically() {
    try {
        if (mapInitialized) return;
        
        console.log('🗺️ Inicializando mapa automaticamente...');
        
        // Verificar se Leaflet está disponível
        if (typeof L === 'undefined') {
            console.warn('⚠️ Leaflet não disponível, aguardando...');
            await waitForLibrary('L', 10000);
        }
        
        // Criar o mapa imediatamente
        await createMapInstance();
        
        // Marcar como inicializado
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
        
        // Limpar container
        mapContainer.innerHTML = '';
        
        // Configurar dimensões
        mapContainer.style.height = '500px';
        mapContainer.style.width = '100%';
        
        console.log('🗺️ Criando instância do mapa...');
        
        // Obter localização do usuário
        const userLocation = await getUserLocationSafely();
        
        // Definir centro e zoom
        let center = [-23.2237, -45.9009]; // São José dos Campos
        let zoom = 12;
        
        if (userLocation) {
            center = [userLocation.lat, userLocation.lon];
            zoom = userLocation.accuracy < 1000 ? 14 : 12;
            console.log('📍 Usando localização do usuário:', center);
        }
        
        // Criar mapa
        const map = L.map('map', {
            center: center,
            zoom: zoom,
            zoomControl: true,
            attributionControl: true,
            maxZoom: 18,
            minZoom: 8
        });
        
        // Adicionar tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Adicionar marcador do usuário
        if (userLocation) {
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '📍',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });
            
            L.marker([userLocation.lat, userLocation.lon], {
                icon: userIcon,
                zIndexOffset: 1000
            }).addTo(map).bindPopup(`
                <div>
                    <h4>📍 Sua Localização</h4>
                    <p><strong>Precisão:</strong> ±${Math.round(userLocation.accuracy)}m</p>
                    <p><strong>Hora:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            `);
        }
        
        // Armazenar referência global
        window.mapInstance = map;
        
        // Forçar resize do mapa
        setTimeout(() => {
            map.invalidateSize();
            console.log('🔄 Mapa redimensionado');
        }, 300);
        
        console.log('✅ Mapa criado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao criar mapa:', error);
        throw error;
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
        
        const timeoutId = setTimeout(() => {
            console.warn('⚠️ Timeout na geolocalização');
            resolve(null);
        }, 8000);
        
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
                enableHighAccuracy: false,
                timeout: 7000,
                maximumAge: 300000
            }
        );
    });
}

function showMapFallback() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: #6c757d;">🗺️</div>
                <h3 style="color: #6c757d; margin-bottom: 1rem; text-align: center;">Mapa Temporariamente Indisponível</h3>
                <p style="color: #6c757d; text-align: center; max-width: 400px; margin-bottom: 1rem;">
                    O mapa será carregado assim que os clientes forem geocodificados.
                </p>
                <button onclick="initializeMapAutomatically()" class="btn btn-primary">
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
        showErrorMessage('Tipo inválido. Use arquivos Excel (.xlsx ou .xls)');
        return;
    }
    
    try {
        console.log('📊 Processando arquivo:', file.name);
        showNotification(`Carregando ${file.name}...`, 'info');
        
        // Ler arquivo
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            throw new Error('Planilha vazia ou sem dados válidos');
        }
        
        console.log(`📈 ${jsonData.length} linhas extraídas da planilha`);
        
        // Categorizar dados
        const processedData = categorizeData(jsonData);
        
        // Processar no clientManager
        if (!window.clientManager) {
            throw new Error('ClientManager não disponível');
        }
        
        await window.clientManager.processNewData(processedData);
        
        // Atualizar interface
        renderAllTabs();
        updateTabCounts();
        updateDataInfo(file.name);
        
        showSuccessMessage(`${jsonData.length} clientes carregados com sucesso!`);
        
        // Iniciar geocodificação após pequeno delay
        setTimeout(() => {
            startGeocodingProcess();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        showErrorMessage(`Erro ao processar planilha: ${error.message}`);
    }
}

function categorizeData(rawData) {
    const clients = [];
    const ativos = [];
    const novos = [];
    
    rawData.forEach((row, index) => {
        try {
            // Gerar ID único se não existir
            if (!row.id && !row['ID Cliente']) {
                row.id = `client_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
            }
            
            const status = (row['Status'] || '').toLowerCase().trim();
            
            if (status.includes('ativo') && !status.includes('inativo')) {
                ativos.push(row);
            } else if (status.includes('novo')) {
                novos.push(row);
            } else {
                clients.push(row); // Default para inativos
            }
            
        } catch (error) {
            console.warn(`⚠️ Erro ao processar linha ${index}:`, error);
        }
    });
    
    console.log(`📊 Dados categorizados: 🔴 ${clients.length} 🟢 ${ativos.length} 🆕 ${novos.length}`);
    
    return { 
        clients, 
        ativos, 
        novos, 
        schedules: {} 
    };
}

async function startGeocodingProcess() {
    if (isProcessingGeocode) {
        console.warn('⚠️ Geocodificação já em andamento');
        return;
    }
    
    if (!window.geocodingService) {
        console.warn('⚠️ GeocodingService não disponível');
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
            console.log('ℹ️ Nenhum cliente para geocodificar');
            return;
        }
        
        console.log(`🗺️ Iniciando geocodificação SEGURA de ${allClients.length} clientes`);
        
        // Mostrar seção de progresso
        showProgressSection();
        updateMapStatus('Geocodificando com segurança...');
        
        // Mostrar aviso sobre o processo
        showNotification(
            `Iniciando localização de ${allClients.length} clientes.\n\n` +
            `⚠️ Processo otimizado para evitar timeouts:\n` +
            `• Rate limiting rigoroso\n` +
            `• Múltiplas estratégias de fallback\n` +
            `• Circuit breakers para proteção\n\n` +
            `Tempo estimado: ${Math.ceil(allClients.length * 6 / 60)} minutos`,
            'info'
        );
        
        // Processar clientes com máxima segurança
        const results = await window.geocodingService.geocodeClients(
            allClients,
            (progress) => {
                updateProgress(progress);
                
                // Atualizar status no mapa
                const processed = progress.current;
                const total = progress.total;
                updateMapStatus(`Processando: ${processed}/${total} (${progress.percentage}%)`);
            }
        );
        
        // Processar resultados
        await updateMapWithResults(results);
        
        // Esconder progresso
        hideProgressSection();
        
        // Mostrar estatísticas detalhadas
        const stats = window.geocodingService.getStats();
        const successCount = results.filter(r => r.geocoding?.success).length;
        
        updateMapStatus(`${successCount} localizações encontradas`);
        
        showSuccessMessage(
            `🎉 Geocodificação concluída!\n\n` +
            `✅ Sucessos: ${successCount}/${allClients.length}\n` +
            `📦 Cache hits: ${stats.cacheHits || 0}\n` +
            `🌐 Requests realizados: ${stats.requests || 0}\n` +
            `🛡️ Fallbacks seguros: ${stats.fallbacks || 0}\n\n` +
            `Taxa de sucesso: ${Math.round((successCount / allClients.length) * 100)}%`
        );
        
        // Salvar resultados no clientManager
        await saveGeocodingResults(results);
        
    } catch (error) {
        hideProgressSection();
        updateMapStatus('Erro na geocodificação');
        
        console.error('❌ Erro crítico na geocodificação:', error);
        showErrorMessage(
            `Erro na geocodificação: ${error.message}\n\n` +
            `O sistema aplicou localizações aproximadas para manter a funcionalidade.`
        );
        
    } finally {
        isProcessingGeocode = false;
    }
}

async function updateMapWithResults(results) {
    try {
        console.log('🗺️ Atualizando mapa com resultados da geocodificação...');
        
        if (!mapInitialized || !window.mapInstance) {
            console.log('🗺️ Inicializando mapa para exibir resultados...');
            await initializeMapAutomatically();
        }
        
        if (!window.mapInstance) {
            console.warn('⚠️ Mapa não disponível, pulando atualização');
            return;
        }
        
        // Limpar marcadores existentes (exceto usuário)
        window.mapInstance.eachLayer((layer) => {
            if (layer instanceof L.Marker && 
                !layer.options.className?.includes('user-location') &&
                layer.options.zIndexOffset !== 1000) {
                window.mapInstance.removeLayer(layer);
            }
        });
        
        // Adicionar novos marcadores
        const markersAdded = [];
        let successCount = 0;
        
        results.forEach((client, index) => {
            if (client.geocoding?.success && client.geocoding.coordinates) {
                try {
                    const marker = createClientMarker(client);
                    if (marker) {
                        marker.addTo(window.mapInstance);
                        markersAdded.push(marker);
                        successCount++;
                    }
                } catch (markerError) {
                    console.warn(`⚠️ Erro ao criar marcador para ${client['Nome Fantasia']}: ${markerError.message}`);
                }
            }
        });
        
        console.log(`✅ ${successCount} marcadores adicionados ao mapa`);
        
        // Ajustar zoom se há marcadores
        if (markersAdded.length > 0) {
            try {
                const group = new L.featureGroup(markersAdded);
                window.mapInstance.fitBounds(group.getBounds(), {
                    padding: [20, 20],
                    maxZoom: 15
                });
                console.log('🔍 Zoom ajustado para mostrar todos os marcadores');
            } catch (boundsError) {
                console.warn('⚠️ Erro ao ajustar bounds:', boundsError.message);
            }
        }
        
        // Atualizar status do mapa
        updateMapStatus(`${successCount} localizações no mapa`);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar mapa com resultados:', error);
        updateMapStatus('Erro ao atualizar mapa');
    }
}

function createClientMarker(client) {
    try {
        const coords = client.geocoding.coordinates;
        const status = client['Status'] || 'Inativo';
        const isApproximate = client.geocoding.isApproximate;
        const confidence = client.geocoding.confidence || 0;
        
        // Definir ícone baseado no status
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
        
        // Marcar se é aproximado ou tem baixa confiança
        if (isApproximate || confidence < 0.5) {
            iconSymbol = '❓';
            iconClass += ' client-approximate';
        } else if (client.geocoding.method?.includes('viacep')) {
            iconSymbol = '✅';
            iconClass += ' client-verified';
        }
        
        const icon = L.divIcon({
            className: iconClass,
            html: iconSymbol,
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });
        
        const marker = L.marker([coords.lat, coords.lon], { icon });
        
        // Criar popup informativo
        const popupContent = createClientPopupContent(client);
        marker.bindPopup(popupContent);
        
        return marker;
        
    } catch (error) {
        console.error('❌ Erro ao criar marcador para cliente:', error);
        return null;
    }
}

function createClientPopupContent(client) {
    const nome = client['Nome Fantasia'] || client['Cliente'] || 'Cliente';
    const contato = client['Contato'] || 'N/A';
    const telefone = client['Celular'] || 'N/A';
    const endereco = client['Endereço'] || 'N/A';
    const status = client['Status'] || 'N/A';
    
    const geocoding = client.geocoding || {};
    const method = geocoding.method || 'desconhecido';
    const confidence = Math.round((geocoding.confidence || 0) * 100);
    
    // Informações sobre a geocodificação
    let methodInfo = '';
    if (method.includes('viacep')) {
        methodInfo = '✅ Verificado com ViaCEP + Nominatim';
    } else if (method.includes('nominatim')) {
        methodInfo = '🌐 Localizado via Nominatim';
    } else if (method.includes('local')) {
        methodInfo = '🏠 Base de coordenadas local';
    } else if (method.includes('fallback')) {
        methodInfo = '📍 Localização aproximada';
    }
    
    // Link do WhatsApp se telefone disponível
    let whatsappLink = '';
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
        const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
        const message = encodeURIComponent(`Olá ${nome}, tudo bem? Sou da PMG.`);
        whatsappLink = `<br><a href="https://wa.me/${whatsappNumber}?text=${message}" target="_blank" style="color: #25d366; text-decoration: none;">📱 WhatsApp</a>`;
    }
    
    // Link para rota
    let routeLink = '';
    if (geocoding.coordinates) {
        const lat = geocoding.coordinates.lat;
        const lon = geocoding.coordinates.lon;
        routeLink = `<br><a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving" target="_blank" style="color: #007bff; text-decoration: none;">🗺️ Como chegar</a>`;
    }
    
    return `
        <div class="client-popup" style="max-width: 300px; font-family: Arial, sans-serif;">
            <h4 style="margin-bottom: 0.5rem; color: #007bff; font-size: 1.1rem;">${nome}</h4>
            <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Status:</strong> ${status}</p>
            <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Contato:</strong> ${contato}</p>
            <p style="margin: 0.25rem 0; font-size: 0.9rem;"><strong>Telefone:</strong> ${telefone}${whatsappLink}</p>
            <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #eee;">
            <p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;"><strong>Endereço:</strong><br>${endereco}${routeLink}</p>
            <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #eee;">
            <p style="margin: 0.25rem 0; font-size: 0.8rem; color: #888;">
                <strong>Precisão:</strong> ${methodInfo} (${confidence}%)
                ${geocoding.isApproximate ? '<br><em>Localização aproximada</em>' : ''}
            </p>
        </div>
    `;
}

async function saveGeocodingResults(results) {
    try {
        console.log('💾 Salvando resultados da geocodificação...');
        
        if (!window.clientManager) {
            console.warn('⚠️ ClientManager não disponível');
            return;
        }
        
        // Função auxiliar para atualizar cliente com geocodificação
        const updateClientWithGeocoding = (clientArray, results) => {
            return clientArray.map(client => {
                const clientId = window.clientManager.getClientId ? 
                    window.clientManager.getClientId(client) : 
                    client.id || client['ID Cliente'] || client['Nome Fantasia'];
                
                const result = results.find(r => {
                    const resultId = window.clientManager.getClientId ? 
                        window.clientManager.getClientId(r) : 
                        r.id || r['ID Cliente'] || r['Nome Fantasia'];
                    return resultId === clientId;
                });
                
                if (result && result.geocoding) {
                    return { ...client, geocoding: result.geocoding };
                }
                return client;
            });
        };
        
        // Atualizar todos os arrays de clientes
        if (window.clientManager.data) {
            window.clientManager.data = updateClientWithGeocoding(window.clientManager.data, results);
        }
        if (window.clientManager.ativos) {
            window.clientManager.ativos = updateClientWithGeocoding(window.clientManager.ativos, results);
        }
        if (window.clientManager.novos) {
            window.clientManager.novos = updateClientWithGeocoding(window.clientManager.novos, results);
        }
        
        // Salvar no storage
        if (typeof window.clientManager.saveAllData === 'function') {
            await window.clientManager.saveAllData();
        }
        
        // Atualizar variáveis globais
        if (typeof window.clientManager.updateGlobals === 'function') {
            window.clientManager.updateGlobals();
        }
        
        console.log('✅ Resultados da geocodificação salvos com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao salvar resultados da geocodificação:', error);
    }
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
            } else {
                console.log('ℹ️ Nenhum cliente geocodificado para mostrar no mapa');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao refresh do mapa:', error);
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
        const timeElapsed = Math.floor((Date.now() - (window.geocodingStartTime || Date.now())) / 1000);
        const avgTimePerClient = timeElapsed / progress.current;
        const remainingTime = Math.ceil((progress.total - progress.current) * avgTimePerClient);
        
        progressText.innerHTML = `
            ${progress.current} de ${progress.total} (${progress.percentage}%)
            <br><small>Tempo restante: ~${Math.floor(remainingTime / 60)}min ${remainingTime % 60}s</small>
        `;
    }
    
    if (currentClient && progress.client) {
        const status = progress.current === 1 ? '🚀 Iniciando' : '🔄 Processando';
        currentClient.innerHTML = `
            ${status}: <strong>${progress.client['Nome Fantasia']}</strong>
            <br><small>Cliente ${progress.current} de ${progress.total}</small>
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
        list.innerHTML = '<div class="empty-state">Nenhum agendamento encontrado</div>';
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
        
        const geocodingInfo = client.geocoding?.success ? 
            `<div class="geocoding-status">📍 Localizado (${Math.round((client.geocoding.confidence || 0) * 100)}%)</div>` : 
            '<div class="geocoding-status pending">📍 Aguardando localização</div>';
        
        div.innerHTML = `
            <div class="client-header">
                <h4>${client['Nome Fantasia'] || 'Cliente'}</h4>
                <span class="status-badge status-${client['Status']?.toLowerCase().includes('ativo') ? 'active' : client['Status']?.toLowerCase().includes('novo') ? 'new' : 'inactive'}">
                    ${client['Status'] || 'Inativo'}
                </span>
            </div>
            <div class="client-info">
                <p><strong>Contato:</strong> ${client['Contato'] || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${client['Celular'] || 'N/A'}</p>
                <p><strong>Segmento:</strong> ${client['Segmento'] || 'N/A'}</p>
            </div>
            <div class="client-status">
                ${geocodingInfo}
            </div>
        `;
        
        div.onclick = () => window.clientManager?.showClientModal(client);
        container.appendChild(div);
    });
}

function updateTabCounts() {
    const counts = {
        'inativos-count': window.clientManager?.data?.length || 0,
        'ativos-count': window.clientManager?.ativos?.length || 0,
        'novos-count': window.clientManager?.novos?.length || 0,
        'agenda-count': 0
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

// Utilitários de interface
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
    const div = document.createElement('div');
    
    const colors = {
        error: { bg: '#f8d7da', color: '#721c24', border: '#dc3545' },
        success: { bg: '#d4edda', color: '#155724', border: '#28a745' },
        info: { bg: '#d1ecf1', color: '#0c5460', border: '#17a2b8' }
    };
    
    const style = colors[type] || colors.info;
    
    div.style.cssText = `
        position: fixed;
        top: 80px;
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
    `;
    
    div.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: 1rem; color: inherit;">&times;</button>
    `;
    
    container.appendChild(div);
    
    // Auto-remover após 6 segundos
    setTimeout(() => {
        if (div.parentElement) {
            div.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => div.remove(), 300);
        }
    }, 6000);
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showSuccessMessage(message) {
    showNotification(message, 'success');
}

// CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .user-location-marker {
        background: radial-gradient(circle, #007bff, #0056b3);
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0, 123, 255, 0.6);
        animation: pulse-location 2s infinite;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
    }
    
    @keyframes pulse-location {
        0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(0, 123, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }
    
    .client-marker {
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .client-marker:hover {
        transform: scale(1.2);
        z-index: 1000;
    }
    
    .client-active {
        border-color: #28a745;
    }
    
    .client-inactive {
        border-color: #dc3545;
    }
    
    .client-new {
        border-color: #ffc107;
    }
    
    .client-verified {
        border-color: #17a2b8;
        background: linear-gradient(45deg, #fff, #e7f3ff);
    }
    
    .client-approximate {
        border-style: dashed;
        opacity: 0.8;
    }
    
    .drag-over {
        border-color: #007bff !important;
        background: rgba(0, 123, 255, 0.1) !important;
    }
    
    .geocoding-status {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        background: #d4edda;
        color: #155724;
        margin-top: 0.5rem;
    }
    
    .geocoding-status.pending {
        background: #fff3cd;
        color: #856404;
    }
    
    .client-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        gap: 1rem;
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .status-active {
        background: #d4edda;
        color: #155724;
    }
    
    .status-inactive {
        background: #f8d7da;
        color: #721c24;
    }
    
    .status-new {
        background: #fff3cd;
        color: #856404;
    }
`;
document.head.appendChild(style);

console.log('✅ script.js COMPLETO E FUNCIONAL carregado');
