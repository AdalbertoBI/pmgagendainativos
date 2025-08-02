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
         this.imagesMap = {}; // <- Aqui você guarda o mapping
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
        const resp = await fetch('imagens.json');
        this.imagesMap = await resp.json();
        window.imageMap = this.imagesMap; // torna global, se desejar compatibilidade
        console.log('✅ imagens.json carregado:', Object.keys(this.imagesMap).length, 'itens');
    } catch (e) {
        this.imagesMap = {};
        window.imageMap = {};
        console.error('❌ Falha ao carregar imagens.json', e);
    }

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

    // Função 1: gerar caminhos para diferentes tamanhos de imagem (small, medium, large)
generateProductImagePath(codigo, size = 'large') {
    const codeStr = String(parseInt(codigo, 10)); // Sem padStart, o código é do próprio JSON
    // Checa se há imagem para o código
    if (!window.imageMap || !window.imageMap[codeStr]) {
        return this.getPlaceholderImage(codeStr);
    }
    // Não há suporte a _small/_medium.png via JSON! Só retorna a versão "large".
    if (size === 'large' || !size) {
        return window.imageMap[codeStr];
    }
    // Se seu JSON só contém uma versão, ignora small/medium
    return window.imageMap[codeStr];
}


// Função 2: Retorna a URL segura da imagem considerando o tamanho (default: large)
getProductImageUrl(codigo, size = 'large') {
    const codeStr = String(parseInt(codigo, 10));
    if (window.imageMap && window.imageMap[codeStr]) {
        return window.imageMap[codeStr];
    }
    // Se não existe, retorna placeholder
    return this.getPlaceholderImage(codeStr);
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


    // Função 3: Tratamento de erro ao carregar a imagem (fallback para .jpg ou placeholder)
handleImageError(imgElement, codigo) {
    const codeStr = String(parseInt(codigo, 10));
    imgElement.onerror = () => {
        imgElement.src = this.getPlaceholderImage(codeStr);
        imgElement.onerror = null;
    };
    // Não tenta troca para .jpg: no seu JSON só há um link exato.
    imgElement.src = this.getPlaceholderImage(codeStr);
}

    // Carregar produtos de exemplo
    loadMockProducts() {
        this.products = [
            {
                id: 1,
                code: '8474',
                name: 'Produto Exemplo 1',
                price: 28.41,
                formattedPrice: 'R$ 38,41',
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

    // GERAR IMAGEM INDIVIDUAL COM MESMO PADRÃO DOS MÚLTIPLOS PRODUTOS - CORRIGIDO
async generateProductImage(product) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // MESMAS DIMENSÕES DOS PRODUTOS MÚLTIPLOS (dimensões de um quadrante)
        canvas.width = 900; // Largura individual igual aos múltiplos
        canvas.height = 1000; // Altura individual igual aos múltiplos
        
        // Fundo branco completo (IGUAL AOS MÚLTIPLOS)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // MESMA ÁREA DE IMAGEM DOS MÚLTIPLOS PRODUTOS
        const imageArea = {
            x: 80,
            y: 80,
            width: 700, // Imagem muito maior (IGUAL AOS MÚLTIPLOS)
            height: 700 // Imagem muito maior (IGUAL AOS MÚLTIPLOS)
        };
        
        // Carregar e desenhar a imagem do produto (MÉTODO IDÊNTICO)
        try {
            const productImg = new Image();
            productImg.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                productImg.onload = () => {
                    ctx.fillStyle = '#ffffffff';
                    ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    ctx.strokeStyle = '#ffffffff';
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
                    ctx.strokeStyle = '#ffffffff';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
                    ctx.fillStyle = '#ffffffff';
                    ctx.font = '200px Arial'; // Texto muito maior
                    ctx.textAlign = 'center';
                    ctx.fillText('📦', imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 80);
                    ctx.fillStyle = '#ffffffff';
                    ctx.font = '70px Arial'; // Texto muito maior
                    ctx.fillText(product.code, imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 200);
                    resolve();
                };
                
                productImg.src = product.image;
            });
        } catch (error) {
            console.log('Erro ao processar imagem:', error);
        }
        
        // PREÇO EM DESTAQUE (POSIÇÃO E ESTILO IDÊNTICOS AOS MÚLTIPLOS)
        ctx.fillStyle = '#dc3545';
        ctx.font = 'bold 80px Arial'; // Texto muito maior (IGUAL AOS MÚLTIPLOS)
        ctx.textAlign = 'center';
        ctx.fillText(product.formattedPrice, canvas.width / 2, 720); // Posição igual aos múltiplos

        // UNIDADE (POSIÇÃO E ESTILO IDÊNTICOS AOS MÚLTIPLOS)
        ctx.fillStyle = '#dc3545';
        ctx.font = '40px Arial'; // Texto muito maior (IGUAL AOS MÚLTIPLOS)
        ctx.textAlign = 'center';
        ctx.fillText(`(${product.unit})`, canvas.width / 2, 780); // Posição igual aos múltiplos

        // NOME DO PRODUTO COM QUEBRAS DE LINHA (MÉTODO IDÊNTICO)
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 50px Arial'; // Texto muito maior (IGUAL AOS MÚLTIPLOS)
        ctx.textAlign = 'center';
        const maxCharsPerLine = 20; // Limite de caracteres por linha (IGUAL AOS MÚLTIPLOS)
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
        const maxLines = 3; // Limite de linhas (IGUAL AOS MÚLTIPLOS)
        const displayedLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) displayedLines[maxLines - 1] += '...';
        displayedLines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, 850 + (index * 60)); // Posições iguais aos múltiplos
        });
        
        // Converter canvas para blob e copiar (MÉTODO IDÊNTICO)
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
// Geração de imagem visual auto-ajustável para 3, 4 ou 5 produtos por linha
async generateImageOffersVisual() {
    if (!this.selectedProducts || this.selectedProducts.length === 0) {
        this.showNotification('Selecione pelo menos um produto para gerar ofertas visuais', 'warning');
        return;
    }

    this.updateCatalogStatus('Gerando imagem visual...');

    try {
        // ✅ NOVA LÓGICA AUTO-AJUSTÁVEL PARA PRODUTOS POR LINHA
        const productsPerRow = this.selectOptimalProductsPerRow(this.selectedProducts.length);
        
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
        await this.drawLogo(ctx, canvas.width, padding / 2, 1200); // Aumentado para logo muito maior
        
        // ✅ INFORMAÇÃO VISUAL DO LAYOUT ESCOLHIDO
        console.log(`📐 Layout escolhido: ${productsPerRow} produtos por linha para ${this.selectedProducts.length} produtos total`);
        
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
        
        this.updateCatalogStatus(`Imagem visual gerada com ${this.selectedProducts.length} produtos em layout ${productsPerRow}x${rows}`);
        
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        this.showNotification('Erro ao gerar imagem visual', 'error');
        this.updateCatalogStatus('Erro ao gerar imagem visual');
    }
}

