class ProspeccaoManager {
    constructor() {
        this.imagesMap = {};
        this.catalog = [];
        this.currentProspect = null;
        this.selectedProducts = [];
        this.prospectCount = 0;
        this.offerCount = 0;
        this.offerImageUrl = null; // Armazena a URL da imagem gerada
        this.isOfferImageGenerated = false; // Flag para verificar se a imagem foi gerada
        
        // Preferência de fundo dinâmico para prospecção
        this.dynamicBackground = localStorage.getItem('dynamicBgProsp') === 'true';
        
        // 🖼️ NOVO: Dados da análise de imagem
        this.socialMediaAnalysisData = null;
        
        // Inicialização segura
        this.initSafely();
    }

    async initSafely() {
        try {
            console.log('🚀 Inicializando Prospecção Manager com segurança...');
            await this.init();
        } catch (error) {
            console.error('❌ Erro na inicialização do ProspeccaoManager:', error);
            console.log('🔄 Tentando inicialização básica...');
            
            // Inicialização mínima em caso de erro
            try {
                this.setupEventListeners();
                console.log('✅ Inicialização básica concluída');
            } catch (basicError) {
                console.error('❌ Erro na inicialização básica:', basicError);
            }
        }
    }

    async init() {
        console.log('🚀 Inicializando Prospecção Manager...');
        
        // Carregar imagens e catálogo
        await this.loadImages();
        await this.loadCatalog();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // NOVO: Configurar listener para atualizações do catálogo
        this.setupCatalogSyncListener();
        
        // Carregar estatísticas
        this.loadStats();

        // Sincronizar seletor de faixa de preço com localStorage
        const band = localStorage.getItem('priceBandProsp') || 'retira';
        this.selectedPriceBand = band;
        // Aplicar ao catálogo interno já carregado
        this.applyPriceBandToLocalCatalog(band);
        
        console.log('✅ Prospecção Manager inicializado');
    }

    // NOVO: Configurar listener para sincronização automática do catálogo
    setupCatalogSyncListener() {
        console.log('🔄 Configurando sincronização automática do catálogo...');
        
        // Listener para mudanças no localStorage (quando catálogo é atualizado)
        window.addEventListener('storage', (e) => {
            if (e.key === 'catalogCache' || e.key === 'hasCustomCatalog') {
                console.log('📦 Catálogo atualizado detectado, recarregando...');
                this.reloadCatalogFromUpdate();
            }
        });
        
        // Listener customizado para atualizações internas
        window.addEventListener('catalogUpdated', (e) => {
            console.log('📦 Evento catalogUpdated recebido, recarregando catálogo...');
            this.reloadCatalogFromUpdate();
        });
        
        // Verificar periodicamente se o CatalogManager foi atualizado
        this.catalogSyncInterval = setInterval(() => {
            this.checkCatalogSync();
        }, 5000); // Verificar a cada 5 segundos
        
        // Limpar recursos quando a página for fechada
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        console.log('✅ Sincronização automática configurada');
    }

    // Verificar se o catálogo precisa ser sincronizado
    checkCatalogSync() {
        if (window.catalogManager && window.catalogManager.products) {
            const currentCatalogSize = window.catalogManager.products.length;
            const ourCatalogSize = this.catalog.length;
            
            // Se há uma diferença significativa, recarregar
            if (Math.abs(currentCatalogSize - ourCatalogSize) > 5) {
                console.log(`🔄 Catálogo desatualizado detectado (Atual: ${currentCatalogSize}, Nosso: ${ourCatalogSize})`);
                this.reloadCatalogFromUpdate();
            }
        }
    }

    // Recarregar catálogo quando detectar atualização
    async reloadCatalogFromUpdate() {
        try {
            console.log('🔄 Recarregando catálogo após atualização...');
            const oldSize = this.catalog.length;
            
            // Recarregar catálogo
            await this.loadCatalog();
            
            const newSize = this.catalog.length;
            console.log(`✅ Catálogo atualizado: ${oldSize} → ${newSize} produtos`);
            
            // Mostrar notificação ao usuário (se a prospecção estiver ativa)
            if (document.visibilityState === 'visible') {
                this.showNotification(`📦 Catálogo atualizado: ${newSize} produtos disponíveis`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Erro ao recarregar catálogo:', error);
        }
    }

    // Função para mostrar notificações ao usuário
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Estilos inline para a notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#bee5eb'};
            border-radius: 6px;
            padding: 12px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Função para limpar recursos quando necessário
    cleanup() {
        if (this.catalogSyncInterval) {
            clearInterval(this.catalogSyncInterval);
            this.catalogSyncInterval = null;
            console.log('🧹 Intervalo de sincronização do catálogo limpo');
        }
    }

    async loadImages() {
        try {
            const response = await fetch('imagens.json');
            this.imagesMap = await response.json();
            console.log('✅ Imagens carregadas:', Object.keys(this.imagesMap).length);
        } catch (error) {
            console.error('❌ Erro ao carregar imagens:', error);
            this.imagesMap = {};
        }
    }

    async loadCatalog() {
    try {
        console.log('📦 Carregando catálogo dinâmico...');
        
        // Primeiro tentar integração com CatalogManager
        const catalogIntegrated = await this.integrateCatalogManager();
        if (catalogIntegrated) {
            console.log('✅ Catálogo carregado via CatalogManager');
            // Garantir pelo menos 150 produtos, se possível
            if (this.catalog.length < 150) {
                const additionalProducts = this.createBasicCatalog().slice(0, 150 - this.catalog.length);
                this.catalog = [...this.catalog, ...additionalProducts];
            }
            return;
        }
        
        // Se não conseguiu integrar, usar método tradicional
        console.log('📦 Carregando catálogo do sistema principal...');
        this.catalog = await this.loadProductsFromMainCatalog();
        
       if (this.catalog.length === 0) {
            console.log('⚠️ Nenhum produto encontrado, carregando catálogo básico...');
            this.catalog = this.createBasicCatalog().slice(0, 50); // Limita a 50
        }
        if (this.catalog.length < 50) {
            const additionalProducts = this.createBasicCatalog().slice(0, 50 - this.catalog.length);
            this.catalog = [...this.catalog, ...additionalProducts];
        }
        
        console.log(`✅ Catálogo carregado: ${this.catalog.length} produtos`);
        this.catalog = this.catalog.map(product => ({
            ...product,
            keywords: this.extractKeywordsFromName(product.name),
            searchText: this.createSearchableText(product)
        }));
        
        // Processar keywords automaticamente para todos os produtos
        this.catalog = this.catalog.map(product => ({
            ...product,
            keywords: this.extractKeywordsFromName(product.name),
            searchText: this.createSearchableText(product)
        }));
        
        console.log('🔄 Keywords automáticas geradas para todos os produtos');
    } catch (error) {
        console.error('❌ Erro ao carregar catálogo:', error);
        console.log('🔄 Carregando catálogo básico como fallback final...');
        this.catalog = this.createBasicCatalog().slice(0, 50); // Fallback com 50 produtos
        this.catalog = this.catalog.map(product => ({
            ...product,
            keywords: this.extractKeywordsFromName(product.name),
            searchText: this.createSearchableText(product)
        }));
        console.log(`✅ Catálogo básico carregado: ${this.catalog.length} produtos`);
    }
}
// Método para integrar com o CatalogManager
async integrateCatalogManager() {
    try {
        // Verificar se o CatalogManager existe
        if (window.catalogManager) {
            console.log('🔗 CatalogManager encontrado, integrando...');
            
            // Se o CatalogManager já tem produtos carregados
            if (window.catalogManager.products && window.catalogManager.products.length > 0) {
                this.catalog = window.catalogManager.products.map(product => ({
                    ...product,
                    prices: product.prices || undefined,
                    keywords: this.extractKeywordsFromName(product.name),
                    searchText: this.createSearchableText(product)
                }));
                console.log(`✅ ${this.catalog.length} produtos integrados do CatalogManager`);
                return true;
            }
            
            // Se não tem produtos, tentar inicializar o CatalogManager
            if (typeof window.catalogManager.init === 'function') {
                await window.catalogManager.init();
                if (window.catalogManager.products && window.catalogManager.products.length > 0) {
                    this.catalog = window.catalogManager.products.map(product => ({
                        ...product,
                        prices: product.prices || undefined,
                        keywords: this.extractKeywordsFromName(product.name),
                        searchText: this.createSearchableText(product)
                    }));
                    console.log(`✅ ${this.catalog.length} produtos carregados após inicialização do CatalogManager`);
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Erro na integração com CatalogManager:', error);
        return false;
    }
}

async loadProductsFromMainCatalog() {
    try {
        console.log('🔍 Buscando produtos do sistema principal...');
        
        // Método 1: Verificar se existe o CatalogManager carregado
        if (window.catalogManager && window.catalogManager.products && window.catalogManager.products.length > 0) {
            console.log(`✅ ${window.catalogManager.products.length} produtos encontrados no CatalogManager`);
            return window.catalogManager.products.map(produto => ({
                code: produto.code || produto.id || `AUTO_${Date.now()}_${Math.random()}`,
                name: produto.name || produto.nome || 'Produto sem nome',
                price: this.parsePrice(produto.price || produto.preco || 0),
                prices: produto.prices || undefined,
                category: produto.category || produto.categoria || 'Geral',
                unit: produto.unit || produto.unidade || 'UN',
                image: produto.image || produto.imagem || null,
                description: produto.description || produto.descricao || '',
                brand: produto.brand || produto.marca || ''
            }));
        }

        // Método 2: Acessar produtosPorCategoria (variável global do sistema)
        if (window.produtosPorCategoria && Object.keys(window.produtosPorCategoria).length > 0) {
            const allProducts = [];
            Object.entries(window.produtosPorCategoria).forEach(([categoria, produtos]) => {
                console.log(`📂 Processando categoria: ${categoria} (${produtos.length} produtos)`);
                produtos.forEach(produto => {
                    if (produto && (produto.nome || produto.name)) {
                        allProducts.push({
                            code: produto.codigo || produto.id || `AUTO_${Date.now()}_${Math.random()}`,
                            name: produto.nome || produto.name,
                            price: this.parsePrice(produto.preco || produto.price || produto.valor),
                            prices: produto.prices || undefined,
                            category: categoria || produto.categoria || 'Geral',
                            unit: produto.unidade || produto.unit || 'UN',
                            image: produto.imagem || produto.image || null,
                            description: produto.descricao || produto.description || '',
                            brand: produto.marca || produto.brand || ''
                        });
                    }
                });
            });
            
            if (allProducts.length > 0) {
                console.log(`✅ ${allProducts.length} produtos carregados do sistema principal`);
                return allProducts;
            }
        }

        // Método 3: Tentar localStorage (cache do sistema)
        console.log('🔍 Verificando cache do localStorage...');
        const cacheKeys = [
            'catalogCache', // Do seu CatalogManager
            'produtosPorCategoria',
            'catalogProducts',
            'productData',
            'pmg_produtos',
            'catalog_cache'
        ];
        
        for (const key of cacheKeys) {
            try {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const data = JSON.parse(cached);
                    
                    // Se for o cache do CatalogManager
                    if (key === 'catalogCache' && data.products) {
                        console.log(`✅ ${data.products.length} produtos carregados do cache ${key}`);
                        return data.products;
                    }
                    
                    // Para outros tipos de cache
                    const products = this.extractProductsFromCache(data);
                    if (products.length > 0) {
                        console.log(`✅ ${products.length} produtos carregados do cache ${key}`);
                        return products;
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Erro ao processar cache ${key}:`, err);
            }
        }

        // Método 4: Usar catálogo básico como fallback
        console.log('⚠️ Nenhuma fonte externa encontrada, usando catálogo básico');
        return this.createBasicCatalog();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        // Em caso de erro, sempre retornar catálogo básico
        console.log('🔄 Carregando catálogo básico como fallback...');
        return this.createBasicCatalog();
    }
}

// Extrair produtos de diferentes formatos de cache
extractProductsFromCache(data) {
    const products = [];
    
    try {
        if (Array.isArray(data)) {
            // Array direto de produtos
            data.forEach(item => {
                const product = this.normalizeProduct(item);
                if (product) products.push(product);
            });
        } else if (data && typeof data === 'object') {
            // Objeto com categorias
            Object.values(data).forEach(category => {
                if (Array.isArray(category)) {
                    category.forEach(item => {
                        const product = this.normalizeProduct(item);
                        if (product) products.push(product);
                    });
                }
            });
        }
    } catch (error) {
        console.error('❌ Erro ao extrair produtos do cache:', error);
    }
    
    return products;
}
// Normalizar produto de diferentes fontes
normalizeProduct(item) {
    if (!item) return null;
    
    const name = item.nome || item.name || item.titulo || item.produto;
    if (!name || name.length < 3) return null;
    
    return {
        code: item.codigo || item.id || item.sku || `NORM_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        price: this.parsePrice(item.preco || item.price || item.valor || 0),
        category: item.categoria || item.category || item.tipo || 'Geral',
        unit: item.unidade || item.unit || item.medida || 'UN',
        image: item.imagem || item.image || item.foto || null,
        description: item.descricao || item.description || '',
        brand: item.marca || item.brand || ''
    };
}

// Parser melhorado de preços
parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    
    const cleaned = String(priceStr)
        .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgulas, pontos e hífens
        .replace(/,(\d{2})$/, '.$1') // Converte vírgula decimal
        .replace(/,/g, ''); // Remove vírgulas de milhares
    
    return parseFloat(cleaned) || 0;
}

// Criar texto pesquisável otimizado
createSearchableText(product) {
    const parts = [
        product.name,
        product.category,
        product.brand,
        product.description,
        product.unit,
        ...(product.keywords || [])
    ].filter(part => part && typeof part === 'string' && part.trim()); // Filtra partes válidas, strings não vazias
    return parts
        .map(part => part.trim()) // Remove espaços extras de cada parte
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z\s]/g, ' ') // Remove tudo exceto letras e espaços
        .replace(/\s+/g, ' ') // Normaliza múltiplos espaços
        .trim(); // Remove espaços no início e fim
}


// Sistema melhorado de extração de keywords
extractKeywordsFromName(productName) {
    if (!productName || typeof productName !== 'string' || !productName.trim()) return [];
    const name = productName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z\s]/g, ' ') // Remove caracteres não alfabéticos
        .trim();
    
    const keywords = new Set();
    // Dicionário expandido para alimentos
    const foodDictionary = {
        carne: ['carne', 'beef', 'bovina', 'boi', 'vaca', 'filet', 'mignon', 'polpetone', 'contra file'],
        frango: ['frango', 'chicken', 'galinha', 'ave', 'peito', 'coxa', 'asa', 'sassami', 'desfiado'],
        porco: ['porco', 'suino', 'lombo', 'costelinha'],
        peixe: ['peixe', 'fish', 'atum', 'sardinha', 'tilapia', 'bacalhau', 'merluza'],
        embutidos: ['bacon', 'presunto', 'mortadela', 'salsicha', 'linguica', 'calabresa', 'salame', 'almondega'],
        queijo: ['queijo', 'mussarela', 'prato', 'cheddar', 'parmesao', 'provolone', 'coalho', 'montanhes', 'derretido'],
        leite: ['leite', 'desnatado', 'integral', 'condensado', 'avela'],
        iogurte: ['iogurte', 'natural', 'grego'],
        arroz: ['arroz', 'branco', 'integral', 'parboilizado', 'campones'],
        feijao: ['feijao', 'preto', 'carioca', 'fradinho'],
        macarrao: ['macarrao', 'massa', 'spaghetti', 'penne', 'parafuso'],
        farinha: ['farinha', 'trigo', 'mandioca', 'milho'],
        oleo: ['oleo', 'soja', 'girassol', 'canola', 'oliva', 'azeite'],
        margarina: ['margarina', 'manteiga', 'cremosa'],
        acucar: ['acucar', 'cristal', 'refinado', 'mascavo', 'demerara'],
        chocolate: ['chocolate', 'cacau', 'achocolatado', 'nescau', 'ao leite', 'forneavel', 'ganache', 'holandesa'],
        refrigerante: ['refrigerante', 'coca', 'pepsi', 'guarana', 'fanta', 'zero', 'antarctica'],
        suco: ['suco', 'nectar', 'polpa', 'concentrado', 'limao'],
        agua: ['agua', 'mineral', 'filtrada', 'gas', 'sao lourenco'],
        cerveja: ['cerveja', 'skol', 'brahma', 'antartica', 'stella', 'artois'],
        sal: ['sal', 'refinado', 'grosso', 'marinho'],
        pimenta: ['pimenta', 'reino', 'malagueta', 'calabresa'],
        tempero: ['tempero', 'oregano', 'manjericao', 'alho', 'cebola'],
        conserva: ['conserva', 'palmito', 'azeitona', 'pepino', 'milho'],
        molho: ['molho', 'tomate', 'barbecue', 'ingles', 'shoyu', 'artesanal', 'sem acidez'],
        congelado: ['congelado', 'hamburguer', 'nuggets', 'batata', 'pizza', 'chips', 'crocante'],
        limpeza: ['detergente', 'sabao', 'amaciante', 'desinfetante'],
        higiene: ['shampoo', 'sabonete', 'pasta', 'escova'],
        sobremesa: ['pudim', 'torta', 'bolo', 'coco', 'gelado', 'holandesa', 'limao', 'creme'],
        acompanhamento: ['batata', 'chips', 'crocante', 'arroz', 'branco', 'campones', 'infantaria', 'realeza'],
        parmegiana: ['parmegiana', 'milanesa', 'empanado', 'recheado', 'berinjela']
    };

    // Análise por dicionário
    Object.entries(foodDictionary).forEach(([category, terms]) => {
        terms.forEach(term => {
            if (name.includes(term)) {
                keywords.add(category); // Adiciona a categoria como palavra-chave
                keywords.add(term); // Adiciona o termo específico
            }
        });
    });

    // Extrair palavras significativas
    const words = name
        .split(/\s+/) // Divide apenas por espaços (após limpeza)
        .filter(word => word.length > 2 && !['com', 'sem acucar', ' h ','sem','para', 'tipo', 'marca', 'de', 'a', 'o', 'e'].includes(word)); // Remove palavras irrelevantes
    words.forEach(word => keywords.add(word));

    // Identificar padrões contextuais
    this.identifyContextualPatterns(name, keywords);

    return Array.from(keywords).sort(); // Retorna palavras-chave ordenadas
}


// Identificar padrões contextuais no nome
identifyContextualPatterns(name, keywords) {
    const patterns = [
        { regex: /frit[ao]s?/, keyword: 'frito' },
        { regex: /assad[ao]s?/, keyword: 'assado' },
        { regex: /cozid[ao]s?/, keyword: 'cozido' },
        { regex: /grelhad[ao]s?/, keyword: 'grelhado' },
        { regex: /empanad[ao]s?/, keyword: 'empanado' },
        { regex: /crocante/, keyword: 'crocante' },
        { regex: /fatiad[ao]s?/, keyword: 'fatiado' },
        { regex: /picad[ao]s?/, keyword: 'picado' },
        { regex: /desfiado/, keyword: 'desfiado' },
        { regex: /inteiro/, keyword: 'inteiro' },
        { regex: /defumad[ao]s?/, keyword: 'defumado' },
        { regex: /temperado/, keyword: 'temperado' },
        { regex: /natural/, keyword: 'natural' },
        { regex: /doce/, keyword: 'doce' },
        { regex: /salgad[ao]/, keyword: 'salgado' },
        { regex: /artesanal/, keyword: 'artesanal' }
    ];

     patterns.forEach(({ regex, keyword }) => {
        if (regex.test(name)) {
            keywords.add(keyword);
        }
    });
}


async ensureCatalogLoaded() {
    if (this.catalog.length === 0) {
        console.log('📦 Catálogo vazio - recarregando...');
        await this.loadCatalog();
        
        // Se ainda assim não conseguiu carregar, usar catálogo básico
        if (this.catalog.length === 0) {
            console.log('🔄 Forçando carregamento do catálogo básico...');
            this.catalog = this.createBasicCatalog().map(product => ({
                ...product,
                keywords: this.extractKeywordsFromName(product.name),
                searchText: this.createSearchableText(product)
            }));
            console.log(`✅ Catálogo básico forçado: ${this.catalog.length} produtos`);
        }
    }
}

// Método auxiliar para transformar dados em cache
transformCachedProducts(cachedData) {
    return cachedData.map((item, index) => {
        // Tentar diferentes formatos de dados
        const product = {
            code: item.codigo || item.id || item.code || `AUTO_${index}`,
            name: item.nome || item.name || item.titulo || 'Produto sem nome',
            price: parseFloat(item.preco || item.price || item.valor || 0),
            category: item.categoria || item.category || item.tipo || 'Geral',
            unit: item.unidade || item.unit || item.medida || 'UN',
            keywords: this.extractKeywordsFromName(item.nome || item.name || ''),
            image: item.imagem || item.image || item.foto || null
        };
        
        return product;
    }).filter(product => product.name !== 'Produto sem nome'); // Filtrar produtos inválidos
}


    createBasicCatalog() {
        // Produtos principais da PMG baseados no site
        return [
            {
                code: '0',
                name: 'erro',
                price: 18.65,
                category: 'erro',
                unit: 'LT',
                keywords: ['erro']
            }
        ];
    }

    setupEventListeners() {
        // Formulário principal
        document.getElementById('prospectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processProspect();
        });

        // Busca por CNPJ
        document.getElementById('searchCnpj').addEventListener('click', () => {
            this.searchCNPJ();
        });

        // NOVO: Busca de clientes locais
        document.getElementById('searchClients').addEventListener('click', () => {
            this.openClientModal();
        });

        // Formatação do CNPJ
        document.getElementById('cnpj').addEventListener('input', (e) => {
            this.formatCNPJ(e.target);
        });
        
        // 🖼️ NOVO: Listener para análise de imagem concluída
        document.addEventListener('socialMediaAnalysisComplete', (e) => {
            console.log('🖼️ Análise de imagem concluída, integrando dados...');
            this.socialMediaAnalysisData = e.detail;
            this.integrateSocialMediaData(e.detail);
        });
        

       // Modal - CÓDIGO CORRIGIDO PARA FECHAR AO CLICAR FORA
        const modal = document.getElementById('offerModal');
        const closeBtn = document.getElementById('closeModal');
        
        // Fechar modal com botão X
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeOfferModal();
            });
        }

        // NOVO: Fechar modal ao clicar fora do conteúdo
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Verifica se o clique foi no overlay (fundo do modal) e não no conteúdo
                if (e.target === modal) {
                    this.closeOfferModal();
                }
            });
        }

        // NOVO: Fechar modal com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('offerModal');
                if (modal && modal.style.display === 'block') {
                    this.closeOfferModal();
                }
            }
        });

        // Botões de ação para cópia direta
        document.getElementById('copyOfferImage')?.addEventListener('click', () => {
            this.copyOfferImage();
        });

        document.getElementById('copyOfferText')?.addEventListener('click', () => {
            this.copyOfferText();
        });

        // Toggle de fundo dinâmico para prospecção
        const toggleBgProsp = document.getElementById('toggle-dynamic-bg-prosp');
        if (toggleBgProsp) {
            toggleBgProsp.checked = this.dynamicBackground;
            toggleBgProsp.addEventListener('change', (e) => {
                this.dynamicBackground = !!e.target.checked;
                localStorage.setItem('dynamicBgProsp', String(this.dynamicBackground));
                console.log('🔄 Fundo dinâmico da prospecção:', this.dynamicBackground ? 'ATIVADO' : 'DESATIVADO');
            });
        }

        // ✅ SELETOR DE FAIXA DE PREÇO DA PROSPECÇÃO
        const priceBandSelectProsp = document.getElementById('price-band-select-prosp');
        if (priceBandSelectProsp) {
            // Carregar estado salvo ou usar padrão
            const savedBand = localStorage.getItem('priceBandProsp') || 'retira';
            this.selectedPriceBand = savedBand;
            priceBandSelectProsp.value = savedBand;
            
            priceBandSelectProsp.addEventListener('change', (e) => {
                this.selectedPriceBand = e.target.value;
                localStorage.setItem('priceBandProsp', this.selectedPriceBand);
                console.log('💰 Faixa de preço prospecção alterada para:', this.selectedPriceBand);
                
                // Aplicar nova faixa ao catálogo interno
                this.applyPriceBandToLocalCatalog(this.selectedPriceBand);
                
                // Atualizar produtos selecionados se houver
                if (this.selectedProducts && this.selectedProducts.length > 0) {
                    this.updateSelectedProductsPrices();
                }
                
                // Atualizar sugestões de produtos se houver uma análise ativa
                if (this.currentProspect && this.currentProspect.suggestions && this.currentProspect.suggestions.length > 0) {
                    console.log('🔄 Atualizando sugestões de produtos com nova faixa de preço');
                    this.renderProductSuggestions();
                }
            });
        }

    // NOVO: Event listeners para outros modais se existirem
        this.setupAdditionalModalListeners();
    }

    // ✅ ATUALIZAR PREÇOS DOS PRODUTOS SELECIONADOS
    updateSelectedProductsPrices() {
        if (!this.selectedProducts || this.selectedProducts.length === 0) return;
        
        console.log('🔄 Atualizando preços para faixa:', this.selectedPriceBand);
        
        // Atualizar cada produto com a nova faixa de preço
        this.selectedProducts = this.selectedProducts.map(product => {
            // Se o produto tem múltiplas faixas de preço, aplicar a selecionada
            if (product.prices && product.prices[this.selectedPriceBand]) {
                const newPrice = product.prices[this.selectedPriceBand];
                return {
                    ...product,
                    price: newPrice,
                    formattedPrice: (typeof newPrice === 'number') ? 
                        newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                        String(newPrice)
                };
            }
            // Se não tem múltiplas faixas, manter preço original
            return product;
        });
        
        // Re-renderizar produtos sugeridos para mostrar novos preços
        this.renderProductSuggestions();
        
        console.log('✅ Preços atualizados para:', this.selectedPriceBand);
    }

    // Aplicar faixa de preço ao catálogo interno de prospecção, quando disponível
    applyPriceBandToLocalCatalog(band) {
        console.log('💰 Aplicando faixa de preço ao catálogo interno:', band);
        
        if (!Array.isArray(this.catalog)) {
            console.warn('⚠️ Catálogo interno não é um array válido');
            return;
        }
        
        // Atualizar faixa selecionada
        this.selectedPriceBand = band;
        
        // Aplicar nova faixa a todos os produtos do catálogo interno
        this.catalog = this.catalog.map(p => {
            if (p && p.prices && p.prices[band]) {
                const val = p.prices[band];
                return {
                    ...p,
                    price: val,
                    formattedPrice: (typeof val === 'number') ? 
                        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                        String(val)
                };
            }
            return p;
        });
        
        console.log('✅ Faixa de preço aplicada ao catálogo interno');
    }

    // NOVO: Método específico para fechar o modal de oferta
    closeOfferModal() {
        const modal = document.getElementById('offerModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('🔐 Modal de oferta fechado');
        }
    }

    // NOVO: Método para configurar outros modais
    setupAdditionalModalListeners() {
        // Modal de oferta customizada (se existir)
        const customModal = document.querySelector('.offer-customized');
        if (customModal) {
            customModal.addEventListener('click', (e) => {
                if (e.target === customModal) {
                    customModal.style.display = 'none';
                }
            });

            // Botão de fechar da oferta customizada
            const customCloseBtn = customModal.querySelector('.close-btn');
            if (customCloseBtn) {
                customCloseBtn.addEventListener('click', () => {
                    customModal.style.display = 'none';
                });
            }
        }
    }

    // NOVO: Método melhorado para abrir modal
    openOfferModal() {
        const modal = document.getElementById('offerModal');
        if (modal) {
            modal.style.display = 'block';
            // Focar no modal para acessibilidade
            modal.focus();
            console.log('🔓 Modal de oferta aberto');
        }
        
    }

    formatCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        input.value = value;
    }

    async searchCNPJ() {
    const cnpjInput = document.getElementById('cnpj');
    const cnpj = cnpjInput.value.replace(/\D/g, '');

    if (cnpj.length !== 14) {
        alert('❌ CNPJ deve ter 14 dígitos');
        return;
    }

    // Mostrar loading
    const searchBtn = document.getElementById('searchCnpj');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    searchBtn.disabled = true;

    try {
        const data = await this.getCompanyData(cnpj);
        
        // Mostrar preview dos dados encontrados
        this.showCompanyPreview(data);
        
        console.log('✅ Dados encontrados:', data);

    } catch (error) {
        console.error('❌ Erro na busca por CNPJ:', error);
        alert('❌ Erro ao buscar CNPJ. Dados podem ter sido carregados do cache local.');
    } finally {
        searchBtn.innerHTML = originalText;
        searchBtn.disabled = false;
    }
}

