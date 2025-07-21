// agenda-manager.js - Gerenciamento completo de agendamentos
class AgendaManager {
    constructor() {
        this.version = '1.0.0';
        this.agendamentos = new Map();
        this.recorrencias = new Map();
        this.notificacoes = new Map();
        this.filtros = {
            dataInicio: null,
            dataFim: null,
            status: 'todos',
            cliente: '',
            tipo: 'todos'
        };
        
        // Configurações
        this.config = {
            horarioTrabalho: {
                inicio: '08:00',
                fim: '18:00'
            },
            intervalos: {
                padrao: 30, // minutos
                almoco: { inicio: '12:00', fim: '13:00' }
            },
            diasUteis: [1, 2, 3, 4, 5], // Segunda a sexta
            notificacaoAntecipada: 30, // minutos
            maxAgendamentosFuturos: 365 // dias
        };
        
        // Status possíveis
        this.status = {
            agendado: { label: 'Agendado', color: '#007bff', icon: '📅' },
            confirmado: { label: 'Confirmado', color: '#28a745', icon: '✅' },
            reagendado: { label: 'Reagendado', color: '#ffc107', icon: '🔄' },
            cancelado: { label: 'Cancelado', color: '#dc3545', icon: '❌' },
            concluido: { label: 'Concluído', color: '#6c757d', icon: '✔️' },
            em_andamento: { label: 'Em Andamento', color: '#17a2b8', icon: '⏳' },
            nao_compareceu: { label: 'Não Compareceu', color: '#fd7e14', icon: '👻' }
        };
        
        // Tipos de agendamento
        this.tipos = {
            visita: { label: 'Visita Comercial', duracao: 60, color: '#007bff' },
            reuniao: { label: 'Reunião', duracao: 45, color: '#28a745' },
            ligacao: { label: 'Ligação', duracao: 15, color: '#ffc107' },
            apresentacao: { label: 'Apresentação', duracao: 90, color: '#6f42c1' },
            followup: { label: 'Follow-up', duracao: 30, color: '#fd7e14' },
            outros: { label: 'Outros', duracao: 30, color: '#6c757d' }
        };
        
        this.initializeAgenda();
        console.log('📅 AgendaManager inicializado v' + this.version);
    }
    
    // Inicializar sistema de agenda
    async initializeAgenda() {
        try {
            await this.carregarAgendamentos();
            this.setupNotificationSystem();
            this.setupAutoSave();
            this.setupRecurrenceHandling();
            console.log('✅ Sistema de agenda inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar agenda:', error);
        }
    }
    
