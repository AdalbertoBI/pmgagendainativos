// script.js

// Variáveis globais
let data = [];
let ativos = [];
let schedules = {};
let filteredData = [];
let currentItem = null;
let currentTab = 'inativos';
const today = new Date();
const BATCH_SIZE = 500; // Tamanho do lote para processamento
const MAX_RECORDS = 10000; // Limite máximo de registros
let savedFilters = JSON.parse(localStorage.getItem('savedFilters')) || { saldoMin: 0, cidadesSelecionadas: [], sort: 'nome-az' };

// Disponibilizar dados globalmente para o mapa
window.data = data;
window.ativos = ativos;
window.filteredData = filteredData;

// Função para inicializar IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ClientDatabase', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('clients', { keyPath: 'id' });
            db.createObjectStore('ativos', { keyPath: 'id' });
            db.createObjectStore('schedules', { keyPath: 'id' });
        };
        request.onsuccess = (event) => { resolve(event.target.result); };
        request.onerror = (event) => { reject(new Error('Erro ao abrir IndexedDB: ' + event.target.error)); };
    });
}

// Função para salvar dados no IndexedDB
async function saveToIndexedDB(storeName, data) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        data.forEach(item => { store.put(item); });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Erro ao salvar em ${storeName}`));
    });
}

// Função para carregar dados do IndexedDB
async function loadFromIndexedDB(storeName) {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Erro ao carregar ${storeName}`));
    });
}

// Função para salvar filtros no localStorage
function saveFilters() {
    const saldoMin = parseFloat(document.getElementById('saldoFilter')?.value) || 0;
    const cidadesSelecionadas = Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value);
    const sort = document.getElementById('sortOption')?.value || 'nome-az';
    savedFilters = { saldoMin, cidadesSelecionadas, sort };
    localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
    console.log('💾 Filtros salvos:', savedFilters);
}

// Função para aplicar filtros salvos
function applySavedFilters() {
    if (savedFilters) {
        const saldoFilter = document.getElementById('saldoFilter');
        if (saldoFilter) {
            saldoFilter.value = savedFilters.saldoMin || 0;
        }
        const cidadeList = document.getElementById('cidadeList');
        if (cidadeList) {
            const checkboxes = cidadeList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = savedFilters.cidadesSelecionadas.includes(checkbox.value);
            });
        }
        const sortOption = document.getElementById('sortOption');
        if (sortOption) {
            sortOption.value = savedFilters.sort || 'nome-az';
        }
        console.log('🔄 Filtros salvos aplicados:', savedFilters);
        applyFiltersAndSort(); // <-- ESSA LINHA GARANTE QUE A LISTA É ATUALIZADA
    }
}

function parseDate(dateStr) {
    if (!dateStr) return 0;
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateStr)) return 0;
    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return 0;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 0;
    return date.getTime();
}