showCompanyPreview(data) {
    // Criar um modal simples para mostrar os dados encontrados
    const existingPreview = document.getElementById('company-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    const preview = document.createElement('div');
    preview.id = 'company-preview';
    preview.innerHTML = `
        <div style="
            position: fixed; top: 20px; right: 20px; 
            background: white; border: 2px solid #667eea; 
            border-radius: 10px; padding: 1rem; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            max-width: 300px; z-index: 1000;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="margin: 0; color: #667eea;">✅ Dados Encontrados</h4>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none; border: none; font-size: 1.2rem; cursor: pointer;
                ">&times;</button>
            </div>
            <p><strong>Empresa:</strong> ${data.fantasia}</p>
            <p><strong>CNPJ:</strong> ${data.cnpj}</p>
            <p><strong>Cidade:</strong> ${data.municipio}/${data.uf}</p>
            <p><strong>Atividade:</strong> ${data.atividade_principal}</p>
        </div>
    `;
    
    document.body.appendChild(preview);
    
    // Remover automaticamente após 8 segundos
    setTimeout(() => {
        if (preview.parentElement) {
            preview.remove();
        }
    }, 8000);
}


getLocalCompanyData(cnpj) {
    const localDatabase = {
        '00000000000100': {
            nome: 'EXEMPLO ALIMENTAÇÃO E SERVIÇOS LTDA',
            fantasia: 'RESTAURANTE DEMO',
            cnpj: '00.000.000/0001-00',
            atividade_principal: 'Restaurantes e similares',
            logradouro: 'RUA EXEMPLO',
            numero: '123',
            bairro: 'CENTRO DEMO',
            municipio: 'CIDADE EXEMPLO',
            uf: 'SP',
            cep: '00000-000',
            telefone: '(11) 0000-0000',
            email: 'contato@exemplorestaurante.com',
            capital_social: '100000.00',
            abertura: '01/01/2020',
            situacao: 'ATIVA'
        }
    };

    return localDatabase[cnpj] || null;
}

showManualDataEntry(cnpj) {
    // Implementar modal para entrada manual de dados
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>⚠️ Dados do CNPJ não encontrados</h3>
                <p>CNPJ: ${cnpj}</p>
                <p>Por favor, insira os dados manualmente ou tente novamente mais tarde.</p>
                <button onclick="this.closest('.modal-overlay').remove()">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}


    // ==================== SISTEMA DE COMUNICAÇÃO IFRAME ↔ PÁGINA PAI ====================

    // Solicitar dados da página pai via PostMessage
    async requestDataFromParent(type) {
        return new Promise((resolve) => {
            // Verificar se estamos em iframe
            if (window.self === window.top) {
                resolve(null);
                return;
            }

            console.log(`📨 Solicitando dados ${type} da página pai via PostMessage...`);

            // Criar listener para a resposta
            const messageListener = (event) => {
                if (event.data && event.data.type === 'CLIENT_DATA_RESPONSE' && event.data.requestType === type) {
                    console.log(`📬 Dados recebidos da página pai:`, event.data.clients?.length || 0, 'clientes');
                    window.removeEventListener('message', messageListener);
                    resolve(event.data.clients || []);
                }
            };

            window.addEventListener('message', messageListener);

            // Enviar solicitação para a página pai
            window.parent.postMessage({
                type: 'REQUEST_CLIENT_DATA',
                requestType: type
            }, '*');

            // Timeout de 3 segundos
            setTimeout(() => {
                window.removeEventListener('message', messageListener);
                console.log('⏰ Timeout na solicitação de dados da página pai');
                resolve(null);
            }, 3000);
        });
    }

    // Configurar listener para PostMessage (página pai)
    setupParentMessageListener() {
        // Esta função deve ser chamada na página principal (index.html)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'REQUEST_CLIENT_DATA') {
                console.log(`📨 Recebida solicitação de dados ${event.data.requestType} do iframe`);
                
                let clients = [];
                
                if (window.clientManager) {
                    if (event.data.requestType === 'active') {
                        clients = window.clientManager.ativos || [];
                    } else {
                        clients = window.clientManager.data || [];
                    }
                }
                
                // Se não há dados no ClientManager, tentar variáveis globais
                if (clients.length === 0) {
                    if (event.data.requestType === 'active') {
                        clients = window.ativos || [];
                    } else {
                        clients = window.data || [];
                    }
                }

                console.log(`📤 Enviando ${clients.length} clientes para o iframe`);

                // Enviar resposta para o iframe
                event.source.postMessage({
                    type: 'CLIENT_DATA_RESPONSE',
                    requestType: event.data.requestType,
                    clients: clients
                }, '*');
            }
        });
    }

    // Debug dos dados de clientes
    debugClientData() {
        console.log('🔍 === DEBUG DOS DADOS DE CLIENTES ===');
        
        // Verificar se estamos em iframe
        const isInIframe = window.self !== window.top;
        console.log(`🖼️ Executando em iframe: ${isInIframe}`);
        
        if (isInIframe) {
            console.log('🔗 Tentando acessar dados da página principal...');
            try {
                // Tentar acessar o ClientManager da página pai
                const parentClientManager = window.parent.clientManager;
                if (parentClientManager) {
                    console.log('✅ ClientManager encontrado na página pai');
                    console.log(`📊 Ativos na página pai: ${parentClientManager.ativos?.length || 0}`);
                    console.log(`📊 Inativos na página pai: ${parentClientManager.data?.length || 0}`);
                    
                    if (parentClientManager.ativos?.length > 0) {
                        console.log('📝 Exemplo de cliente ativo:', parentClientManager.ativos[0]);
                    }
                    
                    if (parentClientManager.data?.length > 0) {
                        console.log('📝 Exemplo de cliente inativo:', parentClientManager.data[0]);
                    }
                } else {
                    console.log('❌ ClientManager não encontrado na página pai');
                }
                
                // Verificar variáveis globais da página pai
                console.log(`🌐 window.parent.ativos: ${window.parent.ativos?.length || 0}`);
                console.log(`🌐 window.parent.data: ${window.parent.data?.length || 0}`);
                
            } catch (error) {
                console.log('❌ Erro ao acessar página pai (CORS?):', error.message);
            }
        }
        
        if (window.clientManager) {
            console.log('✅ ClientManager encontrado');
            console.log(`📊 Ativos no ClientManager: ${window.clientManager.ativos?.length || 0}`);
            console.log(`📊 Inativos no ClientManager: ${window.clientManager.data?.length || 0}`);
            
            if (window.clientManager.ativos?.length > 0) {
                console.log('📝 Exemplo de cliente ativo:', window.clientManager.ativos[0]);
            }
            
            if (window.clientManager.data?.length > 0) {
                console.log('📝 Exemplo de cliente inativo:', window.clientManager.data[0]);
            }
        } else {
            console.log('❌ ClientManager não encontrado');
        }
        
        // Verificar variáveis globais
        console.log(`🌐 window.ativos: ${window.ativos?.length || 0}`);
        console.log(`🌐 window.data: ${window.data?.length || 0}`);
        
        // Verificar localStorage
        try {
            const ativosLocal = localStorage.getItem('ativos');
            const dataLocal = localStorage.getItem('clients');
            console.log(`💾 localStorage ativos: ${ativosLocal ? JSON.parse(ativosLocal).length : 0}`);
            console.log(`💾 localStorage clients: ${dataLocal ? JSON.parse(dataLocal).length : 0}`);
        } catch (e) {
            console.log('❌ Erro ao ler localStorage:', e.message);
        }
        
        console.log('🔍 === FIM DEBUG ===');
    }

    // Abrir modal de seleção de clientes
    openClientModal() {
        console.log('🔍 Abrindo modal de clientes...');
        
        // Debug dos dados antes de abrir
        this.debugClientData();
        
        const modal = document.getElementById('clientModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Configurar eventos do modal se ainda não foram configurados
            this.setupClientModalEvents();
            
            // Verificação adicional para o campo de busca
            const clientSearchInput = document.getElementById('clientSearch');
            if (clientSearchInput) {
                // Limpar valor anterior
                clientSearchInput.value = '';
                console.log('✅ Campo de busca encontrado e limpo');
            } else {
                console.error('❌ Campo de busca não encontrado no modal');
            }
            
            // Priorizar PostMessage se estivermos em iframe
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
                console.log('🖼️ Em iframe, usando PostMessage para buscar dados...');
                this.loadClientsViaPostMessage('active');
            } else {
                this.loadClients('active'); // Carregar clientes ativos por padrão
            }
            
            // Configurar eventos do modal se ainda não foram configurados
            this.setupClientModalEvents();
        }
    }

    // Método específico para carregar via PostMessage
    async loadClientsViaPostMessage(type) {
        console.log(`📨 Carregando clientes ${type} via PostMessage...`);
        
        const clientList = document.getElementById('clientList');
        if (!clientList) return;

        // Mostrar loading
        clientList.innerHTML = `
            <div class="loading-clients">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando clientes via comunicação com página principal...</p>
            </div>
        `;

        try {
            const clients = await this.requestDataFromParent(type);
            
            if (clients && clients.length > 0) {
                console.log(`✅ Dados recebidos via PostMessage: ${clients.length} clientes`);
                this.currentClients = clients;
                this.renderClientList(clients, type);
                this.updateFilterButtons(type);
            } else {
                console.log('⚠️ PostMessage não retornou dados, usando método padrão...');
                this.loadClients(type);
            }
            
        } catch (error) {
            console.error('❌ Erro no PostMessage:', error);
            this.loadClients(type); // Fallback para método padrão
        }
    }

    // Fechar modal de clientes
    closeClientModal() {
        const modal = document.getElementById('clientModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Configurar eventos do modal de clientes
    setupClientModalEvents() {
        // Evitar configurar múltiplas vezes
        if (this.clientModalEventsSetup) return;
        this.clientModalEventsSetup = true;

        // Botão fechar "X"
        const closeButton = document.getElementById('closeClientModal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeClientModal();
            });
        }

        // Fechar modal ao clicar fora
        document.getElementById('clientModal').addEventListener('click', (e) => {
            if (e.target.id === 'clientModal') {
                this.closeClientModal();
            }
        });

        // Botões de filtro
        document.getElementById('showActiveClients').addEventListener('click', () => {
            this.loadClients('active');
        });

        document.getElementById('showInactiveClients').addEventListener('click', () => {
            this.loadClients('inactive');
        });

        // Busca em tempo real
        const clientSearchInput = document.getElementById('clientSearch');
        if (clientSearchInput) {
            clientSearchInput.addEventListener('input', (e) => {
                console.log(`🎯 Input event triggered with value: "${e.target.value}"`);
                this.filterClients(e.target.value);
            });
            
            // Teste adicional: forçar filtro quando digitado
            clientSearchInput.addEventListener('keyup', (e) => {
                console.log(`⌨️ Keyup event triggered with value: "${e.target.value}"`);
                this.filterClients(e.target.value);
            });
            
            console.log('✅ Event listener do filtro de busca configurado com sucesso');
        } else {
            console.error('❌ Elemento clientSearch não encontrado para configurar filtro');
        }

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('clientModal');
                if (modal && modal.style.display === 'block') {
                    this.closeClientModal();
                }
            }
        });
    }

    // Carregar lista de clientes
    async loadClients(type = 'active') {
        console.log(`📋 Carregando clientes ${type}...`);
        
        const clientList = document.getElementById('clientList');
        if (!clientList) return;

        // Mostrar loading
        clientList.innerHTML = `
            <div class="loading-clients">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando clientes...</p>
            </div>
        `;

        try {
            // Verificar se estamos em iframe
            const isInIframe = window.self !== window.top;
            let clients = [];
            
            console.log(`🖼️ Executando em iframe: ${isInIframe}`);
            
            // PRIMEIRA TENTATIVA: Acessar dados da página pai se estivermos em iframe
            if (isInIframe) {
                try {
                    console.log('� Tentando acessar ClientManager da página pai...');
                    const parentClientManager = window.parent.clientManager;
                    
                    if (parentClientManager) {
                        console.log('✅ ClientManager encontrado na página pai');
                        
                        if (type === 'active') {
                            clients = parentClientManager.ativos || [];
                            console.log(`📊 Clientes ativos da página pai: ${clients.length}`);
                        } else {
                            clients = parentClientManager.data || [];
                            console.log(`📊 Clientes inativos da página pai: ${clients.length}`);
                        }
                        
                        if (clients.length === 0) {
                            console.log('⚠️ Dados vazios no ClientManager pai, tentando variáveis globais...');
                            
                            if (type === 'active') {
                                clients = window.parent.ativos || [];
                            } else {
                                clients = window.parent.data || [];
                            }
                            
                            console.log(`🔄 Dados das variáveis globais pai: ${clients.length} clientes`);
                        }
                    } else {
                        console.log('❌ ClientManager não encontrado na página pai');
                        
                        // Tentar acessar variáveis globais diretamente
                        if (type === 'active') {
                            clients = window.parent.ativos || [];
                        } else {
                            clients = window.parent.data || [];
                        }
                        
                        console.log(`🔄 Tentativa direta nas variáveis globais pai: ${clients.length} clientes`);
                    }
                    
                } catch (error) {
                    console.log('❌ Erro ao acessar página pai (CORS?):', error.message);
                }
            }
            
            // SEGUNDA TENTATIVA: ClientManager local (se não estiver em iframe ou falhou acesso pai)
            if (clients.length === 0 && window.clientManager) {
                console.log('📊 Tentando ClientManager local...');
                
                if (type === 'active') {
                    clients = window.clientManager.ativos || [];
                } else {
                    clients = window.clientManager.data || [];
                }
                
                console.log(`📊 Clientes do ClientManager local: ${clients.length}`);
            }
            
            // TERCEIRA TENTATIVA: Variáveis globais locais
            if (clients.length === 0) {
                console.log('📊 Tentando variáveis globais locais...');
                
                if (type === 'active') {
                    clients = window.ativos || [];
                } else {
                    clients = window.data || [];
                }
                
                console.log(`📊 Clientes das variáveis globais locais: ${clients.length}`);
            }
            
            // QUARTA TENTATIVA: localStorage
            if (clients.length === 0) {
                console.log('📁 Tentando localStorage...');
                clients = this.getClientsFromLocalStorage(type);
                console.log(`📁 Clientes do localStorage: ${clients.length}`);
            }

            // Log detalhado para debug
            console.log(`📊 Resultado final: ${clients.length} clientes do tipo ${type}`);
            if (clients.length > 0) {
                console.log('📝 Exemplo de cliente:', clients[0]);
            }

            this.currentClients = clients;
            this.renderClientList(clients, type);
            
            // Atualizar botões de filtro
            this.updateFilterButtons(type);
            
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            clientList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Erro ao carregar clientes</p>
                    <small>Verifique se as abas "Ativos" e "Inativos" estão carregadas</small>
                    <br><small>Erro: ${error.message}</small>
                    <br><button onclick="window.debugProspeccaoClients()" style="margin-top: 10px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 3px; cursor: pointer;">🔍 Debug</button>
                </div>
            `;
        }
    }

    // Buscar clientes no localStorage (fallback)
    getClientsFromLocalStorage(type) {
        try {
            // Tentar diferentes chaves de localStorage baseadas no que vemos nos logs
            const possibleKeys = {
                'active': ['ativos', 'activeClients', 'clientsAtivos'],
                'inactive': ['clients', 'data', 'inactiveClients', 'clientsInativos']
            };

            const keys = possibleKeys[type] || [];
            console.log(`🔍 Tentando chaves localStorage para ${type}:`, keys);
            
            for (const key of keys) {
                try {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            console.log(`✅ Clientes carregados de localStorage.${key}:`, parsed.length);
                            console.log('📝 Primeiro cliente:', parsed[0]);
                            return parsed;
                        } else {
                            console.log(`⚠️ localStorage.${key} existe mas está vazio ou inválido`);
                        }
                    } else {
                        console.log(`❌ localStorage.${key} não existe`);
                    }
                } catch (parseError) {
                    console.warn(`Erro ao parsear localStorage.${key}:`, parseError.message);
                }
            }

            // Fallback: dados de exemplo para demonstração (apenas se realmente não há dados)
            console.log('📝 Nenhum dado encontrado no localStorage, usando dados de exemplo');
            return this.getSampleClients(type);
            
        } catch (error) {
            console.error('Erro ao buscar clientes no localStorage:', error);
            return this.getSampleClients(type);
        }
    }

    // Dados de exemplo para demonstração
    getSampleClients(type) {
        const sampleClients = {
            'active': [
                {
                    name: 'Restaurante Exemplo 1',
                    cnpj: '00.000.000/0001-01',
                    cidade: 'Cidade A',
                    atividade: 'Restaurante',
                    status: 'active'
                },
                {
                    name: 'Pizzaria Exemplo 2',
                    cnpj: '00.000.000/0001-02',
                    cidade: 'Cidade B',
                    atividade: 'Pizzaria',
                    status: 'active'
                }
            ],
            'inactive': [
                {
                    name: 'Lanchonete Exemplo 3',
                    cnpj: '00.000.000/0001-03',
                    cidade: 'Cidade C',
                    atividade: 'Lanchonete',
                    status: 'inactive'
                },
                {
                    name: 'Bar Exemplo 4',
                    cnpj: '00.000.000/0001-04',
                    cidade: 'Cidade D',
                    atividade: 'Bar e Restaurante',
                    status: 'inactive'
                }
            ]
        };

        console.log(`📝 Usando dados de exemplo para clientes ${type}`);
        return sampleClients[type] || [];
    }

    // Renderizar lista de clientes
    renderClientList(clients, filterType = null) {
        console.log(`🎨 ===== RENDERIZANDO LISTA DE CLIENTES =====`);
        console.log(`🎨 Recebidos: ${clients ? clients.length : 'null/undefined'} clientes`);
        console.log(`🎨 filterType: ${filterType}`);
        
        const clientList = document.getElementById('clientList');
        if (!clientList) {
            console.error('❌ ERRO CRÍTICO: Elemento clientList não encontrado!');
            return;
        }
        
        console.log(`✅ Elemento clientList encontrado: ${clientList.tagName}#${clientList.id}`);
        console.log(`📏 clientList innerHTML atual: ${clientList.innerHTML.length} caracteres`);

        if (!clients || clients.length === 0) {
            console.log('⚠️ Nenhum cliente para renderizar - mostrando mensagem de vazio');
            clientList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Nenhum cliente encontrado</p>
                    <small>Certifique-se de que há dados carregados nas abas Ativos/Inativos</small>
                </div>
            `;
            console.log(`📝 innerHTML vazio definido. Novo length: ${clientList.innerHTML.length}`);
            return;
        }

        console.log(`🎨 Iniciando renderização de ${clients.length} clientes válidos`);
        
        // Mostrar nomes dos primeiros clientes para debug
        if (clients.length > 0) {
            console.log(`📋 Primeiros clientes a renderizar:`);
            clients.slice(0, 3).forEach((client, i) => {
                const name = client['Nome Fantasia'] || client.nomeFantasia || client.name || 'Sem nome';
                console.log(`   ${i + 1}. ${name}`);
            });
        }
        
        // Determinar o filtro atual - usar parâmetro se fornecido, senão detectar do DOM
        let currentFilter = filterType;
        if (!currentFilter) {
            const activeButton = document.querySelector('.filter-btn.active');
            currentFilter = activeButton ? activeButton.dataset.filter : 'unknown';
        }
        
        console.log(`🔍 Filtro para renderização: ${currentFilter}`);

        const clientsHtml = clients.map((client, index) => {
            // Mapear diferentes formatos de dados dos clientes
            const cnpj = this.formatCNPJDisplay(
                client['CNPJ / CPF'] || 
                client.cnpj || 
                client.CNPJ || 
                client.cnpjCpf || 
                ''
            );
            
            const name = 
                client['Nome Fantasia'] || 
                client.nomeFantasia ||
                client.name || 
                client.empresa || 
                client.razaoSocial || 
                client.Cliente ||
                'Nome não informado';
                
            const city = 
                client.Cidade ||
                client.cidade || 
                client.municipio || 
                '';
                
            const activity = 
                client.atividade || 
                client.atividadePrincipal || 
                client.ramo ||
                '';
                
            const contact = 
                client.Contato ||
                client.contato ||
                client.responsavel ||
                '';
                
            const phone = 
                client['Telefone Comercial'] ||
                client.telefone ||
                client.telefoneComercial ||
                client.Celular ||
                client.celular ||
                '';

            // Determinar status baseado no filtro atual
            let status = 'inactive'; // padrão
            
            // Usar o filtro passado como parâmetro ou detectar do DOM
            if (currentFilter === 'active') {
                status = 'active';
            } else if (currentFilter === 'inactive') {
                status = 'inactive';
            }
            // Fallback: verificar propriedades do cliente se não há filtro definido
            else if (client.isAtivo === true || client.ativo === true) {
                status = 'active';
            } else if (window.clientManager && window.clientManager.ativos) {
                // Verificar se está na lista de ativos
                const isInAtivos = window.clientManager.ativos.some(ativo => 
                    ativo.id === client.id || 
                    ativo['CNPJ / CPF'] === client['CNPJ / CPF'] ||
                    ativo.cnpj === client.cnpj
                );
                if (isInAtivos) status = 'active';
            }

            console.log(`🏷️ Cliente: ${name}, Filtro: ${currentFilter}, Status: ${status}`);

            return `
                <div class="client-item" data-cnpj="${cnpj}" data-name="${name}" data-id="${client.id || index}">
                    <div class="client-name">${name}</div>
                    <div class="client-cnpj">CNPJ: ${cnpj || 'Não informado'}</div>
                    ${contact ? `<div class="client-info">👤 ${contact}</div>` : ''}
                    ${city ? `<div class="client-info">📍 ${city}</div>` : ''}
                    ${activity ? `<div class="client-info">🏢 ${activity}</div>` : ''}
                    ${phone ? `<div class="client-info">📞 ${phone}</div>` : ''}
                    <span class="client-status ${status}">${status === 'active' ? 'ATIVO' : 'INATIVO'}</span>
                </div>
            `;
        }).join('');

        console.log(`🔧 HTML gerado: ${clientsHtml.substring(0, 200)}...`);
        console.log(`🔧 Tamanho do HTML: ${clientsHtml.length} caracteres`);
        console.log(`🔧 ANTES: clientList.innerHTML.length = ${clientList.innerHTML.length}`);
        
        clientList.innerHTML = clientsHtml;
        
        console.log(`� DEPOIS: clientList.innerHTML.length = ${clientList.innerHTML.length}`);
        console.log(`🔧 clientList.children.length = ${clientList.children.length}`);

        // Adicionar eventos de clique
        const clientItems = clientList.querySelectorAll('.client-item');
        console.log(`🖱️ Elementos .client-item encontrados: ${clientItems.length}`);
        
        clientItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectClient(item);
            });
            
            if (index < 3) {
                const name = item.querySelector('.client-name')?.textContent || 'sem nome';
                console.log(`   Item ${index + 1}: ${name}`);
            }
        });
        
        console.log(`✅ RENDERIZAÇÃO COMPLETA: ${clients.length} clientes → ${clientItems.length} elementos DOM`);
    }

    // Selecionar um cliente
    selectClient(clientElement) {
        const cnpj = clientElement.dataset.cnpj;
        const name = clientElement.dataset.name;
        
        if (cnpj) {
            // Preencher o campo CNPJ
            const cnpjInput = document.getElementById('cnpj');
            if (cnpjInput) {
                cnpjInput.value = cnpj;
            }
            
            // Fechar modal
            this.closeClientModal();
            
            // Mostrar feedback
            this.showCopyFeedback(`Cliente "${name}" selecionado`, 'success');
            
            console.log(`✅ Cliente selecionado: ${name} (${cnpj})`);
        }
    }

    // Filtrar clientes em tempo real
    filterClients(searchTerm) {
        console.log(`🔍 ===== FILTRO DEBUG SIMPLIFICADO =====`);
        console.log(`🔍 searchTerm: "${searchTerm}"`);
        
        if (!this.currentClients) {
            console.error('❌ currentClients é null/undefined');
            return;
        }
        
        console.log(`📋 Total clientes: ${this.currentClients.length}`);
        
        let filtered;
        
        if (!searchTerm || searchTerm.trim() === '') {
            console.log('📝 Termo vazio - mostrar todos');
            filtered = this.currentClients;
        } else {
            const search = searchTerm.toLowerCase().trim();
            console.log(`🔍 Procurando por: "${search}"`);
            
            filtered = this.currentClients.filter(client => {
                const name = (client['Nome Fantasia'] || client.nomeFantasia || client.name || '').toLowerCase();
                const matches = name.includes(search);
                
                if (matches) {
                    console.log(`✅ MATCH: "${name}"`);
                }
                
                return matches;
            });
        }

        console.log(`🎯 Resultado: ${filtered.length} clientes filtrados`);
        console.log(`🎯 Chamando renderClientList...`);
        
        // Usar filtro ativo atual
        const activeButton = document.querySelector('.filter-btn.active');
        const currentFilter = activeButton ? activeButton.dataset.filter : null;
        
        this.renderClientList(filtered, currentFilter);
    }

    // Atualizar aparência dos botões de filtro
    updateFilterButtons(activeType) {
        const activeBtn = document.getElementById('showActiveClients');
        const inactiveBtn = document.getElementById('showInactiveClients');
        
        if (activeBtn && inactiveBtn) {
            // Remover classe ativa de ambos
            activeBtn.classList.remove('btn-primary', 'active');
            inactiveBtn.classList.remove('btn-primary', 'active');
            activeBtn.classList.add('btn-secondary');
            inactiveBtn.classList.add('btn-secondary');
            
            // Adicionar classe ativa no botão correto
            if (activeType === 'active') {
                activeBtn.classList.remove('btn-secondary');
                activeBtn.classList.add('btn-primary', 'active');
            } else {
                inactiveBtn.classList.remove('btn-secondary');
                inactiveBtn.classList.add('btn-primary', 'active');
            }
            
            console.log(`🎯 Filtro atualizado para: ${activeType}`);
        }
    }

    // ==================== MÉTODOS PARA PALAVRAS-CHAVE ====================

    // Processar palavras-chave do cardápio
    processKeywords() {
        const keywordsInput = document.getElementById('keywords');
        if (!keywordsInput) return [];

        const keywordsText = keywordsInput.value.trim();
        if (!keywordsText) return [];

        // Separar por vírgula e limpar
        const keywords = keywordsText
            .split(',')
            .map(keyword => keyword.trim().toLowerCase())
            .filter(keyword => keyword.length > 2)
            .map(keyword => this.normalizeText(keyword));

        console.log('🔑 Palavras-chave processadas:', keywords);
        return keywords;
    }

    // Criar dados simulados de menu baseado em palavras-chave
    createMenuFromKeywords(keywords) {
        if (!keywords || keywords.length === 0) {
            return {
                items: [],
                categories: {},
                analysis: 'Nenhuma palavra-chave fornecida.'
            };
        }

        // Simular itens do menu baseado nas palavras-chave
        const menuItems = keywords.map((keyword, index) => ({
            name: keyword,
            category: this.categorizeMenuItem(keyword),
            confidence: 0.9
        }));

        // Agrupar por categoria
        const categories = {};
        menuItems.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item.name);
        });

        // Criar análise
        const analysis = this.generateKeywordAnalysis(keywords, categories);

        return {
            items: menuItems,
            categories: categories,
            analysis: analysis
        };
    }

    // Gerar análise baseada em palavras-chave
    generateKeywordAnalysis(keywords, categories) {
        const categoryNames = Object.keys(categories);
        const mainCategory = this.getMostCommonCategory(categories);
        
        let analysis = `**Análise baseada em ${keywords.length} palavras-chave:**\n\n`;
        
        analysis += `**Categorias identificadas:** ${categoryNames.join(', ')}\n\n`;
        
        if (mainCategory) {
            analysis += `**Categoria principal:** ${mainCategory}\n\n`;
        }
        
        analysis += `**Palavras-chave analisadas:**\n`;
        keywords.forEach(keyword => {
            analysis += `• ${keyword}\n`;
        });

        return analysis;
    }

    // Encontrar categoria mais comum
    getMostCommonCategory(categories) {
        let maxCount = 0;
        let mainCategory = '';
        
        Object.entries(categories).forEach(([category, items]) => {
            if (items.length > maxCount) {
                maxCount = items.length;
                mainCategory = category;
            }
        });
        
        return mainCategory;
    }

    async processProspect() {
        const cnpj = document.getElementById('cnpj').value.replace(/\D/g, '');
        
        // MUDANÇA: Usar palavras-chave em vez de arquivo
        const keywords = this.processKeywords();

        if (!cnpj || cnpj.length !== 14) {
            alert('❌ CNPJ inválido. Digite um CNPJ válido com 14 dígitos.');
            return;
        }

        // Validar se há palavras-chave ou permitir continuar sem elas
        if (keywords.length === 0) {
            const confirm = window.confirm('⚠️ Nenhuma palavra-chave foi fornecida. Deseja continuar mesmo assim?\n\nSem palavras-chave, as sugestões de produtos serão baseadas apenas no tipo de empresa.');
            if (!confirm) {
                document.getElementById('keywords').focus();
                return;
            }
        }

        console.log('🚀 Iniciando prospecção...', { cnpj, keywords });

        // Mostrar loading
        this.showLoading();

        try {
            // Etapa 1: Buscar dados da empresa
            await this.updateLoadingStep(1);
            const companyData = await this.getCompanyData(cnpj);

            // 🔍 NOVO: Enriquecimento automático de dados demográficos
            let enrichedCompanyData = companyData;
            try {
                console.log('🔍 Iniciando enriquecimento de dados...');
                console.log('📋 Dados da empresa antes do enriquecimento:', companyData);
                
                // Verificar se a função de enriquecimento está disponível
                if (typeof enriquecerDadosCliente === 'undefined') {
                    console.warn('⚠️ Função enriquecerDadosCliente não encontrada - enriquecimento será ignorado');
                } else {
                    const dadosEnriquecidos = await enriquecerDadosCliente(companyData);
                    console.log('📊 Dados retornados do enriquecimento:', dadosEnriquecidos);
                    
                    if (dadosEnriquecidos && dadosEnriquecidos !== companyData) {
                        enrichedCompanyData = dadosEnriquecidos;
                        console.log('✅ Dados enriquecidos com sucesso - usando dados enriquecidos');
                        console.log('🎯 Dados finais para renderização:', enrichedCompanyData);
                    } else {
                        console.log('⚠️ Enriquecimento não adicionou novos dados - usando dados originais');
                    }
                }
            } catch (enrichError) {
                console.warn('⚠️ Erro no enriquecimento (continuando sem):', enrichError);
                // Continua sem enriquecimento em caso de erro
            }

            // Etapa 2: Analisar localização
            await this.updateLoadingStep(2);
            const locationData = await this.analyzeLocation(enrichedCompanyData);

            // Etapa 3: Processar cardápio (palavras-chave)
            await this.updateLoadingStep(3);
            const menuData = this.createMenuFromKeywords(keywords);

            // 🖼️ NOVO: Incluir dados da análise de imagem se disponível
            if (this.socialMediaAnalysisData) {
                console.log('🖼️ Integrando análise de imagem na prospecção...');
                // Adicionar informações da análise de imagem ao enrichedCompanyData
                enrichedCompanyData.socialMediaAnalysis = this.socialMediaAnalysisData;
                enrichedCompanyData.hasImageAnalysis = true;
            }

            // Etapa 4: Sugerir produtos
            await this.updateLoadingStep(4);
            const suggestions = await this.suggestProducts(enrichedCompanyData, menuData);

            // Etapa 5: Criar prospecção
            await this.updateLoadingStep(5);
            this.currentProspect = {
                company: enrichedCompanyData, // ✅ Usar dados enriquecidos
                location: locationData,
                menu: menuData,
                suggestions: suggestions,
                keywords: keywords, // NOVO: Salvar palavras-chave
                timestamp: new Date().toISOString()
            };

            // Mostrar resultados
            await this.sleep(1000);
            this.showResults();
            this.updateStats();

        } catch (error) {
            console.error('❌ Erro no processamento:', error);
            alert('❌ Erro ao processar prospecção: ' + error.message);
            this.hideLoading();
        }
    }

    async getCompanyData(cnpj) {
    try {
        console.log(`🔍 Buscando CNPJ: ${cnpj}`);
        
        // Lista de APIs para tentar
        const apis = [
            {
                name: 'BrasilAPI',
                url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
                transform: (data) => ({
                    nome: data.razao_social || 'Não informado',
                    fantasia: data.nome_fantasia || data.razao_social || 'Não informado',
                    cnpj: this.formatCNPJDisplay(data.cnpj || cnpj),
                    atividade_principal: data.cnae_fiscal_descricao || 'Não informado',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                    telefone: data.ddd_telefone_1 || '',
                    email: data.email || '',
                    capital_social: data.capital_social || '0',
                    abertura: data.data_inicio_atividade || '',
                    situacao: data.descricao_situacao_cadastral || 'Ativa'
                })
            },
            {
                name: 'ReceitaWS',
                url: `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
                transform: (data) => ({
                    nome: data.nome || 'Não informado',
                    fantasia: data.fantasia || data.nome || 'Não informado',
                    cnpj: data.cnpj || this.formatCNPJDisplay(cnpj),
                    atividade_principal: data.atividade_principal?.[0]?.text || 'Não informado',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    municipio: data.municipio || '',
                    uf: data.uf || '',
                    cep: data.cep || '',
                    telefone: data.telefone || '',
                    email: data.email || '',
                    capital_social: data.capital_social || '0',
                    abertura: data.abertura || '',
                    situacao: data.situacao || 'Ativa'
                })
            }
        ];

        // Tentar APIs uma por uma
        for (const api of apis) {
            try {
                console.log(`🔍 Tentando ${api.name}...`);
                
                const response = await fetch(api.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Verificar se há erro na resposta
                    if (data.status === 'ERROR' || data.error) {
                        console.warn(`⚠️ ${api.name} retornou erro:`, data.message || data.error);
                        continue;
                    }

                    const transformedData = api.transform(data);
                    console.log(`✅ Sucesso com ${api.name}:`, transformedData.nome);
                    return transformedData;
                }
            } catch (apiError) {
                console.warn(`⚠️ ${api.name} falhou:`, apiError.message);
                continue;
            }
        }

        throw new Error('Todas as APIs falharam');

    } catch (error) {
        console.error('❌ Erro ao buscar dados da empresa:', error);
        return this.getFallbackCompanyData(cnpj);
    }
}