    // Carregar agendamentos salvos
    async carregarAgendamentos() {
        try {
            if (window.dbManager) {
                const saved = await window.dbManager.loadData('agendamentos');
                if (saved && Array.isArray(saved)) {
                    this.agendamentos.clear();
                    saved.forEach(agendamento => {
                        this.agendamentos.set(agendamento.id, {
                            ...agendamento,
                            dataHora: new Date(agendamento.dataHora),
                            criadoEm: new Date(agendamento.criadoEm),
                            atualizadoEm: agendamento.atualizadoEm ? new Date(agendamento.atualizadoEm) : null
                        });
                    });
                    console.log(`📅 ${this.agendamentos.size} agendamentos carregados`);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            this.agendamentos = new Map();
        }
    }
    
    // Salvar agendamentos
    async salvarAgendamentos() {
        try {
            if (window.dbManager) {
                const agendamentosArray = Array.from(this.agendamentos.values());
                await window.dbManager.saveData('agendamentos', agendamentosArray);
                console.log('💾 Agendamentos salvos');
            }
        } catch (error) {
            console.error('Erro ao salvar agendamentos:', error);
        }
    }
    
    // Criar novo agendamento
    async criarAgendamento(dados) {
        try {
            // Validar dados
            const validacao = this.validarAgendamento(dados);
            if (!validacao.valido) {
                throw new Error(validacao.erro);
            }
            
            // Verificar conflitos
            const conflito = this.verificarConflito(dados.dataHora, dados.duracao, dados.id);
            if (conflito) {
                throw new Error(`Conflito detectado: ${conflito.titulo} às ${this.formatarHora(conflito.dataHora)}`);
            }
            
            // Criar agendamento
            const agendamento = {
                id: dados.id || this.gerarId(),
                clienteId: dados.clienteId,
                clienteNome: dados.clienteNome,
                titulo: dados.titulo,
                descricao: dados.descricao || '',
                dataHora: new Date(dados.dataHora),
                duracao: dados.duracao || this.tipos[dados.tipo]?.duracao || 30,
                tipo: dados.tipo || 'outros',
                status: dados.status || 'agendado',
                endereco: dados.endereco || '',
                observacoes: dados.observacoes || '',
                lembrete: dados.lembrete || this.config.notificacaoAntecipada,
                recorrencia: dados.recorrencia || null,
                criadoEm: new Date(),
                atualizadoEm: null,
                criadoPor: dados.criadoPor || 'sistema'
            };
            
            // Salvar
            this.agendamentos.set(agendamento.id, agendamento);
            await this.salvarAgendamentos();
            
            // Configurar notificação
            if (agendamento.lembrete > 0) {
                this.configurarNotificacao(agendamento);
            }
            
            // Evento personalizado
            this.dispatchEvent('agendamentoCriado', agendamento);
            
            console.log('✅ Agendamento criado:', agendamento.titulo);
            return agendamento;
            
        } catch (error) {
            console.error('❌ Erro ao criar agendamento:', error);
            throw error;
        }
    }
    
    // Atualizar agendamento existente
    async atualizarAgendamento(id, dados) {
        try {
            const agendamento = this.agendamentos.get(id);
            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }
            
            // Validar dados
            const validacao = this.validarAgendamento({ ...agendamento, ...dados });
            if (!validacao.valido) {
                throw new Error(validacao.erro);
            }
            
            // Verificar conflitos se data/hora foi alterada
            if (dados.dataHora && dados.dataHora !== agendamento.dataHora.toISOString()) {
                const conflito = this.verificarConflito(dados.dataHora, dados.duracao || agendamento.duracao, id);
                if (conflito) {
                    throw new Error(`Conflito detectado: ${conflito.titulo} às ${this.formatarHora(conflito.dataHora)}`);
                }
            }
            
            // Atualizar campos
            const agendamentoAtualizado = {
                ...agendamento,
                ...dados,
                dataHora: dados.dataHora ? new Date(dados.dataHora) : agendamento.dataHora,
                atualizadoEm: new Date()
            };
            
            // Salvar
            this.agendamentos.set(id, agendamentoAtualizado);
            await this.salvarAgendamentos();
            
            // Atualizar notificação
            this.cancelarNotificacao(id);
            if (agendamentoAtualizado.lembrete > 0 && agendamentoAtualizado.status === 'agendado') {
                this.configurarNotificacao(agendamentoAtualizado);
            }
            
            // Evento personalizado
            this.dispatchEvent('agendamentoAtualizado', agendamentoAtualizado);
            
            console.log('✅ Agendamento atualizado:', agendamentoAtualizado.titulo);
            return agendamentoAtualizado;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar agendamento:', error);
            throw error;
        }
    }
    
    // Cancelar agendamento
    async cancelarAgendamento(id, motivo = '') {
        try {
            const agendamento = this.agendamentos.get(id);
            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }
            
            agendamento.status = 'cancelado';
            agendamento.observacoes = motivo ? `${agendamento.observacoes}\nCancelado: ${motivo}` : agendamento.observacoes;
            agendamento.atualizadoEm = new Date();
            
            this.agendamentos.set(id, agendamento);
            await this.salvarAgendamentos();
            
            // Cancelar notificação
            this.cancelarNotificacao(id);
            
            // Evento personalizado
            this.dispatchEvent('agendamentoCancelado', agendamento);
            
            console.log('✅ Agendamento cancelado:', agendamento.titulo);
            return agendamento;
            
        } catch (error) {
            console.error('❌ Erro ao cancelar agendamento:', error);
            throw error;
        }
    }
    
    // Reagendar
    async reagendarAgendamento(id, novaDataHora) {
        try {
            const agendamento = this.agendamentos.get(id);
            if (!agendamento) {
                throw new Error('Agendamento não encontrado');
            }
            
            const dataAnterior = new Date(agendamento.dataHora);
            
            await this.atualizarAgendamento(id, {
                dataHora: novaDataHora,
                status: 'reagendado',
                observacoes: `${agendamento.observacoes}\nReagendado de ${this.formatarDataHora(dataAnterior)}`
            });
            
            const agendamentoAtualizado = this.agendamentos.get(id);
            
            // Evento personalizado
            this.dispatchEvent('agendamentoReagendado', agendamentoAtualizado);
            
            console.log('✅ Agendamento reagendado:', agendamentoAtualizado.titulo);
            return agendamentoAtualizado;
            
        } catch (error) {
            console.error('❌ Erro ao reagendar:', error);
            throw error;
        }
    }
    
