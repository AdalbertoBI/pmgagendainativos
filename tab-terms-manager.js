/**
 * Sistema de Gerenciamento de Termos por Aba
 * Criado para controlar aceite de termos específicos de cada funcionalidade
 */

class TabTermsManager {
    constructor() {
        this.termsData = {
            'inativos': {
                title: '📋 Termos de Uso - Gestão de Inativos',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - GESTÃO DE INATIVOS:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>📊 Perda ou corrupção de dados de clientes inativos</li>
                        <li>📱 Falhas na identificação automática de status</li>
                        <li>🔄 Problemas na reativação de clientes</li>
                        <li>📈 Decisões comerciais baseadas nos relatórios</li>
                        <li>💼 Impactos financeiros decorrentes do uso</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Use apenas para gestão interna da empresa</li>
                        <li>🔐 Mantenha confidencialidade dos dados</li>
                        <li>⏰ Verifique regularmente a precisão das informações</li>
                        <li>🎯 Não tome decisões baseadas apenas nesta ferramenta</li>
                    </ul>
                `,
                description: 'Sistema de identificação e gestão de clientes inativos'
            },
            'ativos': {
                title: '📋 Termos de Uso - Gestão de Ativos',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - GESTÃO DE ATIVOS:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>📊 Erros na classificação de clientes ativos</li>
                        <li>💰 Decisões comerciais baseadas nos dados</li>
                        <li>📈 Projeções ou análises de performance</li>
                        <li>🔄 Falhas na sincronização de dados</li>
                        <li>⚡ Interrupções no serviço de monitoramento</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Ferramenta de apoio, não substitui análise humana</li>
                        <li>🔐 Proteja informações sensíveis dos clientes</li>
                        <li>⏰ Atualize dados regularmente</li>
                        <li>🎯 Combine com outras ferramentas de gestão</li>
                    </ul>
                `,
                description: 'Sistema de monitoramento e gestão de clientes ativos'
            },
            'agenda': {
                title: '📋 Termos de Uso - Sistema de Agenda',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - AGENDA:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>📅 Conflitos de horários ou compromissos perdidos</li>
                        <li>🔔 Falhas em notificações ou lembretes</li>
                        <li>📱 Sincronização com outros calendários</li>
                        <li>💼 Impactos em reuniões ou compromissos comerciais</li>
                        <li>⏰ Problemas de fuso horário ou horário de verão</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Sempre confirme compromissos por outros meios</li>
                        <li>🔐 Não armazene informações extremamente sensíveis</li>
                        <li>⏰ Verifique horários antes de compromissos importantes</li>
                        <li>🎯 Use como ferramenta auxiliar de organização</li>
                    </ul>
                `,
                description: 'Sistema de agendamento e gestão de compromissos'
            },
            'mapa': {
                title: '📋 Termos de Uso - Sistema de Mapas',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - MAPAS:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>🗺️ Imprecisões na localização de clientes</li>
                        <li>🚗 Rotas incorretas ou tempo de deslocamento</li>
                        <li>📍 Dados de geolocalização desatualizados</li>
                        <li>⛽ Custos de combustível ou deslocamento</li>
                        <li>🛣️ Problemas de trânsito ou acessibilidade</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Sempre confirme endereços antes de visitas</li>
                        <li>🔐 Respeite privacidade de localização dos clientes</li>
                        <li>⏰ Use GPS adicional para navegação crítica</li>
                        <li>🎯 Ferramenta de apoio para planejamento de rotas</li>
                    </ul>
                `,
                description: 'Sistema de mapeamento e geolocalização de clientes'
            },
            'catalogo': {
                title: '📋 Termos de Uso - Sistema de Catálogo',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - CATÁLOGO:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>💰 Preços desatualizados ou incorretos</li>
                        <li>📦 Disponibilidade de produtos em estoque</li>
                        <li>🖼️ Qualidade ou precisão das imagens</li>
                        <li>📋 Descrições técnicas ou especificações</li>
                        <li>💼 Decisões comerciais baseadas no catálogo</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Sempre confirme preços antes de vendas</li>
                        <li>🔐 Proteja informações comerciais sensíveis</li>
                        <li>⏰ Atualize dados regularmente</li>
                        <li>🎯 Use como ferramenta de apresentação comercial</li>
                    </ul>
                `,
                description: 'Sistema de catálogo de produtos e serviços'
            },
            'prospeccao': {
                title: '📋 Termos de Uso - Sistema de Prospecção',
                content: `
                    <p><strong>⚖️ ISENÇÃO DE RESPONSABILIDADE - PROSPECÇÃO:</strong></p>
                    <ul>
                        <li>🚫 O desenvolvedor <strong>NÃO se responsabiliza</strong> por:</li>
                        <li>📱 Bloqueios em redes sociais ou plataformas</li>
                        <li>🔒 Violações de privacidade ou LGPD</li>
                        <li>📊 Qualidade ou precisão dos dados coletados</li>
                        <li>💼 Resultados comerciais da prospecção</li>
                        <li>⚖️ Questões legais relacionadas ao uso dos dados</li>
                    </ul>
                    
                    <p><strong>✅ CONDIÇÕES ESPECÍFICAS:</strong></p>
                    <ul>
                        <li>📋 Respeite termos de uso das redes sociais</li>
                        <li>🔐 Cumpra LGPD e regulamentações de privacidade</li>
                        <li>⏰ Use com moderação para evitar bloqueios</li>
                        <li>🎯 Obtenha consentimento antes de contatar prospects</li>
                    </ul>
                `,
                description: 'Sistema de prospecção e análise de redes sociais'
            }
        };
        
        this.currentModal = null;
        this.init();
    }

    init() {
        this.setupModalEvents();
        this.checkAllTabsTerms();
    }

    // Configurar eventos do modal existente
    setupModalEvents() {
        const closeBtn = document.querySelector('.close-tab-terms');
        const acceptBtn = document.querySelector('.tab-terms-footer .btn');
        const overlay = document.getElementById('tabTermsOverlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => this.acceptTerms());
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideModal();
            }
        });

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (this.currentModal && e.target === overlay) {
                    this.hideModal();
                }
            });
        }
    }

    // Verificar termos de todas as abas e criar indicadores
    checkAllTabsTerms() {
        Object.keys(this.termsData).forEach(tabId => {
            this.createTabTermsIndicator(tabId);
        });
    }

    // Criar indicador de termos no topo de cada aba
    createTabTermsIndicator(tabId) {
        const tabContent = document.getElementById(`${tabId}-content`);
        if (!tabContent) return;

        // Verificar se já existe indicador
        const existingIndicator = document.getElementById(`tabTermsIndicator-${tabId}`);
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const isAccepted = this.isTermsAccepted(tabId);
        const indicator = this.createIndicatorHTML(tabId, isAccepted);
        
        // Inserir no topo da aba
        tabContent.insertAdjacentHTML('afterbegin', indicator);
        
        // Controlar visibilidade do conteúdo
        this.controlTabContentVisibility(tabId, isAccepted);
        
        // Adicionar event listener
        const infoIcon = tabContent.querySelector(`#tabTermsIcon-${tabId}`);
        if (infoIcon) {
            infoIcon.addEventListener('click', () => this.showTerms(tabId));
        }
    }

    // Controlar visibilidade do conteúdo da aba
    controlTabContentVisibility(tabId, isAccepted) {
        const tabContent = document.getElementById(`${tabId}-content`);
        if (!tabContent) return;

        // Encontrar todos os elementos que não são o indicador de termos
        const children = Array.from(tabContent.children);
        const indicator = document.getElementById(`tabTermsIndicator-${tabId}`);
        
        children.forEach(child => {
            if (child !== indicator) {
                if (isAccepted) {
                    child.style.display = '';
                    child.style.opacity = '1';
                    child.style.pointerEvents = 'auto';
                } else {
                    child.style.display = 'none';
                }
            }
        });

        // Se não aceitos, mostrar mensagem adicional
        if (!isAccepted) {
            const existingMessage = tabContent.querySelector('.terms-blocking-message');
            if (!existingMessage) {
                const blockingMessage = document.createElement('div');
                blockingMessage.className = 'terms-blocking-message';
                blockingMessage.style.cssText = `
                    text-align: center; 
                    padding: 40px 20px; 
                    color: #666; 
                    font-size: 1.1em;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin: 20px;
                    border: 2px dashed #dee2e6;
                `;
                blockingMessage.innerHTML = `
                    <div style="font-size: 3em; margin-bottom: 15px;">🔒</div>
                    <h3 style="color: #667eea; margin-bottom: 10px;">Conteúdo Protegido</h3>
                    <p>Para acessar esta funcionalidade, você deve aceitar os termos de uso específicos.</p>
                    <p><strong>Clique no botão "ℹ️ Aceitar Termos de Uso" acima para continuar.</strong></p>
                `;
                tabContent.appendChild(blockingMessage);
            }
        } else {
            // Remover mensagem de bloqueio se existe
            const existingMessage = tabContent.querySelector('.terms-blocking-message');
            if (existingMessage) {
                existingMessage.remove();
            }
        }
    }

    // Criar HTML do indicador
    createIndicatorHTML(tabId, isAccepted) {
        const data = this.termsData[tabId];
        const status = isAccepted ? 
            '<span class="terms-status approved">ℹ️ Usuário Aprovado!</span>' : 
            '<span class="terms-status pending">ℹ️ Aceitar Termos de Uso</span>';
        
        return `
            <div class="tab-terms-indicator" id="tabTermsIndicator-${tabId}">
                <div class="terms-indicator-content">
                    <span class="terms-description">${data.description}</span>
                    <button class="terms-info-icon ${isAccepted ? 'approved' : 'pending'}" 
                            id="tabTermsIcon-${tabId}" 
                            title="Clique para ver os termos de uso">
                        ${status}
                    </button>
                </div>
            </div>
        `;
    }

    // Verificar se termos foram aceitos
    isTermsAccepted(tabId) {
        const accepted = localStorage.getItem(`terms_accepted_${tabId}`);
        return accepted === 'true';
    }

    // Mostrar modal de termos
    showTerms(tabId) {
        console.log(`🔍 showTerms chamado para aba: ${tabId}`);
        this.currentModal = tabId;
        const data = this.termsData[tabId];
        
        const titleElement = document.getElementById('tabTermsTitle');
        const contentElement = document.getElementById('tabTermsContent');
        const overlayElement = document.getElementById('tabTermsOverlay');
        
        console.log('📋 Elementos encontrados:', {
            title: !!titleElement,
            content: !!contentElement,
            overlay: !!overlayElement
        });
        
        if (titleElement) titleElement.textContent = data.title;
        if (contentElement) contentElement.innerHTML = data.content;
        if (overlayElement) {
            overlayElement.classList.add('show');
            console.log('✅ Modal exibido com sucesso');
        } else {
            console.error('❌ Elemento overlay não encontrado');
        }
        
        console.log(`Exibindo termos para aba: ${tabId}`);
    }

    // Esconder modal
    hideModal() {
        if (this.currentModal) {
            document.getElementById('tabTermsOverlay').classList.remove('show');
            this.currentModal = null;
        }
    }

    // Aceitar termos
    acceptTerms() {
        if (this.currentModal) {
            // Salvar aceite no localStorage
            localStorage.setItem(`terms_accepted_${this.currentModal}`, 'true');
            localStorage.setItem(`terms_accepted_date_${this.currentModal}`, new Date().toISOString());
            
            // Atualizar indicador visual
            this.updateTabIndicator(this.currentModal, true);
            
            console.log(`Termos aceitos para aba: ${this.currentModal}`);
            this.hideModal();
        }
    }

    // Atualizar indicador visual da aba
    updateTabIndicator(tabId, isAccepted) {
        const indicator = document.getElementById(`tabTermsIndicator-${tabId}`);
        const icon = document.getElementById(`tabTermsIcon-${tabId}`);
        
        if (indicator && icon) {
            if (isAccepted) {
                icon.classList.remove('pending');
                icon.classList.add('approved');
                icon.innerHTML = '<span class="terms-status approved">ℹ️ Usuário Aprovado!</span>';
                icon.title = 'Termos aceitos - Clique para revisar';
                
                // Liberar acesso ao conteúdo
                this.controlTabContentVisibility(tabId, true);
            } else {
                icon.classList.remove('approved');
                icon.classList.add('pending');
                icon.innerHTML = '<span class="terms-status pending">ℹ️ Aceitar Termos de Uso</span>';
                icon.title = 'Clique para aceitar os termos de uso';
                
                // Bloquear acesso ao conteúdo
                this.controlTabContentVisibility(tabId, false);
            }
        }
    }

    // Verificar se usuário pode usar a aba
    canUseTab(tabId) {
        return this.isTermsAccepted(tabId);
    }

    // Solicitar aceite se necessário
    requireTermsAcceptance(tabId) {
        if (!this.canUseTab(tabId)) {
            this.showTerms(tabId);
            return false;
        }
        return true;
    }
}

// Inicializar sistema quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado - inicializando TabTermsManager');
    
    // Aguardar um pouco para garantir que todos os elementos estejam prontos
    setTimeout(() => {
        window.tabTermsManager = new TabTermsManager();
        console.log('✅ TabTermsManager inicializado');
    }, 500);
});

// Backup: inicializar quando janela carregar completamente
window.addEventListener('load', () => {
    if (!window.tabTermsManager) {
        console.log('🔄 Backup: inicializando TabTermsManager no window.load');
        window.tabTermsManager = new TabTermsManager();
    }
});