// ==================== SISTEMA DE ANÁLISE POR PROXIMIDADE DE NOMES ====================

// Método principal para analisar o cardápio e gerar sugestões baseado em proximidade
analyzeMenuAndSuggestProducts(menu) {
    console.log('🔍 Iniciando análise por proximidade de nomes...');
    
    if (!menu || !menu.trim()) {
        return {
            analysis: 'Nenhum cardápio fornecido para análise.',
            suggestions: [],
            score: 0,
            keywords: []
        };
    }

    const menuLower = menu.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Análise contextual do cardápio
    const analysisResult = this.performProximityAnalysis(menuLower);
    
    // Geração de sugestões baseadas em proximidade semântica
    const suggestions = this.generateProximitySuggestions(analysisResult, menuLower);
    
    // Calcular score de adequação
    const adequacyScore = this.calculateProximityScore(analysisResult, suggestions);

    return {
        analysis: this.formatProximityReport(analysisResult),
        suggestions: suggestions.slice(0, 50), // Limitar a 50 sugestões
        score: adequacyScore,
        keywords: analysisResult.detectedKeywords,
        businessType: analysisResult.businessType
    };
}

// Análise de proximidade semântica do cardápio
performProximityAnalysis(menuText) {
    const analysis = {
        businessType: this.detectBusinessTypeByProximity(menuText),
        detectedKeywords: new Set(),
        ingredientProximity: new Map(),
        preparationMethods: new Set(),
        cuisineStyle: new Set(),
        priceAnalysis: this.extractPricePatterns(menuText),
        textComplexity: this.calculateTextComplexity(menuText)
    };

    // Mapas de proximidade semântica
    const proximityMaps = {
        carnes: {
            terms: ['carne', 'boi', 'bovino', 'frango', 'porco', 'bacon', 'linguica'],
            related: ['grelhado', 'assado', 'frito', 'temperado']
        },
        queijos: {
            terms: ['queijo', 'mussarela', 'parmesao', 'cheddar', 'catupiry', 'cream cheese'],
            related: ['derretido', 'gratinado', 'cremoso']
        },
        massas: {
            terms: ['massa', 'macarrao', 'pizza', 'lasanha', 'spaghetti'],
            related: ['molho', 'italiana', 'caseira']
        },
        empanados: {
            terms: ['empanado', 'milanesa', 'parmegiana', 'crocante'],
            related: ['dourado', 'frito', 'tradicional']
        }
    };

    // Análise por proximidade
    Object.entries(proximityMaps).forEach(([category, config]) => {
        let categoryScore = 0;
        let foundTerms = [];

        config.terms.forEach(term => {
            if (menuText.includes(term)) {
                categoryScore += 2;
                foundTerms.push(term);
                analysis.detectedKeywords.add(term);
            }
        });

        config.related.forEach(related => {
            if (menuText.includes(related)) {
                categoryScore += 1;
                foundTerms.push(related);
                analysis.detectedKeywords.add(related);
            }
        });

        if (categoryScore > 0) {
            analysis.ingredientProximity.set(category, {
                score: categoryScore,
                terms: foundTerms,
                relevance: categoryScore / 5
            });
        }
    });

    return analysis;
}

// Detectar tipo de negócio por proximidade
detectBusinessTypeByProximity(menuText) {
    const patterns = {
        'parmegiana': ['parmegiana', 'milanesa', 'empanado', 'queijo parmesao'],
        'pizzaria': ['pizza', 'margherita', 'calabresa', 'mussarela'],
        'lanchonete': ['lanche', 'hamburguer', 'batata frita', 'combo'],
        'restaurante_geral': ['prato', 'refeicao', 'almoco', 'cardapio']
    };

    let bestMatch = 'restaurante_geral';
    let highestScore = 0;

    Object.entries(patterns).forEach(([type, keywords]) => {
        const score = keywords.reduce((sum, keyword) => {
            return sum + (menuText.includes(keyword) ? 1 : 0);
        }, 0);

        if (score > highestScore) {
            highestScore = score;
            bestMatch = type;
        }
    });

    return bestMatch;
}


getFallbackCompanyData(cnpj) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Retornar apenas dados genéricos - sem informações reais de clientes
    return {
        nome: 'EMPRESA NÃO ENCONTRADA',
        fantasia: 'Consulte manualmente',
        cnpj: this.formatCNPJDisplay(cnpj),
        atividade_principal: 'Consulte manualmente - Possível: Lanchonete/Restaurante',
        logradouro: 'Não disponível',
        numero: '',
        bairro: 'Não disponível',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '',
        telefone: '',
        email: '',
        capital_social: '0',
        abertura: '',
        situacao: 'Consulte manualmente'
    };
}

// Método auxiliar para formatar CNPJ
formatCNPJDisplay(cnpj) {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}



    async analyzeLocation(companyData) {
        // Análise básica de localização
        const uf = companyData.uf;
        const municipio = companyData.municipio;

        // Dados demográficos simulados (em produção, usaria APIs como IBGE)
        const locationAnalysis = {
            estado: uf,
            cidade: municipio,
            regiao: this.getRegion(uf),
            populacao_estimada: this.estimatePopulation(municipio),
            perfil_economico: this.getEconomicProfile(uf),
            concorrencia: this.analyzeConcurrence(companyData.atividade_principal)
        };

        return locationAnalysis;
    }

    getRegion(uf) {
        const regioes = {
            'SP': 'Sudeste', 'RJ': 'Sudeste', 'MG': 'Sudeste', 'ES': 'Sudeste',
            'PR': 'Sul', 'SC': 'Sul', 'RS': 'Sul',
            'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'DF': 'Centro-Oeste',
            'BA': 'Nordeste', 'SE': 'Nordeste', 'AL': 'Nordeste', 'PE': 'Nordeste', 'PB': 'Nordeste', 'RN': 'Nordeste', 'CE': 'Nordeste', 'PI': 'Nordeste', 'MA': 'Nordeste'
        };
        return regioes[uf] || 'Norte';
    }

    estimatePopulation(municipio) {
        // Simulação baseada em dados conhecidos
        const capitais = {
            'SÃO PAULO': 12000000,
            'RIO DE JANEIRO': 6700000,
            'BRASÍLIA': 3000000,
            'SALVADOR': 2900000,
            'FORTALEZA': 2700000
        };
        return capitais[municipio.toUpperCase()] || 100000;
    }

    getEconomicProfile(uf) {
        const profiles = {
            'SP': 'Industrial e Comercial - Alto poder aquisitivo',
            'RJ': 'Serviços e Turismo - Médio/Alto poder aquisitivo',
            'MG': 'Agropecuária e Mineração - Médio poder aquisitivo',
            'PR': 'Agropecuária e Industrial - Médio poder aquisitivo',
            'SC': 'Industrial e Tecnológico - Alto poder aquisitivo',
            'RS': 'Agropecuária e Industrial - Médio/Alto poder aquisitivo'
        };
        return profiles[uf] || 'Economia diversificada - Médio poder aquisitivo';
    }

    analyzeConcurrence(atividade) {
        if (atividade.toLowerCase().includes('restaurante') || 
            atividade.toLowerCase().includes('alimentação')) {
            return {
                nivel: 'Alto',
                observacao: 'Mercado de alimentação competitivo, oportunidade para diferenciação com produtos premium'
            };
        }
        return {
            nivel: 'Médio',
            observacao: 'Concorrência moderada no setor'
        };
    }

    async processMenu(file) {
    if (!file) {
        return {
            items: [],
            categories: [],
            analysis: 'Nenhum cardápio fornecido para análise'
        };
    }

    try {
        console.log('📄 Processando arquivo de cardápio:', file.name);
        this.updateLoadingStep(3);
        
        const content = await this.readFileContent(file);
        console.log('📄 Conteúdo lido:', content.length, 'caracteres');
        
        // Processar o conteúdo TXT
        const menuItems = this.extractMenuItems(content);
        console.log('🍽️ Itens extraídos:', menuItems.length);
        
        if (menuItems.length === 0) {
            // Tentar método alternativo se não encontrou nada
            const alternativeItems = this.extractMenuItemsAlternative(content);
            console.log('🍽️ Método alternativo encontrou:', alternativeItems.length, 'Cracteres');
            
            if (alternativeItems.length > 0) {
                const categories = this.categorizeMenuItems(alternativeItems);
                return {
                    items: alternativeItems,
                    categories: categories,
                    analysis: this.generateMenuAnalysis(alternativeItems, categories)
                };
            }
        }
        
        const categories = this.categorizeMenuItems(menuItems);
        
        return {
            items: menuItems,
            categories: categories,
            analysis: this.generateMenuAnalysis(menuItems, categories)
        };
        
    } catch (error) {
        console.error('❌ Erro ao processar cardápio:', error);
        return {
            items: [],
            categories: [],
            analysis: `Erro ao processar cardápio: ${error.message}. Verifique se o arquivo TXT foi salvo corretamente.`
        };
    }
}


    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
extractMenuItemsAlternative(content) {
    const items = [];
    
    try {
        // Dividir em linhas e procurar por padrões específicos
        const lines = content.split(/[\n\r]+/);
        
        lines.forEach(line => {
            line = line.trim();
            
            // Procurar por linhas que parecem ser itens de cardápio
            if (line.length > 10 && 
                line.match(/^[A-ZÁÉÍÓÚÇ]/) && 
                !line.match(/^(Content-|MIME-|Boundary|charset)/i)) {
                
                // Extrair nome e preço se existir
                const priceMatch = line.match(/R\$\s*(\d+[,.]?\d*)/);
                const name = line.replace(/R\$.*$/, '').trim();
                
                if (name.length > 3) {
                    items.push({
                        name: this.cleanItemName(name),
                        price: priceMatch ? priceMatch[1] : 'Consultar',
                        category: this.categorizeMenuItem(name)
                    });
                }
            }
        });
        
        console.log(`✅ Método alternativo encontrou ${items.length} itens`);
        return items;
        
    } catch (error) {
        console.error('❌ Erro no método alternativo:', error);
        return [];
    }
}

    // Método melhorado para extrair itens do cardápio
extractMenuItems(content) {
    const items = [];
    
    try {
        // Limpar conteúdo TXT (remover cabeçalhos e codificação)
        let cleanContent = content
            .replace(/Content-Type:.*?\n/gi, '')
            .replace(/Content-Transfer-Encoding:.*?\n/gi, '')
            .replace(/=\n/g, '')
            .replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/=C3=A([0-9A-F])/g, (match, hex) => String.fromCharCode(195, parseInt('A' + hex, 16)))
            .replace(/&amp;nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ');

        console.log('🧹 Conteúdo limpo para análise');
        
        // Padrões para encontrar itens com preços
        const patterns = [
            // Padrão 1: Nome do item seguido de R$ preço
            /([A-ZÁÉÍÓÚÇ][^R$\n]*?)\s*R\$\s*(\d{1,3}(?:,\d{2})?)/g,
            
            // Padrão 2: ### Nome do item (cabeçalhos de seção)
            /###\s*([A-ZÁÉÍÓÚÇ][^\n\r#]*)/g,
            
            // Padrão 3: Linhas que começam com palavra maiúscula
            /^([A-ZÁÉÍÓÚÇ][^\n\r]*?)(?:\s*R\$\s*(\d{1,3}(?:,\d{2})?))?$/gm
        ];

        patterns.forEach((pattern, index) => {
            console.log(`🔍 Aplicando padrão ${index + 1}...`);
            let matches = [...cleanContent.matchAll(pattern)];
            
            matches.forEach(match => {
                const name = match[1]?.trim();
                const price = match[2] || '';
                
                if (name && name.length > 3 && !name.toLowerCase().includes('r$')) {
                    const item = {
                        name: this.cleanItemName(name),
                        price: price || 'Consultar',
                        category: this.categorizeMenuItem(name)
                    };
                    
                    // Evitar duplicatas
                    if (!items.some(existing => 
                        existing.name.toLowerCase() === item.name.toLowerCase())) {
                        items.push(item);
                    }
                }
            });
        });

        console.log(`✅ Encontrados ${items.length} itens no cardápio`);
        return items;
        
    } catch (error) {
        console.error('❌ Erro na extração de itens:', error);
        return [];
    }
}

// Limpar nome do item
cleanItemName(name) {
    return name
        .replace(/=C3=A[0-9A-F]/g, 'ã')
        .replace(/=C3=AA/g, 'ê')
        .replace(/=C3=A1/g, 'á')
        .replace(/=C3=A9/g, 'é')
        .replace(/=C3=AD/g, 'í')
        .replace(/=C3=B3/g, 'ó')
        .replace(/=C3=BA/g, 'ú')
        .replace(/=C3=A7/g, 'ç')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

    categorizeMenuItem(itemName) {
        const name = itemName.toLowerCase();
        
        if (name.includes('pizza') || name.includes('margherita') || name.includes('calabresa')) {
            return 'Pizzas';
        }
        if (name.includes('hambúrguer') || name.includes('burger') || name.includes('lanche')) {
            return 'Lanches';
        }
        if (name.includes('frango') || name.includes('chicken') || name.includes('parmegiana')) {
            return 'Pratos Principais';
        }
        if (name.includes('refrigerante') || name.includes('suco') || name.includes('água')) {
            return 'Bebidas';
        }
        if (name.includes('sorvete') || name.includes('pudim') || name.includes('torta')) {
            return 'Sobremesas';
        }
        
        return 'Outros';
    }

    categorizeMenuItems(items) {
        const categories = {};
        
        items.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        return categories;
    }

    generateMenuAnalysis(items, categories) {
    if (!items || items.length === 0) {
        return 'Não foi possível extrair itens do cardápio. Verifique se o arquivo TXT foi salvo corretamente da página web.';
    }

    const totalItems = items.length;
    const categoryCount = Object.keys(categories).length;
    const itemsWithPrice = items.filter(item => item.price !== 'Consultar').length;
    
    let analysis = `📊 **Análise do Cardápio Processado**\n\n`;
    analysis += `✅ **${totalItems} itens** encontrados\n`;
    analysis += `📂 **${categoryCount} categorias** identificadas\n`;
    analysis += `💰 **${itemsWithPrice} itens** com preço definido\n\n`;
    
    analysis += `🏷️ **Distribuição por Categorias:**\n`;
    Object.entries(categories).forEach(([category, categoryItems]) => {
        analysis += `• ${category}: ${categoryItems.length} itens\n`;
    });

    analysis += '\n🎯 **Oportunidades de Negócio Identificadas:**\n';
    
    // Analisar categorias para sugestões específicas
    if (categories['Pizzas'] && categories['Pizzas'].length > 0) {
        analysis += '🍕 **Pizzaria** - Produtos recomendados: Calabresa Aurora, Queijos, Molho de Tomate, Azeitonas\n';
    }
    
    if (categories['Lanches'] && categories['Lanches'].length > 0) {
        analysis += '🍔 **Lanchonete** - Produtos recomendados: Bacon em Cubos, Batata Frita Congelada, Maionese\n';
    }
    
    if (categories['Pratos Principais'] && categories['Pratos Principais'].length > 0) {
        analysis += '🍽️ **Restaurante** - Produtos recomendados: Carnes Resfriadas, Arroz, Temperos\n';
    }
    
    if (categories['Bebidas'] && categories['Bebidas'].length > 0) {
        analysis += '🥤 **Bebidas** - Produtos recomendados: Refrigerantes, Sucos, Águas\n';
    }

    if (categories['Sobremesas'] && categories['Sobremesas'].length > 0) {
        analysis += '🍰 **Sobremesas** - Produtos recomendados: Leite Condensado, Creme de Leite, Açúcares\n';
    }

    analysis += '\n📋 **Primeiros itens encontrados:**\n';
    items.slice(0, 5).forEach(item => {
        analysis += `• ${item.name} - ${item.price}\n`;
    });

    if (totalItems > 5) {
        analysis += `• ... e mais ${totalItems - 5} itens encontrados\n`;
    }

    return analysis;
}


    // Atualizar o método suggestProducts para usar apenas o catálogo real:
async suggestProducts(companyData, menuData) {
    console.log('🧠 Iniciando análise inteligente com catálogo real...');
    console.log('🔍 Debug suggestProducts:');
    console.log('  - companyData:', !!companyData);
    console.log('  - menuData:', !!menuData);
    console.log('  - this.catalog:', !!this.catalog);
    console.log('  - this.catalog.length:', this.catalog?.length || 0);
    console.log('  - socialMediaAnalysisData:', !!this.socialMediaAnalysisData);
    
    try {
        // Garantir que o catálogo está carregado
        await this.ensureCatalogLoaded();
        
        console.log(`📦 Após ensureCatalogLoaded: ${this.catalog?.length || 0} produtos`);
        
        if (!this.catalog || this.catalog.length === 0) {
            console.error('❌ Catálogo vazio após ensureCatalogLoaded!');
            return [];
        }
        
        const suggestions = [];
        const menuItems = menuData.items || [];
        
        console.log(`📦 Analisando ${this.catalog.length} produtos do catálogo real`);
        console.log(`🍽️ Contra ${menuItems.length} itens do cardápio`);

        // 🖼️ NOVO: Integrar dados da análise de imagem se disponível
        if (this.socialMediaAnalysisData) {
            console.log('🖼️ Integrando dados da análise de imagem na sugestão de produtos...');
            const imageBasedSuggestions = this.generateSuggestionsFromImageAnalysis(this.socialMediaAnalysisData);
            suggestions.push(...imageBasedSuggestions);
        }

        if (menuItems.length === 0) {
            console.log('⚠️ Nenhum item no cardápio, usando análise por tipo de empresa');
            const companyBasedSuggestions = this.suggestByCompanyType(companyData);
            suggestions.push(...companyBasedSuggestions);
        } else {
            // Análise inteligente por similaridade de texto
            const matches = this.findProductMatches(menuItems);
            
            // Converter matches para sugestões
            const sortedMatches = matches
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);

            for (const match of sortedMatches) {
                suggestions.push({
                    ...match.product,
                    reason: match.reason,
                    image: this.getProductImageSafe(match.product.code),
                    priority: match.score,
                    confidence: this.calculateConfidenceFromScore(match.score),
                    matchedItems: match.matchedItems
                });
            }
        }

        console.log(`✅ ${suggestions.length} produtos sugeridos baseados no catálogo real e análise de imagem`);
        
        // TESTE DE DEBUG: Se não há sugestões, adicionar algumas de teste
        if (suggestions.length === 0) {
            console.warn('⚠️ Nenhuma sugestão encontrada, adicionando produtos de teste...');
            suggestions.push(
                {
                    code: 'TEST001',
                    name: 'Produto Teste 1',
                    price: 10.00,
                    unit: 'KG',
                    category: 'Teste',
                    reason: 'Produto de teste para debug',
                    image: this.getProductImageSafe('TEST001'),
                    priority: 1,
                    confidence: 0.5
                },
                {
                    code: 'TEST002', 
                    name: 'Produto Teste 2',
                    price: 20.00,
                    unit: 'UN',
                    category: 'Teste',
                    reason: 'Segundo produto de teste',
                    image: this.getProductImageSafe('TEST002'),
                    priority: 2,
                    confidence: 0.5
                }
            );
        }
        
        return suggestions;

    } catch (error) {
        console.error('❌ Erro na análise:', error);
        throw error; // Re-throw para mostrar erro ao usuário
    }
}