    // Confirmar agendamento
    async confirmarAgendamento(id) {
        return await this.atualizarAgendamento(id, { status: 'confirmado' });
    }
    
    // Concluir agendamento
    async concluirAgendamento(id, observacoes = '') {
        const dados = { status: 'concluido' };
        if (observacoes) {
            const agendamento = this.agendamentos.get(id);
            dados.observacoes = `${agendamento?.observacoes || ''}\nConcluído: ${observacoes}`;
        }
        return await this.atualizarAgendamento(id, dados);
    }
    
    // Marcar como não compareceu
    async marcarNaoCompareceu(id, observacoes = '') {
        const dados = { status: 'nao_compareceu' };
        if (observacoes) {
            const agendamento = this.agendamentos.get(id);
            dados.observacoes = `${agendamento?.observacoes || ''}\nNão compareceu: ${observacoes}`;
        }
        return await this.atualizarAgendamento(id, dados);
    }
    
    // Validar agendamento
    validarAgendamento(dados) {
        const erros = [];
        
        // Campos obrigatórios
        if (!dados.titulo || dados.titulo.trim() === '') {
            erros.push('Título é obrigatório');
        }
        
        if (!dados.clienteId && !dados.clienteNome) {
            erros.push('Cliente é obrigatório');
        }
        
        if (!dados.dataHora) {
            erros.push('Data e hora são obrigatórias');
        }
        
        // Validar data
        const dataAgendamento = new Date(dados.dataHora);
        const agora = new Date();
        const maxData = new Date();
        maxData.setDate(maxData.getDate() + this.config.maxAgendamentosFuturos);
        
        if (dataAgendamento < agora) {
            erros.push('Não é possível agendar no passado');
        }
        
        if (dataAgendamento > maxData) {
            erros.push(`Não é possível agendar além de ${this.config.maxAgendamentosFuturos} dias`);
        }
        
        // Validar horário de trabalho
        if (!this.eHorarioTrabalho(dataAgendamento)) {
            erros.push(`Horário deve ser entre ${this.config.horarioTrabalho.inicio} e ${this.config.horarioTrabalho.fim}`);
        }
        
        // Validar dia útil se configurado
        if (this.config.diasUteis.length > 0 && !this.config.diasUteis.includes(dataAgendamento.getDay())) {
            erros.push('Agendamentos apenas em dias úteis');
        }
        
        return {
            valido: erros.length === 0,
            erro: erros.join(', ')
        };
    }
    
    // Verificar conflito de horários
    verificarConflito(dataHora, duracao, ignorarId = null) {
        const inicioNovo = new Date(dataHora);
        const fimNovo = new Date(inicioNovo.getTime() + duracao * 60000);
        
        for (const agendamento of this.agendamentos.values()) {
            if (agendamento.id === ignorarId) continue;
            if (agendamento.status === 'cancelado') continue;
            
            const inicioExistente = agendamento.dataHora;
            const fimExistente = new Date(inicioExistente.getTime() + agendamento.duracao * 60000);
            
            // Verificar sobreposição
            if (inicioNovo < fimExistente && fimNovo > inicioExistente) {
                return agendamento;
            }
        }
        
        return null;
    }
    
    // Verificar se está em horário de trabalho
    eHorarioTrabalho(data) {
        const hora = data.getHours();
        const minuto = data.getMinutes();
        const tempoMinutos = hora * 60 + minuto;
        
        const [inicioH, inicioM] = this.config.horarioTrabalho.inicio.split(':').map(Number);
        const [fimH, fimM] = this.config.horarioTrabalho.fim.split(':').map(Number);
        
        const inicioMinutos = inicioH * 60 + inicioM;
        const fimMinutos = fimH * 60 + fimM;
        
        return tempoMinutos >= inicioMinutos && tempoMinutos <= fimMinutos;
    }
    
