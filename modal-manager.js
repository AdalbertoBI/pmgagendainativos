// modal-manager.js - Gerenciamento completo de modais
class ModalManager {
    constructor() {
        this.version = '1.0.0';
        this.activeModals = new Map();
        this.modalStack = [];
        this.modalConfigs = new Map();
        this.eventListeners = new Map();
        
        // Configurações padrão para modais
        this.defaultConfig = {
            backdrop: true,
            keyboard: true,
            focus: true,
            closable: true,
            destroyOnClose: false,
            animation: true,
            size: 'medium'
        };
        
        // Templates de modais
        this.templates = {
            basic: this.createBasicModalTemplate(),
            form: this.createFormModalTemplate(),
            confirmation: this.createConfirmationModalTemplate(),
            loading: this.createLoadingModalTemplate()
        };
        
        this.initializeModalSystem();
        console.log('🔧 ModalManager inicializado v' + this.version);
    }
    
    // Inicializar sistema de modais
    initializeModalSystem() {
        this.createModalContainer();
        this.setupGlobalEventListeners();
        this.setupKeyboardHandlers();
        this.preloadModalStyles();
    }
    
    // Criar container para modais
    createModalContainer() {
        if (document.getElementById('modal-container')) return;
        
        const container = document.createElement('div');
        container.id = 'modal-container';
        container.className = 'modal-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // Configurar event listeners globais
    setupGlobalEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                const modalId = e.target.closest('.modal-wrapper')?.dataset.modalId;
                if (modalId) {
                    const config = this.modalConfigs.get(modalId);
                    if (config && config.backdrop !== false) {
                        this.hide(modalId);
                    }
                }
            }
            
