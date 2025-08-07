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
    carne: ['carne', 'beef', 'bovina', 'bovino', 'boi', 'vaca', 'acém', 'alcatra', 'contra filé', 'contrafilé', 'filé mignon', 'fraldinha', 'maminha', 'patinho', 'coxão', 'lagarto', 'músculo', 'costela', 'cupim', 'rabo', 'picanha', 'aranha', 'capa de filé', 'cordão', 'miolo', 'paleta', 'peito', 'matoso', 'jordanésia', 'plena', 'gold beef', 'frigoestrela', 'desfiada', 'moída', 'seca'],
    
    frango: ['frango', 'chicken', 'galinha', 'ave', 'aves', 'peito', 'coxa', 'sobrecoxa', 'asa', 'asas', 'sassami', 'filezinho', 'coxinha das asas', 'tulipa', 'passarinho', 'coração', 'fígado', 'moela', 'empanado', 'nuggets', 'steak', 'chicken', 'desfiado', 'cozido', 'temperado', 'adoro', 'itabom', 'copacol', 'friato', 'aurora', 'perdigão', 'sadia', 'seara'],
    
    porco: ['porco', 'suíno', 'suína', 'lombo', 'costelinha', 'costela', 'bisteca', 'carré', 'pernil', 'panceta', 'barriga', 'orelha', 'pé', 'rabo', 'linguiça', 'toscana', 'temperada', 'pamplona', 'my pork', 'frigoestrela', 'reffinato', 'salgado', 'tchê estrela', 'desfiado'],
    
    peixe: ['peixe', 'fish', 'atum', 'sardinha', 'tilápia', 'bacalhau', 'merluza', 'cação', 'camarão', 'palemon', 'oceani', 'kani', 'aliche', 'polaca', 'alasca', 'seapro', 'gomes da costa', 'coqueiro', 'pescador', 'empanado', 'iscas'],
    
    embutidos: ['bacon', 'presunto', 'apresuntado', 'blanquet', 'peito de peru', 'mortadela', 'salsicha', 'linguiça', 'calabresa', 'salame', 'pepperoni', 'copa', 'lombo canadense', 'paio', 'defumado', 'fatiado', 'italiano', 'hamburguês', 'toscana', 'aurora', 'sadia', 'perdigão', 'seara', 'ceratti', 'frimesa', 'rezende', 'prieto', 'dália', 'nobre'],
    
    queijo: ['queijo', 'muçarela', 'mozzarella', 'prato', 'cheddar', 'parmesão', 'provolone', 'coalho', 'gorgonzola', 'brie', 'camembert', 'gouda', 'gruyère', 'estepe', 'reino', 'emmental', 'maasdam', 'mascarpone', 'ricota', 'cottage', 'minas', 'frescal', 'padrão', 'búfala', 'processado', 'fatiado', 'fracionado', 'derretido', 'zero lactose', 'tirolez', 'scala', 'quatá', 'polenghi', 'vigor', 'coronata'],
    
    leite: ['leite', 'integral', 'desnatado', 'semidesnatado', 'condensado', 'zero lactose', 'em pó', 'italac', 'piracanjuba', 'jussara', 'triangulo mineiro', 'la serenissima', 'mococa', 'itambé'],
    
    iogurte: ['iogurte', 'natural', 'grego', 'bebida láctea', 'coalhada', 'kefir'],
    
    laticínios: ['creme de leite', 'nata', 'chantilly', 'manteiga', 'margarina', 'requeijão', 'cream cheese', 'doce de leite', 'catupiry', 'philadelphia', 'danúbio', 'polenghi', 'vigor', 'biocreme', 'quatá', 'sem amido', 'com amido', 'traditional', 'sabor cheddar'],
    
    arroz: ['arroz', 'branco', 'integral', 'parboilizado', 'tipo 1', 'arbório', 'basmati', 'japonês', 'risoto', 'camil', 'solito', 'namorado', 'guin', 'inarí', '7 grãos'],
    
    feijão: ['feijão', 'preto', 'carioca', 'fradinho', 'branco', 'tipo 1', 'camil', 'solito'],
    
    grãos: ['lentilha', 'grão de bico', 'ervilha', 'milho', 'aveia', 'quinoa', 'soja', 'proteína texturizada', 'camil', 'bonare', 'quero'],
    
    massas: ['macarrão', 'massa', 'espaguete', 'spaghetti', 'penne', 'fusilli', 'parafuso', 'talharim', 'lasanha', 'nhoque', 'caracolino', 'gravata', 'fettuccine', 'yakissoba', 'fresca', 'grano duro', 'barilla', 'petybon', 'dona benta', 'renata', 'famigliare'],
    
    farinhas: ['farinha', 'trigo', 'mandioca', 'milho', 'rosca', 'panko', 'tipo 1', 'pizza', 'pastel', 'premium', 'especial', 'integral', 'anaconda', 'dona benta', 'rosa branca', 'nita', 'suprema', 'bunge', 'venturelli'],
    
    óleos: ['óleo', 'azeite', 'soja', 'girassol', 'canola', 'oliva', 'algodão', 'milho', 'dendê', 'liza', 'soya', 'coamo', 'cocamar', 'extra virgem', 'composto', 'lisboa', 'gallo', 'morixe'],
    
    açúcar: ['açúcar', 'cristal', 'refinado', 'mascavo', 'demerara', 'confeiteiro', 'orgânico', 'sachê', 'união', 'globo', 'caravelas', 'alto alegre', 'adoçante', 'sucralose'],
    
    temperos: ['tempero', 'sal', 'pimenta', 'orégano', 'manjericão', 'páprica', 'chimichurri', 'cominho', 'colorífico', 'alho', 'cebola', 'salsa', 'cebolinha', 'louro', 'canela', 'noz moscada', 'gergelim', 'lemon pepper', 'baiano', 'sazón', 'ajinomoto', 'glutamato', 'fumaça', 'defumado', 'penina', 'brasilseco', 'kisabor'],
    
    molhos: ['molho', 'catchup', 'ketchup', 'maionese', 'mostarda', 'barbecue', 'shoyu', 'tarê', 'tomate', 'pimenta', 'inglês', 'agridoce', 'tártaro', 'cheddar', 'bechamel', 'demi glace', 'billy jack', 'thai sweet chilli', 'chipotle', 'pizza', 'heinz', 'hellmann', 'ekma', 'cepêra', 'hemmer'],
    
    conservas: ['conserva', 'azeitona', 'palmito', 'champignon', 'alcachofra', 'pepininho', 'biquinho', 'jalapeño', 'alcaparra', 'tomate seco', 'cogumelo', 'aspargos', 'pickles', 'arco bello', 'colosso', 'di salerno', 'granja são paulo'],
    
    bebidas_refrigerantes: ['refrigerante', 'coca cola', 'pepsi', 'guaraná', 'fanta', 'sprite', 'dolly', 'sukita', 'antarctica', 'zero', 'sem açúcar', 'diet', 'tubaína', 'itubaína'],
    
    bebidas_alcoolicas: ['cerveja', 'vinho', 'whisky', 'vodka', 'cachaça', 'gin', 'rum', 'licor', 'aperitivo', 'brahma', 'skol', 'heineken', 'stella', 'budweiser', 'original', 'johnnie walker', 'jack daniels', 'absolut', 'smirnoff', '51', 'ypióca'],
    
    sucos: ['suco', 'néctar', 'polpa', 'concentrado', 'del valle', 'maguary', 'ice tea', 'maracujá', 'laranja', 'uva', 'manga', 'abacaxi', 'caju', 'limão'],
    
    água: ['água', 'mineral', 'crystal', 'são lourenço', 'buonavita', 'com gás', 'sem gás', 'tônica', 'schweppes'],
    
    congelados: ['congelado', 'hambúrguer', 'nuggets', 'batata', 'pizza', 'pão de alho', 'pão de queijo', 'polenta', 'mandioca', 'brócolis', 'couve flor', 'ervilha', 'seleta', 'escarola', 'espinafre', 'anéis de cebola', 'hash brown', 'mccain', 'bem brasil', 'lambweston', 'simplot'],
    
    doces: ['chocolate', 'doce', 'brigadeiro', 'goiabada', 'geleia', 'mel', 'bombom', 'paçoca', 'cocada', 'achocolatado', 'nescau', 'toddy', 'ovomaltine', 'forneável', 'cobertura', 'recheio', 'granulado', 'confeiteiro', 'harald', 'nestlé', 'dori'],
    
    limpeza: ['detergente', 'sabão', 'amaciante', 'desinfetante', 'água sanitária', 'multiuso', 'ypê', 'clássico', 'eucalipto', 'lavanda'],
    
    higiene: ['papel higiênico', 'papel toalha', 'absorvente', 'fralda', 'lenço', 'algodão', 'shampoo', 'condicionador', 'sabonete', 'creme dental', 'desodorante'],
    
    energéticos: ['energético', 'isotônico', 'red bull', 'monster', 'gatorade', 'long one'],
    
    especiais: ['sem glúten', 'sem lactose', 'zero açúcar', 'diet', 'light', 'orgânico', 'integral', 'natural', 'premium', 'gourmet', 'tradicional', 'caseiro', 'artesanal']
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
    // Formas de preparo/cocção
    { regex: /frit[ao]s?/, keyword: 'frito' },
    { regex: /assad[ao]s?/, keyword: 'assado' },
    { regex: /cozid[ao]s?/, keyword: 'cozido' },
    { regex: /grelhad[ao]s?/, keyword: 'grelhado' },
    { regex: /empanad[ao]s?/, keyword: 'empanado' },
    { regex: /refogad[ao]s?/, keyword: 'refogado' },
    { regex: /marinád[ao]s?|marinad[ao]s?/, keyword: 'marinado' },
    { regex: /fermentad[ao]s?/, keyword: 'fermentado' },
    { regex: /curad[ao]s?/, keyword: 'curado' },
    { regex: /maturad[ao]s?/, keyword: 'maturado' },
    { regex: /defumad[ao]s?/, keyword: 'defumado' },
    { regex: /temperado/, keyword: 'temperado' },

    // Estados/temperatura
    { regex: /congelad[ao]s?/, keyword: 'congelado' },
    { regex: /resfriad[ao]s?/, keyword: 'resfriado' },
    { regex: /pasteurizad[ao]s?/, keyword: 'pasteurizado' },
    { regex: /seco/, keyword: 'seco' },
    { regex: /líquido/, keyword: 'líquido' },

    // Formas de corte/processamento
    { regex: /fatiad[ao]s?/, keyword: 'fatiado' },
    { regex: /picad[ao]s?/, keyword: 'picado' },
    { regex: /desfiado/, keyword: 'desfiado' },
    { regex: /ralad[ao]s?/, keyword: 'ralado' },
    { regex: /moíd[ao]s?/, keyword: 'moído' },
    { regex: /triturd[ao]s?/, keyword: 'triturado' },
    { regex: /laminad[ao]s?/, keyword: 'laminado' },
    { regex: /granuld[ao]s?/, keyword: 'granulado' },
    { regex: /cortad[ao]s?/, keyword: 'cortado' },
    { regex: /serrd[ao]s?/, keyword: 'serrado' },
    { regex: /em tiras/, keyword: 'em tiras' },
    { regex: /em cubos/, keyword: 'em cubos' },
    { regex: /em rodelas/, keyword: 'em rodelas' },
    { regex: /em pedaços/, keyword: 'em pedaços' },
    { regex: /em pó/, keyword: 'em pó' },
    { regex: /flocos/, keyword: 'flocos' },

    // Condições físicas
    { regex: /inteiro/, keyword: 'inteiro' },
    { regex: /sem osso/, keyword: 'sem osso' },
    { regex: /com osso/, keyword: 'com osso' },
    { regex: /sem pele/, keyword: 'sem pele' },
    { regex: /com pele/, keyword: 'com pele' },
    { regex: /sem casca/, keyword: 'sem casca' },
    { regex: /com casca/, keyword: 'com casca' },
    { regex: /descascad[ao]s?/, keyword: 'descascado' },
    { regex: /sem caroço/, keyword: 'sem caroço' },
    { regex: /com caroço/, keyword: 'com caroço' },
    { regex: /limpo/, keyword: 'limpo' },

    // Características nutricionais/dietéticas
    { regex: /sem sal/, keyword: 'sem sal' },
    { regex: /com sal/, keyword: 'com sal' },
    { regex: /sem açúcar/, keyword: 'sem açúcar' },
    { regex: /zero açúcares/, keyword: 'zero açúcares' },
    { regex: /sem lactose/, keyword: 'sem lactose' },
    { regex: /zero lactose/, keyword: 'zero lactose' },
    { regex: /light/, keyword: 'light' },
    { regex: /diet/, keyword: 'diet' },
    { regex: /integral/, keyword: 'integral' },
    { regex: /desnatad[ao]/, keyword: 'desnatado' },
    { regex: /semidesnatad[ao]/, keyword: 'semidesnatado' },
    { regex: /orgânic[ao]/, keyword: 'orgânico' },

    // Sabores e características
    { regex: /doce/, keyword: 'doce' },
    { regex: /salgad[ao]/, keyword: 'salgado' },
    { regex: /picante/, keyword: 'picante' },
    { regex: /suave/, keyword: 'suave' },
    { regex: /natural/, keyword: 'natural' },
    { regex: /crocante/, keyword: 'crocante' },
    { regex: /macio/, keyword: 'macio' },
    { regex: /extra virgem/, keyword: 'extra virgem' },
    { regex: /concentrd[ao]/, keyword: 'concentrado' },

    // Qualidade/categoria
    { regex: /premium/, keyword: 'premium' },
    { regex: /gourmet/, keyword: 'gourmet' },
    { regex: /tradicional/, keyword: 'tradicional' },
    { regex: /especial/, keyword: 'especial' },
    { regex: /artesanal/, keyword: 'artesanal' },
    { regex: /caseiro/, keyword: 'caseiro' },
    { regex: /tipo [1-9]/, keyword: 'tipo classificado' },
    { regex: /classe (longo|curto)/, keyword: 'classe especial' },

    // Processamento industrial
    { regex: /processad[ao]s?/, keyword: 'processado' },
    { regex: /refinad[ao]s?/, keyword: 'refinado' },
    { regex: /cristal/, keyword: 'cristal' },
    { regex: /instantâne[ao]/, keyword: 'instantâneo' },
    { regex: /solúvel/, keyword: 'solúvel' },

    // Formas específicas de produtos
    { regex: /banda/, keyword: 'banda' },
    { regex: /barra/, keyword: 'barra' },
    { regex: /bisnaga/, keyword: 'bisnaga' },
    { regex: /espeto/, keyword: 'espeto' },
    { regex: /sachê/, keyword: 'sachê' }
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
        terms: ['carne', 'boi', 'bovino', 'frango', 'porco', 'bacon', 'linguica', 'acém', 'alcatra', 'picanha', 'fraldinha', 'contrafilé', 'filé', 'maminha', 'costela', 'cupim', 'lagarto', 'músculo', 'peito', 'coxa', 'sobrecoxa', 'asa', 'sassami', 'lombo', 'pernil', 'bisteca', 'carré'],
        related: ['grelhado', 'assado', 'frito', 'temperado', 'defumado', 'resfriado', 'congelado', 'desfiado', 'moído', 'seco', 'cozido', 'marinado', 'sem osso', 'com osso']
    },

    embutidos: {
        terms: ['presunto', 'mortadela', 'salame', 'calabresa', 'pepperoni', 'copa', 'lombo canadense', 'paio', 'salsicha', 'blanquet', 'apresuntado', 'peito de peru'],
        related: ['fatiado', 'defumado', 'italiana', 'tradicional', 'toscana', 'hamburguês', 'hot dog', 'gourmet']
    },

    queijos: {
        terms: ['queijo', 'mussarela', 'muçarela', 'parmesão', 'cheddar', 'catupiry', 'cream cheese', 'provolone', 'gorgonzola', 'brie', 'gouda', 'coalho', 'prato', 'minas', 'ricota', 'mascarpone', 'cottage', 'requeijão'],
        related: ['derretido', 'gratinado', 'cremoso', 'fatiado', 'ralado', 'fracionado', 'processado', 'sem lactose', 'frescal', 'cura', 'búfala', 'espeto', 'forma']
    },

    massas: {
        terms: ['massa', 'macarrão', 'pizza', 'lasanha', 'spaghetti', 'espaguete', 'penne', 'fusilli', 'talharim', 'fettuccine', 'parafuso', 'caracolino', 'pastel', 'nhoque'],
        related: ['molho', 'italiana', 'caseira', 'grano duro', 'ovos', 'fresca', 'yakissoba', 'gravata', 'com ovos', 'tradicional']
    },

    empanados: {
        terms: ['empanado', 'milanesa', 'parmegiana', 'crocante', 'nuggets', 'steak', 'chicken', 'iscas', 'tirinhas'],
        related: ['dourado', 'frito', 'tradicional', 'congelado', 'temperado', 'supreme', 'apimentado']
    },

    molhos: {
        terms: ['molho', 'catchup', 'ketchup', 'maionese', 'mostarda', 'barbecue', 'shoyu', 'tarê', 'extrato', 'tomate', 'bechamel', 'tártaro', 'cheddar'],
        related: ['sachê', 'temperado', 'picante', 'agridoce', 'tradicional', 'pizza', 'italiano', 'salada', 'caesar', 'gourmet', 'artesanal']
    },

    conservas: {
        terms: ['conserva', 'azeitona', 'palmito', 'champignon', 'alcachofra', 'pepininho', 'pickles', 'cogumelo', 'aspargos', 'tomate seco', 'atum', 'sardinha'],
        related: ['fatiado', 'inteiro', 'picado', 'rodela', 'enlatado', 'vidro', 'óleo', 'natural', 'pupunha', 'açaí']
    },

    temperos: {
        terms: ['tempero', 'sal', 'pimenta', 'orégano', 'manjericão', 'páprica', 'chimichurri', 'cominho', 'colorífico', 'alho', 'cebola', 'canela', 'noz moscada', 'gergelim', 'curry', 'wasabi'],
        related: ['flocos', 'pó', 'grãos', 'desidratado', 'brasilseco', 'penina', 'food service', 'sachê', 'defumado', 'picante', 'doce']
    },

    bebidas: {
        terms: ['refrigerante', 'suco', 'água', 'cerveja', 'vinho', 'whisky', 'vodka', 'cachaça', 'coca cola', 'guaraná', 'sprite', 'fanta', 'energético'],
        related: ['lata', 'pet', 'garrafa', 'zero açúcar', 'diet', 'tradicional', 'premium', 'integral', 'concentrado', 'tetra pack', 'long neck']
    },

    laticínios: {
        terms: ['leite', 'iogurte', 'manteiga', 'margarina', 'creme de leite', 'leite condensado', 'nata', 'chantilly', 'ovo'],
        related: ['integral', 'desnatado', 'zero lactose', 'pasteurizado', 'condensado', 'semidesnatado', 'com sal', 'sem sal', 'sachê', 'tablete']
    },

    doces: {
        terms: ['chocolate', 'doce', 'brigadeiro', 'goiabada', 'mel', 'açúcar', 'geleia', 'bombom', 'paçoca', 'cocada'],
        related: ['forneável', 'cobertura', 'recheio', 'granulado', 'ao leite', 'branco', 'meio amargo', 'cristal', 'refinado', 'mascavo', 'confeiteiro']
    },

    farinhas: {
        terms: ['farinha', 'trigo', 'mandioca', 'milho', 'rosca', 'polvilho', 'fubá', 'tapioca', 'panko'],
        related: ['tipo 1', 'integral', 'pizza', 'pastel', 'premium', 'especial', 'fina', 'grossa', 'torrada', 'crua']
    },

    grãos: {
        terms: ['arroz', 'feijão', 'lentilha', 'grão de bico', 'ervilha', 'milho', 'aveia', 'quinoa', 'soja'],
        related: ['tipo 1', 'integral', 'parboilizado', 'preto', 'carioca', 'branco', 'food service', 'arbório', 'japonês']
    },

    óleos: {
        terms: ['óleo', 'azeite', 'soja', 'girassol', 'canola', 'milho', 'algodão', 'oliva'],
        related: ['extra virgem', 'composto', 'liza', 'soya', 'coamo', 'refinado', 'prensado']
    },

    congelados: {
        terms: ['congelado', 'hambúrguer', 'nuggets', 'batata', 'pizza', 'pão de alho', 'pão de queijo', 'brócolis', 'couve flor', 'polenta'],
        related: ['pré frito', 'empanado', 'palito', 'hash brown', 'smiles', 'wedges', 'tradicional', 'rústico', 'temperado']
    },

    limpeza: {
        terms: ['detergente', 'sabão', 'amaciante', 'desinfetante', 'água sanitária', 'multiuso'],
        related: ['eucalipto', 'lavanda', 'neutro', 'clássico', 'ypê', 'líquido', 'pó']
    },

    orientais: {
        terms: ['shoyu', 'saquê', 'wasabi', 'yakissoba', 'tarê', 'kani', 'gengibre', 'panko', 'hashi'],
        related: ['taichi', 'mitsuwa', 'premium', 'suave', 'sachê', 'karui', 'tradicional']
    },

    hambúrgueres: {
        terms: ['hambúrguer', 'burger', 'bovina', 'frango', 'aves', 'texas', 'faroeste'],
        related: ['tradicional', 'picanha', 'costela', 'gourmet', 'empanado', 'congelado', 'maturatta', 'brasa']
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
    'pizzaria': ['pizza', 'margherita', 'calabresa', 'mussarela', 'muçarela', 'molho de tomate', 'farinha para pizza', 'azeitona', 'tomate pelado', 'orégano', 'manjericão', 'provolone', 'catupiry', 'massa para pizza', 'parmesão ralado', 'azeite', 'palmito', 'champignon', 'cebola', 'pimenta biquinho'],

    'restaurante_cantina': ['prato', 'refeição', 'almoço', 'cardápio', 'molho', 'tempero completo', 'caldo de carne', 'caldo de galinha', 'arroz', 'feijão', 'macarrão', 'massa', 'carne bovina', 'frango', 'salada', 'legumes', 'extrato de tomate', 'óleo de soja', 'alho', 'cebola', 'colorífico'],

    'lanchonete': ['lanche', 'hambúrguer', 'batata frita', 'combo', 'bacon', 'presunto', 'queijo prato', 'catchup', 'maionese', 'mostarda', 'pão de hambúrguer', 'refrigerante', 'suco', 'nuggets', 'steak', 'salsicha', 'hot dog', 'molho barbecue', 'picles'],

    'padaria': ['pão', 'farinha de trigo', 'fermento', 'açúcar', 'margarina', 'ovos', 'leite', 'chocolate', 'doce de leite', 'recheio', 'cobertura', 'mistura para bolo', 'essência', 'melhorador de farinha', 'desmoldante', 'confeiteiro', 'baunilha'],

    'supermercado': ['variedades', 'geral', 'diversos', 'atacado', 'varejo', 'food service', 'grande volume', 'família', 'sortimento', 'básicos', 'essenciais', 'casa', 'limpeza', 'higiene', 'mercearia'],

    'pessoa_fisica': ['pessoa física', 'consumidor final', 'família', 'casa', 'uso doméstico', 'pequena quantidade', 'variedades', 'básicos', 'essenciais'],

    'pastelaria': ['pastel', 'massa para pastel', 'farinha para pastel', 'óleo para fritura', 'queijo', 'presunto', 'carne moída', 'palmito', 'camarão', 'frango desfiado', 'molho de pimenta', 'vinagre', 'catchup'],

    'bar_choperia': ['cerveja', 'bebidas alcoólicas', 'whisky', 'vodka', 'gin', 'aperitivo', 'licor', 'cachaça', 'vinho', 'espumante', 'petiscos', 'amendoim', 'azeitona', 'queijo', 'bacon', 'linguiça', 'refrigerante', 'água', 'gelo'],

    'mercearia_sacolao': ['frutas', 'verduras', 'legumes', 'hortifruti', 'tomate', 'cebola', 'batata', 'cenoura', 'alface', 'básicos', 'essenciais', 'abastecimento', 'vizinhança'],

    'hotel_motel_pousada': ['hospedagem', 'hotelaria', 'café da manhã', 'room service', 'variedades', 'conveniência', 'bebidas', 'snacks', 'higiene', 'amenities', 'frigobar'],

    'esfiharia': ['esfiha', 'esfirra', 'massa', 'farinha', 'fermento', 'carne moída', 'queijo', 'zaatar', 'hortelã', 'limão', 'tomate', 'cebola', 'temperos árabes', 'coalhada seca', 'tahine'],

    'cozinha_oriental': ['oriental', 'japonês', 'chinês', 'shoyu', 'saquê', 'wasabi', 'gengibre', 'algas nori', 'hashi', 'yakissoba', 'tarê', 'missoshiru', 'gergelim', 'óleo de gergelim', 'molho agridoce', 'kani', 'sake', 'taichi', 'panko'],

    'cozinha_industrial': ['industrial', 'grande volume', 'food service', 'institucional', 'empresa', 'fábrica', 'cantina industrial', 'alimentação coletiva', 'grandes quantidades', 'atacado', 'fornecimento', 'distribuição'],

    'churrascaria': ['churrasco', 'carne bovina', 'picanha', 'alcatra', 'fraldinha', 'maminha', 'costela', 'cupim', 'linguiça', 'frango', 'sal grosso', 'tempero para churrasco', 'carvão', 'briquete', 'grelha', 'espeto', 'chimichurri'],

    'parmegiana': ['parmegiana', 'milanesa', 'empanado', 'queijo parmesão', 'molho de tomate', 'farinha de rosca', 'panko', 'ovo', 'filé', 'frango', 'carne', 'berinjela', 'gratinado'],

    'fabrica_massas': ['massas', 'macarrão', 'espaguete', 'penne', 'talharim', 'lasanha', 'nhoque', 'farinha grano duro', 'ovos', 'massa fresca', 'produção', 'industrial'],

    'confeitaria': ['confeitaria', 'doces', 'bombons', 'brigadeiro', 'chocolate', 'açúcar confeiteiro', 'glucose', 'essências', 'corantes', 'granulado', 'confeitos', 'recheios', 'coberturas', 'pasta americana'],

    'laticinios_distribuidor': ['laticínios', 'distribuição', 'leite', 'queijos', 'iogurte', 'manteiga', 'requeijão', 'cream cheese', 'nata', 'creme de leite', 'atacado', 'revenda'],

    'loja_conveniencia': ['conveniência', '24 horas', 'snacks', 'bebidas', 'refrigerante', 'água', 'energético', 'salgadinhos', 'doces', 'cigarros', 'gelo', 'praticidade', 'rápido'],

    'acougue': ['açougue', 'carnes', 'carne bovina', 'frango', 'suíno', 'embutidos', 'linguiça', 'bacon', 'presunto', 'mortadela', 'cortes especiais', 'filé mignon', 'picanha', 'alcatra'],

    'rotisserie': ['rotisserie', 'frango assado', 'comida pronta', 'salgados', 'coxinha', 'empada', 'pratos prontos', 'congelados', 'semi-prontos', 'take away'],

    'adega': ['adega', 'vinhos', 'vinho nacional', 'vinho importado', 'espumantes', 'bebidas finas', 'whisky premium', 'vodka importada', 'licores', 'destilados', 'harmonização'],

    'clube_associacao': ['clube', 'associação', 'desportiva', 'social', 'eventos', 'festa', 'churrasco', 'bebidas', 'petiscos', 'bar', 'cantina', 'recreação'],

    'buffet': ['buffet', 'eventos', 'festa', 'casamento', 'formatura', 'aniversário', 'catering', 'finger food', 'salgadinhos', 'doces', 'bebidas', 'decoração', 'descartáveis'],

    'hamburgeria': ['hamburgueria', 'hambúrguer gourmet', 'blend', 'bacon', 'queijos especiais', 'molhos especiais', 'batata rústica', 'artesanal', 'premium', 'craft beer', 'onion rings'],

    'outros': ['diversos', 'variados', 'sortimento', 'geral', 'múltiplos', 'diferentes', 'variedade', 'misto']
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
    'FORTALEZA': 2700000,
    'GUARULHOS': 1400000,
    'CAMPINAS': 1200000,
    'SÃO BERNARDO DO CAMPO': 850000,
    'SANTO ANDRÉ': 720000,
    'OSASCO': 700000,
    'SÃO JOSÉ DOS CAMPOS': 720000,
    'RIBEIRÃO PRETO': 700000,
    'SOROCABA': 680000,
    'SANTOS': 430000,
    'MAUÁ': 470000,
    'SÃO JOSÉ DO RIO PRETO': 460000,
    'MOGI DAS CRUZES': 440000,
    'DIADEMA': 420000,
    'JUNDIAÍ': 420000,
    'CARAPICUÍBA': 400000,
    'PIRACICABA': 400000,
    'BAURU': 380000,
    'ITAQUAQUECETUBA': 360000,
    'FRANCA': 350000,
    'GUARUJÁ': 320000,
    'TAUBATÉ': 320000,
    'PRAIA GRANDE': 330000,
    'LIMEIRA': 310000,
    'SUZANO': 300000,
    'TABOÃO DA SERRA': 280000,
    'SUMARÉ': 280000,
    'BARUERI': 270000,
    'EMBU DAS ARTES': 270000,
    'SÃO VICENTE': 360000,
    'AMERICANA': 240000,
    'JACAREÍ': 230000,
    'ARARAQUARA': 230000,
    'COTIA': 230000,
    'MARÍLIA': 230000
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

// PIZZARIA
if (name.includes('pizza') || name.includes('margherita') || name.includes('calabresa') ||
    name.includes('muçarela') || name.includes('mozzarella') || name.includes('pepperoni') ||
    name.includes('molho pizza') || name.includes('azeitona') || name.includes('orégano') ||
    name.includes('champignon') || name.includes('palmito') || name.includes('catupiry') ||
    name.includes('farinha pizza')) {
    return 'Pizzaria';
}

// RESTAURANTE/CANTINA
if (name.includes('frango') || name.includes('chicken') || name.includes('parmegiana') ||
    name.includes('carne bovina') || name.includes('picanha') || name.includes('alcatra') ||
    name.includes('acém') || name.includes('arroz') || name.includes('feijão') ||
    name.includes('macarrão') || name.includes('massa') || name.includes('molho tomate') ||
    name.includes('extrato tomate') || name.includes('tempero completo') ||
    name.includes('caldo carne') || name.includes('caldo galinha') || name.includes('food service')) {
    return 'Restaurante/Cantina';
}

// LANCHONETE
if (name.includes('hambúrguer') || name.includes('burger') || name.includes('lanche') ||
    name.includes('batata frita') || name.includes('batata palito') || name.includes('nuggets') ||
    name.includes('bacon') || name.includes('catchup') || name.includes('maionese') ||
    name.includes('mostarda') || name.includes('hot dog') || name.includes('salsicha') ||
    name.includes('pão hambúrguer') || name.includes('steak') || name.includes('empanado')) {
    return 'Lanchonete';
}

// PADARIA
if (name.includes('farinha trigo') || name.includes('fermento') || name.includes('açúcar') ||
    name.includes('margarina') || name.includes('manteiga') || name.includes('ovos') ||
    name.includes('chocolate forneável') || name.includes('doce leite') || name.includes('mistura bolo') ||
    name.includes('recheio') || name.includes('cobertura') || name.includes('essência') ||
    name.includes('granulado') || name.includes('açúcar confeiteiro') || name.includes('mel')) {
    return 'Padaria';
}

// SUPERMERCADO
if (name.includes('food service') || name.includes('atacado') || name.includes('variedades') ||
    name.includes('básicos') || name.includes('essenciais') || name.includes('grande volume') ||
    (name.includes('arroz') && name.includes('5 kg')) ||
    (name.includes('açúcar') && name.includes('fardo')) ||
    name.includes('limpeza') || name.includes('papel higiênico')) {
    return 'Supermercado';
}

// PESSOA FÍSICA
if (name.includes('consumidor final') || name.includes('família') || name.includes('doméstico') ||
    name.includes('uso pessoal') || name.includes('embalagem pequena') ||
    (name.includes('1 kg') && !name.includes('food service'))) {
    return 'Pessoa Física';
}

// PASTELARIA
if (name.includes('pastel') || name.includes('farinha pastel') || name.includes('massa pastel') ||
    name.includes('óleo fritura') || name.includes('recheio pastel')) {
    return 'Pastelaria';
}

// BAR/CHOPERIA
if (name.includes('cerveja') || name.includes('whisky') || name.includes('vodka') ||
    name.includes('cachaça') || name.includes('gin') || name.includes('rum') ||
    name.includes('bebidas alcoólicas') || name.includes('petiscos') || name.includes('amendoim') ||
    name.includes('azeitona') && name.includes('conserva') || name.includes('aperitivo') ||
    name.includes('licor') || name.includes('vinho') || name.includes('energético')) {
    return 'Bar/Choperia';
}

// MERCEARIA/SACOLÃO
if (name.includes('frutas') || name.includes('verduras') || name.includes('legumes') ||
    name.includes('hortifruti') || name.includes('conservas') || name.includes('enlatados') ||
    name.includes('grãos') && !name.includes('food service') ||
    name.includes('temperos') && name.includes('pequeno') ||
    name.includes('condimentos') || name.includes('vinagre')) {
    return 'Mercearia/Sacolão';
}

// HOTEL/MOTEL/POUSADA
if (name.includes('hospedagem') || name.includes('hotelaria') || name.includes('café manhã') ||
    name.includes('room service') || name.includes('frigobar') || name.includes('amenities') ||
    name.includes('institucional') && name.includes('pequeno')) {
    return 'Hotel/Motel/Pousada';
}

// ESFIHARIA
if (name.includes('esfiha') || name.includes('esfirra') || name.includes('árabe') ||
    name.includes('coalhada') || name.includes('zaatar') || name.includes('tahine') ||
    name.includes('temperos árabes')) {
    return 'Esfiharia';
}

// COZINHA ORIENTAL
if (name.includes('shoyu') || name.includes('saquê') || name.includes('wasabi') ||
    name.includes('yakissoba') || name.includes('tarê') || name.includes('oriental') ||
    name.includes('japonês') || name.includes('chinês') || name.includes('gengibre') ||
    name.includes('algas nori') || name.includes('hashi') || name.includes('taichi') ||
    name.includes('gergelim') || name.includes('kani') || name.includes('panko')) {
    return 'Cozinha Oriental';
}

// COZINHA INDUSTRIAL
if (name.includes('industrial') || name.includes('grande volume') ||
    (name.includes('food service') && (name.includes('5 kg') || name.includes('10 kg'))) ||
    name.includes('institucional') && name.includes('grandes quantidades') ||
    name.includes('cantina industrial') || name.includes('alimentação coletiva')) {
    return 'Cozinha Industrial';
}

// CHURRASCARIA
if (name.includes('churrasco') || name.includes('picanha') || name.includes('fraldinha') ||
    name.includes('maminha') || name.includes('costela') || name.includes('cupim') ||
    name.includes('sal grosso') || name.includes('tempero churrasco') ||
    name.includes('linguiça toscana') || name.includes('briquete') ||
    name.includes('chimichurri') || name.includes('espeto')) {
    return 'Churrascaria';
}

// COLABORADOR
if (name.includes('colaborador') || name.includes('funcionário') || name.includes('benefício') ||
    name.includes('vale alimentação') || name.includes('cesta básica') ||
    name.includes('refeitório') || name.includes('cantina empresa')) {
    return 'Colaborador';
}

// FÁBRICA DE MASSAS
if (name.includes('massa fresca') || name.includes('grano duro') || name.includes('famigliare') ||
    name.includes('produção massas') || name.includes('massa artesanal') ||
    (name.includes('macarrão') && name.includes('industrial'))) {
    return 'Fábrica de Massas';
}

// CONFEITARIA
if (name.includes('confeitaria') || name.includes('doces finos') || name.includes('bombons') ||
    name.includes('brigadeiro') || name.includes('chocolate') && name.includes('confeiteiro') ||
    name.includes('doceiro') || name.includes('confeitos') || name.includes('granulado') ||
    name.includes('pasta americana') || name.includes('decoração')) {
    return 'Confeitaria';
}

// LATICÍNIOS/DISTRIBUIDOR
if (name.includes('distribuição') || name.includes('atacado') && name.includes('laticínios') ||
    name.includes('revenda') && (name.includes('queijo') || name.includes('leite')) ||
    name.includes('tirolez') || name.includes('polenghi') || name.includes('vigor') ||
    name.includes('quatá') && name.includes('grande')) {
    return 'Laticínios/Distribuidor';
}

// LOJA DE CONVENIÊNCIA
if (name.includes('conveniência') || name.includes('24 horas') || name.includes('snacks') ||
    name.includes('praticidade') || name.includes('rápido') ||
    name.includes('embalagem pequena') && name.includes('bebidas') ||
    name.includes('energético') || name.includes('gelo')) {
    return 'Loja de Conveniência';
}

// AÇOUGUE
if (name.includes('açougue') || name.includes('carnes frescas') || name.includes('cortes especiais') ||
    name.includes('embutidos') && name.includes('frios') || name.includes('resfriado') ||
    name.includes('temperado') && name.includes('carne') ||
    name.includes('defumado') && name.includes('presunto')) {
    return 'Açougue';
}

// ROTISSERIE
if (name.includes('rotisserie') || name.includes('frango assado') || name.includes('comida pronta') ||
    name.includes('pratos prontos') || name.includes('take away') || name.includes('coxinha') ||
    name.includes('empada') || name.includes('salgados') && name.includes('congelado')) {
    return 'Rotisserie';
}

// ADEGA
if (name.includes('adega') || name.includes('vinhos') && name.includes('importado') ||
    name.includes('espumante') || name.includes('bebidas finas') ||
    name.includes('whisky premium') || name.includes('harmonização') ||
    name.includes('chileno') || name.includes('argentino') || name.includes('português')) {
    return 'Adega';
}

// CLUBE/ASSOCIAÇÃO DESPORTIVA
if (name.includes('clube') || name.includes('associação') || name.includes('desportiva') ||
    name.includes('social') || name.includes('eventos') && name.includes('recreação') ||
    name.includes('confraternização')) {
    return 'Clube/Associação Desportiva';
}

// BUFFET
if (name.includes('buffet') || name.includes('eventos') || name.includes('festa') ||
    name.includes('casamento') || name.includes('catering') || name.includes('finger food') ||
    name.includes('formatura') || name.includes('aniversário') || name.includes('descartáveis')) {
    return 'Buffet';
}

// HAMBURGERIA
if (name.includes('hamburgeria') || name.includes('gourmet') && name.includes('hambúrguer') ||
    name.includes('artesanal') && name.includes('burger') || name.includes('premium') &&
    (name.includes('bacon') || name.includes('queijo')) || name.includes('maturatta') ||
    name.includes('onion rings') || name.includes('craft beer')) {
    return 'Hamburgeria';
}

// BEBIDAS (categoria geral)
if (name.includes('refrigerante') || name.includes('suco') || name.includes('água') ||
    name.includes('coca cola') || name.includes('pepsi') || name.includes('guaraná') ||
    name.includes('fanta') || name.includes('sprite') || name.includes('isotônico') ||
    name.includes('ice tea')) {
    return 'Bebidas';
}

// SOBREMESAS (categoria geral)
if (name.includes('sorvete') || name.includes('pudim') || name.includes('torta') ||
    name.includes('gelatina') || name.includes('mousse') || name.includes('brigadeiro') ||
    name.includes('doce') && !name.includes('leite') || name.includes('sobremesa') ||
    name.includes('calda') && name.includes('frutas')) {
    return 'Sobremesas';
}

// OUTROS (fallback)
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
    
    // Analisar categorias para sugestões específicas baseadas em todos os segmentos
if (categories['Pizzaria'] && categories['Pizzaria'].length > 0) {
    analysis += '🍕 **Pizzaria** - Produtos recomendados: Calabresa Aurora, Muçarela, Molho de Tomate Pizza, Azeitonas, Orégano, Farinha para Pizza, Champignon, Palmito\n';
}

if (categories['Restaurante'] || categories['Cantina'] && categories['Restaurante/Cantina'].length > 0) {
    analysis += '🍽️ **Restaurante/Cantina** - Produtos recomendados: Carnes Bovinas Resfriadas, Arroz Food Service, Feijão, Temperos Completos, Óleo de Soja, Caldo de Carne/Galinha\n';
}

if (categories['Outros'] && categories['Outros'].length > 0) {
    analysis += '📦 **Outros** - Produtos recomendados: Variedades sortidas, Produtos básicos, Itens de uso geral\n';
}

if (categories['Lanchonete'] && categories['Lanchonete'].length > 0) {
    analysis += '🍔 **Lanchonete** - Produtos recomendados: Hambúrguer Congelado, Bacon em Cubos, Batata Palito Pré-Frita, Catchup, Maionese, Queijo Prato Fatiado, Salsicha Hot Dog\n';
}

if (categories['Padaria'] && categories['Padaria'].length > 0) {
    analysis += '🥖 **Padaria** - Produtos recomendados: Farinha de Trigo, Fermento Biológico, Açúcar, Margarina, Ovos, Chocolate Forneável, Doce de Leite, Essências\n';
}

if (categories['Supermercado'] && categories['Supermercado'].length > 0) {
    analysis += '🛒 **Supermercado** - Produtos recomendados: Variedades Food Service, Produtos básicos em grandes volumes, Itens de alta rotação\n';
}

if (categories['Pessoa Física'] && categories['Pessoa Física'].length > 0) {
    analysis += '👤 **Pessoa Física** - Produtos recomendados: Embalagens menores, Produtos básicos familiares, Itens essenciais\n';
}

if (categories['Pastelaria'] && categories['Pastelaria'].length > 0) {
    analysis += '🥟 **Pastelaria** - Produtos recomendados: Farinha para Pastel, Óleo para Fritura, Queijo Muçarela, Presunto, Carne Moída, Palmito Picado, Massa para Pastel\n';
}

if (categories['Bar'] || categories['Choperia'] && categories['Bar/Choperia'].length > 0) {
    analysis += '🍺 **Bar/Choperia** - Produtos recomendados: Cervejas, Bebidas Alcoólicas, Whisky, Vodka, Cachaça, Petiscos, Amendoim, Azeitonas, Linguiça Calabresa\n';
}

if (categories['Mercearia'] || categories['Sacolão'] && categories['Mercearia/Sacolão'].length > 0) {
    analysis += '🥬 **Mercearia/Sacolão** - Produtos recomendados: Produtos básicos, Conservas, Enlatados, Grãos, Temperos, Itens de primeira necessidade\n';
}

if (categories['Hotel'] || categories['Motel'] || categories['Pousada'] && categories['Hotel/Motel/Pousada'].length > 0) {
    analysis += '🏨 **Hotel/Motel/Pousada** - Produtos recomendados: Food Service, Produtos para café da manhã, Leite, Pães, Sucos, Águas Minerais, Amenities\n';
}

if (categories['Esfiharia'] && categories['Esfiharia'].length > 0) {
    analysis += '🥙 **Esfiharia** - Produtos recomendados: Farinha de Trigo, Fermento, Carne Moída, Queijo, Coalhada Seca, Hortelã, Limão, Temperos Árabes\n';
}

if (categories['Cozinha Oriental'] && categories['Cozinha Oriental'].length > 0) {
    analysis += '🍜 **Cozinha Oriental** - Produtos recomendados: Shoyu, Saquê, Wasabi, Gengibre, Algas Nori, Macarrão Yakissoba, Tarê, Óleo de Gergelim, Hashi\n';
}

if (categories['Cozinha Industrial'] && categories['Cozinha Industrial'].length > 0) {
    analysis += '🏭 **Cozinha Industrial** - Produtos recomendados: Food Service grandes volumes, Temperos industriais, Caldos concentrados, Óleos em galões\n';
}

if (categories['Churrascaria'] && categories['Churrascaria'].length > 0) {
    analysis += '🥩 **Churrascaria** - Produtos recomendados: Picanha, Alcatra, Fraldinha, Costela, Sal Grosso, Tempero para Churrasco, Linguiça Toscana, Chimichurri\n';
}

if (categories['Colaborador'] && categories['Colaborador'].length > 0) {
    analysis += '👥 **Colaborador** - Produtos recomendados: Benefícios, Produtos para funcionários\n';
}

if (categories['Fábrica de Massas'] && categories['Fábrica de Massas'].length > 0) {
    analysis += '🍝 **Fábrica de Massas** - Produtos recomendados: Farinha Grano Duro, Ovos Pasteurizados, Massa Fresca, Ingredientes para produção de massas\n';
}

if (categories['Confeitaria'] && categories['Confeitaria'].length > 0) {
    analysis += '🧁 **Confeitaria** - Produtos recomendados: Chocolate para Confeiteiro, Açúcar Confeiteiro, Essências, Corantes, Granulado, Recheios, Coberturas\n';
}

if (categories['Laticínios'] || categories['Distribuidor'] && categories['Laticínios/Distribuidor'].length > 0) {
    analysis += '🥛 **Laticínios/Distribuidor** - Produtos recomendados: Leites diversos, Queijos, Requeijão, Cream Cheese, Manteiga, Iogurtes para revenda\n';
}

if (categories['Loja de Conveniência'] && categories['Loja de Conveniência'].length > 0) {
    analysis += '🏪 **Loja de Conveniência** - Produtos recomendados: Snacks, Refrigerantes, Águas, Energéticos, Produtos de conveniência, Embalagens pequenas\n';
}

if (categories['Açougue'] && categories['Açougue'].length > 0) {
    analysis += '🥩 **Açougue** - Produtos recomendados: Carnes Bovinas, Frango, Suíno, Embutidos, Linguiças, Bacon, Cortes especiais, Carnes temperadas\n';
}

if (categories['Rotisserie'] && categories['Rotisserie'].length > 0) {
    analysis += '🍗 **Rotisserie** - Produtos recomendados: Frango para Assar, Temperos, Produtos semi-prontos, Salgados congelados, Pratos prontos\n';
}

if (categories['Adega'] && categories['Adega'].length > 0) {
    analysis += '🍷 **Adega** - Produtos recomendados: Vinhos Nacionais, Vinhos Importados, Espumantes, Whisky Premium, Vodka Importada, Licores, Bebidas Finas\n';
}

if (categories['Clube'] || categories['Associação Desportiva'] && categories['Clube/Associação Desportiva'].length > 0) {
    analysis += '⚽ **Clube/Associação Desportiva** - Produtos recomendados: Bebidas para eventos, Petiscos, Churrasco, Cerveja, Refrigerantes, Produtos para cantina\n';
}

if (categories['Buffet'] && categories['Buffet'].length > 0) {
    analysis += '🎉 **Buffet** - Produtos recomendados: Food Service para eventos, Salgadinhos, Doces para festa, Bebidas, Descartáveis, Produtos para catering\n';
}

if (categories['Hamburgeria'] && categories['Hamburgeria'].length > 0) {
    analysis += '🍔 **Hamburgeria** - Produtos recomendados: Hambúrguer Gourmet, Bacon Premium, Queijos Especiais, Molhos Especiais, Batata Rústica, Onion Rings, Craft Beer\n';
}

if (categories['Sobremesas'] && categories['Sobremesas'].length > 0) {
    analysis += '🍰 **Sobremesas** - Produtos recomendados: Leite Condensado, Creme de Leite, Açúcares diversos, Chocolate, Gelatinas, Frutas em Calda, Coberturas\n';
}

if (categories['Bebidas'] && categories['Bebidas'].length > 0) {
    analysis += '🥤 **Bebidas** - Produtos recomendados: Refrigerantes, Sucos, Águas Minerais, Energéticos, Isotônicos, Bebidas Alcoólicas, Cervejas\n';
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
    ],
    'restaurante_cantina': [
        { category: 'Carnes', weight: 9 },
        { category: 'Grãos', weight: 8 },
        { category: 'Temperos', weight: 7 },
        { category: 'Molhos', weight: 6 }
    ],
    'padaria': [
        { category: 'Farinhas', weight: 9 },
        { category: 'Doces', weight: 8 },
        { category: 'Laticínios', weight: 7 },
        { category: 'Óleos', weight: 5 }
    ],
    'supermercado': [
        { category: 'Grãos', weight: 7 },
        { category: 'Laticínios', weight: 6 },
        { category: 'Carnes', weight: 6 },
        { category: 'Limpeza', weight: 5 }
    ],
    'pessoa_fisica': [
        { category: 'Grãos', weight: 6 },
        { category: 'Laticínios', weight: 5 },
        { category: 'Carnes', weight: 5 },
        { category: 'Limpeza', weight: 4 }
    ],
    'pastelaria': [
        { category: 'Farinhas', weight: 9 },
        { category: 'Óleos', weight: 8 },
        { category: 'Laticínios', weight: 7 },
        { category: 'Carnes', weight: 6 }
    ],
    'bar_choperia': [
        { category: 'Bebidas', weight: 9 },
        { category: 'Conservas', weight: 7 },
        { category: 'Embutidos', weight: 6 },
        { category: 'Temperos', weight: 4 }
    ],
    'mercearia_sacolao': [
        { category: 'Grãos', weight: 8 },
        { category: 'Conservas', weight: 7 },
        { category: 'Temperos', weight: 6 },
        { category: 'Óleos', weight: 5 }
    ],
    'hotel_motel_pousada': [
        { category: 'Laticínios', weight: 7 },
        { category: 'Bebidas', weight: 6 },
        { category: 'Grãos', weight: 5 },
        { category: 'Limpeza', weight: 5 }
    ],
    'esfiharia': [
        { category: 'Farinhas', weight: 9 },
        { category: 'Carnes', weight: 8 },
        { category: 'Laticínios', weight: 7 },
        { category: 'Temperos', weight: 6 }
    ],
    'cozinha_oriental': [
        { category: 'Orientais', weight: 9 },
        { category: 'Carnes', weight: 7 },
        { category: 'Massas', weight: 6 },
        { category: 'Temperos', weight: 5 }
    ],
    'cozinha_industrial': [
        { category: 'Carnes', weight: 8 },
        { category: 'Grãos', weight: 8 },
        { category: 'Temperos', weight: 7 },
        { category: 'Óleos', weight: 6 }
    ],
    'churrascaria': [
        { category: 'Carnes', weight: 10 },
        { category: 'Temperos', weight: 8 },
        { category: 'Embutidos', weight: 6 },
        { category: 'Conservas', weight: 4 }
    ],
    'colaborador': [
        { category: 'Grãos', weight: 5 },
        { category: 'Laticínios', weight: 4 },
        { category: 'Bebidas', weight: 4 },
        { category: 'Doces', weight: 3 }
    ],
    'fabrica_massas': [
        { category: 'Massas', weight: 10 },
        { category: 'Farinhas', weight: 9 },
        { category: 'Laticínios', weight: 6 },
        { category: 'Temperos', weight: 4 }
    ],
    'confeitaria': [
        { category: 'Doces', weight: 10 },
        { category: 'Farinhas', weight: 8 },
        { category: 'Laticínios', weight: 7 },
        { category: 'Óleos', weight: 5 }
    ],
    'laticinios_distribuidor': [
        { category: 'Laticínios', weight: 10 },
        { category: 'Doces', weight: 6 },
        { category: 'Bebidas', weight: 4 },
        { category: 'Conservas', weight: 3 }
    ],
    'loja_conveniencia': [
        { category: 'Bebidas', weight: 8 },
        { category: 'Doces', weight: 7 },
        { category: 'Congelados', weight: 6 },
        { category: 'Limpeza', weight: 4 }
    ],
    'acougue': [
        { category: 'Carnes', weight: 10 },
        { category: 'Embutidos', weight: 8 },
        { category: 'Temperos', weight: 6 },
        { category: 'Laticínios', weight: 4 }
    ],
    'rotisserie': [
        { category: 'Carnes', weight: 9 },
        { category: 'Congelados', weight: 8 },
        { category: 'Temperos', weight: 7 },
        { category: 'Molhos', weight: 5 }
    ],
    'adega': [
        { category: 'Bebidas', weight: 10 },
        { category: 'Conservas', weight: 6 },
        { category: 'Embutidos', weight: 5 },
        { category: 'Laticínios', weight: 4 }
    ],
    'clube_associacao': [
        { category: 'Bebidas', weight: 8 },
        { category: 'Carnes', weight: 7 },
        { category: 'Embutidos', weight: 6 },
        { category: 'Congelados', weight: 5 }
    ],
    'buffet': [
        { category: 'Carnes', weight: 8 },
        { category: 'Congelados', weight: 8 },
        { category: 'Laticínios', weight: 7 },
        { category: 'Bebidas', weight: 6 }
    ],
    'hamburgeria': [
        { category: 'Carnes', weight: 9 },
        { category: 'Laticínios', weight: 8 },
        { category: 'Congelados', weight: 7 },
        { category: 'Molhos', weight: 6 }
    ],
    'outros': [
        { category: 'Grãos', weight: 5 },
        { category: 'Laticínios', weight: 4 },
        { category: 'Temperos', weight: 4 },
        { category: 'Óleos', weight: 3 }
    ]
};

    
    // Encontrar mapeamento mais próximo
    for (const [key, categories] of Object.entries(mappings)) {
        if (activity.includes(key)) {
            return categories;
        }
    }
    
    // Default genérico expandido para todas as categorias
