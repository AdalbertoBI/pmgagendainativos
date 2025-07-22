// map.js - Sistema de Mapa SIMPLIFICADO e otimizado
class MapManager {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.currentMarkers = [];
        this.initialized = false;
        this.userLocation = null;
        
        // Configurações
        this.config = {
            defaultCenter: [-23.2237, -45.9009], // São José dos Campos
            defaultZoom: 12,
            maxZoom: 18,
            minZoom: 8
        };
        
        console.log('✅ MapManager inicializado');
    }

    /**
     * Inicializar mapa
     */
    async init() {
        if (this.initialized) {
            console.log('✅ Mapa já inicializado');
            return;
        }

        try {
            console.log('🗺️ Inicializando mapa...');
            
            // Verificar se Leaflet está disponível
            if (typeof L === 'undefined') {
                throw new Error('Leaflet não carregado');
            }
            
            // Obter localização do usuário
            this.userLocation = await this.getUserLocation();
            
            // Definir centro do mapa
            let center = this.config.defaultCenter;
            let zoom = this.config.defaultZoom;
            
            if (this.userLocation && this.userLocation.accuracy < 1000) {
                center = [this.userLocation.lat, this.userLocation.lon];
                zoom = this.userLocation.accuracy < 100 ? 15 : 13;
            }
            
            // Criar mapa
            this.map = L.map('map', {
                center: center,
                zoom: zoom,
                maxZoom: this.config.maxZoom,
                minZoom: this.config.minZoom,
                zoomControl: true,
                attributionControl: true
            });
            
            // Adicionar tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: this.config.maxZoom,
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            // Criar layer para marcadores
            this.markersLayer = L.layerGroup().addTo(this.map);
            
            // Adicionar marcador do usuário se disponível
            if (this.userLocation) {
                this.addUserLocationMarker();
            }
            
            this.initialized = true;
            console.log('✅ Mapa inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar mapa:', error);
            throw error;
        }
    }

    /**
     * Obter localização do usuário
     */
    async getUserLocation() {
        return new Promise((resolve) => {
            if (!('geolocation' in navigator)) {
                resolve(null);
                return;
            }

            console.log('📍 Obtendo localização do usuário...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
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
                    console.warn('⚠️ Erro de geolocalização:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                }
            );
        });
    }

    /**
     * Adicionar marcador da localização do usuário
     */
    addUserLocationMarker() {
        if (!this.userLocation || !this.map) return;

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '📍',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        const userMarker = L.marker([this.userLocation.lat, this.userLocation.lon], {
            icon: userIcon,
            zIndexOffset: 1000
        });

        const popupContent = `
            <div class="user-location-popup">
                <h4>📍 Sua Localização</h4>
                <p><strong>Precisão:</strong> ±${Math.round(this.userLocation.accuracy)}m</p>
                <p><strong>Atualização:</strong> ${new Date(this.userLocation.timestamp).toLocaleTimeString()}</p>
            </div>
        `;

        userMarker.bindPopup(popupContent);
        userMarker.addTo(this.map);
        
        console.log('✅ Marcador do usuário adicionado');
    }

    /**
     * Atualizar mapa com clientes geocodificados
     */
    async updateWithGeocodedClients(geocodedClients) {
        try {
            console.log(`🗺️ Atualizando mapa com ${geocodedClients.length} clientes`);
            
            if (!this.initialized) {
                await this.init();
            }
            
            // Limpar marcadores existentes
            this.clearClientMarkers();
            
            // Adicionar novos marcadores
            let addedMarkers = 0;
            
            geocodedClients.forEach(client => {
                if (client.geocoding?.success && client.geocoding.coordinates) {
                    const marker = this.createClientMarker(client);
                    if (marker) {
                        this.markersLayer.addLayer(marker);
                        this.currentMarkers.push({
                            client: client,
                            marker: marker,
                            coordinates: client.geocoding.coordinates
                        });
                        addedMarkers++;
                    }
                }
            });
            
            console.log(`✅ ${addedMarkers} marcadores adicionados ao mapa`);
            
            // Ajustar zoom para mostrar todos os marcadores
            if (addedMarkers > 0) {
                this.fitMapToMarkers();
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar mapa:', error);
        }
    }

    /**
     * Criar marcador para cliente
     */
    createClientMarker(client) {
        try {
            const coords = client.geocoding.coordinates;
            const status = client['Status'] || 'Inativo';
            const confidence = client.geocoding.confidence || 0;
            
            // Definir ícone baseado no status e confiança
            let iconClass = 'client-marker';
            let iconSymbol = '📍';
            
            if (status.toLowerCase().includes('ativo')) {
                iconClass += ' client-active';
                iconSymbol = '🟢';
            } else if (status.toLowerCase().includes('novo')) {
                iconClass += ' client-new';
                iconSymbol = '🆕';
            } else {
                iconClass += ' client-inactive';
                iconSymbol = '🔴';
            }
            
            // Indicar método de geocodificação
            if (client.geocoding.method?.includes('viacep')) {
                iconClass += ' verified';
                iconSymbol = '✅';
            } else if (confidence < 0.5) {
                iconClass += ' low-confidence';
                iconSymbol = '❓';
            }
            
            const icon = L.divIcon({
                className: iconClass,
                html: iconSymbol,
                iconSize: [26, 26],
                iconAnchor: [13, 26]
            });
            
            const marker = L.marker([coords.lat, coords.lon], { icon: icon });
            
            // Criar popup
            const popupContent = this.createClientPopup(client);
            marker.bindPopup(popupContent);
            
            return marker;
            
        } catch (error) {
            console.error('❌ Erro ao criar marcador:', error);
            return null;
        }
    }

    /**
     * Criar conteúdo do popup do cliente
     */
    createClientPopup(client) {
        const nome = client['Nome Fantasia'] || client['Cliente'] || 'Cliente';
        const contato = client['Contato'] || 'N/A';
        const telefone = client['Celular'] || 'N/A';
        const segmento = client['Segmento'] || 'N/A';
        const status = client['Status'] || 'N/A';
        const endereco = client['Endereço'] || 'N/A';
        
        const geocoding = client.geocoding || {};
        const method = geocoding.method || 'desconhecido';
        const confidence = Math.round((geocoding.confidence || 0) * 100);
        
        let confidenceText = '';
        if (method.includes('viacep')) {
            confidenceText = '✅ Verificado com ViaCEP';
        } else if (confidence >= 80) {
            confidenceText = '🎯 Localização precisa';
        } else if (confidence >= 50) {
            confidenceText = '📍 Localização aproximada';
        } else {
            confidenceText = '❓ Localização estimada';
        }
        
        // Informações sobre CEP se disponível
        let cepInfo = '';
        if (geocoding.cep) {
            cepInfo = `<p><strong>CEP usado:</strong> ${geocoding.cep}</p>`;
        }
        
        return `
            <div class="client-popup">
                <h4>${nome}</h4>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Segmento:</strong> ${segmento}</p>
                <p><strong>Contato:</strong> ${contato}</p>
                <p><strong>Telefone:</strong> ${telefone}</p>
                ${cepInfo}
                <hr style="margin: 0.5rem 0;">
                <p><strong>Endereço:</strong> ${endereco}</p>
                <p><strong>Precisão:</strong> ${confidenceText} (${confidence}%)</p>
                <p><strong>Método:</strong> ${method}</p>
            </div>
        `;
    }

    /**
     * Limpar marcadores de clientes
     */
    clearClientMarkers() {
        if (this.markersLayer) {
            this.markersLayer.clearLayers();
        }
        this.currentMarkers = [];
        console.log('🧹 Marcadores de clientes removidos');
    }

    /**
     * Ajustar zoom para mostrar todos os marcadores
     */
    fitMapToMarkers() {
        if (!this.map || this.currentMarkers.length === 0) return;

        try {
            const group = new L.featureGroup(this.currentMarkers.map(m => m.marker));
            this.map.fitBounds(group.getBounds(), {
                padding: [20, 20],
                maxZoom: 15
            });
            console.log('✅ Mapa ajustado para mostrar todos os marcadores');
        } catch (error) {
            console.error('❌ Erro ao ajustar zoom do mapa:', error);
        }
    }

    /**
     * Atualizar mapa quando aba for ativada
     */
    onMapTabActivated() {
        if (!this.map) return;

        setTimeout(() => {
            try {
                this.map.invalidateSize(true);
                console.log('✅ Tamanho do mapa invalidado');
            } catch (error) {
                console.error('❌ Erro ao invalidar tamanho do mapa:', error);
            }
        }, 300);
    }

    /**
     * Refresh mapa
     */
    async refreshMap() {
        try {
            console.log('🔄 Atualizando mapa...');
            
            if (!this.initialized) {
                await this.init();
                return;
            }
            
            // Invalidar tamanho
            if (this.map) {
                this.map.invalidateSize(true);
            }
            
            // Re-processar clientes se disponível
            if (window.clientManager) {
                const allClients = [
                    ...(window.clientManager.data || []),
                    ...(window.clientManager.ativos || []),
                    ...(window.clientManager.novos || [])
                ];
                
                // Filtrar clientes que já têm geocodificação
                const geocodedClients = allClients.filter(c => c.geocoding?.success);
                
                if (geocodedClients.length > 0) {
                    await this.updateWithGeocodedClients(geocodedClients);
                } else {
                    console.log('ℹ️ Nenhum cliente geocodificado para exibir no mapa');
                }
            }
            
            console.log('✅ Mapa atualizado');
            
        } catch (error) {
            console.error('❌ Erro ao atualizar mapa:', error);
            throw error;
        }
    }
}

// Instância global
window.mapManager = new MapManager();

// Estilos CSS específicos para marcadores
const mapStyles = document.createElement('style');
mapStyles.textContent = `
    /* Estilos para marcadores */
    .client-marker {
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .client-marker:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
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
    
    .verified {
        border-color: #17a2b8;
        background: linear-gradient(45deg, #fff, #e7f3ff);
    }
    
    .low-confidence {
        border-style: dashed;
        opacity: 0.7;
    }
    
    .user-location-marker {
        background: radial-gradient(circle, #007bff, #0056b3);
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(0, 123, 255, 0.6);
        animation: pulse-location 2s infinite;
    }
    
    @keyframes pulse-location {
        0% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7);
        }
        70% {
            box-shadow: 0 0 0 20px rgba(0, 123, 255, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
        }
    }
    
    .client-popup {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 300px;
    }
    
    .client-popup h4 {
        margin-bottom: 0.5rem;
        color: #007bff;
        font-size: 1.1rem;
    }
    
    .client-popup p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
    }
    
    .client-popup strong {
        color: #495057;
    }
    
    .user-location-popup h4 {
        color: #007bff;
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(mapStyles);

console.log('✅ map.js carregado - Sistema simplificado e otimizado');
