// catalog.js - Gerenciamento do catálogo de produtos - VERSÃO COM IMAGEM VISUAL
class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.selectedProducts = [];
        this.currentProduct = null;
        this.pdfData = null;
        this.isLoading = false;
        this.pdfText = '';
        this.extractedProducts = [];
    }
    // === MÉTODOS DE PERSISTÊNCIA ===

// Salvar catálogo no localStorage
saveCatalogToCache(catalogData) {
    try {
        const cacheData = {
            products: catalogData.products || this.products,
            extractedProducts: catalogData.extractedProducts || this.extractedProducts,
            pdfText: catalogData.pdfText || this.pdfText,
            savedAt: new Date().toISOString(),
            fileName: catalogData.fileName || 'Catálogo Personalizado'
        };
        
        localStorage.setItem('catalogCache', JSON.stringify(cacheData));
        console.log('✅ Catálogo salvo no cache:', cacheData.fileName);
        
        // Salvar flag indicando que existe catálogo personalizado
        localStorage.setItem('hasCustomCatalog', 'true');
        
    } catch (error) {
        console.error('❌ Erro ao salvar catálogo no cache:', error);
    }
}

// Carregar catálogo do localStorage
loadCatalogFromCache() {
    try {
        const cacheData = localStorage.getItem('catalogCache');
        const hasCustom = localStorage.getItem('hasCustomCatalog');
        
        if (!cacheData || hasCustom !== 'true') {
            console.log('📦 Nenhum catálogo personalizado encontrado no cache');
            return null;
        }
        
        const parsedData = JSON.parse(cacheData);
        
        // Verificar se os dados são válidos
        if (!parsedData.products || !Array.isArray(parsedData.products)) {
            console.warn('⚠️ Dados do cache inválidos');
            return null;
        }
        
        console.log(`📦 Catálogo carregado do cache: ${parsedData.fileName} (${parsedData.savedAt})`);
        console.log(`📊 ${parsedData.products.length} produtos encontrados no cache`);
        
        return parsedData;
        
    } catch (error) {
        console.error('❌ Erro ao carregar catálogo do cache:', error);
        return null;
    }
}

// Limpar cache do catálogo
clearCatalogCache() {
    try {
        localStorage.removeItem('catalogCache');
        localStorage.removeItem('hasCustomCatalog');
        console.log('🗑️ Cache do catálogo limpo');
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
    }
}

// Verificar se existe catálogo personalizado
hasCustomCatalogCached() {
    return localStorage.getItem('hasCustomCatalog') === 'true';
}


    // Inicializar catálogo com verificação de cache
async init() {
    console.log('📦 Inicializando CatalogManager...');
    try {
        // Tentar carregar do cache
        const cachedCatalog = this.loadCatalogFromCache();
        
        if (cachedCatalog) {
            this.products = cachedCatalog.products;
            this.extractedProducts = cachedCatalog.extractedProducts || [];
            this.pdfText = cachedCatalog.pdfText || '';
            this.filteredProducts = [...this.products];
            
            this.updateCatalogStatus(`Catálogo carregado do cache: ${cachedCatalog.fileName} (${cachedCatalog.products.length} produtos)`);
            this.renderProductsGrid();
            
            console.log(`✅ Catálogo personalizado carregado do cache: ${cachedCatalog.products.length} produtos`);
        } else {
            this.updateCatalogStatus('Nenhum catálogo encontrado. Carregando produtos de exemplo...');
            this.loadMockProducts();
        }
        
        this.setupEventListeners();
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        this.updateCatalogStatus('Erro na inicialização. Carregando produtos de exemplo...');
        this.loadMockProducts();
        this.setupEventListeners();
    }
}


    // Configurar event listeners
    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // Botão de carregar novo catálogo
const loadCatalogBtn = document.getElementById('load-new-catalog');
if (loadCatalogBtn) {
    loadCatalogBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('catalog-file-input');
        if (fileInput) {
            fileInput.click();
        }
    });
}

// Input de arquivo para novo catálogo
const catalogFileInput = document.getElementById('catalog-file-input');
if (catalogFileInput) {
    catalogFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.loadNewCatalog(file);
        } else if (file) {
            alert('Por favor, selecione um arquivo PDF válido.');
        }
    });
}

        // Busca de produtos
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Botão de atualizar catálogo
        const refreshBtn = document.getElementById('refresh-catalog');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadPdfCatalog();
            });
        }

        // Botão de seleção múltipla
        const selectMultipleBtn = document.getElementById('select-multiple-products');
        if (selectMultipleBtn) {
            selectMultipleBtn.addEventListener('click', () => {
                this.openProductSelectionModal();
            });
        }

        // Modal de produto
        this.setupProductModal();
        
        // Modal de seleção múltipla
        this.setupProductSelectionModal();
        
        // Modal de texto de ofertas
        this.setupTextOffersModal();
    }

    // Configurar modal de produto
    setupProductModal() {
        const modal = document.getElementById('modal-produto');
        const closeBtn = document.getElementById('close-produto');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    // Configurar modal de seleção múltipla
    setupProductSelectionModal() {
        const modal = document.getElementById('modal-product-selection');
        const closeBtn = document.getElementById('close-product-selection');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Busca na seleção múltipla
        const searchInput = document.getElementById('search-products-selection');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProductsInSelection(e.target.value);
            });
        }

        // Botões de seleção
        const selectAllBtn = document.getElementById('select-all-products');
        const deselectAllBtn = document.getElementById('deselect-all-products');
        const generateTextBtn = document.getElementById('generate-text-offers');
        const generateImageBtn = document.getElementById('generate-image-offers');

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllProducts(true);
            });
        }

        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                this.selectAllProducts(false);
            });
        }

        if (generateTextBtn) {
            generateTextBtn.addEventListener('click', () => {
                this.generateTextOffers();
            });
        }

        if (generateImageBtn) {
            generateImageBtn.addEventListener('click', () => {
                this.generateImageOffersVisual();
            });
        }
    }

    // Configurar modal de texto de ofertas
    setupTextOffersModal() {
        const modal = document.getElementById('modal-text-offers');
        const closeBtn = document.getElementById('close-text-offers');
        const closeModalBtn = document.getElementById('close-text-modal');
        const copyBtn = document.getElementById('copy-offers-text');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyTextToClipboard();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }
    
    // Carregar novo catálogo (arquivo diferente do padrão) COM PERSISTÊNCIA
