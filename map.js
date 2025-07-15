// map.js - Versão corrigida e definitiva

let map = null;
let markers = [];
let addressCache = {};
let manualCorrections = {};
let isEditMode = false;

// Inicializar mapa
function initMap() {
    console.log('🗺️ Inicializando mapa...');
    
    if (map) {
        console.log('Mapa já inicializado');
        return;
    }
    
    map = L.map('map').setView([-23.2237, -45.9009], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    loadCaches();
    updateMapStatus('Mapa carregado - Aguardando clientes ativos...');
    
    // Configurar botão de edição APÓS o mapa estar pronto
    setTimeout(() => {
        setupEditButton();
    }, 500);
    
    console.log('✅ Mapa inicializado com sucesso');
}

// Configurar botão de edição - MÉTODO ROBUSTO
function setupEditButton() {
    const editBtn = document.getElementById('edit-mode-btn');
    if (!editBtn) {
        console.error('❌ Botão edit-mode-btn não encontrado no DOM');
        return;
    }
    
    // Limpar listeners antigos
    editBtn.removeEventListener('click', handleEditButtonClick);
    
    // Adicionar novo listener
    editBtn.addEventListener('click', handleEditButtonClick);
    
    // Resetar estado visual
    editBtn.innerHTML = '✏️ Editar Localizações';
    editBtn.style.background = '';
    editBtn.classList.remove('active');
    isEditMode = false;
    
    console.log('✅ Botão de edição configurado');
}

// Manipular clique no botão - FUNÇÃO SEPARADA
function handleEditButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🔄 Botão editar clicado, modo atual:', isEditMode);
    
    const editBtn = document.getElementById('edit-mode-btn');
    if (!editBtn) return;
    
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        // ENTRAR NO MODO EDIÇÃO
        editBtn.innerHTML = '❌ Sair da Edição';
        editBtn.style.background = '#ffebee';
        editBtn.style.color = '#d32f2f';
        editBtn.classList.add('active');
        
        // Habilitar arrasto em todos os marcadores
        let enabledCount = 0;
        markers.forEach(marker => {
            if (marker && marker.dragging) {
                marker.dragging.enable();
                marker.setOpacity(0.8);
                enabledCount++;
                
                // Garantir evento dragend
                if (!marker._editEventConfigured) {
                    marker.on('dragend', handleMarkerDragEnd);
                    marker._editEventConfigured = true;
                }
            }
        });
        
        updateMapStatus(`Modo EDIÇÃO ativado - ${enabledCount} marcadores arrastáveis`);
        console.log(`✅ Modo edição ativado: ${enabledCount} marcadores habilitados`);
        
    } else {
        // SAIR DO MODO EDIÇÃO
        editBtn.innerHTML = '✏️ Editar Localizações';
        editBtn.style.background = '';
        editBtn.style.color = '';
        editBtn.classList.remove('active');
        
        // Desabilitar arrasto em todos os marcadores
        let disabledCount = 0;
        markers.forEach(marker => {
            if (marker && marker.dragging) {
                marker.dragging.disable();
                marker.setOpacity(1);
                disabledCount++;
            }
        });
        
        updateMapStatus(`Modo edição DESATIVADO - ${disabledCount} marcadores travados`);
        console.log(`✅ Modo edição desativado: ${disabledCount} marcadores travados`);
    }
}

