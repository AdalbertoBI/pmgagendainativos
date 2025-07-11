let data = []; // Inativos
let ativos = JSON.parse(localStorage.getItem('ativos')) || [];
let schedules = JSON.parse(localStorage.getItem('schedules')) || {};
let filteredData = [];
let currentItem = null;
let currentTab = 'inativos';
const today = new Date();

// Função robusta para parsear datas no formato DD/MM/AAAA
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

// Função para formatar datas para DD/MM/AAAA (corrige datas americanas)
function formatDateUS2BR(dateStr) {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  let [month, day, year] = parts;
  if (year.length === 2) year = '20' + year;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

// Calcular dias desde último pedido
function daysSince(dateStr) {
  const lastDate = new Date(parseDate(formatDateUS2BR(dateStr)));
  const diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? 'N/A' : diff;
}

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
    div.innerHTML = `<label><input type="checkbox" value="${cidade}"> ${cidade}</label>`;
    div.querySelector('input').addEventListener('change', applyFiltersAndSort);
    list.appendChild(div);
  });
}

// Minimizar/maximizar seleção de cidades
function toggleCidades() {
  const selector = document.getElementById('cidadeSelector');
  const list = document.getElementById('cidadeList');
  const aberto = list.classList.toggle('visivel');
  list.classList.toggle('escondido', !aberto);
  selector.classList.toggle('aberto', aberto);
  document.getElementById('cidadeSelectorText').textContent = aberto ? 'Ocultar cidades' : 'Selecionar cidades';
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
    else if (sort === 'data-asc') filteredData.sort((a, b) => parseDate(formatDateUS2BR(a['Data Ultimo Pedido'])) - parseDate(formatDateUS2BR(b['Data Ultimo Pedido'])));
    else if (sort === 'data-desc') filteredData.sort((a, b) => parseDate(formatDateUS2BR(b['Data Ultimo Pedido'])) - parseDate(formatDateUS2BR(a['Data Ultimo Pedido'])));
    renderList();
  } catch (error) {
    alert('Erro ao aplicar filtros: ' + error.message);
  }
}

// Renderizar lista de inativos (numerada)
function renderList() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  filteredData.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} (${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)`;
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
    li.innerHTML = `${index + 1}. ${item['Nome Fantasia'] || 'Sem Nome'} (${daysSince(item['Data Ultimo Pedido'])} dias sem pedir)`;
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
  agendaItems.sort((a, b) => a.date - b.date);
  agendaItems.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `${item.date.toLocaleDateString('pt-BR')} - ${item.client} - ${item.tipo} às ${item.horario}`;
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

// Mostrar detalhes no modal com botão de WhatsApp e Google Maps
function showDetails(item, tab) {
  currentItem = item;
  currentTab = tab;
  const details = document.getElementById('details');
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
    <p><strong>Endereço Completo:</strong> ${item.Endereco || ''}, ${item.Numero || ''}, ${item.Bairro || ''}, ${item.Cidade || ''}, ${item.UF || ''}, ${item.CEP || ''}</p>
  `;

  // Botão WhatsApp ao lado do Celular
  const celularP = details.querySelector('p:nth-of-type(5)');
  if (item.Celular) {
    const cleanNumber = item.Celular.replace(/\D/g, '');
    if (cleanNumber.length >= 10) {
      const whatsappLink = document.createElement('a');
      whatsappLink.href = `https://wa.me/55${cleanNumber}`;
      whatsappLink.textContent = 'Abrir WhatsApp';
      whatsappLink.className = 'whatsapp-btn';
      whatsappLink.target = '_blank';
      celularP.appendChild(whatsappLink);
    }
  }

  // Botão Google Maps
  const address = encodeURIComponent(`${item.Endereco || ''}, ${item.Numero || ''}, ${item.Bairro || ''}, ${item.Cidade || ''}, ${item.UF || ''}, ${item.CEP || ''}`);
  const mapLink = document.createElement('a');
  mapLink.href = `https://www.google.com/maps/search/?api=1&query=${address}`;
  mapLink.textContent = 'Abrir no Google Maps';
  mapLink.target = '_blank';
  details.appendChild(mapLink);

  // Preencher agendamento (pegando o primeiro para simplicidade)
  const sch = schedules[item.id] && schedules[item.id].length > 0 ? schedules[item.id][0] : {};
  document.getElementById('diaSemana').value = sch.dia || '';
  document.getElementById('horario').value = sch.horario || '';
  document.getElementById('tipo').value = sch.tipo || '';
  document.getElementById('repeticao').value = sch.repeticao || '';

  document.getElementById('tornarAtivo').style.display = (tab === 'inativos') ? 'inline-block' : 'none';
  document.getElementById('excluirAtivo').style.display = (tab === 'ativos') ? 'inline-block' : 'none';
  document.getElementById('editDataPedido').style.display = 'none';
  document.getElementById('confirmarAtivo').style.display = 'none';
  document.getElementById('modal').style.display = 'flex';
}

// Função para inserir "/" automaticamente no campo de data
document.addEventListener('DOMContentLoaded', function() {
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
});

// Função para mostrar campo de data e botão ao lado do "Salvar agendamento"
function prepareTornarAtivo() {
  document.getElementById('editDataPedido').style.display = 'inline-block';
  document.getElementById('confirmarAtivo').style.display = 'inline-block';
  document.getElementById('tornarAtivo').style.display = 'none';
}

// Função para validar e salvar a nova data ao tornar ativo
function tornarAtivo() {
  try {
    const newDate = document.getElementById('editDataPedido').value;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newDate)) {
      alert('Data inválida! Use o formato DD/MM/AAAA.');
      return;
    }
    // Validação extra para datas impossíveis
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
  return Infinity;
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
    let daysToAdd = (dayIndex - baseDate.getDay() + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    const interval = getInterval(repeticao);
    const maxRepetitions = 48;
    for (let i = 0; i < maxRepetitions; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + daysToAdd + (i * interval));
      if (nextDate > new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)) break;
      schedules[currentItem.id].push({ date: nextDate.toISOString().split('T')[0], dia, horario, tipo, repeticao });
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

// Inicializar listas e estado da seleção de cidades
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cidadeList').classList.add('escondido');
  renderAtivos();
  renderAgenda();
});

// Expor funções globais para botões HTML
window.openTab = openTab;
window.toggleCidades = toggleCidades;
window.prepareTornarAtivo = prepareTornarAtivo;
window.tornarAtivo = tornarAtivo;
window.excluirAtivo = excluirAtivo;
window.saveSchedule = saveSchedule;
window.clearAtivos = clearAtivos;