async loadNewCatalog(pdfFile) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.updateCatalogStatus('Carregando novo catálogo...');
    
    try {
        let arrayBuffer;
        let fileName = 'Catálogo Personalizado';
        
        // Se recebeu um arquivo File do input
        if (pdfFile instanceof File) {
            arrayBuffer = await pdfFile.arrayBuffer();
            fileName = pdfFile.name;
            this.updateCatalogStatus(`Carregando arquivo: ${fileName}...`);
        } 
        // Se recebeu uma URL/caminho de arquivo
        else if (typeof pdfFile === 'string') {
            const response = await fetch(pdfFile);
            if (!response.ok) {
                throw new Error(`Arquivo não encontrado: ${pdfFile}`);
            }
            arrayBuffer = await response.arrayBuffer();
            fileName = pdfFile.split('/').pop() || 'Catálogo Personalizado';
            this.updateCatalogStatus(`Carregando arquivo: ${fileName}...`);
        }
        else {
            throw new Error('Formato de arquivo inválido');
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        this.updateCatalogStatus('Extraindo texto do novo catálogo...');
        await this.extractTextFromPDFComplete(pdf);
        
        this.updateCatalogStatus('Processando produtos com múltiplos métodos...');
        await this.processProductsAdvanced();
        
        // ✅ SALVAR NO CACHE APÓS PROCESSAMENTO BEM-SUCEDIDO
        this.saveCatalogToCache({
            products: this.products,
            extractedProducts: this.extractedProducts,
            pdfText: this.pdfText,
            fileName: fileName
        });
        
        this.updateCatalogStatus(`Novo catálogo carregado e salvo: ${this.products.length} produtos encontrados`);
        this.renderProductsGrid();
        
        // Limpar o input file após o carregamento
        const fileInput = document.getElementById('catalog-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
        
        console.log(`✅ NOVO CATÁLOGO CARREGADO E PERSISTIDO: ${this.products.length} produtos processados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar novo catálogo:', error);
        this.updateCatalogStatus(`Erro ao carregar novo catálogo: ${error.message}`);
        
        // Em caso de erro, manter produtos existentes ou carregar produtos de exemplo
        if (this.products.length === 0) {
            // Tentar carregar do cache primeiro
            const cachedCatalog = this.loadCatalogFromCache();
            if (cachedCatalog) {
                this.products = cachedCatalog.products;
                this.filteredProducts = [...this.products];
                this.renderProductsGrid();
                this.updateCatalogStatus('Erro no carregamento. Mantendo catálogo anterior do cache.');
            } else {
                this.updateCatalogStatus('Carregando produtos de exemplo...');
                this.loadMockProducts();
            }
        }
    } finally {
        this.isLoading = false;
    }
}



    // Carregar catálogo otimizado
    async loadPdfCatalog() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.updateCatalogStatus('Carregando catálogo do PDF...');

        try {
            const response = await fetch('./GERAL_1.pdf');
            if (!response.ok) {
                throw new Error('PDF não encontrado');
            }

            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            this.updateCatalogStatus('Extraindo texto do PDF...');
            await this.extractTextFromPDFComplete(pdf);

            this.updateCatalogStatus('Processando produtos com múltiplos métodos...');
            await this.processProductsAdvanced();

            this.updateCatalogStatus(`${this.products.length} produtos encontrados`);
            this.renderProductsGrid();

        } catch (error) {
            console.error('❌ Erro ao carregar PDF:', error);
            this.updateCatalogStatus('Erro ao carregar catálogo. Carregando produtos de exemplo...');
            this.loadMockProducts();
        } finally {
            this.isLoading = false;
        }
    }

    

    // EXTRAIR TEXTO COMPLETO
    async extractTextFromPDFComplete(pdf) {
        try {
            let allText = '';
            const maxPages = pdf.numPages;

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += pageText + '\n';

                if (i % 10 === 0) {
                    await this.sleep(5);
                    this.updateCatalogStatus(`Extraindo texto... página ${i}/${maxPages}`);
                }
            }

            this.pdfText = allText;
            console.log(`📄 Texto extraído: ${this.pdfText.length} caracteres de ${maxPages} páginas`);
        } catch (error) {
            console.error('❌ Erro na extração de texto:', error);
            this.pdfText = '';
        }
    }

   
   // PROCESSAMENTO AVANÇADO - VERSÃO SEM DUPLICAÇÃO
async processProductsAdvanced() {
    this.extractedProducts = [];
    
    if (!this.pdfText) {
        console.log('⚠️ Nenhum texto disponível para extração');
        return;
    }

    // ✅ USAR MAP PARA CONTROLE MAIS RIGOROSO DE DUPLICAÇÃO
    const foundProducts = new Map(); // Chave: código, Valor: produto completo
    
    // MÉTODO 1: MÚLTIPLOS PADRÕES
    await this.extractWithMultiplePatternsFixed(foundProducts);
    
    // MÉTODO 2: LINHA POR LINHA (apenas se não encontrou muitos produtos)
    if (foundProducts.size < 100) {
        await this.extractLineByLineFixed(foundProducts);
    }
    
    // MÉTODO 3: BLOCOS (apenas se ainda há poucos produtos)
    if (foundProducts.size < 200) {
        await this.extractByBlocksFixed(foundProducts);
    }
    
    // ✅ CONVERTER MAP PARA ARRAY (garante produtos únicos)
    this.extractedProducts = Array.from(foundProducts.values());
    
    this.products = this.extractedProducts.map((product, index) => ({
        id: index + 1,
        code: product.cod,
        name: product.produto,
        price: this.parsePrice(product.preco),
        formattedPrice: `R$ ${product.preco}`,
        description: this.generateDescription(product.produto),
        image: this.generateProductImagePath(product.cod),
        category: this.categorizeProduct(product.produto),
        unit: product.vendPor || 'UN'
    }));

    this.filteredProducts = [...this.products];
    console.log(`✅ EXTRAÇÃO FINAL SEM DUPLICAÇÃO: ${this.products.length} produtos únicos`);
}
// MÉTODO 1 CORRIGIDO: MÚLTIPLOS PADRÕES SEM DUPLICAÇÃO
async extractWithMultiplePatternsFixed(foundProducts) {
    this.updateCatalogStatus('Aplicando padrões regex...');
    
    const patterns = [
        /(\d{1,5})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^\n\r]+?)\s+(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)\s*R?\$?/gi,
        /(\d{1,5})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^\n\r]*)\n([^\n\r]+?)\s+(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)\s*R?\$?/gi,
        /(\d{1,5})\s{2,}([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^\n\r]+?)\s{2,}(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)/gi
    ];

    let totalExtracted = 0;
    
    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
        const pattern = patterns[patternIndex];
        let matches = 0;
        
        try {
            pattern.lastIndex = 0;
            let match;
            
            while ((match = pattern.exec(this.pdfText)) !== null) {
                let cod, produto, vendPor, preco;
                
                if (patternIndex === 1) {
                    if (match.length >= 6) {
                        [, cod, produto1, produto2, vendPor, preco] = match;
                        produto = (produto1 + ' ' + produto2).trim();
                    } else continue;
                } else {
                    if (match.length >= 5) {
                        [, cod, produto, vendPor, preco] = match;
                    } else continue;
                }

                // ✅ VERIFICAR SE JÁ EXISTE NO MAP
                if (foundProducts.has(cod)) continue;

                const cleanProduto = this.cleanProductNameAdvanced(produto);
                const cleanPreco = this.formatPrice(preco);

                if (this.isValidProductAdvanced(cod, cleanProduto, vendPor, cleanPreco)) {
                    // ✅ ADICIONAR NO MAP (garante unicidade)
                    foundProducts.set(cod, {
                        cod: cod.trim(),
                        produto: cleanProduto.toUpperCase(),
                        vendPor: vendPor.trim().toUpperCase(),
                        preco: cleanPreco,
                        method: `regex_${patternIndex + 1}`
                    });
                    
                    matches++;
                    totalExtracted++;
                }

                if (matches % 50 === 0) {
                    await this.sleep(1);
                    this.updateCatalogStatus(`Padrão ${patternIndex + 1}: ${matches} produtos | Total: ${totalExtracted}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Erro no Padrão ${patternIndex + 1}: ${error.message}`);
        }
    }
}

// MÉTODO 2 CORRIGIDO: LINHA POR LINHA SEM DUPLICAÇÃO
async extractLineByLineFixed(foundProducts) {
    this.updateCatalogStatus('Parser linha por linha...');
    
    const lines = this.pdfText.split(/[\n\r]+/);
    let extracted = 0;

    for (let i = 0; i < lines.length - 3; i++) {
        const line1 = lines[i].trim();
        const line2 = lines[i + 1]?.trim() || '';
        const line3 = lines[i + 2]?.trim() || '';
        const line4 = lines[i + 3]?.trim() || '';

        const combinations = [
            { cod: line1, produto: line2, unitPrice: line3 },
            { cod: line1, produto: line2 + ' ' + line3, unitPrice: line4 },
            { combined: line1 }
        ];

        for (const combo of combinations) {
            if (combo.combined) {
                const match = combo.combined.match(/^(\d{1,5})\s+(.+?)\s+(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)/);
                if (match) {
                    const [, cod, produto, vendPor, preco] = match;
                    if (this.tryAddProductToMap(cod, produto, vendPor, preco, foundProducts, 'line_combined')) {
                        extracted++;
                    }
                }
            } else {
                const codMatch = combo.cod.match(/^(\d{1,5})$/);
                const unitPriceMatch = combo.unitPrice.match(/^(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)/);
                
                if (codMatch && unitPriceMatch && combo.produto.length > 5) {
                    if (this.tryAddProductToMap(codMatch[1], combo.produto, unitPriceMatch[1], unitPriceMatch[2], foundProducts, 'line_multi')) {
                        extracted++;
                    }
                }
            }
        }

        if (i % 200 === 0) {
            await this.sleep(1);
            this.updateCatalogStatus(`Linha por linha: ${extracted} produtos | Linha ${i}/${lines.length}`);
        }
    }
}

// MÉTODO 3 CORRIGIDO: BLOCOS SEM DUPLICAÇÃO
async extractByBlocksFixed(foundProducts) {
    this.updateCatalogStatus('Parser por blocos...');
    
    const blockSize = 1000;
    const lines = this.pdfText.split(/[\n\r]+/);
    let extracted = 0;

    for (let i = 0; i < lines.length; i += blockSize) {
        const block = lines.slice(i, i + blockSize).join('\n');
        
        const blockPatterns = [
            /(\d{1,5})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^(]*\([^)]+\)[^(]*)\s+(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)/gi,
            /(\d{1,5})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^0-9]*\d+[^0-9]*[A-Z]*)\s+(LT|PCT|KG|CX|GL|BD|VD|FR|UN|BAG|BIS|PT|SC|FD|FDO|PÇ|BARR)\s*([\d,]+)/gi
        ];

        for (const pattern of blockPatterns) {
            pattern.lastIndex = 0;
            let match;
            
            while ((match = pattern.exec(block)) !== null) {
                const [, cod, produto, vendPor, preco] = match;
                if (this.tryAddProductToMap(cod, produto, vendPor, preco, foundProducts, 'block')) {
                    extracted++;
                }
            }
        }

        if (i % (blockSize * 5) === 0) {
            await this.sleep(2);
            this.updateCatalogStatus(`Blocos: ${extracted} produtos | Bloco ${i / blockSize}/${Math.ceil(lines.length / blockSize)}`);
        }
    }
}

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanProductNameAdvanced(produto) {
        if (!produto) return '';

        return produto
            .replace(/\s+/g, ' ')
            .replace(/\s*R\$.*$/, '')
            .replace(/^\s*\d+\s*/, '')
            .replace(/\s*\([^)]*\)\s*$/, '')
            .replace(/[^\w\s\(\)\-\.\/\&\%\+\u00C0-\u00FF]/g, ' ')
            .replace(/\s*\n\s*/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    isValidProductAdvanced(cod, produto, vendPor, preco) {
        const validUnits = ['LT', 'PCT', 'KG', 'CX', 'GL', 'BD', 'VD', 'FR', 'UN', 'BAG', 'BIS', 'PT', 'SC', 'FD', 'FDO', 'PÇ', 'BARR'];

        return cod && cod.length >= 1 && cod.length <= 5 &&
               produto && produto.length >= 3 && !produto.match(/^\s*$/) &&
               vendPor && validUnits.includes(vendPor.toUpperCase()) &&
               preco && /^\d+,\d{2}$/.test(this.formatPrice(preco));
    }

    formatPrice(price) {
        if (!price) return '0,00';

        let cleanPrice = String(price).replace(/[^\d,]/g, '');

        if (!cleanPrice.includes(',') && cleanPrice.length > 2) {
            const len = cleanPrice.length;
            cleanPrice = cleanPrice.slice(0, len - 2) + ',' + cleanPrice.slice(len - 2);
        }

        return cleanPrice || '0,00';
    }

    parsePrice(priceStr) {
        if (!priceStr) return 0;
        return parseFloat(priceStr.replace(',', '.'));
    }

    // CORREÇÃO 1: Modificar generateProductImagePath para retornar string por padrão
generateProductImagePath(codigo, size = 'large') {
    const paddedCode = codigo.toString().padStart(4, '0');
    const paths = {
        small: `./FOTOS DE PRODUTOS/${paddedCode}_small.webp`,
        medium: `./FOTOS DE PRODUTOS/${paddedCode}_medium.webp`,
        large: `./FOTOS DE PRODUTOS/${paddedCode}.webp`
    };
    
    // Se size for especificado, retorna apenas essa URL
    if (size && paths[size]) {
        return paths[size];
    }
    
    // Caso contrário, retorna o objeto completo
    return paths;
}

// CORREÇÃO 2: Adicionar função para obter URL da imagem com segurança
getProductImageUrl(codigo, size = 'large') {
    const paddedCode = codigo.toString().padStart(4, '0');
    
    switch (size) {
        case 'small':
            return `./FOTOS DE PRODUTOS/${paddedCode}_small.webp`;
        case 'medium':
            return `./FOTOS DE PRODUTOS/${paddedCode}_medium.webp`;
        case 'large':
        default:
            return `./FOTOS DE PRODUTOS/${paddedCode}.webp`;
    }
}

// CORREÇÃO 3: Modificar generateProductImageHTML para usar a nova função
generateProductImageHTML(codigo, nome) {
    const imageUrl = this.getProductImageUrl(codigo, 'medium');
    return `<img src="${imageUrl}" 
                 alt="${nome}" 
                 loading="lazy" 
                 onerror="window.catalogManager.handleImageError(this, '${codigo}')"
                 class="product-image-item">`;
}


    handleImageError(imgElement, codigo) {
        const paddedCode = codigo.toString().padStart(4, '0');

        if (imgElement.src.includes('.webp')) {
            imgElement.onerror = () => {
                imgElement.src = this.getPlaceholderImage(paddedCode);
                imgElement.onerror = null;
            };
            imgElement.src = `./FOTOS DE PRODUTOS/${paddedCode}.jpg`;
        } else {
            imgElement.src = this.getPlaceholderImage(paddedCode);
            imgElement.onerror = null;
        }
    }

    // Carregar produtos de exemplo
    loadMockProducts() {
        this.products = [
            {
                id: 1,
                code: '8474',
                name: 'ACÉM BOVINO RESFRIADO MATOSO 14 KG',
                price: 28.41,
                formattedPrice: 'R$ 28,41',
                description: 'Produto disponível para venda conforme disponibilidade de estoque',
                image: this.generateProductImagePath('8474'),
                category: 'Carnes',
                unit: 'KG'
            },
            {
                id: 2,
                code: '002',
                name: 'PRODUTO EXEMPLO 2',
                price: 49.90,
                formattedPrice: 'R$ 49,90',
                description: 'Outro produto de demonstração',
                image: this.generateProductImagePath('002'),
                category: 'Exemplo',
                unit: 'UN'
            },
            {
                id: 3,
                code: '003',
                name: 'PRODUTO EXEMPLO 3',
                price: 15.75,
                formattedPrice: 'R$ 15,75',
                description: 'Mais um produto de demonstração',
                image: this.generateProductImagePath('003'),
                category: 'Exemplo',
                unit: 'PCT'
            }
        ];

        this.filteredProducts = [...this.products];
        this.renderProductsGrid();
    }

    generateDescription(name) {
        return `${name} - Produto disponível para venda. Entre em contato para mais informações.`;
    }

    getPlaceholderImage(codigo, width = 300, height = 200) {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545'];
    const color = colors[codigo.length % colors.length];
    
    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" 
             viewBox="0 0 ${width} ${height}" 
             style="background:${color};">
            <text x="50%" y="50%" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  fill="white" 
                  font-size="16">
                ${codigo}
            </text>
        </svg>
    `;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
}


    categorizeProduct(name) {
        const categories = {
            'Temperos e Condimentos': ['aceto', 'vinagre', 'azeite', 'oleo', 'sal', 'pimenta', 'tempero', 'molho'],
            'Conservas': ['conserva', 'picles', 'azeitona', 'palmito'],
            'Doces e Sobremesas': ['doce', 'geleia', 'compota', 'mel', 'chocolate', 'açúcar'],
            'Bebidas': ['suco', 'refrigerante', 'agua', 'cerveja', 'vinho'],
            'Limpeza': ['detergente', 'sabao', 'desinfetante', 'amaciante'],
            'Carnes': ['carne', 'frango', 'boi', 'suino', 'bovino', 'aves', 'acém', 'matoso'],
            'Laticínios': ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao'],
            'Outros': []
        };

        const nameLower = name.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => nameLower.includes(keyword))) {
                return category;
            }
        }
        return 'Outros';
    }

    filterProducts(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredProducts = [...this.products];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredProducts = this.products.filter(product =>
                product.name.toLowerCase().includes(term) ||
                product.code.toLowerCase().includes(term) ||
                product.category.toLowerCase().includes(term)
            );
        }
        this.renderProductsGrid();
    }

    renderProductsGrid() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (this.filteredProducts.length === 0) {
            grid.innerHTML = '<div class="no-products">Nenhum produto encontrado</div>';
            return;
        }

        grid.innerHTML = '';
        this.filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy"
                         onerror="window.catalogManager.handleImageError(this, '${product.code}')">
                </div>
                <div class="product-info">
                    <div class="product-code">Código: ${product.code}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.formattedPrice}</div>
                    <div class="product-category">${product.category}</div>
                </div>
            `;

            productCard.addEventListener('click', () => {
                this.openProductModal(product);
            });

            grid.appendChild(productCard);

            const imgHTML = `
        <img src="${product.image}" 
             alt="${product.name}"
             class="product-image"
             loading="lazy"
             onerror="catalogManager.handleImageError(this, '${product.code}')">
    `;



        });
    }

    openProductModal(product) {
        this.currentProduct = product;
        const modal = document.getElementById('modal-produto');
        const details = document.getElementById('produto-details');

        details.innerHTML = `
            <div class="produto-image-container">
                <img class="produto-image" src="${product.image}" alt="${product.name}"
                     onerror="window.catalogManager.handleImageError(this, '${product.code}')">
            </div>
            <div class="produto-info">
                <h2>${product.name}</h2>
                <div class="produto-code"><strong>Código:</strong> ${product.code}</div>
                <div class="produto-price"><strong>Preço:</strong> ${product.formattedPrice}</div>
                <div class="produto-category"><strong>Categoria:</strong> ${product.category}</div>
                <div class="produto-description"><strong>Unidade:</strong> ${product.unit}</div>
                <div class="produto-description">${product.description}</div>
                
                <div class="produto-sales-info">
                    <p><strong>Como é vendido:</strong> Por ${product.unit}</p>
                    <p><strong>Disponibilidade:</strong> Consulte disponibilidade</p>
                </div>
            </div>
            <div class="produto-actions">
                <h3>Copiar Produto</h3>
                <div class="action-buttons-row">
                    <button id="enviar-texto-produto" class="text-btn">📝 Copiar Texto</button>
                    <button id="enviar-imagem-produto" class="image-btn">🖼️ Copiar como Imagem</button>
                </div>
            </div>
        `;

        const enviarTextoBtn = document.getElementById('enviar-texto-produto');
        const enviarImagemBtn = document.getElementById('enviar-imagem-produto');

        if (enviarTextoBtn) {
            enviarTextoBtn.addEventListener('click', () => {
                this.copyProductText(product);
            });
        }

        if (enviarImagemBtn) {
            enviarImagemBtn.addEventListener('click', () => {
                this.generateProductImage(product);
            });
        }

        modal.style.display = 'flex';
    }

    async copyProductText(product) {
        const productText = `🛒 **OFERTA ESPECIAL** 🛒