// Busca de produtos por correspondência textual
findProductMatches(menuItems) {
    const matches = [];
    const menuText = menuItems.map(item => item.name.toLowerCase()).join(' ');
    
    console.log('🔍 Texto do cardápio para análise:', menuText.substring(0, 200) + '...');
    
    this.catalog.forEach(product => {
        let score = 0;
        const matchedItems = [];
        let reason = '';
        
        // Análise por similaridade textual direta
        const similarity = this.calculateTextSimilarity(menuText, product.searchText || product.name.toLowerCase());
        if (similarity > 0.1) {
            score += similarity * 20;
            reason = `Similaridade textual detectada (${(similarity * 100).toFixed(1)}%)`;
        }
        
        // Análise por keywords
        const keywordMatches = this.countKeywordMatches(menuText, product.keywords || []);
        if (keywordMatches > 0) {
            score += keywordMatches * 5;
            reason = `${keywordMatches} palavra(s)-chave encontrada(s)`;
        }
        
        // Análise item por item
        menuItems.forEach(menuItem => {
            const itemSimilarity = this.calculateTextSimilarity(
                menuItem.name.toLowerCase(), 
                product.name.toLowerCase()
            );
            
            if (itemSimilarity > 0.2) {
                score += itemSimilarity * 10;
                matchedItems.push(menuItem.name);
                reason = `Produto relacionado a "${menuItem.name}"`;
            }
        });
        
        if (score > 2) {
            matches.push({
                product,
                score,
                reason: reason || 'Produto identificado como relevante',
                matchedItems
            });
        }
    });
    
    console.log(`🎯 ${matches.length} produtos encontraram correspondências`);
    return matches;
}
// Normalize text for comparison
    normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Calculate cosine similarity between two texts
    calculateTextSimilarity(text1, text2) {
        // Split texts into words
        const words1 = text1.split(' ').filter(word => word.length > 2);
        const words2 = text2.split(' ').filter(word => word.length > 2);

        // Create word frequency vectors
        const wordSet = new Set([...words1, ...words2]);
        const vector1 = Array.from(wordSet).map(word => words1.filter(w => w === word).length);
        const vector2 = Array.from(wordSet).map(word => words2.filter(w => w === word).length);

        // Calculate dot product
        const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);

        // Calculate magnitudes
        const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

        // Avoid division by zero
        if (magnitude1 === 0 || magnitude2 === 0) return 0;

        // Calculate cosine similarity
        return dotProduct / (magnitude1 * magnitude2);
    }

    // Updated method to suggest products based solely on text similarity
    async analyzeMenuAndSuggestProducts(menuText) {
        try {
            console.log('🔍 Analisando cardápio para sugestão de produtos...');
            
            // Normalize menu text for comparison
            const normalizedMenuText = this.normalizeText(menuText);
            if (!normalizedMenuText) {
                console.warn('⚠️ Nenhum texto válido extraído do cardápio');
                return [];
            }

            // Calculate text similarity for each product
            const productsWithScores = this.catalog.map(product => {
                const similarity = this.calculateTextSimilarity(normalizedMenuText, product.searchText);
                return { ...product, similarity, reason: `Similaridade de texto: ${Math.round(similarity * 100)}%` };
            });

            // Sort by similarity score and take top 5
            const suggestedProducts = productsWithScores
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5)
                .filter(product => product.similarity > 0.1); // Minimum similarity threshold

            console.log(`✅ ${suggestedProducts.length} produtos sugeridos com base em similaridade de texto`);
            return suggestedProducts;
        } catch (error) {
            console.error('❌ Erro ao sugerir produtos:', error);
            return [];
        }
    }
