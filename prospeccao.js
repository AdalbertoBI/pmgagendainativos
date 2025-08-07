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
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Prospecção Manager...');
        
        // Carregar imagens e catálogo
        await this.loadImages();
        await this.loadCatalog();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Carregar estatísticas
        this.loadStats();
        
        console.log('✅ Prospecção Manager inicializado');
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
        return this.reateBasicCatalog();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        // Em caso de erro, sempre retornar catálogo básico
        console.log('🔄 Carregando catálogo básico como fallback...');
        return this.reateBasicCatalog();
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
            this.catalog = this.reateBasicCatalog().map(product => ({
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

        // Formatação do CNPJ
        document.getElementById('cnpj').addEventListener('input', (e) => {
            this.formatCNPJ(e.target);
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

        // Botões de ação
        document.getElementById('createOffer').addEventListener('click', () => {
            this.createOfferArt();
        });

       // Evento para copiar imagem da oferta
document.getElementById('copyOfferImage')?.addEventListener('click', () => this.copyOfferImage());

// Evento para copiar texto da oferta
document.getElementById('copyOfferText')?.addEventListener('click', () => this.copyOfferText());


    // NOVO: Event listeners para outros modais se existirem
        this.setupAdditionalModalListeners();
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
        '11111111000101': {
            nome: 'EXEMPLO ALIMENTAÇÃO E SERVIÇOS LTDA',
            fantasia: 'RESTAURANTE DEMO',
            cnpj: '11.111.111/0001-01',
            atividade_principal: 'Restaurantes e similares',
            logradouro: 'RUA EXEMPLO',
            numero: '123',
            bairro: 'CENTRO DEMO',
            municipio: 'SAO PAULO',
            uf: 'SP',
            cep: '01000-000',
            telefone: '(11) 9999-0001',
            email: 'contato@restaurantedemo.com',
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


    async processProspect() {
        const cnpj = document.getElementById('cnpj').value.replace(/\D/g, '');
        
        const cardapioFile = document.getElementById('cardapio').files[0];

        if (!cnpj || cnpj.length !== 14) {
            alert('❌ CNPJ inválido');
            return;
        }

        // Mostrar loading
        this.showLoading();

        try {
            // Etapa 1: Buscar dados da empresa
            await this.updateLoadingStep(1);
            const companyData = await this.getCompanyData(cnpj);

            // Etapa 2: Analisar localização
            await this.updateLoadingStep(2);
            const locationData = await this.analyzeLocation(companyData);

            // Etapa 3: Processar cardápio
            await this.updateLoadingStep(3);
            const menuData = await this.processMenu(cardapioFile);

            // Etapa 4: Sugerir produtos
            await this.updateLoadingStep(4);
            const suggestions = await this.suggestProducts(companyData, menuData);

            // Etapa 5: Criar prospecção
            await this.updateLoadingStep(5);
            this.currentProspect = {
                company: companyData,
                location: locationData,
                menu: menuData,
                suggestions: suggestions,
               
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
    
    try {
        // Garantir que o catálogo está carregado
        await this.ensureCatalogLoaded();
        
        const suggestions = [];
        const menuItems = menuData.items || [];
        
        console.log(`📦 Analisando ${this.catalog.length} produtos do catálogo real`);
        console.log(`🍽️ Contra ${menuItems.length} itens do cardápio`);

        if (menuItems.length === 0) {
            console.log('⚠️ Nenhum item no cardápio, usando análise por tipo de empresa');
            return this.suggestByCompanyType(companyData);
        }

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

        console.log(`✅ ${suggestions.length} produtos sugeridos baseados no catálogo real`);
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
        this.hideLoading();
        document.getElementById('resultsSection').style.display = 'grid';

        // Renderizar informações da empresa
        this.renderCompanyInfo();
        
        // Renderizar análise do cardápio
        this.renderMenuAnalysis();
        
        // Renderizar produtos sugeridos
        this.renderProductSuggestions();
        
        // Renderizar script de vendas
        this.renderSalesScript();
    }

    renderCompanyInfo() {
        const container = document.getElementById('companyDetails');
        const company = this.currentProspect.company;
        
        container.innerHTML = `
            <div class="company-details">
                <h3><i class="fas fa-building"></i> ${company.fantasia || company.nome}</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>CNPJ:</strong> ${company.cnpj}
                    </div>
                    <div class="info-item">
                        <strong>Atividade:</strong> ${company.atividade_principal}
                    </div>
                    <div class="info-item">
                        <strong>Localização:</strong> ${company.municipio}/${company.uf}
                    </div>
                    <div class="info-item">
                        <strong>Situação:</strong> ${company.situacao}
                    </div>
                    <div class="info-item">
                        <strong>Abertura:</strong> ${company.abertura}
                    </div>
                    <div class="info-item">
                        <strong>Capital Social:</strong> R$ ${company.capital_social}
                    </div>
                </div>
                ${company.telefone ? `<p><i class="fas fa-phone"></i> <strong>Telefone:</strong> ${company.telefone}</p>` : ''}
                ${company.email ? `<p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${company.email}</p>` : ''}
            </div>
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
        if (window.socialAnalyzer) {
        window.socialAnalyzer.setupSocialAnalysisUI();
    }
    }

    renderMenuAnalysis() {
    const container = document.getElementById('menuAnalysis');
    const menu = this.currentProspect.menu;
    
    if (menu.items.length === 0) {
        container.innerHTML = '<p><i class="fas fa-info-circle"></i> Nenhum cardápio fornecido para análise</p>';
        return;
    }

    // Converter análise de texto para HTML com quebras adequadas
    const analysisHtml = this.convertAnalysisToHtml(menu.analysis);

    container.innerHTML = `
        <div class="menu-stats">
            <div class="stat-card">
                <span class="stat-number">${menu.items.length}</span>
                <span class="stat-label">Itens no Cardápio</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${Object.keys(menu.categories).length}</span>
                <span class="stat-label">Categorias</span>
            </div>
        </div>
        <div class="menu-categories">
            ${Object.entries(menu.categories).map(([category, items]) => `
                <div class="category-item">
                    <strong>${category}:</strong> ${items.length} itens
                </div>
            `).join('')}
        </div>
        <div class="menu-analysis-text">
            <h4><i class="fas fa-chart-pie"></i> Análise Detalhada:</h4>
            <div class="analysis-content">
                ${analysisHtml}
            </div>
        </div>
    `;
}

// Novo método para converter análise em HTML formatado
convertAnalysisToHtml(analysisText) {
    if (!analysisText) return '<p>Análise não disponível</p>';
    
    // Dividir o texto em linhas e processar
    const lines = analysisText.split('\n');
    let html = '';
    
    lines.forEach(line => {
        line = line.trim();
        
        if (!line) {
            // Linha vazia - adicionar espaçamento
            html += '<br>';
        } else if (line.startsWith('📊 **') && line.endsWith('**')) {
            // Título principal
            const title = line.replace(/📊 \*\*(.*)\*\*/, '$1');
            html += `<h4 class="analysis-title">📊 ${title}</h4>`;
        } else if (line.startsWith('✅ **') || line.startsWith('📂 **') || line.startsWith('💰 **')) {
            // Estatísticas principais
            const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<p class="analysis-stat">${text}</p>`;
        } else if (line.startsWith('🏷️ **') && line.endsWith('**')) {
            // Seção de categorias
            const title = line.replace(/🏷️ \*\*(.*)\*\*/, '$1');
            html += `<h5 class="analysis-section">🏷️ ${title}</h5>`;
        } else if (line.startsWith('🎯 **') && line.endsWith('**')) {
            // Seção de oportunidades
            const title = line.replace(/🎯 \*\*(.*)\*\*/, '$1');
            html += `<h5 class="analysis-section opportunities">🎯 ${title}</h5>`;
        } else if (line.startsWith('📋 **') && line.endsWith('**')) {
            // Seção de itens
            const title = line.replace(/📋 \*\*(.*)\*\*/, '$1');
            html += `<h5 class="analysis-section">📋 ${title}</h5>`;
        } else if (line.startsWith('• ')) {
            // Itens de lista
            const item = line.substring(2);
            html += `<div class="analysis-item">• ${item}</div>`;
        } else if (line.startsWith('🍕 **') || line.startsWith('🍔 **') || 
                  line.startsWith('🍽️ **') || line.startsWith('🥤 **') || 
                  line.startsWith('🍰 **')) {
            // Oportunidades específicas
            const text = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html += `<div class="opportunity-item">${text}</div>`;
        } else {
            // Texto normal
            html += `<p class="analysis-text">${line}</p>`;
        }
    });
    
    return html;
}


    renderProductSuggestions() {
        const container = document.getElementById('productSuggestions');
        const suggestions = this.currentProspect.suggestions;
        
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
                        <div class="price">R$ ${product.price.toFixed(2)}</div>
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
                    // Selecionar
                    card.classList.add('selected');
                    const product = this.currentProspect.suggestions.find(p => p.code === code);
                    if (product) {
                        this.selectedProducts.push(product);
                    }
                }

                // Atualizar contador
                document.getElementById('selectedCount').textContent = this.selectedProducts.length;
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
        
        let script = `
            <div class="script-section">
                <h4>🎯 ABERTURA PERSONALIZADA</h4>
                <p>Olá! Falo com o responsável pelas compras do(a) <strong>${nomeEmpresa}</strong>?</p>
                <p>Meu nome é [SEU NOME], sou consultor comercial da <strong>PMG Atacadista</strong>, uma empresa com 30 anos no mercado de distribuição de alimentos e bebidas.</p>
            </div>

            <div class="script-section">
                <h4>🏢 CONTEXTUALIZAÇÃO</h4>
                <p>Estive analisando o perfil da sua empresa aqui em <strong>${cidade}</strong> e vi que vocês trabalham com <strong>${company.atividade_principal.toLowerCase()}</strong>.</p>
                ${location.perfil_economico.includes('Alto') ? 
                    '<p>A região tem um excelente potencial de consumo, o que é uma grande oportunidade para crescimento!</p>' : 
                    '<p>Sabemos que a região tem suas particularidades, e por isso oferecemos condições especiais para parceiros locais.</p>'
                }
            </div>

            <div class="script-section">
                <h4>🎯 PROPOSTA DE VALOR</h4>
                <p>Com nossos 30 anos de experiência, atendemos mais de 20.000 clientes e oferecemos:</p>
                <ul>
                    <li>✅ <strong>Preços competitivos</strong> - Mas nosso objetivo é agregar valor ao seu negócio</li>
                    <li>✅ <strong>Entrega programada</strong> - Somos a maior distribuidora de bebidas e alimento de SP</li>
                    <li>✅ <strong>Qualidade garantida</strong> - Produtos das melhores marcas do mercado</li>
                    <li>✅ <strong>Condições especiais</strong> - Prazo e formas de pagamento flexíveis</li>
                </ul>
            </div>
        `;

        // Adicionar seção específica baseada no tipo de atividade
        if (atividade === 'pizzaria') {
            script += `
                <div class="script-section">
                    <h4>🍕 ESPECIALIZADO PARA PIZZARIAS</h4>
                    <p>Trabalhamos com produtos específicos para pizzarias:</p>
                    <ul>
                        <li>🥩 Calabresa, frango eoutras proteinas de primeira qualidade</li>
                        <li>🧀 Queijos especiais para pizza</li>
                        <li>🍅 Molhos de tomate sem acidez</li>
                        <li>🫒 Azeitonas importadas e nacionais</li>
                        <li>🥓 Bacon em cubos e muito mais</li>
                    </ul>
                </div>
            `;
        } else if (atividade === 'lanchonete') {
            script += `
                <div class="script-section">
                    <h4>🍔 ESPECIALIZADO PARA LANCHONETES</h4>
                    <p>Temos uma linha completa para lanchonetes:</p>
                    <ul>
                        <li>🍟 Batatas pré-fritas congeladas McCain e Simplot</li>
                        <li>🥓 Bacon fatiado e em cubos</li>
                        <li>🍖 Hambúrgueres artesanais</li>
                        <li>🧈 Maioneses e molhos especiais</li>
                        <li>🥤 Bebidas para revenda</li>
                    </ul>
                </div>
            `;
        } else if (atividade === 'restaurante') {
            script += `
                <div class="script-section">
                    <h4>🍽️ ESPECIALIZADO PARA RESTAURANTES</h4>
                    <p>Oferecemos produtos premium para restaurantes:</p>
                    <ul>
                        <li>🥩 Carnes bovinas resfriadas de primeira</li>
                        <li>🍗 Frangos e aves selecionados</li>
                        <li>🍚 Arroz tipo 1 para pratos executivos</li>
                        <li>🥘 Temperos e condimentos especiais</li>
                        <li>🐟 Peixes e frutos do mar</li>
                    </ul>
                </div>
            `;
        }

        script += `
            <div class="script-section">
                <h4>🤝 PRÓXIMOS PASSOS</h4>
                <p>Gostaria de apresentar nossos produtos?</p>
                <p>Posso enviar um catálogo personalizado com sugestões específicas para o seu negócio.</p>
                <p><strong>Quando seria um bom horário para conversarmos com mais detalhes?</strong></p>
            </div>

            <div class="script-section contact-info">
                <p><strong>PMG Atacadista - 30 anos de tradição</strong></p>
                <p>🌐 Site: www.pmg.com.br</p>
                </div>

            <div class="script-section">
                <h4>💡 DICAS IMPORTANTES</h4>
                <ul>
                    <li>🎯 Demonstre conhecimento sobre o negócio do cliente</li>
                    <li>👂 Escute as necessidades específicas</li>
                    <li>💰 Enfatize o custo-benefício da parceria</li>
                    <li>⏰ Seja pontual e cumpra os compromissos</li>
                    <li>📊 Prepare uma proposta personalizada após a visita</li>
                </ul>
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

    createOfferArt() {
    if (this.selectedProducts.length === 0) {
        alert('❌ Selecione pelo menos um produto para criar a arte da oferta');
        return;
    }

    const company = this.currentProspect.company;
    const nomeEmpresa = company.fantasia || company.nome;

    // Gerar arte da oferta
    const offerHtml = this.generateOfferTemplate(nomeEmpresa, this.selectedProducts);
    
    // Mostrar no modal
    document.getElementById('offerPreview').innerHTML = offerHtml;
    document.getElementById('offerModal').style.display = 'block';
    
    this.offerCount++;
    this.updateStats();
}

generateOfferTemplate(clientName, products) {
    return `
        <div class="offer-template">
            <div class="offer-header">
                <img src="logo.png" alt="Logo da Empresa" class="company-logo" crossorigin="anonymous">
                <h1>🎯 OFERTA EXCLUSIVA</h1>
                <p>Especialmente para <strong>${clientName}</strong> 💼</p>
            </div>

            <div class="offer-products">
                ${products.map(product => `
                    <div class="offer-product">
                        <img src="${product.image}" alt="${product.name}" onerror="this.src='${this.getProductImage(product.code)}'">
                        <h3>${product.name}</h3>
                        <div class="price">💰 R$ ${product.price.toFixed(2)}</div>
                        <div class="unit">📦 Por ${product.unit}</div>
                    </div>
                `).join('')}
            </div>

            <div class="offer-footer">
                <h2>🏆 PMG Atacadista - 30 Anos</h2>
                <div class="benefits">
                    <p>✅ Qualidade Garantida</p>
                    <p>🚛 Entrega Programada</p>
                    <p>💳 Condições Especiais</p>
                    <p>📞 Melhor Atendimento</p>
                </div>
                <div class="contact">
                    <p>🌐 www.pmg.com.br</p>
                    <p><strong>Entre em contato e garante já!</strong> 📱</p>
                </div>
            </div>
        </div>
    `;
}


    downloadOffer() {
    try {
        const offerContent = document.querySelector('.offer-template');
        if (!offerContent) {
            alert('❌ Conteúdo da oferta não encontrado');
            return;
        }

        // Incluir estilos inline no HTML para download
        const htmlWithStyles = this.addInlineStylesToImages(offerContent.outerHTML);
        
        const completeHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Oferta PMG Atacadista</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
        .offer-template { max-width: 100%; margin: 0 auto; }
        /* Estilos críticos para garantir formatação */
        .offer-product img {
            width: 100% !important;
            height: 150px !important;
            object-fit: contain !important;
            background: rgba(255,255,255,0.9) !important;
        }
        .company-logo {
            width: 150px !important;
            height: 150px !important;
            object-fit: contain !important;
            background: white !important;
        }
    </style>
</head>
<body>
    ${htmlWithStyles}
</body>
</html>`;

        // Criar e baixar arquivo
        const blob = new Blob([completeHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oferta_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 Download realizado com estilos preservados');
    } catch (error) {
        console.error('❌ Erro no download:', error);
        alert('❌ Erro ao fazer download da oferta');
    }
}

    async copyOfferText() {
    try {
        if (!this.currentProspect) {
            alert('❌ Nenhuma prospecção ativa para copiar');
            return;
        }

        const company = this.currentProspect.company;
        const nomeEmpresa = company.fantasia || company.razao_social || 'Empresa';
        const cidade = company.municipio || 'sua cidade';
        
        // Gerar texto formatado da oferta (mesmo conteúdo do modal)
        const offerText = this.generateOfferText(nomeEmpresa, cidade, company);
        
        await navigator.clipboard.writeText(offerText);
        
        // Feedback visual
        const button = document.getElementById('copyOfferText');
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Texto Copiado!';
        button.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.backgroundColor = '';
        }, 2000);
        
        console.log('✅ Texto da oferta copiado para área de transferência');
        
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
        console.log('📸 Iniciando cópia da imagem da oferta...');
        
        // CORREÇÃO CRÍTICA: Verificar se o modal está aberto
        const modal = document.getElementById('offerModal');
        if (!modal || modal.style.display !== 'block') {
            this.showCopyFeedback('❌ Modal de oferta não está aberto', 'error');
            return;
        }
        
        // CORREÇÃO: Usar seletor mais específico dentro do modal
        const offerElement = modal.querySelector('.offer-template');
        if (!offerElement) {
            console.error('❌ Elemento .offer-template não encontrado no modal');
            this.showCopyFeedback('❌ Template da oferta não encontrado', 'error');
            return;
        }
        
        // CORREÇÃO CRÍTICA: Verificar se há produtos na oferta
        const products = offerElement.querySelectorAll('.offer-product');
        if (products.length === 0) {
            console.error('❌ Nenhum produto encontrado na oferta');
            this.showCopyFeedback('❌ Oferta sem produtos para capturar', 'error');
            return;
        }
        
        console.log(`✅ Encontrados ${products.length} produtos para capturar`);
        
        // CORREÇÃO: Aguardar carregamento completo das imagens
        await this.waitForImagesToLoad(offerElement);
        
        // CORREÇÃO: Aplicar estilos de captura melhorados
        const originalStyles = await this.applyEnhancedCaptureStyles(offerElement);
        
        // CORREÇÃO: Aguardar renderização dos estilos
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const canvas = await html2canvas(offerElement, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    width: 1200,
    height: null,
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    removeContainer: false,
    imageTimeout: 30000,
    logging: false,
    // CORREÇÃO ESPECÍFICA PARA IMAGENS
    ignoreElements: function(element) {
        // Ignorar elementos problemáticos, mas manter imagens
        return false;
    },
    onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('.offer-template');
        if (clonedElement) {
            // Aplicar classe de captura no clone
        clonedElement.classList.add('capturing');
        
        // CORREÇÃO ESPECÍFICA: Logo no clone
        const clonedLogo = clonedElement.querySelector('.company-logo');
        if (clonedLogo) {
            // Forçar estilos específicos da logo
            clonedLogo.style.cssText = `
                width: 150px !important;
                height: 150px !important;
                object-fit: cover !important;
                object-position: center !important;
                background-color: white !important;
                display: block !important;
                margin: 0 auto 20px auto !important;
                border-radius: 0 !important;
                border: 4px solid white !important;
                transform: none !important;
                position: relative !important;
                z-index: 2 !important;
                aspect-ratio: 1/1 !important;
                box-sizing: border-box !important;
                max-width: 150px !important;
                max-height: 150px !important;
                min-width: 150px !important;
                min-height: 150px !important;
                flex-shrink: 0 !important;
            `;
            console.log('✅ Logo configurada no clone');
        }
        
        // Imagens de produtos separadamente
        const productImages = clonedElement.querySelectorAll('.offer-product img:not(.company-logo)');
        productImages.forEach(img => {
            img.style.cssText += `
                width: 120px !important;
                height: 120px !important;
                object-fit: contain !important;
            `;
        });
            // Aplicar classe de captura no clone
            clonedElement.classList.add('capturing');
            
            // CORREÇÃO CRÍTICA: Forçar estilos nas imagens do clone
            const clonedImages = clonedElement.querySelectorAll('img');
            clonedImages.forEach(img => {
                img.style.cssText += `
                    width: 120px !important;
                    height: 120px !important;
                    object-fit: contain !important;
                    object-position: center !important;
                    background-color: #ffffff !important;
                    display: block !important;
                    margin: 0 auto !important;
                `;
                
                // Logo específico
                if (img.classList.contains('company-logo') || 
                    img.parentElement.classList.contains('offer-header')) {
                    img.style.cssText += `
                        width: 100px !important;
                        height: 100px !important;
                        border-radius: 0 !important;
                        border: 3px solid white !important;
                    `;
                }
            });
        }
    }
});

        
        // Restaurar estilos originais
        this.restoreOriginalStyles(offerElement, originalStyles);
        
        // CORREÇÃO: Verificar se o canvas foi criado corretamente
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas vazio ou inválido gerado');
        }
        
        console.log(`✅ Canvas gerado: ${canvas.width}x${canvas.height}`);
        
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
                
                this.showCopyFeedback('✅ Imagem copiada com sucesso!', 'success');
                console.log('✅ Imagem da oferta copiada para área de transferência');
                
            } catch (clipboardError) {
                console.error('❌ Erro ao copiar para área de transferência:', clipboardError);
                // Fallback: download da imagem
                this.downloadImageFallback(canvas);
            }
        }, 'image/png', 1.0); // CORREÇÃO: qualidade máxima
        
    } catch (error) {
        console.error('❌ Erro detalhado ao copiar imagem:', error);
        this.showCopyFeedback(`❌ Erro: ${error.message}`, 'error');
    }
}