// Manipular fim do arrasto - FUNÇÃO CORRIGIDA
function handleMarkerDragEnd(event) {
    const marker = event.target;
    const newLatLng = marker.getLatLng();
    const client = marker.clientData;
    
    if (!client) {
        console.error('❌ Cliente não encontrado no marcador');
        return;
    }
    
    const address = getFullAddress(client);
    const clientName = client['Nome Fantasia'] || 'Cliente sem nome';
    
    console.log('📍 Marcador arrastado:', clientName, newLatLng);
    
    const confirmMessage = `CONFIRMAR NOVA POSIÇÃO:\n\n` +
                          `Cliente: ${clientName}\n` +
                          `Endereço: ${address}\n\n` +
                          `Nova posição:\n` +
                          `Latitude: ${newLatLng.lat.toFixed(6)}\n` +
                          `Longitude: ${newLatLng.lng.toFixed(6)}\n\n` +
                          `Salvar esta correção?`;
    
    if (confirm(confirmMessage)) {
        // Salvar correção manual
        manualCorrections[address] = {
            lat: newLatLng.lat,
            lng: newLatLng.lng,
            confidence: 1.0,
            provider: 'Manual',
            manuallyEdited: true,
            editedAt: new Date().toISOString(),
            clientName: clientName
        };
        
        // Salvar no localStorage
        try {
            if (window.dbManager && typeof window.dbManager.saveManualCorrections === 'function') {
                window.dbManager.saveManualCorrections(manualCorrections);
            }
            
            // Atualizar cache também
            addressCache[address] = manualCorrections[address];
            if (window.dbManager && typeof window.dbManager.saveAddressCache === 'function') {
                window.dbManager.saveAddressCache(addressCache);
            }
        } catch (error) {
            console.error('Erro ao salvar correção:', error);
        }
        
        // Atualizar ícone para azul (editado)
        marker.setIcon(createMarkerIcon('blue', 1.0, true));
        
        // Atualizar popup
        const popupContent = createPopupContent(client, newLatLng, true);
        marker.setPopupContent(popupContent);
        
        updateMapStatus(`✅ Posição de "${clientName}" salva com sucesso!`);
        console.log('✅ Correção salva:', { clientName, address, newLatLng });
        
    } else {
        // Reverter para posição original
        const originalCoords = getOriginalCoords(client);
        if (originalCoords) {
            marker.setLatLng([originalCoords.lat, originalCoords.lng]);
            console.log('🔄 Posição revertida para:', originalCoords);
        }
    }
}

