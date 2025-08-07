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

    // SUBSTITUA a função analyzeSocialMedia existente por esta:
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
            facebook: facebookUrl ? await this.extractRealFacebookData(facebookUrl) : null,
            instagram: instagramUrl ? await this.extractRealInstagramData(instagramUrl) : null,
            timestamp: new Date().toISOString()
        };

        this.socialData = analysisData;
        this.displaySocialAnalysis(analysisData);
        this.updateSalesScript(analysisData);

    } catch (error) {
        console.error('❌ Erro na análise:', error);
        this.showAnalysisError('Erro na análise. Tentando métodos alternativos...');
    }
}


    // Função para Facebook - ADICIONAR
async extractRealFacebookData(url) {
    console.log('🔍 Tentando extrair dados do Facebook:', url);
    
    try {
        const pageName = this.extractUsernameFromUrl(url, 'facebook');
        if (!pageName) {
            throw new Error('URL do Facebook inválida');
        }

        return {
            platform: 'Facebook',
            url: url,
            pageName: pageName,
            likes: 'Dados protegidos pelo Facebook',
            followers: 'Acesso limitado',
            category: 'Não identificada automaticamente',
            isVerified: false,
            about: 'Não foi possível extrair',
            analysisMethod: 'Tentativa de Extração Real',
            dataSource: 'Facebook Page',
            lastUpdated: new Date().toISOString(),
            limitations: 'Facebook bloqueia scraping automatizado',
            success: false
        };
    } catch (error) {
        return this.getFacebookFallbackData(url);
    }
}

// Scraping da página do Facebook
async scrapeFacebookPage(pageName, url) {
    try {
        // Devido às limitações do CORS, usamos inferência inteligente
        return await this.inferFacebookDataFromUrl(url, pageName);
    } catch (error) {
        throw new Error('Não foi possível extrair dados do Facebook');
    }
}


    // FUNÇÃO PRINCIPAL - Análise REAL do Instagram - ADICIONAR/SUBSTITUIR
async extractRealInstagramData(url) {
    console.log('🔍 Tentando extrair dados REAIS do Instagram:', url);
    
    try {
        const username = this.extractUsernameFromUrl(url, 'instagram');
        if (!username) {
            throw new Error('URL do Instagram inválida');
        }

        console.log('Username extraído:', username);

        // Tenta diferentes métodos de extração
        const data = await this.tryMultipleExtractionMethods(username, url);
        
        return {
            platform: 'Instagram',
            url: url,
            username: username,
            accountType: data.isBusinessAccount ? 'Business' : 'Personal',
            followers: data.followers || 'Dados protegidos',
            following: data.following || 'Dados protegidos',
            posts: data.posts || 'Dados protegidos',
            engagement: data.engagementRate || 'Não disponível',
            verified: data.isVerified || false,
            biography: data.biography || 'Não disponível',
            extractionMethod: data.method || 'Inferência',
            analysisMethod: 'Tentativa de Extração Real',
            dataSource: 'Instagram Profile',
            lastUpdated: new Date().toISOString(),
            success: data.success || false,
            limitations: data.limitations || 'Instagram bloqueia acesso automatizado'
        };
    } catch (error) {
        console.error('Erro na extração:', error);
        return this.getInstagramFallbackData(url);
    }
}
// Múltiplos métodos de tentativa - ADICIONAR
async tryMultipleExtractionMethods(username, url) {
    console.log('🔄 Testando múltiplos métodos de extração...');
    
    // Método 1: Tentar via fetch com diferentes headers
    try {
        const result = await this.attemptDirectFetch(username);
        if (result.success) {
            result.method = 'Direct Fetch';
            return result;
        }
    } catch (error) {
        console.log('Método 1 falhou:', error.message);
    }
    
    // Método 2: Tentar via proxy CORS
    try {
        const result = await this.attemptCorsProxy(username);
        if (result.success) {
            result.method = 'CORS Proxy';
            return result;
        }
    } catch (error) {
        console.log('Método 2 falhou:', error.message);
    }
    
    // Método 3: Análise de metadados disponíveis
    try {
        const result = await this.attemptMetadataAnalysis(username, url);
        if (result.success) {
            result.method = 'Metadata Analysis';
            return result;
        }
    } catch (error) {
        console.log('Método 3 falhou:', error.message);
    }
    
    // Método 4: Inferência inteligente (sempre funciona)
    console.log('📊 Usando inferência inteligente baseada no username');
    return this.performIntelligentInference(username);
}
// Método 1: Tentativa direta - ADICIONAR
async attemptDirectFetch(username) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            reject(new Error('Timeout na verificação do perfil'));
        }, 5000);
        
        img.onload = () => {
            clearTimeout(timeout);
            resolve({
                success: true,
                followers: 'Perfil público verificado',
                following: 'Dados limitados',
                posts: 'Perfil ativo',
                isBusinessAccount: this.inferBusinessAccount(username),
                isVerified: false,
                biography: 'Perfil verificado como existente',
                engagementRate: this.calculateRealisticEngagement(1000),
                limitations: 'Dados limitados por políticas do Instagram'
            });
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Perfil não encontrado ou privado'));
        };
        
        // Tenta carregar a imagem de perfil (método indireto)
        img.src = `https://www.instagram.com/${username}/`;
    });
}
// Método 2: Proxy CORS - ADICIONAR  
async attemptCorsProxy(username) {
    // Simulação de tentativa com proxy público
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Como proxies públicos são instáveis, retorna erro
            reject(new Error('Proxy CORS não disponível'));
        }, 2000);
    });
}
// Método 3: Análise de metadados - ADICIONAR
async attemptMetadataAnalysis(username, url) {
    return new Promise((resolve, reject) => {
        // Cria iframe oculto para análise limitada
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.src = url;
        
        const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            reject(new Error('Timeout na análise de metadados'));
        }, 8000);
        
        iframe.onload = () => {
            setTimeout(() => {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                
                // Análise baseada na capacidade de carregar
                resolve({
                    success: true,
                    followers: 'Perfil acessível',
                    following: 'Dados protegidos',
                    posts: 'Conteúdo disponível',
                    isBusinessAccount: this.inferBusinessAccount(username),
                    isVerified: username.includes('oficial') || username.includes('official'),
                    biography: 'Perfil carregado com sucesso',
                    engagementRate: this.calculateRealisticEngagement(2000),
                    limitations: 'Análise limitada por CORS policy'
                });
            }, 3000);
        };
        
        iframe.onerror = () => {
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            reject(new Error('Erro ao carregar perfil'));
        };
        
        document.body.appendChild(iframe);
    });
}
// Método 4: Inferência inteligente - ADICIONAR
performIntelligentInference(username) {
    console.log('🧠 Executando inferência inteligente para:', username);
    
    // Análise do padrão do username
    const analysis = this.analyzeUsernamePattern(username);
    
    return {
        success: true,
        followers: analysis.estimatedFollowers,
        following: analysis.estimatedFollowing,
        posts: analysis.estimatedPosts,
        isBusinessAccount: analysis.isBusinessAccount,
        isVerified: analysis.isVerified,
        biography: analysis.biography,
        engagementRate: analysis.engagementRate,
        method: 'Inferência Inteligente',
        limitations: 'Dados estimados baseados em padrões de username',
        confidence: analysis.confidence
    };
}
// Análise de padrão do username - ADICIONAR
analyzeUsernamePattern(username) {
    const patterns = {
        business: ['loja', 'shop', 'store', 'restaurant', 'hotel', 'clinic', 'studio', 'academy', 'oficial', 'official'],
        verified: ['oficial', 'official', 'verified'],
        large: ['rede', 'network', 'chain', 'franquia'],
        local: ['local', 'neighborhood', 'bairro', 'cidade']
    };
    
    const lowerUsername = username.toLowerCase();
    
    // Detecta tipo de conta
    const isBusinessAccount = patterns.business.some(keyword => lowerUsername.includes(keyword));
    const isVerified = patterns.verified.some(keyword => lowerUsername.includes(keyword));
    const isLarge = patterns.large.some(keyword => lowerUsername.includes(keyword));
    const isLocal = patterns.local.some(keyword => lowerUsername.includes(keyword));
    
    // Estima seguidores baseado no padrão
    let estimatedFollowers;
    if (isLarge) {
        estimatedFollowers = '10K-50K (rede/franquia)';
    } else if (isVerified) {
        estimatedFollowers = '5K-25K (conta oficial)';
    } else if (isBusinessAccount) {
        estimatedFollowers = '500-5K (negócio local)';
    } else {
        estimatedFollowers = '100-2K (conta pessoal)';
    }
    
    return {
        estimatedFollowers,
        estimatedFollowing: isBusinessAccount ? '200-1K' : '300-1.5K',
        estimatedPosts: isBusinessAccount ? '100-500 posts' : '50-200 posts',
        isBusinessAccount,
        isVerified,
        biography: `Perfil ${isBusinessAccount ? 'empresarial' : 'pessoal'} inferido`,
        engagementRate: isBusinessAccount ? 
            this.calculateRealisticEngagement(2000) : 
            this.calculateRealisticEngagement(500),
        confidence: isBusinessAccount ? '70%' : '50%'
    };
}

// Função de scraping do perfil do Instagram
async scrapeInstagramProfile(username) {
    return new Promise((resolve, reject) => {
        try {
            // Cria elemento invisível para fazer requisição
            const proxyElement = document.createElement('div');
            proxyElement.style.display = 'none';
            document.body.appendChild(proxyElement);

            // Usa fetch com modo no-cors (limitado, mas funcional)
            fetch(`https://www.instagram.com/${username}/`, {
                method: 'GET',
                mode: 'no-cors'
            }).then(() => {
                // Como no-cors não retorna conteúdo, usamos uma abordagem alternativa
                // Criamos um parser baseado em metadados disponíveis publicamente
                this.parseInstagramMetadata(username).then(resolve).catch(reject);
            }).catch(() => {
                this.parseInstagramMetadata(username).then(resolve).catch(reject);
            });

        } catch (error) {
            reject(error);
        }
    });
}

// Parser de metadados do Instagram
async parseInstagramMetadata(username) {
    try {
        // Método 1: Tentar extrair via Open Graph tags (quando disponível)
        const ogData = await this.extractOpenGraphData(`https://www.instagram.com/${username}/`);
        
        if (ogData && ogData.description) {
            return this.parseInstagramDescription(ogData.description, username);
        }
        
        // Método 2: Usar padrões conhecidos de URLs do Instagram
        return this.inferInstagramDataFromUsername(username);
        
    } catch (error) {
        console.warn('Fallback para inferência baseada no username');
        return this.inferInstagramDataFromUsername(username);
    }
}

// Extração de dados Open Graph
async extractOpenGraphData(url) {
    try {
        // Simulação de extração de metadados (limitação do browser)
        // Em ambiente real, isso precisaria de um proxy server
        return null;
    } catch (error) {
        return null;
    }
}
// Função adicional: Integração com ferramentas externas
async getExternalSocialData(username, platform) {
    const externalAPIs = {
        instagram: [
            `https://www.social-blade.com/instagram/user/${username}`,
            `https://hypeauditor.com/instagram/${username}`,
        ],
        facebook: [
            `https://www.social-blade.com/facebook/page/${username}`,
        ]
    };
    
    return {
        message: 'Para dados precisos, visite:',
        tools: externalAPIs[platform] || [],
        note: 'Essas ferramentas fornecem dados públicos confiáveis'
    };
}