// Contar matches de keywords
countKeywordMatches(text, keywords) {
    if (!keywords || keywords.length === 0) return 0;
    
    return keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
    ).length;
}
// Sugestões baseadas apenas no tipo de empresa (sem produtos hardcoded)
suggestByCompanyType(companyData) {
    console.log('🏢 Análise por tipo de empresa sem cardápio');
    
    const activity = companyData.atividade_principal.toLowerCase();
    const suggestions = [];
    
    // Categorias relevantes por tipo (sem produtos específicos)
    const relevantCategories = this.getRelevantCategories(activity);
    
    this.catalog.forEach(product => {
        let score = 0;
        
        // Score por categoria
        relevantCategories.forEach(({ category, weight }) => {
            if (product.category.toLowerCase().includes(category.toLowerCase())) {
                score += weight;
            }
        });
        
        // Score por palavras-chave relacionadas à atividade
        const activityKeywords = this.getActivityKeywords(activity);
        const keywordMatches = this.countKeywordMatches(
            product.searchText || product.name.toLowerCase(),
            activityKeywords
        );
        
        score += keywordMatches * 2;
        
        if (score > 3) {
            suggestions.push({
                ...product,
                reason: `Recomendado para ${activity}`,
                image: this.getProductImageSafe(product.code),
                priority: score,
                confidence: score > 8 ? 'Alta' : score > 5 ? 'Média' : 'Baixa',
                matchedItems: []
            });
        }
    });
    
    return suggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 8);
}
getRelevantCategories(activity) {
    const mappings = {
        'lanchonete': [
            { category: 'Embutidos', weight: 8 },
            { category: 'Congelados', weight: 7 },
            { category: 'Laticínios', weight: 6 },
            { category: 'Óleos', weight: 5 }
        ],
        'pizzaria': [
            { category: 'Embutidos', weight: 9 },
            { category: 'Laticínios', weight: 8 },
            { category: 'Molhos', weight: 7 },
            { category: 'Conservas', weight: 5 }
        ],
        'restaurante': [
            { category: 'Carnes', weight: 9 },
            { category: 'Grãos', weight: 8 },
            { category: 'Temperos', weight: 6 },
            { category: 'Óleos', weight: 5 }
        ]
    };
    
    // Encontrar mapeamento mais próximo
    for (const [key, categories] of Object.entries(mappings)) {
        if (activity.includes(key)) {
            return categories;
        }
    }
    
    // Default genérico
    return [
        { category: 'Grãos', weight: 5 },
        { category: 'Óleos', weight: 4 },
        { category: 'Temperos', weight: 3 }
    ];
}
getActivityKeywords(activity) {
    const keywordMaps = {
        'lanchonete': ['hamburguer', 'batata', 'bacon', 'queijo', 'lanche'],
        'pizzaria': ['pizza', 'calabresa', 'queijo', 'molho', 'azeitona'],
        'restaurante': ['carne', 'arroz', 'tempero', 'oleo', 'sal'],
        'padaria': ['farinha', 'acucar', 'fermento', 'leite', 'ovo']
    };
    
    for (const [key, keywords] of Object.entries(keywordMaps)) {
        if (activity.includes(key)) {
            return keywords;
        }
    }
    
    return ['tempero', 'sal', 'oleo']; // Keywords básicas
}
calculateConfidenceFromScore(score) {
    if (score >= 15) return 'Muito Alta';
    if (score >= 10) return 'Alta';
    if (score >= 6) return 'Média';
    if (score >= 3) return 'Baixa';
    return 'Muito Baixa';
}
// Método seguro para buscar imagens (evita erros)
getProductImageSafe(productCode) {
    try {
        return this.getProductImage(productCode);
    } catch (error) {
        console.warn('⚠️ Erro ao carregar imagem:', error);
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="%23666" font-size="12">Produto</text></svg>`;
    }
}

// Sugestões de emergência caso tudo falhe
getFallbackSuggestions() {
    console.log('🆘 Usando sugestões de emergência');
    
    const basicProducts = [
        {
            
        },
        {
            
        },
        {
           
        }
    ];
    
    return basicProducts;
}

async processProspectSafe() {
    const cnpj = document.getElementById('cnpj').value.replace(/\D/g, '');
    
    const cardapioFile = document.getElementById('cardapio').files[0];

    if (!cnpj || cnpj.length !== 14) {
        alert('❌ CNPJ inválido');
        return;
    }

    // Mostrar loading
    this.showLoading();

    try {
        // Timeout de 30 segundos para evitar travamentos
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: Operação demorou muito')), 30000);
        });

        const analysisPromise = this.processProspectWithSteps(cnpj, cardapioFile);
        
        // Race entre a análise e o timeout
        await Promise.race([analysisPromise, timeoutPromise]);
        
    } catch (error) {
        console.error('❌ Erro ou timeout:', error);
        alert('❌ Análise demorou muito. Tente novamente com um cardápio menor.');
        this.hideLoading();
    }
}

async processProspectWithSteps(cnpj, cardapioFile) {
    // Etapa 1
    await this.updateLoadingStep(1);
    const companyData = await this.getCompanyData(cnpj);

    // Etapa 2  
    await this.updateLoadingStep(2);
    const locationData = await this.analyzeLocation(companyData);

    // Etapa 3
    await this.updateLoadingStep(3);
    const menuData = await this.processMenu(cardapioFile);

    // Etapa 4 - COM TIMEOUT
    await this.updateLoadingStep(4);
    const suggestions = await Promise.race([
        this.suggestProducts(companyData, menuData),
        new Promise((resolve) => {
            setTimeout(() => resolve(this.getFallbackSuggestions()), 10000);
        })
    ]);

    // Etapa 5
    await this.updateLoadingStep(5);
    this.currentProspect = {
        company: companyData,
        location: locationData,
        menu: menuData,
        suggestions: suggestions,
        
        timestamp: new Date().toISOString()
    };

    await this.sleep(1000);
    this.showResults();
    this.updateStats();
}


// Encontrar produtos similares usando múltiplos algoritmos
findSimilarProducts(menuItemName, menuCategory) {
    const matches = [];
    const searchTerm = menuItemName.toLowerCase();
    
    this.catalog.forEach(product => {
        let similarity = 0;
        let reason = '';
        
        // Método 1: Similaridade direta do nome
        const nameSimilarity = this.calculateStringSimilarity(searchTerm, product.name.toLowerCase());
        if (nameSimilarity > 0.3) {
            similarity += nameSimilarity * 10;
            reason = `Nome similar: "${product.name}"`;
        }
        
        // Método 2: Palavras-chave em comum
        const keywordScore = this.calculateKeywordSimilarity(searchTerm, product.keywords || []);
        if (keywordScore > 0) {
            similarity += keywordScore * 5;
            reason = reason || `Ingrediente relacionado encontrado`;
        }
        
        // Método 3: Categoria similar
        if (menuCategory && product.category) {
            const categorySimilarity = this.calculateStringSimilarity(
                menuCategory.toLowerCase(), 
                product.category.toLowerCase()
            );
            if (categorySimilarity > 0.5) {
                similarity += categorySimilarity * 3;
                reason = reason || `Categoria similar: ${product.category}`;
            }
        }
        
        // Método 4: Análise de contexto (ingredientes comuns)
        const contextScore = this.analyzeContextualRelevance(searchTerm, product);
        if (contextScore > 0) {
            similarity += contextScore * 2;
            reason = reason || `Contextualmente relevante`;
        }
        
        if (similarity > 2) { // Threshold mínimo
            matches.push({
                product,
                similarity,
                reason
            });
        }
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity);
}

// Calcular similaridade entre strings (algoritmo melhorado)
calculateStringSimilarity(str1, str2) {
    // Jaro-Winkler para melhor precisão com nomes de produtos
    const jaro = this.jaroSimilarity(str1, str2);
    const prefix = this.commonPrefixLength(str1, str2);
    return jaro + (0.1 * prefix * (1 - jaro));
}

jaroSimilarity(s1, s2) {
    if (s1.length === 0 && s2.length === 0) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, s2.length);
        
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = s2Matches[j] = true;
            matches++;
            break;
        }
    }
    
    if (matches === 0) return 0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }
    
    return (matches / s1.length + matches / s2.length + 
            (matches - transpositions / 2) / matches) / 3;
}

commonPrefixLength(s1, s2) {
    let prefix = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }
    return prefix;
}

// Calcular similaridade por palavras-chave
calculateKeywordSimilarity(searchTerm, productKeywords) {
    if (!productKeywords || productKeywords.length === 0) return 0;
    
    let matches = 0;
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2);
    
    searchWords.forEach(searchWord => {
        productKeywords.forEach(keyword => {
            if (keyword.includes(searchWord) || searchWord.includes(keyword)) {
                matches++;
            }
        });
    });
    
    return matches / Math.max(searchWords.length, productKeywords.length);
}

// Analisar relevância contextual
analyzeContextualRelevance(menuItem, product) {
    let score = 0;
    const item = menuItem.toLowerCase();
    const productName = product.name.toLowerCase();
    
    // Contextos culinários
    const contexts = {
        'pizza': ['queijo', 'calabresa', 'molho', 'azeitona', 'bacon', 'presunto'],
        'hambúrguer': ['carne', 'bacon', 'queijo', 'batata', 'molho', 'pão'],
        'salada': ['azeite', 'vinagre', 'tomate', 'alface', 'atum', 'milho'],
        'macarrão': ['molho', 'queijo', 'carne', 'frango', 'bacon'],
        'frango': ['tempero', 'óleo', 'batata', 'arroz'],
        'carne': ['sal', 'tempero', 'óleo', 'batata', 'arroz'],
        'sobremesa': ['açúcar', 'leite', 'chocolate', 'creme'],
        'lanche': ['pão', 'queijo', 'presunto', 'manteiga', 'bacon']
    };
    
    Object.entries(contexts).forEach(([context, ingredients]) => {
        if (item.includes(context)) {
            ingredients.forEach(ingredient => {
                if (productName.includes(ingredient)) {
                    score += 2;
                }
            });
        }
    });
    
    return Math.min(score, 10); // Cap no score
}

// Buscar produtos por tipo de atividade (fallback)
findProductsByActivity(companyData, menuData) {
    const activity = companyData.atividade_principal.toLowerCase();
    const matches = [];
    
    // Categorias relevantes por tipo de negócio
    const activityCategories = {
        'lanchonete': ['embutidos', 'congelados', 'óleos', 'laticínios', 'bebidas'],
        'pizzaria': ['embutidos', 'laticínios', 'molhos', 'conservas', 'óleos'],
        'restaurante': ['carnes', 'grãos', 'temperos', 'óleos', 'laticínios'],
        'padaria': ['açúcares', 'farinhas', 'óleos', 'laticínios', 'ovos'],
        'bar': ['bebidas', 'conservas', 'embutidos', 'petiscos']
    };
    
    let relevantCategories = [];
    Object.entries(activityCategories).forEach(([type, categories]) => {
        if (activity.includes(type) || activity.includes(type.slice(0, -1))) {
            relevantCategories = categories;
        }
    });
    
    if (relevantCategories.length === 0) {
        relevantCategories = ['grãos', 'óleos', 'temperos']; // Básicos
    }
    
    this.catalog.forEach(product => {
        const categoryMatch = relevantCategories.some(cat => 
            product.category.toLowerCase().includes(cat)
        );
        
        if (categoryMatch) {
            matches.push({
                product,
                similarity: 5, // Score médio para matches por atividade
                reason: `Recomendado para ${activity}`,
                matchedMenuItem: `Tipo de negócio: ${activity}`
            });
        }
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 8);
}

// Gerar razão inteligente
generateIntelligentReason(item) {
    if (item.matchedMenuItem && item.similarity > 7) {
        return `Produto ideal para "${item.matchedMenuItem}" - Alta similaridade detectada`;
    } else if (item.matchedMenuItem && item.similarity > 5) {
        return `Recomendado para complementar "${item.matchedMenuItem}"`;
    } else if (item.similarity > 5) {
        return `Produto relacionado aos itens do seu cardápio`;
    } else {
        return item.reason || 'Produto sugerido para seu tipo de negócio';
    }
}


// Calcular nível de confiança
calculateConfidenceLevel(similarity) {
    if (similarity >= 8) return 'Muito Alta';
    if (similarity >= 6) return 'Alta';  
    if (similarity >= 4) return 'Média';
    if (similarity >= 2) return 'Baixa';
    return 'Muito Baixa';
}
getProductImage(productCode) {
    // Primeiro, tentar buscar do mapeamento de imagens
    if (this.imagesMap && this.imagesMap[productCode]) {
        return this.imagesMap[productCode];
    }
    
    // Buscar no produto do catálogo
    const product = this.catalog.find(p => p.code === productCode);
    if (product && product.image) {
        return product.image;
    }
    
    // Buscar no sistema principal de imagens (se disponível)
    if (window.produtosPorCategoria) {
        for (const categoria of Object.values(window.produtosPorCategoria)) {
            const produtoEncontrado = categoria.find(p => 
                p.codigo === productCode || p.id === productCode
            );
            if (produtoEncontrado && produtoEncontrado.imagem) {
                return produtoEncontrado.imagem;
            }
        }
    }
    
    // Placeholder personalizado
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f8f9fa"/><circle cx="100" cy="60" r="20" fill="%23dee2e6"/><rect x="75" y="85" width="50" height="30" fill="%23dee2e6"/><text x="100" y="130" text-anchor="middle" fill="%23868e96" font-size="10">Produto ${productCode}</text></svg>`;
}


    detectActivityType(companyData, menuData) {
        const activity = companyData.atividade_principal.toLowerCase();
        const menuCategories = Object.keys(menuData.categories || {});

        if (activity.includes('pizzaria') || menuCategories.includes('Pizzas')) {
            return 'pizzaria';
        }
        if (activity.includes('lanchonete') || menuCategories.includes('Lanches')) {
            return 'lanchonete';
        }
        if (activity.includes('restaurante') || activity.includes('refeição')) {
            return 'restaurante';
        }
        if (activity.includes('padaria') || activity.includes('panificação')) {
            return 'padaria';
        }
        if (activity.includes('bar') || activity.includes('bebida')) {
            return 'bar';
        }

        return 'geral';
    }

    getRecommendationReason(product, activityType, menuData) {
        const reasons = {
            'pizzaria': {
                '27': 'Calabresa é ingrediente essencial para pizzas tradicionais',
                '271': 'Bacon em cubos ideal para pizzas gourmet',
                '1351': 'Atum para diversificar sabores de pizza',
                '47': 'Banha para massa de pizza crocante',
                '4385': 'Açúcar para equilibrar molho de tomate'
            },
            'lanchonete': {
                '271': 'Bacon essencial para hambúrguers premium',
                '25': 'Batata frita congelada - praticidade e qualidade',
                '47': 'Banha para fritura perfeita',
                '89': 'Arroz para pratos executivos',
                '4385': 'Açúcar para bebidas e molhos'
            },
            'geral': {
                '89': 'Arroz - produto básico essencial',
                '4385': 'Açúcar - insumo fundamental',
                '271': 'Bacon - versatilidade culinária',
                '25': 'Batata congelada - praticidade',
                '5167': 'Carne de qualidade para pratos principais'
            }
        };

        return reasons[activityType]?.[product.code] || 
               reasons['geral'][product.code] || 
               'Produto recomendado para sua operação';
    }

    calculatePriority(product, activityType, menuData) {
        let priority = 5; // Base

        // Prioridade por categoria
        if (product.category === 'Carnes' && activityType === 'restaurante') priority += 3;
        if (product.category === 'Embutidos' && (activityType === 'pizzaria' || activityType === 'lanchonete')) priority += 3;
        if (product.category === 'Congelados' && activityType === 'lanchonete') priority += 2;

        // Prioridade por keywords no menu
        if (menuData.items) {
            const menuText = menuData.items.map(item => item.name.toLowerCase()).join(' ');
            product.keywords.forEach(keyword => {
                if (menuText.includes(keyword)) priority += 1;
            });
        }

        return priority;
    }

    
    showLoading() {
        document.getElementById('loadingSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingSection').style.display = 'none';
    }

    async updateLoadingStep(stepNumber) {
        const steps = document.querySelectorAll('.step');
        const progressFill = document.getElementById('progressFill');
        
        // Remover active de todos os steps
        steps.forEach(step => step.classList.remove('active'));
        
        // Ativar step atual
        const currentStep = document.getElementById(`step${stepNumber}`);
        if (currentStep) {
            currentStep.classList.add('active');
        }
        
        // Atualizar barra de progresso
        const progress = (stepNumber / 5) * 100;
        progressFill.style.width = progress + '%';
        
        // Aguardar um pouco para o usuário ver o progresso
        await this.sleep(1500);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showResults() {
        console.log('📋 showResults chamado');
        console.log('  - currentProspect:', !!this.currentProspect);
        console.log('  - suggestions:', this.currentProspect?.suggestions?.length || 0);
        
        this.hideLoading();
        document.getElementById('resultsSection').style.display = 'grid';

        // Renderizar informações da empresa
        this.renderCompanyInfo();
        
        // Renderizar produtos sugeridos
        this.renderProductSuggestions();
        
        // Renderizar script de vendas
        this.renderSalesScript();
    }

    renderCompanyInfo() {
        const container = document.getElementById('companyDetails');
        const company = this.currentProspect.company;
        
        // 🔍 DEBUG: Verificar dados recebidos
        console.log('🏢 renderCompanyInfo chamado');
        console.log('📋 Dados da empresa recebidos:', company);
        console.log('🔍 Tem demografia?', !!company.demografia);
        console.log('🔍 Tem analiseCompetitiva?', !!company.analiseCompetitiva);
        console.log('🔍 Tem mercadoLocal?', !!company.mercadoLocal);
        console.log('🔍 Tem economia?', !!company.economia);
        console.log('🔍 Tem coordenadas?', !!company.coordenadas);
        
        // Função auxiliar para formatar dados opcionais
        const formatOptional = (value, prefix = '', suffix = '') => {
            return value ? `${prefix}${value}${suffix}` : 'Não informado';
        };
        
        let html = `
            <div class="company-details">
                <h3><i class="fas fa-building"></i> ${company.fantasia || company.nome}</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>CNPJ:</strong> ${company.cnpj || 'Não informado'}
                    </div>
                    <div class="info-item">
                        <strong>Atividade:</strong> ${company.atividade_principal || 'Não informada'}
                    </div>
                    <div class="info-item">
                        <strong>CNAE:</strong> ${company.cnae || 'Não informado'}
                    </div>
                    <div class="info-item">
                        <strong>Localização:</strong> ${company.cidade || company.municipio || 'Não informada'}/${company.uf || 'Não informada'}
                    </div>
                    <div class="info-item">
                        <strong>Situação:</strong> ${company.situacao || 'Não informada'}
                    </div>
                    <div class="info-item">
                        <strong>Abertura:</strong> ${company.abertura || 'Não informada'}
                    </div>
                    <div class="info-item">
                        <strong>Capital Social:</strong> ${formatOptional(company.capital_social, 'R$ ')}
                    </div>
                    <div class="info-item">
                        <strong>CEP:</strong> ${company.cep || 'Não informado'}
                    </div>
                    <div class="info-item">
                        <strong>Endereço:</strong> ${[company.endereco, company.numero, company.bairro].filter(Boolean).join(', ') || 'Não informado'}
                    </div>
                </div>
                ${company.telefone ? `<p><i class="fas fa-phone"></i> <strong>Telefone:</strong> ${company.telefone}</p>` : ''}
                ${company.email ? `<p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${company.email}</p>` : ''}
            </div>
        `;

        // 🔍 NOVO: Seção de dados enriquecidos se disponíveis
        if (company.demografia || company.analiseCompetitiva || company.mercadoLocal || company.economia) {
            html += `
                <div class="enriched-data-section">
                    <h4><i class="fas fa-chart-line"></i> Análise Demográfica e de Mercado</h4>
            `;

            // Demografia Local
            if (company.demografia) {
                const demo = company.demografia;
                html += `
                    <div class="enriched-card">
                        <h5><i class="fas fa-users"></i> Demografia Local</h5>
                        <div class="enriched-grid">
                            <div class="enriched-item">
                                <span class="enriched-label">Estimativa Populacional (raio 5km):</span>
                                <span class="enriched-value">${demo.populacao_estimada_raio?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Cidades na Região:</span>
                                <span class="enriched-value">${demo.populacao_raio_5km?.toLocaleString() || 'N/A'} habitantes</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Densidade Comercial:</span>
                                <span class="enriched-value">${demo.densidade_estimada || 'N/A'} hab/km²</span>
                            </div>
                            ${demo.cidade_principal ? `
                            <div class="enriched-item">
                                <span class="enriched-label">Cidade Principal:</span>
                                <span class="enriched-value">${demo.cidade_principal.nome} (${demo.cidade_principal.populacao?.toLocaleString()})</span>
                            </div>
                            ` : ''}
                        </div>
                        ${demo.localidades_proximas?.length > 0 ? `
                            <p><strong>Localidades Próximas:</strong> ${demo.localidades_proximas.slice(0, 3).map(l => l.nome).join(', ')}</p>
                        ` : ''}
                    </div>
                `;
            }

            // Análise Competitiva
            if (company.analiseCompetitiva) {
                const comp = company.analiseCompetitiva;
                html += `
                    <div class="enriched-card">
                        <h5><i class="fas fa-store"></i> Análise Competitiva (5km)</h5>
                        <div class="enriched-grid">
                            <div class="enriched-item">
                                <span class="enriched-label">Estabelecimentos:</span>
                                <span class="enriched-value">${comp.total_estabelecimentos || 'N/A'}</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Densidade Comercial:</span>
                                <span class="enriched-value">${comp.densidade_comercial || 'N/A'} est/km²</span>
                            </div>
                        </div>
                        ${comp.tipos_predominantes?.length > 0 ? `
                            <p><strong>Tipos Predominantes:</strong> 
                                ${comp.tipos_predominantes.slice(0, 5).map(([tipo, qtd]) => `${tipo} (${qtd})`).join(', ')}
                            </p>
                        ` : ''}
                    </div>
                `;
            }

            // Mercado Local
            if (company.mercadoLocal) {
                const mercado = company.mercadoLocal;
                const scoreClass = mercado.score_atratividade >= 80 ? 'score-alto' : 
                                  mercado.score_atratividade >= 60 ? 'score-medio' : 
                                  mercado.score_atratividade >= 40 ? 'score-baixo' : 'score-muito-baixo';
                html += `
                    <div class="enriched-card">
                        <h5><i class="fas fa-crosshairs"></i> Mercado Local (2km)</h5>
                        <div class="enriched-grid">
                            <div class="enriched-item">
                                <span class="enriched-label">Score Atratividade:</span>
                                <span class="enriched-value ${scoreClass}">${mercado.score_atratividade || 'N/A'}/100</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Classificação:</span>
                                <span class="enriched-value">${mercado.classificacao_area || 'N/A'}</span>
                            </div>
                        </div>
                        ${mercado.amenidades_proximas ? `
                            <p><strong>Amenidades:</strong> 
                                ${Object.entries(mercado.amenidades_proximas).slice(0, 5).map(([tipo, qtd]) => `${tipo} (${qtd})`).join(', ')}
                            </p>
                        ` : ''}
                    </div>
                `;
            }

            // Dados Econômicos
            if (company.economia) {
                const econ = company.economia;
                html += `
                    <div class="enriched-card">
                        <h5><i class="fas fa-chart-bar"></i> Dados Econômicos Regionais</h5>
                        <div class="enriched-grid">
                            <div class="enriched-item">
                                <span class="enriched-label">Município:</span>
                                <span class="enriched-value">${econ.municipio || 'N/A'}</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Código IBGE:</span>
                                <span class="enriched-value">${econ.codigo_ibge || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Coordenadas (se disponíveis)
            if (company.coordenadas) {
                const coord = company.coordenadas;
                html += `
                    <div class="enriched-card">
                        <h5><i class="fas fa-map-pin"></i> Localização Geográfica</h5>
                        <div class="enriched-grid">
                            <div class="enriched-item">
                                <span class="enriched-label">Latitude:</span>
                                <span class="enriched-value">${coord.lat?.toFixed(6) || 'N/A'}</span>
                            </div>
                            <div class="enriched-item">
                                <span class="enriched-label">Longitude:</span>
                                <span class="enriched-value">${coord.lng?.toFixed(6) || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        }

        // � NOVO: Seção de Redes Sociais Manuais (se disponível)
        const socialData = this.getSocialMediaManualData();
        if (socialData && socialData.platforms.length > 0) {
            html += `
                <div class="social-media-manual-section">
                    <h4><i class="fab fa-instagram"></i> Análise de Redes Sociais</h4>
                    
                    <div class="social-analysis-summary">
                        <div class="social-metric-cards">
                            <div class="social-metric-card platform-card">
                                <div class="metric-icon">
                                    <i class="fas fa-share-alt"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>Plataformas</h6>
                                    <p><strong>${socialData.platforms.join(', ')}</strong></p>
                                    <small>Total de ${socialData.platforms.length} rede(s) social(is)</small>
                                </div>
                            </div>
                            
                            <div class="social-metric-card demographic-card">
                                <div class="metric-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>Alcance Total</h6>
                                    <p><strong>${socialData.totalFollowers.toLocaleString()}</strong> seguidores</p>
                                    <small>${socialData.totalPublications} publicações</small>
                                </div>
                            </div>
                            
                            <div class="social-metric-card opportunity-card">
                                <div class="metric-icon">
                                    <i class="fas fa-bullseye"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>Engajamento</h6>
                                    <p><strong>${socialData.engagementLevel}</strong></p>
                                    <small>Nível estimado de interação</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="social-platforms-detail" style="margin-top: 20px;">
                            <h6><i class="fas fa-chart-bar"></i> Detalhamento por Plataforma</h6>
                            <div class="platforms-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 10px;">
                                ${socialData.details.map(social => `
                                    <div class="platform-detail-card" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;">
                                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                            <i class="fab fa-${social.platform.toLowerCase().replace(' ', '-')}" style="font-size: 20px; color: #007bff; margin-right: 10px;"></i>
                                            <strong>${social.platform}</strong>
                                        </div>
                                        <div style="font-size: 14px; color: #6c757d;">
                                            📄 ${social.publications} publicações<br>
                                            👥 ${social.followers.toLocaleString()} seguidores<br>
                                            ➡️ ${social.following.toLocaleString()} seguindo
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="social-insights" style="margin-top: 20px;">
                            <div class="insight-section">
                                <h6><i class="fas fa-lightbulb"></i> Recomendações Baseadas na Análise</h6>
                                <ul class="insight-list">
                                    ${this.generateSocialRecommendations(socialData).map(rec => `<li>${rec}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="insight-section">
                                <h6><i class="fas fa-chart-line"></i> Oportunidades de Mercado Identificadas</h6>
                                <ul class="insight-list">
                                    ${this.generateMarketOpportunities(socialData).map(opp => `<li>${opp}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        <div class="social-integration-note" style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 5px; padding: 15px; margin-top: 15px;">
                            <i class="fas fa-info-circle" style="color: #28a745;"></i>
                            <strong>Integração Inteligente:</strong> 
                            As sugestões de produtos abaixo foram aprimoradas com base na análise das redes sociais cadastradas, 
                            combinando dados de engajamento, alcance e perfil da audiência.
                        </div>
                    </div>
                </div>
            `;
        }

        // �🖼️ NOVO: Seção de Análise de Imagem (se disponível)
        if (company.socialMediaAnalysis) {
            const analysis = company.socialMediaAnalysis;
            html += `
                <div class="social-media-analysis-section">
                    <h4><i class="fab fa-instagram"></i> Análise de Redes Sociais</h4>
                    
                    <div class="social-analysis-summary">
                        <div class="social-metric-cards">
                            <div class="social-metric-card platform-card">
                                <div class="metric-icon">
                                    <i class="fab fa-${analysis.platform.toLowerCase()}"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>${analysis.platform}</h6>
                                    <p><strong>~${analysis.profileData.estimatedFollowers.toLocaleString()}</strong> seguidores</p>
                                    <small>Taxa de engajamento: ${analysis.engagement.engagementRate}</small>
                                </div>
                            </div>
                            
                            <div class="social-metric-card demographic-card">
                                <div class="metric-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>Demografia Combinada</h6>
                                    <p><strong>${analysis.demographic.population.toLocaleString()}</strong> habitantes</p>
                                    <small>Renda média: ${analysis.demographic.avgIncome}</small>
                                </div>
                            </div>
                            
                            <div class="social-metric-card opportunity-card">
                                <div class="metric-icon">
                                    <i class="fas fa-bullseye"></i>
                                </div>
                                <div class="metric-content">
                                    <h6>Oportunidade</h6>
                                    <p><strong>${analysis.competitiveAnalysis.competitionLevel}</strong> competição</p>
                                    <small>Foco: ${analysis.audience.primaryAgeGroup} anos</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="social-insights">
                            <div class="insight-section">
                                <h6><i class="fas fa-lightbulb"></i> Recomendações Baseadas na Análise</h6>
                                <ul class="insight-list">
                                    ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="insight-section">
                                <h6><i class="fas fa-chart-line"></i> Oportunidades de Mercado Identificadas</h6>
                                <ul class="insight-list">
                                    ${analysis.marketOpportunities.map(opp => `<li>${opp}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        <div class="social-integration-note">
                            <i class="fas fa-info-circle"></i>
                            <strong>Integração Inteligente:</strong> 
                            As sugestões de produtos abaixo foram aprimoradas com base na análise da rede social, 
                            combinando dados de engajamento, audiência e perfil demográfico da região.
                        </div>
                    </div>
                </div>
            `;
        }

        // Análise de localização original (se não há dados enriquecidos)
        if (!company.demografia && this.currentProspect.location) {
            html += `
                <div class="location-analysis">
                    <h4><i class="fas fa-map-marker-alt"></i> Análise de Localização</h4>
                    <p><strong>Região:</strong> ${this.currentProspect.location.regiao}</p>
                    <p><strong>Perfil Econômico:</strong> ${this.currentProspect.location.perfil_economico}</p>
                    <p><strong>Alcance Estimado:</strong> ${this.currentProspect.location.populacao_estimada.toLocaleString()}</p>
                    <div class="concurrence-info">
                        <strong>Concorrência:</strong> ${this.currentProspect.location.concorrencia.nivel}
                        <br><small>${this.currentProspect.location.concorrencia.observacao}</small>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        
        // 🔍 DEBUG: Verificar se HTML foi inserido
        console.log('📝 HTML inserido no container:');
        console.log('  - Tamanho do HTML:', html.length, 'caracteres');
        console.log('  - Container após inserção:', container.innerHTML.length, 'caracteres');
        console.log('  - Primeira parte do HTML:', html.substring(0, 200) + '...');
        
        if (window.socialAnalyzer) {
            window.socialAnalyzer.setupSocialAnalysisUI();
        }
    }

    renderProductSuggestions() {
        const container = document.getElementById('productSuggestions');
        let suggestions = this.currentProspect.suggestions;
        
        console.log('🎯 Debug renderProductSuggestions:');
        console.log('  - Container encontrado:', !!container);
        console.log('  - currentProspect:', !!this.currentProspect);
        console.log('  - suggestions:', suggestions);
        console.log('  - suggestions.length:', suggestions?.length || 0);
        console.log('  - selectedPriceBand:', this.selectedPriceBand);
        
        if (!container) {
            console.error('❌ Container productSuggestions não encontrado!');
            return;
        }
        
        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = `
                <p class="suggestions-intro">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Nenhum produto foi sugerido. Verifique se o catálogo foi carregado corretamente.
                </p>
            `;
            console.warn('⚠️ Nenhuma sugestão de produto encontrada');
            return;
        }

        // ✅ APLICAR FAIXA DE PREÇO AOS PRODUTOS SUGERIDOS
        suggestions = suggestions.map(product => {
            if (product.prices && product.prices[this.selectedPriceBand]) {
                const newPrice = product.prices[this.selectedPriceBand];
                return {
                    ...product,
                    price: newPrice,
                    formattedPrice: (typeof newPrice === 'number') ? 
                        newPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 
                        String(newPrice)
                };
            }
            return {
                ...product,
                formattedPrice: product.formattedPrice || `R$ ${product.price.toFixed(2).replace('.', ',')}`
            };
        });
        
        container.innerHTML = `
            <p class="suggestions-intro">
                <i class="fas fa-lightbulb"></i> 
                Com base na análise da empresa e cardápio, recomendamos os seguintes produtos:
            </p>
            <div class="product-grid">
                ${suggestions.map((product, index) => `
                    <div class="product-card" data-code="${product.code}">
                        <div class="selection-indicator">
                            <i class="fas fa-check"></i>
                        </div>
                        <img src="${product.image}" alt="${product.name}" onerror="this.src='${this.getProductImage(product.code)}'">
                        <h4>${product.name}</h4>
                        <div class="price">${product.formattedPrice}</div>
                        <div class="unit">Por ${product.unit}</div>
                        <div class="reason">
                            <small><i class="fas fa-info-circle"></i> ${product.reason}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="selection-info">
                <p><i class="fas fa-mouse-pointer"></i> Clique nos produtos para selecionar/desselecionar</p>
                <p><strong id="selectedCount">0</strong> produtos selecionados</p>
            </div>
        `;

        // Atualizar referência para os produtos com preços corretos
        this.currentProspect.suggestions = suggestions;

        // Adicionar eventos de seleção
        this.setupProductSelection();
    }

    setupProductSelection() {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            card.addEventListener('click', () => {
                const code = card.dataset.code;
                
                if (card.classList.contains('selected')) {
                    // Desselecionar
                    card.classList.remove('selected');
                    this.selectedProducts = this.selectedProducts.filter(p => p.code !== code);
                } else {
                    // Selecionar - usar produto com preço atualizado
                    card.classList.add('selected');
                    const product = this.currentProspect.suggestions.find(p => p.code === code);
                    if (product) {
                        // Garantir que o produto tem a faixa de preço correta aplicada
                        const productWithCorrectPrice = {
                            ...product,
                            price: product.price,
                            formattedPrice: product.formattedPrice
                        };
                        this.selectedProducts.push(productWithCorrectPrice);
                    }
                }

                // Atualizar contador
                document.getElementById('selectedCount').textContent = this.selectedProducts.length;
                
                console.log('📦 Produtos selecionados:', this.selectedProducts.length);
                console.log('💰 Faixa atual:', this.selectedPriceBand);
            });
        });
    }

    renderSalesScript() {
        const container = document.getElementById('salesScript');
        const company = this.currentProspect.company;
        const location = this.currentProspect.location;
        const menu = this.currentProspect.menu;
        
        const script = this.generateSalesScript(company, location, menu);
        
        container.innerHTML = `
            <div class="script-content">
                <div class="script-header">
                    <i class="fas fa-phone"></i>
                    <strong>Script de Abordagem Personalizado</strong>
                    <div class="ai-controls" style="margin-top: 10px;">
                        <button onclick="prospeccaoManager.enhanceScriptWithAI()" class="btn btn-info btn-sm">
                            <i class="fas fa-robot"></i> Melhorar com IA
                        </button>
                    </div>
                </div>
                <div class="script-text">
                    ${script}
                </div>
            </div>
        `;
    }

    generateSalesScript(company, location, menu) {
        const nomeEmpresa = company.fantasia || company.nome;
        const cidade = company.municipio;
        const atividade = this.detectActivityType(company, menu);
        
        // 🖼️ NOVO: Incluir dados da análise de imagem se disponível
        const hasImageAnalysis = company.socialMediaAnalysis;
        const imageData = hasImageAnalysis ? company.socialMediaAnalysis : null;
        
        // 🤖 NOVO: Priorizar segmento selecionado pelo usuário
        const userSelectedSegment = window.selectedBusinessSegment || null;
        const actualActivity = userSelectedSegment || atividade;
        
        console.log('🎯 Segmentos disponíveis:', {
            userSelected: userSelectedSegment,
            cnaeActivity: atividade,
            final: actualActivity
        });
        
        let script = `
            <div class="script-section" data-section="abertura">
                <div class="section-header">
                    <h4>🎯 ABERTURA PERSONALIZADA</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('abertura')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content">
                    <p>Olá! Falo com o responsável pelas compras do(a) <strong>${nomeEmpresa}</strong>?</p>
                    <p>Meu nome é [SEU NOME], sou consultor comercial da <strong>PMG Atacadista</strong>, uma empresa com 30 anos no mercado de distribuição de alimentos e bebidas.</p>
                </div>
            </div>

            <div class="script-section" data-section="contextualizacao">
                <div class="section-header">
                    <h4>🏢 CONTEXTUALIZAÇÃO</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('contextualizacao')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content">
                    <p>Estive analisando o perfil da sua empresa aqui em <strong>${cidade}</strong> e vi que vocês trabalham com <strong>${userSelectedSegment || company.atividade_principal.toLowerCase()}</strong>.</p>
                    ${userSelectedSegment ? `
                        <div class="ai-insight" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; border-left: 4px solid #155724; padding: 12px; border-radius: 8px; margin: 10px 0;">
                            <i class="fas fa-user-check"></i> <strong>Segmento Personalizado:</strong> Com base na sua seleção, identificamos que o foco principal do negócio é <strong>${userSelectedSegment}</strong>, 
                            o que nos permite oferecer produtos mais direcionados para este tipo de estabelecimento.
                        </div>
                    ` : ''}
                    ${location.perfil_economico.includes('Alto') ? 
                        '<p>A região tem um excelente potencial de consumo, o que é uma grande oportunidade para crescimento!</p>' : 
                        '<p>Sabemos que a região tem suas particularidades, e por isso oferecemos condições especiais para parceiros locais.</p>'
                    }
                    ${hasImageAnalysis ? `
                        <p><strong>🔍 Análise Personalizada:</strong> Também analisamos a presença digital de vocês no ${imageData.platform} 
                        e vimos que têm um bom engajamento com ${imageData.profileData.estimatedFollowers.toLocaleString()} seguidores! 
                        Isso mostra que vocês já têm uma base sólida de clientes.</p>
                    ` : ''}
                </div>
            </div>
                    ${location.perfil_economico.includes('Alto') ? 
                        '<p>A região tem um excelente potencial de consumo, o que é uma grande oportunidade para crescimento!</p>' : 
                        '<p>Sabemos que a região tem suas particularidades, e por isso oferecemos condições especiais para parceiros locais.</p>'
                    }
                    ${hasImageAnalysis ? `
                        <p><strong>🔍 Análise Personalizada:</strong> Também analisamos a presença digital de vocês no ${imageData.platform} 
                        e vimos que têm um bom engajamento com ${imageData.profileData.estimatedFollowers.toLocaleString()} seguidores! 
                        Isso mostra que vocês já têm uma base sólida de clientes.</p>
                    ` : ''}
                </div>
            </div>

            ${hasImageAnalysis ? `
                <div class="script-section" data-section="oportunidade-digital">
                    <div class="section-header">
                        <h4>📱 OPORTUNIDADE DIGITAL</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('oportunidade-digital')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Com base na análise da sua rede social, identifiquei algumas oportunidades:</p>
                        <ul>
                            <li>📈 <strong>Engajamento de ${imageData.engagement.engagementRate}</strong> - Mostra que vocês têm clientes fiéis</li>
                            <li>🎯 <strong>Foco na faixa ${imageData.audience.primaryAgeGroup} anos</strong> - Público com bom poder de consumo</li>
                            <li>🌍 <strong>População regional de ${imageData.demographic.population.toLocaleString()}</strong> - Grande potencial de mercado</li>
                            <li>💰 <strong>Renda média ${imageData.demographic.avgIncome}</strong> - Permite trabalhar com produtos premium</li>
                        </ul>
                    </div>
                </div>
            ` : ''}

            <div class="script-section" data-section="proposta-valor">
                <div class="section-header">
                    <h4>🎯 PROPOSTA DE VALOR</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('proposta-valor')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content">
                    <p>Com nossos 30 anos de experiência, atendemos mais de 20.000 clientes e oferecemos:</p>
                    <ul>
                        <li>✅ <strong>Preços competitivos</strong> - Mas nosso objetivo é agregar valor ao seu negócio</li>
                        <li>✅ <strong>Entrega programada</strong> - Somos a maior distribuidora de bebidas e alimento de SP</li>
                        <li>✅ <strong>Qualidade garantida</strong> - Produtos das melhores marcas do mercado</li>
                        <li>✅ <strong>Condições especiais</strong> - Prazo e formas de pagamento flexíveis</li>
                        ${hasImageAnalysis && imageData.competitiveAnalysis.competitionLevel === 'Baixo' ? 
                            '<li>🎯 <strong>Exclusividade regional</strong> - Baixa concorrência na região = maior margem para vocês</li>' : ''
                        }
                    </ul>
                </div>
            </div>
        `;

        // Adicionar seção específica baseada no tipo de atividade (usando segmento detectado se disponível)
        if (actualActivity === 'pizzaria' || actualActivity.includes('pizza')) {
            script += `
                <div class="script-section" data-section="especializado">
                    <div class="section-header">
                        <h4>🍕 ESPECIALIZADO PARA PIZZARIAS</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('especializado')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Trabalhamos com produtos específicos para pizzarias:</p>
                        <ul>
                            <li>🥩 Calabresa, frango e outras proteinas de primeira qualidade</li>
                            <li>🧀 Queijos especiais para pizza</li>
                            <li>🍅 Molhos de tomate sem acidez</li>
                            <li>🫒 Azeitonas importadas e nacionais</li>
                            <li>🥓 Bacon em cubos e muito mais</li>
                        </ul>
                    </div>
                </div>
            `;
        } else if (actualActivity === 'lanchonete' || actualActivity.includes('lanche') || actualActivity.includes('hambúrguer')) {
            script += `
                <div class="script-section" data-section="especializado">
                    <div class="section-header">
                        <h4>🍔 ESPECIALIZADO PARA LANCHONETES</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('especializado')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Temos uma linha completa para lanchonetes:</p>
                        <ul>
                            <li>🍟 Batatas pré-fritas congeladas McCain e Simplot</li>
                            <li>🥓 Bacon fatiado e em cubos</li>
                            <li>🍖 Hambúrgueres artesanais</li>
                            <li>🧈 Maioneses e molhos especiais</li>
                            <li>🥤 Bebidas para revenda</li>
                        </ul>
                    </div>
                </div>
            `;
        } else if (actualActivity === 'restaurante' || actualActivity.includes('restaurante')) {
            script += `
                <div class="script-section" data-section="especializado">
                    <div class="section-header">
                        <h4>🍽️ ESPECIALIZADO PARA RESTAURANTES</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('especializado')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Oferecemos produtos premium para restaurantes:</p>
                        <ul>
                            <li>🥩 Carnes bovinas resfriadas de primeira</li>
                            <li>🍗 Frangos e aves selecionados</li>
                            <li>🍚 Arroz tipo 1 para pratos executivos</li>
                            <li>🥘 Temperos e condimentos especiais</li>
                            <li>🐟 Peixes e frutos do mar</li>
                        </ul>
                    </div>
                </div>
            `;
        } else if (actualActivity.includes('açaí') || actualActivity.includes('sorveteria')) {
            script += `
                <div class="script-section" data-section="especializado">
                    <div class="section-header">
                        <h4>🍦 ESPECIALIZADO PARA AÇAÍ/SORVETERIA</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('especializado')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Produtos específicos para açaí e sorveteria:</p>
                        <ul>
                            <li>🫐 Açaí premium congelado</li>
                            <li>🍓 Frutas e complementos</li>
                            <li>🥜 Mix de castanhas e granolas</li>
                            <li>🍫 Chocolates e coberturas</li>
                            <li>🥤 Sucos e vitaminas</li>
                        </ul>
                    </div>
                </div>
            `;
        } else if (actualActivity.includes('padaria') || actualActivity.includes('confeitaria')) {
            script += `
                <div class="script-section" data-section="especializado">
                    <div class="section-header">
                        <h4>� ESPECIALIZADO PARA PADARIA/CONFEITARIA</h4>
                        <button onclick="prospeccaoManager.copyScriptSection('especializado')" class="copy-section-btn" title="Copiar apenas esta seção">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="section-content">
                        <p>Linha completa para panificação:</p>
                        <ul>
                            <li>🌾 Farinhas especiais e fermentos</li>
                            <li>🧈 Margarinas e gorduras especiais</li>
                            <li>🍫 Chocolates e recheios</li>
                            <li>🥚 Ovos e laticínios</li>
                            <li>🍞 Embalagens para pães e doces</li>
                        </ul>
                    </div>
                </div>
            `;
        }

        script += `
            <div class="script-section" data-section="proximos-passos">
                <div class="section-header">
                    <h4>�🤝 PRÓXIMOS PASSOS</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('proximos-passos')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content">
                    <p>Gostaria de apresentar nossos produtos?</p>
                    <p>Posso enviar um catálogo personalizado com sugestões específicas para o seu negócio.</p>
                    <p><strong>Quando seria um bom horário para conversarmos com mais detalhes?</strong></p>
                </div>
            </div>

            <div class="script-section" data-section="contato">
                <div class="section-header">
                    <h4>📞 INFORMAÇÕES DE CONTATO</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('contato')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content contact-info">
                    <p><strong>PMG Atacadista - 30 anos de tradição</strong></p>
                    <p>🌐 Site: www.pmg.com.br</p>
                </div>
            </div>

            <div class="script-section" data-section="dicas">
                <div class="section-header">
                    <h4>💡 DICAS IMPORTANTES</h4>
                    <button onclick="prospeccaoManager.copyScriptSection('dicas')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content">
                    <ul>
                        <li>🎯 Demonstre conhecimento sobre o negócio do cliente</li>
                        <li>👂 Escute as necessidades específicas</li>
                        <li>💰 Enfatize o custo-benefício da parceria</li>
                        <li>⏰ Seja pontual e cumpra os compromissos</li>
                        <li>📊 Prepare uma proposta personalizada após a visita</li>
                    </ul>
                </div>
            </div>
        `;

        return script;
    }

    copySalesScript() {
        const scriptElement = document.querySelector('.script-text');
        const text = scriptElement.innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copySalesScript');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('btn-success');
            }, 2000);
        }).catch(err => {
            alert('❌ Erro ao copiar texto: ' + err.message);
        });
    }

    async copyOfferText() {
        try {
            // ✅ REUTILIZAR MÉTODO DO CATALOG.JS
            if (!window.catalogManager) {
                console.error('❌ CatalogManager não disponível');
                alert('❌ Sistema de catálogo não disponível');
                return;
            }

            if (!this.selectedProducts || this.selectedProducts.length === 0) {
                alert('❌ Nenhum produto selecionado para gerar oferta');
                return;
            }

            console.log('📝 Gerando texto da oferta usando método do catálogo...');

            // Preparar produtos no formato esperado pelo catalog.js
            const catalogProducts = this.selectedProducts.map(product => ({
                name: product.name,
                code: product.code || 'N/A',
                formattedPrice: `R$ ${product.price.toFixed(2)}`,
                unit: product.unit || 'UN',
                category: product.category || 'Outros'
            }));

            // ✅ USAR O MÉTODO generateTextOffers DO CATALOG.JS
            // Temporariamente definir produtos selecionados no catalogManager
            const originalSelected = window.catalogManager.selectedProducts;
            window.catalogManager.selectedProducts = catalogProducts;

            // Gerar texto usando o método existente
            window.catalogManager.generateTextOffers();

            // Restaurar produtos originais
            window.catalogManager.selectedProducts = originalSelected;

            // Feedback visual
            const button = document.getElementById('copyOfferText');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '✅ Texto Copiado!';
                button.style.backgroundColor = '#28a745';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            }

            console.log('✅ Texto da oferta gerado e copiado usando método do catálogo');

        } catch (error) {
            console.error('❌ Erro ao copiar texto da oferta:', error);
            alert('❌ Erro ao copiar texto da oferta');
        }
    }

generateOfferText(nomeEmpresa, cidade, company) {
    const selectedProductsText = this.selectedProducts.length > 0 
        ? this.selectedProducts.map(product => 
            `• ${product.name} - R$ ${product.price.toFixed(2)}/${product.unit}`
          ).join('\n')
        : 'Produtos selecionados conforme análise do seu negócio';

    return `🎯 PROPOSTA COMERCIAL PERSONALIZADA
═══════════════════════════════════════

Empresa: ${nomeEmpresa}
Cidade: ${cidade}
CNPJ: ${company.cnpj || 'Não informado'}

═══════════════════════════════════════

Olá! Falo com o responsável pelas compras do(a) ${nomeEmpresa}?

Meu nome é [SEU NOME], sou consultor comercial da PMG Atacadista, uma empresa com 30 anos no mercado de distribuição de alimentos e bebidas.

Estive analisando o perfil da sua empresa aqui em ${cidade} e vi que vocês trabalham com ${company.atividade_principal?.toLowerCase() || 'alimentação'}.

🏆 PRODUTOS RECOMENDADOS:
${selectedProductsText}

💼 NOSSOS DIFERENCIAIS:
✅ 30 anos de experiência no mercado
✅ Mais de 20.000 clientes atendidos
✅ Entrega rápida e pontual
✅ Condições especiais de pagamento
✅ Suporte técnico especializado

📞 VAMOS CONVERSAR?
Gostaria de apresentar nossos produtos?

Quando seria um bom horário para conversarmos com mais detalhes?

═══════════════════════════════════════
🌐 PMG Atacadista - 30 anos de tradição
Site: www.pmg.com.br
═══════════════════════════════════════`;
}

async copyOfferImage() {
    try {
        console.log('📸 Iniciando geração de imagem com lógica replicada do catálogo...');
        
        if (!this.selectedProducts || this.selectedProducts.length === 0) {
            alert('❌ Nenhum produto selecionado para gerar imagem');
            return;
        }

        console.log(`🖼️ Gerando imagem para ${this.selectedProducts.length} produtos...`);
        
        // Usar a função replicada do catálogo
        await this.generateImageOffersVisualProsp();

        // Feedback visual
        const button = document.getElementById('copyOfferImage');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Imagem Copiada!';
            button.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.backgroundColor = '';
            }, 2000);
        }

        console.log('✅ Imagem da oferta gerada e copiada usando lógica replicada');

    } catch (error) {
        console.error('❌ Erro ao gerar imagem da oferta:', error);
        alert(`❌ Erro ao gerar imagem: ${error.message}`);
    }
}

// ✅ FUNÇÃO PARA ESCOLHER NÚMERO ÓTIMO DE PRODUTOS POR LINHA
selectOptimalProductsPerRowProsp(totalProducts) {
    if (totalProducts <= 1) return 1;
    if (totalProducts <= 4) return 2;
    if (totalProducts <= 6) return 3;
    if (totalProducts <= 12) return 4;
    return 5; // Para muitos produtos, máximo 5 por linha
}

// ✅ OBTER DIMENSÕES RESPONSIVAS (REPLICADAS DO CATÁLOGO)
getResponsiveDimensionsProsp(productsPerRow) {
    let dimensions = {};
    
    switch(productsPerRow) {
        case 1: // Layout de destaque - dimensões maiores
            dimensions = {
                productWidth: 1200,
                productHeight: 1400,
                imageAreaHeight: 700,
                padding: 60,
                logoMaxHeight: 280,
                logoMaxWidth: 800,
                baseFontSize: 64,
                priceFontSize: 90,
                unitFontSize: 44,
                spacing: {
                    imageToPrice: 10,
                    priceToUnit: 10,
                    unitToTitle: 50
                }
            };
            break;
            
        case 2: // Layout médio
            dimensions = {
                productWidth: 1000,
                productHeight: 1200,
                imageAreaHeight: 600,
                padding: 50,
                logoMaxHeight: 240,
                logoMaxWidth: 650,
                baseFontSize: 56,
                priceFontSize: 80,
                unitFontSize: 40,
                spacing: {
                    imageToPrice: 8,
                    priceToUnit: 8,
                    unitToTitle: 45
                }
            };
            break;
            
        case 3: // Layout padrão
            dimensions = {
                productWidth: 900,
                productHeight: 1080,
                imageAreaHeight: 500,
                padding: 40,
                logoMaxHeight: 200,
                logoMaxWidth: 550,
                baseFontSize: 48,
                priceFontSize: 80,
                unitFontSize: 40,
                spacing: {
                    imageToPrice: 7,
                    priceToUnit: 7,
                    unitToTitle: 40
                }
            };
            break;
            
        case 4: // Layout compacto
            dimensions = {
                productWidth: 700,
                productHeight: 900,
                imageAreaHeight: 400,
                padding: 30,
                logoMaxHeight: 160,
                logoMaxWidth: 450,
                baseFontSize: 40,
                priceFontSize: 70,
                unitFontSize: 36,
                spacing: {
                    imageToPrice: 6,
                    priceToUnit: 6,
                    unitToTitle: 35
                }
            };
            break;
            
        case 5: // Layout muito compacto
        default:
            dimensions = {
                productWidth: 600,
                productHeight: 780,
                imageAreaHeight: 350,
                padding: 25,
                logoMaxHeight: 120,
                logoMaxWidth: 350,
                baseFontSize: 36,
                priceFontSize: 60,
                unitFontSize: 32,
                spacing: {
                    imageToPrice: 5,
                    priceToUnit: 5,
                    unitToTitle: 30
                }
            };
            break;
    }
    
    return dimensions;
}

// ✅ CARREGAR FUNDO DINÂMICO (LÓGICA REPLICADA DO CATÁLOGO)
async loadDynamicBackgroundProsp(ctx, canvas, nomeLimpo) {
    try {
        console.log('🌄 Carregando fundo dinâmico para:', nomeLimpo);
        
        // Usar a mesma lógica do catálogo para tradução e busca
        const categoriaMap = {
            'pizza': 'pizza',
            'pizzaria': 'pizza restaurant',
            'pastel': 'fried pastry',
            'hamburguer': 'hamburger',
            'lanche': 'sandwich',
            'restaurante': 'restaurant',
            'bar': 'bar',
            'padaria': 'bakery',
            'confeitaria': 'bakery',
            'acougue': 'butcher shop',
            'supermercado': 'supermarket',
            'mercado': 'grocery store',
            'cafe': 'coffee',
            'cafeteria': 'coffee shop',
            'sorveteria': 'ice cream',
            'doceria': 'candy shop',
            'churrascaria': 'barbecue',
            'japonesa': 'japanese food',
            'chinese': 'chinese food',
            'italiana': 'italian food',
            'mexican': 'mexican food',
            'food': 'food'
        };

        // Limpar e processar o nome
        const palavrasUteis = nomeLimpo
            .split(' ')
            .filter(p => p.length > 2)
            .filter(p => !['ltda', 'eireli', 'me', 'epp', 'comercio', 'industria', 'servicos'].includes(p));

        let termoBusca = nomeLimpo || 'food';
        
        // Verificar se alguma palavra mapeia para categoria conhecida
        for (const [pt, en] of Object.entries(categoriaMap)) {
            if (nomeLimpo.includes(pt)) {
                termoBusca = en;
                break;
            }
        }

        // Se não encontrou categoria específica, usar as palavras úteis
        if (termoBusca === nomeLimpo && palavrasUteis.length > 0) {
            const palavrasTraduzidas = palavrasUteis.map(palavra => {
                return categoriaMap[palavra] || palavra;
            });
            termoBusca = palavrasTraduzidas.join(' ');
        }

        console.log('🎯 Termo para busca de fundo:', termoBusca);

        // Gerar seed baseado no termo
        const seed = Math.abs(termoBusca.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
        
        const w = Math.max(1200, Math.floor(canvas.width));
        const h = Math.max(800, Math.floor(canvas.height));
        
        // Lista de URLs com fallbacks (igual catálogo)
        const urlsList = [
            `https://loremflickr.com/${w}/${h}/${encodeURIComponent(termoBusca)}?lock=${seed}`,
            `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(termoBusca)},food`,
            `https://picsum.photos/seed/${encodeURIComponent(termoBusca)}-${seed}/${w}/${h}`,
            `https://loremflickr.com/${w}/${h}/food,meal?lock=${seed}`,
            `https://picsum.photos/${w}/${h}?random=${seed}`
        ];

        console.log('🔗 URLs de fundo dinâmico:', urlsList);
        
        let bg = null;
        
        // Tentar cada URL em sequência (igual catálogo)
        for (let i = 0; i < urlsList.length && !bg; i++) {
            const url = urlsList[i];
            const source = url.includes('loremflickr') ? 'LoremFlickr' : 
                          url.includes('unsplash') ? 'Unsplash' : 
                          url.includes('picsum') ? 'Picsum' : 'Desconhecida';
                          
            console.log(`🔄 Tentativa ${i + 1}: ${source}`);
            
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const blob = await response.blob();
                if (blob.size < 1000) throw new Error('Imagem muito pequena');
                
                const imageUrl = URL.createObjectURL(blob);
                
                bg = new Image();
                await new Promise((resolve, reject) => {
                    bg.onload = resolve;
                    bg.onerror = reject;
                    bg.src = imageUrl;
                });
                
                if (bg.naturalWidth < 100 || bg.naturalHeight < 100) {
                    throw new Error('Dimensões inválidas');
                }
                
                console.log(`✅ Fundo carregado via ${source}: ${bg.naturalWidth}x${bg.naturalHeight}`);
                URL.revokeObjectURL(imageUrl);
                break;
                
            } catch (error) {
                console.warn(`⚠️ Falha ${source}:`, error.message);
                bg = null;
            }
        }
        
        if (bg) {
            // Desenhar fundo cobrindo todo o canvas
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
            
            // Aplicar overlay para legibilidade (igual catálogo)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            console.log('✅ Fundo dinâmico aplicado com sucesso');
        } else {
            throw new Error('Nenhuma fonte de imagem funcionou');
        }
        
    } catch (error) {
        console.warn('⚠️ Erro ao carregar fundo dinâmico:', error.message);
        console.log('🤍 Aplicando fundo branco como fallback');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ✅ DESENHAR LOGO RESPONSIVO
async drawResponsiveLogoProsp(ctx, canvas, dims) {
    try {
        console.log('🖼️ Carregando logo...');
        
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => {
                console.warn('⚠️ Logo não encontrada, continuando sem logo');
                resolve();
            };
            img.src = './logo.png';
        });

        if (img.complete && img.naturalWidth > 0) {
            // Calcular dimensões mantendo proporção
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            let logoWidth = dims.logoMaxWidth;
            let logoHeight = logoWidth / aspectRatio;
            
            if (logoHeight > dims.logoMaxHeight) {
                logoHeight = dims.logoMaxHeight;
                logoWidth = logoHeight * aspectRatio;
            }
            
            // Centralizar logo
            const logoX = (canvas.width - logoWidth) / 2;
            const logoY = 30;
            
            ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);
            console.log(`✅ Logo desenhada: ${logoWidth}x${logoHeight} na posição (${logoX}, ${logoY})`);
            
            return { width: logoWidth, height: logoHeight, x: logoX, y: logoY };
        } else {
            console.log('ℹ️ Logo não disponível, continuando sem logo');
            return null;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar logo:', error);
        return null;
    }
}

// ✅ DESENHAR PRODUTO INDIVIDUAL (REPLICADO DO CATÁLOGO)
async drawProductProsp(ctx, product, x, y, width, height, dims) {
    try {
        // Fundo do produto
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, width, height);
        
        // Borda
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // ✅ USAR EXATAMENTE A MESMA LÓGICA DO CATÁLOGO
        const centerX = x + width / 2;
        const imageAreaHeight = dims.imageAreaHeight;
        const imageAreaTop = y + 20;
        const imageAreaBottom = imageAreaTop + imageAreaHeight;
        
        // Posições exatas como no catálogo
        const priceBoxTop = imageAreaBottom + dims.spacing.imageToPrice;
        const unitTop = priceBoxTop + Math.floor(dims.priceFontSize * 1.4) + dims.spacing.priceToUnit;
        const unitBoxHeight = Math.floor(dims.unitFontSize * 1.6);
        const titleTopNew = unitTop + unitBoxHeight + dims.spacing.unitToTitle;

        // Imagem do produto
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`⚠️ Erro ao carregar imagem: ${product.image}`);
                    resolve(); // Continuar sem imagem
                };
                img.src = product.image || './logo.png';
            });

            if (img.complete && img.naturalWidth > 0) {
                // Calcular dimensões da imagem mantendo proporção
                const imageAspectRatio = img.naturalWidth / img.naturalHeight;
                let imgWidth = width - 40;
                let imgHeight = imgWidth / imageAspectRatio;
                
                if (imgHeight > imageAreaHeight) {
                    imgHeight = imageAreaHeight;
                    imgWidth = imgHeight * imageAspectRatio;
                }
                
                const imgX = centerX - imgWidth / 2;
                const imgY = imageAreaTop + (imageAreaHeight - imgHeight) / 2;
                
                ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
            }
        } catch (imgError) {
            console.warn('⚠️ Erro ao processar imagem do produto:', imgError);
        }

        // ✅ FORMATAÇÃO DE PREÇO IDÊNTICA AO CATÁLOGO
        const priceBigFont = `bold ${dims.priceFontSize}px Arial`;
        const priceSmallFont = `bold ${Math.floor(dims.priceFontSize * 0.55)}px Arial`;
        const unitFont = `${dims.unitFontSize}px Arial`;
        
        // Calcular dimensões automaticamente como no catálogo
        const totalPriceWidth = (() => {
            const parts = String(product.formattedPrice).split(',');
            const bigText = parts[0] + ',';
            const smallText = parts[1] || '';
            ctx.font = priceBigFont; const w1 = ctx.measureText(bigText).width;
            ctx.font = priceSmallFont; const w2 = ctx.measureText(smallText).width;
            return w1 + w2;
        })();
        
        ctx.font = unitFont; 
        const unitText = `(${product.unit || 'UN'})`;
        const unitWidth = ctx.measureText(unitText).width;
        
        // Fundo automático do preço (igual catálogo)
        const priceBoxWidth = totalPriceWidth + 40;
        const priceBoxHeight = Math.floor(dims.priceFontSize * 1.4);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(centerX - priceBoxWidth/2, priceBoxTop - 10, priceBoxWidth, priceBoxHeight);
        
        // Fundo automático da unidade (igual catálogo)
        const unitBoxWidth = unitWidth + 40;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(centerX - unitBoxWidth/2, unitTop - 8, unitBoxWidth, unitBoxHeight);

        // Desenhar preço com centavos menores (igual catálogo)
        const parts = String(product.formattedPrice).split(',');
        const bigText = parts[0] + ',';
        const smallText = parts[1] || '';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#dc3545';
        ctx.font = priceBigFont; 
        const wBig = ctx.measureText(bigText).width;
        const startX = centerX - (wBig + (ctx.font = priceSmallFont, ctx.measureText(smallText).width)) / 2;
        ctx.font = priceBigFont; 
        ctx.fillText(bigText, startX, priceBoxTop + Math.floor(priceBoxHeight * 0.7));
        ctx.font = priceSmallFont; 
        ctx.fillText(smallText, startX + wBig, priceBoxTop + Math.floor(priceBoxHeight * 0.6));

        // Desenhar unidade centralizada (igual catálogo)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#dc3545';
        ctx.font = unitFont;
        ctx.fillText(unitText, centerX, unitTop + Math.floor(unitBoxHeight * 0.7));

        // Nome do produto com fundo automático (igual catálogo)
        ctx.fillStyle = '#333333';
        ctx.font = `bold ${dims.baseFontSize}px Arial`;
        ctx.textAlign = 'center';
        
        const maxNameWidth = width - 60;
        const titleLines = this.wrapTextProsp(ctx, product.name, maxNameWidth);
        const lineHeight = Math.floor(dims.baseFontSize * 1.21);
        let titleBoxWidth = Math.max(...titleLines.map(l => ctx.measureText(l).width)) + 60;
        titleBoxWidth = Math.min(titleBoxWidth, width - 40);
        const titleBoxHeight = titleLines.length * lineHeight + 30;
        
        // Desenhar fundo do título
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(centerX - titleBoxWidth/2, titleTopNew - 5, titleBoxWidth, titleBoxHeight);
        
        // Desenhar linhas do título
        titleLines.forEach((line, i) => {
            ctx.fillStyle = '#333333';
            const textY = titleTopNew + (titleBoxHeight / 2) - ((titleLines.length - 1) * lineHeight / 2) + (i * lineHeight);
            ctx.fillText(line, centerX, textY);
        });

        console.log(`✅ Produto desenhado: ${product.name} - ${product.formattedPrice}`);

    } catch (error) {
        console.error('❌ Erro ao desenhar produto:', error);
        
        // Desenhar placeholder em caso de erro
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        ctx.fillStyle = '#6c757d';
        ctx.font = '14px Arial';
        ctx.fillText('Erro ao', x + 10, y + height / 2 - 10);
        ctx.fillText('carregar', x + 10, y + height / 2 + 10);
    }
}

