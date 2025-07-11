let data = []; // Inativos
let ativos = JSON.parse(localStorage.getItem('ativos')) || []; // Ativos persistentes
let schedules = JSON.parse(localStorage.getItem('schedules')) || {}; // Agendamentos por cliente ID (array para múltiplos)
let filteredData = [];
let currentItem = null;
let currentTab = 'inativos';
const today = new Date();

// Função para abrir abas
function openTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tabs button').forEach(el => el.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    document.querySelector(`button[onclick="openTab('${tab}')"]`).classList.add('active');
    currentTab = tab;
    if (tab === 'ativos') renderAtivos();
    if (tab === 'agenda') renderAgenda();
}

// Carregar XLSX com tratamento de erro
document.getElementById('xlsxFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return alert('Nenhum arquivo selecionado!');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const bytes = e.target.result;
            const workbook = XLSX.read(bytes, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

            const headers = data[0].map(h => h.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
            data = data.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, i) => obj[header] = row[i] || '');
                obj.id = `inactive-${Math.random().toString(36).substr(2, 9)}`;
                return obj;
            });

            populateCidades();
            applyFiltersAndSort();
        } catch (error) {
            alert('Erro ao ler o arquivo: ' + error.message);
        }
    };
    reader.readAsBinaryString(file);
});

// Popular lista de cidades com checkboxes
function populateCidades() {
    const cidades = [...new Set(data.map(item => item['Cidade']))].sort();
    const list = document.getElementById('cidadeList');
    list.innerHTML = '';
    cidades.forEach(cidade => {
        const div = document.createElement('div');
        div.innerHTML = `<input type="checkbox" value="${cidade}"> ${cidade}`;
        div.querySelector('input').addEventListener('change', applyFiltersAndSort);
        list.appendChild(div);
    });
}

// Aplicar filtros e ordenação com tratamento de erro
function applyFiltersAndSort() {
    try {
        const saldoMin = parseFloat(document.getElementById('saldoFilter').value) || 0;
        const cidadesSelecionadas = Array.from(document.querySelectorAll('#cidadeList input:checked')).map(input => input.value);
        const sort = document.getElementById('sortOption').value;

        filteredData = data.filter(item => {
            const saldo = parseFloat(item['Saldo de Credito']) || 0;
            const itemCidade = item['Cidade'] || '';
            return saldo >= saldoMin && (cidadesSelecionadas.length === 0 || cidadesSelecionadas.includes(itemCidade));
        });

        if (sort === 'nome-az') filteredData.sort((a, b) => (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || ''));
        else if (sort === 'nome-za') filteredData.sort((a, b) => (b['Nome Fantasia'] || '').localeCompare(a['Nome Fantasia'] || ''));
        else if (sort === 'saldo-desc') filteredData.sort((a, b) => parseFloat(b['Saldo de Credito']) - parseFloat(a['Saldo de Credito']));
        else if (sort === 'saldo-asc') filteredData.sort((a, b) => parseFloat(a['Saldo de Credito']) - parseFloat(b['Saldo de Credito']));
        else if (sort === 'data-asc') filteredData.sort((a, b) => parseDate(a['Data Ultimo Pedido']) - parseDate(b['Data Ultimo Pedido']));
        else if (sort === 'data-desc') filteredData.sort((a, b) => parseDate(b['Data Ultimo Pedido']) - parseDate(a['Data Ultimo Pedido']));

        renderList();
    } catch (error) {
        alert('Erro ao aplicar filtros: ' + error.message);
    }
}

// Parsear data DD/MM/AAAA com validação
function parseDate(dateStr) {
    if (!dateStr) return 0;
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? 0 : date.getTime();
}

// Calcular dias desde último pedido
function daysSince(dateStr) {
    const lastDate = new Date(parseDate(dateStr));
    const diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    return isNaN(diff) ? 'N/A' : diff;
}

// Renderizar lista de inativos (numerada)
function renderList() {
    const list = document.getElementById('list');
    list.innerHTML = '';
    filteredData.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} <span class="days-since">(${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)</span>`;
        li.addEventListener('click', () => showDetails(item, 'inativos'));
        list.appendChild(li);
    });
}

// Renderizar lista de ativos (numerada)
function renderAtivos() {
    const list = document.getElementById('ativos-list');
    list.innerHTML = '';
    let sortedAtivos = [...ativos].sort((a, b) => (a['Nome Fantasia'] || '').localeCompare(b['Nome Fantasia'] || ''));
    sortedAtivos.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} <span class="days-since">(${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)</span>`;
        li.addEventListener('click', () => showDetails(item, 'ativos'));
        list.appendChild(li);
    });
}