    // Buscar agendamentos
    buscarAgendamentos(filtros = {}) {
        let agendamentos = Array.from(this.agendamentos.values());
        
        // Aplicar filtros
        if (filtros.dataInicio) {
            const dataInicio = new Date(filtros.dataInicio);
            agendamentos = agendamentos.filter(ag => ag.dataHora >= dataInicio);
        }
        
        if (filtros.dataFim) {
            const dataFim = new Date(filtros.dataFim);
            dataFim.setHours(23, 59, 59, 999);
            agendamentos = agendamentos.filter(ag => ag.dataHora <= dataFim);
        }
        
        if (filtros.status && filtros.status !== 'todos') {
            agendamentos = agendamentos.filter(ag => ag.status === filtros.status);
        }
        
        if (filtros.tipo && filtros.tipo !== 'todos') {
            agendamentos = agendamentos.filter(ag => ag.tipo === filtros.tipo);
        }
        
        if (filtros.cliente) {
            const termoCliente = filtros.cliente.toLowerCase();
            agendamentos = agendamentos.filter(ag => 
                ag.clienteNome.toLowerCase().includes(termoCliente) ||
                ag.clienteId.toString().includes(termoCliente)
            );
        }
        
        if (filtros.termo) {
            const termo = filtros.termo.toLowerCase();
            agendamentos = agendamentos.filter(ag =>
                ag.titulo.toLowerCase().includes(termo) ||
                ag.descricao.toLowerCase().includes(termo) ||
                ag.observacoes.toLowerCase().includes(termo)
            );
        }
        
        // Ordenar por data
        agendamentos.sort((a, b) => a.dataHora - b.dataHora);
        
        return agendamentos;
    }
    
    // Obter agendamentos do dia
    obterAgendamentosDia(data = new Date()) {
        const inicioDia = new Date(data);
        inicioDia.setHours(0, 0, 0, 0);
        
        const fimDia = new Date(data);
        fimDia.setHours(23, 59, 59, 999);
        
        return this.buscarAgendamentos({
            dataInicio: inicioDia,
            dataFim: fimDia
        });
    }
    
    // Obter próximos agendamentos
    obterProximosAgendamentos(limite = 5) {
        const agora = new Date();
        return this.buscarAgendamentos({
            dataInicio: agora,
            status: ['agendado', 'confirmado']
        }).slice(0, limite);
    }
    
    // Sistema de notificações
    configurarNotificacao(agendamento) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const tempoNotificacao = agendamento.dataHora.getTime() - (agendamento.lembrete * 60000);
            const agora = Date.now();
            