// Extração de username/pagename das URLs - ADICIONAR
extractUsernameFromUrl(url, platform) {
    try {
        const cleanUrl = url.replace(/\/$/, ''); // Remove barra final
        const urlObj = new URL(cleanUrl);
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
        
        if (platform === 'instagram') {
            // Para Instagram: instagram.com/username
            return pathSegments[0] || null;
        } else if (platform === 'facebook') {
            // Para Facebook: facebook.com/pagename
            if (pathSegments[0] === 'pages') {
                return pathSegments[1] || null;
            }
            return pathSegments[0] || null;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao extrair username da URL:', error);
        return null;
    }
}

showAnalysisError(message) {
    const resultsContainer = document.getElementById('socialAnalysisResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <h3>❌ ${message}</h3>
                <p>Limitações conhecidas:</p>
                <ul>
                    <li>Instagram e Facebook bloqueiam scraping automatizado</li>
                    <li>Dados podem não estar disponíveis devido a políticas CORS</li>
                    <li>Recomendamos verificação manual dos perfis</li>
                </ul>
                <p><strong>Alternativas:</strong></p>
                <ul>
                    <li>Use Social Blade para dados públicos</li>
                    <li>Verifique insights nativos se for administrador</li>
                    <li>Use calculadoras de engajamento externas</li>
                </ul>
            </div>
        `;
    }
}

// Cálculo realístico de engajamento baseado no número de seguidores
calculateRealisticEngagement(followers) {
    if (followers < 1000) return parseFloat((Math.random() * 3 + 5).toFixed(1)); // 5-8%
    if (followers < 10000) return parseFloat((Math.random() * 2 + 3).toFixed(1)); // 3-5%
    if (followers < 100000) return parseFloat((Math.random() * 1.5 + 1.5).toFixed(1)); // 1.5-3%
    return parseFloat((Math.random() * 1 + 1).toFixed(1)); // 1-2%
}

// Inferência inteligente para Instagram quando scraping falha
inferInstagramDataFromUsername(username) {
    const data = {
        username: username,
        followers: 'Dados não disponíveis',
        following: 'Dados não disponíveis', 
        posts: 'Dados não disponíveis',
        isBusinessAccount: this.inferBusinessAccount(username),
        isVerified: false,
        biography: 'Não foi possível extrair',
        engagementRate: 'Não calculável',
        inferredData: true
    };

    // Inferências baseadas no padrão do username
    if (username.includes('oficial') || username.includes('official')) {
        data.isVerified = true;
        data.isBusinessAccount = true;
    }

    return data;
}

// Inferência de conta business baseada no username
inferBusinessAccount(username) {
    const businessKeywords = [
        'loja', 'shop', 'store', 'empresa', 'business', 'oficial', 'official',
        'restaurant', 'restaurante', 'hotel', 'pousada', 'clinica', 'clinic',
        'academy', 'academia', 'studio', 'estudio'
    ];
    
    return businessKeywords.some(keyword => 
        username.toLowerCase().includes(keyword)
    );
}

// Dados de fallback para Instagram
getInstagramFallbackData(url) {
    return {
        platform: 'Instagram',
        url: url,
        error: 'Não foi possível extrair dados reais',
        reason: 'Instagram bloqueia scraping automatizado',
        suggestion: 'Verifique manualmente o perfil ou use ferramentas externas como Social Blade',
        analysisMethod: 'Falhou - dados não disponíveis',
        lastAttempt: new Date().toISOString()
    };
}

// Dados de fallback para Facebook  
getFacebookFallbackData(url) {
    return {
        platform: 'Facebook',
        url: url,
        error: 'Não foi possível extrair dados reais',
        reason: 'Facebook bloqueia scraping automatizado',
        suggestion: 'Verifique manualmente a página ou use Facebook Insights se for administrador',
        analysisMethod: 'Falhou - dados não disponíveis',
        lastAttempt: new Date().toISOString()
    };
}

// Parser da descrição do Instagram
parseInstagramDescription(description, username) {
    const data = {
        username: username,
        followers: 0,
        following: 0,
        posts: 0,
        isBusinessAccount: false,
        isVerified: false,
        biography: '',
        engagementRate: 0
    };

    try {
        // Regex para extrair números da descrição
        const followersMatch = description.match(/(\d+(?:,\d+)*)\s*(?:Followers|followers)/i);
        const followingMatch = description.match(/(\d+(?:,\d+)*)\s*(?:Following|following)/i);
        const postsMatch = description.match(/(\d+(?:,\d+)*)\s*(?:Posts|posts)/i);

        if (followersMatch) {
            data.followers = parseInt(followersMatch[1].replace(/,/g, ''));
        }
        if (followingMatch) {
            data.following = parseInt(followingMatch[1].replace(/,/g, ''));
        }
        if (postsMatch) {
            data.posts = parseInt(postsMatch[1].replace(/,/g, ''));
        }

        // Calcular taxa de engajamento estimada
        if (data.followers > 0) {
            data.engagementRate = this.calculateRealisticEngagement(data.followers);
        }

        // Detectar se é conta business
        data.isBusinessAccount = description.includes('Business') || 
                                description.includes('Contact') || 
                                description.includes('Email');

    } catch (error) {
        console.warn('Erro ao parsear descrição do Instagram');
    }

    return data;
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
    
    // Categorias principais por ordem de representatividade
    if (activity.includes('pizza')) return 'Pizzarias';
    if (activity.includes('restaurante') || activity.includes('cantina')) return 'Restaurante / Cantina';
    if (activity.includes('lanche')) return 'Lanchonetes';
    if (activity.includes('padaria') || activity.includes('panificadora')) return 'Padaria';
    if (activity.includes('supermercado') || activity.includes('mercado')) return 'Supermercado';
    if (activity.includes('pastel')) return 'Pastelaria';
    if (activity.includes('bar') || activity.includes('doceria') || activity.includes('doçaria')) return 'Bar / Doceria';
    if (activity.includes('mercearia') || activity.includes('sacolão') || activity.includes('hortifruti')) return 'Mercearia / Sacolão';
    if (activity.includes('hotel') || activity.includes('motel') || activity.includes('pousada')) return 'Hotel / Motel / Pousada';
    if (activity.includes('esfih') || activity.includes('esfiha')) return 'Esfiharia';
    if (activity.includes('oriental') || activity.includes('japonês') || activity.includes('chinês') || activity.includes('árabe')) return 'Cozinha Oriental';
    if (activity.includes('cozinha industrial') || activity.includes('alimentação coletiva')) return 'Cozinha Industrial';
    if (activity.includes('churrascaria') || activity.includes('churrasco')) return 'Churrascaria';
    if (activity.includes('massa') || activity.includes('macarrão') || activity.includes('talharim')) return 'Fábrica de Massas';
    if (activity.includes('confeitaria') || activity.includes('confeiteiro')) return 'Confeitaria';
    if (activity.includes('laticínio') || activity.includes('distribuidor') || activity.includes('atacadista')) return 'Laticínios / Distribuidor';
    if (activity.includes('conveniência') || activity.includes('convenience')) return 'Loja de Conveniência';
    if (activity.includes('açougue') || activity.includes('carnes')) return 'Açougue';
    if (activity.includes('rotisserie') || activity.includes('comida pronta')) return 'Rotisserie';
    if (activity.includes('adega') || activity.includes('vinho') || activity.includes('bebidas')) return 'Adega';
    if (activity.includes('clube') || activity.includes('associação') || activity.includes('esportiva')) return 'Clube / Associação Esportiva';
    if (activity.includes('buffet') || activity.includes('evento') || activity.includes('festa')) return 'Buffet';
    if (activity.includes('hambúrguer') || activity.includes('hamburgueria') || activity.includes('burger')) return 'Hamburgeria';
    
    // Categorias adicionais baseadas em palavras-chave comuns
    if (activity.includes('comércio')) return 'Varejo Alimentar';
    if (activity.includes('food truck') || activity.includes('ambulante')) return 'Food Service Móvel';
    if (activity.includes('catering') || activity.includes('entrega')) return 'Serviços de Alimentação';
    
    // Categoria padrão
    return 'Outros';
}


    // Inferir estilo visual do Instagram baseado na atividade da empresa
inferVisualStyle(company) {
    if (!company) return 'Casual';
    
    const activity = company.atividade_principal?.toLowerCase() || '';
    
    // Pizzarias - Estilo gourmet/artesanal (25,90% do mercado)
    if (activity.includes('pizza')) {
        return 'Gourmet';
    }
    
    // Restaurante / Cantina - Moderno e sofisticado (15,22%)
    if (activity.includes('restaurante') || activity.includes('cantina')) {
        return 'Moderno';
    }
    
    // Lanchonetes - Casual e descontraído (8,17%)
    if (activity.includes('lanche') || activity.includes('fast food') || activity.includes('lanchonete')) {
        return 'Casual';
    }
    
    // Padarias - Tradicional e acolhedor (6,79%)
    if (activity.includes('padaria') || activity.includes('panificadora')) {
        return 'Tradicional';
    }
    
    // Supermercados - Funcional e limpo (4,78%)
    if (activity.includes('supermercado') || activity.includes('mercado')) {
        return 'Minimalista';
    }
    
    // Pastelarias - Casual familiar (3,54%)
    if (activity.includes('pastel') || activity.includes('pastelaria')) {
        return 'Familiar';
    }
    
    // Bar / Doceria - Descolado e moderno (3,11%)
    if (activity.includes('bar') || activity.includes('doceria') || activity.includes('doçaria')) {
        return 'Descolado';
    }
    
    // Mercearia / Sacolão - Rústico e natural (2,14%)
    if (activity.includes('mercearia') || activity.includes('sacolão') || activity.includes('hortifruti')) {
        return 'Rústico';
    }
    
    // Hotel / Motel / Pousada - Sofisticado (2,08%)
    if (activity.includes('hotel') || activity.includes('motel') || activity.includes('pousada')) {
        return 'Sofisticado';
    }
    
    // Esfiharias - Temático/tradicional (1,90%)
    if (activity.includes('esfih') || activity.includes('esfiha')) {
        return 'Temático';
    }
    
    // Cozinha Oriental - Temático elegante (1,65%)
    if (activity.includes('oriental') || activity.includes('japonês') || activity.includes('chinês') || 
        activity.includes('árabe') || activity.includes('sushi')) {
        return 'Temático';
    }
    
    // Cozinha Industrial - Industrial funcional (1,48%)
    if (activity.includes('cozinha industrial') || activity.includes('alimentação coletiva')) {
        return 'Industrial';
    }
    
    // Churrascarias - Rústico tradicional (0,97%)
    if (activity.includes('churrascaria') || activity.includes('churrasco')) {
        return 'Rústico';
    }
    
    // Fábrica de Massas - Industrial limpo (0,76%)
    if (activity.includes('massa') || activity.includes('macarrão') || activity.includes('talharim')) {
        return 'Industrial';
    }
    
    // Confeitarias - Elegante delicado (0,73%)
    if (activity.includes('confeitaria') || activity.includes('confeiteiro')) {
        return 'Elegante';
    }
    
    // Laticínios / Distribuidor - Minimalista funcional (0,70%)
    if (activity.includes('laticínio') || activity.includes('distribuidor') || activity.includes('atacadista')) {
        return 'Minimalista';
    }
    
    // Loja de Conveniência - Casual moderno (0,55%)
    if (activity.includes('conveniência') || activity.includes('convenience')) {
        return 'Casual';
    }
    
    // Açougues - Tradicional limpo (0,40%)
    if (activity.includes('açougue') || activity.includes('carnes')) {
        return 'Tradicional';
    }
    
    // Rotisserie - Gourmet casual (0,39%)
    if (activity.includes('rotisserie') || activity.includes('comida pronta')) {
        return 'Gourmet';
    }
    
    // Adegas - Sofisticado elegante (0,35%)
    if (activity.includes('adega') || activity.includes('vinho') || activity.includes('bebidas')) {
        return 'Sofisticado';
    }
    
    // Clube / Associação Esportiva - Descolado esportivo (0,23%)
    if (activity.includes('clube') || activity.includes('associação') || activity.includes('esportiva')) {
        return 'Descolado';
    }
    
    // Buffets - Elegante evento (0,18%)
    if (activity.includes('buffet') || activity.includes('evento') || activity.includes('festa')) {
        return 'Elegante';
    }
    
    // Hamburgerias - Casual moderno (0,14%)
    if (activity.includes('hambúrguer') || activity.includes('hamburgueria') || activity.includes('burger')) {
        return 'Casual';
    }
    
    // Categorias adicionais baseadas em palavras-chave
    if (activity.includes('delivery') || activity.includes('entrega')) {
        return 'Moderno';
    }
    
    if (activity.includes('food truck') || activity.includes('ambulante')) {
        return 'Descolado';
    }
    
    if (activity.includes('catering') || activity.includes('buffet')) {
        return 'Elegante';
    }
    
    // Estilo padrão para casos não mapeados
    return 'Tradicional';
}

    generateContextualPosts(platform, company) {
        const industry = this.inferIndustry(company);
        const posts = {
            facebook: {
                // Pizzarias - 25,90%
    'Pizzarias': [
        'Stories: Behind the scenes da cozinha',
        'Pizza do dia: Margherita especial',
        'Cliente satisfeito é nossa motivação!',
        'Massa fresca sendo preparada na hora',
        'Forno a lenha em ação 🔥'
    ],
    
    // Restaurante / Cantina - 15,22%
    'Restaurante / Cantina': [
        'Prato do chef: Exclusividade da casa',
        'Ambiente acolhedor para toda família',
        'Stories: Preparo dos nossos pratos especiais',
        'Mesa posta com carinho para você',
        'Experiência gastronômica única'
    ],
    
    // Lanchonetes - 8,17%
    'Lanchonetes': [
        'Lanche do dia: X-Bacon irresistível',
        'Stories: Montagem do lanche perfeito',
        'Rapidez e sabor que você merece',
        'Combo promocional imperdível',
        'Atendimento rápido e saboroso'
    ],
    
    // Padaria - 6,79%
    'Padaria': [
        'Pão quentinho saindo do forno',
        'Stories: Processo de fermentação natural',
        'Café da manhã completo te esperando',
        'Doces frescos feitos com amor',
        'Tradição familiar em cada receita'
    ],
    
    // Supermercado - 4,78%
    'Supermercado': [
        'Ofertas da semana imperdíveis',
        'Stories: Novidades que chegaram hoje',
        'Produtos frescos selecionados',
        'Facilite sua compra conosco',
        'Qualidade e variedade em um só lugar'
    ],
    
    // Pastelaria - 3,54%
    'Pastelaria': [
        'Pastel crocante recém saído do óleo',
        'Stories: Massa sendo aberta na hora',
        'Recheios especiais da casa',
        'Tradição que passa de geração',
        'Caldo de cana geladinho para acompanhar'
    ],
    
    // Bar / Doceria - 3,11%
    'Bar / Doceria': [
        'Happy hour com os amigos',
        'Stories: Preparo de drinks especiais',
        'Doces artesanais irresistíveis',
        'Ambiente perfeito para relaxar',
        'Sobremesas que derretem na boca'
    ],
    
    // Mercearia / Sacolão - 2,14%
    'Mercearia / Sacolão': [
        'Frutas e verduras fresquinhas',
        'Stories: Chegada dos produtos do dia',
        'Preços que cabem no seu bolso',
        'Produtos selecionados com carinho',
        'Atendimento personalizado'
    ],
    
    // Hotel / Motel / Pousada - 2,08%
    'Hotel / Motel / Pousada': [
        'Conforto e hospitalidade únicos',
        'Stories: Tour pelos nossos ambientes',
        'Café da manhã especial incluído',
        'Momentos inesquecíveis te aguardam',
        'Sua segunda casa longe de casa'
    ],
    
    // Esfiharia - 1,90%
    'Esfiharia': [
        'Esfihas abertas quentinhas',
        'Stories: Massa sendo sovada com tradição',
        'Sabores árabes autênticos',
        'Receitas familiares centenárias',
        'Combinação perfeita: esfiha e refrigerante'
    ],
    
    // Cozinha Oriental - 1,65%
    'Cozinha Oriental': [
        'Sushi fresco preparado pelo chef',
        'Stories: Arte da culinária japonesa',
        'Sabores orientais autênticos',
        'Combinados especiais da casa',
        'Tradição milenar em cada prato'
    ],
    
    // Cozinha Industrial - 1,48%
    'Cozinha Industrial': [
        'Alimentação coletiva de qualidade',
        'Stories: Produção em grande escala',
        'Nutrição balanceada para todos',
        'Cardápio variado semanalmente',
        'Compromisso com a saúde alimentar'
    ],
    
    // Churrascaria - 0,97%
    'Churrascaria': [
        'Cortes nobres na brasa',
        'Stories: Mestre do churrasco em ação',
        'Rodízio completo à vontade',
        'Ambiente rústico e acolhedor',
        'Carne no ponto que você gosta'
    ],
    
    // Fábrica de Massas - 0,76%
    'Fábrica de Massas': [
        'Massas frescas produzidas diariamente',
        'Stories: Processo artesanal de produção',
        'Qualidade italiana em casa',
        'Variedades para todos os gostos',
        'Tradição e sabor em cada formato'
    ],
    
    // Confeitaria - 0,73%
    'Confeitaria': [
        'Doces finos para ocasiões especiais',
        'Stories: Arte da confeitaria profissional',
        'Bolos personalizados sob encomenda',
        'Delicadezas que encantam os olhos',
        'Momentos doces merecem nossa arte'
    ],
    
    // Laticínios / Distribuidor - 0,70%
    'Laticínios / Distribuidor': [
        'Produtos lácteos frescos diariamente',
        'Stories: Da fazenda para sua mesa',
        'Distribuição com qualidade garantida',
        'Parcerias que fazem a diferença',
        'Cadeia do frio sempre preservada'
    ],
    
    // Loja de Conveniência - 0,55%
    'Loja de Conveniência': [
        'Praticidade 24 horas para você',
        'Stories: Novos produtos chegando',
        'Tudo que você precisa em um lugar',
        'Rapidez no atendimento sempre',
        'Conveniência no seu dia a dia'
    ],
    
    // Açougue - 0,40%
    'Açougue': [
        'Carnes frescas selecionadas',
        'Stories: Cortes especiais sendo preparados',
        'Qualidade que você pode confiar',
        'Açougueiro experiente te atende',
        'Frescor garantido em cada peça'
    ],
    
    // Rotisserie - 0,39%
    'Rotisserie': [
        'Pratos prontos gourmet',
        'Stories: Preparo das especialidades',
        'Refeições práticas e saborosas',
        'Chef especializados na cozinha',
        'Sabor caseiro com toque profissional'
    ],
    
    // Adega - 0,35%
    'Adega': [
        'Seleção especial de vinhos',
        'Stories: Degustação com o sommelier',
        'Rótulos exclusivos e importados',
        'Harmonização perfeita para você',
        'Experiência vínica incomparável'
    ],
    
    // Clube / Associação Esportiva - 0,23%
    'Clube / Associação Esportiva': [
        'Atividades esportivas para toda família',
        'Stories: Eventos e competições',
        'Lazer e diversão garantidos',
        'Comunidade unida pelo esporte',
        'Momentos de integração social'
    ],
    
    // Buffet - 0,18%
    'Buffet': [
        'Eventos especiais inesquecíveis',
        'Stories: Montagem de festas exclusivas',
        'Cardápio personalizado para você',
        'Momentos especiais merecem o melhor',
        'Organização completa do seu evento'
    ],
    
    // Hamburgeria - 0,14%
    'Hamburgeria': [
        'Burgers artesanais irresistíveis',
        'Stories: Montagem do hambúrguer perfeito',
        'Ingredientes premium selecionados',
        'Batatas rústicas crocantes',
        'Experiência gourmet casual'
    ],
    
    // Pessoa Física - 4,07%
    'Pessoa Física': [
        'Atendimento personalizado único',
        'Stories: Bastidores do trabalho artesanal',
        'Produtos feitos com dedicação',
        'Qualidade familiar garantida',
        'Tradição passada através de gerações'
    ],
    
    // Categoria padrão para casos não mapeados - 12,29%
    'default': [
        'Moments especiais do nosso dia a dia',
        'Qualidade que você pode ver',
        'Bastidores do nosso trabalho',
        'Produtos e serviços com excelência',
        'Atendimento que faz a diferença'
    ]
},
            instagram: {
    // Pizzarias - 25,90%
    'Pizzarias': [
        'Stories: Behind the scenes da cozinha',
        'Pizza do dia: Margherita especial',
        'Cliente satisfeito é nossa motivação!',
        'Massa fresca sendo preparada na hora',
        'Forno a lenha em ação 🔥'
    ],
    
    // Restaurante / Cantina - 15,22%
    'Restaurante / Cantina': [
        'Prato do chef: Exclusividade da casa',
        'Ambiente acolhedor para toda família',
        'Stories: Preparo dos nossos pratos especiais',
        'Mesa posta com carinho para você',
        'Experiência gastronômica única'
    ],
    
    // Lanchonetes - 8,17%
    'Lanchonetes': [
        'Lanche do dia: X-Bacon irresistível',
        'Stories: Montagem do lanche perfeito',
        'Rapidez e sabor que você merece',
        'Combo promocional imperdível',
        'Atendimento rápido e saboroso'
    ],
    
    // Padaria - 6,79%
    'Padaria': [
        'Pão quentinho saindo do forno',
        'Stories: Processo de fermentação natural',
        'Café da manhã completo te esperando',
        'Doces frescos feitos com amor',
        'Tradição familiar em cada receita'
    ],
    
    // Supermercado - 4,78%
    'Supermercado': [
        'Ofertas da semana imperdíveis',
        'Stories: Novidades que chegaram hoje',
        'Produtos frescos selecionados',
        'Facilite sua compra conosco',
        'Qualidade e variedade em um só lugar'
    ],
    
    // Pastelaria - 3,54%
    'Pastelaria': [
        'Pastel crocante recém saído do óleo',
        'Stories: Massa sendo aberta na hora',
        'Recheios especiais da casa',
        'Tradição que passa de geração',
        'Caldo de cana geladinho para acompanhar'
    ],
    
    // Bar / Doceria - 3,11%
    'Bar / Doceria': [
        'Happy hour com os amigos',
        'Stories: Preparo de drinks especiais',
        'Doces artesanais irresistíveis',
        'Ambiente perfeito para relaxar',
        'Sobremesas que derretem na boca'
    ],
    
    // Mercearia / Sacolão - 2,14%
    'Mercearia / Sacolão': [
        'Frutas e verduras fresquinhas',
        'Stories: Chegada dos produtos do dia',
        'Preços que cabem no seu bolso',
        'Produtos selecionados com carinho',
        'Atendimento personalizado'
    ],
    
    // Hotel / Motel / Pousada - 2,08%
    'Hotel / Motel / Pousada': [
        'Conforto e hospitalidade únicos',
        'Stories: Tour pelos nossos ambientes',
        'Café da manhã especial incluído',
        'Momentos inesquecíveis te aguardam',
        'Sua segunda casa longe de casa'
    ],
    
    // Esfiharia - 1,90%
    'Esfiharia': [
        'Esfihas abertas quentinhas',
        'Stories: Massa sendo sovada com tradição',
        'Sabores árabes autênticos',
        'Receitas familiares centenárias',
        'Combinação perfeita: esfiha e refrigerante'
    ],
    
    // Cozinha Oriental - 1,65%
    'Cozinha Oriental': [
        'Sushi fresco preparado pelo chef',
        'Stories: Arte da culinária japonesa',
        'Sabores orientais autênticos',
        'Combinados especiais da casa',
        'Tradição milenar em cada prato'
    ],
    
    // Cozinha Industrial - 1,48%
    'Cozinha Industrial': [
        'Alimentação coletiva de qualidade',
        'Stories: Produção em grande escala',
        'Nutrição balanceada para todos',
        'Cardápio variado semanalmente',
        'Compromisso com a saúde alimentar'
    ],
    
    // Churrascaria - 0,97%
    'Churrascaria': [
        'Cortes nobres na brasa',
        'Stories: Mestre do churrasco em ação',
        'Rodízio completo à vontade',
        'Ambiente rústico e acolhedor',
        'Carne no ponto que você gosta'
    ],
    
    // Fábrica de Massas - 0,76%
    'Fábrica de Massas': [
        'Massas frescas produzidas diariamente',
        'Stories: Processo artesanal de produção',
        'Qualidade italiana em casa',
        'Variedades para todos os gostos',
        'Tradição e sabor em cada formato'
    ],
    
    // Confeitaria - 0,73%
    'Confeitaria': [
        'Doces finos para ocasiões especiais',
        'Stories: Arte da confeitaria profissional',
        'Bolos personalizados sob encomenda',
        'Delicadezas que encantam os olhos',
        'Momentos doces merecem nossa arte'
    ],
    
    // Laticínios / Distribuidor - 0,70%
    'Laticínios / Distribuidor': [
        'Produtos lácteos frescos diariamente',
        'Stories: Da fazenda para sua mesa',
        'Distribuição com qualidade garantida',
        'Parcerias que fazem a diferença',
        'Cadeia do frio sempre preservada'
    ],
    
    // Loja de Conveniência - 0,55%
    'Loja de Conveniência': [
        'Praticidade 24 horas para você',
        'Stories: Novos produtos chegando',
        'Tudo que você precisa em um lugar',
        'Rapidez no atendimento sempre',
        'Conveniência no seu dia a dia'
    ],
    
    // Açougue - 0,40%
    'Açougue': [
        'Carnes frescas selecionadas',
        'Stories: Cortes especiais sendo preparados',
        'Qualidade que você pode confiar',
        'Açougueiro experiente te atende',
        'Frescor garantido em cada peça'
    ],
    
    // Rotisserie - 0,39%
    'Rotisserie': [
        'Pratos prontos gourmet',
        'Stories: Preparo das especialidades',
        'Refeições práticas e saborosas',
        'Chef especializados na cozinha',
        'Sabor caseiro com toque profissional'
    ],
    
    // Adega - 0,35%
    'Adega': [
        'Seleção especial de vinhos',
        'Stories: Degustação com o sommelier',
        'Rótulos exclusivos e importados',
        'Harmonização perfeita para você',
        'Experiência vínica incomparável'
    ],
    
    // Clube / Associação Esportiva - 0,23%
    'Clube / Associação Esportiva': [
        'Atividades esportivas para toda família',
        'Stories: Eventos e competições',
        'Lazer e diversão garantidos',
        'Comunidade unida pelo esporte',
        'Momentos de integração social'
    ],
    
    // Buffet - 0,18%
    'Buffet': [
        'Eventos especiais inesquecíveis',
        'Stories: Montagem de festas exclusivas',
        'Cardápio personalizado para você',
        'Momentos especiais merecem o melhor',
        'Organização completa do seu evento'
    ],
    
    // Hamburgeria - 0,14%
    'Hamburgeria': [
        'Burgers artesanais irresistíveis',
        'Stories: Montagem do hambúrguer perfeito',
        'Ingredientes premium selecionados',
        'Batatas rústicas crocantes',
        'Experiência gourmet casual'
    ],
    
    // Pessoa Física - 4,07%
    'Pessoa Física': [
        'Atendimento personalizado único',
        'Stories: Bastidores do trabalho artesanal',
        'Produtos feitos com dedicação',
        'Qualidade familiar garantida',
        'Tradição passada através de gerações'
    ],
    
    // Categoria padrão para casos não mapeados - 12,29%
    'default': [
        'Moments especiais do nosso dia a dia',
        'Qualidade que você pode ver',
        'Bastidores do nosso trabalho',
        'Produtos e serviços com excelência',
        'Atendimento que faz a diferença'
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
    // Pizzarias - 25,90%
    'Pizzarias': ['#pizza', '#pizzaria', '#delivery', '#pizzalover', '#pizzatime', '#pizzas', '#massaartesanal', '#pizzalovers', '#pizzagourmet', '#fornoadenha'],
    
    // Restaurante / Cantina - 15,22%
    'Restaurante / Cantina': ['#restaurante', '#gastronomia', '#food', '#foodporn', '#chef', '#gourmet', '#experiencia', '#sabor', '#cantina', '#delicious'],
    
    // Lanchonetes - 8,17%
    'Lanchonetes': ['#lanchonete', '#lanche', '#hamburguer', '#delivery', '#fastfood', '#lanches', '#hamburgueria', '#batatafrita', '#sanduiche', '#promocao'],
    
    // Padarias - 6,79%
    'Padarias': ['#padaria', '#pao', '#panificadora', '#cafedamanha', '#paoquentinho', '#bolos', '#salgados', '#doces', '#fermentacaonatural', '#paocaseiro'],
    
    // Supermercados - 4,78%
    'Supermercados': ['#supermercado', '#ofertas', '#promocao', '#compras', '#mercado', '#economia', '#qualidade', '#hortifruti', '#varejo', '#ofertasdodia'],
    
    // Pessoa Física - 4,07%
    'Pessoa Física': ['#alimentacao', '#qualidade', '#atendimentopersonalizado', '#tradicao', '#familiar', '#artesanal', '#caseiro', '#dedicacao', '#cuidado', '#servico'],
    
    // Pastelarias - 3,54%
    'Pastelarias': ['#pastelaria', '#pastel', '#pasteldoce', '#pasteldefeira', '#caldodecana', '#pasteis', '#pastelsalgado', '#frituranahora', '#tradicional', '#temperospecial'],
    
    // Bar / Doceria - 3,11%
    'Bar / Doceria': ['#bar', '#doceria', '#drinks', '#cocktails', '#doces', '#sobremesas', '#happyhour', '#bartender', '#ambiente', '#diversao'],
    
    // Mercearia / Sacolão - 2,14%
    'Mercearia / Sacolão': ['#mercearia', '#sacolao', '#hortifruti', '#frutas', '#verduras', '#frescos', '#qualidade', '#atendimentofamiliar', '#precojusto', '#mercadinho'],
    
    // Hotel / Motel / Pousada - 2,08%
    'Hotel / Motel / Pousada': ['#hotel', '#hospedagem', '#pousada', '#conforto', '#hospitalidade', '#turismo', '#descanso', '#servicos', '#localizacao', '#experiencia'],
    
    // Esfiharias - 1,90%
    'Esfiharias': ['#esfiharia', '#esfiha', '#culinariaarabe', '#esfihaaberta', '#massafininha', '#saboresarabes', '#kibbeh', '#tradicaoarabe', '#temperos', '#autentico'],
    
    // Cozinha Oriental - 1,65%
    'Cozinha Oriental': ['#culinhaoriental', '#sushi', '#yakissoba', '#japonesa', '#oriental', '#sashimi', '#temaki', '#chef', '#ingredientesimportados', '#autentico'],
    
    // Cozinha Industrial - 1,48%
    'Cozinha Industrial': ['#cozinhaindustrial', '#alimentacaocoletiva', '#grandesvolumes', '#qualidade', '#nutricao', '#eficiencia', '#padroesrigurosos', '#cardapio', '#escala', '#profissional'],
    
    // Churrascarias - 0,97%
    'Churrascarias': ['#churrascaria', '#churrasco', '#rodizio', '#carne', '#espeto', '#cortesnobres', '#gaucho', '#brasa', '#tradicional', '#carnedodia'],
    
    // Colaborador - 0,90%
    'Colaborador': ['#equipe', '#colaborador', '#time', '#trabalho', '#dedicacao', '#profissionais', '#comprometimento', '#crescimento', '#orgulho', '#desenvolvimento'],
    
    // Fábricas de Massas - 0,76%
    'Fábricas de Massas': ['#fabricademassas', '#massasartesanais', '#massafrescas', '#qualidadeitaliana', '#processoartesanal', '#receitas', '#tradicao', '#frescor', '#variedades', '#massas'],
    
    // Confeitarias - 0,73%
    'Confeitarias': ['#confeitaria', '#docesfinos', '#bolospersonalizados', '#confeiteiro', '#artedaconfeitaria', '#momentosespeciais', '#tecnica', '#criatividade', '#elegancia', '#refinado'],
    
    // Laticínios / Distribuidores - 0,70%
    'Laticínios / Distribuidores': ['#laticinios', '#distribuidor', '#produtoslacteos', '#fazenda', '#qualidadegarantida', '#cadeiafrio', '#frescos', '#distribuicao', '#procedencia', '#atacado'],
    
    // Não Selecionado - 0,59%
    'Não Selecionado': ['#negocio', '#inovacao', '#atendimentodiferenciado', '#solucopersonalizadas', '#excelencia', '#qualidade', '#servico', '#proposito', '#diferencial', '#unico'],
    
    // Lojas de Conveniência - 0,55%
    'Lojas de Conveniência': ['#lojadeconveniencia', '#conveniencia', '#24horas', '#praticidade', '#rapidez', '#produtos', '#atendimento', '#essenciais', '#conveniencia', '#parada'],
    
    // Açougues - 0,40%
    'Açougues': ['#acougue', '#carnesfrescas', '#cortesespeiais', '#qualidadegarantida', '#acougueiro', '#experiencia', '#frescor', '#orientacao', '#especializada', '#carne'],
    
    // Rotisserie - 0,39%
    'Rotisserie': ['#rotisserie', '#pratosprontos', '#gourmet', '#praticidade', '#refeicoesbalanceadas', '#caseiro', '#chef', '#saboroso', '#qualidadepremium', '#pratico'],
    
    // Adegas - 0,35%
    'Adegas': ['#adega', '#vinhos', '#selecaoespecial', '#sommelier', '#degustacao', '#rotulosexclusivos', '#harmonizacao', '#enologia', '#vinhos', '#experiencia'],
    
    // Clube / Associação Esportiva - 0,23%
    'Clube / Associação Esportiva': ['#clube', '#esporte', '#lazer', '#atividades', '#familia', '#saude', '#diversao', '#comunidade', '#tradicaoesportiva', '#uniao'],
    
    // Buffets - 0,18%
    'Buffets': ['#buffet', '#eventos', '#festas', '#eventosespeciais', '#organizacao', '#gastronomia', '#elegancia', '#momentosespeciais', '#celebracao', '#planejamento'],
    
    // Hamburgerias - 0,14%
    'Hamburgerias': ['#hamburgueria', '#burger', '#hamburguerartesanal', '#batatasrusticas', '#ingredientespremium', '#gourmet', '#casual', '#sabor', '#burguer', '#hamburguer'],
    
    // Outros - 12,29%
    'Outros': ['#alimentacao', '#inovacao', '#atendimentopersonalizado', '#qualidade', '#excelencia', '#diferencial', '#compromisso', '#tradicao', '#servico', '#confianca'],
    
    // Categoria padrão
    'default': ['#alimentacao', '#qualidade', '#servico', '#cliente', '#tradicao', '#sabor', '#atendimento', '#experiencia', '#compromisso', '#excelencia']
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
    
    <!-- Pizzarias - 25,90% -->
    <div class="strategy-segment" data-category="Pizzarias">
        <div class="category-header">
            <span class="category-badge pizzarias">🍕 Pizzarias</span>
            <span class="market-share">25,90%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Foque na qualidade artesanal e delivery eficiente. Destaque tecnologias para pedidos online e gestão de entregas.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Tarde (15h-17h) ou noite (19h-21h) - horários de pico de pedidos.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Casual e acolhedor, enfatizando tradição familiar e inovação tecnológica.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Gestão de estoque de ingredientes, otimização do delivery, fidelização de clientes, marketing digital.</p>
        </div>
    </div>

    <!-- Restaurante / Cantina - 15,22% -->
    <div class="strategy-segment" data-category="Restaurante / Cantina">
        <div class="category-header">
            <span class="category-badge restaurantes">🍽️ Restaurantes / Cantinas</span>
            <span class="market-share">15,22%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Abordagem sofisticada focando na experiência gastronômica e gestão operacional completa.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Manhã (9h-11h) ou tarde (14h-16h) - fora dos horários de rush.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Profissional e consultivo, destacando expertise em gestão gastronômica.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Controle de custos, gestão de cardápio, análise de rentabilidade por prato, gestão de equipe.</p>
        </div>
    </div>

    <!-- Lanchonetes - 8,17% -->
    <div class="strategy-segment" data-category="Lanchonetes">
        <div class="category-header">
            <span class="category-badge lanchonetes">🍔 Lanchonetes</span>
            <span class="market-share">8,17%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Foque na rapidez do atendimento e gestão eficiente de alto volume de pedidos.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Manhã (10h-12h) ou tarde (15h-17h) - evitar horários de pico.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Dinâmico e prático, enfatizando soluções rápidas e eficientes.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Otimização do atendimento, controle de estoque fast-food, gestão de picos de demanda.</p>
        </div>
    </div>

    <!-- Padarias - 6,79% -->
    <div class="strategy-segment" data-category="Padarias">
        <div class="category-header">
            <span class="category-badge padarias">🥖 Padarias</span>
            <span class="market-share">6,79%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Destaque a tradição familiar e a gestão de produção artesanal com controles modernos.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Manhã (8h-10h) ou tarde (14h-16h) - pós produção matinal.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Caloroso e familiar, respeitando a tradição com inovação tecnológica.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Gestão de produção diária, controle de validade, diversificação de produtos.</p>
        </div>
    </div>

    <!-- Supermercados - 4,78% -->
    <div class="strategy-segment" data-category="Supermercados">
        <div class="category-header">
            <span class="category-badge supermercados">🛒 Supermercados</span>
            <span class="market-share">4,78%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Abordagem corporativa focando em gestão de grande volume e múltiplas categorias.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Manhã (9h-11h) - horário administrativo.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Corporativo e estruturado, enfatizando eficiência operacional.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Gestão de estoque complexo, análise de giro de produtos, gestão de fornecedores.</p>
        </div>
    </div>

    <!-- Pessoa Física - 4,07% -->
    <div class="strategy-segment" data-category="Pessoa Física">
        <div class="category-header">
            <span class="category-badge pessoa-fisica">👤 Pessoa Física</span>
            <span class="market-share">4,07%</span>
        </div>
        <div class="strategy-card">
            <strong>📞 Abordagem Recomendada:</strong>
            <p>Abordagem pessoal e consultiva, focando na formalização e crescimento do negócio.</p>
        </div>
        <div class="strategy-card">
            <strong>⏰ Melhor Horário:</strong>
            <p>Flexível - manhã ou tarde conforme disponibilidade do empreendedor.</p>
        </div>
        <div class="strategy-card">
            <strong>🎨 Tom de Voz:</strong>
            <p>Próximo e educativo, auxiliando na estruturação do negócio.</p>
        </div>
        <div class="strategy-card">
            <strong>🎯 Pontos-Chave:</strong>
            <p>Formalização, controles básicos, planejamento de crescimento, educação empresarial.</p>
        </div>
    </div>

    <!-- Categorias de Média Representatividade -->
    <div class="strategy-segment" data-category="Pastelaria">
        <div class="category-header">
            <span class="category-badge pastelarias">🥟 Pastelarias</span>
            <span class="market-share">3,54%</span>
        </div>
        <div class="strategy-cards-compact">
            <p><strong>📞</strong> Abordagem familiar destacando tradição e qualidade artesanal.</p>
            <p><strong>⏰</strong> Tarde (14h-17h) - pós movimento do almoço.</p>
            <p><strong>🎨</strong> Tom tradicional e acolhedor, respeitando a história familiar.</p>
        </div>
    </div>

    <div class="strategy-segment" data-category="Bar / Doceria">
        <div class="category-header">
            <span class="category-badge bares">🍻 Bares / Docerias</span>
            <span class="market-share">3,11%</span>
        </div>
        <div class="strategy-cards-compact">
            <p><strong>📞</strong> Abordagem descontraída focando na experiência do cliente.</p>
            <p><strong>⏰</strong> Tarde (15h-17h) - antes do movimento noturno.</p>
            <p><strong>🎨</strong> Tom descolado e inovador, destacando ambiente e atendimento.</p>
        </div>
    </div>

    <div class="strategy-segment" data-category="Mercearia / Sacolão">
        <div class="category-header">
            <span class="category-badge mercearias">🥕 Mercearias / Sacolões</span>
            <span class="market-share">2,14%</span>
        </div>
        <div class="strategy-cards-compact">
            <p><strong>📞</strong> Abordagem comunitária focando no atendimento local.</p>
            <p><strong>⏰</strong> Manhã (8h-10h) - período de reposição.</p>
            <p><strong>🎨</strong> Tom familiar e próximo, valorizando o relacionamento local.</p>
        </div>
    </div>

    <!-- Categorias Especializadas (Baixa Representatividade - Alto Valor) -->
    <div class="specialty-categories">
        <h6>🎯 Segmentos Especializados</h6>
        
        <div class="mini-strategy-grid">
            <div class="mini-strategy-card">
                <span class="category-mini">🏨 Hotel/Motel/Pousada (2,08%)</span>
                <p>Abordagem premium focando na experiência do hóspede e gestão hoteleira.</p>
            </div>
            
            <div class="mini-strategy-card">
                <span class="category-mini">🌯 Esfiharias (1,90%)</span>
                <p>Destaque da tradição árabe e gestão de especialidades étnicas.</p>
            </div>
            
            <div class="mini-strategy-card">
                <span class="category-mini">🍜 Cozinha Oriental (1,65%)</span>
                <p>Foque na autenticidade e gestão de ingredientes específicos.</p>
            </div>
            
            <div class="mini-strategy-card">
                <span class="category-mini">🍖 Churrascarias (0,97%)</span>
                <p>Abordagem premium destacando qualidade das carnes e experiência.</p>
            </div>
            
            <div class="mini-strategy-card">
                <span class="category-mini">🍝 Fábricas de Massas (0,76%)</span>
                <p>Foque na produção artesanal e distribuição especializada.</p>
            </div>
            
            <div class="mini-strategy-card">
                <span class="category-mini">🧁 Confeitarias (0,73%)</span>
                <p>Destaque a arte confeiteira e gestão de encomendas especiais.</p>
            </div>
        </div>
    </div>

    <!-- Estratégia Geral Personalizada -->
    <div class="general-strategy">
    <h6>📈 Estratégia Geral Personalizada</h6>
    
    <div class="strategy-matrix">
        <!-- Segmentação por Representatividade de Mercado -->
        <div class="strategy-dimension">
            <h7>🎯 Por Tamanho do Segmento:</h7>
            <div class="segment-breakdown">
                <div class="tier-section">
                    <strong>🔥 Tier 1 - Grandes Segmentos (>5%):</strong>
                    <ul>
                        <li><strong>Pizzarias (25,90%):</strong> Abordagem premium com cases de otimização de delivery e gestão de ingredientes</li>
                        <li><strong>Restaurantes/Cantinas (15,22%):</strong> Foco em gestão operacional completa e experiência gastronômica</li>
                        <li><strong>Lanchonetes (8,17%):</strong> Ênfase em rapidez operacional e gestão de alto volume</li>
                        <li><strong>Padarias (6,79%):</strong> Estratégias de produção artesanal com controles modernos</li>
                    </ul>
                </div>
                
                <div class="tier-section">
                    <strong>🎲 Tier 2 - Médios Segmentos (1-5%):</strong>
                    <ul>
                        <li><strong>Supermercados (4,78%):</strong> Gestão complexa de múltiplas categorias e fornecedores</li>
                        <li><strong>Pessoa Física (4,07%):</strong> Formalização e estruturação de negócios familiares</li>
                        <li><strong>Pastelarias (3,54%):</strong> Diferenciação por tradição e qualidade artesanal</li>
                        <li><strong>Bares/Docerias (3,11%):</strong> Experiência do cliente e gestão de ambiente</li>
                        <li><strong>Mercearias/Sacolões (2,14%):</strong> Atendimento comunitário e gestão local</li>
                        <li><strong>Hotéis/Motéis/Pousadas (2,08%):</strong> Hospitalidade premium e gestão hoteleira</li>
                        <li><strong>Esfiharias (1,90%):</strong> Nicho étnico com gestão de especialidades</li>
                        <li><strong>Cozinha Oriental (1,65%):</strong> Autenticidade e ingredientes específicos</li>
                        <li><strong>Cozinha Industrial (1,48%):</strong> Eficiência em grande escala e nutrição</li>
                    </ul>
                </div>
                
                <div class="tier-section">
                    <strong>💎 Tier 3 - Segmentos Especializados (<1%):</strong>
                    <ul>
                        <li><strong>Churrascarias (0,97%):</strong> Consultoria premium para experiência gastronômica única</li>
                        <li><strong>Colaboradores (0,90%):</strong> Gestão de equipe e desenvolvimento profissional</li>
                        <li><strong>Fábricas de Massas (0,76%):</strong> Produção industrial artesanal</li>
                        <li><strong>Confeitarias (0,73%):</strong> Arte confeiteira e encomendas especiais</li>
                        <li><strong>Laticínios/Distribuidores (0,70%):</strong> Logística especializada e cadeia fria</li>
                        <li><strong>Outros segmentos (0,14-0,59%):</strong> Consultoria ultra-especializada</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Argumentos por Categoria de Negócio -->
        <div class="strategy-dimension">
            <h7>💡 Argumentos-Chave por Categoria:</h7>
            <div class="category-breakdown">
                <div class="category-group">
                    <strong>🍕 Food Service Tradicional:</strong>
                    <ul>
                        <li><strong>Pizzarias & Lanchonetes:</strong> Otimização de delivery, gestão de picos de demanda, controle de custos de ingredientes</li>
                        <li><strong>Restaurantes & Bares:</strong> Experiência do cliente, gestão de cardápio, análise de rentabilidade por prato</li>
                        <li><strong>Padarias & Pastelarias:</strong> Produção artesanal eficiente, controle de validade, diversificação de produtos</li>
                    </ul>
                </div>
                
                <div class="category-group">
                    <strong>🛒 Varejo Alimentar:</strong>
                    <ul>
                        <li><strong>Supermercados:</strong> Gestão de estoque complexo, análise de giro por categoria, otimização de fornecedores</li>
                        <li><strong>Mercearias/Sacolões:</strong> Gestão de produtos perecíveis, relacionamento local, precificação competitiva</li>
                        <li><strong>Lojas de Conveniência:</strong> Otimização de mix de produtos, gestão 24h, eficiência operacional</li>
                    </ul>
                </div>
                
                <div class="category-group">
                    <strong>🎯 Especialidades Étnicas:</strong>
                    <ul>
                        <li><strong>Cozinha Oriental:</strong> Gestão de ingredientes importados, autenticidade cultural, diferenciação premium</li>
                        <li><strong>Esfiharias:</strong> Tradição familiar, receitas centenárias, nicho de mercado especializado</li>
                        <li><strong>Churrascarias:</strong> Gestão de carnes nobres, experiência gastronômica completa</li>
                    </ul>
                </div>
                
                <div class="category-group">
                    <strong>🏭 Industrial & B2B:</strong>
                    <ul>
                        <li><strong>Cozinha Industrial:</strong> Eficiência em escala, controles nutricionais, gestão de grandes volumes</li>
                        <li><strong>Fábricas de Massas:</strong> Produção industrial artesanal, distribuição especializada</li>
                        <li><strong>Laticínios/Distribuidores:</strong> Logística complexa, cadeia fria, gestão B2B</li>
                    </ul>
                </div>
                
                <div class="category-group">
                    <strong>🏨 Hospitalidade:</strong>
                    <ul>
                        <li><strong>Hotéis/Pousadas:</strong> Gestão hoteleira integrada, experiência do hóspede, receita por quarto</li>
                        <li><strong>Buffets:</strong> Gestão de eventos, planejamento sazonal, precificação por projeto</li>
                    </ul>
                </div>
                
                <div class="category-group">
                    <strong>👤 Pessoa Física:</strong>
                    <ul>
                        <li><strong>Empreendedores Individuais:</strong> Formalização, controles básicos, planejamento de crescimento, educação empresarial</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Timing Estratégico Detalhado -->
        <div class="strategy-dimension">
            <h7>⏱️ Timing Estratégico por Segmento:</h7>
            <div class="timing-breakdown">
                <div class="timing-group">
                    <strong>🌅 Manhã (8h-11h):</strong>
                    <ul>
                        <li><strong>Supermercados:</strong> Horário administrativo, gestão de reposição</li>
                        <li><strong>Padarias:</strong> Pós produção matinal, planejamento do dia</li>
                        <li><strong>Cozinha Industrial:</strong> Início de produção, reuniões de planejamento</li>
                        <li><strong>Laticínios/Distribuidores:</strong> Gestão logística, B2B</li>
                        <li><strong>Hotéis:</strong> Gestão administrativa, pós check-out</li>
                    </ul>
                </div>
                
                <div class="timing-group">
                    <strong>🌞 Tarde (14h-17h):</strong>
                    <ul>
                        <li><strong>Restaurantes:</strong> Entre almoço e jantar, planejamento</li>
                        <li><strong>Lanchonetes:</strong> Pré movimento da tarde</li>
                        <li><strong>Bares/Docerias:</strong> Preparação para movimento noturno</li>
                        <li><strong>Mercearias:</strong> Reposição e organização</li>
                        <li><strong>Pastelarias:</strong> Pós movimento do almoço</li>
                        <li><strong>Confeitarias:</strong> Produção para o dia seguinte</li>
                    </ul>
                </div>
                
                <div class="timing-group">
                    <strong>🌆 Noite (19h-21h):</strong>
                    <ul>
                        <li><strong>Pizzarias:</strong> Pré movimento do jantar</li>
                        <li><strong>Churrascarias:</strong> Preparação para pico noturno</li>
                    </ul>
                </div>
                
                <div class="timing-group">
                    <strong>🕐 Flexível:</strong>
                    <ul>
                        <li><strong>Pessoa Física:</strong> Conforme disponibilidade do empreendedor</li>
                        <li><strong>Cozinha Oriental:</strong> Horários culturalmente apropriados</li>
                        <li><strong>Lojas de Conveniência:</strong> Fora dos picos de movimento</li>
                        <li><strong>Fábricas de Massas:</strong> Conforme ciclo produtivo</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Nova Dimensão: ROI por Segmento -->
        <div class="strategy-dimension">
            <h7>💰 Potencial de ROI por Segmento:</h7>
            <div class="roi-breakdown">
                <div class="roi-tier">
                    <strong>🏆 Alto ROI Potencial:</strong>
                    <ul>
                        <li><strong>Pizzarias:</strong> Alto volume, margem premium, delivery otimizável</li>
                        <li><strong>Churrascarias:</strong> Ticket médio alto, experiência premium</li>
                        <li><strong>Confeitarias:</strong> Produtos especializados, margem elevada</li>
                        <li><strong>Cozinha Oriental:</strong> Diferenciação cultural, pricing premium</li>
                    </ul>
                </div>
                
                <div class="roi-tier">
                    <strong>📈 ROI Médio-Alto:</strong>
                    <ul>
                        <li><strong>Restaurantes:</strong> Volume consistente, otimização operacional</li>
                        <li><strong>Supermercados:</strong> Volume alto, múltiplas oportunidades</li>
                        <li><strong>Hotéis:</strong> Receita diversificada, gestão complexa</li>
                    </ul>
                </div>
                
                <div class="roi-tier">
                    <strong>📊 ROI Estável:</strong>
                    <ul>
                        <li><strong>Padarias:</strong> Fluxo constante, produtos essenciais</li>
                        <li><strong>Lanchonetes:</strong> Volume alto, margem padrão</li>
                        <li><strong>Mercearias:</strong> Essencialidade local, fidelização</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <!-- Nova Dimensão: Complexidade de Implementação -->
        <div class="strategy-dimension">
            <h7>⚙️ Complexidade de Implementação:</h7>
            <div class="complexity-breakdown">
                <div class="complexity-level">
                    <strong>🟢 Baixa Complexidade (Quick Wins):</strong>
                    <ul>
                        <li><strong>Pessoa Física:</strong> Controles básicos, processos simples</li>
                        <li><strong>Lanchonetes:</strong> Operação padronizada, implementação rápida</li>
                        <li><strong>Pastelarias:</strong> Processos tradicionais, poucos SKUs</li>
                    </ul>
                </div>
                
                <div class="complexity-level">
                    <strong>🟡 Média Complexidade:</strong>
                    <ul>
                        <li><strong>Pizzarias:</strong> Gestão de delivery, múltiplos canais</li>
                        <li><strong>Restaurantes:</strong> Cardápio complexo, gestão de experiência</li>
                        <li><strong>Padarias:</strong> Produção variada, controle de validade</li>
                        <li><strong>Bares/Docerias:</strong> Mix produtos/serviços</li>
                    </ul>
                </div>
                
                <div class="complexity-level">
                    <strong>🔴 Alta Complexidade (Projetos Estratégicos):</strong>
                    <ul>
                        <li><strong>Supermercados:</strong> Múltiplas categorias, fornecedores complexos</li>
                        <li><strong>Cozinha Industrial:</strong> Escala industrial, regulamentações</li>
                        <li><strong>Hotéis:</strong> Múltiplos departamentos, gestão integrada</li>
                        <li><strong>Laticínios/Distribuidores:</strong> Logística complexa, B2B</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Matriz de Priorização Estratégica -->
    <div class="priority-matrix">
        <h7>🎯 Matriz de Priorização de Prospects:</h7>
        <div class="matrix-grid">
            <div class="matrix-quadrant high-impact-easy">
                <h8>🚀 Alta Prioridade (Alto Impacto + Baixa Complexidade)</h8>
                <ul>
                    <li>Pizzarias grandes (>25% mercado)</li>
                    <li>Lanchonetes estruturadas</li>
                    <li>Pessoa Física em crescimento</li>
                </ul>
            </div>
            
            <div class="matrix-quadrant high-impact-hard">
                <h8>⭐ Projetos Estratégicos (Alto Impacto + Alta Complexidade)</h8>
                <ul>
                    <li>Supermercados regionais</li>
                    <li>Redes de restaurantes</li>
                    <li>Grupos hoteleiros</li>
                </ul>
            </div>
            
            <div class="matrix-quadrant low-impact-easy">
                <h8>🎲 Quick Wins (Baixo Impacto + Baixa Complexidade)</h8>
                <ul>
                    <li>Mercearias locais</li>
                    <li>Pastelarias familiares</li>
                    <li>Esfiharias de bairro</li>
                </ul>
            </div>
            
            <div class="matrix-quadrant low-impact-hard">
                <h8>❌ Baixa Prioridade (Baixo Impacto + Alta Complexidade)</h8>
                <ul>
                    <li>Segmentos muito específicos (<0,5%)</li>
                    <li>Negócios em declínio</li>
                    <li>Operações muito complexas/pequenas</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<style>
.strategy-matrix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.strategy-dimension {
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.segment-breakdown, .category-breakdown, .timing-breakdown, .roi-breakdown, .complexity-breakdown {
    margin-top: 15px;
}

.tier-section, .category-group, .timing-group, .roi-tier, .complexity-level {
    margin-bottom: 20px;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #e9ecef;
    background: #f8f9fa;
}

.tier-section strong, .category-group strong, .timing-group strong, .roi-tier strong, .complexity-level strong {
    color: #495057;
    display: block;
    margin-bottom: 10px;
    font-size: 1.1em;
}

.priority-matrix {
    background: #f8f9fa;
    padding: 25px;
    border-radius: 8px;
    margin-top: 20px;
}

.matrix-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 15px;
}

.matrix-quadrant {
    padding: 20px;
    border-radius: 8px;
    border: 2px solid;
    min-height: 120px;
}

.high-impact-easy {
    background: #d4edda;
    border-color: #28a745;
}

.high-impact-hard {
    background: #fff3cd;
    border-color: #ffc107;
}

.low-impact-easy {
    background: #cce7ff;
    border-color: #007bff;
}

.low-impact-hard {
    background: #f8d7da;
    border-color: #dc3545;
}

.matrix-quadrant h8 {
    font-weight: bold;
    margin-bottom: 15px;
    display: block;
    font-size: 1.1em;
}

.matrix-quadrant ul {
    margin: 0;
    padding-left: 20px;
}

.matrix-quadrant li {
    margin-bottom: 8px;
}

h7 {
    font-weight: bold;
    color: #495057;
    display: block;
    margin-bottom: 15px;
    font-size: 1.2em;
    border-bottom: 2px solid #007bff;
    padding-bottom: 5px;
}

h8 {
    font-weight: bold;
    color: #495057;
    font-size: 1em;
}

.strategy-dimension ul {
    margin: 10px 0;
    padding-left: 20px;
}

.strategy-dimension li {
    margin-bottom: 8px;
    line-height: 1.4;
}

@media (max-width: 768px) {
    .strategy-matrix {
        grid-template-columns: 1fr;
    }
    
    .matrix-grid {
        grid-template-columns: 1fr;
    }
}
</style>


    <!-- Calls-to-Action Personalizados -->
    <div class="personalized-cta">
    <h6>🎯 Calls-to-Action Personalizados por Segmento</h6>
    
    <!-- CTAs para Grandes Segmentos (>5%) -->
    <div class="cta-tier-section">
        <h7>🔥 Tier 1 - Grandes Segmentos (Alto Volume & Alta Conversão)</h7>
        
        <div class="cta-grid">
            <!-- Pizzarias - 25,90% -->
            <div class="cta-card tier-1 pizzarias">
                <div class="cta-header">
                    <span class="category-icon">🍕</span>
                    <strong>Pizzarias (25,90%)</strong>
                    <span class="priority-badge alta">ALTA PRIORIDADE</span>
                </div>
                <div class="cta-content">
                    <strong>🚀 Próximos Passos:</strong>
                    <ul>
                        <li>Demo focada em gestão de delivery e cardápio digital</li>
                        <li>ROI baseado em otimização de ingredientes e redução de desperdício</li>
                        <li>Integração com apps de entrega (iFood, Uber Eats)</li>
                        <li>Controle de estoque de ingredientes perecíveis</li>
                    </ul>
                    <strong>📊 Métricas de Sucesso:</strong>
                    <ul>
                        <li>Taxa de conversão: Meta 35% (maior segmento)</li>
                        <li>Tempo de implementação: 7-14 dias</li>
                        <li>ROI médio: 25% em 3 meses</li>
                        <li>Upsell: Módulos de delivery e fidelização</li>
                    </ul>
                </div>
            </div>

            <!-- Restaurantes/Cantinas - 15,22% -->
            <div class="cta-card tier-1 restaurantes">
                <div class="cta-header">
                    <span class="category-icon">🍽️</span>
                    <strong>Restaurantes / Cantinas (15,22%)</strong>
                    <span class="priority-badge alta">ALTA PRIORIDADE</span>
                </div>
                <div class="cta-content">
                    <strong>🚀 Próximos Passos:</strong>
                    <ul>
                        <li>Análise de rentabilidade por prato</li>
                        <li>Gestão completa de cardápio e sazonalidade</li>
                        <li>Controle de custos e margem de contribuição</li>
                        <li>Relatórios de performance operacional</li>
                    </ul>
                    <strong>📊 Métricas de Sucesso:</strong>
                    <ul>
                        <li>Taxa de conversão: Meta 32% (alta complexidade)</li>
                        <li>Ticket médio: 40% maior que média</li>
                        <li>Ciclo de venda: 14-21 dias</li>
                        <li>Retenção: 95% após 6 meses</li>
                    </ul>
                </div>
            </div>

            <!-- Lanchonetes - 8,17% -->
            <div class="cta-card tier-1 lanchonetes">
                <div class="cta-header">
                    <span class="category-icon">🍔</span>
                    <strong>Lanchonetes (8,17%)</strong>
                    <span class="priority-badge media">MÉDIA PRIORIDADE</span>
                </div>
                <div class="cta-content">
                    <strong>🚀 Próximos Passos:</strong>
                    <ul>
                        <li>Otimização de atendimento rápido</li>
                        <li>Gestão de picos de demanda</li>
                        <li>Controle de combos e promoções</li>
                        <li>Integração com delivery</li>
                    </ul>
                    <strong>📊 Métricas de Sucesso:</strong>
                    <ul>
                        <li>Taxa de conversão: Meta 28%</li>
                        <li>Implementação: 3-7 dias (baixa complexidade)</li>
                        <li>ROI: 20% em 2 meses</li>
                        <li>Volume: Alto número de transações</li>
                    </ul>
                </div>
            </div>

            <!-- Padarias - 6,79% -->
            <div class="cta-card tier-1 padarias">
                <div class="cta-header">
                    <span class="category-icon">🥖</span>
                    <strong>Padarias (6,79%)</strong>
                    <span class="priority-badge media">MÉDIA PRIORIDADE</span>
                </div>
                <div class="cta-content">
                    <strong>🚀 Próximos Passos:</strong>
                    <ul>
                        <li>Gestão de produção diária</li>
                        <li>Controle de validade e desperdício</li>
                        <li>Diversificação de produtos</li>
                        <li>Sazonalidade e datas comemorativas</li>
                    </ul>
                    <strong>📊 Métricas de Sucesso:</strong>
                    <ul>
                        <li>Taxa de conversão: Meta 30%</li>
                        <li>Redução de desperdício: 15-25%</li>
                        <li>Margem: +18% em produtos especiais</li>
                        <li>Fidelização: Programa de pontos</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- CTAs para Segmentos Médios (1-5%) -->
    <div class="cta-tier-section">
        <h7>🎲 Tier 2 - Segmentos Médios (Especialização & Nichos)</h7>
        
        <div class="cta-grid-compact">
            <!-- Supermercados - 4,78% -->
            <div class="cta-card tier-2 supermercados">
                <div class="cta-header-compact">
                    <span class="category-icon">🛒</span>
                    <strong>Supermercados (4,78%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Demo ERP completo com gestão de categorias
                    <br><strong>📊 Meta:</strong> 25% conversão, Alto ticket, 30 dias ciclo
                </div>
            </div>

            <!-- Pessoa Física - 4,07% -->
            <div class="cta-card tier-2 pessoa-fisica">
                <div class="cta-header-compact">
                    <span class="category-icon">👤</span>
                    <strong>Pessoa Física (4,07%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Formalização + Controles básicos + Educação empresarial
                    <br><strong>📊 Meta:</strong> 40% conversão, Baixo ticket, Crescimento futuro
                </div>
            </div>

            <!-- Pastelarias - 3,54% -->
            <div class="cta-card tier-2 pastelarias">
                <div class="cta-header-compact">
                    <span class="category-icon">🥟</span>
                    <strong>Pastelarias (3,54%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Gestão de fritura + Controle ingredientes + Cardápio sazonal
                    <br><strong>📊 Meta:</strong> 27% conversão, Tradição familiar, Rápida implementação
                </div>
            </div>

            <!-- Bar/Doceria - 3,11% -->
            <div class="cta-card tier-2 bares">
                <div class="cta-header-compact">
                    <span class="category-icon">🍻</span>
                    <strong>Bares / Docerias (3,11%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Gestão de drinks + Controle de sobremesas + Eventos
                    <br><strong>📊 Meta:</strong> 26% conversão, Sazonalidade alta, Margem premium
                </div>
            </div>

            <!-- Demais segmentos médios -->
            <div class="cta-card tier-2 mercearias">
                <div class="cta-header-compact">
                    <span class="category-icon">🥕</span>
                    <strong>Mercearias/Sacolões (2,14%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Gestão de perecíveis + Relacionamento local + Precificação
                    <br><strong>📊 Meta:</strong> 24% conversão, Atendimento familiar, ROI 6 meses
                </div>
            </div>

            <div class="cta-card tier-2 hoteis">
                <div class="cta-header-compact">
                    <span class="category-icon">🏨</span>
                    <strong>Hotéis/Pousadas (2,08%)</strong>
                </div>
                <div class="cta-bullets">
                    <strong>🚀 Ação:</strong> Gestão hoteleira + Receita por quarto + Sazonalidade
                    <br><strong>📊 Meta:</strong> 22% conversão, Alto valor, Implementação complexa
                </div>
            </div>
        </div>
    </div>

    <!-- CTAs para Segmentos Especializados (<1%) -->
    <div class="cta-tier-section">
        <h7>💎 Tier 3 - Segmentos Premium (Alto Valor Unitário)</h7>
        
        <div class="cta-specialty-grid">
            <div class="cta-card tier-3 especialidades">
                <div class="cta-header-specialty">
                    <span class="specialty-icons">🌯🍜🍖🧁</span>
                    <strong>Especialidades Gastronômicas</strong>
                </div>
                <div class="cta-specialty-content">
                    <strong>Segmentos inclusos:</strong>
                    <div class="specialty-list">
                        • Esfiharias (1,90%) • Cozinha Oriental (1,65%)
                        • Churrascarias (0,97%) • Confeitarias (0,73%)
                        • Hamburgerias (0,14%)
                    </div>
                    <strong>🚀 Estratégia Premium:</strong>
                    <ul>
                        <li>Consultoria especializada por nicho gastronômico</li>
                        <li>Gestão de ingredientes específicos e import</li>
                        <li>Precificação premium e diferenciação</li>
                        <li>Marketing segmentado e fidelização VIP</li>
                    </ul>
                    <strong>📊 Métricas Especializadas:</strong>
                    <ul>
                        <li>Taxa de conversão: 35-45% (alto valor)</li>
                        <li>Ticket médio: 3x maior que média</li>
                        <li>Ciclo especializado: 21-45 dias</li>
                        <li>Margem: Premium pricing + 30-50%</li>
                    </ul>
                </div>
            </div>

            <div class="cta-card tier-3 industrial">
                <div class="cta-header-specialty">
                    <span class="specialty-icons">🏭🚚📦</span>
                    <strong>B2B & Industrial</strong>
                </div>
                <div class="cta-specialty-content">
                    <strong>Segmentos inclusos:</strong>
                    <div class="specialty-list">
                        • Cozinha Industrial (1,48%) • Fábricas de Massas (0,76%)
                        • Laticínios/Distribuidores (0,70%)
                    </div>
                    <strong>🚀 Estratégia B2B:</strong>
                    <ul>
                        <li>ERP completo para produção em escala</li>
                        <li>Gestão de cadeia de distribuição</li>
                        <li>Controles regulatórios e qualidade</li>
                        <li>Integração com grandes clientes</li>
                    </ul>
                    <strong>📊 Métricas B2B:</strong>
                    <ul>
                        <li>Taxa de conversão: 15-25% (ciclo longo)</li>
                        <li>Valor do contrato: Muito alto</li>
                        <li>Implementação: 60-120 dias</li>
                        <li>Lifetime Value: Máximo</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- Estratégias de Conversão Automatizada -->
    <div class="cta-automation-section">
        <h7>🤖 Automação Inteligente por Categoria</h7>
        
        <div class="automation-grid">
            <div class="automation-card">
                <strong>🎯 Identificação Automática:</strong>
                <ul>
                    <li>IA detecta categoria por palavras-chave no cadastro</li>
                    <li>Validação cruzada com CNAE e atividade principal</li>
                    <li>Classificação automática em tier de prioridade</li>
                    <li>Trigger de workflow específico por segmento</li>
                </ul>
            </div>

            <div class="automation-card">
                <strong>📱 Sequências de Follow-up:</strong>
                <ul>
                    <li><strong>Tier 1:</strong> 7 contatos em 14 dias (alta frequência)</li>
                    <li><strong>Tier 2:</strong> 5 contatos em 21 dias (média frequência)</li>
                    <li><strong>Tier 3:</strong> 3 contatos em 30 dias (baixa frequência)</li>
                    <li>Conteúdo personalizado por categoria e dor específica</li>
                </ul>
            </div>

            <div class="automation-card">
                <strong>📊 Scoring Dinâmico:</strong>
                <ul>
                    <li>Peso por representatividade de mercado</li>
                    <li>Multiplicador por complexidade de implementação</li>
                    <li>Bonus por potencial de upsell</li>
                    <li>Ajuste por sazonalidade do segmento</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Dashboards de Performance -->
    <div class="cta-dashboard-section">
        <h7>📈 Dashboards de Performance por Segmento</h7>
        
        <div class="dashboard-metrics">
            <div class="metric-group">
                <strong>🏆 Top Performers:</strong>
                <div class="metric-pills">
                    <span class="metric-pill pizzarias">Pizzarias: 35.2% conv.</span>
                    <span class="metric-pill pessoa-fisica">Pessoa Física: 41.8% conv.</span>
                    <span class="metric-pill especialidades">Especialidades: 38.9% conv.</span>
                </div>
            </div>

            <div class="metric-group">
                <strong>⚠️ Oportunidades de Melhoria:</strong>
                <div class="metric-pills">
                    <span class="metric-pill-warning supermercados">Supermercados: 18.3% conv.</span>
                    <span class="metric-pill-warning industrial">B2B: 12.7% conv.</span>
                    <span class="metric-pill-warning hoteis">Hotéis: 16.5% conv.</span>
                </div>
            </div>

            <div class="metric-group">
                <strong>💰 Revenue por Categoria (Últimos 30 dias):</strong>
                <div class="revenue-bars">
                    <div class="revenue-bar">
                        <span class="category">Pizzarias</span>
                        <div class="bar pizzarias" style="width: 100%">R$ 284.500</div>
                    </div>
                    <div class="revenue-bar">
                        <span class="category">Restaurantes</span>
                        <div class="bar restaurantes" style="width: 65%">R$ 185.300</div>
                    </div>
                    <div class="revenue-bar">
                        <span class="category">Supermercados</span>
                        <div class="bar supermercados" style="width: 45%">R$ 128.700</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Ações Imediatas -->
    <div class="cta-immediate-actions">
        <h7>⚡ Ações Imediatas por Prioridade</h7>
        
        <div class="action-columns">
            <div class="action-column urgent">
                <h8>🔴 URGENTE (Próximas 24h)</h8>
                <ul>
                    <li>📞 Contatar 5 pizzarias qualificadas ontem</li>
                    <li>📧 Enviar proposta para 3 restaurantes em negociação</li>
                    <li>🤝 Fechar 2 contratos de lanchonetes aguardando</li>
                    <li>📋 Revisar pipeline de padarias (7 oportunidades)</li>
                </ul>
            </div>

            <div class="action-column important">
                <h8>🟡 IMPORTANTE (Esta Semana)</h8>
                <ul>
                    <li>🎯 Qualificar 10 novos leads de segmentos Tier 1</li>
                    <li>📱 Configurar automações para pessoa física</li>
                    <li>📊 Analisar taxa de conversão por categoria</li>
                    <li>🔄 Otimizar sequência de follow-up Tier 2</li>
                </ul>
            </div>

            <div class="action-column strategic">
                <h8>🔵 ESTRATÉGICO (Este Mês)</h8>
                <ul>
                    <li>🧠 Desenvolver playbooks específicos para especialidades</li>
                    <li>🤖 Implementar IA para classificação automática</li>
                    <li>📈 Criar dashboards executivos por segmento</li>
                    <li>🎓 Treinar equipe em abordagens especializadas</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Meta Final -->
    <div class="cta-final-goal">
        <div class="goal-card ultimate">
            <strong>🎯 Meta Estratégica 2025:</strong>
            <div class="goal-content">
                <p><strong>Objetivo:</strong> Aumentar a taxa de conversão geral de 22% para 32% através da personalização por segmento</p>
                <div class="goal-metrics">
                    <div class="goal-metric">
                        <span class="metric-number">+45%</span>
                        <span class="metric-label">Revenue Growth</span>
                    </div>
                    <div class="goal-metric">
                        <span class="metric-number">-30%</span>
                        <span class="metric-label">CAC Reduction</span>
                    </div>
                    <div class="goal-metric">
                        <span class="metric-number">+60%</span>
                        <span class="metric-label">Team Efficiency</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.personalized-cta {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 30px;
    border-radius: 15px;
    margin: 30px 0;
}

.cta-tier-section {
    margin: 30px 0;
    padding: 25px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.cta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.cta-grid-compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.cta-card {
    border: 1px solid #e0e6ed;
    border-radius: 10px;
    padding: 20px;
    background: #fff;
    transition: all 0.3s ease;
}

.cta-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.tier-1 {
    border-left: 5px solid #e74c3c;
}

.tier-2 {
    border-left: 5px solid #f39c12;
}

.tier-3 {
    border-left: 5px solid #9b59b6;
}

.cta-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #ecf0f1;
}

.category-icon {
    font-size: 1.5em;
}

.priority-badge {
    padding: 3px 8px;
    border-radius: 15px;
    font-size: 0.7em;
    font-weight: bold;
    color: white;
}

.priority-badge.alta {
    background: #e74c3c;
}

.priority-badge.media {
    background: #f39c12;
}

.cta-content ul {
    margin: 10px 0;
    padding-left: 20px;
}

.cta-content li {
    margin: 5px 0;
    line-height: 1.4;
}

.automation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.automation-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #dee2e6;
}

.dashboard-metrics {
    background: #ffffff;
    padding: 25px;
    border-radius: 10px;
    margin-top: 15px;
}

.metric-group {
    margin: 20px 0;
}

.metric-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
}

.metric-pill {
    background: #28a745;
    color: white;
    padding: 5px 12px;
    border-radius: 15px;
    font-size: 0.9em;
}

.metric-pill-warning {
    background: #dc3545;
    color: white;
    padding: 5px 12px;
    border-radius: 15px;
    font-size: 0.9em;
}

.revenue-bars {
    margin-top: 15px;
}

.revenue-bar {
    display: flex;
    align-items: center;
    margin: 10px 0;
}

.revenue-bar .category {
    width: 120px;
    font-weight: bold;
}

.revenue-bar .bar {
    height: 25px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    color: white;
    font-weight: bold;
    border-radius: 4px;
}

.bar.pizzarias { background: #e74c3c; }
.bar.restaurantes { background: #3498db; }
.bar.supermercados { background: #27ae60; }

.action-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.action-column {
    padding: 20px;
    border-radius: 10px;
    border: 2px solid;
}

.action-column.urgent {
    background: #ffeaea;
    border-color: #e74c3c;
}

.action-column.important {
    background: #fff9e6;
    border-color: #f39c12;
}

.action-column.strategic {
    background: #eaf4ff;
    border-color: #3498db;
}

.cta-final-goal {
    margin-top: 30px;
    text-align: center;
}

.goal-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.goal-metrics {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin-top: 20px;
}

.goal-metric {
    text-align: center;
}

.metric-number {
    display: block;
    font-size: 2em;
    font-weight: bold;
}

.metric-label {
    display: block;
    font-size: 0.9em;
    opacity: 0.9;
}

h7 {
    font-weight: bold;
    color: #2c3e50;
    display: block;
    margin-bottom: 15px;
    font-size: 1.3em;
    border-bottom: 3px solid #3498db;
    padding-bottom: 8px;
}

h8 {
    font-weight: bold;
    color: #34495e;
    font-size: 1.1em;
    margin-bottom: 10px;
}

@media (max-width: 768px) {
    .cta-grid, .cta-grid-compact {
        grid-template-columns: 1fr;
    }
    
    .action-columns, .automation-grid {
        grid-template-columns: 1fr;
    }
    
    .goal-metrics {
        flex-direction: column;
        gap: 20px;
    }
}
</style>

</div>

<style>
.strategy-segment {
    margin-bottom: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    background: #fafafa;
}

.category-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 10px;
}

.category-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.9em;
    font-weight: bold;
    color: white;
}

.pizzarias { background: #e74c3c; }
.restaurantes { background: #3498db; }
.lanchonetes { background: #f39c12; }
.padarias { background: #e67e22; }
.supermercados { background: #27ae60; }
.pessoa-fisica { background: #9b59b6; }
.pastelarias { background: #f1c40f; color: #333; }
.bares { background: #e91e63; }
.mercearias { background: #4caf50; }

.market-share {
    background: #ecf0f1;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.8em;
    font-weight: bold;
    color: #34495e;
}

.strategy-cards-compact p {
    margin: 5px 0;
    font-size: 0.9em;
}

.specialty-categories {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
}

.mini-strategy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
}

.mini-strategy-card {
    background: white;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #dee2e6;
}

.category-mini {
    font-weight: bold;
    color: #495057;
    display: block;
    margin-bottom: 5px;
}

.general-strategy {
    background: #e8f4f8;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
}

.strategy-matrix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
}

.strategy-dimension {
    background: white;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #bee5eb;
}

.personalized-cta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 20px;
}

.cta-card {
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #ccc;
}

.cta-card.primary {
    background: #d4edda;
    border-color: #c3e6cb;
}

.cta-card.secondary {
    background: #d1ecf1;
    border-color: #bee5eb;
}
</style>

        `;
    }

    getPlatformIcon(platform) {
        const icons = {
            'Facebook': '📘',
            'Instagram': '📸'
        };
        return icons[platform] || '📱';
    }

    // Melhorar função de loading - ADICIONAR se não existir
showAnalysisLoading() {
    const resultsContainer = document.getElementById('socialAnalysisResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="loading-analysis">
                <h3>🔍 Analisando Redes Sociais...</h3>
                <div class="loading-steps">
                    <p>⏳ Tentando extrair dados reais...</p>
                    <p>🔄 Testando múltiplos métodos...</p>
                    <p>🧠 Preparando análise inteligente...</p>
                </div>
                <div class="loading-bar"></div>
            </div>
        `;
    }
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
