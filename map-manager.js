// map-manager.js - Gerenciador de mapa com tratamento robusto de erros
class MapManager {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.currentInfoWindow = null;
        this.markerClusterer = null;
        this.currentBounds = null;
        this.mapInitialized = false;
        this.geocoder = null;
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
        
        // Cache de geocodificação
        this.geocodeCache = new Map();
        
        // Sistema de filtragem de marcadores
        this.filters = {
            status: 'all',
            segmento: 'all',
            cidade: 'all'
        };
        
        // Configurações de marcadores por tipo
        this.markerConfigs = {
            ativos: { 
                color: '#28a745', 
                icon: '✅', 
                zIndex: 3,
                title: 'Cliente Ativo'
            },
            novos: { 
                color: '#007bff', 
                icon: '🆕', 
                zIndex: 2,
                title: 'Cliente Novo'
            },
            inativos: { 
                color: '#6c757d', 
                icon: '💤', 
                zIndex: 1,
                title: 'Cliente Inativo'
            }
        };
        
        console.log('🗺️ MapManager inicializado');
    }

    // Inicializar mapa com tratamento robusto de erros
    async initializeMap() {
        this.initializationAttempts++;
        
        try {
            console.log(`🔄 Tentativa ${this.initializationAttempts} de inicializar Google Maps...`);

            // Verificar se a API do Google Maps está disponível
            if (typeof google === 'undefined' || !google.maps) {
                throw new Error('Google Maps API não carregada');
            }

            // Verificar elemento do mapa
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                throw new Error('Elemento #map não encontrado');
            }

            // Limpar conteúdo anterior
            mapElement.innerHTML = '';

            // Configuração do mapa
            const mapOptions = {
                zoom: 12,
                center: { lat: -23.1791, lng: -45.8872 }, // São José dos Campos
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
                zoomControl: true,
                gestureHandling: 'cooperative',
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            };

            console.log('🗺️ Criando instância do mapa...');
            this.map = new google.maps.Map(mapElement, mapOptions);

            // Aguardar o mapa carregar completamente
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout ao carregar mapa'));
                }, 10000);

                google.maps.event.addListenerOnce(this.map, 'tilesloaded', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                // Fallback para idle
                google.maps.event.addListenerOnce(this.map, 'idle', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            // Inicializar geocoder
            this.geocoder = new google.maps.Geocoder();
            this.mapInitialized = true;

            // Event listeners do mapa
            this.setupMapEventListeners();

            // Controles personalizados
            this.addCustomControls();

            console.log('✅ Google Maps inicializado com sucesso');
            return true;

        } catch (error) {
            console.error(`❌ Erro na tentativa ${this.initializationAttempts}:`, error);
            
            if (this.initializationAttempts < this.maxInitializationAttempts) {
                console.log(`🔄 Tentando novamente em 2 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.initializeMap();
            } else {
                console.error('❌ Máximo de tentativas excedido, usando fallback');
                this.showMapFallback(error.message);
                return false;
            }
        }
    }

    // Mostrar fallback quando o mapa falha
    showMapFallback(errorMessage) {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        mapElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #f8f9fa, #e9ecef); color: #6c757d; text-align: center; padding: 40px; border-radius: 8px;">
                <div style="font-size: 64px; margin-bottom: 24px; opacity: 0.7;">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h3 style="margin: 0 0 16px 0; color: #495057;">Mapa Temporariamente Indisponível</h3>
                <p style="margin: 0 0 8px 0; max-width: 400px; line-height: 1.5;">
                    O serviço de mapas não pôde ser carregado no momento.
                </p>
                <p style="margin: 0 0 24px 0; font-size: 12px; opacity: 0.7;">
                    Erro: ${errorMessage}
                </p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                    <button onclick="window.mapManager.initializeMap()" 
                            style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                        <i class="fas fa-refresh"></i> Tentar Novamente
                    </button>
                    <button onclick="window.mapManager.showOfflineMode()" 
                            style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                        <i class="fas fa-list"></i> Ver Lista
                    </button>
                </div>
                <div style="margin-top: 24px; padding: 16px; background: rgba(255, 193, 7, 0.1); border-radius: 4px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 13px; color: #856404;">
                        <strong>Dica:</strong> As outras funcionalidades do sistema continuam funcionando normalmente.
                    </p>
                </div>
            </div>
        `;

        // Marcar como não inicializado
        this.mapInitialized = false;
    }

    // Modo offline - mostrar lista de clientes
    showOfflineMode() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        let clientsHTML = '<div style="padding: 20px;"><h4>Clientes (Modo Offline)</h4>';
        
        // Coletar todos os clientes
        const allClients = [];
        if (window.clientManager) {
            allClients.push(...window.clientManager.data.map(c => ({...c, source: 'inativos'})));
            allClients.push(...window.clientManager.ativos.map(c => ({...c, source: 'ativos'})));
            allClients.push(...window.clientManager.novos.map(c => ({...c, source: 'novos'})));
        }

        if (allClients.length === 0) {
            clientsHTML += '<p>Nenhum cliente encontrado.</p>';
        } else {
            clientsHTML += `<p>${allClients.length} clientes encontrados:</p><div style="max-height: 400px; overflow-y: auto;">`;
            
            allClients.slice(0, 50).forEach(client => {
                const config = this.markerConfigs[client.source];
                clientsHTML += `
                    <div style="padding: 12px; margin: 8px 0; border: 1px solid #dee2e6; border-radius: 4px; background: white;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 16px;">${config.icon}</span>
                            <strong>${client['Nome Fantasia'] || 'N/A'}</strong>
                        </div>
                        <div style="font-size: 13px; color: #6c757d;">
                            ${client['Contato'] ? `👤 ${client['Contato']}<br>` : ''}
                            ${client['Celular'] ? `📱 ${client['Celular']}<br>` : ''}
                            ${client['Endereço'] ? `📍 ${client['Endereço']}` : ''}
                        </div>
                    </div>
                `;
            });
            
            if (allClients.length > 50) {
                clientsHTML += `<p style="text-align: center; color: #6c757d; font-style: italic;">... e mais ${allClients.length - 50} clientes</p>`;
            }
            
            clientsHTML += '</div>';
        }

        clientsHTML += `
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="window.mapManager.initializeMap()" 
                        style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    🗺️ Voltar ao Mapa
                </button>
            </div>
        </div>`;

        mapElement.innerHTML = clientsHTML;
    }

    // Configurar event listeners do mapa
    setupMapEventListeners() {
        if (!this.map) return;

        try {
            // Fechar info windows ao clicar no mapa
            this.map.addListener('click', () => {
                if (this.currentInfoWindow) {
                    this.currentInfoWindow.close();
                    this.currentInfoWindow = null;
                }
            });

            // Atualizar bounds quando o mapa é movido
            this.map.addListener('bounds_changed', () => {
                this.currentBounds = this.map.getBounds();
            });

            // Log de eventos para debug
            this.map.addListener('zoom_changed', () => {
                console.log('🔍 Zoom alterado para:', this.map.getZoom());
            });

            console.log('✅ Event listeners do mapa configurados');
        } catch (error) {
            console.error('❌ Erro ao configurar event listeners:', error);
        }
    }

    // Adicionar controles personalizados
    addCustomControls() {
        if (!this.map) return;

        try {
            // Controle de filtros
            const filterControl = this.createFilterControl();
            if (filterControl) {
                this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(filterControl);
            }

            // Controle de legendas
            const legendControl = this.createLegendControl();
            if (legendControl) {
                this.map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(legendControl);
            }

            console.log('✅ Controles personalizados adicionados');
        } catch (error) {
            console.error('❌ Erro ao adicionar controles:', error);
        }
    }

    // Criar controle de filtros
    createFilterControl() {
        try {
            const controlDiv = document.createElement('div');
            controlDiv.className = 'map-filter-control';
            controlDiv.innerHTML = `
                <div style="background: white; margin: 10px; padding: 10px; border-radius: 3px; box-shadow: 0 2px 6px rgba(0,0,0,.3); font-family: Arial, sans-serif;">
                    <div style="margin-bottom: 5px;">
                        <label style="font-size: 12px; margin-right: 5px;">Status:</label>
                        <select id="map-filter-status" style="font-size: 12px; border: 1px solid #ccc; border-radius: 3px;">
                            <option value="all">Todos</option>
                            <option value="ativos">Ativos</option>
                            <option value="novos">Novos</option>
                            <option value="inativos">Inativos</option>
                        </select>
                    </div>
                    <div style="text-align: center;">
                        <button id="map-refresh" style="font-size: 11px; padding: 4px 8px; margin: 2px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;">🔄 Atualizar</button>
                        <button id="map-fit-bounds" style="font-size: 11px; padding: 4px 8px; margin: 2px; border: 1px solid #ccc; background: white; cursor: pointer; border-radius: 3px;">🎯 Ajustar</button>
                    </div>
                </div>
            `;

            // Event listeners com tratamento de erro
            const statusSelect = controlDiv.querySelector('#map-filter-status');
            if (statusSelect) {
                statusSelect.addEventListener('change', (e) => {
                    try {
                        this.filters.status = e.target.value;
                        this.applyFilters();
                    } catch (error) {
                        console.error('Erro ao aplicar filtro:', error);
                    }
                });
            }

            const refreshBtn = controlDiv.querySelector('#map-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    try {
                        this.loadAllMarkers();
                    } catch (error) {
                        console.error('Erro ao atualizar marcadores:', error);
                    }
                });
            }

            const fitBtn = controlDiv.querySelector('#map-fit-bounds');
            if (fitBtn) {
                fitBtn.addEventListener('click', () => {
                    try {
                        this.fitBoundsToVisibleMarkers();
                    } catch (error) {
                        console.error('Erro ao ajustar bounds:', error);
                    }
                });
            }

            return controlDiv;
        } catch (error) {
            console.error('Erro ao criar controle de filtros:', error);
            return null;
        }
    }

    // Criar controle de legenda
    createLegendControl() {
        try {
            const legendDiv = document.createElement('div');
            legendDiv.className = 'map-legend-control';
            legendDiv.innerHTML = `
                <div style="background: white; margin: 10px; padding: 10px; border-radius: 3px; box-shadow: 0 2px 6px rgba(0,0,0,.3); font-family: Arial, sans-serif;">
                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 5px;">Legenda:</div>
                    <div style="font-size: 11px;">
                        <div style="margin: 2px 0;">✅ Ativos (<span id="legend-ativos">0</span>)</div>
                        <div style="margin: 2px 0;">🆕 Novos (<span id="legend-novos">0</span>)</div>
                        <div style="margin: 2px 0;">💤 Inativos (<span id="legend-inativos">0</span>)</div>
                    </div>
                </div>
            `;
            return legendDiv;
        } catch (error) {
            console.error('Erro ao criar legenda:', error);
            return null;
        }
    }

    // Aplicar filtros aos marcadores
    applyFilters() {
        if (!this.mapInitialized) return;

        try {
            let visibleCount = { ativos: 0, novos: 0, inativos: 0 };

            for (const [id, markerData] of this.markers.entries()) {
                const marker = markerData.marker;
                const source = markerData.source;

                let visible = true;

                // Filtro por status
                if (this.filters.status !== 'all' && this.filters.status !== source) {
                    visible = false;
                }

                // Aplicar visibilidade
                marker.setVisible(visible);

                if (visible) {
                    visibleCount[source]++;
                }
            }

            // Atualizar legenda
            this.updateLegendCounts(visibleCount);

            console.log(`🔍 Filtros aplicados: ${Object.values(visibleCount).reduce((a, b) => a + b, 0)} marcadores visíveis`);
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
        }
    }

    // Atualizar contadores da legenda
    updateLegendCounts(counts) {
        try {
            const ativosSpan = document.getElementById('legend-ativos');
            const novosSpan = document.getElementById('legend-novos');
            const inativosSpan = document.getElementById('legend-inativos');

            if (ativosSpan) ativosSpan.textContent = counts.ativos;
            if (novosSpan) novosSpan.textContent = counts.novos;
            if (inativosSpan) inativosSpan.textContent = counts.inativos;
        } catch (error) {
            console.error('Erro ao atualizar legenda:', error);
        }
    }

    // Carregar todos os marcadores com tratamento robusto
    async loadAllMarkers() {
        if (!this.mapInitialized) {
            console.warn('Mapa não inicializado, não é possível carregar marcadores');
            return 0;
        }

        try {
            console.log('🔄 Carregando marcadores...');
            
            // Limpar marcadores existentes
            this.clearAllMarkers();

            let totalMarkers = 0;
            const loadPromises = [];

            // Carregar de forma paralela e com tratamento de erro
            if (window.clientManager) {
                if (window.clientManager.ativos && window.clientManager.ativos.length > 0) {
                    loadPromises.push(this.loadMarkersFromSource(window.clientManager.ativos, 'ativos'));
                }
                if (window.clientManager.novos && window.clientManager.novos.length > 0) {
                    loadPromises.push(this.loadMarkersFromSource(window.clientManager.novos, 'novos'));
                }
                if (window.clientManager.data && window.clientManager.data.length > 0) {
                    loadPromises.push(this.loadMarkersFromSource(window.clientManager.data, 'inativos'));
                }
            }

            const results = await Promise.allSettled(loadPromises);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    totalMarkers += result.value;
                } else {
                    console.warn(`Erro ao carregar marcadores do grupo ${index}:`, result.reason);
                }
            });

            // Aplicar filtros iniciais
            this.applyFilters();

            // Ajustar bounds se houver marcadores
            if (totalMarkers > 0) {
                setTimeout(() => {
                    try {
                        this.fitBoundsToVisibleMarkers();
                    } catch (error) {
                        console.warn('Erro ao ajustar bounds:', error);
                    }
                }, 1000);
            }

            console.log(`✅ ${totalMarkers} marcadores carregados`);
            return totalMarkers;
            
        } catch (error) {
            console.error('❌ Erro ao carregar marcadores:', error);
            return 0;
        }
    }

    // Carregar marcadores de uma fonte específica
    async loadMarkersFromSource(clients, source) {
        if (!Array.isArray(clients)) {
            console.warn(`Dados inválidos para ${source}`);
            return 0;
        }

        let loadedCount = 0;
        const batchSize = 20; // Reduzido para evitar sobrecarga
        
        try {
            for (let i = 0; i < clients.length; i += batchSize) {
                const batch = clients.slice(i, i + batchSize);
                
                const batchResults = await Promise.allSettled(
                    batch.map(client => this.addClientMarker(client, source))
                );
                
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        loadedCount++;
                    }
                });
                
                // Pequena pausa para não travar a UI
                if (i + batchSize < clients.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
            console.log(`📍 ${loadedCount}/${clients.length} marcadores carregados para ${source}`);
            return loadedCount;
        } catch (error) {
            console.error(`Erro ao carregar marcadores de ${source}:`, error);
            return loadedCount;
        }
    }

    // Adicionar marcador para cliente com tratamento robusto
    async addClientMarker(client, source = 'inativos') {
        try {
            if (!client || !client['Endereço']) {
                return false;
            }

            const markerId = `${source}-${client.id || Date.now()}`;
            
            // Verificar se já existe
            if (this.markers.has(markerId)) {
                return false;
            }

            // Obter coordenadas com timeout
            const coordinates = await Promise.race([
                this.getClientCoordinates(client),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout geocoding')), 5000)
                )
            ]);

            if (!coordinates) {
                console.warn(`Não foi possível geocodificar: ${client['Nome Fantasia']}`);
                return false;
            }

            // Criar marcador
            const config = this.markerConfigs[source];
            const marker = new google.maps.Marker({
                position: coordinates,
                map: this.map,
                title: `${config.title}: ${client['Nome Fantasia']}`,
                zIndex: config.zIndex,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: config.color,
                    fillOpacity: 0.8,
                    strokeColor: 'white',
                    strokeWeight: 2
                }
            });

            // Info window
            const infoWindow = this.createAdvancedInfoWindow(client, source, markerId);
            
            marker.addListener('click', () => {
                try {
                    if (this.currentInfoWindow) {
                        this.currentInfoWindow.close();
                    }
                    infoWindow.open(this.map, marker);
                    this.currentInfoWindow = infoWindow;
                    
                    // Selecionar cliente no sistema
                    if (window.clientManager && window.clientManager.selectClient) {
                        window.clientManager.selectClient(client, source);
                    }
                } catch (error) {
                    console.error('Erro ao abrir info window:', error);
                }
            });

            // Armazenar referências
            this.markers.set(markerId, {
                marker: marker,
                infoWindow: infoWindow,
                client: client,
                source: source,
                coordinates: coordinates
            });

            return true;
        } catch (error) {
            console.error(`Erro ao adicionar marcador para ${client['Nome Fantasia']}:`, error);
            return false;
        }
    }

    // Criar info window avançada
    createAdvancedInfoWindow(client, source, markerId) {
        try {
            const config = this.markerConfigs[source];
            const completeness = window.clientManager ? 
                (window.clientManager.calculateDataCompleteness ? 
                    window.clientManager.calculateDataCompleteness(client) : 85) : 85;
            
            const content = `
                <div class="marker-info-window" style="min-width: 250px; max-width: 300px; font-family: Arial, sans-serif;">
                    <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                    <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <h4 style="margin: 0; color: ${config.color};">${config.icon} ${client['Nome Fantasia'] || 'N/A'}</h4>
                            <span style="font-size: 12px; color: #666;">${completeness}%</span>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                            ${client['Status'] || 'N/A'} • ${client['Segmento'] || 'N/A'}
                        </div>
                    </div>
                    
                    <div style="font-size: 13px; line-height: 1.4;">
                        ${client['Contato'] ? `<div><strong>👤</strong> ${client['Contato']}</div>` : ''}
                        ${client['Celular'] ? `<div><strong>📱</strong> ${client['Celular']}</div>` : ''}
                        ${client['CNPJ / CPF'] ? `<div><strong>🏢</strong> ${client['CNPJ / CPF']}</div>` : ''}
                        <div><strong>📍</strong> ${client['Endereço'] || 'N/A'}</div>
                    </div>
                    
                    <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; text-align: center;">
                        <button onclick="window.mapManager.viewClientDetails('${markerId}')" 
                                style="background: #007bff; color: white; border: none; padding: 4px 12px; border-radius: 3px; font-size: 12px; margin: 2px; cursor: pointer;">
                            👁️ Ver
                        </button>
                        <button onclick="window.mapManager.editClientFromMap('${markerId}')" 
                                style="background: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 3px; font-size: 12px; margin: 2px; cursor: pointer;">
                            ✏️ Editar
                        </button>
                        <button onclick="window.mapManager.scheduleClientFromMap('${markerId}')" 
                                style="background: #ffc107; color: black; border: none; padding: 4px 12px; border-radius: 3px; font-size: 12px; margin: 2px; cursor: pointer;">
                            📅 Agendar
                        </button>
                    </div>
                </div>
            `;
            
            return new google.maps.InfoWindow({
                content: content,
                maxWidth: 300
            });
        } catch (error) {
            console.error('Erro ao criar info window:', error);
            return new google.maps.InfoWindow({
                content: `<div>Erro ao carregar informações</div>`
            });
        }
    }

    // Ver detalhes do cliente a partir do mapa
    viewClientDetails(markerId) {
        try {
            const markerData = this.markers.get(markerId);
            if (!markerData) return;
            
            if (window.clientManager && window.clientManager.viewClientDetails) {
                window.clientManager.viewClientDetails(markerData.client.id, markerData.source);
            }
        } catch (error) {
            console.error('Erro ao ver detalhes:', error);
        }
    }

    // Editar cliente a partir do mapa
    editClientFromMap(markerId) {
        try {
            const markerData = this.markers.get(markerId);
            if (!markerData) return;
            
            if (window.clientManager && window.clientManager.editClient) {
                window.clientManager.editClient(markerData.client.id, markerData.source);
            }
            
            // Fechar info window
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
            }
        } catch (error) {
            console.error('Erro ao editar cliente:', error);
        }
    }

    // Agendar cliente a partir do mapa
    scheduleClientFromMap(markerId) {
        try {
            const markerData = this.markers.get(markerId);
            if (!markerData) return;
            
            if (window.clientManager && window.clientManager.scheduleClient) {
                window.clientManager.scheduleClient(markerData.client.id, markerData.source);
            }
            
            // Fechar info window
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
            }
        } catch (error) {
            console.error('Erro ao agendar cliente:', error);
        }
    }

    // Obter coordenadas do cliente com cache e fallback
    async getClientCoordinates(client) {
        try {
            // Verificar se já tem coordenadas salvas
            if (client.lat && client.lng && 
                !isNaN(parseFloat(client.lat)) && !isNaN(parseFloat(client.lng))) {
                return {
                    lat: parseFloat(client.lat),
                    lng: parseFloat(client.lng)
                };
            }

            const endereco = client['Endereço'];
            if (!endereco || endereco.trim() === '') {
                return null;
            }

            // Verificar cache
            const cacheKey = this.normalizeAddress(endereco);
            if (this.geocodeCache.has(cacheKey)) {
                console.log(`📍 Cache hit para: ${endereco}`);
                return this.geocodeCache.get(cacheKey);
            }

            // Geocodificar com múltiplas tentativas
            const coordinates = await this.geocodeAddressWithFallback(endereco);
            
            if (coordinates) {
                // Salvar no cache
                this.geocodeCache.set(cacheKey, coordinates);
                
                // Atualizar cliente com coordenadas (se possível)
                if (window.clientManager) {
                    try {
                        client.lat = coordinates.lat;
                        client.lng = coordinates.lng;
                        client.geocodedAt = new Date().toISOString();
                    } catch (error) {
                        console.warn('Não foi possível salvar coordenadas no cliente:', error);
                    }
                }
                
                return coordinates;
            }
            
            return null;
        } catch (error) {
            console.error(`Erro ao obter coordenadas para ${client['Nome Fantasia']}:`, error);
            return null;
        }
    }

    // Geocodificar endereço com fallback
    async geocodeAddressWithFallback(address) {
        const attempts = [
            address,
            `${address}, São José dos Campos, SP`,
            `${address}, São José dos Campos, São Paulo, Brasil`,
            address.replace(/[^\w\s]/g, '') + ', São José dos Campos, SP'
        ];

        for (const attempt of attempts) {
            try {
                const result = await this.geocodeAddress(attempt);
                if (result) {
                    console.log(`📍 Geocodificado: ${attempt}`);
                    return result;
                }
            } catch (error) {
                console.warn(`Falha na geocodificação: ${attempt}`, error);
                continue;
            }
        }

        return null;
    }

    // Geocodificar endereço
    async geocodeAddress(address) {
        if (!this.geocoder) {
            throw new Error('Geocoder não inicializado');
        }

        return new Promise((resolve) => {
            this.geocoder.geocode({ 
                address: address,
                region: 'BR',
                componentRestrictions: {
                    country: 'BR',
                    administrativeArea: 'SP'
                }
            }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const location = results[0].geometry.location;
                    
                    // Verificar se está na região de São José dos Campos
                    const lat = location.lat();
                    const lng = location.lng();
                    
                    // Coordenadas aproximadas de São José dos Campos
                    const sjcBounds = {
                        north: -23.1,
                        south: -23.3,
                        east: -45.8,
                        west: -46.0
                    };
                    
                    if (lat >= sjcBounds.south && lat <= sjcBounds.north &&
                        lng >= sjcBounds.west && lng <= sjcBounds.east) {
                        resolve({ lat, lng });
                    } else {
                        console.warn(`Coordenada fora da região de SJC: ${lat}, ${lng}`);
                        resolve({ lat, lng }); // Aceitar mesmo assim
                    }
                } else {
                    console.warn(`Geocodificação falhou para: ${address} (Status: ${status})`);
                    resolve(null);
                }
            });
        });
    }

    // Normalizar endereço para cache
    normalizeAddress(address) {
        return address.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Ajustar bounds para marcadores visíveis
    fitBoundsToVisibleMarkers() {
        if (!this.mapInitialized || !this.map) return;

        try {
            const bounds = new google.maps.LatLngBounds();
            let hasVisibleMarkers = false;

            for (const [id, markerData] of this.markers.entries()) {
                if (markerData.marker.getVisible()) {
                    bounds.extend(markerData.marker.getPosition());
                    hasVisibleMarkers = true;
                }
            }

            if (hasVisibleMarkers) {
                this.map.fitBounds(bounds);
                
                // Ajustar zoom se muito próximo
                google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
                    if (this.map.getZoom() > 15) {
                        this.map.setZoom(15);
                    }
                });
            } else {
                // Se não há marcadores visíveis, centralizar em São José dos Campos
                this.map.setCenter({ lat: -23.1791, lng: -45.8872 });
                this.map.setZoom(12);
            }
        } catch (error) {
            console.error('Erro ao ajustar bounds:', error);
        }
    }

    // Limpar marcadores
    clearAllMarkers() {
        try {
            for (const [id, markerData] of this.markers.entries()) {
                if (markerData.marker) {
                    markerData.marker.setMap(null);
                }
                if (markerData.infoWindow) {
                    markerData.infoWindow.close();
                }
            }
            this.markers.clear();
            
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
                this.currentInfoWindow = null;
            }
            
            console.log('🧹 Marcadores limpos');
        } catch (error) {
            console.error('Erro ao limpar marcadores:', error);
        }
    }

    // Verificar se mapa está pronto
    isReady() {
        return this.mapInitialized && this.map !== null;
    }

    // Obter estatísticas dos marcadores
    getMarkerStats() {
        const stats = { ativos: 0, novos: 0, inativos: 0, total: 0 };
        
        try {
            for (const [id, markerData] of this.markers.entries()) {
                if (markerData.source && stats.hasOwnProperty(markerData.source)) {
                    stats[markerData.source]++;
                }
                stats.total++;
            }
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
        }
        
        return stats;
    }

    // Exportar marcadores visíveis
    exportVisibleMarkers() {
        try {
            const visible = [];
            
            for (const [id, markerData] of this.markers.entries()) {
                if (markerData.marker && markerData.marker.getVisible()) {
                    visible.push({
                        id: id,
                        client: markerData.client,
                        source: markerData.source,
                        coordinates: markerData.coordinates
                    });
                }
            }
            
            if (visible.length === 0) {
                if (window.showToast) {
                    window.showToast('Nenhum marcador visível para exportar', 'warning');
                }
                return;
            }
            
            const csvContent = this.markersToCSV(visible);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `marcadores_sjc_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`📤 ${visible.length} marcadores exportados`);
            
            if (window.showToast) {
                window.showToast(`${visible.length} marcadores exportados com sucesso!`, 'success');
            }
        } catch (error) {
            console.error('Erro ao exportar marcadores:', error);
            if (window.showToast) {
                window.showToast('Erro ao exportar marcadores', 'error');
            }
        }
    }

    // Converter marcadores para CSV
    markersToCSV(markers) {
        const headers = ['Nome', 'Endereço', 'Latitude', 'Longitude', 'Status', 'Segmento', 'Contato', 'Telefone'];
        const rows = markers.map(m => [
            m.client['Nome Fantasia'] || '',
            m.client['Endereço'] || '',
            m.coordinates.lat,
            m.coordinates.lng,
            m.client['Status'] || '',
            m.client['Segmento'] || '',
            m.client['Contato'] || '',
            m.client['Celular'] || ''
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    // Buscar localização
    async searchLocation(query) {
        if (!this.mapInitialized || !this.geocoder) {
            if (window.showToast) {
                window.showToast('Mapa não disponível para busca', 'warning');
            }
            return;
        }

        try {
            const searchQuery = query.includes('São José dos Campos') ? 
                query : `${query}, São José dos Campos, SP`;

            const result = await this.geocodeAddress(searchQuery);
            
            if (result) {
                this.map.setCenter(result);
                this.map.setZoom(16);
                
                // Adicionar marcador temporário
                const tempMarker = new google.maps.Marker({
                    position: result,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: '#ff0000',
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#ffffff'
                    }
                });

                // Remover marcador após 5 segundos
                setTimeout(() => {
                    tempMarker.setMap(null);
                }, 5000);

                if (window.showToast) {
                    window.showToast('Localização encontrada!', 'success');
                }
            } else {
                if (window.showToast) {
                    window.showToast('Localização não encontrada', 'warning');
                }
            }
        } catch (error) {
            console.error('Erro na busca:', error);
            if (window.showToast) {
                window.showToast('Erro na busca de localização', 'error');
            }
        }
    }

    // Reinicializar mapa
    async reinitialize() {
        console.log('🔄 Reinicializando mapa...');
        
        try {
            // Limpar estado atual
            this.clearAllMarkers();
            this.mapInitialized = false;
            this.map = null;
            this.geocoder = null;
            this.initializationAttempts = 0;
            
            // Tentar inicializar novamente
            const success = await this.initializeMap();
            
            if (success) {
                // Recarregar marcadores
                setTimeout(() => {
                    this.loadAllMarkers();
                }, 1000);
            }
            
            return success;
        } catch (error) {
            console.error('Erro ao reinicializar mapa:', error);
            return false;
        }
    }
}

// Funções globais para compatibilidade
window.loadAllMarkers = () => {
    if (window.mapManager && window.mapManager.loadAllMarkers) {
        window.mapManager.loadAllMarkers();
    }
};

window.toggleMarkers = (type, show) => {
    if (window.mapManager && window.mapManager.filters) {
        window.mapManager.filters.status = show ? type : 'all';
        window.mapManager.applyFilters();
    }
};

window.searchLocation = () => {
    const searchInput = document.getElementById('map-search');
    if (searchInput && window.mapManager) {
        const query = searchInput.value.trim();
        if (query) {
            window.mapManager.searchLocation(query);
        }
    }
};

window.exportVisibleMarkers = () => {
    if (window.mapManager && window.mapManager.exportVisibleMarkers) {
        window.mapManager.exportVisibleMarkers();
    }
};

// Instância global
window.mapManager = new MapManager();
console.log('🗺️ map-manager.js carregado - Gerenciador de mapa com tratamento robusto para São José dos Campos');
