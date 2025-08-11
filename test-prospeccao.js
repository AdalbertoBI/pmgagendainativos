// 🧪 TESTE DE INICIALIZAÇÃO DO PROSPECCAO MANAGER

console.log('🚀 Iniciando testes do ProspeccaoManager...');

// Aguardar carregamento completo
window.addEventListener('load', async () => {
    console.log('📄 Página carregada, iniciando testes...');
    
    // Teste 1: Verificar se ProspeccaoManager está disponível
    setTimeout(async () => {
        console.log('🔍 Teste 1: Verificando disponibilidade...');
        
        if (typeof ProspeccaoManager === 'undefined') {
            console.error('❌ Classe ProspeccaoManager não está definida');
            return;
        }
        
        console.log('✅ Classe ProspeccaoManager encontrada');
        
        // Teste 2: Verificar instância global
        setTimeout(() => {
            console.log('🔍 Teste 2: Verificando instância global...');
            
            if (!window.prospeccaoManager) {
                console.warn('⚠️ Instância global não encontrada, tentando criar...');
                
                try {
                    window.initProspeccaoManager().then(() => {
                        console.log('✅ Instância criada com sucesso');
                        testMethods();
                    }).catch(error => {
                        console.error('❌ Erro ao criar instância:', error);
                    });
                } catch (error) {
                    console.error('❌ Erro ao chamar initProspeccaoManager:', error);
                }
            } else {
                console.log('✅ Instância global encontrada');
                testMethods();
            }
        }, 1000);
        
    }, 500);
});

// Teste 3: Verificar métodos essenciais
function testMethods() {
    console.log('🔍 Teste 3: Verificando métodos essenciais...');
    
    const manager = window.prospeccaoManager;
    
    if (!manager) {
        console.error('❌ Manager não disponível para testes');
        return;
    }
    
    // Verificar métodos críticos
    const criticalMethods = [
        'generateSalesScript',
        'generateSocialRecommendations', 
        'generateMarketOpportunities',
        'copyScriptSection',
        'enhanceScriptWithAI'
    ];
    
    let passedTests = 0;
    let totalTests = criticalMethods.length;
    
    criticalMethods.forEach(methodName => {
        if (typeof manager[methodName] === 'function') {
            console.log(`✅ Método ${methodName} encontrado`);
            passedTests++;
        } else {
            console.error(`❌ Método ${methodName} não encontrado`);
        }
    });
    
    console.log(`📊 Resultado: ${passedTests}/${totalTests} métodos encontrados`);
    
    if (passedTests === totalTests) {
        console.log('🎉 Todos os testes passaram! Sistema funcionando corretamente.');
        
        // Teste 4: Teste funcional básico
        testBasicFunctionality();
    } else {
        console.error('❌ Alguns testes falharam. Verifique a implementação.');
    }
}

// Teste 4: Funcionalidade básica
function testBasicFunctionality() {
    console.log('🔍 Teste 4: Funcionalidade básica...');
    
    const manager = window.prospeccaoManager;
    
    try {
        // Testar dados simulados de rede social
        const testSocialData = {
            platforms: ['Instagram', 'Facebook'],
            totalFollowers: 1500,
            totalPublications: 75,
            engagementLevel: 'Médio',
            details: [
                { platform: 'Instagram', followers: 1000, following: 300, publications: 50 },
                { platform: 'Facebook', followers: 500, following: 200, publications: 25 }
            ]
        };
        
        // Testar generateSocialRecommendations
        const recommendations = manager.generateSocialRecommendations(testSocialData);
        if (recommendations && recommendations.length > 0) {
            console.log('✅ generateSocialRecommendations funcionando');
            console.log('📄 Recomendações geradas:', recommendations.length);
        } else {
            console.error('❌ generateSocialRecommendations não retornou dados');
        }
        
        // Testar generateMarketOpportunities
        const opportunities = manager.generateMarketOpportunities(testSocialData);
        if (opportunities && opportunities.length > 0) {
            console.log('✅ generateMarketOpportunities funcionando');
            console.log('📄 Oportunidades geradas:', opportunities.length);
        } else {
            console.error('❌ generateMarketOpportunities não retornou dados');
        }
        
        console.log('🎉 Teste de funcionalidade básica concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro no teste de funcionalidade:', error);
    }
}

// Monitorar erros globais relacionados ao ProspeccaoManager
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('ProspeccaoManager')) {
        console.error('🚨 Erro relacionado ao ProspeccaoManager:', event.error);
    }
});

console.log('✅ Script de testes carregado. Aguardando execução...');