// NOVO MÉTODO: Aguardar carregamento das imagens
async waitForImagesToLoad(element) {
    const images = element.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve mesmo com erro para não travar
                // Timeout de segurança
                setTimeout(() => resolve(), 5000);
            }
        });
    });
    
    console.log(`⏳ Aguardando ${images.length} imagens carregarem...`);
    await Promise.all(imagePromises);
    console.log('✅ Todas as imagens processadas');
}

async applyEnhancedCaptureStyles(element) {
    const originalStyles = {};
    
    // Adicionar classe de captura
    element.classList.add('capturing');
    
    // Adicionar classe de captura
    element.classList.add('capturing');
    
    // CORREÇÃO ESPECÍFICA PARA LOGO - tratamento separado
    const logo = element.querySelector('.company-logo');
    if (logo) {
        console.log('🖼️ Processando logo da empresa...');
        
        // Salvar TODOS os estilos originais
        originalStyles.logo = {
            width: logo.style.width,
            height: logo.style.height,
            objectFit: logo.style.objectFit,
            objectPosition: logo.style.objectPosition,
            backgroundColor: logo.style.backgroundColor,
            display: logo.style.display,
            margin: logo.style.margin,
            borderRadius: logo.style.borderRadius,
            border: logo.style.border,
            transform: logo.style.transform,
            position: logo.style.position,
            zIndex: logo.style.zIndex,
            aspectRatio: logo.style.aspectRatio,
            boxSizing: logo.style.boxSizing,
            crossOrigin: logo.crossOrigin,
            // Salvar computedStyles também
            computedWidth: window.getComputedStyle(logo).width,
            computedHeight: window.getComputedStyle(logo).height
        };
        
        // CORREÇÃO CRÍTICA: Aguardar logo carregar ANTES de aplicar estilos
        await this.ensureLogoLoaded(logo);
        
        // APLICAR estilos específicos da logo
        logo.crossOrigin = 'anonymous';
        logo.style.width = '150px';
        logo.style.height = '150px';
        logo.style.objectFit = 'cover'; // Cover para logo
        logo.style.objectPosition = 'center';
        logo.style.backgroundColor = 'white';
        logo.style.display = 'block';
        logo.style.margin = '0 auto 20px auto';
        logo.style.borderRadius = '50%';
        logo.style.border = '4px solid white';
        logo.style.transform = 'none';
        logo.style.position = 'relative';
        logo.style.zIndex = '2';
        logo.style.aspectRatio = '1/1';
        logo.style.boxSizing = 'border-box';
        logo.style.maxWidth = '150px';
        logo.style.maxHeight = '150px';
        logo.style.minWidth = '150px';
        logo.style.minHeight = '150px';
        logo.style.flexShrink = '0';
        
        console.log('✅ Logo configurada para captura');
    }
    
    // Tratamento das OUTRAS imagens (produtos)
    const productImages = element.querySelectorAll('.offer-product img:not(.company-logo)');
    originalStyles.productImages = [];
    
    productImages.forEach((img, index) => {
        originalStyles.productImages[index] = {
            width: img.style.width,
            height: img.style.height,
            objectFit: img.style.objectFit
        };
        
        // Configurações específicas para imagens de produtos
        img.style.width = '120px';
        img.style.height = '120px';
        img.style.objectFit = 'contain'; // Contain para produtos
    });
    // CORREÇÃO CRÍTICA: Aguardar imagens carregarem e aplicar estilos específicos
    const images = element.querySelectorAll('img');
    originalStyles.images = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        // Salvar estilos originais
        originalStyles.images[i] = {
            width: img.style.width,
            height: img.style.height,
            objectFit: img.style.objectFit,
            objectPosition: img.style.objectPosition,
            backgroundColor: img.style.backgroundColor,
            display: img.style.display,
            margin: img.style.margin,
            borderRadius: img.style.borderRadius,
            border: img.style.border,
            crossOrigin: img.crossOrigin
        };
        
        // CORREÇÃO PRINCIPAL: Aplicar estilos fixos para cada imagem
        img.crossOrigin = 'anonymous'; // Para evitar problemas de CORS
        img.style.width = '120px';
        img.style.height = '120px';
        img.style.objectFit = 'contain';
        img.style.objectPosition = 'center';
        img.style.backgroundColor = '#ffffff';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.borderRadius = '8px';
        img.style.overflow = 'hidden';
        
        
        // CORREÇÃO CRÍTICA: Aguardar cada imagem carregar
        if (!img.complete || img.naturalWidth === 0) {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 2000); // Timeout de segurança
                img.onload = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                img.onerror = () => {
                    clearTimeout(timeout);
                    console.warn(`Imagem falhou ao carregar: ${img.src}`);
                    resolve();
                };
            });
        }
    }
    
    // Aplicar outros estilos gerais
    element.style.width = '1200px';
    element.style.maxWidth = '1200px';
    element.style.height = 'auto';
    element.style.transform = 'none';
    element.style.backgroundColor = '#ffffff';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
    
    return originalStyles;
}
// NOVO: Método específico para garantir carregamento da logo
async ensureLogoLoaded(logoElement) {
    return new Promise((resolve) => {
        if (logoElement.complete && logoElement.naturalWidth > 0) {
            console.log('✅ Logo já carregada');
            resolve();
            return;
        }
        
        console.log('⏳ Aguardando carregamento da logo...');
        
        const timeout = setTimeout(() => {
            console.warn('⚠️ Timeout no carregamento da logo, continuando...');
            resolve();
        }, 5000);
        
        logoElement.onload = () => {
            clearTimeout(timeout);
            console.log('✅ Logo carregada com sucesso');
            resolve();
        };
        
        logoElement.onerror = () => {
            clearTimeout(timeout);
            console.error('❌ Erro ao carregar logo, continuando...');
            resolve();
        };
        
        // Forçar recarregamento se necessário
        if (logoElement.src) {
            const currentSrc = logoElement.src;
            logoElement.src = '';
            logoElement.src = currentSrc + '?' + Date.now(); // Cache bust
        }
    });
}