// ✅ NOVA FUNÇÃO PARA ESCOLHER AUTOMATICAMENTE O MELHOR LAYOUT
selectOptimalProductsPerRow(numProducts) {
    // Priorizar layouts que resultam em múltiplos exatos
    if (numProducts % 4 === 0) {
        console.log(`📐 Layout otimizado: ${numProducts} produtos é múltiplo de 4 - usando 4 por linha`);
        return 4;
    } else if (numProducts % 3 === 0) {
        console.log(`📐 Layout otimizado: ${numProducts} produtos é múltiplo de 3 - usando 3 por linha`);
        return 3;
    } else if (numProducts % 5 === 0) {
        console.log(`📐 Layout otimizado: ${numProducts} produtos é múltiplo de 5 - usando 5 por linha`);
        return 5;
    } else {
        // Escolher o divisor que deixa o menor resto (layout mais equilibrado)
        const remainders = {
            4: numProducts % 4,
            3: numProducts % 3,
            5: numProducts % 5
        };
        
        const bestDivisor = Object.keys(remainders).reduce((a, b) => 
            remainders[a] < remainders[b] ? a : b
        );
        
        console.log(`📐 Layout adaptado: ${numProducts} produtos - melhor divisor é ${bestDivisor} (resto: ${remainders[bestDivisor]})`);
        return parseInt(bestDivisor);
    }
}


    // Função auxiliar para desenhar logo