function formatDateUS2BR(dateStr) {
    if (!dateStr) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    let [month, day, year] = parts;
    if (year.length === 2) year = '20' + year;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

function daysSince(dateStr) {
    const lastDate = new Date(parseDate(formatDateUS2BR(dateStr)));
    const diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    return isNaN(diff) ? 'N/A' : diff;
}

// Função de progresso para feedback
function updateProgress(message, progress = null) {
    const statusElement = document.createElement('div');
    statusElement.id = 'upload-progress';
    statusElement.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fff; padding: 10px; border: 1px solid #ccc; border-radius: 5px; z-index: 1000;';
    if (progress !== null) {
        statusElement.innerText = `${message} (${progress.toFixed(0)}%)`;
    } else {
        statusElement.innerText = message;
    }
    document.body.appendChild(statusElement);
    setTimeout(() => statusElement.remove(), 3000);
}

// Limpa todos os dados e filtros
async function resetAllData() {
    console.log('🔄 Iniciando reset completo dos dados...');
    try {
        if (typeof window.clearMapDataCache === 'function') {
            window.clearMapDataCache();
            console.log('🗑️ Cache do mapa limpo via resetAllData');
        }
        data = [];
        ativos = [];
        schedules = {};
        filteredData = [];
        savedFilters = { saldoMin: 0, cidadesSelecionadas: [], sort: 'nome-az' }; // Resetar filtros
        localStorage.removeItem('savedFilters'); // Limpar filtros salvos
        const db = await initIndexedDB();
        const transaction = db.transaction(['clients', 'ativos', 'schedules'], 'readwrite');
        transaction.objectStore('clients').clear();
        transaction.objectStore('ativos').clear();
        transaction.objectStore('schedules').clear();
        window.data = data;
        window.ativos = ativos;
        window.filteredData = filteredData;
        applyFiltersAndSort();
        
        const inativosList = document.getElementById('list');
        if (inativosList) {
            inativosList.innerHTML = '<li>Nenhum cliente inativo carregado</li>';
        }
        
        const ativosList = document.getElementById('ativos-list');
        if (ativosList) {
            ativosList.innerHTML = '<li>Nenhum cliente ativo</li>';
        }
        
        const agendaList = document.getElementById('agenda-list');
        if (agendaList) {
            agendaList.innerHTML = '<div>Nenhum agendamento</div>';
        }
        
        console.log('✅ Reset completo finalizado');
    } catch (error) {
        console.error('❌ Erro ao resetar dados:', error);
        updateProgress('Erro ao resetar dados');
    }
}

// Carrega dados do arquivo Excel
async function loadFileData(fileData) {
    try {
        data = fileData;
        ativos = await loadFromIndexedDB('ativos');
        await saveToIndexedDB('clients', data);
        await saveToIndexedDB('ativos', ativos);
        window.data = data;
        window.ativos = ativos;
        window.filteredData = filteredData;
        applyFiltersAndSort();
        if (typeof window.loadMapData === 'function') {
            window.loadMapData();
        }
        updateProgress('Dados carregados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        updateProgress('Erro ao carregar dados');
    }
}

// Aplica filtros e ordenação
function applyFiltersAndSort() {
    try {
        const saldoMin = parseFloat(document.getElementById('saldoFilter')?.value) || savedFilters.saldoMin || 0;
        const cidadesSelecionadas = Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value) || savedFilters.cidadesSelecionadas;
        const sort = document.getElementById('sortOption')?.value || savedFilters.sort || 'nome-az';
        
        if (currentTab === 'inativos') {
            filteredData = data.filter(item => {
                const saldo = parseFloat(item['Saldo de Credito']) || 0;
                const itemCidade = item['Cidade'] || '';
                return saldo >= saldoMin && (cidadesSelecionadas.length === 0 || cidadesSelecionadas.includes(itemCidade));
            });
            
            if (sort === 'nome-az') filteredData.sort((a, b) => (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || ''));
            else if (sort === 'nome-za') filteredData.sort((a, b) => (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || ''));
            else if (sort === 'saldo-desc') filteredData.sort((a, b) => parseFloat(b['Saldo de Credito']) - parseFloat(a['Saldo de Credito']));
            else if (sort === 'saldo-asc') filteredData.sort((a, b) => parseFloat(a['Saldo de Credito']) - parseFloat(b['Saldo de Credito']));
            else if (sort === 'data-asc') filteredData.sort((a, b) => parseDate(formatDateUS2BR(a['Data Ultimo Pedido'])) - parseDate(formatDateUS2BR(b['Data Ultimo Pedido'])));
            else if (sort === 'data-desc') filteredData.sort((a, b) => parseDate(formatDateUS2BR(b['Data Ultimo Pedido'])) - parseDate(formatDateUS2BR(a['Data Ultimo Pedido'])));
            
            window.filteredData = filteredData;
            renderList();
            
            if (currentTab === 'mapa' && typeof window.loadMapData === 'function') {
                setTimeout(() => window.loadMapData(), 300);
            }
        } else if (currentTab === 'ativos') {
            filteredData = ativos.slice();
            renderList();
        }
        
        console.log(`🔍 Filtros aplicados: ${filteredData.length}/${data.length} clientes exibidos`);
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros:', error);
        updateProgress('Erro ao aplicar filtros');
    }
}

// Renderiza a lista de clientes
function renderList() {
    const listElement = document.getElementById(currentTab === 'inativos' ? 'list' : 'ativos-list');
    if (!listElement) return;
    listElement.innerHTML = '';
    
    if (filteredData.length === 0) {
        listElement.innerHTML = '<li style="text-align: center; color: #666;">Nenhum cliente encontrado</li>';
        return;
    }
    
    filteredData.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} <span class="days-since">(${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)</span>`;
        li.onclick = () => showDetails(item, currentTab);
        listElement.appendChild(li);
    });
}

// Exibe detalhes do cliente
function showDetails(item, tab) {
    currentItem = item;
    currentTab = tab;
    
    const details = document.getElementById('details');
    if (!details) return;
    
    details.innerHTML = `
        <p><strong>Cliente:</strong> ${item.Cliente || ''}</p>
        <p><strong>CNPJ/CPF:</strong> ${item['CNPJ / CPF'] || ''}</p>
        <p><strong>Contato:</strong> ${item.Contato || ''}</p>
        <p><strong>Telefone Comercial:</strong> ${item['Telefone Comercial'] || ''}</p>
        <p><strong>Celular:</strong> ${item.Celular || ''}</p>
        <p><strong>Email:</strong> ${item.Email || ''}</p>
        <p><strong>Saldo de Crédito:</strong> ${item['Saldo de Credito'] || ''}</p>
        <p><strong>Data Último Pedido:</strong> ${formatDateUS2BR(item['Data Ultimo Pedido']) || ''}</p>
        <p><strong>Cidade:</strong> ${item.Cidade || ''}</p>
        <p><strong>Endereço Completo:</strong> ${getFullAddress(item)}</p>
    `;
    
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const mapsBtn = document.getElementById('maps-btn');
    
    if (whatsappBtn) {
        const phone = item['Telefone Comercial'] || item.Celular || '';
        const message = `Olá ${item['Nome Fantasia'] || 'cliente'}! Estou entrando em contato para verificar se podemos retomar nosso relacionamento comercial.`;
        whatsappBtn.href = generateWhatsAppLink(phone, message);
        whatsappBtn.style.display = phone ? 'inline-block' : 'none';
    }
    
    if (mapsBtn) {
        const address = getFullAddress(item);
        mapsBtn.href = generateMapsLink(address);
        mapsBtn.style.display = address ? 'inline-block' : 'none';
    }
    
    const sch = schedules[item.id] && schedules[item.id].length > 0 ? schedules[item.id][0] : {};
    
    if (document.getElementById('diaSemana')) document.getElementById('diaSemana').value = sch.dia || '';
    if (document.getElementById('horario')) document.getElementById('horario').value = sch.horario || '';
    if (document.getElementById('tipo')) document.getElementById('tipo').value = sch.tipo || '';
    if (document.getElementById('repeticao')) document.getElementById('repeticao').value = sch.repeticao || '';
    
    if (document.getElementById('tornarAtivo')) document.getElementById('tornarAtivo').style.display = (tab === 'inativos') ? 'inline-block' : 'none';
    if (document.getElementById('excluirAtivo')) document.getElementById('excluirAtivo').style.display = (tab === 'ativos') ? 'inline-block' : 'none';
    if (document.getElementById('editDataPedido')) document.getElementById('editDataPedido').style.display = 'none';
    if (document.getElementById('labelEditDataPedido')) document.getElementById('labelEditDataPedido').style.display = 'none';
    if (document.getElementById('confirmarAtivo')) document.getElementById('confirmarAtivo').style.display = 'none';
    if (document.getElementById('modal')) document.getElementById('modal').style.display = 'flex';
    
    const obsKey = 'observacoes_' + item.id;
    const obsTextarea = document.getElementById('observacoes');
    if (obsTextarea) {
        obsTextarea.value = localStorage.getItem(obsKey) || '';
        if (document.getElementById('observacoes-contador')) document.getElementById('observacoes-contador').textContent = obsTextarea.value.length + '/2000';
        
        obsTextarea.oninput = function() {
            if (document.getElementById('observacoes-contador')) document.getElementById('observacoes-contador').textContent = this.value.length + '/2000';
        };
    }
    
    if (document.getElementById('salvarObservacoes')) {
        document.getElementById('salvarObservacoes').onclick = function() {
            if (obsTextarea) localStorage.setItem(obsKey, obsTextarea.value);
            alert('Observações salvas!');
        };
    }
}

function openTab(tab) {
    console.log(`📂 Abrindo aba: ${tab}`);
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tabs button').forEach(el => el.classList.remove('active'));
    
    const tabContent = document.getElementById(tab + '-content');
    const tabButton = document.querySelector(`button[onclick="openTab('${tab}')"]`);
    
    if (tabContent) tabContent.classList.add('active');
    if (tabButton) tabButton.classList.add('active');
    
    currentTab = tab;
    
    const uploadDiv = document.getElementById('upload');
    if (uploadDiv) {
        uploadDiv.style.display = (tab === 'inativos' || tab === 'mapa') ? 'block' : 'none';
    }
    
    if (tab === 'inativos') {
        applySavedFilters();
        applyFiltersAndSort();
    }
    if (tab === 'ativos') renderAtivos();
    if (tab === 'agenda') renderAgenda();
    if (tab === 'mapa') {
        console.log('🗺️ Inicializando aba mapa...');
        try {
            if (typeof window.initMap === 'function') {
                window.initMap();
                setTimeout(() => {
                    if (data.length > 0 || ativos.length > 0) {
                        if (typeof window.loadMapData === 'function') {
                            window.loadMapData();
                        }
                    } else {
                        console.log('📋 Nenhum dado disponível para o mapa');
                    }
                }, 300);
            } else {
                console.error('❌ Função initMap não encontrada');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar mapa:', error);
            updateProgress('Erro ao inicializar mapa');
        }
    }
}

function generateWhatsAppLink(phone, message) {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

function generateMapsLink(address) {
    if (!address) return '#';
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
}

function getFullAddress(item) {
    const parts = [
        item.Endereco || '',
        item.Numero || '',
        item.Bairro || '',
        item.Cidade || '',
        item.UF || '',
        item.CEP || ''
    ].filter(part => part.trim());
    
    return parts.join(', ');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicação...');
    
    try {
        data = await loadFromIndexedDB('clients') || [];
        ativos = await loadFromIndexedDB('ativos') || [];
        schedules = await loadFromIndexedDB('schedules') || {};
        window.data = data;
        window.ativos = ativos;
        window.filteredData = filteredData;
        
        if (currentTab === 'inativos') {
            applySavedFilters();
            applyFiltersAndSort();
        }
        
        const uploadDiv = document.getElementById('upload');
        if (uploadDiv) {
            uploadDiv.style.display = 'block';
        }
        
        if (document.getElementById('cidadeList')) {
            document.getElementById('cidadeList').classList.add('escondido');
        }
        
        populateCidades();
        renderAtivos();
        renderAgenda();
        
        if (document.getElementById('saldoFilter')) {
            document.getElementById('saldoFilter').addEventListener('input', () => {
                applyFiltersAndSort();
                saveFilters();
            });
        }
        
        if (document.getElementById('sortOption')) {
            document.getElementById('sortOption').addEventListener('change', () => {
                applyFiltersAndSort();
                saveFilters();
            });
        }
        
        if (document.getElementById('close')) {
            document.getElementById('close').addEventListener('click', () => {
                document.getElementById('modal').style.display = 'none';
            });
        }
        
        if (document.getElementById('xlsxFile')) {
            document.getElementById('xlsxFile').addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return alert('Nenhum arquivo selecionado!');
                
                if (file.size > 10 * 1024 * 1024) { // Limite de 10MB
                    alert('Arquivo muito grande! O limite é 10MB.');
                    return;
                }
                
                console.log('📁 Processando arquivo:', file.name);
                await resetAllData();
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const bytes = e.target.result;
                        const workbook = XLSX.read(bytes, { type: 'binary' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                        
                        if (rawData.length === 0) {
                            alert('❌ Arquivo vazio ou inválido!');
                            return;
                        }
                        
                        if (rawData.length === 1) {
                            alert('❌ Arquivo contém apenas cabeçalhos!');
                            return;
                        }
                        
                        if (rawData.length > MAX_RECORDS) {
                            alert(`❌ Arquivo excede o limite de ${MAX_RECORDS} registros!`);
                            return;
                        }
                        
                        const headers = rawData[0].map(h => 
                            h ? h.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''
                        );
                        
                        const dataRows = rawData.slice(1);
                        data = [];
                        const totalRows = dataRows.length;
                        
                        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                            const batch = dataRows.slice(i, i + BATCH_SIZE);
                            const batchData = batch.map((row, index) => {
                                const hasValidData = row.some(cell => cell && cell.toString().trim() !== '');
                                if (hasValidData) {
                                    let obj = {};
                                    headers.forEach((header, j) => {
                                        obj[header] = row[j] || '';
                                    });
                                    obj.id = `inactive-${Date.now()}-${i + index}-${Math.random().toString(36).substr(2, 5)}`;
                                    return obj;
                                }
                                return null;
                            }).filter(row => row !== null);
                            
                            data.push(...batchData);
                            updateProgress('Processando dados', (i + batch.length) / totalRows * 100);
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        if (data.length === 0) {
                            alert('❌ Nenhum cliente válido encontrado no arquivo!');
                            return;
                        }
                        
                        window.data = data;
                        window.ativos = ativos;
                        window.filteredData = filteredData;
                        
                        await saveToIndexedDB('clients', data);
                        await saveToIndexedDB('ativos', ativos);
                        
                        populateCidades();
                        applyFiltersAndSort();
                        
                        const message = `✅ Arquivo carregado com sucesso!\n\n📊 ${data.length} clientes inativos encontrados\n📁 Arquivo: ${file.name}`;
                        alert(message);
                        
                        console.log('✅ Dados processados e disponibilizados globalmente');
                        
                        if (currentTab === 'mapa') {
                            setTimeout(() => {
                                if (typeof window.loadMapData === 'function') {
                                    window.loadMapData();
                                }
                            }, 500);
                        }
                    } catch (error) {
                        console.error('❌ Erro ao processar arquivo:', error);
                        alert('❌ Erro ao processar o arquivo:\n' + error.message);
                        await resetAllData();
                    }
                };
                
                reader.onerror = () => {
                    alert('❌ Erro ao ler o arquivo.');
                    resetAllData();
                };
                
                reader.readAsBinaryString(file);
            });
        }
        
        const editDataPedido = document.getElementById('editDataPedido');
        if (editDataPedido) {
            editDataPedido.addEventListener('input', function(e) {
                let value = this.value.replace(/\D/g, '').slice(0,8);
                if (value.length > 4)
                    value = value.slice(0,2) + '/' + value.slice(2,4) + '/' + value.slice(4,8);
                else if (value.length > 2)
                    value = value.slice(0,2) + '/' + value.slice(2,4);
                this.value = value;
            });
        }
        
        // Adicionar evento para salvar filtros quando as cidades mudarem
        if (document.getElementById('cidadeList')) {
            document.getElementById('cidadeList').addEventListener('change', () => {
                applyFiltersAndSort();
                saveFilters();
            });
        }
        
        console.log('✅ Aplicação inicializada');
    } catch (error) {
        console.error('❌ Erro ao inicializar aplicação:', error);
        updateProgress('Erro ao inicializar aplicação');
    }
});

function populateCidades() {
    const cidades = [...new Set(data.map(item => (item['Cidade'] || '').trim()))]
        .filter(c => c)
        .sort((a, b) => a.localeCompare(b, 'pt-BR', {sensitivity: 'base'}));
    
    const list = document.getElementById('cidadeList');
    if (!list) return;
    
    list.innerHTML = '';
    cidades.forEach(cidade => {
        const div = document.createElement('div');
        div.innerHTML = `<input type="checkbox" value="${cidade}" id="cidade-${cidade}"><label for="cidade-${cidade}">${cidade}</label>`;
        list.appendChild(div);
    });
    
    // Aplicar filtros salvos após preencher a lista de cidades
    applySavedFilters();
    console.log(`🏙️ ${cidades.length} cidades encontradas`);
}

function toggleCidades() {
    const selector = document.getElementById('cidadeSelector');
    const list = document.getElementById('cidadeList');
    if (!selector || !list) return;
    
    const aberto = list.classList.toggle('visivel');
    list.classList.toggle('escondido', !aberto);
    selector.classList.toggle('aberto', aberto);
    document.getElementById('cidadeSelectorText').textContent = aberto ? 'Ocultar cidades' : 'Selecionar cidades';
}

function renderAtivos() {
    const list = document.getElementById('ativos-list');
    if (!list) return;
    
    list.innerHTML = '';
    let sortedAtivos = [...ativos].sort((a, b) => (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || ''));
    
    sortedAtivos.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} <span class="days-since">(${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)</span>`;
        li.addEventListener('click', () => showDetails(item, 'ativos'));
        list.appendChild(li);
    });
}