// Carregar dados do mapa
async function loadMapData() {
    if (!map) {
        console.log('🗺️ Aguardando mapa ser inicializado...');
        return;
    }
    
    clearMarkers();
    
    const ativos = window.ativos || [];
    if (ativos.length === 0) {
        updateMapStatus('Nenhum cliente ativo encontrado');
        return;
    }
    
    updateMapStatus(`Carregando ${ativos.length} clientes ativos...`);
    console.log(`📊 Carregando ${ativos.length} clientes ativos no mapa`);
    
    let loaded = 0;
    for (const client of ativos) {
        try {
            const address = getFullAddress(client);
            if (address) {
                const coords = await geocodeAddressEnhanced(address);
                if (coords) {
                    const marker = createEditableMarker(coords, client);
                    markers.push(marker);
                    loaded++;
                }
            }
        } catch (error) {
            console.error('Erro ao processar cliente:', client['Nome Fantasia'], error);
        }
        
        // Pausa pequena para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    updateMapStatus(`${loaded}/${ativos.length} clientes carregados - Clique em "Editar Localizações" para corrigir posições`);
    console.log(`✅ ${loaded} marcadores carregados no mapa`);
}

// Criar marcador editável - SEMPRE DRAGGABLE
function createEditableMarker(coords, client) {
    const isManuallyEdited = coords.manuallyEdited || false;
    const color = isManuallyEdited ? 'blue' : 'green';
    
    const marker = L.marker([coords.lat, coords.lng], {
        icon: createMarkerIcon(color, coords.confidence, isManuallyEdited),
        draggable: true // SEMPRE DRAGGABLE
    }).addTo(map);
    
    // Armazenar dados do cliente
    marker.clientData = client;
    
    // Popup com informações
    const popupContent = createPopupContent(client, coords, isManuallyEdited);
    marker.bindPopup(popupContent);
    
    // Configurar eventos
    marker.on('click', function(e) {
        if (!isEditMode) {
            // Modo visualização - abrir popup/modal
            marker.openPopup();
            setTimeout(() => {
                const popupElement = document.querySelector('.leaflet-popup-content');
                if (popupElement) {
                    popupElement.style.cursor = 'pointer';
                    popupElement.onclick = function() {
                        marker.closePopup();
                        if (window.clientManager && typeof window.clientManager.openModal === 'function') {
                            window.clientManager.openModal(client, 'ativos');
                        }
                    };
                }
            }, 100);
        }
    });
    
    // Desabilitar arrasto inicialmente
    if (marker.dragging) {
        marker.dragging.disable();
    }
    
    return marker;
}

// Criar ícone do marcador
function createMarkerIcon(color, confidence, isManual) {
    let finalColor = color;
    
    if (!isManual) {
        if (confidence < 0.7) finalColor = 'orange';
        if (confidence < 0.5) finalColor = 'red';
    }
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${finalColor}; 
                width: 22px; 
                height: 22px; 
                border-radius: 50%; 
                border: 3px solid white; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
            ">
                ${isManual ? '📍' : ''}
            </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

// Criar conteúdo do popup
function createPopupContent(client, coords, isManuallyEdited) {
    const address = getFullAddress(client);
    
    return `
        <div style="max-width: 250px; font-family: Arial, sans-serif; line-height: 1.4;">
            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">
                ${client['Nome Fantasia'] || 'Sem Nome'}
            </h4>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> Cliente Ativo</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Cidade:</strong> ${client.Cidade || 'N/A'}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Endereço:</strong> ${address}</p>
            <p style="margin: 4px 0; font-size: 12px;"><strong>Precisão:</strong> ${Math.round((coords.confidence || 0.8) * 100)}%</p>
            ${isManuallyEdited ? 
                '<p style="margin: 4px 0; font-size: 12px; color: #2196F3; font-weight: bold;">✅ Posição corrigida manualmente</p>' : 
                ''
            }
            <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <small style="color: #666; font-size: 11px;">Clique aqui para ver detalhes completos</small>
            </div>
        </div>
    `;
}

// Funções auxiliares
function clearMarkers() {
    markers.forEach(marker => {
        if (marker && map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    markers = [];
}

function updateMapStatus(message) {
    const statusElement = document.getElementById('map-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function loadCaches() {
    try {
        if (window.dbManager && typeof window.dbManager.loadAddressCache === 'function') {
            addressCache = window.dbManager.loadAddressCache() || {};
        }
        if (window.dbManager && typeof window.dbManager.loadManualCorrections === 'function') {
            manualCorrections = window.dbManager.loadManualCorrections() || {};
        }
    } catch (error) {
        console.error('Erro ao carregar caches:', error);
    }
}

function getOriginalCoords(client) {
    const address = getFullAddress(client);
    return addressCache[address] || manualCorrections[address] || null;
}

function getFullAddress(client) {
    const parts = [
        client.Endereco || '',
        client.Numero || '',
        client.Bairro || '',
        client.Cidade || '',
        client.UF || '',
        client.CEP || ''
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
}

// Geocodificação melhorada
async function geocodeAddressEnhanced(address) {
    if (!address) return null;
    
    // Verificar correções manuais primeiro
    if (manualCorrections[address]) {
        return manualCorrections[address];
    }
    
    // Verificar cache
    if (addressCache[address]) {
        return addressCache[address];
    }
    
    // Geocodificar
    try {
        const coords = await geocodeBasic(address);
        if (coords) {
            addressCache[address] = coords;
            if (window.dbManager && typeof window.dbManager.saveAddressCache === 'function') {
                window.dbManager.saveAddressCache(addressCache);
            }
            return coords;
        }
    } catch (error) {
        console.error('Erro na geocodificação:', error);
    }
    
    return null;
}

// Geocodificação básica
async function geocodeBasic(address) {
    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=br`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                confidence: parseFloat(result.importance) || 0.8,
                provider: 'Nominatim',
                manuallyEdited: false
            };
        }
    } catch (error) {
        console.error('Erro na geocodificação básica:', error);
    }
    
    return null;
}

// Exportar funções globalmente
window.initMap = initMap;
window.loadMapData = loadMapData;
window.toggleEditMode = handleEditButtonClick;
window.setupEditButton = setupEditButton;

console.log('✅ map.js carregado - versão corrigida');
