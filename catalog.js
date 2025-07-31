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
            // Primeiro, tentar carregar do cache
            const cachedCatalog = this.loadCatalogFromCache();
            
            if (cachedCatalog) {
                // Usar dados do cache
                this.products = cachedCatalog.products;
                this.extractedProducts = cachedCatalog.extractedProducts || [];
                this.pdfText = cachedCatalog.pdfText || '';
                this.filteredProducts = [...this.products];
                
                this.updateCatalogStatus(`Catálogo carregado do cache: ${cachedCatalog.fileName} (${cachedCatalog.products.length} produtos)`);
                this.renderProductsGrid();
                
                console.log(`✅ Catálogo personalizado carregado do cache: ${cachedCatalog.products.length} produtos`);
            } else {
                // Carregar catálogo padrão se não houver cache
                console.log('📂 Carregando catálogo padrão...');
                await this.loadPdfCatalog();
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

    // FUNÇÃO AUXILIAR PARA TENTAR ADICIONAR PRODUTO
    tryAddProductToMap(cod, produto, vendPor, preco, foundProducts, method) {
        // ✅ VERIFICAR SE JÁ EXISTE NO MAP
        if (foundProducts.has(cod)) return false;

        const cleanProduto = this.cleanProductNameAdvanced(produto);
        const cleanPreco = this.formatPrice(preco);

        if (this.isValidProductAdvanced(cod, cleanProduto, vendPor, cleanPreco)) {
            // ✅ ADICIONAR NO MAP (garante unicidade absoluta)
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
               producto && producto.length >= 3 && !produto.match(/^\s*$/) &&
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

    generateProductImagePath(codigo) {
        const paddedCode = codigo.toString().padStart(4, '0');
        return {
            small: `./FOTOS DE PRODUTOS/${paddedCode}_small.webp`,
            medium: `./FOTOS DE PRODUTOS/${paddedCode}_medium.webp`,
            large: `./FOTOS DE PRODUTOS/${paddedCode}.webp`
        };
    }

    generateProductImageHTML(codigo, nome) {
        const paths = this.generateProductImagePath(codigo);
        return `
            <picture>
                <source media="(max-width: 480px)" srcset="${paths.small}">
                <source media="(max-width: 768px)" srcset="${paths.medium}">
                <img src="${paths.large}" 
                     alt="${nome}" 
                     class="product-image"
                     loading="lazy"
                     onerror="catalogManager.handleImageError(this, '${codigo}')">
            </picture>
        `;
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
            console.log('🔄 Iniciando geração de imagem para produto:', product.code);
            
            // Verificar se o navegador suporta canvas
            const canvas = document.createElement('canvas');
            if (!canvas.getContext) {
                throw new Error('Canvas não suportado pelo navegador');
            }
            
            const ctx = canvas.getContext('2d');
            
            // Verificar suporte a ClipboardItem
            if (!window.ClipboardItem) {
                throw new Error('ClipboardItem não suportado. Use Chrome 76+, Firefox 87+ ou Safari 13.1+');
            }
            
            // Dimensões do card
            canvas.width = 400;
            canvas.height = 350;
            
            // Fundo do card
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Borda do card
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
            
            // Área para a imagem do produto
            const imageArea = { x: 20, y: 20, width: 120, height: 120 };
            
            // Fundo da área da imagem
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
            
            // Borda da área da imagem
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 1;
            ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
            
            // Tentar carregar a imagem do produto
            try {
                const productImg = await this.loadImageSafely(product.image);
                if (productImg) {
                    // Desenhar imagem mantendo proporção
                    const { drawX, drawY, drawWidth, drawHeight } = this.calculateImageDimensions(
                        productImg, imageArea
                    );
                    ctx.drawImage(productImg, drawX, drawY, drawWidth, drawHeight);
                    console.log('✅ Imagem do produto carregada com sucesso');
                } else {
                    throw new Error('Falha ao carregar imagem do produto');
                }
            } catch (imgError) {
                console.warn('⚠️ Usando placeholder para produto:', product.code, imgError.message);
                // Placeholder
                ctx.fillStyle = '#6c757d';
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📦', imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 10);
                
                ctx.fillStyle = '#495057';
                ctx.font = '12px Arial';
                ctx.fillText(product.code, imageArea.x + imageArea.width/2, imageArea.y + imageArea.height/2 + 30);
            }
            
            // Cabeçalho com nome do produto
            const headerY = 160;
            ctx.fillStyle = '#00ff62ff';
            ctx.fillRect(20, headerY, canvas.width - 40, 40);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            
            const productName = product.name.length > 35 ? product.name.substring(0, 32) + '...' : product.name;
            ctx.fillText(productName, canvas.width / 2, headerY + 25);
            
            // Preço em destaque
            ctx.fillStyle = '#28a745';
            ctx.font = 'bold 32px Arial';
            ctx.fillText(product.formattedPrice, canvas.width / 2, 240);
            
            // Informações do produto
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            
            const infoStartY = 265;
            ctx.fillText(`🏷️ Código: ${product.code}`, 160, infoStartY);
            ctx.fillText(`📏 Unidade: ${product.unit}`, 160, infoStartY + 20);
            ctx.fillText(`🏪 Categoria: ${product.category}`, 160, infoStartY + 40);
            
            // Linha separadora
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(30, 315);
            ctx.lineTo(canvas.width - 30, 315);
            ctx.stroke();
            
            // Rodapé
            ctx.fillStyle = '#666666';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            const currentDate = new Date().toLocaleDateString('pt-BR');
            ctx.fillText(` |  | ${currentDate}`, canvas.width / 2, 335);
            
            console.log('🎨 Canvas gerado com sucesso');
            
            // Converter e copiar com tratamento de erro
            await this.copyCanvasToClipboard(canvas, product.code);
            
        } catch (error) {
            console.error('❌ Erro ao gerar imagem:', error);
            
            // Mensagens de erro específicas para o usuário
            let userMessage = 'Erro ao gerar imagem: ';
            
            if (error.message.includes('ClipboardItem')) {
                userMessage += 'Seu navegador não suporta esta funcionalidade. Use Chrome, Firefox ou Safari mais recentes.';
            } else if (error.message.includes('Permission')) {
                userMessage += 'Permissão negada. Clique na página e tente novamente.';
            } else if (error.message.includes('Canvas')) {
                userMessage += 'Seu navegador não suporta canvas. Tente usar a opção de texto.';
            } else {
                userMessage += 'Use a opção de texto como alternativa.';
            }
            
            alert('❌ ' + userMessage);
        }
    }

    // GERAR IMAGEM VISUAL PARA MÚLTIPLOS PRODUTOS (com fotos e logo)
async generateImageOffersVisual() {
    if (this.selectedProducts.length === 0) {
        alert('❌ Selecione pelo menos um produto!');
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calcular altura baseado no número de produtos (header aumentado para acomodar logo e texto)
        const headerHeight = 120; // Aumentado de 100 para 120 para dar mais espaço
        const productHeight = 80;
        const footerHeight = 80;
        const padding = 20;
        
        canvas.width = 700;
        canvas.height = headerHeight + (this.selectedProducts.length * productHeight) + footerHeight + (padding * 2);
        
        // Fundo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Borda
        ctx.strokeStyle = '#099438ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Cabeçalho
        ctx.fillStyle = '#08a32fff';
        ctx.fillRect(10, 10, canvas.width - 20, headerHeight - 10);
        
        // Carregar e desenhar logo
        try {
            const logo = new Image();
            logo.crossOrigin = 'anonymous';
            
            await new Promise((resolve) => {
                logo.onload = () => {
                    const logoMaxWidth = 60;
                    const logoMaxHeight = 40;
                    const logoAspect = logo.width / logo.height;
                    
                    let logoWidth = logoMaxWidth;
                    let logoHeight = logoMaxHeight;
                    
                    if (logoAspect > logoMaxWidth / logoMaxHeight) {
                        logoHeight = logoMaxWidth / logoAspect;
                    } else {
                        logoWidth = logoMaxHeight * logoAspect;
                    }
                    
                    const logoX = (canvas.width - logoWidth) / 2;
                    const logoY = 15; // Mantém o logo na parte superior
                    
                    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                    resolve();
                };
                
                logo.onerror = () => {
                    console.log('Logo não encontrado, continuando sem logo');
                    resolve();
                };
                
                logo.src = './logo.png';
            });
        } catch (error) {
            console.error('Erro ao carregar logo:', error);
        }
        
        // Texto do cabeçalho (ajustado para abaixo do logo)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🛒 JORNAL DE OFERTAS 🛒', canvas.width / 2, 80); // Ajustado para 70 (abaixo do logo)
        
        const currentDate = new Date().toLocaleDateString('pt-BR');
        ctx.font = '14px Arial';
        ctx.fillText(`📅 ${currentDate}`, canvas.width / 2, 100); // Ajustado para 90 (abaixo do título)
        
        // Produtos com imagens
        let yPosition = headerHeight + padding;
        
        for (let index = 0; index < this.selectedProducts.length; index++) {
            const product = this.selectedProducts[index];
            
            // Linha separadora entre produtos
            if (index > 0) {
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(30, yPosition - 10);
                ctx.lineTo(canvas.width - 30, yPosition - 10);
                ctx.stroke();
            }
            
            // Área da imagem do produto
            const imgSize = 60;
            const imgX = 30;
            const imgY = yPosition + 10;
            
            // Carregar e desenhar imagem do produto
            try {
                const productImg = new Image();
                productImg.crossOrigin = 'anonymous';
                
                await new Promise((resolve) => {
                    productImg.onload = () => {
                        // Fundo da imagem
                        ctx.fillStyle = '#f8f9fa';
                        ctx.fillRect(imgX, imgY, imgSize, imgSize);
                        
                        // Borda da imagem
                        ctx.strokeStyle = '#dee2e6';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(imgX, imgY, imgSize, imgSize);
                        
                        // Desenhar imagem mantendo proporção
                        const imgAspect = productImg.width / productImg.height;
                        let drawSize = imgSize - 4;
                        let drawX = imgX + 2;
                        let drawY = imgY + 2;
                        
                        if (imgAspect !== 1) {
                            if (imgAspect > 1) {
                                drawSize = (imgSize - 4) / imgAspect;
                                drawY = imgY + (imgSize - drawSize) / 2;
                            } else {
                                drawSize = (imgSize - 4) * imgAspect;
                                drawX = imgX + (imgSize - drawSize) / 2;
                            }
                        }
                        
                        ctx.drawImage(productImg, drawX, drawY, drawSize, drawSize);
                        resolve();
                    };
                    
                    productImg.onerror = () => {
                        // Placeholder
                        ctx.fillStyle = '#f8f9fa';
                        ctx.fillRect(imgX, imgY, imgSize, imgSize);
                        
                        ctx.strokeStyle = '#dee2e6';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(imgX, imgY, imgSize, imgSize);
                        
                        ctx.fillStyle = '#6c757d';
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('📦', imgX + imgSize/2, imgY + imgSize/2 + 7);
                        
                        resolve();
                    };
                    
                    productImg.src = product.image;
                });
            } catch (error) {
                // Se der erro, desenhar placeholder simples
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(imgX, imgY, imgSize, imgSize);
                ctx.strokeStyle = '#dee2e6';
                ctx.lineWidth = 1;
                ctx.strokeRect(imgX, imgY, imgSize, imgSize);
                ctx.fillStyle = '#6c757d';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📦', imgX + imgSize/2, imgY + imgSize/2 + 7);
            }
            
            // Número do produto
            ctx.fillStyle = '#007bff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${index + 1}.`, 110, yPosition + 25);
            
            // Nome do produto (limitado)
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 14px Arial';
            const productName = product.name.length > 40 ? product.name.substring(0, 37) + '...' : product.name;
            ctx.fillText(productName, 130, yPosition + 25);
            
            // Detalhes do produto
            ctx.fillStyle = '#666666';
            ctx.font = '12px Arial';
            ctx.fillText(`🏷️ Cód: ${product.code}`, 130, yPosition + 45);
            ctx.fillText(`📏 ${product.unit}`, 250, yPosition + 45);
            ctx.fillText(`🏪 ${product.category}`, 320, yPosition + 45);
            
            // Preço em destaque
            ctx.fillStyle = '#28a745';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`💰 ${product.formattedPrice}`, canvas.width - 30, yPosition + 35);
            
            yPosition += productHeight;
        }
        
        // Rodapé
        const footerY = canvas.height - footerHeight;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(10, footerY, canvas.width - 20, footerHeight - 10);
        
        ctx.fillStyle = '#007bff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📞 ENTRE EM CONTATO:', canvas.width / 2, footerY + 20);
        
        ctx.fillStyle = '#333333';
        ctx.font = '12px Arial';
        ctx.fillText('', canvas.width / 2, footerY + 35);
        ctx.fillText('', canvas.width / 2, footerY + 50);
        
        ctx.font = '10px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText('⚠️ Produtos sujeitos à disponibilidade | 🚛 Entregamos em toda região', canvas.width / 2, footerY + 65);
        
        // Converter e copiar
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                alert('✅ Jornal de ofertas (imagem) copiado para a área de transferência!');
                document.getElementById('modal-product-selection').style.display = 'none';
            } catch (error) {
                console.error('Erro ao copiar imagem:', error);
                // Fallback: download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `jornal-ofertas-${currentDate.replace(/\//g, '-')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('✅ Jornal de ofertas baixado! Você pode compartilhar o arquivo baixado.');
                document.getElementById('modal-product-selection').style.display = 'none';
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        alert('❌ Erro ao gerar imagem. Tente usar a opção de texto.');
    }
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
   🏷️ Código Cod: ${product.code}
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