function renderAgenda() {
    const agendaList = document.getElementById('agenda-list');
    if (!agendaList) return;
    
    agendaList.innerHTML = '';
    let agendaItems = [];
    
    Object.entries(schedules).forEach(([id, schArray]) => {
        schArray.forEach((sch, schIndex) => {
            const client = [...data, ...ativos].find(c => c.id === id);
            if (client && sch.dateTime) {
                agendaItems.push({
                    dateTime: sch.dateTime,
                    client: client['Nome Fantasia'],
                    tipo: sch.tipo,
                    id,
                    schIndex,
                    clientData: client
                });
            }
        });
    });
    
    agendaItems.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    agendaItems.forEach(item => {
        let dt = new Date(item.dateTime);
        let dataStr = isNaN(dt) ? 'Data inválida' : dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        const div = document.createElement('div');
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <span>${dataStr} - ${item.client}</span>
            <strong>${item.tipo || ''}</strong>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                showDetails(item.clientData, item.clientData.isAtivo ? 'ativos' : 'inativos');
            }
        });
        
        const btn = document.createElement('button');
        btn.textContent = 'Excluir';
        btn.onclick = () => deleteSchedule(item.id, item.schIndex);
        div.appendChild(btn);
        
        agendaList.appendChild(div);
    });
}