            if (tempoNotificacao > agora) {
                const timeout = setTimeout(() => {
                    this.mostrarNotificacao(agendamento);
                }, tempoNotificacao - agora);
                
                this.notificacoes.set(agendamento.id, timeout);
            }
        }
    }
    
    // Mostrar notificação
    mostrarNotificacao(agendamento) {
        const notification = new Notification(`Lembrete: ${agendamento.titulo}`, {
            body: `${agendamento.clienteNome} às ${this.formatarHora(agendamento.dataHora)}`,
            icon: '/icon-192x192.png',
            tag: agendamento.id,
            requireInteraction: true
        });
        
        notification.onclick = () => {
            window.focus();
            this.dispatchEvent('notificacaoClicada', agendamento);
            notification.close();
        };
        
        // Auto-fechar após 10 segundos
        setTimeout(() => notification.close(), 10000);
    }
    
    // Cancelar notificação
    cancelarNotificacao(id) {
        if (this.notificacoes.has(id)) {
            clearTimeout(this.notificacoes.get(id));
            this.notificacoes.delete(id);
        }
    }
    
    // Solicitar permissão para notificações
    async solicitarPermissaoNotificacao() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }
    
    // Setup do sistema de notificações
    setupNotificationSystem() {
        // Verificar notificações existentes na inicialização
        for (const agendamento of this.agendamentos.values()) {
            if (agendamento.status === 'agendado' && agendamento.lembrete > 0) {
                this.configurarNotificacao(agendamento);
            }
        }
        
        // Solicitar permissão automaticamente
        if ('Notification' in window && Notification.permission === 'default') {
            this.solicitarPermissaoNotificacao();
        }
    }
    
    // Auto-save
    setupAutoSave() {
        let saveTimeout;
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.salvarAgendamentos();
            }, 5000);
        };
        
        // Salvar quando houver mudanças
        this.addEventListener('agendamentoCriado', autoSave);
        this.addEventListener('agendamentoAtualizado', autoSave);
        this.addEventListener('agendamentoCancelado', autoSave);
    }
    
    // Sistema de recorrência (básico)
    setupRecurrenceHandling() {
        // Implementar lógica de recorrência no futuro
        console.log('📅 Sistema de recorrência configurado (básico)');
    }
    
    // Estatísticas
    obterEstatisticas(periodo = 30) {
        const agora = new Date();
        const dataInicio = new Date(agora.getTime() - (periodo * 24 * 60 * 60 * 1000));
        
        const agendamentos = this.buscarAgendamentos({
            dataInicio,
            dataFim: agora
        });
        
        const stats = {
            total: agendamentos.length,
            porStatus: {},
            porTipo: {},
            concluidos: 0,
            cancelados: 0,
            pendentes: 0
        };
        
        agendamentos.forEach(ag => {
            // Por status
            stats.porStatus[ag.status] = (stats.porStatus[ag.status] || 0) + 1;
            
            // Por tipo
            stats.porTipo[ag.tipo] = (stats.porTipo[ag.tipo] || 0) + 1;
            
            // Contadores específicos
            if (ag.status === 'concluido') stats.concluidos++;
            if (ag.status === 'cancelado') stats.cancelados++;
            if (['agendado', 'confirmado'].includes(ag.status)) stats.pendentes++;
        });
        
        return stats;
    }
    
    // Exportar agenda
    exportarAgenda(formato = 'json') {
        const agendamentos = Array.from(this.agendamentos.values());
        
        switch (formato) {
            case 'csv':
                return this.exportarCSV(agendamentos);
            case 'ics':
                return this.exportarICS(agendamentos);
            default:
                return JSON.stringify(agendamentos, null, 2);
        }
    }
    
    // Exportar como CSV
    exportarCSV(agendamentos) {
        const headers = ['ID', 'Título', 'Cliente', 'Data/Hora', 'Duração', 'Tipo', 'Status', 'Observações'];
        const rows = agendamentos.map(ag => [
            ag.id,
            ag.titulo,
            ag.clienteNome,
            this.formatarDataHora(ag.dataHora),
            ag.duracao,
            ag.tipo,
            ag.status,
            ag.observacoes.replace(/\n/g, ' ')
        ]);
        
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
    
    // Exportar como ICS (formato de calendário)
    exportarICS(agendamentos) {
        let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:PMG-Agenda\n';
        
        agendamentos.forEach(ag => {
            const inicio = this.formatarDataICS(ag.dataHora);
            const fim = this.formatarDataICS(new Date(ag.dataHora.getTime() + ag.duracao * 60000));
            
            ics += 'BEGIN:VEVENT\n';
            ics += `UID:${ag.id}@pmg-agenda\n`;
            ics += `DTSTART:${inicio}\n`;
            ics += `DTEND:${fim}\n`;
            ics += `SUMMARY:${ag.titulo}\n`;
            ics += `DESCRIPTION:${ag.descricao}\\n\\nCliente: ${ag.clienteNome}\n`;
            ics += `STATUS:${ag.status.toUpperCase()}\n`;
            ics += 'END:VEVENT\n';
        });
        
        ics += 'END:VCALENDAR';
        return ics;
    }
    
    // Utilitários
    gerarId() {
        return 'agendamento-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }
    
    formatarDataHora(data) {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(data);
    }
    
    formatarHora(data) {
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(data);
    }
    
    formatarDataICS(data) {
        return data.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    
    // Sistema de eventos
    addEventListener(event, callback) {
        if (!this.eventListeners) this.eventListeners = {};
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(callback);
    }
    
    dispatchEvent(event, data) {
        if (this.eventListeners && this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }
    
    // Limpeza
    limparAgendamentosAntigos(diasAtras = 365) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasAtras);
        
        let removidos = 0;
        for (const [id, agendamento] of this.agendamentos.entries()) {
            if (agendamento.dataHora < dataLimite && 
                ['cancelado', 'concluido', 'nao_compareceu'].includes(agendamento.status)) {
                this.agendamentos.delete(id);
                this.cancelarNotificacao(id);
                removidos++;
            }
        }
        
        if (removidos > 0) {
            this.salvarAgendamentos();
            console.log(`🧹 ${removidos} agendamentos antigos removidos`);
        }
        
        return removidos;
    }
}

// Instância global
window.agendaManager = new AgendaManager();
console.log('📅 agenda-manager.js carregado - Gerenciamento completo de agendamentos');
