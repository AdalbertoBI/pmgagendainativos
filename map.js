// map.js - Mapa que ABRE IMEDIATAMENTE e carrega marcadores progressivamente

(function() {
    'use strict';

    let map = null;
    let markersLayer = null;
    let currentMarkers = [];
    let isMapInitialized = false;
    let isProcessingMarkers = false;
    
    const SJC_CONFIG = {
        center: [-23.2237, -45.9009],
        defaultZoom: 12,
        maxZoom: 18,
        minZoom: 10
    };

    // Verificar se Leaflet está disponível
    function isLeafletReady() {
        return typeof L !== 'undefined' && L.map && L.tileLayer && L.circleMarker && L.layerGroup;
    }

    class MapManager {
        constructor() {
            this.initialized = false;
        }

        async init() {
            if (this.initialized) {
                console.log('🗺️ Mapa já inicializado');
                return true;
            }

            try {
                console.log('🗺️ Inicializando mapa IMEDIATAMENTE...');

                // PASSO 1: Verificar se Leaflet está disponível
                if (!isLeafletReady()) {
                    console.log('⚠️ Leaflet não disponível ainda');
                    setTimeout(() => this.init(), 500);
                    return false;
                }

                // PASSO 2: Criar mapa IMEDIATAMENTE (sem aguardar dados)
                await this.createMapImmediately();

                this.initialized = true;
                console.log('✅ Mapa ABERTO! Iniciando carregamento de marcadores...');

                // PASSO 3: Carregar marcadores EM BACKGROUND (não bloquear)
                setTimeout(() => {
                    this.loadMarkersProgressively();
                }, 1000);

                return true;

            } catch (error) {
                console.error('❌ Erro ao abrir mapa:', error);
                this.showMapError('Erro ao abrir mapa: ' + error.message);
                return false;
            }
        }

        // CRIAR MAPA IMEDIATAMENTE - SEM AGUARDAR NADA
        async createMapImmediately() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Container do mapa não encontrado');
            }

            // Configurar container
            mapContainer.style.height = '500px';
            mapContainer.style.width = '100%';
            mapContainer.innerHTML = '';

            console.log('🗺️ Criando mapa Leaflet...');

            // Criar mapa
            map = L.map('map', {
                center: SJC_CONFIG.center,
                zoom: SJC_CONFIG.defaultZoom,
                zoomControl: true,
                scrollWheelZoom: true,
                dragging: true,
                maxZoom: SJC_CONFIG.maxZoom,
                minZoom: SJC_CONFIG.minZoom
            });

            // Adicionar tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: SJC_CONFIG.maxZoom
            }).addTo(map);

            // Layer para marcadores
            markersLayer = L.layerGroup().addTo(map);

            // Invalidar tamanho
            setTimeout(() => {
                if (map) {
                    map.invalidateSize(true);
                }
            }, 100);

            isMapInitialized = true;
            console.log('✅ Mapa VISÍVEL e funcional!');
        }

        // CARREGAR MARCADORES PROGRESSIVAMENTE - UM POR VEZ
        async loadMarkersProgressively() {
            if (isProcessingMarkers || !isMapInitialized) {
                return;
            }

            isProcessingMarkers = true;

            try {
                console.log('📍 Iniciando carregamento progressivo de marcadores...');

                // Obter todos os clientes
                const allClients = this.getAllClients();
                
                if (allClients.length === 0) {
                    console.log('⚠️ Nenhum cliente disponível');
                    this.showMapStatus('Nenhum cliente encontrado para exibir no mapa');
                    return;
                }

                console.log(`📍 ${allClients.length} clientes para processar`);
                this.showMapStatus(`Carregando ${allClients.length} marcadores...`);

                let processedCount = 0;

                // PROCESSAR UM POR VEZ COM DELAY VISÍVEL
                for (let i = 0; i < allClients.length; i++) {
                    const client = allClients[i];
                    
                    try {
                        console.log(`📍 [${i + 1}/${allClients.length}] Adicionando: ${client['Nome Fantasia'] || 'Cliente'}`);
                        
                        const marker = this.addClientMarkerNow(client);
                        if (marker) {
                            processedCount++;
                            
                            // Atualizar status na interface
                            this.showMapStatus(`Carregados ${processedCount}/${allClients.length} marcadores`);
                        }

                        // DELAY VISÍVEL para usuário ver o progresso
                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (error) {
                        console.warn(`⚠️ Erro no cliente ${client['Nome Fantasia']}:`, error);
                    }
                }

                // Ajustar vista
                this.fitMapToBounds();

                // Remover status
                this.hideMapStatus();

                console.log(`✅ Carregamento concluído: ${processedCount} marcadores`);

            } catch (error) {
                console.error('❌ Erro no carregamento progressivo:', error);
                this.showMapStatus('Erro ao carregar marcadores');
            } finally {
                isProcessingMarkers = false;
            }
        }

        // ADICIONAR MARCADOR IMEDIATAMENTE - SEM GEOCODIFICAÇÃO
        addClientMarkerNow(client) {
            try {
                const endereco = client['Endereço'];
                if (!endereco || endereco === 'N/A') {
                    return null;
                }

                // Coordenadas aleatórias em São José dos Campos
                const coords = {
                    lat: SJC_CONFIG.center[0] + (Math.random() - 0.5) * 0.08,
                    lng: SJC_CONFIG.center[1] + (Math.random() - 0.5) * 0.08
                };

                const markerStyle = this.getMarkerStyle(client.category);
                const marker = L.circleMarker([coords.lat, coords.lng], markerStyle.style);

                const popupContent = this.createPopupContent(client, markerStyle);
                marker.bindPopup(popupContent);

                markersLayer.addLayer(marker);
                currentMarkers.push(marker);

                return marker;

            } catch (error) {
                console.error('❌ Erro ao adicionar marcador:', error);
                return null;
            }
        }

        getAllClients() {
            const allClients = [];

            if (window.clientManager) {
                if (Array.isArray(window.clientManager.data)) {
                    allClients.push(...window.clientManager.data.map(c => ({...c, category: 'Inativo'})));
                }
                if (Array.isArray(window.clientManager.ativos)) {
                    allClients.push(...window.clientManager.ativos.map(c => ({...c, category: 'Ativo'})));
                }
                if (Array.isArray(window.clientManager.novos)) {
                    allClients.push(...window.clientManager.novos.map(c => ({...c, category: 'Novo'})));
                }
            }

            return allClients;
        }

        createPopupContent(client, markerStyle) {
            const nomeFantasia = this.escapeHtml(client['Nome Fantasia'] || client['Cliente'] || 'Cliente');
            const contato = this.escapeHtml(client['Contato'] || 'N/A');
            const telefone = this.escapeHtml(client['Celular'] || 'N/A');
            const cidade = this.escapeHtml(window.clientManager?.extrairCidadeDoItem(client) || 'N/A');

            // Criar chave global para o modal
            const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            window[clientId] = client;

            return `
                <div style="min-width: 280px; padding: 0;">
                    <div style="background: ${markerStyle.color}; color: white; padding: 1rem; margin: 0; border-radius: 6px 6px 0 0; text-align: center;">
                        <strong>${markerStyle.icon} ${nomeFantasia}</strong>
                    </div>
                    <div style="padding: 1rem;">
                        <p><strong>Status:</strong> ${client.category}</p>
                        <p><strong>Contato:</strong> ${contato}</p>
                        <p><strong>Telefone:</strong> ${telefone}</p>
                        <p><strong>Cidade:</strong> ${cidade}</p>
                        <div style="text-align: center; margin-top: 1rem;">
                            <button onclick="window.openClientModal('${clientId}')" 
                                    style="background: #007bff; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer;">
                                📋 Ver Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        getMarkerStyle(category) {
            switch (category) {
                case 'Ativo':
                    return {
                        style: { color: '#28a745', fillColor: '#28a745', fillOpacity: 0.8, radius: 9, weight: 2 },
                        color: '#28a745',
                        icon: '🟢'
                    };
                case 'Novo':
                    return {
                        style: { color: '#17a2b8', fillColor: '#17a2b8', fillOpacity: 0.8, radius: 9, weight: 2 },
                        color: '#17a2b8',
                        icon: '🆕'
                    };
                default:
                    return {
                        style: { color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.8, radius: 9, weight: 2 },
                        color: '#dc3545',
                        icon: '🔴'
                    };
            }
        }

        // MOSTRAR STATUS NO CANTO DO MAPA
        showMapStatus(message) {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            // Remover status anterior
            this.hideMapStatus();

            const statusDiv = document.createElement('div');
            statusDiv.id = 'map-status';
            statusDiv.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 123, 255, 0.9);
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 500;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                animation: fadeIn 0.3s ease;
            `;
            statusDiv.innerHTML = `
                <span style="display: inline-block; margin-right: 8px;">📍</span>
                ${message}
            `;

            mapContainer.appendChild(statusDiv);
        }

        hideMapStatus() {
            const statusDiv = document.getElementById('map-status');
            if (statusDiv) {
                statusDiv.remove();
            }
        }

        showMapError(message) {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            mapContainer.style.height = '500px';
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6c757d; text-align: center; padding: 2rem; background: #f8f9fa;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🗺️</div>
                    <h3 style="margin: 0 0 1rem 0; color: #dc3545;">Erro no Mapa</h3>
                    <p style="margin: 0 0 1rem 0;">${message}</p>
                    <button onclick="window.mapManager.init()" style="padding: 0.75rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Tentar Novamente
                    </button>
                </div>
            `;
        }

        fitMapToBounds() {
            if (!map || currentMarkers.length === 0) return;

            try {
                const group = new L.featureGroup(currentMarkers);
                const bounds = group.getBounds();

                if (bounds.isValid()) {
                    map.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 15
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao ajustar vista:', error);
            }
        }

        // MÉTODOS DE COMPATIBILIDADE
        onMapTabActivated() {
            console.log('📋 Aba do mapa ativada');
            
            if (!this.initialized) {
                this.init();
            } else if (map) {
                setTimeout(() => {
                    map.invalidateSize(true);
                    
                    // Se não há marcadores, carregar
                    if (currentMarkers.length === 0 && !isProcessingMarkers) {
                        this.loadMarkersProgressively();
                    }
                }, 200);
            }
        }

        updateAllMarkers() {
            if (!isProcessingMarkers) {
                // Limpar marcadores existentes
                this.clearAllMarkers();
                // Carregar novos
                this.loadMarkersProgressively();
            }
        }

        clearAllMarkers() {
            if (markersLayer) {
                markersLayer.clearLayers();
                currentMarkers = [];
            }
        }

        getStats() {
            return {
                markersCount: currentMarkers.length,
                mapInitialized: isMapInitialized,
                managerInitialized: this.initialized,
                isProcessingMarkers: isProcessingMarkers
            };
        }
    }

    // FUNÇÃO GLOBAL PARA MODAL
    window.openClientModal = function(clientId) {
        try {
            const client = window[clientId];
            if (!client) {
                alert('Cliente não encontrado');
                return;
            }

            if (window.clientManager && typeof window.clientManager.showClientModal === 'function') {
                window.clientManager.showClientModal(client);
            } else {
                alert('Sistema de modal não disponível');
            }
        } catch (error) {
            console.error('❌ Erro ao abrir modal:', error);
            alert('Erro ao abrir detalhes do cliente');
        }
    };

    // Inicializar instância global
    if (typeof window !== 'undefined') {
        window.mapManager = new MapManager();
        
        window.initializeMap = () => {
            if (window.mapManager) {
                return window.mapManager.init();
            }
        };

        // CSS para animações
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    console.log('✅ map.js que ABRE IMEDIATAMENTE carregado!');

})();