📦 **Produto:** ${product.name}
🏷️ **Código:** ${product.code}
💰 **Preço:** ${product.formattedPrice}
📏 **Unidade:** ${product.unit}
🏪 **Categoria:** ${product.category}

📞 Entre em contato para mais informações!



*Produto sujeito à disponibilidade de estoque.`;

        try {
            await navigator.clipboard.writeText(productText);
            alert('✅ Texto do produto copiado para a área de transferência!');
        } catch (error) {
            console.error('Erro ao copiar texto:', error);
            
            const textArea = document.createElement('textarea');
            textArea.value = productText;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('✅ Texto do produto copiado para a área de transferência!');
            } catch (fallbackError) {
                alert('❌ Erro ao copiar texto. Copie manualmente:\n\n' + productText);
            }
            document.body.removeChild(textArea);
        }
    }

    // GERAR IMAGEM VISUAL DO PRODUTO (com foto incluída)
async generateProductImage(product) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Dimensões do card aumentadas significativamente
        canvas.width = 1200; // Aumentado para melhor visibilidade
        canvas.height = 1000; // Aumentado para melhor visibilidade
        
        // Fundo do card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda do card com largura aumentada
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 10; // Borda mais espessa
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        // Área para a imagem do produto
        const imageArea = {
            x: 80,
            y: 80,
            width: 700, // Imagem muito maior
            height: 700 // Imagem muito maior
        };
        
        // Carregar e desenhar a imagem do produto
        try {
            const productImg = new Image();
            productImg.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                productImg.onload = () => {
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    ctx.strokeStyle = '#dee2e6';
                    ctx.lineWidth = 4; // Borda interna mais visível
                    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    
                    const imgAspect = productImg.width / productImg.height;
                    const areaAspect = imageArea.width / imageArea.height;
                    
                    let drawWidth, drawHeight, drawX, drawY;
                    
                    if (imgAspect > areaAspect) {
                        drawWidth = imageArea.width - 10;
                        drawHeight = drawWidth / imgAspect;
                        drawX = imageArea.x + 5;
                        drawY = imageArea.y + (imageArea.height - drawHeight) / 2;
                    } else {
                        drawHeight = imageArea.height - 10;
                        drawWidth = drawHeight * imgAspect;
                        drawX = imageArea.x + (imageArea.width - drawWidth) / 2;
                        drawY = imageArea.y + 5;
                    }
                    
                    ctx.drawImage(productImg, drawX, drawY, drawWidth, drawHeight);
                    resolve();
                };
                
                productImg.onerror = () => {
                    console.log('Erro ao carregar imagem, usando placeholder');
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    ctx.strokeStyle = '#dee2e6';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    ctx.fillStyle = '#6c757d';
                    ctx.font = '200px Arial'; // Texto muito maior
                    ctx.textAlign = 'center';
                    ctx.fillText('📦', imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 80);
                    ctx.fillStyle = '#495057';
                    ctx.font = '70px Arial'; // Texto muito maior
                    ctx.fillText(product.code, imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 200);
                    resolve();
                };
                
                productImg.src = product.image;
            });
        } catch (error) {
            console.log('Erro ao processar imagem:', error);
        }
        
        // Cabeçalho com nome do produto com quebras de linha
        const headerY = 800; // Ajustado para imagem maior
        ctx.fillStyle = '#007bff';
        ctx.fillRect(80, headerY, canvas.width - 160, 150); // Aumentado o tamanho do cabeçalho
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px Arial'; // Texto muito maior
        ctx.textAlign = 'center';
        const maxCharsPerLine = 20; // Limite de caracteres por linha
        const lines = [];
        let currentLine = '';
        product.name.split(' ').forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (testLine.length > maxCharsPerLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);
        const maxLines = 3; // Limite de linhas
        const displayedLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) displayedLines[maxLines - 1] += '...';
        displayedLines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, headerY + 60 + (index * 60));
        });
        
        // Preço em destaque
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 80px Arial'; // Texto muito maior
        ctx.textAlign = 'center';
        ctx.fillText(product.formattedPrice, canvas.width / 2, 920); // Ajustado para layout
        
        // Informações do produto
        ctx.fillStyle = '#333333';
        ctx.font = '40px Arial'; // Texto muito maior
        ctx.textAlign = 'left';
        const infoStartY = 960; // Ajustado para layout
        ctx.fillText(`🏷️ Código: ${product.code}`, 300, infoStartY);
        ctx.fillText(`📏 Unidade: ${product.unit}`, 300, infoStartY + 60);
        ctx.fillText(`🏪 Categoria: ${product.category}`, 300, infoStartY + 120);
        
        // Linha separadora
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(100, 980); // Ajustado para layout
        ctx.lineTo(canvas.width - 100, 980); // Ajustado para layout
        ctx.stroke();
        
        // Converter canvas para blob e copiar
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                alert('✅ Imagem do produto copiada para a área de transferência!');
            } catch (error) {
                console.error('Erro ao copiar imagem:', error);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `produto-${product.code}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('✅ Imagem baixada! Você pode compartilhar o arquivo baixado.');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        alert('❌ Erro ao gerar imagem. Tente usar a opção de texto.');
    }
}