// NOVO MÉTODO: Forçar visibilidade no clone
forceVisibilityInClone(clonedElement) {
    // Aplicar estilos diretamente via CSS inline
    clonedElement.style.cssText += `
        position: relative !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
        width: 1200px !important;
        max-width: 1200px !important;
        background-color: #ffffff !important;
    `;
    
    // Forçar visibilidade dos produtos
    const products = clonedElement.querySelectorAll('.offer-product');
    products.forEach(product => {
        product.style.cssText += `
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            background-color: rgba(255,255,255,0.95) !important;
        `;
        
        const img = product.querySelector('img');
        if (img) {
            img.style.cssText += `
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                width: 120px !important;
                height: 120px !important;
            `;
        }
    });
    
    // Forçar visibilidade do grid
    const grid = clonedElement.querySelector('.offer-products');
    if (grid) {
        grid.style.cssText += `
            display: grid !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
    }
}

restoreOriginalStyles(element, originalStyles) {
    // Remover classe de captura
    element.classList.remove('capturing');
     // CORREÇÃO: Restaurar estilos do logo especificamente
    if (originalStyles.logo) {
        const logo = element.querySelector('.company-logo');
        if (logo) {
            Object.assign(logo.style, originalStyles.logo);
        }
    }
    // CORREÇÃO: Restaurar estilos das imagens especificamente
    if (originalStyles.images) {
        const images = element.querySelectorAll('img');
        images.forEach((img, index) => {
            if (originalStyles.images[index]) {
                const original = originalStyles.images[index];
                img.style.width = original.width || '';
                img.style.height = original.height || '';
                img.style.objectFit = original.objectFit || '';
                img.style.objectPosition = original.objectPosition || '';
                img.style.backgroundColor = original.backgroundColor || '';
                img.style.display = original.display || '';
                img.style.margin = original.margin || '';
                img.style.borderRadius = original.borderRadius || '';
                img.style.border = original.border || '';
                img.crossOrigin = original.crossOrigin || null;
            }
        });
    }
    
    // Restaurar estilos gerais do elemento
    element.style.width = '';
    element.style.maxWidth = '';
    element.style.height = '';
    element.style.transform = '';
    element.style.backgroundColor = '';
    element.style.visibility = '';
    element.style.opacity = '';
}


// MÉTODO MELHORADO: Fallback para download
downloadImageFallback(canvas) {
    try {
        const link = document.createElement('a');
        link.download = `oferta-personalizada-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showCopyFeedback('📥 Imagem baixada como arquivo', 'info');
    } catch (error) {
        console.error('❌ Erro no fallback de download:', error);
        this.showCopyFeedback('❌ Erro ao baixar imagem', 'error');
    }
}