return [
    // Categorias essenciais - maior peso
    { category: 'Grãos', weight: 8 },
    { category: 'Laticínios', weight: 7 },
    { category: 'Carnes', weight: 7 },
    { category: 'Óleos', weight: 6 },
    { category: 'Temperos', weight: 6 },
    
    // Categorias importantes - peso médio-alto
    { category: 'Farinhas', weight: 5 },
    { category: 'Molhos', weight: 5 },
    { category: 'Bebidas', weight: 5 },
    { category: 'Embutidos', weight: 5 },
    { category: 'Doces', weight: 4 },
    { category: 'Massas', weight: 4 },
    { category: 'Conservas', weight: 4 },
    
    // Categorias complementares - peso médio
    { category: 'Congelados', weight: 3 },
    { category: 'Açúcares', weight: 3 },
    { category: 'Limpeza', weight: 3 },
    { category: 'Cereais_Graos', weight: 2 },
    { category: 'Oleaginosas', weight: 2 },
    { category: 'Frutas_Polpas', weight: 2 },
    
    // Categorias específicas - peso baixo
    { category: 'Orientais', weight: 1 },
    { category: 'Condimentos_Especiais', weight: 1 },
    { category: 'Produtos_Panificacao', weight: 1 },
    { category: 'Higiene', weight: 1 },
    { category: 'Descartaveis', weight: 1 },
    { category: 'Utensilios', weight: 1 }
];

}
getActivityKeywords(activity) {
    const keywordMaps = {
    'pizzaria': [
        'pizza', 'calabresa', 'queijo', 'muçarela', 'molho', 'azeitona', 'orégano', 'manjericão', 
        'tomate pelado', 'farinha pizza', 'champignon', 'palmito', 'parmesão', 'provolone', 
        'catupiry', 'azeite', 'massa pizza', 'pepperoni', 'presunto', 'bacon', 'cebola'
    ],
    
    'restaurante': [
        'carne', 'arroz', 'tempero', 'óleo', 'sal', 'feijão', 'frango', 'boi', 'suíno', 'peixe',
        'caldo', 'extrato tomate', 'colorífico', 'alho', 'cebola', 'pimenta', 'molho tomate',
        'macarrão', 'massa', 'farinha', 'açúcar', 'vinagre', 'shoyu', 'food service'
    ],
    
    'lanchonete': [
        'hambúrguer', 'batata', 'bacon', 'queijo prato', 'lanche', 'pão hambúrguer', 'catchup', 
        'maionese', 'mostarda', 'salsicha', 'hot dog', 'nuggets', 'refrigerante', 'suco',
        'batata frita', 'presunto', 'mortadela', 'molho barbecue', 'pickles'
    ],
    
    'padaria': [
        'farinha', 'açúcar', 'fermento', 'leite', 'ovo', 'margarina', 'manteiga', 'chocolate',
        'doce leite', 'açúcar confeiteiro', 'essência', 'baunilha', 'mistura bolo', 'recheio',
        'cobertura', 'granulado', 'mel', 'leite condensado', 'creme leite'
    ],
    
    'supermercado': [
        'variedades', 'food service', 'atacado', 'básicos', 'essenciais', 'arroz', 'feijão',
        'açúcar', 'óleo', 'sal', 'farinha', 'macarrão', 'leite', 'queijo', 'refrigerante',
        'detergente', 'sabão', 'papel higiênico', 'limpeza', 'higiene'
    ],
    
    'pessoa_fisica': [
        'consumidor final', 'família', 'casa', 'doméstico', 'pequena quantidade', 'básicos',
        'essenciais', 'variedades', 'uso pessoal', 'embalagem pequena', 'unitário'
    ],
    
    'pastelaria': [
        'pastel', 'farinha pastel', 'óleo fritura', 'queijo', 'presunto', 'carne moída',
        'palmito', 'camarão', 'frango desfiado', 'molho pimenta', 'vinagre', 'catchup',
        'massa pastel', 'recheio', 'tempero'
    ],
    
    'bar_choperia': [
        'cerveja', 'bebidas alcoólicas', 'whisky', 'vodka', 'gin', 'cachaça', 'vinho', 
        'aperitivo', 'licor', 'petiscos', 'amendoim', 'azeitona', 'queijo', 'bacon',
        'linguiça', 'refrigerante', 'água', 'energético', 'gelo'
    ],
    
    'mercearia_sacolao': [
        'frutas', 'verduras', 'legumes', 'básicos', 'essenciais', 'tomate', 'cebola',
        'batata', 'cenoura', 'abastecimento', 'vizinhança', 'conservas', 'enlatados',
        'grãos', 'temperos'
    ],
    
    'hotel_motel_pousada': [
        'hospedagem', 'hotelaria', 'café manhã', 'room service', 'variedades', 'conveniência',
        'bebidas', 'snacks', 'higiene', 'amenities', 'frigobar', 'food service', 'institucional'
    ],
    
    'esfiharia': [
        'esfiha', 'esfirra', 'massa', 'farinha', 'fermento', 'carne moída', 'queijo',
        'zaatar', 'hortelã', 'limão', 'tomate', 'cebola', 'temperos árabes', 'coalhada',
        'tahine', 'azeite', 'pimenta'
    ],
    
    'cozinha_oriental': [
        'oriental', 'japonês', 'chinês', 'shoyu', 'saquê', 'wasabi', 'gengibre', 'algas nori',
        'hashi', 'yakissoba', 'tarê', 'missoshiru', 'gergelim', 'óleo gergelim', 'kani',
        'panko', 'taichi', 'mitsuwa'
    ],
    
    'cozinha_industrial': [
        'industrial', 'grande volume', 'food service', 'institucional', 'empresa', 'fábrica',
        'cantina industrial', 'alimentação coletiva', 'grandes quantidades', 'atacado',
        'fornecimento', 'distribuição', 'volume'
    ],
    
    'churrascaria': [
        'churrasco', 'carne bovina', 'picanha', 'alcatra', 'fraldinha', 'maminha', 'costela',
        'cupim', 'linguiça', 'frango', 'sal grosso', 'tempero churrasco', 'carvão', 'briquete',
        'espeto', 'chimichurri', 'defumado'
    ],
    
    'colaborador': [
        'funcionários', 'benefícios', 'produtos funcionários', 'alimentação funcionários',
        'cesta básica', 'vale alimentação', 'refeitório', 'cantina empresa'
    ],
    
    'fabrica_massas': [
        'massas', 'macarrão', 'espaguete', 'penne', 'talharim', 'lasanha', 'nhoque',
        'farinha grano duro', 'ovos', 'massa fresca', 'produção', 'industrial', 'famigliare'
    ],
    
    'confeitaria': [
        'confeitaria', 'doces', 'bombons', 'brigadeiro', 'chocolate', 'açúcar confeiteiro',
        'glucose', 'essências', 'corantes', 'granulado', 'confeitos', 'recheios', 'coberturas',
        'pasta americana', 'forneável', 'harald', 'doceiro'
    ],
    
    'laticinios_distribuidor': [
        'laticínios', 'distribuição', 'leite', 'queijos', 'iogurte', 'manteiga', 'requeijão',
        'cream cheese', 'nata', 'creme leite', 'atacado', 'revenda', 'tirolez', 'vigor'
    ],
    
    'loja_conveniencia': [
        'conveniência', '24 horas', 'snacks', 'bebidas', 'refrigerante', 'água', 'energético',
        'salgadinhos', 'doces', 'gelo', 'praticidade', 'rápido', 'embalagem pequena'
    ],
    
    'acougue': [
        'açougue', 'carnes', 'carne bovina', 'frango', 'suíno', 'embutidos', 'linguiça',
        'bacon', 'presunto', 'mortadela', 'cortes especiais', 'filé mignon', 'picanha',
        'alcatra', 'costela', 'resfriado', 'congelado'
    ],
    
    'rotisserie': [
        'rotisserie', 'frango assado', 'comida pronta', 'salgados', 'coxinha', 'empada',
        'pratos prontos', 'congelados', 'semi-prontos', 'take away', 'temperos', 'assado'
    ],
    
    'adega': [
        'adega', 'vinhos', 'vinho nacional', 'vinho importado', 'espumantes', 'bebidas finas',
        'whisky premium', 'vodka importada', 'licores', 'destilados', 'harmonização',
        'chileno', 'argentino', 'português'
    ],
    
    'clube_associacao': [
        'clube', 'associação', 'desportiva', 'social', 'eventos', 'festa', 'churrasco',
        'bebidas', 'petiscos', 'bar', 'cantina', 'recreação', 'volume', 'cerveja'
    ],
    
    'buffet': [
        'buffet', 'eventos', 'festa', 'casamento', 'formatura', 'aniversário', 'catering',
        'finger food', 'salgadinhos', 'doces', 'bebidas', 'decoração', 'descartáveis',
        'food service'
    ],
    
    'hamburgeria': [
        'hamburgueria', 'hambúrguer gourmet', 'blend', 'bacon', 'queijos especiais',
        'molhos especiais', 'batata rústica', 'artesanal', 'premium', 'craft beer',
        'onion rings', 'cheddar', 'maturatta'
    ],
    
    'cantina': [
        'cantina', 'prato feito', 'self service', 'refeição', 'almoço', 'jantar', 'comida caseira',
        'food service', 'institucional', 'empresarial', 'escolar', 'volume'
    ],
    
    'outros': [
        'diversos', 'variados', 'sortimento', 'geral', 'múltiplos', 'diferentes', 'variedade',
        'misto', 'especiais', 'customizado', 'sob medida'
    ]
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
    'pizzaria': [
        'queijo', 'muçarela', 'mozzarella', 'calabresa', 'molho', 'tomate pelado', 'azeitona', 'bacon', 'presunto', 
        'orégano', 'manjericão', 'farinha pizza', 'champignon', 'palmito', 'parmesão', 'provolone', 'catupiry', 
        'azeite', 'massa pizza', 'pepperoni', 'cebola', 'pimenta biquinho', 'extrato tomate'
    ],
    
    'restaurante_cantina': [
        'carne bovina', 'frango', 'arroz', 'feijão', 'tempero completo', 'sal', 'óleo', 'alho', 'cebola', 'colorífico',
        'macarrão', 'massa', 'molho tomate', 'extrato tomate', 'caldo carne', 'caldo galinha', 'farinha trigo',
        'açúcar', 'vinagre', 'shoyu', 'legumes', 'conservas', 'food service'
    ],
    
    'lanchonete': [
        'hambúrguer', 'carne moída', 'batata frita', 'batata palito', 'bacon', 'queijo prato', 'pão hambúrguer', 
        'catchup', 'ketchup', 'maionese', 'mostarda', 'salsicha', 'hot dog', 'nuggets', 'refrigerante', 'suco',
        'presunto', 'mortadela', 'molho barbecue', 'pickles', 'cebola', 'tomate', 'alface'
    ],
    
    'padaria': [
        'farinha trigo', 'açúcar', 'fermento', 'leite', 'ovos', 'margarina', 'manteiga', 'chocolate forneável',
        'doce leite', 'açúcar confeiteiro', 'essência', 'baunilha', 'mistura bolo', 'recheio', 'cobertura',
        'granulado', 'mel', 'leite condensado', 'creme leite', 'melhorador farinha', 'desmoldante'
    ],
    
    'supermercado': [
        'variedades', 'food service', 'atacado', 'básicos', 'essenciais', 'arroz', 'feijão', 'açúcar', 'óleo',
        'sal', 'farinha', 'macarrão', 'leite', 'queijo', 'refrigerante', 'detergente', 'sabão', 'papel higiênico',
        'limpeza', 'higiene', 'conservas', 'enlatados', 'grãos'
    ],
    
    'pessoa_fisica': [
        'consumidor final', 'família', 'casa', 'doméstico', 'básicos', 'essenciais', 'arroz', 'feijão', 'açúcar',
        'óleo', 'sal', 'farinha', 'leite', 'queijo', 'carne', 'frango', 'ovos', 'manteiga', 'margarina',
        'embalagem pequena', 'uso pessoal', 'limpeza', 'higiene'
    ],
    
    'pastelaria': [
        'farinha pastel', 'massa pastel', 'óleo fritura', 'queijo', 'muçarela', 'presunto', 'carne moída',
        'palmito picado', 'camarão', 'frango desfiado', 'molho pimenta', 'vinagre', 'catchup', 'cebola',
        'alho', 'temperos', 'recheios'
    ],
    
    'bar_choperia': [
        'cerveja', 'bebidas alcoólicas', 'whisky', 'vodka', 'gin', 'cachaça', 'vinho', 'aperitivo', 'licor',
        'petiscos', 'amendoim', 'azeitona', 'queijo', 'bacon', 'linguiça calabresa', 'refrigerante', 'água',
        'energético', 'gelo', 'conservas', 'embutidos', 'salame', 'copa'
    ],
    
    'mercearia_sacolao': [
        'frutas', 'verduras', 'legumes', 'básicos', 'essenciais', 'tomate', 'cebola', 'batata', 'cenoura',
        'conservas', 'enlatados', 'grãos', 'temperos', 'condimentos', 'azeite', 'vinagre', 'sal',
        'açúcar', 'farinha', 'arroz', 'feijão'
    ],
    
    'hotel_motel_pousada': [
        'hospedagem', 'hotelaria', 'café manhã', 'food service', 'variedades', 'conveniência', 'bebidas',
        'snacks', 'higiene', 'limpeza', 'frigobar', 'institucional', 'leite', 'café', 'açúcar', 'margarina',
        'geleias', 'sucos', 'águas minerais'
    ],
    
    'esfiharia': [
        'farinha trigo', 'fermento', 'carne moída', 'queijo', 'coalhada seca', 'hortelã', 'limão', 'tomate',
        'cebola', 'temperos árabes', 'azeite', 'pimenta', 'massa', 'recheios', 'zaatar', 'tahine'
    ],
    
    'cozinha_oriental': [
        'shoyu', 'saquê', 'wasabi', 'gengibre', 'algas nori', 'hashi', 'yakissoba', 'tarê', 'missoshiru',
        'gergelim', 'óleo gergelim', 'kani', 'panko', 'taichi', 'mitsuwa', 'molho agridoce', 'arroz japonês',
        'macarrão oriental', 'temperos orientais'
    ],
    
    'cozinha_industrial': [
        'food service', 'grande volume', 'institucional', 'atacado', 'fornecimento', 'distribuição',
        'temperos industriais', 'caldos concentrados', 'óleos galão', 'conservas grandes', 'grãos grandes volumes',
        'farinhas industriais', 'açúcar industrial', 'sal industrial'
    ],
    
    'churrascaria': [
        'carne bovina', 'picanha', 'alcatra', 'fraldinha', 'maminha', 'costela', 'cupim', 'linguiça toscana',
        'frango', 'sal grosso', 'tempero churrasco', 'carvão', 'briquete', 'espeto', 'chimichurri',
        'defumado', 'embutidos', 'bacon'
    ],
    
    'colaborador': [
        'funcionários', 'benefícios', 'cesta básica', 'vale alimentação', 'refeitório', 'cantina empresa',
        'básicos', 'essenciais', 'arroz', 'feijão', 'açúcar', 'óleo', 'sal', 'café', 'leite', 'açúcar'
    ],
    
    'fabrica_massas': [
        'macarrão', 'massas', 'espaguete', 'penne', 'talharim', 'lasanha', 'nhoque', 'farinha grano duro',
        'ovos pasteurizados', 'massa fresca', 'produção industrial', 'famigliare', 'renata', 'petybon',
        'barilla', 'semolina'
    ],
    
    'confeitaria': [
        'chocolate', 'açúcar confeiteiro', 'glucose', 'essências', 'corantes', 'granulado', 'confeitos',
        'recheios', 'coberturas', 'pasta americana', 'forneável', 'harald', 'doceiro', 'bombons',
        'brigadeiro', 'doces finos', 'decoração'
    ],
    
    'laticinios_distribuidor': [
        'leite', 'queijos', 'iogurte', 'manteiga', 'requeijão', 'cream cheese', 'nata', 'creme leite',
        'atacado', 'revenda', 'distribuição', 'tirolez', 'vigor', 'polenghi', 'scala', 'quatá',
        'coronata', 'laticínios diversos'
    ],
    
    'loja_conveniencia': [
        'conveniência', '24 horas', 'snacks', 'bebidas', 'refrigerante', 'água', 'energético', 'salgadinhos',
        'doces', 'gelo', 'praticidade', 'rápido', 'embalagem pequena', 'cigarros', 'café', 'sanduíches'
    ],
    
    'acougue': [
        'carnes', 'carne bovina', 'frango', 'suíno', 'embutidos', 'linguiça', 'bacon', 'presunto',
        'mortadela', 'cortes especiais', 'filé mignon', 'picanha', 'alcatra', 'costela', 'resfriado',
        'congelado', 'temperado', 'defumado'
    ],
    
    'rotisserie': [
        'frango assado', 'comida pronta', 'salgados', 'coxinha', 'empada', 'pratos prontos', 'congelados',
        'semi-prontos', 'take away', 'temperos', 'assado', 'frango temperado', 'produtos prontos'
    ],
    
    'adega': [
        'vinhos', 'vinho nacional', 'vinho importado', 'espumantes', 'bebidas finas', 'whisky premium',
        'vodka importada', 'licores', 'destilados', 'harmonização', 'chileno', 'argentino', 'português',
        'bebidas especiais', 'premium'
    ],
    
    'clube_associacao': [
        'eventos', 'festa', 'churrasco', 'bebidas', 'petiscos', 'bar', 'cantina', 'recreação', 'volume',
        'cerveja', 'refrigerantes', 'carnes', 'linguiças', 'social', 'desportiva', 'confraternização'
    ],
    
    'buffet': [
        'eventos', 'festa', 'casamento', 'formatura', 'aniversário', 'catering', 'finger food', 'salgadinhos',
        'doces festa', 'bebidas', 'decoração', 'descartáveis', 'food service', 'pratos elaborados',
        'sobremesas', 'canapés'
    ],
    
    'hamburgeria': [
        'hambúrguer gourmet', 'blend', 'bacon premium', 'queijos especiais', 'molhos especiais', 
        'batata rústica', 'artesanal', 'premium', 'craft beer', 'onion rings', 'cheddar', 'maturatta',
        'pães especiais', 'ingredientes gourmet'
    ],
    
    'pizza': [
        'queijo', 'muçarela', 'calabresa', 'molho tomate', 'azeitona', 'bacon', 'presunto', 'orégano',
        'manjericão', 'champignon', 'palmito', 'parmesão', 'catupiry', 'pepperoni', 'massa pizza'
    ],
    
    'salada': [
        'azeite', 'vinagre', 'tomate', 'alface', 'atum', 'milho', 'azeitona', 'palmito', 'queijo frescal',
        'pepino', 'cebola', 'cenoura', 'ervilha', 'sal', 'pimenta reino', 'limão', 'manjericão'
    ],
    
    'macarrão': [
        'molho tomate', 'queijo parmesão', 'carne moída', 'frango', 'bacon', 'alho', 'cebola', 'azeite',
        'manjericão', 'orégano', 'cream cheese', 'requeijão', 'extrato tomate', 'massa'
    ],
    
    'frango': [
        'tempero completo', 'óleo', 'batata', 'arroz', 'sal', 'pimenta', 'alho', 'cebola', 'colorífico',
        'limão', 'molho', 'empanado', 'farinha rosca', 'ovos'
    ],
    
    'carne': [
        'sal', 'tempero', 'óleo', 'batata', 'arroz', 'alho', 'cebola', 'pimenta', 'colorífico', 'vinagre',
        'molho', 'carne bovina', 'suína', 'defumado'
    ],
    
    'sobremesa': [
        'açúcar', 'leite', 'chocolate', 'creme leite', 'leite condensado', 'ovos', 'manteiga', 'farinha',
        'essência baunilha', 'gelatina', 'frutas calda', 'mel', 'doce leite'
    ],
    
    'lanche': [
        'pão', 'queijo', 'presunto', 'manteiga', 'bacon', 'mortadela', 'salsicha', 'maionese', 'catchup',
        'mostarda', 'alface', 'tomate', 'milho'
    ],
    
    'bebidas': [
        'refrigerante', 'suco', 'água mineral', 'cerveja', 'energético', 'isotônico', 'café', 'chá',
        'bebidas alcoólicas', 'vinhos', 'whisky', 'vodka', 'licores'
    ],
    
    'temperos': [
        'sal', 'pimenta reino', 'orégano', 'manjericão', 'alho', 'cebola', 'colorífico', 'cominho',
        'páprica', 'chimichurri', 'tempero baiano', 'lemon pepper', 'tempero completo'
    ],
    
    'molhos': [
        'molho tomate', 'catchup', 'maionese', 'mostarda', 'barbecue', 'shoyu', 'molho inglês',
        'molho pimenta', 'tarê', 'molho cheddar', 'bechamel', 'tártaro'
    ],
    
    'conservas': [
        'azeitona', 'palmito', 'champignon', 'alcachofra', 'pepininho', 'pickles', 'atum', 'sardinha',
        'milho', 'ervilha', 'tomate pelado', 'aspargos', 'cogumelo'
    ],
    
    'congelados': [
        'hambúrguer congelado', 'nuggets', 'batata frita', 'pizza', 'pão alho', 'pão queijo', 'brócolis',
        'couve flor', 'polenta', 'mandioca', 'frango empanado'
    ],
    
    'outros': [
        'diversos', 'variados', 'sortimento', 'geral', 'múltiplos', 'variedade', 'misto', 'especiais',
        'customizado', 'sob medida', 'produtos específicos'
    ]
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
    'pizzaria': ['embutidos', 'laticínios', 'molhos', 'conservas', 'óleos', 'temperos', 'farinhas'],
    
    'restaurante_cantina': ['carnes', 'grãos', 'temperos', 'óleos', 'laticínios', 'molhos', 'conservas', 'massas'],
    
    'lanchonete': ['embutidos', 'congelados', 'óleos', 'laticínios', 'bebidas', 'molhos', 'carnes'],
    
    'padaria': ['açúcares', 'farinhas', 'óleos', 'laticínios', 'ovos', 'doces', 'temperos'],
    
    'supermercado': ['grãos', 'laticínios', 'carnes', 'limpeza', 'bebidas', 'conservas', 'óleos', 'açúcares'],
    
    'pessoa_fisica': ['grãos', 'laticínios', 'carnes', 'limpeza', 'bebidas', 'óleos'],
    
    'pastelaria': ['farinhas', 'óleos', 'laticínios', 'carnes', 'conservas', 'temperos'],
    
    'bar_choperia': ['bebidas', 'conservas', 'embutidos', 'temperos', 'oleaginosas'],
    
    'mercearia_sacolao': ['grãos', 'conservas', 'temperos', 'óleos', 'açúcares', 'massas'],
    
    'hotel_motel_pousada': ['laticínios', 'bebidas', 'grãos', 'limpeza', 'doces', 'carnes'],
    
    'esfiharia': ['farinhas', 'carnes', 'laticínios', 'temperos', 'óleos', 'conservas'],
    
    'cozinha_oriental': ['orientais', 'carnes', 'massas', 'temperos', 'óleos', 'conservas'],
    
    'cozinha_industrial': ['carnes', 'grãos', 'temperos', 'óleos', 'molhos', 'conservas'],
    
    'churrascaria': ['carnes', 'temperos', 'embutidos', 'conservas', 'bebidas', 'óleos'],
    
    'colaborador': ['grãos', 'laticínios', 'bebidas', 'doces', 'limpeza'],
    
    'fabrica_massas': ['massas', 'farinhas', 'laticínios', 'temperos', 'óleos', 'ovos'],
    
    'confeitaria': ['doces', 'farinhas', 'laticínios', 'óleos', 'açúcares', 'temperos'],
    
    'laticinios_distribuidor': ['laticínios', 'doces', 'bebidas', 'conservas'],
    
    'loja_conveniencia': ['bebidas', 'doces', 'congelados', 'limpeza', 'embutidos'],
    
    'acougue': ['carnes', 'embutidos', 'temperos', 'laticínios', 'conservas'],
    
    'rotisserie': ['carnes', 'congelados', 'temperos', 'molhos', 'óleos'],
    
    'adega': ['bebidas', 'conservas', 'embutidos', 'laticínios', 'doces'],
    
    'clube_associacao': ['bebidas', 'carnes', 'embutidos', 'congelados', 'temperos'],
    
    'buffet': ['carnes', 'congelados', 'laticínios', 'bebidas', 'doces', 'temperos'],
    
    'hamburgeria': ['carnes', 'laticínios', 'congelados', 'molhos', 'embutidos', 'óleos'],
    
    'outros': ['grãos', 'laticínios', 'temperos', 'óleos', 'conservas']
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

// Pizzaria
if (activity.includes('pizzaria') || menuCategories.includes('Pizzas') || 
    activity.includes('pizza') || menuCategories.includes('Pizza')) {
    return 'pizzaria';
}

// Restaurante/Cantina
if (activity.includes('restaurante') || activity.includes('cantina') || 
    activity.includes('refeição') || menuCategories.includes('Pratos Principais') ||
    menuCategories.includes('Almoço') || menuCategories.includes('Jantar') ||
    activity.includes('self service') || activity.includes('prato feito')) {
    return 'restaurante_cantina';
}

// Lanchonete
if (activity.includes('lanchonete') || menuCategories.includes('Lanches') ||
    menuCategories.includes('Hambúrgueres') || activity.includes('lanche') ||
    activity.includes('fast food') || menuCategories.includes('Sanduíches')) {
    return 'lanchonete';
}

// Padaria
if (activity.includes('padaria') || activity.includes('panificação') ||
    menuCategories.includes('Pães') || menuCategories.includes('Doces') ||
    activity.includes('confeitaria') || menuCategories.includes('Bolos') ||
    activity.includes('panificadora')) {
    return 'padaria';
}

// Bar/Choperia
if (activity.includes('bar') || activity.includes('choperia') || 
    activity.includes('bebida') || menuCategories.includes('Bebidas Alcoólicas') ||
    menuCategories.includes('Cervejas') || activity.includes('pub') ||
    menuCategories.includes('Petiscos')) {
    return 'bar_choperia';
}

// Hamburgeria
if (activity.includes('hamburgeria') || activity.includes('burger') ||
    menuCategories.includes('Hambúrgueres Gourmet') || activity.includes('hamburgueria') ||
    menuCategories.includes('Burgers') || activity.includes('hambúrguer artesanal')) {
    return 'hamburgeria';
}

// Churrascaria
if (activity.includes('churrascaria') || activity.includes('churrasco') ||
    menuCategories.includes('Carnes na Brasa') || activity.includes('rodízio') ||
    menuCategories.includes('Espetos') || activity.includes('grelhados')) {
    return 'churrascaria';
}

// Esfiharia
if (activity.includes('esfiharia') || activity.includes('esfiha') ||
    menuCategories.includes('Esfihas') || activity.includes('comida árabe') ||
    menuCategories.includes('Árabes') || activity.includes('esfirra')) {
    return 'esfiharia';
}

// Cozinha Oriental
if (activity.includes('oriental') || activity.includes('japonês') ||
    activity.includes('chinês') || menuCategories.includes('Oriental') ||
    menuCategories.includes('Japonesa') || menuCategories.includes('Chinesa') ||
    activity.includes('sushi') || activity.includes('yakissoba')) {
    return 'cozinha_oriental';
}

// Pastelaria
if (activity.includes('pastelaria') || activity.includes('pastel') ||
    menuCategories.includes('Pastéis') || activity.includes('salgados fritos') ||
    menuCategories.includes('Salgados')) {
    return 'pastelaria';
}

// Açougue
if (activity.includes('açougue') || activity.includes('acougue') ||
    activity.includes('carnes') || menuCategories.includes('Carnes Frescas') ||
    activity.includes('frigorífico') || activity.includes('casa de carnes')) {
    return 'acougue';
}

// Supermercado
if (activity.includes('supermercado') || activity.includes('mercado') ||
    activity.includes('hipermercado') || activity.includes('varejo') ||
    activity.includes('empório') || activity.includes('mercearia grande')) {
    return 'supermercado';
}

// Mercearia/Sacolão
if (activity.includes('mercearia') || activity.includes('sacolão') ||
    activity.includes('hortifruti') || activity.includes('quitanda') ||
    activity.includes('verdurão') || menuCategories.includes('Hortifruti')) {
    return 'mercearia_sacolao';
}

// Loja de Conveniência
if (activity.includes('conveniência') || activity.includes('convenience') ||
    activity.includes('24 horas') || activity.includes('praticidade') ||
    menuCategories.includes('Conveniência')) {
    return 'loja_conveniencia';
}

// Adega
if (activity.includes('adega') || activity.includes('vinhos') ||
    menuCategories.includes('Vinhos') || activity.includes('bebidas finas') ||
    menuCategories.includes('Vinhos Importados') || activity.includes('wine bar')) {
    return 'adega';
}

// Buffet
if (activity.includes('buffet') || activity.includes('eventos') ||
    activity.includes('festa') || menuCategories.includes('Eventos') ||
    activity.includes('catering') || activity.includes('casamento')) {
    return 'buffet';
}

// Hotel/Motel/Pousada
if (activity.includes('hotel') || activity.includes('motel') ||
    activity.includes('pousada') || activity.includes('hospedagem') ||
    activity.includes('pousada') || menuCategories.includes('Room Service') ||
    activity.includes('hotelaria')) {
    return 'hotel_motel_pousada';
}

// Rotisserie
if (activity.includes('rotisserie') || activity.includes('frango assado') ||
    activity.includes('comida pronta') || menuCategories.includes('Pratos Prontos') ||
    activity.includes('take away') || activity.includes('semi-prontos')) {
    return 'rotisserie';
}

// Confeitaria
if (activity.includes('confeitaria') || activity.includes('doces finos') ||
    menuCategories.includes('Doces Finos') || activity.includes('bombons') ||
    menuCategories.includes('Confeitaria') || activity.includes('chocolateria')) {
    return 'confeitaria';
}

// Fábrica de Massas
if (activity.includes('fábrica de massas') || activity.includes('massas frescas') ||
    menuCategories.includes('Massas Frescas') || activity.includes('produção massas') ||
    activity.includes('massa artesanal') || activity.includes('macarrão fresco')) {
    return 'fabrica_massas';
}

// Laticínios/Distribuidor
if (activity.includes('laticínios') || activity.includes('distribuidor') ||
    activity.includes('queijos') || menuCategories.includes('Laticínios') ||
    activity.includes('distribuição') || activity.includes('atacado alimentício')) {
    return 'laticinios_distribuidor';
}

// Cozinha Industrial
if (activity.includes('industrial') || activity.includes('food service') ||
    activity.includes('institucional') || activity.includes('cantina industrial') ||
    activity.includes('alimentação coletiva') || activity.includes('grandes volumes')) {
    return 'cozinha_industrial';
}

// Clube/Associação Desportiva
if (activity.includes('clube') || activity.includes('associação') ||
    activity.includes('desportiva') || activity.includes('social') ||
    menuCategories.includes('Eventos Sociais') || activity.includes('recreativo')) {
    return 'clube_associacao';
}

// Pessoa Física
if (activity.includes('pessoa física') || activity.includes('consumidor final') ||
    activity.includes('uso doméstico') || activity.includes('família') ||
    activity.includes('casa') || activity.includes('residencial')) {
    return 'pessoa_fisica';
}

// Colaborador
if (activity.includes('colaborador') || activity.includes('funcionário') ||
    activity.includes('benefício') || activity.includes('vale alimentação') ||
    activity.includes('cesta básica')) {
    return 'colaborador';
}

// Outros (fallback)
return 'outros';


       
    }

    getRecommendationReason(product, activityType, menuData) {
        const reasons = {
    'pizzaria': {
        '27': 'Calabresa é ingrediente essencial para pizzas tradicionais',
        '271': 'Bacon em cubos ideal para pizzas gourmet',
        '1351': 'Atum para diversificar sabores de pizza',
        '47': 'Banha para massa de pizza crocante',
        '4385': 'Açúcar para equilibrar molho de tomate',
        '846': 'Muçarela Tirolez - queijo premium para cobertura',
        '531': 'Extrato de tomate para molho de pizza concentrado',
        '489': 'Palmito para pizzas vegetarianas',
        '1029': 'Azeitona preta sem caroço - praticidade no preparo',
        '4377': 'Orégano peruano - aroma autêntico para pizzas'
    },
    
    'restaurante_cantina': {
        '5167': 'Acém bovino resfriado - carne de qualidade para pratos principais',
        '89': 'Arroz food service - base para pratos executivos',
        '803': 'Feijão preto food service - acompanhamento tradicional',
        '506': 'Caldo de carne - realçador de sabor',
        '531': 'Extrato de tomate - base para molhos',
        '595': 'Colorífico - cor e sabor em pratos brasileiros',
        '925': 'Óleo de soja - versatilidade no preparo',
        '150': 'Macarrão espaguete com ovos - pratos principais',
        '8': 'Coca Cola sem açúcar - bebida popular',
        '1280': 'Molho shoyu - tempero oriental'
    },
    
    'lanchonete': {
        '271': 'Bacon em cubos essencial para hambúrguers premium',
        '25': 'Batata palito pré-frita - praticidade e qualidade',
        '66': 'Hambúrguer bovino sabor picanha - produto principal',
        '411': 'Catchup - molho indispensável',
        '351': 'Maionese grande - acompanhamento essencial',
        '27': 'Calabresa - versatilidade em sanduíches',
        '7': 'Coca Cola lata - bebida líder',
        '142': 'Apresuntado Aurora - frios de qualidade',
        '417': 'Mostarda - complemento clássico',
        '334': 'Queijo coalho espeto - lanche regional'
    },
    
    'padaria': {
        '309': 'Farinha de trigo tipo 1 - base para pães',
        '4385': 'Açúcar refinado granulado - adoçante principal',
        '318': 'Fermento biológico fresco - crescimento da massa',
        '688': 'Leite integral - hidratação e sabor',
        '1087': 'Ovos brancos - estrutura e cor',
        '245': 'Margarina com sal 75% - gordura para massas',
        '416': 'Chocolate forneável - recheios e coberturas',
        '708': 'Leite condensado integral - doces e recheios',
        '4727': 'Fermento em pó químico - crescimento de bolos',
        '7069': 'Melhorador de farinha - qualidade da massa'
    },
    
    'supermercado': {
        '89': 'Arroz food service - produto básico de alta rotação',
        '4385': 'Açúcar refinado - essencial para famílias',
        '925': 'Óleo de soja - uso diário nas cozinhas',
        '5167': 'Acém bovino - proteína acessível',
        '688': 'Leite integral - consumo familiar',
        '7': 'Coca Cola lata - bebida popular',
        '358': 'Detergente neutro - limpeza doméstica',
        '89': 'Arroz food service - alta margem',
        '701': 'Água sanitária - higienização',
        '222': 'Papel higiênico - produto essencial'
    },
    
    'pessoa_fisica': {
        '4': 'Farinha de trigo pequena - porção familiar',
        '4385': 'Açúcar cristal - adoçante doméstico',
        '688': 'Leite integral - consumo diário',
        '5167': 'Acém bovino - proteína familiar',
        '1087': 'Ovos brancos - uso versátil',
        '245': 'Margarina - gordura para o dia a dia',
        '7': 'Coca Cola - bebida familiar',
        '358': 'Detergente neutro - limpeza casa',
        '222': 'Papel higiênico - higiene familiar',
        '271': 'Bacon - sabor especial para refeições'
    },
    
    'pastelaria': {
        '877': 'Farinha de trigo pastel - massa específica',
        '925': 'Óleo de soja - fritura de qualidade',
        '846': 'Muçarela - recheio tradicional',
        '142': 'Apresuntado - recheio salgado',
        '5167': 'Carne moída - recheio popular',
        '532': 'Palmito picado - recheio vegetariano',
        '318': 'Fermento biológico - crescimento da massa',
        '47': 'Banha - fritura crocante',
        '1087': 'Ovos - liga para massa',
        '5242': 'Massa para pastel rolo - praticidade'
    },
    
    'bar_choperia': {
        '3': 'Cerveja Skol pilsen - bebida principal',
        '1579': 'Cerveja Heineken - premium',
        '1258': 'Vodka Smirnoff - destilado popular',
        '1261': 'Whisky Johnnie Walker Red - whisky tradicional',
        '1029': 'Azeitona preta - petisco clássico',
        '1010': 'Amendoim torrado salgado - acompanhamento',
        '271': 'Bacon em cubos - petisco gourmet',
        '27': 'Calabresa - tira-gosto',
        '7': 'Coca Cola - mistura para drinks',
        '1845': 'Red Bull - energético para drinks'
    },
    
    'mercearia_sacolao': {
        '89': 'Arroz food service - produto básico',
        '803': 'Feijão preto - essencial brasileiro',
        '4385': 'Açúcar cristal - insumo básico',
        '925': 'Óleo de soja - gordura principal',
        '531': 'Extrato de tomate - base para molhos',
        '1029': 'Azeitona - conserva popular',
        '489': 'Palmito - produto regional',
        '322': 'Ervilha grande - conserva básica',
        '333': 'Milho grande - versatilidade culinária',
        '438': 'Sal refinado - tempero fundamental'
    },
    
    'hotel_motel_pousada': {
        '688': 'Leite integral - café da manhã',
        '4385': 'Açúcar cristal - adoçante para hóspedes',
        '7': 'Coca Cola lata - frigobar',
        '1387': 'Água mineral Crystal - cortesia',
        '708': 'Leite condensado - café da manhã',
        '245': 'Margarina - café da manhã',
        '873': 'Café Pilão - bebida principal',
        '89': 'Arroz food service - cozinha industrial',
        '358': 'Detergente neutro - limpeza quartos',
        '222': 'Papel higiênico - amenities'
    },
    
    'esfiharia': {
        '309': 'Farinha de trigo tipo 1 - massa de esfiha',
        '318': 'Fermento biológico - crescimento da massa',
        '5167': 'Carne moída - recheio principal',
        '846': 'Muçarela - recheio queijo',
        '925': 'Óleo de soja - pincelar massas',
        '1087': 'Ovos - dourar esfihas',
        '595': 'Colorífico - cor da massa',
        '506': 'Caldo de carne - tempero do recheio',
        '438': 'Sal refinado - tempero básico',
        '1019': 'Tempero baiano - sabor árabe'
    },
    
    'cozinha_oriental': {
        '1118': 'Molho shoyu Cepêra - tempero básico oriental',
        '4447': 'Saquê seco - bebida tradicional',
        '7208': 'Wasabi em pó - condimento japonês',
        '6008': 'Gengibre em conserva - acompanhamento',
        '6644': 'Algas marinhas nori - preparo de sushi',
        '8128': 'Macarrão para yakissoba - prato principal',
        '6246': 'Molho tarê - molho agridoce',
        '1046': 'Gergelim branco - finalização de pratos',
        '8236': 'Óleo de gergelim - sabor oriental',
        '6043': 'Hashi de bambu - utensílio tradicional'
    },
    
    'cozinha_industrial': {
        '89': 'Arroz food service - grandes volumes',
        '5167': 'Acém bovino - proteína em escala',
        '925': 'Óleo de soja - fritura industrial',
        '506': 'Caldo de carne - tempero concentrado',
        '456': 'Sazón carnes - tempero industrial',
        '7667': 'Ajinomoto food service - realçador',
        '531': 'Extrato de tomate - molho base',
        '350': 'Maionese sachê - porção individual',
        '412': 'Catchup sachê - condimento industrial',
        '460': 'Base culinária Leco - praticidade'
    },
    
    'churrascaria': {
        '5136': 'Picanha bovina - corte nobre',
        '7342': 'Alcatra com maminha - corte popular',
        '7142': 'Fraldinha bovina - sabor intenso',
        '929': 'Sal grosso - tempero tradicional',
        '1019': 'Tempero baiano - sabor regional',
        '191': 'Linguiça toscana - acompanhamento',
        '1342': 'Briquete - combustível para churrasqueira',
        '7008': 'Chimichurri - molho argentino',
        '3': 'Cerveja Skol - bebida tradicional',
        '271': 'Bacon - entrada premium'
    },
    
    'colaborador': {
        '89': 'Arroz food service - cesta básica',
        '803': 'Feijão preto - alimento básico',
        '4385': 'Açúcar cristal - adoçante básico',
        '925': 'Óleo de soja - gordura essencial',
        '688': 'Leite integral - proteína',
        '4': 'Farinha de trigo - panificação',
        '438': 'Sal refinado - tempero básico',
        '150': 'Macarrão espaguete - carboidrato',
        '7': 'Coca Cola - benefício',
        '873': 'Café tradicional - bebida diária'
    },
    
    'fabrica_massas': {
        '249': 'Macarrão espaguete grano duro - matéria-prima',
        '6145': 'Macarrão caracolino com ovos - produção',
        '1653': 'Macarrão fettuccine grano duro - linha premium',
        '591': 'Macarrão penne grano duro - formato popular',
        '1087': 'Ovos pasteurizados - ingrediente essencial',
        '4': 'Farinha de trigo - base da produção',
        '8563': 'Massa fresca espaguete - produto final',
        '8565': 'Massa para lasanha - diversificação',
        '8567': 'Nhoque de batata - linha especial',
        '925': 'Óleo de soja - processo produtivo'
    },
    
    'confeitaria': {
        '796': 'Chocolate ao leite Nestlé - cobertura premium',
        '4225': 'Açúcar confeiteiro - finalização',
        '4542': 'Glicose - textura dos doces',
        '6527': 'Chocolate forneável ao leite - recheio',
        '7589': 'Chocolate granulado crocante - decoração',
        '416': 'Chocolate forneável confeiteiro - versatilidade',
        '708': 'Leite condensado - base para brigadeiros',
        '1567': 'Recheio sabor chocolate Moça - praticidade',
        '6604': 'Chocolate em pó 100% cacau - sabor intenso',
        '1396': 'Cereja marrasquino - decoração'
    },
    
    'laticinios_distribuidor': {
        '846': 'Muçarela Tirolez - queijo premium',
        '688': 'Leite integral Italac - distribuição',
        '2899': 'Requeijão Tirolez sem amido - qualidade',
        '882': 'Manteiga sem sal Tirolez - produto nobre',
        '38': 'Cream cheese Danúbio - linha gourmet',
        '967': 'Queijo cottage Tirolez - linha light',
        '126': 'Queijo maasdam - importado',
        '201': 'Parmesão 6 meses Scala - maturação',
        '583': 'Creme de leite pasteurizado - praticidade',
        '4579': 'Leite semidesnatado - opção saudável'
    },
    
    'loja_conveniencia': {
        '7': 'Coca Cola lata - bebida líder',
        '1845': 'Red Bull energético - produto premium',
        '3': 'Cerveja Skol pilsen - bebida popular',
        '1387': 'Água mineral Crystal - hidratação',
        '721': 'Fósforo Queluz - conveniência',
        '4564': 'Bombom Ouro Branco - doce popular',
        '594': 'Bombom Sonho de Valsa - chocolate premium',
        '1083': 'Queijo Polenguinho - lanche prático',
        '4775': 'Presunto fatiado Seara - praticidade',
        '6781': 'Paçoquinha de amendoim - doce regional'
    },
    
    'acougue': {
        '5167': 'Acém bovino resfriado - corte popular',
        '7142': 'Fraldinha bovina - corte nobre',
        '5136': 'Picanha bovina - corte premium',
        '158': 'Coxas e sobrecoxas de frango - aves',
        '271': 'Bacon em cubos - embutido popular',
        '27': 'Calabresa Aurora - linguiça tradicional',
        '142': 'Apresuntado Aurora - frios',
        '250': 'Mortadela tradicional Bologna - embutido',
        '43': 'Pepperoni fatiado - produto especial',
        '1019': 'Tempero baiano - tempero para carnes'
    },
    
    'rotisserie': {
        '158': 'Coxas e sobrecoxas de frango - produto principal',
        '193': 'Filé de peito desfiado temperado - praticidade',
        '1019': 'Tempero baiano - sabor tradicional',
        '595': 'Colorífico - cor dourada',
        '925': 'Óleo de soja - fritura',
        '5555': 'Pão de alho congelado - acompanhamento',
        '8157': 'Pão de queijo congelado - salgado',
        '270': 'Steak de frango empanado - produto pronto',
        '506': 'Caldo de galinha - sabor intenso',
        '271': 'Bacon - ingrediente especial'
    },
    
    'adega': {
        '1647': 'Vinho argentino Malbec Concha y Toro - tinto premium',
        '1582': 'Vinho chileno Sauvignon Blanc - branco seco',
        '1329': 'Espumante Chandon Réserve Brut - celebração',
        '1261': 'Whisky Johnnie Walker Red - destilado tradicional',
        '1347': 'Vodka Absolut - premium importado',
        '1253': 'Licor Baileys - creme irlandês',
        '2931': 'Espumante Chandon Brut Rosé - rosé premium',
        '1815': 'Vinho Casillero del Diablo - chileno premium',
        '1256': 'Vinho português Periquita - tinto clássico',
        '1029': 'Azeitona preta - acompanhamento'
    },
    
    'clube_associacao': {
        '3': 'Cerveja Skol pilsen - bebida social',
        '5136': 'Picanha bovina - churrasco social',
        '271': 'Bacon em cubos - petisco',
        '27': 'Calabresa - churrasco tradicional',
        '7': 'Coca Cola lata - bebida popular',
        '1029': 'Azeitona preta - aperitivo',
        '1010': 'Amendoim torrado - petisco clássico',
        '929': 'Sal grosso - churrasco',
        '1342': 'Briquete - churrasqueira',
        '18': 'Guaraná Antarctica - refrigerante nacional'
    },
    
    'buffet': {
        '5167': 'Acém bovino - proteína para eventos',
        '158': 'Coxas e sobrecoxas - aves para festa',
        '89': 'Arroz food service - acompanhamento',
        '271': 'Bacon em cubos - canapés',
        '846': 'Muçarela - salgados',
        '708': 'Leite condensado - doces',
        '796': 'Chocolate ao leite - sobremesas',
        '7': 'Coca Cola lata - bebida evento',
        '1387': 'Água mineral - hidratação',
        '5555': 'Pão de alho - acompanhamento'
    },
    
    'hamburgeria': {
        '66': 'Hambúrguer bovino sabor picanha - produto principal',
        '271': 'Bacon premium - ingrediente gourmet',
        '846': 'Muçarela artesanal - queijo especial',
        '25': 'Batata palito pré-frita - acompanhamento',
        '411': 'Catchup gourmet - molho especial',
        '351': 'Maionese artesanal - cremosidade',
        '417': 'Mostarda especial - sabor diferenciado',
        '7': 'Coca Cola - bebida clássica',
        '3': 'Cerveja artesanal - bebida premium',
        '8235': 'Cebola caramelizada - ingrediente gourmet'
    },
    
    'geral': {
        '89': 'Arroz food service - produto básico essencial',
        '4385': 'Açúcar cristal - insumo fundamental',
        '925': 'Óleo de soja - gordura versátil',
        '5167': 'Acém bovino - proteína acessível',
        '271': 'Bacon - versatilidade culinária',
        '25': 'Batata congelada - praticidade',
        '688': 'Leite integral - consumo diário',
        '7': 'Coca Cola - bebida universal',
        '438': 'Sal refinado - tempero básico',
        '358': 'Detergente neutro - limpeza essencial'
    }
};
;

        return reasons[activityType]?.[product.code] || 
               reasons['geral'][product.code] || 
               'Produto recomendado para sua operação';
    }

    calculatePriority(product, activityType, menuData) {
        let priority = 5; // Base

        // Sistema de Prioridades por Categoria e Tipo de Estabelecimento

// PIZZARIA
if (product.category === 'Embutidos' && activityType === 'pizzaria') priority += 4;
if (product.category === 'Laticínios' && activityType === 'pizzaria') priority += 4;
if (product.category === 'Molhos' && activityType === 'pizzaria') priority += 3;
if (product.category === 'Conservas' && activityType === 'pizzaria') priority += 3;
if (product.category === 'Temperos' && activityType === 'pizzaria') priority += 3;
if (product.category === 'Farinhas' && activityType === 'pizzaria') priority += 2;
if (product.category === 'Óleos' && activityType === 'pizzaria') priority += 2;

// RESTAURANTE/CANTINA
if (product.category === 'Carnes' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 4;
if (product.category === 'Grãos' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 4;
if (product.category === 'Temperos' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 3;
if (product.category === 'Molhos' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 3;
if (product.category === 'Óleos' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 3;
if (product.category === 'Massas' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 2;
if (product.category === 'Conservas' && (activityType === 'restaurante' || activityType === 'restaurante_cantina')) priority += 2;

// LANCHONETE
if (product.category === 'Embutidos' && activityType === 'lanchonete') priority += 4;
if (product.category === 'Congelados' && activityType === 'lanchonete') priority += 4;
if (product.category === 'Laticínios' && activityType === 'lanchonete') priority += 3;
if (product.category === 'Molhos' && activityType === 'lanchonete') priority += 3;
if (product.category === 'Carnes' && activityType === 'lanchonete') priority += 3;
if (product.category === 'Óleos' && activityType === 'lanchonete') priority += 2;
if (product.category === 'Bebidas' && activityType === 'lanchonete') priority += 2;

// PADARIA
if (product.category === 'Farinhas' && activityType === 'padaria') priority += 4;
if (product.category === 'Doces' && activityType === 'padaria') priority += 4;
if (product.category === 'Laticínios' && activityType === 'padaria') priority += 3;
if (product.category === 'Açúcares' && activityType === 'padaria') priority += 3;
if (product.category === 'Óleos' && activityType === 'padaria') priority += 2;
if (product.category === 'Temperos' && activityType === 'padaria') priority += 2;

// SUPERMERCADO
if (product.category === 'Grãos' && activityType === 'supermercado') priority += 3;
if (product.category === 'Laticínios' && activityType === 'supermercado') priority += 3;
if (product.category === 'Carnes' && activityType === 'supermercado') priority += 3;
if (product.category === 'Limpeza' && activityType === 'supermercado') priority += 3;
if (product.category === 'Bebidas' && activityType === 'supermercado') priority += 2;
if (product.category === 'Conservas' && activityType === 'supermercado') priority += 2;

// PESSOA FÍSICA
if (product.category === 'Grãos' && activityType === 'pessoa_fisica') priority += 3;
if (product.category === 'Laticínios' && activityType === 'pessoa_fisica') priority += 2;
if (product.category === 'Carnes' && activityType === 'pessoa_fisica') priority += 2;
if (product.category === 'Limpeza' && activityType === 'pessoa_fisica') priority += 2;
if (product.category === 'Bebidas' && activityType === 'pessoa_fisica') priority += 2;

// PASTELARIA
if (product.category === 'Farinhas' && activityType === 'pastelaria') priority += 4;
if (product.category === 'Óleos' && activityType === 'pastelaria') priority += 4;
if (product.category === 'Laticínios' && activityType === 'pastelaria') priority += 3;
if (product.category === 'Carnes' && activityType === 'pastelaria') priority += 3;
if (product.category === 'Conservas' && activityType === 'pastelaria') priority += 2;
if (product.category === 'Temperos' && activityType === 'pastelaria') priority += 2;

// BAR/CHOPERIA
if (product.category === 'Bebidas' && (activityType === 'bar' || activityType === 'bar_choperia')) priority += 5;
if (product.category === 'Conservas' && (activityType === 'bar' || activityType === 'bar_choperia')) priority += 3;
if (product.category === 'Embutidos' && (activityType === 'bar' || activityType === 'bar_choperia')) priority += 3;
if (product.category === 'Oleaginosas' && (activityType === 'bar' || activityType === 'bar_choperia')) priority += 2;
if (product.category === 'Temperos' && (activityType === 'bar' || activityType === 'bar_choperia')) priority += 1;

// MERCEARIA/SACOLÃO
if (product.category === 'Grãos' && (activityType === 'mercearia' || activityType === 'mercearia_sacolao')) priority += 4;
if (product.category === 'Conservas' && (activityType === 'mercearia' || activityType === 'mercearia_sacolao')) priority += 3;
if (product.category === 'Temperos' && (activityType === 'mercearia' || activityType === 'mercearia_sacolao')) priority += 3;
if (product.category === 'Óleos' && (activityType === 'mercearia' || activityType === 'mercearia_sacolao')) priority += 2;
if (product.category === 'Açúcares' && (activityType === 'mercearia' || activityType === 'mercearia_sacolao')) priority += 2;

// HOTEL/MOTEL/POUSADA
if (product.category === 'Laticínios' && (activityType === 'hotel' || activityType === 'hotel_motel_pousada')) priority += 3;
if (product.category === 'Bebidas' && (activityType === 'hotel' || activityType === 'hotel_motel_pousada')) priority += 3;
if (product.category === 'Grãos' && (activityType === 'hotel' || activityType === 'hotel_motel_pousada')) priority += 2;
if (product.category === 'Limpeza' && (activityType === 'hotel' || activityType === 'hotel_motel_pousada')) priority += 2;
if (product.category === 'Doces' && (activityType === 'hotel' || activityType === 'hotel_motel_pousada')) priority += 2;

// ESFIHARIA
if (product.category === 'Farinhas' && activityType === 'esfiharia') priority += 4;
if (product.category === 'Carnes' && activityType === 'esfiharia') priority += 4;
if (product.category === 'Laticínios' && activityType === 'esfiharia') priority += 3;
if (product.category === 'Temperos' && activityType === 'esfiharia') priority += 3;
if (product.category === 'Óleos' && activityType === 'esfiharia') priority += 2;
if (product.category === 'Conservas' && activityType === 'esfiharia') priority += 2;

// COZINHA ORIENTAL
if (product.category === 'Orientais' && (activityType === 'oriental' || activityType === 'cozinha_oriental')) priority += 5;
if (product.category === 'Carnes' && (activityType === 'oriental' || activityType === 'cozinha_oriental')) priority += 3;
if (product.category === 'Massas' && (activityType === 'oriental' || activityType === 'cozinha_oriental')) priority += 3;
if (product.category === 'Temperos' && (activityType === 'oriental' || activityType === 'cozinha_oriental')) priority += 2;
if (product.category === 'Óleos' && (activityType === 'oriental' || activityType === 'cozinha_oriental')) priority += 2;

// COZINHA INDUSTRIAL
if (product.category === 'Carnes' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 4;
if (product.category === 'Grãos' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 4;
if (product.category === 'Temperos' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 3;
if (product.category === 'Óleos' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 3;
if (product.category === 'Molhos' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 2;
if (product.category === 'Conservas' && (activityType === 'industrial' || activityType === 'cozinha_industrial')) priority += 2;

// CHURRASCARIA
if (product.category === 'Carnes' && activityType === 'churrascaria') priority += 5;
if (product.category === 'Temperos' && activityType === 'churrascaria') priority += 4;
if (product.category === 'Embutidos' && activityType === 'churrascaria') priority += 3;
if (product.category === 'Bebidas' && activityType === 'churrascaria') priority += 2;
if (product.category === 'Conservas' && activityType === 'churrascaria') priority += 2;

// COLABORADOR
if (product.category === 'Grãos' && activityType === 'colaborador') priority += 2;
if (product.category === 'Laticínios' && activityType === 'colaborador') priority += 2;
if (product.category === 'Bebidas' && activityType === 'colaborador') priority += 1;
if (product.category === 'Doces' && activityType === 'colaborador') priority += 1;

// FÁBRICA DE MASSAS
if (product.category === 'Massas' && (activityType === 'fabrica_massas' || activityType === 'massas')) priority += 5;
if (product.category === 'Farinhas' && (activityType === 'fabrica_massas' || activityType === 'massas')) priority += 4;
if (product.category === 'Laticínios' && (activityType === 'fabrica_massas' || activityType === 'massas')) priority += 2;
if (product.category === 'Temperos' && (activityType === 'fabrica_massas' || activityType === 'massas')) priority += 1;

// CONFEITARIA
if (product.category === 'Doces' && activityType === 'confeitaria') priority += 5;
if (product.category === 'Farinhas' && activityType === 'confeitaria') priority += 4;
if (product.category === 'Laticínios' && activityType === 'confeitaria') priority += 3;
if (product.category === 'Açúcares' && activityType === 'confeitaria') priority += 3;
if (product.category === 'Óleos' && activityType === 'confeitaria') priority += 2;

// LATICÍNIOS/DISTRIBUIDOR
if (product.category === 'Laticínios' && (activityType === 'laticinios' || activityType === 'laticinios_distribuidor')) priority += 5;
if (product.category === 'Doces' && (activityType === 'laticinios' || activityType === 'laticinios_distribuidor')) priority += 2;
if (product.category === 'Bebidas' && (activityType === 'laticinios' || activityType === 'laticinios_distribuidor')) priority += 1;
if (product.category === 'Conservas' && (activityType === 'laticinios' || activityType === 'laticinios_distribuidor')) priority += 1;

// LOJA DE CONVENIÊNCIA
if (product.category === 'Bebidas' && (activityType === 'conveniencia' || activityType === 'loja_conveniencia')) priority += 4;
if (product.category === 'Doces' && (activityType === 'conveniencia' || activityType === 'loja_conveniencia')) priority += 3;
if (product.category === 'Congelados' && (activityType === 'conveniencia' || activityType === 'loja_conveniencia')) priority += 3;
if (product.category === 'Embutidos' && (activityType === 'conveniencia' || activityType === 'loja_conveniencia')) priority += 2;
if (product.category === 'Limpeza' && (activityType === 'conveniencia' || activityType === 'loja_conveniencia')) priority += 1;

// AÇOUGUE
if (product.category === 'Carnes' && activityType === 'acougue') priority += 5;
if (product.category === 'Embutidos' && activityType === 'acougue') priority += 4;
if (product.category === 'Temperos' && activityType === 'acougue') priority += 3;
if (product.category === 'Laticínios' && activityType === 'acougue') priority += 2;
if (product.category === 'Conservas' && activityType === 'acougue') priority += 1;

// ROTISSERIE
if (product.category === 'Carnes' && activityType === 'rotisserie') priority += 4;
if (product.category === 'Congelados' && activityType === 'rotisserie') priority += 4;
if (product.category === 'Temperos' && activityType === 'rotisserie') priority += 3;
if (product.category === 'Molhos' && activityType === 'rotisserie') priority += 2;
if (product.category === 'Óleos' && activityType === 'rotisserie') priority += 2;

// ADEGA
if (product.category === 'Bebidas' && activityType === 'adega') priority += 5;
if (product.category === 'Conservas' && activityType === 'adega') priority += 3;
if (product.category === 'Embutidos' && activityType === 'adega') priority += 2;
if (product.category === 'Laticínios' && activityType === 'adega') priority += 2;
if (product.category === 'Doces' && activityType === 'adega') priority += 1;

// CLUBE/ASSOCIAÇÃO DESPORTIVA
if (product.category === 'Bebidas' && (activityType === 'clube' || activityType === 'clube_associacao')) priority += 4;
if (product.category === 'Carnes' && (activityType === 'clube' || activityType === 'clube_associacao')) priority += 3;
if (product.category === 'Embutidos' && (activityType === 'clube' || activityType === 'clube_associacao')) priority += 3;
if (product.category === 'Congelados' && (activityType === 'clube' || activityType === 'clube_associacao')) priority += 2;
if (product.category === 'Temperos' && (activityType === 'clube' || activityType === 'clube_associacao')) priority += 2;

// BUFFET
if (product.category === 'Carnes' && activityType === 'buffet') priority += 4;
if (product.category === 'Congelados' && activityType === 'buffet') priority += 4;
if (product.category === 'Laticínios' && activityType === 'buffet') priority += 3;
if (product.category === 'Bebidas' && activityType === 'buffet') priority += 3;
if (product.category === 'Doces' && activityType === 'buffet') priority += 2;
if (product.category === 'Temperos' && activityType === 'buffet') priority += 2;

// HAMBURGERIA
if (product.category === 'Carnes' && activityType === 'hamburgeria') priority += 4;
if (product.category === 'Laticínios' && activityType === 'hamburgeria') priority += 4;
if (product.category === 'Congelados' && activityType === 'hamburgeria') priority += 3;
if (product.category === 'Molhos' && activityType === 'hamburgeria') priority += 3;
if (product.category === 'Embutidos' && activityType === 'hamburgeria') priority += 3;
if (product.category === 'Óleos' && activityType === 'hamburgeria') priority += 2;

// OUTROS (fallback para categorias não específicas)
if (product.category === 'Grãos' && activityType === 'outros') priority += 2;
if (product.category === 'Laticínios' && activityType === 'outros') priority += 2;
if (product.category === 'Temperos' && activityType === 'outros') priority += 1;
if (product.category === 'Óleos' && activityType === 'outros') priority += 1;

// PRIORIDADES ESPECIAIS PARA PRODUTOS ESPECÍFICOS
// Food Service (prioridade para grandes volumes)
if (product.name.includes('FOOD SERVICE') && ['restaurante', 'cozinha_industrial', 'buffet', 'hotel'].includes(activityType)) {
    priority += 2;
}

// Produtos Premium/Gourmet
if ((product.name.includes('PREMIUM') || product.name.includes('GOURMET')) && 
    ['hamburgeria', 'churrascaria', 'adega'].includes(activityType)) {
    priority += 1;
}

// Produtos Congelados para estabelecimentos que precisam de praticidade
if (product.category === 'Congelados' && 
    ['lanchonete', 'buffet', 'rotisserie', 'loja_conveniencia'].includes(activityType)) {
    priority += 1;
}

// Bebidas Alcoólicas para estabelecimentos licenciados
if (product.name.includes('CERVEJA') || product.name.includes('VINHO') || 
    product.name.includes('WHISKY') || product.name.includes('VODKA')) {
    if (['bar_choperia', 'adega', 'clube_associacao', 'churrascaria'].includes(activityType)) {
        priority += 2;
    }
}


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
                <li>🥩 Calabresa Aurora, Pepperoni e outras proteínas de primeira qualidade</li>
                <li>🧀 Muçarela Tirolez, Catupiry e queijos especiais para pizza</li>
                <li>🍅 Molho de Tomate Pizza Cepêra e Extrato sem acidez</li>
                <li>🫒 Azeitonas Colosso e Arco Bello importadas e nacionais</li>
                <li>🥓 Bacon em cubos Aurora e muito mais</li>
            </ul>
        </div>
    `;
} else if (atividade === 'restaurante' || atividade === 'restaurante_cantina') {
    script += `
        <div class="script-section">
            <h4>🍽️ ESPECIALIZADO PARA RESTAURANTES</h4>
            <p>Oferecemos produtos premium para restaurantes:</p>
            <ul>
                <li>🥩 Carnes bovinas resfriadas Plena, Jordanésia e BOI Brasil</li>
                <li>🍗 Frangos Adoro, Copacol e aves selecionados</li>
                <li>🍚 Arroz Food Service Camil tipo 1 para pratos executivos</li>
                <li>🥘 Temperos Penina, Sazón Ajinomoto e condimentos especiais</li>
                <li>🐟 Peixes Palemon e frutos do mar Oceani</li>
            </ul>
        </div>
    `;
} else if (atividade === 'lanchonete') {
    script += `
        <div class="script-section">
            <h4>🍔 ESPECIALIZADO PARA LANCHONETES</h4>
            <p>Temos uma linha completa para lanchonetes:</p>
            <ul>
                <li>🍟 Batatas pré-fritas congeladas McCain, Simplot e Lambweston</li>
                <li>🥓 Bacon Aurora fatiado e em cubos</li>
                <li>🍖 Hambúrgueres Maturatta Friboi e Mister Beef</li>
                <li>🧈 Maioneses Hellmann's, Catchup Heinz e molhos especiais</li>
                <li>🥤 Coca Cola, Guaraná Antarctica e bebidas para revenda</li>
            </ul>
        </div>
    `;
} else if (atividade === 'padaria') {
    script += `
        <div class="script-section">
            <h4>🥖 ESPECIALIZADO PARA PADARIAS</h4>
            <p>Linha completa para panificação e confeitaria:</p>
            <ul>
                <li>🌾 Farinhas Dona Benta, Anaconda e Rosa Branca tipo 1</li>
                <li>🧁 Fermento Fleischmann, açúcar União e insumos</li>
                <li>🍫 Chocolate Forneável Harald, Melken e coberturas</li>
                <li>🥛 Leite Condensado Moça, Creme de Leite e laticínios</li>
                <li>🧈 Margarinas Primor, óleos e gorduras para massas</li>
            </ul>
        </div>
    `;
} else if (atividade === 'supermercado') {
    script += `
        <div class="script-section">
            <h4>🛒 ESPECIALIZADO PARA SUPERMERCADOS</h4>
            <p>Produtos Food Service em grandes volumes:</p>
            <ul>
                <li>📦 Arroz, Feijão e grãos Camil Food Service</li>
                <li>🧽 Linha completa de limpeza Ypê</li>
                <li>🥛 Laticínios Italac, Tirolez para revenda</li>
                <li>🥩 Carnes resfriadas em grandes volumes</li>
                <li>🍺 Bebidas Coca Cola, cervejas para distribuição</li>
            </ul>
        </div>
    `;
} else if (atividade === 'pessoa_fisica') {
    script += `
        <div class="script-section">
            <h4>👤 PARA PESSOA FÍSICA</h4>
            <p>Produtos em embalagens familiares:</p>
            <ul>
                <li>🏠 Produtos básicos para uso doméstico</li>
                <li>🍚 Arroz, feijão e grãos em embalagens de 1kg</li>
                <li>🥛 Leites, queijos e laticínios para família</li>
                <li>🧹 Produtos de limpeza para casa</li>
                <li>🍖 Carnes fracionadas e embalagens pequenas</li>
            </ul>
        </div>
    `;
} else if (atividade === 'pastelaria') {
    script += `
        <div class="script-section">
            <h4>🥟 ESPECIALIZADO PARA PASTELARIAS</h4>
            <p>Produtos específicos para frituras e salgados:</p>
            <ul>
                <li>🌾 Farinha para Pastel Anaconda e massas prontas</li>
                <li>🛢️ Óleo Soya, Liza para fritura de qualidade</li>
                <li>🧀 Muçarela Tirolez e queijos para recheio</li>
                <li>🥩 Presunto Aurora, carne moída e recheios</li>
                <li>🫒 Palmito Du Campo picado e conservas</li>
            </ul>
        </div>
    `;
} else if (atividade === 'bar' || atividade === 'bar_choperia') {
    script += `
        <div class="script-section">
            <h4>🍺 ESPECIALIZADO PARA BARES E CHOPERIAS</h4>
            <p>Bebidas e petiscos para estabelecimentos:</p>
            <ul>
                <li>🍺 Cervejas Skol, Brahma, Heineken e artesanais</li>
                <li>🥃 Whisky Johnnie Walker, Vodka Smirnoff e destilados</li>
                <li>🍷 Vinhos nacionais e importados</li>
                <li>🥜 Amendoim Brasilseco, azeitonas e petiscos</li>
                <li>🥓 Linguiças, bacon e tira-gostos</li>
            </ul>
        </div>
    `;
} else if (atividade === 'mercearia' || atividade === 'mercearia_sacolao') {
    script += `
        <div class="script-section">
            <h4>🥬 ESPECIALIZADO PARA MERCEARIAS E SACOLÕES</h4>
            <p>Produtos básicos e conservas:</p>
            <ul>
                <li>🍚 Grãos Camil, arroz e feijão tipo 1</li>
                <li>🥫 Conservas Quero, Bonare e enlatados</li>
                <li>🧂 Temperos Penina, sal Lebre e condimentos</li>
                <li>🫒 Azeitonas, palmito e conservas diversas</li>
                <li>🛢️ Óleos, azeites e produtos básicos</li>
            </ul>
        </div>
    `;
} else if (atividade === 'hotel' || atividade === 'hotel_motel_pousada') {
    script += `
        <div class="script-section">
            <h4>🏨 ESPECIALIZADO PARA HOTELARIA</h4>
            <p>Produtos para café da manhã e room service:</p>
            <ul>
                <li>☕ Café Pilão, leite Italac para café da manhã</li>
                <li>🥛 Leite condensado, açúcar e adoçantes</li>
                <li>🧈 Margarinas, geleias e acompanhamentos</li>
                <li>🧽 Produtos de limpeza e higiene para quartos</li>
                <li>💧 Água Crystal e bebidas para frigobar</li>
            </ul>
        </div>
    `;
} else if (atividade === 'esfiharia') {
    script += `
        <div class="script-section">
            <h4>🥙 ESPECIALIZADO PARA ESFIHARIAS</h4>
            <p>Produtos para culinária árabe:</p>
            <ul>
                <li>🌾 Farinha de Trigo Dona Benta para massas árabes</li>
                <li>🥩 Carne moída, queijos para recheios</li>
                <li>🧈 Fermento, azeite e ingredientes para massas</li>
                <li>🧄 Temperos árabes, alho e cebola</li>
                <li>🫒 Azeitonas e conservas especiais</li>
            </ul>
        </div>
    `;
} else if (atividade === 'cozinha_oriental') {
    script += `
        <div class="script-section">
            <h4>🍜 ESPECIALIZADO PARA COZINHA ORIENTAL</h4>
            <p>Produtos asiáticos autênticos:</p>
            <ul>
                <li>🥢 Shoyu Cepêra, Tarê Mitsuwa e molhos orientais</li>
                <li>🍶 Saquê Azuma Kirin e bebidas japonesas</li>
                <li>🌿 Wasabi Taichi, gengibre e temperos asiáticos</li>
                <li>🍜 Macarrão Yakissoba, algas Nori</li>
                <li>🦀 Kani Oceani e ingredientes para sushi</li>
            </ul>
        </div>
    `;
} else if (atividade === 'cozinha_industrial') {
    script += `
        <div class="script-section">
            <h4>🏭 ESPECIALIZADO PARA COZINHA INDUSTRIAL</h4>
            <p>Produtos Food Service em grandes volumes:</p>
            <ul>
                <li>📦 Temperos Ajinomoto Food Service 5kg e 10kg</li>
                <li>🥩 Carnes em grandes volumes para produção</li>
                <li>🍚 Grãos Camil Food Service para alimentação coletiva</li>
                <li>🛢️ Óleos em galões e gorduras industriais</li>
                <li>🧂 Caldos concentrados e bases culinárias</li>
            </ul>
        </div>
    `;
} else if (atividade === 'churrascaria') {
    script += `
        <div class="script-section">
            <h4>🥩 ESPECIALIZADO PARA CHURRASCARIAS</h4>
            <p>Cortes nobres e produtos para churrasco:</p>
            <ul>
                <li>🥩 Picanha Jordanésia, Alcatra e Fraldinha BOI Brasil</li>
                <li>🔥 Sal Grosso Master, temperos para churrasco</li>
                <li>🌶️ Chimichurri Brasilseco e molhos especiais</li>
                <li>🥓 Linguiça Toscana Aurora e embutidos</li>
                <li>⚫ Briquete e carvão para churrasqueiras</li>
            </ul>
        </div>
    `;
} else if (atividade === 'colaborador') {
    script += `
        <div class="script-section">
            <h4>👥 PARA COLABORADORES</h4>
            <p>Benefícios e produtos para funcionários:</p>
            <ul>
                <li>🛒 Cestas básicas com produtos Camil</li>
                <li>🍚 Arroz, feijão e itens essenciais</li>
                <li>☕ Café, açúcar e produtos básicos</li>
                <li>🥛 Leite e produtos para alimentação</li>
                <li>🎁 Benefícios alimentação para equipes</li>
            </ul>
        </div>
    `;
} else if (atividade === 'fabrica_massas') {
    script += `
        <div class="script-section">
            <h4>🍝 ESPECIALIZADO PARA FÁBRICAS DE MASSAS</h4>
            <p>Matérias-primas para produção de massas:</p>
            <ul>
                <li>🌾 Farinha Grano Duro Petybon para massas</li>
                <li>🥚 Ovos Fleischeggs pasteurizados para produção</li>
                <li>🍝 Massas Famigliare frescas e ingredientes</li>
                <li>🧂 Temperos e aditivos para massas</li>
                <li>📦 Embalagens e insumos para produção</li>
            </ul>
        </div>
    `;
} else if (atividade === 'confeitaria') {
    script += `
        <div class="script-section">
            <h4>🧁 ESPECIALIZADO PARA CONFEITARIAS</h4>
            <p>Ingredientes premium para doces finos:</p>
            <ul>
                <li>🍫 Chocolate Harald Confeiteiro, Melken para temperar</li>
                <li>🍰 Açúcar Confeiteiro, Glucose e adoçantes</li>
                <li>🎨 Corantes, essências e aromas</li>
                <li>✨ Granulado Harald, confeitos e decoração</li>
                <li>🥛 Cremes, recheios Moça e coberturas</li>
            </ul>
        </div>
    `;
} else if (atividade === 'laticinios' || atividade === 'laticinios_distribuidor') {
    script += `
        <div class="script-section">
            <h4>🥛 ESPECIALIZADO PARA LATICÍNIOS</h4>
            <p>Produtos lácteos para distribuição:</p>
            <ul>
                <li>🧀 Queijos Tirolez, Scala e linha premium</li>
                <li>🥛 Leites Italac, Piracanjuba para revenda</li>
                <li>🧈 Requeijão Catupiry, Cream Cheese Philadelphia</li>
                <li>🧈 Manteigas Tirolez e margarinas especiais</li>
                <li>📦 Produtos em atacado para distribuição</li>
            </ul>
        </div>
    `;
} else if (atividade === 'loja_conveniencia') {
    script += `
        <div class="script-section">
            <h4>🏪 ESPECIALIZADO PARA LOJAS DE CONVENIÊNCIA</h4>
            <p>Produtos de alta rotação e praticidade:</p>
            <ul>
                <li>🥤 Coca Cola, Guaraná Antarctica em latas</li>
                <li>⚡ Red Bull, Monster Energy e energéticos</li>
                <li>🍫 Bombons Lacta, doces e snacks</li>
                <li>🧀 Polenguinho, queijos em espeto</li>
                <li>🧊 Produtos para frigobar e conveniência</li>
            </ul>
        </div>
    `;
} else if (atividade === 'acougue') {
    script += `
        <div class="script-section">
            <h4>🥩 ESPECIALIZADO PARA AÇOUGUES</h4>
            <p>Carnes frescas e embutidos:</p>
            <ul>
                <li>🥩 Carnes bovinas Plena, Jordanésia resfriadas</li>
                <li>🍗 Frangos Adoro, Copacol e aves</li>
                <li>🐷 Suínos Pamplona e cortes especiais</li>
                <li>🥓 Embutidos Aurora, linguiças e bacon</li>
                <li>🧂 Temperos para carnes e condimentos</li>
            </ul>
        </div>
    `;
} else if (atividade === 'rotisserie') {
    script += `
        <div class="script-section">
            <h4>🍗 ESPECIALIZADO PARA ROTISSERIES</h4>
            <p>Produtos semi-prontos e assados:</p>
            <ul>
                <li>🍗 Frangos Adoro temperados para assar</li>
                <li>🧂 Temperos Penina, Baiano para assados</li>
                <li>🥖 Pão de Alho congelado Brasa Burguers</li>
                <li>❄️ Congelados McCain, salgados prontos</li>
                <li>🌶️ Molhos e temperos para grelhados</li>
            </ul>
        </div>
    `;
} else if (atividade === 'adega') {
    script += `
        <div class="script-section">
            <h4>🍷 ESPECIALIZADO PARA ADEGAS</h4>
            <p>Vinhos e bebidas finas:</p>
            <ul>
                <li>🍷 Vinhos Concha Y Toro, Santa Helena importados</li>
                <li>🥂 Espumantes Chandon e bebidas premium</li>
                <li>🥃 Whisky Johnnie Walker, Jack Daniel's</li>
                <li>🍾 Vodka Absolut, Gin Tanqueray</li>
                <li>🫒 Petiscos gourmet, azeitonas especiais</li>
            </ul>
        </div>
    `;
} else if (atividade === 'clube' || atividade === 'clube_associacao') {
    script += `
        <div class="script-section">
            <h4>⚽ ESPECIALIZADO PARA CLUBES E ASSOCIAÇÕES</h4>
            <p>Produtos para eventos sociais e esportivos:</p>
            <ul>
                <li>🍺 Cervejas Skol, Brahma para eventos</li>
                <li>🥩 Carnes para churrascos e confraternizações</li>
                <li>🥤 Refrigerantes Coca Cola em grandes volumes</li>
                <li>🥓 Linguiças, petiscos e aperitivos</li>
                <li>🎉 Produtos para festas e recreação</li>
            </ul>
        </div>
    `;
} else if (atividade === 'buffet') {
    script += `
        <div class="script-section">
            <h4>🎉 ESPECIALIZADO PARA BUFFETS</h4>
            <p>Produtos para eventos e festas:</p>
            <ul>
                <li>🥩 Carnes BOI Brasil para grandes volumes</li>
                <li>❄️ Congelados McCain, salgadinhos e finger foods</li>
                <li>🥛 Laticínios Tirolez para doces e salgados</li>
                <li>🥤 Bebidas Coca Cola, sucos para eventos</li>
                <li>🍰 Ingredientes Nestlé para doces de festa</li>
            </ul>
        </div>
    `;
} else if (atividade === 'hamburgeria') {
    script += `
        <div class="script-section">
            <h4>🍔 ESPECIALIZADO PARA HAMBURGERIAS GOURMET</h4>
            <p>Produtos premium para hambúrgueres artesanais:</p>
            <ul>
                <li>🍖 Hambúrgueres Maturatta Friboi sabor picanha</li>
                <li>🥓 Bacon Aurora premium e embutidos especiais</li>
                <li>🧀 Queijos Tirolez, Cheddar e especiais</li>
                <li>🍟 Batatas McCain rústicas e onion rings</li>
                <li>🌶️ Molhos Billy & Jack, especiais gourmet</li>
            </ul>
        </div>
    `;
} else if (atividade === 'outros') {
    script += `
        <div class="script-section">
            <h4>📦 PRODUTOS DIVERSOS</h4>
            <p>Atendemos diversos tipos de estabelecimentos:</p>
            <ul>
                <li>🏪 Produtos básicos para varejo</li>
                <li>🍚 Grãos, temperos e conservas</li>
                <li>🥛 Laticínios e bebidas</li>
                <li>🥩 Carnes e proteínas diversas</li>
                <li>📞 Consulte nossa equipe para soluções personalizadas</li>
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