// Renderizar agenda (próxima no topo, com botão de excluir)
function renderAgenda() {
    const agendaList = document.getElementById('agenda-list');
    agendaList.innerHTML = '';
    let agendaItems = [];
    Object.entries(schedules).forEach(([id, schArray]) => {
        schArray.forEach((sch, schIndex) => {
            const client = [...data, ...ativos].find(c => c.id === id);
            if (client) {
                agendaItems.push({ date: new Date(sch.date), client: client['Nome Fantasia'], tipo: sch.tipo, horario: sch.horario, id, schIndex });
            }
        });
    });
    agendaItems.sort((a, b) => a.date - b.date); // Próxima no topo
    agendaItems.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${item.date.toLocaleDateString('pt-BR')} - ${item.client} - ${item.tipo} às ${item.horario}</span>`;
        const btn = document.createElement('button');
        btn.textContent = 'Excluir';
        btn.onclick = () => deleteSchedule(item.id, item.schIndex);
        div.appendChild(btn);
        agendaList.appendChild(div);
    });
}

// Excluir agendamento específico com tratamento de erro
function deleteSchedule(id, schIndex) {
    try {
        if (schedules[id]) {
            schedules[id].splice(schIndex, 1);
            if (schedules[id].length === 0) delete schedules[id];
            localStorage.setItem('schedules', JSON.stringify(schedules));
            renderAgenda();
            alert('Agendamento excluído!');
        } else {
            alert('Agendamento não encontrado!');
        }
    } catch (error) {
        alert('Erro ao excluir agendamento: ' + error.message);
    }
}

// Mostrar detalhes no modal com botão de WhatsApp
function showDetails(item, tab) {
    currentItem = item;
    currentTab = tab;
    const details = document.getElementById('details');
    details.innerHTML = `
        <h2>${item['Nome Fantasia']}</h2>
        <p><strong>Cliente:</strong> ${item.Cliente}</p>
        <p><strong>CNPJ/CPF:</strong> ${item['CNPJ / CPF']}</p>
        <p class="highlight"><strong>Contato:</strong> ${item.Contato}</p>
        <p><strong>Telefone Comercial:</strong> ${item['Telefone Comercial']}</p>
        <p><strong>Celular:</strong> ${item.Celular}</p>
        <p><strong>Email:</strong> ${item.Email}</p>
        <p><strong>Saldo de Crédito:</strong> ${item['Saldo de Credito']}</p>
        <p><strong>Data Último Pedido:</strong> ${item['Data Ultimo Pedido']}</p>
        <p><strong>Cidade:</strong> ${item.Cidade}</p>
        <p><strong>Endereço Completo:</strong> ${item.Endereco}, ${item.Numero}, ${item.Bairro}, ${item.Cidade}, ${item.UF}, ${item.CEP}</p>
    `;

    // Adicionar botão de WhatsApp ao lado do Celular
    const celularP = details.querySelector('p:nth-of-type(5)'); // Seleciona o <p> do Celular
    if (item.Celular) {
        const cleanNumber = item.Celular.replace(/\D/g, ''); // Remove não-dígitos
        if (cleanNumber.length >= 10) { // Verifica se é um número válido
            const whatsappLink = document.createElement('a');
            whatsappLink.href = `https://wa.me/55${cleanNumber}`;
            whatsappLink.textContent = 'Abrir WhatsApp';
            whatsappLink.className = 'whatsapp-btn';
            whatsappLink.target = '_blank';
            celularP.appendChild(whatsappLink);
        }
    }

    const address = encodeURIComponent(`${item.Endereco}, ${item.Numero}, ${item.Bairro}, ${item.Cidade}, ${item.UF}, ${item.CEP}`);
    const mapLink = document.createElement('a');
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${address}`;
    mapLink.textContent = 'Abrir no Google Maps';
    details.appendChild(mapLink);

    // Preencher agendamento (pegando o primeiro para simplicidade)
    const sch = schedules[item.id] && schedules[item.id].length > 0 ? schedules[item.id][0] : {};
    document.getElementById('diaSemana').value = sch.dia || '';
    document.getElementById('horario').value = sch.horario || '';
    document.getElementById('tipo').value = sch.tipo || '';
    document.getElementById('repeticao').value = sch.repeticao || '';

    document.getElementById('tornarAtivo').style.display = (tab === 'inativos') ? 'block' : 'none';
    document.getElementById('excluirAtivo').style.display = (tab === 'ativos') ? 'block' : 'none';
    document.getElementById('edit-date').style.display = 'none';

    document.getElementById('modal').style.display = 'flex';
}

// Preparar para tornar ativo com edição de data
function prepareTornarAtivo() {
    document.getElementById('edit-date').style.display = 'block';
    document.getElementById('tornarAtivo').style.display = 'none';
    document.getElementById('confirmarAtivo').style.display = 'block';
}

// Tornar ativo com edição e validação
function tornarAtivo() {
    try {
        const newDate = document.getElementById('editDataPedido').value;
        if (!newDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
            return alert('Data inválida! Use o formato DD/MM/AAAA.');
        }
        currentItem['Data Ultimo Pedido'] = newDate;
        ativos.push(currentItem);
        data = data.filter(d => d.id !== currentItem.id);
        localStorage.setItem('ativos', JSON.stringify(ativos));
        applyFiltersAndSort();
        document.getElementById('modal').style.display = 'none';
        alert('Cliente tornado ativo com sucesso!');
    } catch (error) {
        alert('Erro ao tornar cliente ativo: ' + error.message);
    }
}

// Excluir dos ativos com tratamento de erro
function excluirAtivo() {
    try {
        data.push(currentItem);
        ativos = ativos.filter(a => a.id !== currentItem.id);
        localStorage.setItem('ativos', JSON.stringify(ativos));
        renderAtivos();
        document.getElementById('modal').style.display = 'none';
        alert('Cliente retornado para inativos!');
    } catch (error) {
        alert('Erro ao excluir dos ativos: ' + error.message);
    }
}

// Função auxiliar para intervalo de repetição
function getInterval(type) {
    if (type === 'semanal') return 7;
    if (type === 'quinzenal') return 14;
    if (type === 'mensal') return 30;
    return Infinity; // Sem repetição, apenas uma vez
}

// Salvar agendamento com repetição e limitações
function saveSchedule() {
    const dia = document.getElementById('diaSemana').value;
    const horario = document.getElementById('horario').value;
    const tipo = document.getElementById('tipo').value;
    const repeticao = document.getElementById('repeticao').value;
    if (!dia || !horario || !tipo) return alert('Preencha todos os campos obrigatórios!');

    try {
        schedules[currentItem.id] = [];
        const baseDate = new Date();
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayIndex = dayNames.indexOf(dia);
        if (dayIndex === -1) return alert('Dia inválido!');

        // Encontrar a próxima data correspondente ao dia da semana
        let daysToAdd = (dayIndex - baseDate.getDay() + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Se for hoje, agenda para a próxima semana

        const interval = getInterval(repeticao);
        const maxRepetitions = 4; // Limite para evitar loops infinitos
        for (let i = 0; i < maxRepetitions; i++) {
            const nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + daysToAdd + (i * interval));
            if (nextDate > new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)) break; // Limite de 30 dias
            schedules[currentItem.id].push({
                date: nextDate.toISOString().split('T')[0],
                dia,
                horario,
                tipo,
                repeticao
            });
        }

        localStorage.setItem('schedules', JSON.stringify(schedules));
        alert('Agendamento salvo com sucesso!');
        document.getElementById('modal').style.display = 'none';
        renderAgenda();
    } catch (error) {
        alert('Erro ao salvar agendamento: ' + error.message);
    }
}

// Limpar ativos com confirmação
function clearAtivos() {
    if (!confirm('Tem certeza que deseja limpar todos os ativos e agendamentos?')) return;
    try {
        ativos = [];
        schedules = {};
        localStorage.removeItem('ativos');
        localStorage.removeItem('schedules');
        renderAtivos();
        renderAgenda();
        alert('Dados limpos com sucesso!');
    } catch (error) {
        alert('Erro ao limpar dados: ' + error.message);
    }
}

// Eventos para filtros e ordenação
document.getElementById('saldoFilter').addEventListener('input', applyFiltersAndSort);
document.getElementById('sortOption').addEventListener('change', applyFiltersAndSort);

// Fechar modal
document.getElementById('close').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
});

// Inicializar listas
renderAtivos();
renderAgenda();