// MÉTODO MELHORADO: Feedback visual
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
        info: '#17a2b8'
    };
    
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
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
debugOfferCapture() {
    const modal = document.getElementById('offerModal');
    const offer = modal?.querySelector('.offer-template');
    const products = offer?.querySelectorAll('.offer-product');
    
    console.log('🔍 DEBUG - Estado do modal:', {
        modalExists: !!modal,
        modalVisible: modal?.style.display === 'block',
        offerExists: !!offer,
        productsCount: products?.length || 0,
        offerDimensions: offer ? {
            width: offer.offsetWidth,
            height: offer.offsetHeight
        } : null
    });
    
    products?.forEach((product, i) => {
        const img = product.querySelector('img');
        console.log(`Produto ${i}:`, {
            visible: window.getComputedStyle(product).visibility,
            display: window.getComputedStyle(product).display,
            hasImage: !!img,
            imageLoaded: img?.complete && img?.naturalWidth > 0
        });
    });
}

debugOfferModal() {
    const modal = document.getElementById('offerModal');
    console.log('🔍 DEBUG COMPLETO DO MODAL:');
    console.log('Modal encontrado:', !!modal);
    
    if (modal) {
        const computedStyle = window.getComputedStyle(modal);
        
        console.log('📊 Estilos computados:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            position: computedStyle.position,
            zIndex: computedStyle.zIndex
        });
        
        console.log('📐 Dimensões:', {
            offsetWidth: modal.offsetWidth,
            offsetHeight: modal.offsetHeight,
            scrollWidth: modal.scrollWidth,
            scrollHeight: modal.scrollHeight,
            clientWidth: modal.clientWidth,
            clientHeight: modal.clientHeight
        });
        
        console.log('🎨 Classes:', modal.className);
        console.log('🔧 Estilos inline:', modal.style.cssText);
        
        // Verificar elementos filhos
        const modalContent = modal.querySelector('.modal-content');
        const offerTemplate = modal.querySelector('.offer-template');
        const offerPreview = modal.querySelector('.offer-preview');
        
        console.log('🔍 Elementos encontrados:');
        console.log('  .modal-content:', !!modalContent, modalContent?.offsetWidth + 'x' + modalContent?.offsetHeight);
        console.log('  .offer-template:', !!offerTemplate, offerTemplate?.offsetWidth + 'x' + offerTemplate?.offsetHeight);
        console.log('  .offer-preview:', !!offerPreview, offerPreview?.offsetWidth + 'x' + offerPreview?.offsetHeight);
        
        // Verificar se é visível
        const isVisible = modal.offsetWidth > 0 && modal.offsetHeight > 0 && 
                         computedStyle.display !== 'none' && 
                         computedStyle.visibility !== 'hidden' && 
                         parseFloat(computedStyle.opacity) > 0;
                         
        console.log('👁️ Modal visível:', isVisible);
        
        return {
            modal,
            modalContent,
            offerTemplate,
            offerPreview,
            isVisible,
            computedStyle
        };
    } else {
        console.log('❌ Modal não encontrado!');
        return null;
    }
}


