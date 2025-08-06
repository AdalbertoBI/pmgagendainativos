class ProspeccaoManager {
    constructor() {
        this.imagesMap = {};
        this.catalog = [];
        this.currentProspect = null;
        this.selectedProducts = [];
        this.prospectCount = 0;
        this.offerCount = 0;
        
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
            // Garantir pelo menos 50 produtos, se possível
            if (this.catalog.length < 50) {
                const additionalProducts = this.createBasicCatalog().slice(0, 50 - this.catalog.length);
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

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('offerModal').style.display = 'none';
        });

        // Botões de ação
        document.getElementById('createOffer').addEventListener('click', () => {
            this.createOfferArt();
        });

        document.getElementById('copySalesScript').addEventListener('click', () => {
            this.copySalesScript();
        });

        document.getElementById('downloadOffer').addEventListener('click', () => {
            this.downloadOffer();
        });

        document.getElementById('shareWhatsApp').addEventListener('click', () => {
            this.shareWhatsApp();
        });
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
                <p><strong>População Estimada:</strong> ${this.currentProspect.location.populacao_estimada.toLocaleString()}</p>
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
                <p>Com nossos 30 anos de experiência, atendemos mais de 5.000 clientes e oferecemos:</p>
                <ul>
                    <li>✅ <strong>Preços competitivos</strong> - Compramos direto dos fabricantes</li>
                    <li>✅ <strong>Entrega programada</strong> - Garantimos o abastecimento do seu negócio</li>
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
                        <li>🥩 Calabresa Aurora de primeira qualidade</li>
                        <li>🧀 Queijos especiais para pizza</li>
                        <li>🍅 Molhos de tomate sem acidez</li>
                        <li>🫒 Azeitonas importadas e nacionais</li>
                        <li>🥓 Bacon em cubos para pizzas gourmet</li>
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
                <p>Gostaria de agendar uma visita para apresentar nossos produtos pessoalmente?</p>
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
                    <img src="https://pmg.com.br/wp-content/uploads/2024/05/PMG-30-ANOS-ATACADISTA-PNG-3.png" alt="PMG 30 Anos">
                    <h1>Oferta Especial</h1>
                    <p>Personalizada para <strong>${clientName}</strong></p>
                </div>

                <div class="offer-products">
                    ${products.map(product => `
                        <div class="offer-product">
                            <img src="${product.image}" alt="${product.name}" onerror="this.src='${this.getProductImage(product.code)}'">
                            <h3>${product.name}</h3>
                            <div class="price">R$ ${product.price.toFixed(2)}</div>
                            <div class="unit">Por ${product.unit}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="offer-footer">
                    <h2>PMG Atacadista - 30 Anos de Tradição</h2>
                    <p>Qualidade, Pontualidade e o Melhor Atendimento</p>
                    <p>Condições especiais de pagamento</p>
                    <p>Entrega programada na sua região</p>
                    <p>www.pmg.com.br</p>
                </div>
            </div>
        `;
    }

    async downloadOffer() {
        try {
            const element = document.getElementById('offerPreview');
            const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            // Converter para blob e baixar
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `oferta-${this.currentProspect.company.fantasia || 'cliente'}-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            });

            alert('✅ Arte da oferta baixada com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao baixar oferta:', error);
            alert('❌ Erro ao baixar oferta: ' + error.message);
        }
    }

    shareWhatsApp() {
        const company = this.currentProspect.company;
        const nomeEmpresa = company.fantasia || company.nome;
        const telefone = company.telefone ? company.telefone.replace(/\D/g, '') : '';

        let message = `🎯 *Oferta Especial PMG Atacadista*\n\n`;
        message += `Olá ${nomeEmpresa}! 👋\n\n`;
        message += `Preparamos uma oferta especial para vocês com ${this.selectedProducts.length} produtos selecionados:\n\n`;

        this.selectedProducts.forEach((product, index) => {
            message += `${index + 1}. *${product.name}*\n`;
            message += `   💰 R$ ${product.price.toFixed(2)} por ${product.unit}\n`;
            message += `   📦 ${product.reason}\n\n`;
        });

        message += `🏆 *PMG Atacadista - 30 Anos de Tradição*\n`;
        message += `✅ Preços competitivos\n`;
        message += `✅ Entrega programada\n`;
        message += `✅ Qualidade garantida\n`;
        message += `✅ Condições especiais de pagamento\n\n`;
        message += `📞 Entre em contato: (11) 99999-9999\n`;
        message += `🌐 www.pmg.com.br`;

        const encodedMessage = encodeURIComponent(message);
        let whatsappUrl = `https://wa.me/${telefone}?text=${encodedMessage}`;

        if (!telefone) {
            whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        }

        window.open(whatsappUrl, '_blank');
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