// Geração de imagem visual com 4 produtos por linha, borda verde externa, imagens maiores, fundo branco
async generateImageOffersVisual() {
    if (!this.selectedProducts || this.selectedProducts.length === 0) {
        this.showNotification('Selecione pelo menos um produto para gerar ofertas visuais', 'warning');
        return;
    }

    this.updateCatalogStatus('Gerando imagem visual...');

    try {
        const productsPerRow = 4;
        const productWidth = 900; // Aumentado significativamente
        const productHeight = 1000; // Aumentado significativamente
        const padding = 40; // Aumentado para melhor espaçamento
        const logoSectionHeight = 200; // Aumentado ainda mais para logo maior

        const rows = Math.ceil(this.selectedProducts.length / productsPerRow);
        const canvasWidth = productsPerRow * (productWidth + padding) + padding;
        const canvasHeight = logoSectionHeight + (rows * (productHeight + padding)) + padding;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Fundo branco completo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda verde externa ao redor de toda a imagem com largura aumentada
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 50; // Borda muito mais espessa
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        // Logo centralizado no topo com tamanho ajustado
        await this.drawLogo(ctx, canvas.width, padding / 2, 800); // Aumentado para logo muito maior
        
        // Desenhar produtos em grade
        for (let i = 0; i < this.selectedProducts.length; i++) {
            const row = Math.floor(i / productsPerRow);
            const col = i % productsPerRow;
            const x = padding + col * (productWidth + padding);
            const y = logoSectionHeight + padding + row * (productHeight + padding);

            // Desenhar produto individual
            const product = this.selectedProducts[i];
            const imageArea = {
                x: x + 80,
                y: y + 80,
                width: 700, // Imagem muito maior
                height: 700 // Imagem muito maior
            };

            try {
                const productImg = new Image();
                productImg.crossOrigin = 'anonymous';
                
                await new Promise((resolve) => {
                    productImg.onload = () => {
                        const imgAspect = productImg.width / productImg.height;
                        let drawWidth, drawHeight, drawX, drawY;
                        
                        if (imgAspect > 1) {
                            drawWidth = imageArea.width - 10;
                            drawHeight = drawWidth / imgAspect;
                            drawX = imageArea.x + 5;
                            drawY = imageArea.y + (imageArea.height - drawHeight) / 2;
                        } else {
                            drawHeight = imageArea.height - 10;
                            drawWidth = drawHeight * imgAspect;
                            drawX = imageArea.x + (imageArea.width - drawWidth) / 2;
                            drawY = imageArea.y + 5;
                        }
                        
                        ctx.drawImage(productImg, drawX, drawY, drawWidth, drawHeight);
                        resolve();
                    };
                    
                    productImg.onerror = () => {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                        ctx.fillStyle = '#6c757d';
                        ctx.font = '200px Arial'; // Texto muito maior
                        ctx.textAlign = 'center';
                        ctx.fillText('📦', imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 80);
                        ctx.fillStyle = '#495057';
                        ctx.font = '70px Arial'; // Texto muito maior
                        ctx.fillText(product.code, imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 200);
                        resolve();
                    };
                    
                    productImg.src = product.image;
                });
            } catch (error) {
                console.log('Erro ao processar imagem:', error);
            }

            
            // Preço em destaque
            ctx.fillStyle = '#dc3545';
            ctx.font = 'bold 80px Arial'; // Texto muito maior
            ctx.textAlign = 'center';
            ctx.fillText(product.formattedPrice, x + productWidth / 2, y + 720); // Ajustado para layout

            // Unidade
            ctx.fillStyle = '#dc3545';
            ctx.font = '40px Arial'; // Texto muito maior
            ctx.textAlign = 'center';
            ctx.fillText(`(${product.unit})`, x + productWidth / 2, y + 780); // Ajustado para layout

            // Nome do produto com quebras de linha
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 50px Arial'; // Texto muito maior
            ctx.textAlign = 'center';
            const maxCharsPerLine = 20; // Limite de caracteres por linha
            const lines = [];
            let currentLine = '';
            product.name.split(' ').forEach(word => {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                if (testLine.length > maxCharsPerLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine) lines.push(currentLine);
            const maxLines = 3; // Limite de linhas
            const displayedLines = lines.slice(0, maxLines);
            if (lines.length > maxLines) displayedLines[maxLines - 1] += '...';
            displayedLines.forEach((line, index) => {
                ctx.fillText(line, x + productWidth / 2, y + 850 + (index * 60));
            });
            
        }
        
        // Copiar APENAS (sem download)
        await this.copyCanvasAsImage(canvas);
        
        this.updateCatalogStatus(`Imagem visual gerada com ${this.selectedProducts.length} produtos`);
        
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        this.showNotification('Erro ao gerar imagem visual', 'error');
        this.updateCatalogStatus('Erro ao gerar imagem visual');
    }
}


// Função auxiliar para desenhar logo
async drawLogo(ctx, canvasWidth, currentY) {
    try {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
            logo.onload = () => {
                const logoMaxWidth = 450;
                const logoMaxHeight = 350;
                const logoAspect = logo.width / logo.height;
                
                let logoWidth = logoMaxWidth;
                let logoHeight = logoMaxHeight;
                
                if (logoAspect > logoMaxWidth / logoMaxHeight) {
                    logoHeight = logoMaxWidth / logoAspect;
                } else {
                    logoWidth = logoMaxHeight * logoAspect;
                }
                
                const logoX = (canvasWidth - logoWidth) / 2;
                const logoY = currentY + 30;
                
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                resolve();
            };
            
            logo.onerror = () => {
                // Fallback: texto no lugar do logo
                ctx.fillStyle = '#007bff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🏪 OFERTAS ESPECIAIS', canvasWidth / 2, currentY + 40);
                resolve();
            };
            
            logo.src = './logo.png';
        });
    } catch (error) {
        console.error('Erro ao carregar logo:', error);
    }
}