function deleteSchedule(id, schIndex) {
    try {
        if (schedules[id]) {
            schedules[id].splice(schIndex, 1);
            if (schedules[id].length === 0) delete schedules[id];
            saveToIndexedDB('schedules', Object.entries(schedules).map(([id, sch]) => ({ id, schedules: sch })));
            renderAgenda();
            alert('Agendamento excluído!');
        } else {
            alert('Agendamento não encontrado!');
        }
    } catch (error) {
        alert('Erro ao excluir agendamento: ' + (error.message || error));
    }
}

function prepareTornarAtivo() {
    if (document.getElementById('editDataPedido')) document.getElementById('editDataPedido').style.display = 'inline-block';
    if (document.getElementById('labelEditDataPedido')) document.getElementById('labelEditDataPedido').style.display = 'inline-block';
    if (document.getElementById('confirmarAtivo')) document.getElementById('confirmarAtivo').style.display = 'inline-block';
    if (document.getElementById('tornarAtivo')) document.getElementById('tornarAtivo').style.display = 'none';
}

async function tornarAtivo() {
    try {
        const newDate = document.getElementById('editDataPedido')?.value;
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
            alert('Data inválida! Use o formato DD/MM/AAAA.');
            return;
        }
        
        const [day, month, year] = newDate.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        if (
            dateObj.getFullYear() !== year ||
            dateObj.getMonth() !== month - 1 ||
            dateObj.getDate() !== day
        ) {
            alert('Data inválida! Use uma data real no formato DD/MM/AAAA.');
            return;
        }
        
        if (!currentItem) {
            alert('Erro interno: Nenhum cliente selecionado.');
            return;
        }
        
        currentItem['Data Ultimo Pedido'] = newDate;
        ativos.push(currentItem);
        data = data.filter(d => d.id !== currentItem.id);
        await saveToIndexedDB('clients', data);
        await saveToIndexedDB('ativos', ativos);
        
        window.data = data;
        window.ativos = ativos;
        window.filteredData = filteredData;
        
        applyFiltersAndSort();
        
        if (currentTab === 'mapa' && typeof window.loadMapData === 'function') {
            setTimeout(() => window.loadMapData(), 300);
        }
        
        if (document.getElementById('modal')) document.getElementById('modal').style.display = 'none';
        alert('Cliente tornado ativo com sucesso!');
    } catch (error) {
        alert('Erro ao tornar cliente ativo: ' + (error.message || error));
    }
}