// Método fallback caso o navigator.clipboard não funcione
fallbackCopyMethod() {
    try {
        const offerContent = document.querySelector('.offer-template');
        const htmlWithStyles = this.addInlineStylesToImages(offerContent.outerHTML);
        
        // Criar elemento temporário para seleção
        const textArea = document.createElement('textarea');
        textArea.value = htmlWithStyles;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('✅ Oferta copiada (método compatibilidade)!');
    } catch (error) {
        console.error('❌ Erro no método fallback:', error);
        alert('❌ Erro ao copiar. Tente novamente.');
    }
}

// Adicionar este método na classe ProspeccaoManager
addInlineStylesToImages(htmlString) {
    // Criar um elemento temporário para manipular o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    
    // Aplicar estilos inline às imagens dos produtos
    const productImages = tempDiv.querySelectorAll('.offer-product img');
    productImages.forEach(img => {
        img.style.cssText = `
            width: 100% !important;
            height: 150px !important;
            object-fit: contain !important;
            border-radius: 12px !important;
            margin-bottom: 15px !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            background: rgba(255,255,255,0.9) !important;
            box-sizing: border-box !important;
        `;
    });
    
    // Aplicar estilos inline ao logo da empresa
    const companyLogo = tempDiv.querySelector('.company-logo');
    if (companyLogo) {
        companyLogo.style.cssText = `
            width: 150px !important;
            height: 150px !important;
            border-radius: 0 !important;
            margin-bottom: 20px !important;
            border: 4px solid white !important;
            object-fit: contain !important;
            background: white !important;
            box-sizing: border-box !important;
        `;
    }
    
    // Aplicar estilos aos containers dos produtos
    const offerProducts = tempDiv.querySelectorAll('.offer-product');
    offerProducts.forEach(product => {
        product.style.cssText += `
            max-width: 350px !important;
            box-sizing: border-box !important;
        `;
    });
    
    return tempDiv.innerHTML;
}
// Adicionar este método também
cloneWithInlineStyles(element) {
    const clone = element.cloneNode(true);
    
    // Aplicar estilos computados aos elementos principais
    const originalImages = element.querySelectorAll('img');
    const clonedImages = clone.querySelectorAll('img');
    
    originalImages.forEach((originalImg, index) => {
        if (clonedImages[index]) {
            const computedStyle = window.getComputedStyle(originalImg);
            clonedImages[index].style.cssText = `
                width: ${computedStyle.width} !important;
                height: ${computedStyle.height} !important;
                object-fit: ${computedStyle.objectFit} !important;
                border-radius: ${computedStyle.borderRadius} !important;
                margin-bottom: ${computedStyle.marginBottom} !important;
                border: ${computedStyle.border} !important;
                background: ${computedStyle.background} !important;
            `;
        }
    });
    
    return clone;
}