// ✅ QUEBRAR TEXTO EM LINHAS
wrapTextProsp(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
            }
            currentLine = word;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// ✅ COPIAR CANVAS COMO IMAGEM
async copyCanvasAsImageProsp(canvas) {
    try {
        // Converter canvas para blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });

        // Usar Clipboard API se disponível
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);
            console.log('✅ Imagem copiada para clipboard usando Clipboard API');
        } else {
            // Fallback: criar link de download
            console.log('⚠️ Clipboard API não suportada, criando download');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `oferta-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Mostrar notificação
            alert('📸 Imagem salva como download (clipboard não suportado neste navegador)');
        }
    } catch (error) {
        console.error('❌ Erro ao copiar imagem:', error);
        throw error;
    }
}

// ✅ FUNÇÃO REPLICADA DO CATALOG.JS PARA PROSPECÇÃO
async generateImageOffersVisualProsp() {
    console.log('🧪 TESTE DE FUNDO DINÂMICO (Prospecção):');
    console.log('  - this.dynamicBackground:', this.dynamicBackground);
    console.log('  - localStorage.dynamicBgProsp:', localStorage.getItem('dynamicBgProsp'));
    console.log('  - Checkbox estado:', document.getElementById('toggle-dynamic-bg-prosp')?.checked);

    try {
        // ✅ NOVA LÓGICA AUTO-AJUSTÁVEL PARA PRODUTOS POR LINHA (1-5)
        const productsPerRow = this.selectOptimalProductsPerRowProsp(this.selectedProducts.length);
        
        // ✅ OBTER DIMENSÕES RESPONSIVAS BASEADAS NO LAYOUT
        const dims = this.getResponsiveDimensionsProsp(productsPerRow);
        
        const productWidth = dims.productWidth;
        const productHeight = dims.productHeight;
        const padding = dims.padding;
        
        const rows = Math.ceil(this.selectedProducts.length / productsPerRow);
        const canvasWidth = productsPerRow * (productWidth + padding) + padding;
        
        // Logo responsivo baseado nas dimensões do layout
        let logoSectionHeight = dims.logoMaxHeight + 60;
        const canvasHeight = logoSectionHeight + (rows * (productHeight + padding)) + padding;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Fundo dinâmico ou branco (inline)
        console.log('� Status do fundo dinâmico:', this.dynamicBackground);
        if (this.dynamicBackground) {
            console.log('�️ Tentando carregar fundo dinâmico...');
            
            // ✅ USAR O TÍTULO COMPLETO DO PRODUTO 1 LIMPO PARA O FUNDO
            const produto1 = this.selectedProducts[0];
            
            // Limpar o nome do produto removendo números, medidas e caracteres especiais
            const nomeLimpo = produto1.name
                .toLowerCase()
                // Remove unidades de medida comuns
                .replace(/\d+(\.\d+)?\s*(kg|g|ml|l|un|pct|cx|lt|bd|vd|fr|bag|bis|pt|sc|fd|fdo|pç|barr)/gi, '')
                // Remove números restantes
                .replace(/\d+/g, '')
                // Remove caracteres especiais, mantém letras e acentos
                .replace(/[^a-záàâãäçéèêëíìîïóòôõöúùûüñ\s]/gi, '')
                // Remove espaços múltiplos e espaços no início/fim
                .replace(/\s+/g, ' ')
                .trim();
            
            console.log('🎯 Produto 1 nome original:', produto1.name);
            console.log('🧽 Nome limpo para busca:', nomeLimpo);

            // ✅ CARREGAR FUNDO DINÂMICO
            await this.loadDynamicBackgroundProsp(ctx, canvas, nomeLimpo);
        } else {
            console.log('🤍 Usando fundo branco');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // ✅ DESENHAR LOGO RESPONSIVO
        const logoResult = await this.drawResponsiveLogoProsp(ctx, canvas, dims);
        
        // ✅ DESENHAR PRODUTOS COM LAYOUT RESPONSIVO
        console.log(`📐 Layout escolhido: ${productsPerRow} produtos por linha para ${this.selectedProducts.length} produtos total`);
        
        let currentX = padding;
        let currentY = logoSectionHeight;
        
        for (let i = 0; i < this.selectedProducts.length; i++) {
            const row = Math.floor(i / productsPerRow);
            const col = i % productsPerRow;
            
            const x = padding + col * (productWidth + padding);
            const y = logoSectionHeight + row * (productHeight + padding);
            
            const product = this.selectedProducts[i];
            
            console.log(`🎨 Desenhando produto ${i + 1}: ${product.name} na posição (${x}, ${y})`);
            
            await this.drawProductProsp(ctx, product, x, y, productWidth, productHeight, dims);
        }

        // ✅ COPIAR PARA CLIPBOARD
        await this.copyCanvasAsImageProsp(canvas);
        
        console.log(`✅ Imagem visual gerada com ${this.selectedProducts.length} produtos em layout ${productsPerRow}x${rows}`);

    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        throw error;
    }
}

    // ==================== MÉTODO FALLBACK PARA GERAÇÃO DE IMAGEM ====================

    async copyOfferImageFallback() {
        try {
            console.log('📸 Usando método fallback para geração de imagem...');
            
            if (!this.selectedProducts || this.selectedProducts.length === 0) {
                this.showCopyFeedback('❌ Nenhum produto selecionado', 'error');
                return;
            }

            // Criar canvas simples
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Configurar dimensões
            canvas.width = 800;
            canvas.height = 600 + (this.selectedProducts.length * 80);
            
            // Fundo branco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Título
            ctx.fillStyle = '#007bff';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('OFERTA PERSONALIZADA', canvas.width / 2, 50);
            
            // Data
            ctx.fillStyle = '#666666';
            ctx.font = '16px Arial';
            ctx.fillText(new Date().toLocaleDateString('pt-BR'), canvas.width / 2, 80);
            
            // Linha separadora
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 100);
            ctx.lineTo(canvas.width - 50, 100);
            ctx.stroke();
            
            // Produtos
            let yPos = 140;
            this.selectedProducts.forEach((product, index) => {
                // Número do produto
                ctx.fillStyle = '#007bff';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`${index + 1}.`, 60, yPos);
                
                // Nome do produto
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 16px Arial';
                const productName = product.name.length > 50 ? product.name.substring(0, 47) + '...' : product.name;
                ctx.fillText(productName, 100, yPos);
                
                // Preço
                ctx.fillStyle = '#28a745';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`R$ ${product.price.toFixed(2)}`, canvas.width - 60, yPos);
                
                // Código e unidade
                ctx.fillStyle = '#666666';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`Cód: ${product.code || 'N/A'} | ${product.unit || 'UN'}`, 100, yPos + 20);
                
                yPos += 60;
            });
            
            // Rodapé
            const footerY = canvas.height - 60;
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(20, footerY, canvas.width - 40, 40);
            
            ctx.fillStyle = '#007bff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PMG - A entrega nos move até você!', canvas.width / 2, footerY + 25);
            
            // Converter para blob e copiar
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    this.showCopyFeedback('❌ Erro ao gerar imagem', 'error');
                    return;
                }
                
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    
                    this.showCopyFeedback('✅ Imagem copiada (método simples)', 'success');
                    
                    // Feedback visual no botão
                    const button = document.getElementById('copyOfferImage');
                    if (button) {
                        const originalText = button.innerHTML;
                        button.innerHTML = '✅ Imagem Copiada!';
                        button.style.backgroundColor = '#28a745';
                        
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.style.backgroundColor = '';
                        }, 2000);
                    }
                    
                } catch (clipboardError) {
                    console.error('❌ Erro ao copiar para área de transferência:', clipboardError);
                    
                    // Fallback: download da imagem
                    const link = document.createElement('a');
                    link.download = `oferta-${new Date().getTime()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    this.showCopyFeedback('📥 Imagem baixada como arquivo', 'info');
                }
            }, 'image/png');
            
        } catch (error) {
            console.error('❌ Erro no método fallback:', error);
            this.showCopyFeedback(`❌ Erro: ${error.message}`, 'error');
        }
    }

    // ==================== MÉTODOS DE ESTATÍSTICAS ====================

    updateStats() {
        // Atualizar elementos de estatísticas na interface se existirem
        const prospectCountElement = document.getElementById('prospect-count');
        const offerCountElement = document.getElementById('offer-count');
        
        if (prospectCountElement) {
            prospectCountElement.textContent = this.prospectCount;
        }
        
        if (offerCountElement) {
            offerCountElement.textContent = this.offerCount;
        }
        
        // Salvar no localStorage
        localStorage.setItem('prospeccaoStats', JSON.stringify({
            prospectCount: this.prospectCount,
            offerCount: this.offerCount
        }));
    }

    loadStats() {
        try {
            const stats = JSON.parse(localStorage.getItem('prospeccaoStats') || '{}');
            this.prospectCount = stats.prospectCount || 0;
            this.offerCount = stats.offerCount || 0;
            this.updateStats();
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    // ==================== MÉTODOS DE FEEDBACK ====================

    showCopyFeedback(message, type = 'success') {
        // Remove feedback anterior se existir
        const existing = document.querySelector('.copy-feedback');
        if (existing) existing.remove();
        
        const feedback = document.createElement('div');
        feedback.className = `copy-feedback ${type}`;
        feedback.textContent = message;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10001;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => feedback.remove(), 300);
        }, 4000);
    }

    // 🔍 NOVO: Função para enriquecer dados do cliente com informações demográficas
    async enrichClientData() {
        const cnpjInput = document.getElementById('cnpj');
        const cnpj = cnpjInput.value.replace(/\D/g, '');
        
        if (!cnpj) {
            this.showFeedback('Por favor, digite um CNPJ primeiro.', 'warning');
            return;
        }

        if (cnpj.length !== 14) {
            this.showFeedback('CNPJ deve conter 14 dígitos.', 'error');
            return;
        }

        const enrichBtn = document.getElementById('enrichData');
        const originalText = enrichBtn.innerHTML;
        
        try {
            // Mostrar loading
            enrichBtn.disabled = true;
            enrichBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enriquecendo...';
            
            this.showFeedback('🔍 Buscando dados básicos do CNPJ...', 'info');
            
            // Primeiro buscar dados básicos do CNPJ (usando as funções existentes)
            let dadosBasicos = null;
            
            // Tentar BrasilAPI primeiro
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
                if (response.ok) {
                    const data = await response.json();
                    dadosBasicos = {
                        nome: data.legal_name,
                        fantasia: data.trade_name || data.legal_name,
                        email: data.email,
                        telefone: data.phone,
                        endereco: data.address?.street,
                        numero: data.address?.number,
                        bairro: data.address?.district,
                        cidade: data.address?.city,
                        uf: data.address?.state,
                        cep: data.address?.zip_code,
                        cnae: data.main_activity?.code || data.primary_activity?.[0]?.code,
                        atividade_principal: data.main_activity?.text || data.primary_activity?.[0]?.text
                    };
                }
            } catch (error) {
                console.warn('Erro na BrasilAPI:', error);
            }
            
            // Se não conseguiu, tentar CNPJ.ws
            if (!dadosBasicos || !dadosBasicos.nome) {
                try {
                    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`);
                    if (response.ok) {
                        const data = await response.json();
                        dadosBasicos = {
                            nome: data.razao_social,
                            fantasia: data.estabelecimento?.nome_fantasia || data.razao_social,
                            email: data.estabelecimento?.email,
                            telefone: data.estabelecimento?.telefone1,
                            endereco: data.estabelecimento?.logradouro,
                            numero: data.estabelecimento?.numero,
                            bairro: data.estabelecimento?.bairro,
                            cidade: data.estabelecimento?.cidade?.nome,
                            uf: data.estabelecimento?.estado?.sigla,
                            cep: data.estabelecimento?.cep,
                            cnae: data.estabelecimento?.atividade_principal?.codigo || data.cnae_fiscal_principal?.codigo,
                            atividade_principal: data.estabelecimento?.atividade_principal?.descricao || data.cnae_fiscal_principal?.descricao
                        };
                    }
                } catch (error) {
                    console.warn('Erro na CNPJ.ws:', error);
                }
            }
            
            if (!dadosBasicos || !dadosBasicos.nome) {
                throw new Error('Não foi possível obter dados básicos do CNPJ');
            }
            
            this.showFeedback('✅ Dados básicos obtidos! Iniciando enriquecimento...', 'success');
            
            // Agora enriquecer os dados usando o novo sistema
            const dadosEnriquecidos = await enriquecerDadosCliente(dadosBasicos);
            
            if (dadosEnriquecidos) {
                // Preencher formulário com dados básicos
                document.getElementById('cliente').value = dadosEnriquecidos.nome || '';
                document.getElementById('nome-fantasia').value = dadosEnriquecidos.fantasia || '';
                document.getElementById('email').value = dadosEnriquecidos.email || '';
                document.getElementById('telefone-comercial').value = dadosEnriquecidos.telefone || '';
                document.getElementById('endereco').value = dadosEnriquecidos.endereco || '';
                document.getElementById('numero').value = dadosEnriquecidos.numero || '';
                document.getElementById('bairro').value = dadosEnriquecidos.bairro || '';
                document.getElementById('cidade').value = dadosEnriquecidos.cidade || '';
                document.getElementById('uf').value = dadosEnriquecidos.uf || '';
                document.getElementById('cep').value = dadosEnriquecidos.cep || '';
                
                // Exibir dados enriquecidos
                exibirDadosEnriquecidos(dadosEnriquecidos);
                
                this.showFeedback('🎯 Enriquecimento concluído com sucesso! Dados demográficos e de mercado adicionados.', 'success');
            } else {
                this.showFeedback('⚠️ Dados básicos obtidos, mas enriquecimento não disponível para esta localização.', 'warning');
            }
            
        } catch (error) {
            console.error('Erro no enriquecimento:', error);
            this.showFeedback(`❌ Erro no enriquecimento: ${error.message}`, 'error');
        } finally {
            // Restaurar botão
            enrichBtn.disabled = false;
            enrichBtn.innerHTML = originalText;
        }
    }

    // 🖼️ NOVAS FUNÇÕES PARA ANÁLISE DE IMAGEM

    // Integrar dados da análise de imagem com o sistema
    integrateSocialMediaData(analysisData) {
        console.log('🖼️ Integrando dados da análise de imagem:', analysisData);
        
        // Atualizar keywords automaticamente baseado na análise
        this.enhanceKeywordsFromImageAnalysis(analysisData);
        
        // Mostrar notificação de sucesso
        this.showNotification('📱 Análise de rede social integrada com sucesso! As sugestões foram aprimoradas.', 'success');
        
        // Se já há dados de prospecção carregados, recalcular sugestões
        if (this.currentProspect) {
            console.log('🔄 Recalculando sugestões com dados da imagem...');
            this.recalculateSuggestionsWithImageData();
        }
    }

    // Melhorar keywords baseado na análise de imagem
    enhanceKeywordsFromImageAnalysis(analysisData) {
        const keywordsField = document.getElementById('keywords');
        if (!keywordsField) return;

        const currentKeywords = keywordsField.value.toLowerCase();
        const newKeywords = [];

        // Adicionar keywords baseadas no tipo de negócio detectado
        if (analysisData.businessIndicators?.businessType) {
            const businessType = analysisData.businessIndicators.businessType.toLowerCase();
            const businessKeywords = this.getKeywordsByBusinessType(businessType);
            newKeywords.push(...businessKeywords);
        }

        // Adicionar keywords baseadas no conteúdo detectado
        if (analysisData.content?.mainContentTypes) {
            analysisData.content.mainContentTypes.forEach(contentType => {
                const contentKeywords = this.getKeywordsByContentType(contentType);
                newKeywords.push(...contentKeywords);
            });
        }

        // Adicionar keywords baseadas na análise demográfica
        if (analysisData.demographic?.population > 50000) {
            newKeywords.push('produtos grande escala', 'distribuição ampla');
        }

        // Filtrar keywords que já existem
        const uniqueKeywords = newKeywords.filter(keyword => 
            !currentKeywords.includes(keyword.toLowerCase())
        );

        if (uniqueKeywords.length > 0) {
            const updatedKeywords = currentKeywords ? 
                currentKeywords + ', ' + uniqueKeywords.join(', ') : 
                uniqueKeywords.join(', ');
            
            keywordsField.value = updatedKeywords;
            
            // Destacar campo atualizado
            keywordsField.style.background = '#d4edda';
            keywordsField.style.border = '2px solid #28a745';
            setTimeout(() => {
                keywordsField.style.background = '';
                keywordsField.style.border = '';
            }, 3000);

            console.log(`🔑 Adicionadas ${uniqueKeywords.length} keywords da análise de imagem`);
        }
    }

    // Obter keywords por tipo de negócio
    getKeywordsByBusinessType(businessType) {
        const businessKeywords = {
            'restaurante': ['pratos executivos', 'refeições', 'almoço', 'jantar', 'cardápio variado'],
            'lanchonete': ['lanches rápidos', 'hambúrguer', 'batata frita', 'refrigerantes', 'fast food'],
            'pizzaria': ['pizza', 'mussarela', 'calabresa', 'molho de tomate', 'massa pizza'],
            'confeitaria': ['doces finos', 'bolos', 'tortas', 'salgados', 'chocolate'],
            'padaria': ['pães', 'farinha', 'fermento', 'café da manhã', 'produtos frescos'],
            'bar': ['bebidas', 'petiscos', 'cerveja', 'aperitivos', 'ambiente social'],
            'churrascaria': ['carnes', 'sal grosso', 'carvão', 'rodízio', 'espetinhos']
        };

        return businessKeywords[businessType] || [];
    }

    // Obter keywords por tipo de conteúdo
    getKeywordsByContentType(contentType) {
        const contentKeywords = {
            'Fotos de produtos/pratos': ['apresentação', 'qualidade visual', 'ingredientes frescos'],
            'Stories promocionais': ['ofertas especiais', 'promoções', 'desconto'],
            'Vídeos de preparo': ['processo culinário', 'ingredientes especiais', 'técnicas'],
            'Depoimentos de clientes': ['satisfação', 'qualidade comprovada', 'confiança'],
            'Promoções e ofertas': ['preços competitivos', 'valor agregado', 'economia'],
            'Ambiente do estabelecimento': ['atmosfera', 'experiência', 'conforto']
        };

        return contentKeywords[contentType] || [];
    }

    // Gerar sugestões baseadas na análise de imagem
    generateSuggestionsFromImageAnalysis(analysisData) {
        console.log('🖼️ Gerando sugestões baseadas na análise de imagem...');
        
        const suggestions = [];
        
        // Sugestões baseadas no tipo de negócio
        if (analysisData.businessIndicators?.businessType) {
            const businessSuggestions = this.getProductsByBusinessType(analysisData.businessIndicators.businessType);
            suggestions.push(...businessSuggestions);
        }

        // Sugestões baseadas no engajamento
        if (analysisData.engagement?.avgLikes > 200) {
            // Negócio com bom engajamento - produtos premium
            const premiumProducts = this.catalog.filter(product => 
                product.category?.toLowerCase().includes('premium') ||
                product.name?.toLowerCase().includes('especial') ||
                product.price > 50
            ).slice(0, 5);
            
            premiumProducts.forEach(product => {
                suggestions.push({
                    ...product,
                    reason: '🏆 Produto premium para negócio com alto engajamento',
                    priority: 10,
                    confidence: 0.8,
                    source: 'image_analysis_engagement'
                });
            });
        }

        // Sugestões baseadas na audiência
        if (analysisData.audience?.primaryAgeGroup) {
            const ageBasedProducts = this.getProductsByAgeGroup(analysisData.audience.primaryAgeGroup);
            suggestions.push(...ageBasedProducts);
        }

        // Sugestões baseadas na análise demográfica
        if (analysisData.demographic?.population > 100000) {
            // População grande - produtos em escala
            const scaleProducts = this.catalog.filter(product => 
                product.unit?.toLowerCase().includes('kg') ||
                product.category?.toLowerCase().includes('atacado')
            ).slice(0, 8);
            
            scaleProducts.forEach(product => {
                suggestions.push({
                    ...product,
                    reason: '📈 Produto adequado para alta demanda populacional',
                    priority: 8,
                    confidence: 0.7,
                    source: 'image_analysis_demographic'
                });
            });
        }

        console.log(`✅ ${suggestions.length} sugestões geradas da análise de imagem`);
        return suggestions.slice(0, 20); // Limitar a 20 sugestões
    }

    // Obter produtos por tipo de negócio
    getProductsByBusinessType(businessType) {
        const suggestions = [];
        const type = businessType.toLowerCase();
        
        // Filtrar produtos do catálogo baseado no tipo de negócio
        const relevantProducts = this.catalog.filter(product => {
            const productName = product.name?.toLowerCase() || '';
            const productCategory = product.category?.toLowerCase() || '';
            
            switch (type) {
                case 'restaurante':
                    return productName.includes('carne') || productName.includes('tempero') || 
                           productName.includes('óleo') || productCategory.includes('proteína');
                
                case 'lanchonete':
                    return productName.includes('batata') || productName.includes('molho') || 
                           productName.includes('pão') || productName.includes('queijo');
                
                case 'pizzaria':
                    return productName.includes('mussarela') || productName.includes('molho') || 
                           productName.includes('farinha') || productName.includes('orégano');
                
                case 'confeitaria':
                    return productName.includes('açúcar') || productName.includes('chocolate') || 
                           productName.includes('farinha') || productName.includes('creme');
                
                default:
                    return productName.includes('básico') || productCategory.includes('essencial');
            }
        }).slice(0, 10);

        relevantProducts.forEach(product => {
            suggestions.push({
                ...product,
                reason: `🎯 Produto específico para ${businessType}`,
                priority: 9,
                confidence: 0.8,
                source: 'image_analysis_business_type'
            });
        });

        return suggestions;
    }

    // Obter produtos por faixa etária
    getProductsByAgeGroup(ageGroup) {
        const suggestions = [];
        
        // Produtos baseados na faixa etária dominante
        const ageBasedProducts = this.catalog.filter(product => {
            const productName = product.name?.toLowerCase() || '';
            
            switch (ageGroup) {
                case '18-25':
                    return productName.includes('salgado') || productName.includes('refrigerante') ||
                           productName.includes('energético') || productName.includes('snack');
                
                case '26-35':
                    return productName.includes('gourmet') || productName.includes('especial') ||
                           productName.includes('orgânico') || productName.includes('premium');
                
                case '36-45':
                    return productName.includes('familiar') || productName.includes('tradicion') ||
                           productName.includes('caseiro') || productName.includes('natural');
                
                case '46-55':
                    return productName.includes('diet') || productName.includes('light') ||
                           productName.includes('integral') || productName.includes('saudável');
                
                default:
                    return true;
            }
        }).slice(0, 8);

        ageBasedProducts.forEach(product => {
            suggestions.push({
                ...product,
                reason: `👥 Produto adequado para faixa etária ${ageGroup}`,
                priority: 7,
                confidence: 0.6,
                source: 'image_analysis_age_group'
            });
        });

        return suggestions;
    }

    // Recalcular sugestões com dados da imagem
    async recalculateSuggestionsWithImageData() {
        if (!this.currentProspect) return;

        try {
            console.log('🔄 Recalculando sugestões com análise de imagem...');
            
            // Recalcular sugestões incluindo dados da imagem
            const newSuggestions = await this.suggestProducts(
                this.currentProspect.company, 
                this.currentProspect.menu
            );
            
            // Atualizar dados atuais
            this.currentProspect.suggestions = newSuggestions;
            this.currentProspect.imageAnalysis = this.socialMediaAnalysisData;
            
            // Re-renderizar as sugestões
            this.renderProductSuggestions();
            
            console.log('✅ Sugestões recalculadas com dados da imagem');
            
        } catch (error) {
            console.error('❌ Erro ao recalcular sugestões:', error);
        }
    }

    // 📱 NOVO: Funções para processar dados de redes sociais manuais
    getSocialMediaManualData() {
        if (typeof getSocialMediaAnalysis === 'function') {
            return getSocialMediaAnalysis();
        }
        return null;
    }
    
    // 🤖 NOVO: Integração com IA gratuita usando dados reais do segmento
    async enhanceScriptWithAI() {
        const company = this.currentProspect.company;
        const nomeEmpresa = company.fantasia || company.nome;
        
        // Usar segmento selecionado pelo usuário
        const userSelectedSegment = window.selectedBusinessSegment || null;
        const segmentoReal = userSelectedSegment || null;
        
        // Dados do negócio para contextualização
        const cidade = company.municipio || 'região';
        const cnae = company.atividade_principal || 'alimentação';
        const endereco = `${company.logradouro || ''} ${company.numero || ''}, ${company.bairro || ''}`.trim();
        
        const loadingIndicator = this.showAILoadingIndicator('Melhorando script com IA...');
        
        try {
            // Prompt detalhado com dados reais
            const prompt = `IMPORTANTE: Responda EXCLUSIVAMENTE em português brasileiro. Não use inglês.

Como especialista em vendas da PMG Atacadista (distribuidora de alimentos há 30 anos), crie um script comercial personalizado usando estes dados REAIS:

DADOS DO CLIENTE:
• Nome: ${nomeEmpresa}
• Localização: ${endereco}, ${cidade}
• CNAE Oficial: ${cnae}
${segmentoReal ? `• SEGMENTO REAL IDENTIFICADO: ${segmentoReal} (use este como foco principal, não o CNAE)` : ''}

CONTEXTO COMERCIAL:
• Somos PMG ATACADISTA - distribuidora especializada em alimentos
• 30 anos de experiência no mercado brasileiro
• Foco em estabelecimentos de alimentação
• Oferecemos produtos + consultoria especializada

INSTRUÇÕES OBRIGATÓRIAS:
1. RESPONDA APENAS EM PORTUGUÊS BRASILEIRO
2. Use o SEGMENTO REAL identificado (${segmentoReal || 'baseado no CNAE'}) como foco principal
3. Mencione ESPECIFICAMENTE ${nomeEmpresa} e PMG ATACADISTA
4. Crie argumentos comerciais REAIS para ${segmentoReal || cnae}
5. NUNCA use placeholders como [Nome da empresa] ou [Benefício 1]
6. Inclua benefícios específicos e concretos para ${segmentoReal || 'alimentação'}
7. Tom profissional e direto, máximo 200 palavras
8. Termine com proposta de reunião ou próximos passos específicos

EXEMPLO DO QUE NÃO FAZER:
❌ "[Nome da empresa] oferece [benefícios]"
❌ "Substitua as informações entre colchetes"
❌ Templates genéricos

EXEMPLO DO QUE FAZER:
✅ "PMG Atacadista pode fornecer para ${nomeEmpresa}..."
✅ "Nossos produtos específicos para ${segmentoReal || 'seu segmento'}..."

RESPOSTA ESPECÍFICA (SEM PLACEHOLDERS):`;

            const enhancedText = await this.callFreeAI(prompt);
            
            if (enhancedText) {
                // Verificar se a resposta está em português
                const processedText = this.ensurePortugueseResponse(enhancedText, segmentoReal, nomeEmpresa);
                this.showAIEnhancedScript(processedText, segmentoReal);
            }
            
        } catch (error) {
            console.error('❌ Erro ao melhorar script com IA:', error);
            alert('❌ Erro ao conectar com IA. Tente novamente.');
        } finally {
            loadingIndicator.remove();
        }
    }

    // 🇧🇷 Garantir que a resposta da IA esteja em português
    ensurePortugueseResponse(text, segmento, nomeEmpresa) {
        // Verificar se há muitas palavras em inglês
        const englishWords = ['the', 'and', 'with', 'for', 'business', 'company', 'service', 'product', 'quality', 'experience', 'customer', 'market', 'food', 'industry'];
        const words = text.toLowerCase().split(/\s+/);
        const englishCount = words.filter(word => englishWords.includes(word)).length;
        const englishRatio = englishCount / words.length;
        
        // Verificar se é um template genérico com placeholders
        const hasPlaceholders = text.includes('[') && text.includes(']');
        const hasGenericTerms = text.toLowerCase().includes('nome da sua empresa') || 
                               text.toLowerCase().includes('setores de atuação') ||
                               text.toLowerCase().includes('benefício 1') ||
                               text.toLowerCase().includes('substitua as informações');
        
        // Se mais de 20% das palavras são em inglês OU é um template genérico, gerar resposta específica
        if (englishRatio > 0.2 || hasPlaceholders || hasGenericTerms) {
            if (hasPlaceholders || hasGenericTerms) {
                console.log('⚠️ IA retornou template genérico, gerando script específico da PMG...');
            } else {
                console.log('⚠️ Resposta da IA veio em inglês, gerando versão em português...');
            }
            return this.generatePortugueseScript(segmento, nomeEmpresa);
        }
        
        return text;
    }

    // 🇧🇷 Gerar script em português como fallback
    generatePortugueseScript(segmento, nomeEmpresa) {
        const segmentoLower = (segmento || 'estabelecimento').toLowerCase();
        
        const templates = {
            'restaurante': `🍽️ **Script Personalizado PMG Atacadista para ${nomeEmpresa}**

Olá! Sou consultor comercial da PMG Atacadista e identifiquei ${nomeEmpresa} como um restaurante com grande potencial na sua região.

**Nossa proposta específica para restaurantes:**
• Carnes premium selecionadas com certificação de qualidade
• Temperos e condimentos especiais para realçar sabores
• Óleos e gorduras de alta performance culinária
• Programa de consultoria GRATUITA para otimização do cardápio

**Resultados comprovados:** Nossos parceiros restaurantes conseguem aumentar a margem de lucro em até 18% com nossa consultoria especializada e produtos direcionados.

**Próximo passo:** Posso agendar 30 minutos na próxima semana para apresentar nosso portfólio específico para ${nomeEmpresa} e mostrar cases de sucesso similares?

PMG Atacadista - 30 anos transformando negócios de alimentação! 🚀`,

            'pizzaria': `🍕 **Script Especializado PMG Atacadista para ${nomeEmpresa}**

Boa tarde! Sou da PMG Atacadista e identifiquei que ${nomeEmpresa} tem grande potencial no segmento de pizzas.

**Mix completo especializado em pizzarias:**
• Mussarela especial com derretimento perfeito
• Molhos de tomate premium importados
• Oregano selecionado e especiarias exclusivas
• Azeitonas e ingredientes gourmet
• Massas pré-prontas de alta qualidade

**Diferencial PMG:** Além dos melhores preços, oferecemos consultoria técnica para otimização de custos. Pizzarias parceiras reduziram em média 22% os gastos com insumos mantendo a qualidade.

**Proposta:** Que tal uma degustação gratuita dos nossos produtos no ${nomeEmpresa}? Posso levar amostras e fazer uma análise personalizada do seu cardápio?

Vamos potencializar o sucesso da ${nomeEmpresa} juntos! 🎯`,

            'lanchonete': `🍔 **Proposta Comercial PMG Atacadista para ${nomeEmpresa}**

Olá! Identifiquei que ${nomeEmpresa} atua no segmento de lanches e tenho uma proposta interessante.

**Linha completa para lanchonetes:**
• Hambúrgueres artesanais congelados premium
• Pães especiais para lanches gourmet
• Molhos diferenciados (barbecue, mostarda honey, maionese temperada)
• Batatas pré-fritas golden premium
• Bebidas com excelente margem de revenda

**Consultoria especializada:** Ajudamos na montagem estratégica do cardápio para aumentar o ticket médio em 25%. Oferecemos também treinamento gratuito para sua equipe.

**Convite:** Que tal marcarmos uma conversa de 20 minutos para apresentar oportunidades específicas para ${nomeEmpresa}? Tenho cases de lanchonetes que dobraram o faturamento!

PMG Atacadista - Seu parceiro para o crescimento! 💪`,

            'bar': `🍻 **Proposta Especializada PMG Atacadista para ${nomeEmpresa}**

Olá! Sou da PMG Atacadista e vejo grande potencial de parceria com ${nomeEmpresa}.

**Linha completa para bares:**
• Petiscos premium congelados (pastéis, coxinhas, bolinhos)
• Amendoins e salgadinhos selecionados
• Queijos especiais para tábuas
• Bebidas com margem atrativa
• Mix de produtos para happy hour

**Diferencial:** Consultoria para criação de combos promocionais que aumentam o consumo médio por mesa em 30%. Nossos bares parceiros relatam aumento significativo no movimento.

**Próximos passos:** Posso fazer uma visita ao ${nomeEmpresa} para apresentar nosso portfólio e discutir estratégias específicas para o seu público?

Vamos fazer do ${nomeEmpresa} o bar de referência da região! 🎯`,

            'padaria': `🥖 **Script Comercial PMG Atacadista para ${nomeEmpresa}**

Bom dia! Sou consultor da PMG Atacadista e identifiquei ${nomeEmpresa} como uma padaria com excelente potencial.

**Linha especializada para panificação:**
• Farinhas premium especiais para diferentes tipos de pão
• Fermentos biológicos de alta performance
• Ingredientes para doces e confeitaria
• Recheios e coberturas gourmet
• Embalagens especiais para produtos artesanais

**Consultoria técnica:** Oferecemos suporte GRATUITO para desenvolvimento de novos produtos e otimização de receitas. Padarias parceiras aumentaram em 40% a variedade do cardápio.

**Proposta:** Que tal agendar uma visita técnica ao ${nomeEmpresa}? Posso levar amostras dos nossos produtos e fazer sugestões personalizadas para ampliar seu mix.

PMG Atacadista - Crescendo junto com sua padaria há 30 anos! 🌟`
        };
        
        // Buscar template mais adequado
        let template = templates['restaurante']; // padrão
        
        for (const [tipo, texto] of Object.entries(templates)) {
            if (segmentoLower.includes(tipo)) {
                template = texto;
                break;
            }
        }
        
        return template;
    }

    // 🤖 Chamar IA usando OpenRouter e outras APIs gratuitas
    async callFreeAI(prompt) {
        try {
            console.log('🤖 Iniciando processamento de IA...');
            
            // Tentativa 1: OpenRouter.ai (múltiplos modelos gratuitos)
            try {
                const openrouterResponse = await this.callOpenRouter(prompt);
                if (openrouterResponse) {
                    return openrouterResponse;
                }
            } catch (e) {
                console.log('🔄 OpenRouter não disponível, tentando alternativa...');
            }

            // Tentativa 2: HuggingFace Inference API (gratuita)
            try {
                const hfResponse = await this.callHuggingFace(prompt);
                if (hfResponse) {
                    return hfResponse;
                }
            } catch (e) {
                console.log('🔄 HuggingFace não disponível, tentando alternativa...');
            }

            // Tentativa 3: Groq API (modelos rápidos gratuitos)
            try {
                const groqResponse = await this.callGroq(prompt);
                if (groqResponse) {
                    return groqResponse;
                }
            } catch (e) {
                console.log('🔄 Groq não disponível, tentando alternativa...');
            }

            // Tentativa 4: Replicate API (modelos open source)
            try {
                const replicateResponse = await this.callReplicate(prompt);
                if (replicateResponse) {
                    return replicateResponse;
                }
            } catch (e) {
                console.log('🔄 Replicate não disponível, tentando alternativa...');
            }
            
            // Fallback: IA local inteligente
            return this.generateIntelligentResponse(prompt);
            
        } catch (error) {
            console.error('❌ Erro em todas as tentativas de IA:', error);
            return this.generateIntelligentResponse(prompt);
        }
    }

    // 🌐 Chamar OpenRouter.ai (apenas modelos gratuitos)
    async callOpenRouter(prompt) {
        try {
            // Chave do OpenRouter
            const API_KEY = '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';
            
            // Apenas modelos gratuitos que funcionam
            const freeModels = [
                'google/gemma-2-9b-it:free',        // ✅ Funcionando
                'meta-llama/llama-3-8b-instruct:free',
                'microsoft/phi-3-medium-128k-instruct:free',
                'qwen/qwen-2-7b-instruct:free',
                'mistralai/mistral-7b-instruct:free'
            ];

            for (const model of freeModels) {
                try {
                    console.log(`🔄 Tentando modelo gratuito: ${model}`);
                    
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'PMG Atacadista - Sistema de Prospecção Inteligente'
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [{
                                role: 'system',
                                content: 'Você é um assistente comercial especializado da PMG Atacadista, uma distribuidora de alimentos brasileira com 30 anos de experiência. IMPORTANTE: Responda SEMPRE e EXCLUSIVAMENTE em português brasileiro. Nunca use inglês ou outros idiomas. Use linguagem comercial brasileira, profissional e persuasiva. Foque em benefícios específicos para estabelecimentos de alimentação.'
                            }, {
                                role: 'user',
                                content: prompt
                            }],
                            max_tokens: 400,
                            temperature: 0.7,
                            top_p: 0.9
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const text = data.choices?.[0]?.message?.content;
                        
                        if (text && text.trim()) {
                            console.log(`✅ OpenRouter respondeu com modelo: ${model}`);
                            console.log(`💰 Custo: Gratuito`);
                            
                            // Mostrar feedback visual discreto
                            this.showAIModelFeedback(model, { total_cost: 0 });
                            
                            return text.trim();
                        }
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        console.log(`❌ Modelo ${model} falhou:`, errorData.error?.message || response.statusText);
                        
                        // Continuar para próximo modelo
                        continue;
                    }
                } catch (e) {
                    console.log(`❌ Erro no modelo ${model}:`, e.message);
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro no OpenRouter:', error);
            return null;
        }
    }

    // 📊 Mostrar feedback discreto do modelo de IA usado
    showAIModelFeedback(model, usage) {
        const feedback = document.createElement('div');
        const modelName = model.split('/').pop().replace(':free', '').replace('-', ' ');
        
        feedback.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                        color: white; padding: 10px 14px; border-radius: 8px; z-index: 10000; 
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInUp 0.3s ease;
                        max-width: 250px; font-size: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <i class="fas fa-robot" style="margin-right: 6px; color: #fff;"></i>
                    <strong>IA Ativada</strong>
                </div>
                <div style="font-size: 11px; opacity: 0.95;">
                    <div>🤖 ${modelName}</div>
                    <div>💰 Gratuito</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(feedback);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.style.animation = 'slideOutDown 0.3s ease';
                setTimeout(() => feedback.remove(), 300);
            }
        }, 3000);
    }

    // 🤗 Chamar HuggingFace Inference API
    async callHuggingFace(prompt) {
        try {
            const models = [
                'microsoft/DialoGPT-medium',
                'facebook/blenderbot-400M-distill',
                'microsoft/DialoGPT-small'
            ];

            for (const model of models) {
                try {
                    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            inputs: `${prompt}\n\nResposta em português para PMG Atacadista:`,
                            parameters: {
                                max_length: 200,
                                temperature: 0.7,
                                do_sample: true
                            }
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        let text = '';
                        
                        if (Array.isArray(data) && data[0]?.generated_text) {
                            text = data[0].generated_text;
                        } else if (data.generated_text) {
                            text = data.generated_text;
                        }
                        
                        if (text && text.trim()) {
                            console.log(`✅ HuggingFace respondeu com modelo: ${model}`);
                            return text.trim();
                        }
                    }
                } catch (e) {
                    console.log(`❌ Modelo HF ${model} falhou:`, e.message);
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro no HuggingFace:', error);
            return null;
        }
    }

    // ⚡ Chamar Groq API (modelos rápidos)
    async callGroq(prompt) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [{
                        role: 'user',
                        content: `${prompt}\n\nResponda em português brasileiro de forma comercial para a PMG Atacadista.`
                    }],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;
                
                if (text && text.trim()) {
                    console.log('✅ Groq respondeu com sucesso');
                    return text.trim();
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro no Groq:', error);
            return null;
        }
    }

    // 🔄 Chamar Replicate API
    async callReplicate(prompt) {
        try {
            const response = await fetch('https://api.replicate.com/v1/predictions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    version: "meta/llama-2-7b-chat",
                    input: {
                        prompt: `${prompt}\n\nResponda em português brasileiro de forma comercial para a distribuidora PMG Atacadista:`,
                        max_length: 300,
                        temperature: 0.7
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Replicate pode retornar uma predição que precisa ser consultada
                if (data.urls?.get) {
                    const resultResponse = await fetch(data.urls.get);
                    if (resultResponse.ok) {
                        const result = await resultResponse.json();
                        const text = result.output?.join('') || result.output;
                        
                        if (text && text.trim()) {
                            console.log('✅ Replicate respondeu com sucesso');
                            return text.trim();
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro no Replicate:', error);
            return null;
        }
    }

    // 🧠 IA inteligente baseada em análise de padrões
    generateIntelligentResponse(prompt) {
        const promptLower = prompt.toLowerCase();
        
        // Extrair informações do prompt
        const empresaMatch = prompt.match(/Cliente: ([^\n]+)/i);
        const atividadeMatch = prompt.match(/Atividade: ([^\n]+)/i);
        const cidadeMatch = prompt.match(/Cidade: ([^\n]+)/i);
        
        const empresa = empresaMatch ? empresaMatch[1] : 'sua empresa';
        const atividade = atividadeMatch ? atividadeMatch[1] : 'alimentação';
        const cidade = cidadeMatch ? cidadeMatch[1] : 'sua região';
        
        if (promptLower.includes('melhore') && promptLower.includes('script')) {
            return this.generateEnhancedSalesScript(empresa, atividade, cidade);
        }
        
        if (promptLower.includes('personaliz') || promptLower.includes('abordagem')) {
            return this.generatePersonalizedApproach(empresa, atividade, cidade);
        }
        
        // Análise contextual genérica
        return this.generateContextualResponse(empresa, atividade, cidade);
    }

    // 📈 Gerar script de vendas otimizado
    generateEnhancedSalesScript(empresa, atividade, cidade) {
        const templates = [
            {
                condition: (atividade) => atividade.includes('restaurante'),
                response: `**🤖 Script Otimizado por IA para ${empresa}:**

**🎯 ABERTURA ESTRATÉGICA:**
"Olá! Estive analisando o mercado de restaurantes em ${cidade} e identifiquei que ${empresa} tem um perfil muito promissor. Sou da PMG Atacadista e gostaria de apresentar como podemos ajudar vocês a otimizar custos e aumentar a margem de lucro."

**💡 INSIGHT PERSONALIZADO:**
"Nossos dados mostram que restaurantes como o de vocês conseguem reduzir até 18% dos custos com insumos quando trabalham com a estratégia certa. Temos um portfólio específico para o segmento de alimentação que pode fazer essa diferença."

**🎯 PROPOSTA DIFERENCIADA:**
"Além dos melhores preços, oferecemos consultoria gratuita para otimização do cardápio baseada em análise de margem. Isso significa mais vendas e lucro para ${empresa}."

**🚀 CHAMADA PARA AÇÃO:**
"Posso agendar 20 minutos na próxima semana para mostrar especificamente como ${empresa} pode se beneficiar? Tenho cases de sucesso similares em ${cidade}."
`
            },
            {
                condition: (atividade) => atividade.includes('lanche') || atividade.includes('fast'),
                response: `**🤖 Script Personalizado para ${empresa}:**

**🎯 ABERTURA ASSERTIVA:**
"Olá! Identifiquei que ${empresa} trabalha com o segmento de lanches rápidos em ${cidade}. Como especialista em distribuição para food service, vejo uma grande oportunidade de parceria."

**💡 ANÁLISE DE MERCADO:**
"O segmento de lanches tem crescido 23% ao ano. Para aproveitar essa oportunidade, é essencial ter fornecedores que entendam a dinâmica do fast food - e é exatamente isso que fazemos há 30 anos."

**🎯 DIFERENCIAL COMPETITIVO:**
"Trabalhamos com produtos de alta rotatividade e oferecemos entregas expressas. Para ${empresa}, isso significa menos estoque parado e mais capital de giro."

**🚀 PRÓXIMOS PASSOS:**
"Gostaria de agendar uma demonstração dos nossos produtos específicos para lanchonetes? Posso ir até ${empresa} e mostrar como aumentar a eficiência operacional."
`
            }
        ];
        
        // Encontrar template apropriado
        const template = templates.find(t => t.condition(atividade.toLowerCase())) || templates[0];
        return template.response;
    }

    // 🎨 Gerar abordagem personalizada
    generatePersonalizedApproach(empresa, atividade, cidade) {
        return `**🤖 Abordagem Personalizada gerada por IA:**

**Olá! Sou da PMG Atacadista.**

Estive analisando o mercado de ${atividade} em ${cidade} e ${empresa} chamou minha atenção pelo potencial que identificamos.

**Por que entramos em contato:**
✅ ${empresa} tem perfil ideal para nossa linha premium
✅ Localização estratégica em ${cidade} 
✅ Segmento em crescimento (${atividade})

**O que podemos oferecer:**
🎯 Produtos específicos para ${atividade}
💰 Condições especiais de pagamento
🚚 Logística otimizada para ${cidade}
📊 Consultoria gratuita de mix de produtos

**Próximo passo:**
Que tal marcarmos uma conversa de 15 minutos? Posso apresentar cases de sucesso similares ao de ${empresa} e mostrar oportunidades concretas de crescimento.

Quando seria um bom momento para vocês?`;
    }

    // 🧠 Resposta contextual inteligente
    generateContextualResponse(empresa, atividade, cidade) {
        const responses = [
            `Identifiquei grandes oportunidades para ${empresa} no mercado de ${atividade} em ${cidade}. Nossa expertise de 30 anos pode agregar valor significativo ao negócio de vocês.`,
            
            `Com base na análise do perfil de ${empresa}, vejo potencial para uma parceria estratégica. Temos soluções específicas que podem otimizar a operação de vocês em ${cidade}.`,
            
            `O mercado de ${atividade} está em evolução e ${empresa} pode se beneficiar das nossas soluções inovadoras. Nossa distribuidora tem track record comprovado na região de ${cidade}.`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // 🧠 IA simulada avançada para fallback
    simulateAdvancedAI(prompt) {
        console.log('🤖 Usando IA simulada avançada para prompt:', prompt.substring(0, 100) + '...');
        
        // Análise do tipo de prompt
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('segmento real') || promptLower.includes('detectar')) {
            return this.detectSegmentFromPrompt(prompt);
        }
        
        if (promptLower.includes('melhore') && promptLower.includes('script')) {
            return this.generateEnhancedScript(prompt);
        }
        
        if (promptLower.includes('personaliz') || promptLower.includes('abordagem')) {
            return this.generatePersonalizedApproach(prompt);
        }
        
        // Resposta genérica inteligente
        return this.generateGenericResponse(prompt);
    }
    
    // Gerar script melhorado
    generateEnhancedScript(prompt) {
        const templates = [
            "Baseado no perfil da sua empresa, identifiquei algumas oportunidades específicas para o seu negócio. Nossa distribuidora PMG Atacadista trabalha há 30 anos no mercado e possui produtos ideais para estabelecimentos como o seu. Podemos oferecer condições especiais de pagamento e um mix de produtos que vai aumentar sua margem de lucro significativamente.",
            
            "Analisando o mercado da sua região, vejo que existe uma demanda crescente pelo tipo de produto que vocês oferecem. A PMG Atacadista pode ser o parceiro ideal para ajudar vocês a aproveitarem essa oportunidade, com produtos de qualidade e preços competitivos que vão fazer a diferença no seu resultado final.",
            
            "Pelo que observei, vocês têm um negócio bem estruturado. Nossa proposta é agregar ainda mais valor ao seu estabelecimento através de produtos premium e um atendimento personalizado. Trabalhamos com as melhores marcas do mercado e temos condições especiais para parceiros que buscam crescimento sustentável."
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    // Gerar abordagem personalizada
    generatePersonalizedApproach(prompt) {
        const cidade = this.extractFromPrompt(prompt, 'cidade:', '\n') || 'sua região';
        const atividade = this.extractFromPrompt(prompt, 'atividade:', '\n') || 'alimentação';
        
        return `Olá! Sou da PMG Atacadista e estou entrando em contato porque identifiquei uma oportunidade interessante para seu negócio em ${cidade}. 

Vejo que vocês trabalham com ${atividade}, e nossa empresa tem 30 anos de experiência fornecendo para estabelecimentos similares. Temos um portfólio completo que pode agregar muito valor ao seu negócio.

Que tal marcarmos uma conversa rápida para eu apresentar algumas soluções específicas para o seu tipo de estabelecimento? Tenho certeza de que posso ajudar vocês a aumentarem a margem de lucro com produtos de qualidade.`;
    }
    
    // Extrair informação do prompt
    extractFromPrompt(text, startMarker, endMarker) {
        const start = text.indexOf(startMarker);
        if (start === -1) return null;
        
        const textAfterStart = text.substring(start + startMarker.length);
        const end = textAfterStart.indexOf(endMarker);
        
        return end === -1 ? textAfterStart.trim() : textAfterStart.substring(0, end).trim();
    }
    
    // Resposta genérica inteligente
    generateGenericResponse(prompt) {
        const responses = [
            "Com base nas informações analisadas, vejo grandes oportunidades para o seu negócio. A PMG Atacadista pode ser o parceiro ideal para impulsionar seus resultados.",
            
            "Identifiquei alguns pontos interessantes no perfil da sua empresa. Nossa distribuidora tem soluções específicas que podem agregar muito valor ao seu estabelecimento.",
            
            "Analisando o mercado da sua região e o tipo de negócio, posso sugerir algumas estratégias comerciais que têm funcionado muito bem com nossos outros parceiros."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // 📱 Interface para mostrar carregamento da IA
    showAILoadingIndicator(message) {
        const indicator = document.createElement('div');
        indicator.className = 'ai-loading-indicator';
        indicator.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000;">
                <i class="fas fa-robot fa-spin"></i> ${message}
            </div>
        `;
        document.body.appendChild(indicator);
        return indicator;
    }
    
    // 📄 Mostrar script melhorado pela IA
    showAIEnhancedScript(enhancedText, segmentoUsado = null) {
        const modal = document.createElement('div');
        modal.className = 'ai-enhanced-modal';
        modal.innerHTML = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                            background: rgba(0,0,0,0.7); z-index: 10000; display: flex; 
                                            align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; 
                                                 max-width: 700px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h3><i class="fas fa-robot" style="color: #28a745;"></i> Script Otimizado por IA</h3>
                            ${segmentoUsado ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">
                                <i class="fas fa-tag"></i> <strong>Segmento usado:</strong> ${segmentoUsado}
                            </p>` : ''}
                        </div>
                        <button onclick="this.closest('.ai-enhanced-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                    </div>
                    <div class="enhanced-content" style="white-space: pre-wrap; line-height: 1.6; border: 2px solid #28a745; padding: 20px; border-radius: 8px; background: #f8fff8;">
                        ${enhancedText}
                    </div>
                    <div class="modal-actions" style="margin-top: 25px; text-align: center; display: flex; gap: 15px; justify-content: center;">
                        <button onclick="navigator.clipboard.writeText(\`${enhancedText.replace(/`/g, '\\`')}\`).then(() => alert('✅ Texto copiado para área de transferência!'))" 
                                class="btn btn-primary" style="background: #007bff; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-copy"></i> Copiar Texto
                        </button>
                        <button onclick="prospeccaoManager.applyAIEnhancement(\`${enhancedText.replace(/`/g, '\\`')}\`, '${segmentoUsado || ''}'); this.closest('.ai-enhanced-modal').remove()" 
                                class="btn btn-success" style="background: #28a745; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-magic"></i> Aplicar ao Script
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // ✏️ Aplicar melhorias da IA ao script
    applyAIEnhancement(enhancedText, segmentoUsado = '') {
        // Adicionar seção com sugestões da IA
        const scriptContainer = document.querySelector('.script-text');
        if (scriptContainer) {
            // Remover seção anterior da IA se existir
            const existingAISection = scriptContainer.querySelector('[data-section="ai-sugestoes"]');
            if (existingAISection) {
                existingAISection.remove();
            }
            
            const aiSection = document.createElement('div');
            aiSection.className = 'script-section ai-enhanced';
            aiSection.setAttribute('data-section', 'ai-sugestoes');
            aiSection.innerHTML = `
                <div class="section-header" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; padding: 12px; border-radius: 8px;">
                    <h4>🤖 SCRIPT OTIMIZADO POR IA</h4>
                    ${segmentoUsado ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
                        <i class="fas fa-tag"></i> Baseado no segmento: <strong>${segmentoUsado}</strong>
                    </div>` : ''}
                    <button onclick="prospeccaoManager.copyScriptSection('ai-sugestoes')" class="copy-section-btn" title="Copiar apenas esta seção">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="section-content" style="border-left: 4px solid #28a745; padding: 15px; margin-top: 10px; background: #f8fff8; border-radius: 0 8px 8px 0;">
                    ${enhancedText.replace(/\n/g, '<br>')}
                </div>
            `;
            
            // Inserir no início do script para destacar
            const firstSection = scriptContainer.querySelector('.script-section');
            if (firstSection) {
                scriptContainer.insertBefore(aiSection, firstSection);
            } else {
                scriptContainer.appendChild(aiSection);
            }
        }
        
        // Atualizar estatísticas
        this.trackSectionCopy('ai-enhancement-applied');
        
        // Mostrar feedback
        this.showCopyNotification(`✅ Script otimizado pela IA aplicado! ${segmentoUsado ? `Baseado no segmento: ${segmentoUsado}` : ''}`);
        
        // Scroll para mostrar a nova seção
        setTimeout(() => {
            const newSection = document.querySelector('[data-section="ai-sugestoes"]');
            if (newSection) {
                newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    // 📋 Copiar seção específica do script
    copyScriptSection(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"] .section-content`);
        if (!section) {
            alert('❌ Seção não encontrada');
            return;
        }
        
        const text = section.innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            // Feedback visual
            const btn = document.querySelector(`[data-section="${sectionName}"] .copy-section-btn`);
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.background = '#28a745';
                btn.style.color = 'white';
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                    btn.style.color = '';
                }, 2000);
            }
            
            // Armazenar qual segmento foi copiado (para analytics)
            this.trackSectionCopy(sectionName);
            
            // Notificação
            this.showCopyNotification(`Seção "${this.getSectionDisplayName(sectionName)}" copiada!`);
            
        }).catch(err => {
            alert('❌ Erro ao copiar texto: ' + err.message);
        });
    }
    
    // 📊 Rastrear cópias de seções (para entender o uso)
    trackSectionCopy(sectionName) {
        try {
            let sectionStats = JSON.parse(localStorage.getItem('scriptSectionStats') || '{}');
            sectionStats[sectionName] = (sectionStats[sectionName] || 0) + 1;
            localStorage.setItem('scriptSectionStats', JSON.stringify(sectionStats));
            
            console.log(`📊 Seção "${sectionName}" copiada. Total: ${sectionStats[sectionName]} vezes`);
        } catch (e) {
            console.warn('Erro ao salvar estatísticas:', e);
        }
    }
    
    // 🏷️ Nomes amigáveis das seções
    getSectionDisplayName(sectionName) {
        const names = {
            'abertura': 'Abertura Personalizada',
            'contextualizacao': 'Contextualização',
            'oportunidade-digital': 'Oportunidade Digital',
            'proposta-valor': 'Proposta de Valor',
            'especializado': 'Seção Especializada',
            'proximos-passos': 'Próximos Passos',
            'contato': 'Informações de Contato',
            'dicas': 'Dicas Importantes',
            'ai-sugestoes': 'Sugestões da IA'
        };
        return names[sectionName] || sectionName;
    }
    
    // 📱 Mostrar notificação de cópia
    showCopyNotification(message) {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; background: #28a745; color: white; 
                        padding: 12px 20px; border-radius: 6px; z-index: 10000; 
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease;">
                <i class="fas fa-check"></i> ${message}
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
    
    // 📊 MÉTODOS PARA ANÁLISE DE REDES SOCIAIS
    generateSocialRecommendations(socialData) {
        const recommendations = [];
        
        // Recomendações baseadas no número de seguidores
        if (socialData.totalFollowers > 10000) {
            recommendations.push('📈 Alto alcance - Focar em produtos premium e variedade ampla');
            recommendations.push('🎯 Considerar parcerias e campanhas promocionais especiais');
        } else if (socialData.totalFollowers > 1000) {
            recommendations.push('📊 Alcance médio - Priorizar produtos de alta rotação e qualidade');
            recommendations.push('🔄 Desenvolver estratégias de fidelização de clientes');
        } else {
            recommendations.push('🌱 Negócio em crescimento - Focar em produtos básicos e competitivos');
            recommendations.push('💡 Oportunidade para produtos introdutórios e promocionais');
        }

        // Recomendações baseadas no nível de engajamento
        if (socialData.engagementLevel === 'Alto') {
            recommendations.push('⚡ Alto engajamento - Cliente ativo digitalmente, priorizar novidades');
            recommendations.push('📱 Facilitar pedidos online e comunicação digital');
        } else if (socialData.engagementLevel === 'Médio') {
            recommendations.push('🎯 Engajamento moderado - Balancear tradição com inovação');
        } else {
            recommendations.push('📞 Priorizar contato direto e relacionamento pessoal');
        }

        // Recomendações baseadas nas plataformas
        if (socialData.platforms.includes('Instagram')) {
            recommendations.push('📸 Presença no Instagram - Focar em produtos visuais e gourmet');
        }
        if (socialData.platforms.includes('Facebook')) {
            recommendations.push('👥 Ativo no Facebook - Considerar produtos familiares e tradicionais');
        }
        if (socialData.platforms.includes('TikTok')) {
            recommendations.push('🎵 Público jovem (TikTok) - Priorizar tendências e produtos inovadores');
        }

        return recommendations;
    }

    generateMarketOpportunities(socialData) {
        const opportunities = [];
        
        // Oportunidades baseadas no número total de publicações
        if (socialData.totalPublications > 100) {
            opportunities.push('📱 Cliente muito ativo nas redes - Excelente para parceria digital');
            opportunities.push('🌟 Potencial para ser influenciador local e showcases de produtos');
        } else if (socialData.totalPublications > 50) {
            opportunities.push('📊 Atividade regular - Bom potencial para feedback e reviews');
        }

        // Oportunidades baseadas na combinação de dados
        const followerToFollowingRatio = socialData.details.reduce((acc, social) => {
            return acc + (social.followers / Math.max(social.following, 1));
        }, 0) / socialData.details.length;

        if (followerToFollowingRatio > 2) {
            opportunities.push('📈 Perfil influente - Potencial para recomendar produtos a outros clientes');
        }

        // Oportunidades específicas por plataforma
        socialData.details.forEach(social => {
            if (social.platform === 'WhatsApp Business') {
                opportunities.push('💬 WhatsApp Business ativo - Facilitar comunicação direta via WhatsApp');
            }
            if (social.platform === 'YouTube' && social.followers > 1000) {
                opportunities.push('📺 YouTuber com alcance - Considerar patrocínio de conteúdo culinário');
            }
        });

        // Oportunidade padrão
        if (opportunities.length === 0) {
            opportunities.push('🎯 Cliente engajado digitalmente - Oportunidade para relacionamento personalizado');
            opportunities.push('📦 Potencial para programas de fidelidade e ofertas exclusivas');
        }

        return opportunities;
    }
    
    // 📱 NOVO: Funções para processar dados de redes sociais manuais
    getSocialMediaManualData() {
        if (typeof getSocialMediaAnalysis === 'function') {
            return getSocialMediaAnalysis();
        }
        return null;
    }
}

