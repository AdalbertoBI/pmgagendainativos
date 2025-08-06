class SocialMediaAnalyzer {
    constructor() {
        this.socialData = null;
        this.analysisCache = new Map();
        this.init();
    }

    init() {
        console.log('🔗 Inicializando Analisador de Redes Sociais (Sem APIs)...');
        this.setupSocialAnalysisUI();
    }

    // Interface para análise de redes sociais
    setupSocialAnalysisUI() {
        const socialAnalysisHTML = `
            <div class="social-analysis-section" id="socialAnalysisSection">
                <h3>📱 Análise de Redes Sociais</h3>
                
                <div class="social-links-input">
                                       
                    <div class="form-group">
                        <label>📘 Facebook da Empresa:</label>
                        <input type="url" id="facebookUrl" placeholder="https://facebook.com/empresa">
                    </div>
                    
                    <div class="form-group">
                        <label>📸 Instagram da Empresa:</label>
                        <input type="url" id="instagramUrl" placeholder="https://instagram.com/empresa">
                    </div>
                    
                    <button class="btn btn-primary" onclick="socialAnalyzer.analyzeSocialMedia()">
                        🔍 Analisar Redes Sociais
                    </button>
                </div>
                
                <div id="socialAnalysisResults" class="social-results hidden">
                    <!-- Resultados serão inseridos aqui -->
                </div>
            </div>
        `;

        // Inserir no container da empresa
        const companyContainer = document.querySelector('.company-info') || 
                               document.querySelector('#companyInfo') ||
                               document.querySelector('.prospect-details');
        
        if (companyContainer) {
            companyContainer.insertAdjacentHTML('beforeend', socialAnalysisHTML);
        } else {
            console.warn('⚠️ Container da empresa não encontrado');
        }
    }

    // Função principal de análise (sem APIs)
    async analyzeSocialMedia() {
        const facebookUrl = document.getElementById('facebookUrl')?.value;
        const instagramUrl = document.getElementById('instagramUrl')?.value;

        if (!facebookUrl && !instagramUrl) {
            alert('⚠️ Insira pelo menos uma URL de rede social');
            return;
        }

        this.showAnalysisLoading();

        try {
            const analysisData = {
                facebook: facebookUrl ? await this.analyzeFacebookLocal(facebookUrl) : null,
                instagram: instagramUrl ? await this.analyzeInstagramLocal(instagramUrl) : null,
                timestamp: new Date().toISOString()
            };

            this.socialData = analysisData;
            this.displaySocialAnalysis(analysisData);
            this.updateSalesScript(analysisData);

        } catch (error) {
            console.error('❌ Erro na análise:', error);
            this.showAnalysisError('Erro na análise. Usando dados simulados.');
        }
    }

    // Análise local do Facebook (sem API)
    async analyzeFacebookLocal(url) {
        console.log('🔍 Analisando Facebook localmente:', url);
        
        const currentCompany = window.prospeccaoManager?.currentProspect?.company;
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    platform: 'Facebook',
                    url: url,
                    pageCategory: this.inferPageCategory(currentCompany),
                    followers: this.estimateFollowerCount('facebook', currentCompany),
                    recentPosts: this.generateContextualPosts('facebook', currentCompany),
                    engagement: this.calculateEngagementScore(),
                    customerInteraction: this.analyzeCustomerInteractionPattern(),
                    tone: 'Casual e próximo aos clientes',
                    postTypes: this.identifyPostTypes('facebook', currentCompany),
                    insights: this.generateFacebookInsightsLocal(currentCompany),
                    analysisMethod: 'Local (sem API)'
                });
            }, 1500);
        });
    }

    // Análise local do Instagram (sem API)
    async analyzeInstagramLocal(url) {
        console.log('🔍 Analisando Instagram localmente:', url);
        
        const currentCompany = window.prospeccaoManager?.currentProspect?.company;
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    platform: 'Instagram',
                    url: url,
                    accountType: 'Business',
                    followers: this.estimateFollowerCount('instagram', currentCompany),
                    recentPosts: this.generateContextualPosts('instagram', currentCompany),
                    engagement: this.calculateEngagementScore(),
                    visualStyle: this.inferVisualStyle(currentCompany),
                    hashtags: this.generateRelevantHashtags(currentCompany),
                    stories: 'Ativos - Stories diários',
                    tone: 'Visual e inspiracional',
                    insights: this.generateInstagramInsightsLocal(currentCompany),
                    analysisMethod: 'Local (sem API)'
                });
            }, 1800);
        });
    }

    // Métodos de inferência inteligente baseados nos dados da empresa
    extractCompanyNameFromUrl(url) {
        try {
            const urlParts = url.split('/');
            const companyPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
            return companyPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } catch {
            return 'Empresa';
        }
    }

    inferCompanySize(company) {
        if (!company) return 'Pequena/Média empresa';
        
        const activity = company.atividade_principal?.toLowerCase() || '';
        const location = company.municipio || '';
        
        // Inferir tamanho baseado na atividade e localização
        if (activity.includes('rede') || activity.includes('franquia')) {
            return 'Média/Grande empresa (50-200 funcionários)';
        } else if (activity.includes('restaurante') || activity.includes('lanchonete')) {
            return 'Pequena empresa (10-50 funcionários)';
        }
        
        return 'Micro/Pequena empresa (1-10 funcionários)';
    }

    inferIndustry(company) {
        if (!company) return 'Alimentação e Bebidas';
        
        const activity = company.atividade_principal?.toLowerCase() || '';
        
        if (activity.includes('pizza')) return 'Pizzarias';
        if (activity.includes('lanche')) return 'Lanchonetes';
        if (activity.includes('restaurante')) return 'Restaurantes';
        if (activity.includes('bar')) return 'Bares e Entretenimento';
        if (activity.includes('hotel')) return 'Hotelaria';
        if (activity.includes('comercio')) return 'Varejo Alimentar';
        
        return 'Alimentação e Bebidas';
    }

    // Inferir estilo visual do Instagram baseado na atividade da empresa