// Função auxiliar para desenhar produto
async drawProduct(ctx, product, index, yPosition) {
    // Linha separadora entre produtos
    if (index > 0) {
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, yPosition - 5);
        ctx.lineTo(670, yPosition - 5);
        ctx.stroke();
    }
    
    // Área da imagem do produto
    const imgSize = 60;
    const imgX = 30;
    const imgY = yPosition + 12;
    
    // Desenhar imagem do produto
    await this.drawProductImage(ctx, product.image, imgX, imgY, imgSize);
    
    // Número do produto
    ctx.fillStyle = '#007bff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}.`, 110, yPosition + 25);
    
    // Nome do produto (limitado)
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 13px Arial';
    const productName = product.name.length > 40 ? product.name.substring(0, 37) + '...' : product.name;
    ctx.fillText(productName, 130, yPosition + 25);
    
    // Detalhes do produto
    ctx.fillStyle = '#666666';
    ctx.font = '11px Arial';
    ctx.fillText(`Cód: ${product.code}`, 130, yPosition + 45);
    ctx.fillText(`${product.unit}`, 230, yPosition + 45);
    ctx.fillText(`Disponível`, 280, yPosition + 45);
    
    // Preço em destaque
    ctx.fillStyle = '#28a745';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${product.formattedPrice}`, 665, yPosition + 35);
}

// Função auxiliar para desenhar imagem do produto
async drawProductImage(ctx, imageSrc, x, y, size) {
    try {
        const productImg = new Image();
        productImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
            productImg.onload = () => {
                // Fundo da imagem
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, size, size);
                
                // Borda da imagem
                ctx.strokeStyle = '#dee2e6';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, size, size);
                
                // Calcular dimensões mantendo proporção
                const imgAspect = productImg.width / productImg.height;
                let drawWidth = size - 4;
                let drawHeight = size - 4;
                let drawX = x + 2;
                let drawY = y + 2;
                
                if (imgAspect > 1) {
                    drawHeight = drawWidth / imgAspect;
                    drawY = y + (size - drawHeight) / 2;
                } else if (imgAspect < 1) {
                    drawWidth = drawHeight * imgAspect;
                    drawX = x + (size - drawWidth) / 2;
                }
                
                ctx.drawImage(productImg, drawX, drawY, drawWidth, drawHeight);
                resolve();
            };
            
            productImg.onerror = () => {
                // Placeholder
                this.drawPlaceholder(ctx, x, y, size);
                resolve();
            };
            
            productImg.src = imageSrc;
        });
    } catch (error) {
        this.drawPlaceholder(ctx, x, y, size);
    }
}

// Função auxiliar para desenhar rodapé SEM data
async drawFooter(ctx, canvas) {
    const footerY = canvas.height - 70;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(15, footerY, canvas.width - 30, 55);
    
    // Linha separadora do rodapé
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, footerY);
    ctx.lineTo(canvas.width - 30, footerY);
    ctx.stroke();
    
    ctx.fillStyle = '#007bff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📞 ENTRE EM CONTATO:', canvas.width / 2, footerY + 20);
    
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.fillText('PMG, a entrega nos move até você!', canvas.width / 2, footerY + 35);
    
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('⚠️ Produtos sujeitos à disponibilidade | 🚛 Entregamos em toda região', canvas.width / 2, footerY + 50);
}

// Função auxiliar para copiar canvas APENAS (sem download)
async copyCanvasAsImage(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                this.showNotification('Erro ao gerar imagem', 'error');
                reject(new Error('Falha ao gerar blob da imagem'));
                return;
            }

            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                this.showNotification('✅ Imagem copiada! Cole onde desejar (Ctrl+V)', 'success');
                
                
                
                resolve();
                
            } catch (clipboardError) {
                console.error('Erro ao copiar para área de transferência:', clipboardError);
                this.showNotification('❌ Não foi possível copiar. Verifique as permissões do navegador', 'error');
                reject(clipboardError);
            }
        }, 'image/png');

        alert('imagem criada com sucesso, cole onde desejar (Ctrl+V)');
        this.updateCatalogStatus('Imagem copiada para a área de transferência');
    });
}

// Função auxiliar corrigida para tentar adicionar produto no Map
tryAddProductToMap(cod, produto, vendPor, preco, foundProducts, method) {
    // Verificar se já existe no Map
    if (foundProducts.has(cod)) return false;

    const cleanProduto = this.cleanProductNameAdvanced(produto);
    const cleanPreco = this.formatPrice(preco);

    if (this.isValidProductAdvanced(cod, cleanProduto, vendPor, cleanPreco)) {
        // Adicionar no Map (garante unicidade absoluta)
        foundProducts.set(cod, {
            cod: cod.trim(),
            produto: cleanProduto.toUpperCase(),
            vendPor: vendPor.trim().toUpperCase(),
            preco: cleanPreco,
            method: method
        });
        return true;
    }
    return false;
}


    openProductSelectionModal() {
        this.selectedProducts = [];
        const modal = document.getElementById('modal-product-selection');
        
        const searchInput = document.getElementById('search-products-selection');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.renderProductSelectionList();
        this.updateSelectionCount();
        
        modal.style.display = 'flex';
    }

    renderProductSelectionList() {
        const list = document.getElementById('products-selection-list');
        if (!list) return;

        const searchTerm = document.getElementById('search-products-selection')?.value?.toLowerCase() || '';
        const productsToShow = searchTerm
            ? this.products.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.code.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            )
            : this.products;

        if (productsToShow.length === 0) {
            list.innerHTML = '<div class="no-products-selection">Nenhum produto encontrado</div>';
            return;
        }

        list.innerHTML = '';
        productsToShow.forEach(product => {
            const isSelected = this.selectedProducts.some(p => p.id === product.id);
            
            const productItem = document.createElement('div');
            productItem.className = 'product-selection-item';
            productItem.innerHTML = `
                <label class="product-selection-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           data-product-id="${product.id}">
                    <div class="product-selection-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy"
                             onerror="window.catalogManager.handleImageError(this, '${product.code}')">
                    </div>
                    <div class="product-selection-info">
                        <div class="product-selection-name">${product.name}</div>
                        <div class="product-selection-details">
                            <span class="product-selection-code">Cód: ${product.code}</span>
                            <span class="product-selection-price">${product.formattedPrice}</span>
                        </div>
                        <div class="product-selection-category">${product.category}</div>
                    </div>
                </label>
            `;

            const checkbox = productItem.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.selectedProducts.some(p => p.id === product.id)) {
                        this.selectedProducts.push(product);
                    }
                } else {
                    this.selectedProducts = this.selectedProducts.filter(p => p.id !== product.id);
                }
                this.updateSelectionCount();
            });

            list.appendChild(productItem);
        });
    }

    filterProductsInSelection(searchTerm) {
        this.renderProductSelectionList();
    }

    selectAllProducts(select) {
        const checkboxes = document.querySelectorAll('#products-selection-list input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const productId = parseInt(checkbox.getAttribute('data-product-id'));
            const product = this.products.find(p => p.id === productId);
            
            if (product) {
                checkbox.checked = select;
                
                if (select) {
                    if (!this.selectedProducts.some(p => p.id === product.id)) {
                        this.selectedProducts.push(product);
                    }
                } else {
                    this.selectedProducts = this.selectedProducts.filter(p => p.id !== product.id);
                }
            }
        });
        
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const countElement = document.getElementById('selected-count');
        const textBtn = document.getElementById('generate-text-offers');
        const imageBtn = document.getElementById('generate-image-offers');
        
        const count = this.selectedProducts.length;
        
        if (countElement) {
            countElement.textContent = `${count} produtos selecionados`;
        }
        
        if (textBtn) {
            textBtn.disabled = count === 0;
        }
        if (imageBtn) {
            imageBtn.disabled = count === 0;
        }
    }

    generateTextOffers() {
        if (this.selectedProducts.length === 0) {
            alert('❌ Selecione pelo menos um produto!');
            return;
        }

        const currentDate = new Date().toLocaleDateString('pt-BR');
        let offersText = `🛒 **JORNAL DE OFERTAS** 🛒