async function excluirAtivo() {
    try {
        data.push(currentItem);
        ativos = ativos.filter(a => a.id !== currentItem.id);
        await saveToIndexedDB('clients', data);
        await saveToIndexedDB('ativos', ativos);
        
        window.data = data;
        window.ativos = ativos;
        window.filteredData = filteredData;
        
        renderAtivos();
        
        if (currentTab === 'mapa' && typeof window.loadMapData === 'function') {
            setTimeout(() => window.loadMapData(), 300);
        }
        
        if (document.getElementById('modal')) document.getElementById('modal').style.display = 'none';
        alert('Cliente retornado para inativos!');
    } catch (error) {
        alert('Erro ao excluir dos ativos: ' + (error.message || error));
    }
}

function getInterval(type) {
    if (type === 'Semanal') return 7;
    if (type === 'Quinzenal') return 14;
    if (type === 'Mensal') return 30;
    return Infinity;
}

async function saveSchedule() {
    const dia = document.getElementById('diaSemana')?.value;
    const horario = document.getElementById('horario')?.value;
    const tipo = document.getElementById('tipo')?.value;
    const repeticao = document.getElementById('repeticao')?.value;
    
    if (!dia || !horario || !tipo) return alert('Preencha todos os campos obrigatórios!');
    
    if (!/^\d{2}:\d{2}$/.test(horario)) {
        alert('Horário inválido! Use o formato HH:MM.');
        return;
    }
    
    try {
        schedules[currentItem.id] = [];
        
        const baseDate = new Date();
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayIndex = dayNames.indexOf(dia);
        if (dayIndex === -1) return alert('Dia inválido!');
        
        let daysToAdd = (dayIndex - baseDate.getDay() + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7;
        
        const interval = getInterval(repeticao);
        const maxRepetitions = 4;
        
        for (let i = 0; i < maxRepetitions; i++) {
            const nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + daysToAdd + (i * interval));
            
            const dateStr = nextDate.toISOString().split('T')[0];
            const dateTime = `${dateStr}T${horario}`;
            
            if (isNaN(new Date(dateTime))) continue;
            
            schedules[currentItem.id].push({
                dateTime,
                dia, horario, tipo, repeticao
            });
        }
        
        await saveToIndexedDB('schedules', Object.entries(schedules).map(([id, sch]) => ({ id, schedules: sch })));
        alert('Agendamento salvo com sucesso!');
        if (document.getElementById('modal')) document.getElementById('modal').style.display = 'none';
        renderAgenda();
    } catch (error) {
        alert('Erro ao salvar agendamento: ' + (error.message || error));
    }
}

// Funções globais
window.openTab = openTab;
window.toggleCidades = toggleCidades;
window.prepareTornarAtivo = prepareTornarAtivo;
window.tornarAtivo = tornarAtivo;
window.excluirAtivo = excluirAtivo;
window.saveSchedule = saveSchedule;
window.resetAllData = resetAllData;
window.showDetails = showDetails;
window.generateWhatsAppLink = generateWhatsAppLink;
window.generateMapsLink = generateMapsLink;
window.getFullAddress = getFullAddress;
window.loadFileData = loadFileData;
window.applyFiltersAndSort = applyFiltersAndSort;

console.log('🚀 script.js carregado com sucesso');