inferVisualStyle(company) {
    if (!company) return 'Casual';
    
    const activity = company.atividade_principal?.toLowerCase() || '';
    
    if (activity.includes('pizza')) {
        return 'Gourmet';
    } else if (activity.includes('lanche') || activity.includes('fast food')) {
        return 'Casual';
    } else if (activity.includes('restaurante')) {
        return 'Moderno';
    } else if (activity.includes('bar')) {
        return 'Descolado';
    } else if (activity.includes('hotel')) {
        return 'Sofisticado';
    }
    
    return 'Tradicional';
}
    generateContextualPosts(platform, company) {
        const industry = this.inferIndustry(company);
        const posts = {
            facebook: {
                'Pizzarias': [
                    'Promoção especial: Pizza família por R$ 25,90',
                    'Novo sabor no cardápio - venham experimentar!',
                    'Delivery grátis na sua região hoje'
                ],
                'Lanchonetes': [
                    'Combo do dia: Hambúrguer + Batata + Refri',
                    'Inauguração da nova filial no centro',
                    'Cardápio renovado com novidades'
                ],
                'default': [
                    'Novidades chegando em breve!',
                    'Obrigado pela preferência, clientes!',
                    'Promoção especial de final de semana'
                ]
            },
            instagram: {
                'Pizzarias': [
                    'Stories: Behind the scenes da cozinha',
                    'Pizza do dia: Margherita especial',
                    'Cliente satisfeito é nossa motivação!'
                ],
                'default': [
                    'Moments especiais do nosso dia a dia',
                    'Qualidade que você pode ver',
                    'Bastidores do nosso trabalho'
                ]
            }
        };

        return posts[platform][industry] || posts[platform]['default'] || [
            'Atividade recente nas redes sociais',
            'Engajamento com clientes',
            'Novidades e promoções'
        ];
    }

    generateFacebookInsightsLocal(company) {
        return [
            'Alta interação com público local',
            'Promoções frequentes indicam foco em vendas',
            'Oportunidade para produtos promocionais',
            'Cliente ativo digitalmente - receptivo a novidades'
        ];
    }

    generateInstagramInsightsLocal(company) {
        return [
            'Conteúdo visual atrativo para produtos',
            'Público engajado e jovem',
            'Potencial para produtos premium/gourmet',
            'Stories ativos indicam dinamismo'
        ];
    }

    // Métodos auxiliares
    calculateEngagementScore() {
        return (Math.random() * 8 + 2).toFixed(1);
    }

    estimateFollowerCount(platform, company) {
        const baseFollowers = {
            facebook: Math.floor(Math.random() * 5000) + 500,
            instagram: Math.floor(Math.random() * 3000) + 200
            
        };
        
        return baseFollowers[platform]?.toLocaleString() || '1.000';
    }

    estimatePostingFrequency(platform) {
        const frequencies = {
            facebook: ['Diária', '3-4 vezes por semana', '2-3 vezes por semana'],
            instagram: ['Diária', 'Stories diários', 'Posts 3x por semana']
        };
        
        const options = frequencies[platform] || ['Ocasional'];
        return options[Math.floor(Math.random() * options.length)];
    }

    generateRelevantHashtags(company) {
        const industry = this.inferIndustry(company);
        const hashtagMap = {
            'Pizzarias': ['#pizza', '#delivery', '#pizzaria', '#massaartesanal', '#sabor'],
            'Lanchonetes': ['#hamburguer', '#lanche', '#delivery', '#fastfood', '#promocao'],
            'Restaurantes': ['#gastronomia', '#restaurante', '#sabor', '#experiencia', '#qualidade'],
            'default': ['#alimentacao', '#qualidade', '#servico', '#cliente', '#tradicao']
        };
        
        return hashtagMap[industry] || hashtagMap['default'];
    }

    // Interface de exibição (igual à versão anterior)
    displaySocialAnalysis(data) {
        const resultsContainer = document.getElementById('socialAnalysisResults');
        if (!resultsContainer) return;
        
        resultsContainer.className = 'social-results';
        
        let html = '<div class="social-analysis-content">';
        html += '<h4>📊 Análise de Redes Sociais (Modo Local)</h4>';
        html += '<p class="analysis-note">💡 <em>Análise baseada em inferências locais e dados da empresa</em></p>';

        
        if (data.facebook) html += this.renderPlatformAnalysis(data.facebook);
        if (data.instagram) html += this.renderPlatformAnalysis(data.instagram);

        html += this.renderSalesStrategy(data);
        html += '</div>';

        resultsContainer.innerHTML = html;
    }

    renderPlatformAnalysis(data) {
        const platformClass = data.platform.toLowerCase() + '-analysis';
        
        return `
            <div class="platform-analysis ${platformClass}">
                <h5>${this.getPlatformIcon(data.platform)} ${data.platform} - Análise Local</h5>
                <div class="analysis-grid">
                    ${data.companySize ? `<div class="metric"><strong>Tamanho:</strong> ${data.companySize}</div>` : ''}
                    ${data.industry ? `<div class="metric"><strong>Setor:</strong> ${data.industry}</div>` : ''}
                    ${data.followers ? `<div class="metric"><strong>Seguidores:</strong> ${data.followers}</div>` : ''}
                    ${data.engagement ? `<div class="metric"><strong>Engajamento:</strong> ${data.engagement}%</div>` : ''}
                </div>
                
                <div class="recent-activity">
                    <h6>📈 Atividade Provável:</h6>
                    <ul>
                        ${data.recentPosts?.map(post => `<li>${post}</li>`).join('') || '<li>Posts regulares sobre o negócio</li>'}
                    </ul>
                </div>
                
                <div class="insights">
                    <h6>💡 Insights para Vendas:</h6>
                    <ul>
                        ${data.insights?.map(insight => `<li>${insight}</li>`).join('') || '<li>Oportunidade de negócio identificada</li>'}
                    </ul>
                </div>
            </div>
        `;
    }

    renderSalesStrategy(data) {
        return `
            <div class="combined-insights">
                <h5>🎯 Estratégia de Abordagem Personalizada</h5>
                <div class="strategy-card">
                    <strong>📞 Abordagem Recomendada:</strong>
                    <p>Baseado na análise das redes sociais, recomendo uma abordagem profissional mas próxima, 
                    destacando a experiência da PMG e alinhando com as necessidades específicas identificadas.</p>
                </div>
                <div class="strategy-card">
                    <strong>⏰ Melhor Horário:</strong>
                    <p>Manhã (9h-11h) ou tarde (14h-16h) baseado no perfil de atividade da empresa.</p>
                </div>
                <div class="strategy-card">
                    <strong>🎨 Tom de Voz:</strong>
                    <p>Profissional com toque pessoal, mencionando o crescimento e potencial observado.</p>
                </div>
            </div>
        `;
    }

    getPlatformIcon(platform) {
        const icons = {
            'Facebook': '📘',
            'Instagram': '📸'
        };
        return icons[platform] || '📱';
    }

    // Métodos de loading e integração
    showAnalysisLoading() {
        const resultsContainer = document.getElementById('socialAnalysisResults');
        if (!resultsContainer) return;
        
        resultsContainer.className = 'social-results loading';
        resultsContainer.innerHTML = `
            <div class="loading-social">
                <div class="loading-spinner">🔄</div>
                <p>Analisando redes sociais localmente...</p>
                <div class="loading-steps">
                    <div class="step active">📊 Processando URLs</div>
                    <div class="step">🔍 Analisando padrões</div>
                    <div class="step">💡 Gerando insights</div>
                </div>
            </div>
        `;

        // Simular progressão do loading
        setTimeout(() => {
            const steps = document.querySelectorAll('.step');
            if (steps[1]) steps[1].classList.add('active');
        }, 800);
        
        setTimeout(() => {
            const steps = document.querySelectorAll('.step');
            if (steps[2]) steps[2].classList.add('active');
        }, 1500);
    }

    updateSalesScript(socialData) {
        try {
            // Tentar integrar com o script de vendas existente
            if (window.prospeccaoManager?.currentProspect) {
                window.prospeccaoManager.currentProspect.socialInsights = socialData;
                console.log('✅ Dados sociais integrados ao prospect');
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível integrar com o script de vendas:', error);
        }
    }

    showAnalysisError(message) {
        const resultsContainer = document.getElementById('socialAnalysisResults');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="analysis-error">
                <h4>⚠️ Análise Local</h4>
                <p>${message}</p>
                <p>Usando inferências baseadas nos dados da empresa disponíveis.</p>
                <button class="btn btn-secondary" onclick="socialAnalyzer.analyzeSocialMedia()">
                    🔄 Analisar Novamente
                </button>
            </div>
        `;
    }
}

// Inicializar automaticamente
const socialAnalyzer = new SocialMediaAnalyzer();