📅 ${currentDate}

`;

        this.selectedProducts.forEach((product, index) => {
            offersText += `${index + 1}. 📦 **${product.name}**
   🏷️ Código: ${product.code}
   💰 Preço: ${product.formattedPrice}
   📏 Unidade: ${product.unit}
   🏪 Categoria: ${product.category}

`;
        });

        offersText += `📞 **ENTRE EM CONTATO:**




⚠️ *Produtos sujeitos à disponibilidade de estoque.
💯 *Ofertas válidas por tempo limitado.

🚛 **Entregamos em toda a região!**
💳 **Aceitamos cartão, PIX e boleto!**`;

        this.showOffersTextModal(offersText);
    }

    // Mostrar modal com texto de ofertas
showOffersTextModal(text) {
    const modal = document.getElementById('modal-text-offers');
    const textarea = document.getElementById('offers-text');
    
    if (!modal) {
        console.error('❌ Modal de texto de ofertas não encontrado!');
        // Fallback: copiar diretamente para área de transferência
        this.copyTextDirectly(text);
        return;
    }
    
    if (textarea) {
        textarea.value = text;
        textarea.style.height = '400px';
        textarea.style.width = '100%';
    }
    
    modal.style.display = 'flex';
    console.log('✅ Modal de texto de ofertas aberto');
}

// Copiar texto para área de transferência
async copyTextToClipboard() {
    const textarea = document.getElementById('offers-text');
    if (!textarea) {
        console.error('❌ Textarea de ofertas não encontrado!');
        return;
    }

    try {
        await navigator.clipboard.writeText(textarea.value);
        alert('✅ Jornal de ofertas copiado para a área de transferência!');
        
        // Fechar modal após copiar
        document.getElementById('modal-text-offers').style.display = 'none';
        
    } catch (error) {
        console.error('Erro ao copiar texto:', error);
        
        // Fallback
        textarea.select();
        try {
            document.execCommand('copy');
            alert('✅ Jornal de ofertas copiado para a área de transferência!');
            document.getElementById('modal-text-offers').style.display = 'none';
        } catch (fallbackError) {
            alert('❌ Erro ao copiar texto. Selecione tudo e copie manualmente (Ctrl+C).');
        }
    }
}


// Função auxiliar para copiar texto diretamente (fallback)
async copyTextDirectly(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('✅ Jornal de ofertas copiado para a área de transferência!');
    } catch (error) {
        console.error('Erro ao copiar texto:', error);
        
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert('✅ Jornal de ofertas copiado para a área de transferência!');
        } catch (fallbackError) {
            alert('❌ Erro ao copiar texto. Aqui está o conteúdo:\n\n' + text);
        }
        
        document.body.removeChild(textArea);
    }
}


    // GERAR IMAGEM INDIVIDUAL - MESMO PADRÃO DOS MÚLTIPLOS PRODUTOS
async generateProductImage(product) {
    try {
        console.log('🔄 Gerando imagem individual para produto:', product.code);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Dimensões seguindo o padrão dos múltiplos (proporcionalmente menores)
        const logoSectionHeight = 100;
        const productHeight = 85; // Mesmo height dos múltiplos
        const footerHeight = 80;
        const padding = 20;
        
        canvas.width = 700; // MESMA largura dos múltiplos para consistência
        canvas.height = logoSectionHeight + productHeight + footerHeight + (padding * 2);
        
        // Fundo branco limpo (IGUAL aos múltiplos)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda sutil (IGUAL aos múltiplos)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        let currentY = padding;
        
        // LOGO (IGUAL aos múltiplos)
        await this.drawLogo(ctx, canvas.width, currentY);
        currentY += logoSectionHeight;
        
        // Área do produto com fundo cinza (IGUAL aos múltiplos)
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(15, currentY, canvas.width - 30, productHeight);
        
        // Desenhar produto usando EXATAMENTE o mesmo método dos múltiplos
        await this.drawSingleProductLikeMultiple(ctx, product, 0, currentY);
        
        currentY += productHeight;
        
        // Rodapé (IGUAL aos múltiplos)
        await this.drawFooter(ctx, canvas);
        
        // Copiar para área de transferência (IGUAL aos múltiplos)
        await this.copyCanvasAsImage(canvas);
        
        console.log('✅ Imagem individual gerada com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao gerar imagem individual:', error);
        this.showNotification('Erro ao gerar imagem do produto', 'error');
    }
    alert('imagem criada com sucesso, cole onde desejar (Ctrl+V)');
        this.updateCatalogStatus('Imagem copiada para a área de transferência');
}

// Função auxiliar para desenhar produto individual IGUAL aos múltiplos
async drawSingleProductLikeMultiple(ctx, product, index, yPosition) {
    // Área da imagem do produto (EXATAMENTE igual aos múltiplos)
    const imgSize = 60;
    const imgX = 30;
    const imgY = yPosition + 12;
    
    // Desenhar imagem do produto (MESMO método dos múltiplos)
    await this.drawProductImage(ctx, product.image, imgX, imgY, imgSize);
    
    // Número do produto (IGUAL aos múltiplos)
    ctx.fillStyle = '#007bff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`1.`, 110, yPosition + 25); // Sempre "1." para produto único
    
    // Nome do produto (IGUAL aos múltiplos)
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 13px Arial';
    const productName = product.name.length > 40 ? product.name.substring(0, 37) + '...' : product.name;
    ctx.fillText(productName, 130, yPosition + 25);
    
    // Detalhes do produto (IGUAL aos múltiplos)
    ctx.fillStyle = '#666666';
    ctx.font = '11px Arial';
    ctx.fillText(`Cód: ${product.code}`, 130, yPosition + 45);
    ctx.fillText(`${product.unit}`, 230, yPosition + 45);
    ctx.fillText(`Disponível`, 280, yPosition + 45);
    
    // Preço em destaque (IGUAL aos múltiplos)
    ctx.fillStyle = '#28a745';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${product.formattedPrice}`, 665, yPosition + 35);
}


