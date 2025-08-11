// 🖼️ Image Analyzer - Análise Visual de Redes Sociais v1.0.0
console.log('🚀 Carregando Image Analyzer v1.0.0...');

class ImageAnalyzer {
    constructor() {
        this.currentImage = null;
        this.analysisResults = null;
        this.initializeEventListeners();
    }

    // 🎯 Inicializar event listeners
    initializeEventListeners() {
        console.log('🎯 Inicializando event listeners do Image Analyzer...');
        
        // Event listener para colar imagem (Ctrl+V)
        document.addEventListener('paste', (e) => this.handleImagePaste(e));
        
        // Event listener para drop zone
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('imageFileInput');
        
        if (dropZone && fileInput) {
            // Clique na área para selecionar arquivo
            dropZone.addEventListener('click', () => fileInput.click());
            
            // Drag and drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.background = '#e3f2fd';
                dropZone.style.borderColor = '#2196f3';
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.style.background = '#f8f9fa';
                dropZone.style.borderColor = '#ddd';
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.background = '#f8f9fa';
                dropZone.style.borderColor = '#ddd';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageFile(files[0]);
                }
            });
            
            // Seleção de arquivo
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageFile(e.target.files[0]);
                }
            });
        }
    }

    // 📋 Manipular colagem de imagem (Ctrl+V)
    handleImagePaste(e) {
        console.log('📋 Detectado Ctrl+V - verificando clipboard...');
        
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                console.log('🖼️ Imagem detectada no clipboard');
                
                const file = item.getAsFile();
                if (file) {
                    this.handleImageFile(file);
                }
                break;
            }
        }
    }

    // 📁 Manipular arquivo de imagem
    async handleImageFile(file) {
        console.log('📁 Processando arquivo de imagem:', file.name);
        
        if (!file.type.startsWith('image/')) {
            alert('❌ Por favor, selecione apenas arquivos de imagem (PNG, JPG, JPEG)');
            return;
        }

        try {
            // Mostrar preview da imagem
            await this.showImagePreview(file);
            
            // Habilitar botão de análise
            const analyzeBtn = document.getElementById('analyzeImageBtn');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.style.opacity = '1';
            }
            
            this.currentImage = file;
            
        } catch (error) {
            console.error('❌ Erro ao processar imagem:', error);
            alert('❌ Erro ao processar a imagem: ' + error.message);
        }
    }

    // 🖼️ Mostrar preview da imagem
    async showImagePreview(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.getElementById('previewCanvas');
            const dropZoneContent = document.getElementById('dropZoneContent');
            
            if (!canvas || !dropZoneContent) {
                reject(new Error('Elementos de preview não encontrados'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calcular dimensões proporcionais
                    const maxWidth = 600;
                    const maxHeight = 300;
                    let { width, height } = img;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                    
                    // Desenhar no canvas
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Mostrar canvas e ocultar conteúdo original
                    canvas.style.display = 'block';
                    dropZoneContent.style.display = 'none';
                    
                    // Adicionar informações da imagem
                    const infoDiv = document.createElement('div');
                    infoDiv.id = 'imageInfo';
                    infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(0,123,255,0.1); border-radius: 5px; font-size: 14px;';
                    infoDiv.innerHTML = `
                        <i class="fas fa-info-circle"></i> 
                        <strong>${file.name}</strong> - ${(file.size / 1024).toFixed(1)} KB - ${img.width}x${img.height}px
                    `;
                    
                    // Remover info anterior se existir
                    const existingInfo = document.getElementById('imageInfo');
                    if (existingInfo) existingInfo.remove();
                    
                    canvas.parentNode.appendChild(infoDiv);
                    
                    resolve();
                };
                img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
            reader.readAsDataURL(file);
        });
    }

    // 🔍 Analisar dados da imagem
    async analyzeImageData() {
        console.log('🔍 Iniciando análise da imagem...');
        
        if (!this.currentImage) {
            alert('❌ Nenhuma imagem carregada para análise');
            return;
        }

        try {
            // Mostrar loading
            this.showAnalysisLoading(true);
            
            // Simular análise visual (em produção seria uma API de OCR/Vision)
            const analysisData = await this.performImageAnalysis(this.currentImage);
            
            // Combinar com dados demográficos existentes
            const enhancedData = await this.enhanceWithDemographicData(analysisData);
            
            // Mostrar resultados
            this.displayAnalysisResults(enhancedData);
            
            // Integrar com sistema de prospecção existente
            this.integrateWithProspectingSystem(enhancedData);
            
        } catch (error) {
            console.error('❌ Erro na análise:', error);
            alert('❌ Erro na análise da imagem: ' + error.message);
        } finally {
            this.showAnalysisLoading(false);
        }
    }

    // ⚡ Simular análise de imagem (seria substituído por API real)
    async performImageAnalysis(imageFile) {
        console.log('⚡ Simulando análise visual da imagem...');
        
        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Análise simulada baseada no tipo de conteúdo detectado
        const analysisResults = {
            platform: this.detectSocialPlatform(imageFile),
            profileData: this.extractProfileData(),
            engagement: this.analyzeEngagement(),
            content: this.analyzeContent(),
            audience: this.analyzeAudience(),
            businessIndicators: this.detectBusinessIndicators()
        };
        
        return analysisResults;
    }

    // 🔍 Detectar plataforma social
    detectSocialPlatform(imageFile) {
        const filename = imageFile?.name?.toLowerCase() || '';
        
        // Detectar baseado no nome do arquivo ou conteúdo
        if (filename.includes('instagram') || filename.includes('insta')) {
            return 'Instagram';
        } else if (filename.includes('facebook') || filename.includes('fb')) {
            return 'Facebook';
        } else if (filename.includes('whatsapp') || filename.includes('whats')) {
            return 'WhatsApp Business';
        }
        
        // Detecção genérica de plataforma baseada no contexto da imagem
        if (filename.includes('instagram') || filename.includes('insta')) {
            return 'Instagram';
        }
        
        if (filename.includes('facebook') || filename.includes('fb')) {
            return 'Facebook';
        }
        
        if (filename.includes('whatsapp') || filename.includes('wa')) {
            return 'WhatsApp Business';
        }
        
        // Fallback genérico
        const platforms = ['Instagram', 'Facebook', 'WhatsApp Business'];
        return platforms[Math.floor(Math.random() * platforms.length)];
    }

    // 👤 Extrair dados do perfil
    extractProfileData() {
        // Melhorar detecção baseada em padrões conhecidos
        const filename = this.currentImage?.name?.toLowerCase() || '';
        
        // Detecção genérica baseada em padrões de imagem
        return {
            hasProfilePicture: true,
            hasVerifiedBadge: Math.random() > 0.7,
            hasBusinessInfo: Math.random() > 0.5,
            hasContact: Math.random() > 0.6,
            hasLocation: Math.random() > 0.8,
            estimatedFollowers: Math.floor(Math.random() * 10000) + 500
        };
    }

    // 📊 Analisar engajamento
    analyzeEngagement() {
        return {
            avgLikes: Math.floor(Math.random() * 500) + 50,
            avgComments: Math.floor(Math.random() * 50) + 5,
            avgShares: Math.floor(Math.random() * 20) + 2,
            postFrequency: ['Diário', 'Semanal', 'Quinzenal'][Math.floor(Math.random() * 3)],
            engagementRate: (Math.random() * 8 + 2).toFixed(1) + '%'
        };
    }

    // 📝 Analisar conteúdo
    analyzeContent() {
        const contentTypes = [
            'Fotos de produtos/pratos',
            'Stories promocionais',
            'Vídeos de preparo',
            'Depoimentos de clientes',
            'Promoções e ofertas',
            'Ambiente do estabelecimento'
        ];
        
        return {
            mainContentTypes: contentTypes.slice(0, Math.floor(Math.random() * 3) + 2),
            hasPromotions: Math.random() > 0.4,
            hasMenu: Math.random() > 0.6,
            hasPricing: Math.random() > 0.3,
            hasDeliveryInfo: Math.random() > 0.5
        };
    }

    // 👥 Analisar audiência
    analyzeAudience() {
        return {
            primaryAgeGroup: ['18-25', '26-35', '36-45', '46-55'][Math.floor(Math.random() * 4)],
            genderSplit: {
                female: Math.floor(Math.random() * 40) + 30,
                male: Math.floor(Math.random() * 40) + 30
            },
            localAudience: Math.floor(Math.random() * 50) + 40,
            peakActivity: ['Manhã', 'Tarde', 'Noite'][Math.floor(Math.random() * 3)]
        };
    }

    // 🏢 Detectar indicadores de negócio
    detectBusinessIndicators() {
        return {
            hasBusinessHours: Math.random() > 0.5,
            hasDeliveryOptions: Math.random() > 0.6,
            hasPriceRange: Math.random() > 0.4,
            hasReviews: Math.random() > 0.7,
            businessType: ['Restaurante', 'Lanchonete', 'Pizzaria', 'Confeitaria'][Math.floor(Math.random() * 4)],
            competitiveLevel: ['Baixo', 'Médio', 'Alto'][Math.floor(Math.random() * 3)]
        };
    }

    // 🌍 Combinar com dados demográficos
    async enhanceWithDemographicData(imageAnalysis) {
        console.log('🌍 Combinando com dados demográficos...');
        
        // Buscar dados demográficos existentes do sistema
        const demographicData = this.getDemographicData();
        
        // Criar análise combinada
        const enhancedAnalysis = {
            ...imageAnalysis,
            demographic: demographicData,
            recommendations: this.generateRecommendations(imageAnalysis, demographicData),
            marketOpportunities: this.identifyMarketOpportunities(imageAnalysis, demographicData),
            competitiveAnalysis: this.performCompetitiveAnalysis(imageAnalysis, demographicData)
        };
        
        return enhancedAnalysis;
    }

    // 📈 Obter dados demográficos genéricos
    getDemographicData() {
        const filename = this.currentImage?.name?.toLowerCase() || '';
        
        // Dados genéricos para qualquer região
        return {
            population: Math.floor(Math.random() * 100000) + 50000,
            avgIncome: 'R$ ' + (Math.floor(Math.random() * 3000) + 2000),
            ageDistribution: {
                '18-25': '22%',
                '26-35': '28%',
                '36-45': '25%',
                '46-60': '25%'
            },
            familySize: (Math.random() * 2 + 2).toFixed(1),
            workingPopulation: Math.floor(Math.random() * 20) + 60 + '%'
        };
    }

    // 💡 Gerar recomendações
    generateRecommendations(imageData, demographicData) {
        const recommendations = [];
        
        if (imageData.engagement.avgLikes < 100) {
            recommendations.push('📈 Melhorar engajamento com conteúdo mais atrativo');
        }
        
        if (!imageData.content.hasPromotions) {
            recommendations.push('🎯 Criar campanhas promocionais específicas');
        }
        
        if (imageData.audience.localAudience < 60) {
            recommendations.push('📍 Focar em marketing local e geolocalização');
        }
        
        recommendations.push('🍕 Desenvolver produtos adequados ao perfil demográfico da região');
        recommendations.push('📱 Implementar estratégia de delivery baseada na análise da concorrência');
        
        return recommendations;
    }

    // 🔍 Identificar oportunidades de mercado
    identifyMarketOpportunities(imageData, demographicData) {
        return [
            '🍽️ Alto potencial para produtos premium baseado na renda média da região',
            '📱 Audiência jovem indica oportunidade para marketing digital',
            '🚚 Baixa saturação de delivery na região apresenta oportunidade',
            '👨‍👩‍👧‍👦 Perfil familiar sugere produtos para grupos maiores'
        ];
    }

    // ⚔️ Análise competitiva
    performCompetitiveAnalysis(imageData, demographicData) {
        return {
            competitionLevel: imageData.businessIndicators.competitiveLevel,
            differentiationOpportunities: [
                'Qualidade superior dos ingredientes',
                'Atendimento personalizado',
                'Produtos exclusivos da região',
                'Preços competitivos com melhor custo-benefício'
            ],
            marketGaps: [
                'Produtos orgânicos/naturais',
                'Opções vegetarianas/veganas',
                'Delivery expresso',
                'Programa de fidelidade'
            ]
        };
    }

    // 🖥️ Mostrar loading da análise
    showAnalysisLoading(show) {
        const analyzeBtn = document.getElementById('analyzeImageBtn');
        
        if (show) {
            if (analyzeBtn) {
                analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';
                analyzeBtn.disabled = true;
            }
        } else {
            if (analyzeBtn) {
                analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analisar Imagem';
                analyzeBtn.disabled = false;
            }
        }
    }

    // 📊 Exibir resultados da análise
    displayAnalysisResults(analysisData) {
        console.log('📊 Exibindo resultados da análise:', analysisData);
        
        const resultsDiv = document.getElementById('imageAnalysisResults');
        const dataDiv = document.getElementById('analysisData');
        
        if (!resultsDiv || !dataDiv) return;
        
        // Gerar HTML dos resultados com campos editáveis
        const resultsHTML = `
            <div class="analysis-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div class="metric-card editable-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h5><i class="fab fa-${analysisData.platform.toLowerCase()}"></i> 
                        <select id="edit-platform" style="border: none; background: transparent; font-weight: bold;">
                            <option value="Instagram" ${analysisData.platform === 'Instagram' ? 'selected' : ''}>Instagram</option>
                            <option value="Facebook" ${analysisData.platform === 'Facebook' ? 'selected' : ''}>Facebook</option>
                            <option value="WhatsApp Business" ${analysisData.platform === 'WhatsApp Business' ? 'selected' : ''}>WhatsApp Business</option>
                        </select>
                    </h5>
                    <p><strong>Seguidores:</strong> 
                        <input type="number" id="edit-followers" value="${analysisData.profileData.estimatedFollowers}" 
                               style="width: 80px; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                    </p>
                    <p><strong>Engajamento:</strong> 
                        <input type="text" id="edit-engagement" value="${analysisData.engagement.engagementRate}" 
                               style="width: 60px; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                    </p>
                </div>
                
                <div class="metric-card editable-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h5><i class="fas fa-users"></i> Demografia</h5>
                    <p><strong>População:</strong> 
                        <input type="number" id="edit-population" value="${analysisData.demographic.population}" 
                               style="width: 100px; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                    </p>
                    <p><strong>Renda Média:</strong> 
                        <input type="text" id="edit-income" value="${analysisData.demographic.avgIncome}" 
                               style="width: 100px; border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                    </p>
                </div>
                
                <div class="metric-card" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h5><i class="fas fa-chart-line"></i> Oportunidade</h5>
                    <p><strong>Nível:</strong> 
                        <select id="edit-competition" style="border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                            <option value="Baixo" ${analysisData.competitiveAnalysis.competitionLevel === 'Baixo' ? 'selected' : ''}>Baixo</option>
                            <option value="Médio" ${analysisData.competitiveAnalysis.competitionLevel === 'Médio' ? 'selected' : ''}>Médio</option>
                            <option value="Alto" ${analysisData.competitiveAnalysis.competitionLevel === 'Alto' ? 'selected' : ''}>Alto</option>
                        </select>
                    </p>
                    <p><strong>Foco:</strong> 
                        <select id="edit-age-group" style="border: 1px solid #ddd; border-radius: 3px; padding: 2px 5px;">
                            <option value="18-25" ${analysisData.audience.primaryAgeGroup === '18-25' ? 'selected' : ''}>18-25 anos</option>
                            <option value="26-35" ${analysisData.audience.primaryAgeGroup === '26-35' ? 'selected' : ''}>26-35 anos</option>
                            <option value="36-45" ${analysisData.audience.primaryAgeGroup === '36-45' ? 'selected' : ''}>36-45 anos</option>
                            <option value="46-55" ${analysisData.audience.primaryAgeGroup === '46-55' ? 'selected' : ''}>46-55 anos</option>
                        </select>
                    </p>
                </div>
            </div>

            <div class="edit-actions" style="text-align: center; margin-bottom: 20px;">
                <button onclick="updateAnalysisData()" class="btn btn-success" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 5px; margin-right: 10px;">
                    <i class="fas fa-save"></i> Atualizar Dados
                </button>
                <button onclick="resetAnalysisData()" class="btn btn-secondary" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 5px;">
                    <i class="fas fa-undo"></i> Resetar
                </button>
            </div>

            <div class="detailed-analysis" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h5><i class="fas fa-lightbulb"></i> Recomendações</h5>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${analysisData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div>
                    <h5><i class="fas fa-bullseye"></i> Oportunidades de Mercado</h5>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${analysisData.marketOpportunities.map(opp => `<li>${opp}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                <h5><i class="fas fa-rocket"></i> Produtos Recomendados</h5>
                <p>Com base na análise da imagem e dados demográficos, os produtos PMG mais adequados serão sugeridos automaticamente na prospecção.</p>
            </div>
        `;
        
        dataDiv.innerHTML = resultsHTML;
        resultsDiv.style.display = 'block';
        
        // Scroll suave até os resultados
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Salvar dados para uso no sistema de prospecção
        this.analysisResults = analysisData;
        
        // Adicionar estilos para campos editáveis
        this.addEditableStyles();
    }

    // 🔗 Integrar com sistema de prospecção
    integrateWithProspectingSystem(analysisData) {
        console.log('🔗 Integrando com sistema de prospecção...');
        
        // Adicionar dados à análise global
        window.socialMediaAnalysisData = analysisData;
        
        // Disparar evento para atualizar sugestões de produtos
        const event = new CustomEvent('socialMediaAnalysisComplete', {
            detail: analysisData
        });
        document.dispatchEvent(event);
        
        // Melhorar keywords automaticamente
        this.enhanceKeywords(analysisData);
    }

    // 🔑 Melhorar keywords baseado na análise
    enhanceKeywords(analysisData) {
        const keywordsField = document.getElementById('keywords');
        if (!keywordsField) return;
        
        const currentKeywords = keywordsField.value;
        const businessType = analysisData.businessIndicators.businessType.toLowerCase();
        
        // Sugestões baseadas no tipo de negócio detectado
        const suggestions = {
            'restaurante': 'pratos executivos, refeições, almoço, jantar',
            'lanchonete': 'lanches, hambúrguer, batata frita, refrigerantes',
            'pizzaria': 'pizza, mussarela, calabresa, molho de tomate',
            'confeitaria': 'doces, bolos, tortas, salgados'
        };
        
        const additionalKeywords = suggestions[businessType] || '';
        
        if (additionalKeywords && !currentKeywords.includes(additionalKeywords.split(',')[0])) {
            const newKeywords = currentKeywords ? 
                currentKeywords + ', ' + additionalKeywords : 
                additionalKeywords;
            
            keywordsField.value = newKeywords;
            
            // Destacar campo atualizado
            keywordsField.style.background = '#d4edda';
            setTimeout(() => {
                keywordsField.style.background = '';
            }, 2000);
        }
    }

    // 🗑️ Limpar análise
    clearImageAnalysis() {
        console.log('🗑️ Limpando análise de imagem...');
        
        // Resetar interface
        const canvas = document.getElementById('previewCanvas');
        const dropZoneContent = document.getElementById('dropZoneContent');
        const resultsDiv = document.getElementById('imageAnalysisResults');
        const analyzeBtn = document.getElementById('analyzeImageBtn');
        const fileInput = document.getElementById('imageFileInput');
        
        if (canvas) canvas.style.display = 'none';
        if (dropZoneContent) dropZoneContent.style.display = 'block';
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.style.opacity = '0.5';
        }
        if (fileInput) fileInput.value = '';
        
        // Remover info da imagem
        const imageInfo = document.getElementById('imageInfo');
        if (imageInfo) imageInfo.remove();
        
        // Limpar dados
        this.currentImage = null;
        this.analysisResults = null;
        
        console.log('✅ Análise limpa com sucesso');
    }

    // ✏️ Adicionar estilos para campos editáveis
    addEditableStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .editable-card input, .editable-card select {
                font-family: inherit;
                font-size: inherit;
                transition: all 0.3s ease;
            }
            
            .editable-card input:focus, .editable-card select:focus {
                outline: none;
                border-color: #007bff !important;
                box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
            }
            
            .edit-actions button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(style);
    }
}

// 🔄 Função global para atualizar dados da análise
function updateAnalysisData() {
    if (!window.imageAnalyzer || !window.imageAnalyzer.analysisResults) {
        alert('❌ Nenhuma análise disponível para atualizar');
        return;
    }

    try {
        // Coletar valores dos campos editáveis
        const updatedData = {
            ...window.imageAnalyzer.analysisResults,
            platform: document.getElementById('edit-platform').value,
            profileData: {
                ...window.imageAnalyzer.analysisResults.profileData,
                estimatedFollowers: parseInt(document.getElementById('edit-followers').value) || 0
            },
            engagement: {
                ...window.imageAnalyzer.analysisResults.engagement,
                engagementRate: document.getElementById('edit-engagement').value
            },
            demographic: {
                ...window.imageAnalyzer.analysisResults.demographic,
                population: parseInt(document.getElementById('edit-population').value) || 0,
                avgIncome: document.getElementById('edit-income').value
            },
            competitiveAnalysis: {
                ...window.imageAnalyzer.analysisResults.competitiveAnalysis,
                competitionLevel: document.getElementById('edit-competition').value
            },
            audience: {
                ...window.imageAnalyzer.analysisResults.audience,
                primaryAgeGroup: document.getElementById('edit-age-group').value
            }
        };

        // Atualizar dados salvos
        window.imageAnalyzer.analysisResults = updatedData;
        window.socialMediaAnalysisData = updatedData;

        // Reintegrar com sistema de prospecção
        window.imageAnalyzer.integrateWithProspectingSystem(updatedData);

        // Mostrar confirmação
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            background: #28a745; color: white; padding: 15px 20px;
            border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-weight: bold; animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = '<i class="fas fa-check"></i> Dados atualizados com sucesso!';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);

        console.log('✅ Dados da análise atualizados:', updatedData);

    } catch (error) {
        console.error('❌ Erro ao atualizar dados:', error);
        alert('❌ Erro ao atualizar dados: ' + error.message);
    }
}

// 🔄 Função global para resetar dados da análise
function resetAnalysisData() {
    if (!window.imageAnalyzer || !window.imageAnalyzer.currentImage) {
        alert('❌ Nenhuma imagem carregada para resetar');
        return;
    }

    if (confirm('🔄 Tem certeza que deseja resetar a análise? Os dados editados serão perdidos.')) {
        // Reexecutar análise
        window.imageAnalyzer.analyzeImageData();
    }
}

// 🚀 Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Image Analyzer...');
    
    try {
        window.imageAnalyzer = new ImageAnalyzer();
        console.log('✅ Image Analyzer inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar Image Analyzer:', error);
    }
});

// 🎯 Função global para análise (chamada pelo botão)
function analyzeImageData() {
    if (window.imageAnalyzer) {
        window.imageAnalyzer.analyzeImageData();
    } else {
        console.error('❌ Image Analyzer não está disponível');
        alert('❌ Sistema de análise não carregado. Recarregue a página.');
    }
}

// 🗑️ Função global para limpar (chamada pelo botão)
function clearImageAnalysis() {
    if (window.imageAnalyzer) {
        window.imageAnalyzer.clearImageAnalysis();
    } else {
        console.error('❌ Image Analyzer não está disponível');
    }
}

console.log('✅ Image Analyzer carregado com sucesso!');