copyImageToClipboard() {
    if (this.offerImageUrl) {
        fetch(this.offerImageUrl)
            .then(res => res.blob())
            .then(blob => {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(() => {
                    alert('✅ Imagem copiada para a área de transferência!');
                    // Revoga a URL após a cópia bem-sucedida
                    URL.revokeObjectURL(this.offerImageUrl);
                    this.offerImageUrl = null;
                    this.isOfferImageGenerated = false;
                }).catch(err => {
                    console.error('❌ Erro ao copiar imagem:', err);
                    alert('❌ Erro ao copiar imagem: ' + err.message + '. Tente gerar a oferta novamente.');
                });
            }).catch(err => {
                console.error('❌ Erro ao buscar blob:', err);
                alert('❌ Falha ao acessar a imagem. Verifique o console para mais detalhes.');
            });
    } else {
        alert('❌ Imagem não disponível. Gere a oferta primeiro.');
    }
}

    

    updateStats() {
        
        
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
}

/// Inicialização coordenada do sistema
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Inicializando sistema completo...');
        
        // Se existe CatalogManager, inicializar primeiro
        if (window.CatalogManager) {
            window.catalogManager = new CatalogManager();
            await window.catalogManager.init();
            console.log('✅ CatalogManager inicializado');
        }
        
        // Depois inicializar ProspeccaoManager
        window.prospeccaoManager = new ProspeccaoManager();
        console.log('✅ Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        // Mesmo com erro, tentar inicializar ProspeccaoManager
        try {
            window.prospeccaoManager = new ProspeccaoManager();
        } catch (fallbackError) {
            console.error('❌ Erro crítico na inicialização:', fallbackError);
        }
    }
});