async drawLogo(ctx, canvasWidth, currentY) {
    try {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
            logo.onload = () => {
                const logoMaxWidth = 650;
                const logoMaxHeight = 550;
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

// ✅ MÉTODO PARA COPIAR CANVAS (DENTRO DA CLASSE)
async copyCanvasAsImage(canvas) {
    try {
        // Verificar se o Clipboard API está disponível
        if (!navigator.clipboard || !navigator.clipboard.write) {
            throw new Error('Clipboard API não suportado neste navegador');
        }

        // Converter canvas para blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });

        if (!blob) {
            throw new Error('Erro ao gerar imagem do canvas');
        }

        // Criar item de clipboard
        const clipboardItem = new ClipboardItem({
            'image/png': blob
        });

        // Copiar para área de transferência
        await navigator.clipboard.write([clipboardItem]);

        // ✅ AGORA FUNCIONA CORRETAMENTE
        this.showNotification(
            'Imagem criada com sucesso! Cole onde desejar (Ctrl+V)', 
            'success', 
            4000
        );

        console.log('✅ Imagem copiada para área de transferência com sucesso');

    } catch (error) {
        console.error('❌ Erro ao copiar para área de transferência:', error);
        
        // ✅ FALLBACK: Tentar download se clipboard falhar
        try {
            const link = document.createElement('a');
            link.download = `ofertas-${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
            this.showNotification(
                'Não foi possível copiar. Imagem foi baixada automaticamente!', 
                'warning', 
                4000
            );
        } catch (downloadError) {
            this.showNotification(
                'Erro ao processar imagem. Tente novamente.', 
                'error', 
                4000
            );
        }
    }
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

// ✅ FUNÇÃO CORRIGIDA PARA COPIAR TEXTO PARA ÁREA DE TRANSFERÊNCIA
async copyTextToClipboard(text = '') {
    try {
        // ✅ OBTER TEXTO DO TEXTAREA DE OFERTAS
        if (!text) {
            const textarea = document.getElementById('offers-text');
            if (textarea) {
                text = textarea.value || textarea.textContent || textarea.innerHTML;
                console.log('📝 Texto obtido do textarea:', text.length, 'caracteres');
            }
        }

        // ✅ VERIFICAR SE HÁ TEXTO VÁLIDO
        if (!text || !text.trim()) {
            console.warn('⚠️ Nenhum texto encontrado para copiar');
            this.showNotification('Nenhum texto para copiar', 'warning');
            return false;
        }

        // ✅ COPIAR PARA ÁREA DE TRANSFERÊNCIA
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text.trim());
            console.log('✅ Texto copiado usando Clipboard API');
        } else {
            // ✅ FALLBACK PARA NAVEGADORES ANTIGOS
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = text.trim();
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);
            console.log('✅ Texto copiado usando execCommand');
        }

        // ✅ NOTIFICAÇÃO DE SUCESSO (APENAS UMA VEZ)
        this.showNotification(
            'Texto copiado com sucesso! Cole onde desejar (Ctrl+V)', 
            'success',
            3000
        );

        return true;

    } catch (error) {
        console.error('❌ Erro ao copiar texto:', error);
        this.showNotification('Erro ao copiar texto para área de transferência', 'error');
        return false;
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


    // Função auxiliar para desenhar produto individual IGUAL aos múltiplos
async drawSingleProductLikeMultiple(ctx, product, index, yPosition) {
    // Área da imagem do produto (EXATAMENTE igual aos múltiplos)
    const imgSize = 90;
    const imgX = 10;
    const imgY = yPosition + 4;
    
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
    const productName = product.name.length > 50 ? product.name.substring(0, 70) + '...' : product.name;
    ctx.fillText(productName, 130, yPosition + 25);
    
    // Detalhes do produto (IGUAL aos múltiplos)
    ctx.fillStyle = '#666666';
    ctx.font = '11px Arial';
    ctx.fillText(`Cód: ${product.code}`, 130, yPosition + 45);
    ctx.fillText(`${product.unit}`, 230, yPosition + 45);
    ctx.fillText(`Disponível`, 280, yPosition + 45);
    
    // Preço em destaque (IGUAL aos múltiplos)
    ctx.fillStyle = '#e00f0fff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${product.formattedPrice}`, 200, yPosition + 80);
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
// ✅ IMPLEMENTAR A FUNÇÃO showNotification DENTRO DA CLASSE
showNotification(message, type = 'info', duration = 3000) {
    // Remover notificações anteriores
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    
    // Definir cores baseadas no tipo
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };

    const color = colors[type] || colors.info;

    // Estilizar notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${color.bg};
        border: 1px solid ${color.border};
        color: ${color.text};
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease-out;
    `;

    // Adicionar ícone baseado no tipo
    const icons = {
        success: '✅',
        error: '❌', 
        warning: '⚠️',
        info: 'ℹ️'
    };

    notification.innerHTML = `
        <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
        ${message}
    `;

    // Adicionar animação CSS se não existir
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Auto-remover após o tempo especificado
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);

    // Permitir clique para fechar
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    });
}

updateCatalogStatus(message, type = 'info') {
    const statusElement = document.getElementById('catalog-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
    
    console.log(`📊 Status: ${message}`);
    
    // ✅ NÃO MOSTRAR NOTIFICAÇÃO AUTOMÁTICA AQUI
    
}



    // Atualizar status do catálogo
    updateCatalogStatus(message) {
        const statusElement = document.getElementById('catalog-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}



// Placeholder para produtos sem imagem
function drawPlaceholder(ctx, x, y, size) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    
    ctx.fillStyle = '#ffffffff';
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
    
    // Listener para mudanças de visibilidade da página
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && window.catalogManager) {
            // Página voltou a ser visível, verificar se catálogo ainda está funcionando
            setTimeout(function() {
                if (window.catalogManager && !window.catalogManager.products?.length) {
                    console.log('⚠️ Catálogo perdido após mudança de visibilidade, recarregando...');
                    window.catalogManager.init();
                }
            }, 500);
        }
    });
    
    // Função para forçar reinicialização do catálogo
    window.forceCatalogReload = function() {
        console.log('🔄 Forçando reinicialização do catálogo...');
        if (window.catalogManager) {
            window.catalogManager.clearCatalogCache();
            window.catalogManager.init();
        } else {
            tryInitializeWithRetry(3, 500);
        }
    };
    
    // Verificação periódica de saúde do catálogo
    setInterval(function() {
        if (window.catalogManager && typeof window.catalogManager.products === 'undefined') {
            console.warn('⚠️ Produtos não definidos, tentando reinicializar...');
            tryInitializeWithRetry(1, 1000);
        }
    }, 30000); // Verificar a cada 30 segundos
    
    console.log('✅ Sistema de inicialização do catálogo configurado com verificações avançadas');
    
} else {
    console.log('⚠️ Não está em contexto de navegador - inicialização pulada');
}

// Exportar para uso em módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        CatalogManager: CatalogManager, 
        initializeCatalogManager: initializeCatalogManager,
        tryInitializeWithRetry: tryInitializeWithRetry
    };
}

// Polyfill para ClipboardItem em navegadores mais antigos
if (typeof window !== 'undefined' && !window.ClipboardItem) {
    console.log('⚠️ ClipboardItem não disponível, usando polyfill básico');
    window.ClipboardItem = class ClipboardItem {
        constructor(data) {
            this.data = data;
        }
    };
}

// Função global de utilidade para mostrar notificações
window.showCatalogNotification = function(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
    
    let notification = document.getElementById('catalog-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'catalog-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transition: all 0.3s ease;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;
        document.body.appendChild(notification);
    }

    const colors = {
        info: '#17a2b8',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';

    // Auto-hide após 5 segundos
    setTimeout(() => {
        if (notification) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.style.display = 'none';
                }
            }, 300);
        }
    }, 5000);
};

// Função global para placeholder de produtos sem imagem
window.createPlaceholder = function(codigo, width = 300, height = 200) {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
    const color = colors[codigo.toString().length % colors.length];
    
    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" 
             viewBox="0 0 ${width} ${height}" 
             style="background:${color};">
            <rect width="100%" height="100%" fill="${color}"/>
            <text x="50%" y="40%" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  fill="white" 
                  font-size="24" 
                  font-weight="bold">
                📦
            </text>
            <text x="50%" y="60%" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  fill="white" 
                  font-size="16" 
                  font-weight="bold">
                ${codigo}
            </text>
        </svg>
    `;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
};

// Função global para verificar se uma imagem existe
window.checkImageExists = function(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        
        // Timeout após 5 segundos
        setTimeout(() => resolve(false), 5000);
    });
};

// Listener para capturar erros de imagem globalmente
document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG' && e.target.src) {
        console.warn('⚠️ Erro ao carregar imagem:', e.target.src);
        
        // Se a imagem tem um código de produto, usar placeholder
        const productCode = e.target.getAttribute('data-product-code');
        if (productCode) {
            e.target.src = window.createPlaceholder(productCode);
        }
    }
}, true);