// FUNÇÃO AUXILIAR PARA CARREGAR IMAGENS COM SEGURANÇA
async loadImageSafely(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const timeout = setTimeout(() => {
            console.warn('⏰ Timeout ao carregar imagem:', imageSrc);
            resolve(null);
        }, 5000);
        
        img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            console.warn('❌ Erro ao carregar imagem:', imageSrc);
            resolve(null);
        };
        
        img.src = imageSrc;
    });
}

// FUNÇÃO AUXILIAR PARA CALCULAR DIMENSÕES DA IMAGEM
calculateImageDimensions(img, area) {
    const imgAspect = img.width / img.height;
    const areaAspect = area.width / area.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > areaAspect) {
        drawWidth = area.width - 4;
        drawHeight = drawWidth / imgAspect;
        drawX = area.x + 2;
        drawY = area.y + (area.height - drawHeight) / 2;
    } else {
        drawHeight = area.height - 4;
        drawWidth = drawHeight * imgAspect;
        drawX = area.x + (area.width - drawWidth) / 2;
        drawY = area.y + 2;
    }
    
    return { drawX, drawY, drawWidth, drawHeight };
}

// FUNÇÃO AUXILIAR PARA COPIAR CANVAS
async copyCanvasToClipboard(canvas, productCode) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            try {
                // Verificar permissões
                const permission = await navigator.permissions.query({ name: 'clipboard-write' });
                if (permission.state === 'denied') {
                    throw new Error('Permissão de área de transferência negada');
                }
                
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                console.log('✅ Imagem copiada com sucesso');
                alert('✅ Imagem do produto copiada para a área de transferência!');
                resolve();
                
            } catch (clipboardError) {
                console.warn('⚠️ Erro ao copiar para clipboard, tentando download...', clipboardError);
                
                // Fallback: download da imagem
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `produto-${productCode}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert('✅ Não foi possível copiar, mas a imagem foi baixada!');
                resolve();
            }
        }, 'image/png');
    });
}


    // Atualizar status do catálogo
    updateCatalogStatus(message) {
        const statusElement = document.getElementById('catalog-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// Função para mostrar notificações
showNotification(message, type = 'info'); {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(notification);
    }

    const colors = {
        info: '#007bff',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';

    setTimeout(() => {
        if (notification) {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.display = 'none';
                }
            }, 300);
        }
    }, 4000);
}

// Placeholder para produtos sem imagem
drawPlaceholder(ctx, x, y, size); {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    
    ctx.fillStyle = '#6c757d';
    ctx.font = `${Math.floor(size/3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('📦', x + size/2, y + size/2 + 8);
}


// === INICIALIZAÇÃO SEGURA DO CATALOG MANAGER ===

// Função para inicializar com segurança
function initializeCatalogManager() {
    try {
        console.log('🔄 Tentando inicializar CatalogManager...');
        
        // Verificar se a classe existe
        if (typeof CatalogManager === 'undefined') {
            console.error('❌ Classe CatalogManager não encontrada!');
            return false;
        }
        
        // Criar instância se não existir
        if (!window.catalogManager) {
            console.log('📦 Criando nova instância do CatalogManager...');
            window.catalogManager = new CatalogManager();
        }
        
        // Verificar se o método init existe
        if (!window.catalogManager.init || typeof window.catalogManager.init !== 'function') {
            console.error('❌ Método init não encontrado no CatalogManager!');
            return false;
        }
        
        // Verificar se elementos essenciais existem no DOM
        const requiredElements = [
            'products-grid',
            'catalog-status',
            'product-search',
            'select-multiple-products'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.warn('⚠️ Elementos DOM não encontrados:', missingElements);
            console.log('⏳ Aguardando elementos serem carregados...');
            return false;
        }
        
        // Inicializar
        console.log('✅ Inicializando CatalogManager...');
        window.catalogManager.init();
        
        // Verificar se a inicialização foi bem-sucedida
        setTimeout(() => {
            if (window.catalogManager.products && Array.isArray(window.catalogManager.products)) {
                console.log('✅ CatalogManager inicializado com sucesso!');
            } else {
                console.log('⚠️ CatalogManager inicializado, mas sem produtos carregados ainda.');
            }
        }, 1000);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar CatalogManager:', error);
        return false;
    }
}

// Função para tentar inicialização com retry
function tryInitializeWithRetry(maxAttempts = 5, delay = 500) {
    let attempts = 0;
    
    function attempt() {
        attempts++;
        console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de inicialização...`);
        
        if (initializeCatalogManager()) {
            console.log('✅ Inicialização bem-sucedida!');
            return;
        }
        
        if (attempts < maxAttempts) {
            console.log(`⏳ Tentando novamente em ${delay}ms...`);
            setTimeout(attempt, delay);
        } else {
            console.error('❌ Falha na inicialização após todas as tentativas!');
            // Mostrar erro amigável para o usuário
            const statusElement = document.getElementById('catalog-status');
            if (statusElement) {
                statusElement.textContent = 'Erro ao carregar catálogo. Recarregue a página.';
                statusElement.style.color = '#dc3545';
            }
        }
    }
    
    attempt();
}

// Verificar se estamos no contexto do navegador
if (typeof window !== 'undefined') {
    console.log('🌐 Contexto do navegador detectado');
    
    // Garantir que CatalogManager esteja disponível globalmente
    if (typeof CatalogManager !== 'undefined') {
        window.CatalogManager = CatalogManager;
    }
    
    // Diferentes estratégias de inicialização baseadas no estado do documento
    if (document.readyState === 'loading') {
        console.log('📄 Documento ainda carregando, aguardando DOMContentLoaded...');
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM carregado, inicializando...');
            setTimeout(function() {
                tryInitializeWithRetry();
            }, 100);
        });
        
        // Fallback caso DOMContentLoaded não dispare
        setTimeout(function() {
            if (!window.catalogManager) {
                console.log('⚠️ Fallback: Tentando inicialização tardia...');
                tryInitializeWithRetry();
            }
        }, 3000);
        
    } else if (document.readyState === 'interactive') {
        console.log('📄 DOM interativo, aguardando carregamento completo...');
        
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                    tryInitializeWithRetry();
                }, 100);
            });
        }
        
        // Tentar imediatamente também
        setTimeout(function() {
            tryInitializeWithRetry();
        }, 100);
        
    } else {
        console.log('📄 Documento completamente carregado, inicializando imediatamente...');
        setTimeout(function() {
            tryInitializeWithRetry();
        }, 100);
    }
    
    // Event listener para mudanças na aba do catálogo
    document.addEventListener('click', function(e) {
        if (e.target && e.target.textContent === 'Catálogo') {
            console.log('📋 Aba Catálogo clicada');
            
            // Verificar se o catalog manager está funcionando
            setTimeout(function() {
                if (!window.catalogManager || !window.catalogManager.products) {
                    console.log('⚠️ CatalogManager não inicializado, tentando novamente...');
                    tryInitializeWithRetry(3, 1000);
                }
            }, 500);
        }
    });
    
    // Função global para debug
    window.debugCatalog = function() {
        console.log('🔍 Debug do Catálogo:');
        console.log('- window.catalogManager:', window.catalogManager);
        console.log('- Produtos carregados:', window.catalogManager?.products?.length || 0);
        console.log('- Status atual:', document.getElementById('catalog-status')?.textContent);
        
        // Tentar reinicializar
        if (window.catalogManager && window.catalogManager.init) {
            console.log('🔄 Tentando reinicializar...');
            window.catalogManager.init();
        }
    };
    
    // Tratamento global de erros para o catálogo
    window.addEventListener('error', function(event) {
        if (event.filename && event.filename.includes('catalog.js')) {
            console.error('❌ Erro no catalog.js:', event.error);
            
            // Tentar reinicializar em caso de erro
            setTimeout(function() {
                if (!window.catalogManager) {
                    console.log('🔄 Tentando recuperar após erro...');
                    tryInitializeWithRetry(2, 2000);
                }
            }, 1000);
        }
    });
    
    console.log('✅ Sistema de inicialização do catálogo configurado');
    
} else {
    console.log('⚠️ Não está em contexto de navegador - inicialização pulada');
}



// Exportar para uso em módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CatalogManager: CatalogManager, initializeCatalogManager: initializeCatalogManager };
}