            if (e.target.classList.contains('modal-close') || 
                e.target.closest('.modal-close')) {
                const modalId = e.target.closest('.modal-wrapper')?.dataset.modalId;
                if (modalId) {
                    this.hide(modalId);
                }
            }
        });
    }
    
    // Configurar handlers de teclado
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                const config = this.modalConfigs.get(topModal);
                if (config && config.keyboard !== false) {
                    this.hide(topModal);
                }
            }
        });
    }
    
    // Pré-carregar estilos CSS
    preloadModalStyles() {
        if (document.getElementById('modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1050;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
                pointer-events: auto;
            }
            
            .modal-wrapper.show {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }
            
            .modal-dialog {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
                margin: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                transform: scale(0.9) translateY(-20px);
                transition: transform 0.3s ease;
                overflow: hidden;
                z-index: 1051;
            }
            
            .modal-wrapper.show .modal-dialog {
                transform: scale(1) translateY(0);
            }
            
            .modal-dialog.size-small { max-width: 400px; }
            .modal-dialog.size-medium { max-width: 600px; }
            .modal-dialog.size-large { max-width: 800px; }
            .modal-dialog.size-xlarge { max-width: 1200px; }
            .modal-dialog.size-fullscreen { max-width: 95vw; max-height: 95vh; }
            
            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #f8f9fa;
            }
            
            .modal-title {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
                color: #333;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 4px 8px;
                color: #666;
                transition: color 0.2s ease;
                border-radius: 4px;
            }
            
            .modal-close:hover {
                color: #000;
                background: rgba(0, 0, 0, 0.1);
            }
            
            .modal-body {
                padding: 24px;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                background: #f8f9fa;
            }
            
            .modal-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
            }
            
            .modal-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .modal-form .form-group {
                margin-bottom: 20px;
            }
            
            .modal-form label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #333;
            }
            
            .modal-form input,
            .modal-form select,
            .modal-form textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.2s ease;
            }
            
            .modal-form input:focus,
            .modal-form select:focus,
            .modal-form textarea:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .btn-modal {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                min-width: 80px;
            }
            
            .btn-modal.btn-primary {
                background: #007bff;
                color: white;
            }
            
            .btn-modal.btn-primary:hover {
                background: #0056b3;
            }
            
            .btn-modal.btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-modal.btn-secondary:hover {
                background: #545b62;
            }
            
            .btn-modal.btn-danger {
                background: #dc3545;
                color: white;
            }
            
            .btn-modal.btn-danger:hover {
                background: #c82333;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Templates de modais
    createBasicModalTemplate() {
        return `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog {{size}}">
                <div class="modal-header">
                    <h5 class="modal-title">{{title}}</h5>
                    {{#closable}}
                    <button class="modal-close" type="button">&times;</button>
                    {{/closable}}
                </div>
                <div class="modal-body">
                    {{content}}
                </div>
                {{#footer}}
                <div class="modal-footer">
                    {{footer}}
                </div>
                {{/footer}}
            </div>
        `;
    }
    
    createFormModalTemplate() {
        return `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog {{size}}">
                <form class="modal-form" id="{{formId}}">
                    <div class="modal-header">
                        <h5 class="modal-title">{{title}}</h5>
                        {{#closable}}
                        <button class="modal-close" type="button">&times;</button>
                        {{/closable}}
                    </div>
                    <div class="modal-body">
                        {{fields}}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-modal btn-secondary modal-close">Cancelar</button>
                        <button type="submit" class="btn-modal btn-primary">{{submitText}}</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    createConfirmationModalTemplate() {
        return `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog size-small">
                <div class="modal-header">
                    <h5 class="modal-title">{{title}}</h5>
                </div>
                <div class="modal-body">
                    {{message}}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-modal btn-secondary" data-action="cancel">{{cancelText}}</button>
                    <button type="button" class="btn-modal {{confirmClass}}" data-action="confirm">{{confirmText}}</button>
                </div>
            </div>
        `;
    }
    
    createLoadingModalTemplate() {
        return `
            <div class="modal-backdrop"></div>
            <div class="modal-dialog size-small">
                <div class="modal-loading">
                    <div class="modal-spinner"></div>
                    <span style="margin-left: 16px;">{{message}}</span>
                </div>
            </div>
        `;
    }
    
    // Mostrar modal
    show(id, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const config = { ...this.defaultConfig, ...options };
                this.modalConfigs.set(id, config);
                
                // Criar ou atualizar modal
                const modalElement = this.createModal(id, config);
                
                // Adicionar à pilha
                this.modalStack.push(id);
                this.activeModals.set(id, { element: modalElement, resolve, reject });
                
                // Aplicar backdrop para modals anteriores
                this.updateBackdropStack();
                
                // Mostrar modal com animação
                requestAnimationFrame(() => {
                    modalElement.classList.add('show');
                    
                    // Focar primeiro elemento focável se configurado
                    if (config.focus) {
                        const focusable = modalElement.querySelector('input, select, textarea, button');
                        if (focusable) {
                            focusable.focus();
                        }
                    }
                });
                
                // Callback de abertura
                if (config.onShow) {
                    config.onShow(modalElement);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Ocultar modal
    hide(id, result = null) {
        const modal = this.activeModals.get(id);
        if (!modal) return;
        
        const config = this.modalConfigs.get(id);
        
        // Callback de fechamento
        if (config && config.onHide) {
            config.onHide(modal.element, result);
        }
        
        // Animar saída
        modal.element.classList.remove('show');
        
        setTimeout(() => {
            // Remover da pilha
            const stackIndex = this.modalStack.indexOf(id);
            if (stackIndex > -1) {
                this.modalStack.splice(stackIndex, 1);
            }
            
            // Remover elemento
            if (modal.element.parentNode) {
                modal.element.parentNode.removeChild(modal.element);
            }
            
            // Limpar registros
            this.activeModals.delete(id);
            if (config && config.destroyOnClose) {
                this.modalConfigs.delete(id);
            }
            
            // Atualizar backdrop
            this.updateBackdropStack();
            
            // Resolver promise
            modal.resolve(result);
            
        }, 300); // Tempo da animação
    }
    
    // Criar elemento do modal
    createModal(id, config) {
        // Remover modal existente se houver
        const existing = document.querySelector(`[data-modal-id="${id}"]`);
        if (existing) {
            existing.remove();
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-wrapper';
        wrapper.dataset.modalId = id;
        
        // Escolher template baseado no tipo
        const templateName = config.template || 'basic';
        let template = this.templates[templateName];
        
        if (!template) {
            template = this.templates.basic;
        }
        
        // Renderizar template
        const rendered = this.renderTemplate(template, config);
        wrapper.innerHTML = rendered;
        
        // Adicionar event listeners específicos
        this.setupModalEventListeners(wrapper, id, config);
        
        // Adicionar ao container
        const container = document.getElementById('modal-container');
        container.appendChild(wrapper);
        
        return wrapper;
    }
    
    // Renderizar template simples
    renderTemplate(template, data) {
        let rendered = template;
        
        // Substituições simples
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, data[key] || '');
        });
        
        // Condicionais simples
        rendered = rendered.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, condition, content) => {
            return data[condition] ? content : '';
        });
        
        // Aplicar classe de tamanho
        rendered = rendered.replace('{{size}}', `size-${data.size || 'medium'}`);
        
        return rendered;
    }
    
    // Configurar event listeners específicos do modal
    setupModalEventListeners(wrapper, id, config) {
        // Event listeners para botões de ação
        const actionButtons = wrapper.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = button.dataset.action;
                
                if (action === 'confirm') {
                    this.hide(id, true);
                } else if (action === 'cancel') {
                    this.hide(id, false);
                } else if (config.actions && config.actions[action]) {
                    config.actions[action](e, wrapper);
                }
            });
        });
        
        // Event listener para formulários
        const form = wrapper.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                if (config.onSubmit) {
                    const result = config.onSubmit(data, form);
                    if (result !== false) {
                        this.hide(id, data);
                    }
                } else {
                    this.hide(id, data);
                }
            });
        }
        
        // Event listeners customizados
        if (config.listeners) {
            Object.entries(config.listeners).forEach(([selector, handler]) => {
                const elements = wrapper.querySelectorAll(selector);
                elements.forEach(element => {
                    const [event, callback] = Object.entries(handler)[0];
                    element.addEventListener(event, (e) => callback(e, wrapper));
                });
            });
        }
    }
    
    // Atualizar pilha de backdrop
    updateBackdropStack() {
        const modals = document.querySelectorAll('.modal-wrapper');
        modals.forEach((modal, index) => {
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.style.zIndex = 1050 + (index * 10);
            }
            modal.style.zIndex = 1051 + (index * 10);
        });
    }
    
    // Métodos de conveniência
    
    // Modal de confirmação
    confirm(message, title = 'Confirmação', options = {}) {
        const id = 'confirm-' + Date.now();
        return this.show(id, {
            ...options,
            template: 'confirmation',
            title: title,
            message: message,
            cancelText: options.cancelText || 'Cancelar',
            confirmText: options.confirmText || 'Confirmar',
            confirmClass: options.danger ? 'btn-danger' : 'btn-primary'
        });
    }
    
    // Modal de alerta
    alert(message, title = 'Atenção', options = {}) {
        const id = 'alert-' + Date.now();
        return this.show(id, {
            ...options,
            template: 'confirmation',
            title: title,
            message: message,
            cancelText: '',
            confirmText: options.okText || 'OK',
            confirmClass: 'btn-primary'
        });
    }
    
    // Modal de loading
    loading(message = 'Carregando...', options = {}) {
        const id = 'loading-' + Date.now();
        return this.show(id, {
            ...options,
            template: 'loading',
            message: message,
            backdrop: false,
            keyboard: false,
            closable: false
        });
    }
    
    // Modal de formulário
    form(fields, title = 'Formulário', options = {}) {
        const id = 'form-' + Date.now();
        const formId = 'form-' + Date.now();
        
        const fieldsHtml = fields.map(field => {
            const required = field.required ? 'required' : '';
            const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
            
            switch (field.type) {
                case 'select':
                    const optionsHtml = field.options.map(opt => 
                        `<option value="${opt.value}">${opt.label}</option>`
                    ).join('');
                    return `
                        <div class="form-group">
                            <label for="${field.name}">${field.label}</label>
                            <select name="${field.name}" id="${field.name}" ${required}>
                                ${optionsHtml}
                            </select>
                        </div>
                    `;
                case 'textarea':
                    return `
                        <div class="form-group">
                            <label for="${field.name}">${field.label}</label>
                            <textarea name="${field.name}" id="${field.name}" ${required} ${placeholder} rows="3"></textarea>
                        </div>
                    `;
                default:
                    return `
                        <div class="form-group">
                            <label for="${field.name}">${field.label}</label>
                            <input type="${field.type || 'text'}" name="${field.name}" id="${field.name}" ${required} ${placeholder}>
                        </div>
                    `;
            }
        }).join('');
        
        return this.show(id, {
            ...options,
            template: 'form',
            title: title,
            formId: formId,
            fields: fieldsHtml,
            submitText: options.submitText || 'Salvar'
        });
    }
    
    // Modal personalizado para detalhes do cliente
    clientDetails(client, options = {}) {
        const id = 'client-details-' + Date.now();
        
        const content = `
            <div class="client-details">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h6>Informações Básicas</h6>
                        <p><strong>Nome:</strong> ${client['Nome Fantasia'] || 'N/A'}</p>
                        <p><strong>Contato:</strong> ${client['Contato'] || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${client['Celular'] || 'N/A'}</p>
                        <p><strong>Status:</strong> ${client['Status'] || 'N/A'}</p>
                        <p><strong>Segmento:</strong> ${client['Segmento'] || 'N/A'}</p>
                    </div>
                    <div>
                        <h6>Outros Dados</h6>
                        <p><strong>CNPJ/CPF:</strong> ${client['CNPJ / CPF'] || 'N/A'}</p>
                        <p><strong>Endereço:</strong> ${client['Endereço'] || 'N/A'}</p>
                        ${client.dataImportacao ? `<p><strong>Importado:</strong> ${new Date(client.dataImportacao).toLocaleString()}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        const footer = `
            <button type="button" class="btn-modal btn-secondary modal-close">Fechar</button>
            <button type="button" class="btn-modal btn-primary" data-action="edit">Editar</button>
            <button type="button" class="btn-modal btn-primary" data-action="schedule">Agendar</button>
        `;
        
        return this.show(id, {
            ...options,
            title: `Detalhes - ${client['Nome Fantasia']}`,
            content: content,
            footer: footer,
            size: 'large',
            actions: {
                edit: (e, modal) => {
                    this.hide(id);
                    if (options.onEdit) {
                        options.onEdit(client);
                    }
                },
                schedule: (e, modal) => {
                    this.hide(id);
                    if (options.onSchedule) {
                        options.onSchedule(client);
                    }
                }
            }
        });
    }
    
    // Fechar todos os modais
    hideAll() {
        const modalIds = [...this.modalStack];
        modalIds.forEach(id => this.hide(id));
    }
    
    // Verificar se há modais abertos
    hasOpenModals() {
        return this.modalStack.length > 0;
    }
    
    // Obter modal ativo
    getActiveModal() {
        if (this.modalStack.length === 0) return null;
        const topModalId = this.modalStack[this.modalStack.length - 1];
        return this.activeModals.get(topModalId);
    }
    
    // Destruir modal manager
    destroy() {
        this.hideAll();
        const container = document.getElementById('modal-container');
        if (container) {
            container.remove();
        }
        
        const styles = document.getElementById('modal-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Instância global
window.modalManager = new ModalManager();
console.log('🔧 modal-manager.js carregado - Gerenciamento completo de modais');