// Função de utilitário para formatação de preços
window.formatPrice = function(price) {
    if (typeof price === 'number') {
        return price.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    if (typeof price === 'string') {
        // Se já está formatado como "R$ X,XX"
        if (price.includes('R$')) {
            return price;
        }
        
        // Se está no formato "X,XX"
        const numericValue = parseFloat(price.replace(',', '.'));
        if (!isNaN(numericValue)) {
            return numericValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'  
            });
        }
    }
    
    return 'R$ 0,00';
};

// Função de utilitário para debounce
window.debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Função global para salvar logs do catálogo
window.saveCatalogLogs = function() {
    const logs = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        catalogManager: !!window.catalogManager,
        productsCount: window.catalogManager?.products?.length || 0,
        cacheStatus: localStorage.getItem('hasCustomCatalog') === 'true',
        errors: window.catalogErrors || []
    };
    
    console.log('📊 Logs do Catálogo:', logs);
    
    // Tentar copiar para clipboard para debug
    try {
        navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
        console.log('✅ Logs copiados para área de transferência');
    } catch (error) {
        console.log('⚠️ Não foi possível copiar logs automaticamente');
    }
    
    return logs;
};

// Array global para capturar erros do catálogo
window.catalogErrors = [];

// Capturar erros específicos do catálogo
window.addEventListener('error', function(event) {
    if (event.filename && (event.filename.includes('catalog') || event.message.includes('catalog'))) {
        window.catalogErrors.push({
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            timestamp: new Date().toISOString()
        });
        
        // Manter apenas os últimos 10 erros
        if (window.catalogErrors.length > 10) {
            window.catalogErrors = window.catalogErrors.slice(-10);
        }
    }
});

console.log('🎯 Sistema de catálogo completamente inicializado e pronto para uso!');
console.log('💡 Comandos disponíveis:');
console.log('  - window.debugCatalog() - Debug completo');
console.log('  - window.forceCatalogReload() - Forçar recarga');
console.log('  - window.saveCatalogLogs() - Salvar logs');
console.log('  - window.showCatalogNotification(msg, type) - Mostrar notificação');