// ===== INICIALIZAÇÃO COORDENADA E SEGURA =====
window.initProspeccaoManager = async function() {
    try {
        console.log('🚀 Iniciando ProspeccaoManager...');
        
        if (window.prospeccaoManager) {
            console.log('⚠️ ProspeccaoManager já existe, pulando inicialização');
            return window.prospeccaoManager;
        }
        
        // Aguardar outros sistemas se necessário
        let maxWait = 30; // 3 segundos máximo
        while (maxWait > 0 && document.readyState !== 'complete') {
            await new Promise(resolve => setTimeout(resolve, 100));
            maxWait--;
        }
        
        // Criar instância
        window.prospeccaoManager = new ProspeccaoManager();
        
        console.log('✅ ProspeccaoManager inicializado com sucesso');
        return window.prospeccaoManager;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar ProspeccaoManager:', error);
        
        // Tentar inicialização básica
        try {
            console.log('🔄 Tentando inicialização básica...');
            window.prospeccaoManager = new ProspeccaoManager();
            console.log('✅ Inicialização básica concluída');
            return window.prospeccaoManager;
        } catch (basicError) {
            console.error('❌ Falha completa na inicialização:', basicError);
            return null;
        }
    }
};

// Inicialização automática quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.initProspeccaoManager, 500); // Aguardar outros sistemas
    });
} else {
    // DOM já carregado
    setTimeout(window.initProspeccaoManager, 100);
}

// Fallback: Tentar novamente após 2 segundos se não conseguir
setTimeout(() => {
    if (!window.prospeccaoManager) {
        console.log('🔄 Tentativa final de inicialização...');
        window.initProspeccaoManager();
    }
}, 2000);
