/**
 * Sistema de Enriquecimento de Dados Demográficos e de Mercado
 * Utiliza APIs gratuitas para obter informações complementares sobre localização e mercado
 */

// Cache para evitar requisições desnecessárias
const cacheEnriquecimento = new Map();

/**
 * Função principal para enriquecer dados do cliente
 * @param {Object} dadosBasicos - Dados básicos obtidos do CNPJ
 * @returns {Object} - Dados enriquecidos com informações demográficas
 */
async function enriquecerDadosCliente(dadosBasicos) {
    console.log('🔍 Iniciando enriquecimento de dados...');
    
    try {
        // Validar dados básicos
        if (!dadosBasicos || typeof dadosBasicos !== 'object') {
            console.warn('Dados básicos inválidos:', dadosBasicos);
            return dadosBasicos;
        }

        const dadosEnriquecidos = { ...dadosBasicos };
        
        // 1. Obter coordenadas a partir do CEP
        if (dadosBasicos.cep && typeof dadosBasicos.cep === 'string') {
            console.log('🗺️ Obtendo coordenadas do CEP:', dadosBasicos.cep);
            try {
                const coordenadas = await obterCoordenadasPorCEP(dadosBasicos.cep);
                if (coordenadas) {
                    dadosEnriquecidos.coordenadas = coordenadas;
                    console.log('✅ Coordenadas obtidas:', coordenadas.lat, coordenadas.lng);
                    
                    // 2. Buscar dados demográficos por localização
                    try {
                        console.log('👥 Buscando dados demográficos...');
                        const dadosDemograficos = await obterDadosDemograficos(coordenadas);
                        if (dadosDemograficos) {
                            dadosEnriquecidos.demografia = dadosDemograficos;
                            console.log('✅ Demografia obtida:', dadosDemograficos.populacao_estimada_raio || dadosDemograficos.populacao_raio_5km);
                        }
                    } catch (demoError) {
                        console.warn('⚠️ Erro ao obter dados demográficos:', demoError.message);
                    }
                    
                    // 3. Buscar estabelecimentos similares na região
                    try {
                        console.log('🏪 Buscando análise competitiva...');
                        const concorrentes = await buscarEstabelecimentosSimilares(coordenadas, dadosBasicos.cnae);
                        if (concorrentes) {
                            dadosEnriquecidos.analiseCompetitiva = concorrentes;
                            console.log('✅ Análise competitiva obtida:', concorrentes.total_estabelecimentos);
                        }
                    } catch (compError) {
                        console.warn('⚠️ Erro ao obter análise competitiva:', compError.message);
                    }
                
                // 4. Análise de mercado local
                try {
                    console.log('🎯 Analisando mercado local...');
                    const analiseMercado = await analisarMercadoLocal(coordenadas);
                    if (analiseMercado) {
                        dadosEnriquecidos.mercadoLocal = analiseMercado;
                        console.log('✅ Mercado local analisado:', analiseMercado.score_atratividade);
                    }
                } catch (mercadoError) {
                    console.warn('⚠️ Erro ao analisar mercado local:', mercadoError.message);
                }
                } else {
                    console.warn('⚠️ Não foi possível obter coordenadas do CEP');
                }
            } catch (coordError) {
                console.warn('⚠️ Erro ao obter coordenadas:', coordError.message);
            }
        } else {
            console.warn('⚠️ CEP não fornecido ou inválido:', dadosBasicos.cep);
        }
        
        // 5. Informações econômicas da região
        if (dadosBasicos.cidade && dadosBasicos.uf) {
            try {
                console.log('💰 Buscando dados econômicos regionais...');
                const dadosEconomicos = await obterDadosEconomicosRegiao(dadosBasicos.cidade, dadosBasicos.uf);
                if (dadosEconomicos) {
                    dadosEnriquecidos.economia = dadosEconomicos;
                    console.log('✅ Dados econômicos obtidos:', dadosEconomicos.municipio);
                }
            } catch (econError) {
                console.warn('⚠️ Erro ao obter dados econômicos:', econError.message);
            }
        } else {
            console.warn('⚠️ Cidade ou UF não fornecidos:', { cidade: dadosBasicos.cidade, uf: dadosBasicos.uf });
        }
        
        console.log('✅ Enriquecimento concluído:', dadosEnriquecidos);
        return dadosEnriquecidos;
        
    } catch (error) {
        console.error('❌ Erro no enriquecimento:', error);
        return dadosBasicos; // Retorna dados básicos em caso de erro
    }
}

/**
 * Obter coordenadas (lat/lng) a partir do CEP
 * @param {string} cep - CEP formatado
 * @returns {Object|null} - Coordenadas {lat, lng}
 */
async function obterCoordenadasPorCEP(cep) {
    const cacheKey = `coords_${cep}`;
    if (cacheEnriquecimento.has(cacheKey)) {
        return cacheEnriquecimento.get(cacheKey);
    }
    
    try {
        // Validar CEP
        if (!cep || typeof cep !== 'string') {
            console.warn('CEP inválido:', cep);
            return null;
        }

        // Usando ViaCEP + Nominatim (gratuito)
        const cepLimpo = cep.replace(/\D/g, '');
        
        if (cepLimpo.length !== 8) {
            console.warn('CEP deve ter 8 dígitos:', cepLimpo);
            return null;
        }
        
        // 1. Primeiro obter endereço completo do ViaCEP
        const responseViaCEP = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        
        if (!responseViaCEP.ok) {
            console.warn(`Erro na API ViaCEP: ${responseViaCEP.status}`);
            return null;
        }
        
        const dadosCEP = await responseViaCEP.json();
        
        if (dadosCEP.erro || !dadosCEP.localidade || !dadosCEP.uf) {
            console.warn('CEP não encontrado no ViaCEP:', cepLimpo);
            return null;
        }
        
        // 2. Tentar múltiplas estratégias para obter coordenadas
        let coordenadasResult = null;
        
        // Estratégia 1: Endereço completo (se houver logradouro)
        if (dadosCEP.logradouro && dadosCEP.logradouro.trim()) {
            const enderecoCompleto = `${dadosCEP.logradouro}, ${dadosCEP.localidade}, ${dadosCEP.uf}, Brasil`;
            coordenadasResult = await buscarCoordenadas(enderecoCompleto);
        }
        
        // Estratégia 2: Cidade + UF (fallback)
        if (!coordenadasResult) {
            const cidadeUF = `${dadosCEP.localidade}, ${dadosCEP.uf}, Brasil`;
            coordenadasResult = await buscarCoordenadas(cidadeUF);
        }
        
        // Estratégia 3: Apenas cidade (último recurso)
        if (!coordenadasResult) {
            coordenadasResult = await buscarCoordenadas(dadosCEP.localidade);
        }
        
        if (coordenadasResult) {
            const resultado = {
                lat: coordenadasResult.lat,
                lng: coordenadasResult.lng,
                endereco_completo: coordenadasResult.endereco,
                dados_cep: dadosCEP,
                estrategia_usada: coordenadasResult.estrategia
            };
            
            cacheEnriquecimento.set(cacheKey, resultado);
            console.log('✅ Coordenadas obtidas:', resultado);
            return resultado;
        }
        
        console.warn('❌ Não foi possível obter coordenadas para:', dadosCEP);
        return null;
        
    } catch (error) {
        console.error('Erro ao obter coordenadas:', error);
        return null;
    }
}

/**
 * Função auxiliar para buscar coordenadas no Nominatim
 * @param {string} endereco - Endereço para buscar
 * @returns {Object|null} - Coordenadas encontradas
 */
async function buscarCoordenadas(endereco) {
    try {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`;
        
        const response = await fetch(urlNominatim, {
            headers: {
                'User-Agent': 'ProspeccaoApp/1.0'
            }
        });
        
        const coordenadas = await response.json();
        
        if (coordenadas && coordenadas.length > 0) {
            return {
                lat: parseFloat(coordenadas[0].lat),
                lng: parseFloat(coordenadas[0].lon),
                endereco: endereco,
                estrategia: endereco
            };
        }
        
        return null;
        
    } catch (error) {
        console.warn('Erro na busca de coordenadas:', error);
        return null;
    }
}

/**
 * Obter dados demográficos da região (população no raio de 5km)
 * @param {Object} coordenadas - {lat, lng}
 * @returns {Object|null} - Dados demográficos
 */
async function obterDadosDemograficos(coordenadas) {
    // Validar coordenadas
    if (!coordenadas || typeof coordenadas.lat !== 'number' || typeof coordenadas.lng !== 'number') {
        console.warn('Coordenadas inválidas para dados demográficos:', coordenadas);
        return null;
    }

    const cacheKey = `demo_${coordenadas.lat}_${coordenadas.lng}`;
    if (cacheEnriquecimento.has(cacheKey)) {
        return cacheEnriquecimento.get(cacheKey);
    }
    
    try {
        // Usando Overpass API para obter dados de população
        const raio = 5000; // 5km em metros
        const query = `
            [out:json][timeout:25];
            (
              relation["place"~"city|town|village|suburb"]["population"](around:${raio},${coordenadas.lat},${coordenadas.lng});
              way["place"~"city|town|village|suburb"]["population"](around:${raio},${coordenadas.lat},${coordenadas.lng});
              node["place"~"city|town|village|suburb"]["population"](around:${raio},${coordenadas.lat},${coordenadas.lng});
            );
            out tags;
        `;
        
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        let populacaoTotal = 0;
        let localidades = [];
        let cidadePrincipal = null;
        
        if (data.elements) {
            data.elements.forEach(element => {
                if (element.tags && element.tags.population) {
                    const pop = parseInt(element.tags.population);
                    if (!isNaN(pop)) {
                        const localidade = {
                            nome: element.tags.name,
                            populacao: pop,
                            tipo: element.tags.place
                        };
                        
                        localidades.push(localidade);
                        
                        // Identificar a cidade principal (maior população)
                        if (!cidadePrincipal || pop > cidadePrincipal.populacao) {
                            cidadePrincipal = localidade;
                        }
                        
                        populacaoTotal += pop;
                    }
                }
            });
        }
        
        // Estimativa mais realista: assumir que só uma fração da cidade está no raio de 5km
        let populacaoEstimadaRaio = 0;
        if (cidadePrincipal) {
            // Se a cidade principal for muito grande, assumir que apenas parte dela está no raio
            if (cidadePrincipal.populacao > 100000) {
                // Para cidades grandes, estimar 10-20% da população no raio de 5km
                populacaoEstimadaRaio = Math.round(cidadePrincipal.populacao * 0.15);
            } else if (cidadePrincipal.populacao > 50000) {
                // Para cidades médias, estimar 30-40%
                populacaoEstimadaRaio = Math.round(cidadePrincipal.populacao * 0.35);
            } else {
                // Para cidades pequenas, pode incluir a cidade toda + outras localidades
                populacaoEstimadaRaio = populacaoTotal;
            }
        }
        
        const resultado = {
            populacao_raio_5km: populacaoTotal, // População total das cidades na região
            populacao_estimada_raio: populacaoEstimadaRaio, // Estimativa mais realista do raio
            cidade_principal: cidadePrincipal,
            localidades_proximas: localidades,
            densidade_estimada: Math.round(populacaoEstimadaRaio / (Math.PI * 25)), // pessoas por km² no raio
            data_consulta: new Date().toISOString()
        };
        
        cacheEnriquecimento.set(cacheKey, resultado);
        return resultado;
        
    } catch (error) {
        console.error('Erro ao obter dados demográficos:', error);
        return null;
    }
}

/**
 * Buscar estabelecimentos similares (mesmo CNAE) na região
 * @param {Object} coordenadas - {lat, lng}
 * @param {string} cnae - Código CNAE da empresa
 * @returns {Object|null} - Dados de concorrência
 */
async function buscarEstabelecimentosSimilares(coordenadas, cnae) {
    // Validar coordenadas
    if (!coordenadas || typeof coordenadas.lat !== 'number' || typeof coordenadas.lng !== 'number') {
        console.warn('Coordenadas inválidas para busca de estabelecimentos:', coordenadas);
        return null;
    }

    const cacheKey = `similar_${coordenadas.lat}_${coordenadas.lng}_${cnae || 'sem-cnae'}`;
    if (cacheEnriquecimento.has(cacheKey)) {
        return cacheEnriquecimento.get(cacheKey);
    }
    
    try {
        // Usando Overpass API para buscar pontos comerciais
        const raio = 5000; // 5km
        const query = `
            [out:json][timeout:25];
            (
              node["shop"](around:${raio},${coordenadas.lat},${coordenadas.lng});
              node["amenity"~"restaurant|cafe|bank|pharmacy"](around:${raio},${coordenadas.lat},${coordenadas.lng});
              node["office"](around:${raio},${coordenadas.lat},${coordenadas.lng});
            );
            out tags;
        `;
        
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        let estabelecimentos = [];
        if (data.elements) {
            estabelecimentos = data.elements
                .filter(element => element.tags && (element.tags.name || element.tags.shop || element.tags.amenity))
                .map(element => ({
                    nome: element.tags.name || element.tags.shop || element.tags.amenity,
                    tipo: element.tags.shop || element.tags.amenity || element.tags.office || 'comercio',
                    lat: element.lat,
                    lon: element.lon
                }));
        }
        
        const resultado = {
            total_estabelecimentos: estabelecimentos.length,
            estabelecimentos_proximos: estabelecimentos.slice(0, 20), // Primeiros 20
            densidade_comercial: Math.round(estabelecimentos.length / 25), // por km²
            tipos_predominantes: contarTipos(estabelecimentos),
            data_consulta: new Date().toISOString()
        };
        
        cacheEnriquecimento.set(cacheKey, resultado);
        return resultado;
        
    } catch (error) {
        console.error('Erro ao buscar estabelecimentos similares:', error);
        return null;
    }
}

/**
 * Análise de mercado local baseada em amenidades
 * @param {Object} coordenadas - {lat, lng}
 * @returns {Object|null} - Análise de mercado
 */
async function analisarMercadoLocal(coordenadas) {
    // Validar coordenadas
    if (!coordenadas || typeof coordenadas.lat !== 'number' || typeof coordenadas.lng !== 'number') {
        console.warn('Coordenadas inválidas para análise de mercado:', coordenadas);
        return null;
    }

    try {
        const raio = 2000; // 2km para análise mais focada
        const query = `
            [out:json][timeout:25];
            (
              node["amenity"~"bank|atm|restaurant|cafe|pharmacy|hospital|school|university|shopping"](around:${raio},${coordenadas.lat},${coordenadas.lng});
              way["amenity"~"bank|atm|restaurant|cafe|pharmacy|hospital|school|university|shopping"](around:${raio},${coordenadas.lat},${coordenadas.lng});
            );
            out tags;
        `;
        
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const amenidades = {};
        if (data.elements) {
            data.elements.forEach(element => {
                if (element.tags && element.tags.amenity) {
                    const tipo = element.tags.amenity;
                    amenidades[tipo] = (amenidades[tipo] || 0) + 1;
                }
            });
        }
        
        return {
            amenidades_proximas: amenidades,
            score_atratividade: calcularScoreAtratividade(amenidades),
            classificacao_area: classificarArea(amenidades),
            data_consulta: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Erro na análise de mercado:', error);
        return null;
    }
}

/**
 * Obter dados econômicos da região
 * @param {string} cidade - Nome da cidade
 * @param {string} uf - Estado (UF)
 * @returns {Object|null} - Dados econômicos
 */
async function obterDadosEconomicosRegiao(cidade, uf) {
    try {
        // Validar parâmetros de entrada
        if (!cidade || !uf || typeof cidade !== 'string' || typeof uf !== 'string') {
            console.warn('Parâmetros inválidos para obterDadosEconomicosRegiao:', { cidade, uf });
            return null;
        }

        // Usar API do IBGE para dados econômicos
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        
        if (!response.ok) {
            throw new Error(`Erro na API IBGE: ${response.status}`);
        }
        
        const municipios = await response.json();
        
        // Verificar se municipios é um array válido
        if (!Array.isArray(municipios)) {
            console.warn('Resposta inválida da API IBGE:', municipios);
            return null;
        }
        
        const cidadeLower = cidade.toLowerCase().trim();
        const municipio = municipios.find(m => {
            if (!m || !m.nome || typeof m.nome !== 'string') {
                return false;
            }
            const nomeMunicipio = m.nome.toLowerCase().trim();
            return nomeMunicipio.includes(cidadeLower) || cidadeLower.includes(nomeMunicipio);
        });
        
        if (municipio) {
            // Buscar dados socioeconômicos
            const dadosResponse = await fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2020/variaveis/9324?localidades=N6[${municipio.id}]`);
            const dadosSocioeconomicos = await dadosResponse.json();
            
            return {
                municipio: municipio.nome,
                codigo_ibge: municipio.id,
                uf: uf,
                dados_socioeconomicos: dadosSocioeconomicos,
                data_consulta: new Date().toISOString()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('Erro ao obter dados econômicos:', error);
        return null;
    }
}

// Funções auxiliares
function contarTipos(estabelecimentos) {
    const tipos = {};
    estabelecimentos.forEach(est => {
        tipos[est.tipo] = (tipos[est.tipo] || 0) + 1;
    });
    return Object.entries(tipos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5
}

function calcularScoreAtratividade(amenidades) {
    const pesos = {
        bank: 3,
        atm: 1,
        restaurant: 2,
        cafe: 2,
        pharmacy: 2,
        hospital: 4,
        school: 3,
        university: 5,
        shopping: 4
    };
    
    let score = 0;
    Object.entries(amenidades).forEach(([tipo, quantidade]) => {
        score += (pesos[tipo] || 1) * quantidade;
    });
    
    return Math.min(100, Math.round(score / 2)); // Normalizar para 0-100
}

function classificarArea(amenidades) {
    const total = Object.values(amenidades).reduce((a, b) => a + b, 0);
    
    if (total > 50) return 'Área Comercial Intensa';
    if (total > 20) return 'Área Comercial Moderada';
    if (total > 10) return 'Área Residencial com Comércio';
    if (total > 5) return 'Área Residencial';
    return 'Área Rural ou Pouco Desenvolvida';
}

/**
 * Exibir dados enriquecidos na interface
 * @param {Object} dadosEnriquecidos - Dados completos do cliente
 */
function exibirDadosEnriquecidos(dadosEnriquecidos) {
    const container = document.getElementById('dados-enriquecidos') || criarContainerEnriquecimento();
    
    let html = '<div class="enriquecimento-dados">';
    html += '<h3>📊 Análise de Mercado e Demografia</h3>';
    
    // Demografia
    if (dadosEnriquecidos.demografia) {
        const demo = dadosEnriquecidos.demografia;
        html += `
            <div class="secao-dados">
                <h4>👥 Demografia Local (5km)</h4>
                <div class="dados-grid">
                    <div class="dado-item">
                        <span class="label">População Estimada:</span>
                        <span class="valor">${demo.populacao_raio_5km.toLocaleString()}</span>
                    </div>
                    <div class="dado-item">
                        <span class="label">Densidade:</span>
                        <span class="valor">${demo.densidade_estimada} hab/km²</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Análise Competitiva
    if (dadosEnriquecidos.analiseCompetitiva) {
        const comp = dadosEnriquecidos.analiseCompetitiva;
        html += `
            <div class="secao-dados">
                <h4>🏪 Análise Competitiva (5km)</h4>
                <div class="dados-grid">
                    <div class="dado-item">
                        <span class="label">Estabelecimentos:</span>
                        <span class="valor">${comp.total_estabelecimentos}</span>
                    </div>
                    <div class="dado-item">
                        <span class="label">Densidade Comercial:</span>
                        <span class="valor">${comp.densidade_comercial} est/km²</span>
                    </div>
                </div>
                <div class="tipos-predominantes">
                    <strong>Tipos Predominantes:</strong>
                    ${comp.tipos_predominantes.map(([tipo, qtd]) => 
                        `<span class="tipo-tag">${tipo} (${qtd})</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    // Mercado Local
    if (dadosEnriquecidos.mercadoLocal) {
        const mercado = dadosEnriquecidos.mercadoLocal;
        html += `
            <div class="secao-dados">
                <h4>🎯 Mercado Local (2km)</h4>
                <div class="dados-grid">
                    <div class="dado-item">
                        <span class="label">Score Atratividade:</span>
                        <span class="valor score-${getScoreClass(mercado.score_atratividade)}">${mercado.score_atratividade}/100</span>
                    </div>
                    <div class="dado-item">
                        <span class="label">Classificação:</span>
                        <span class="valor">${mercado.classificacao_area}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
}

function criarContainerEnriquecimento() {
    const container = document.createElement('div');
    container.id = 'dados-enriquecidos';
    container.className = 'dados-enriquecidos-container';
    
    // Adicionar após o formulário principal
    const formulario = document.querySelector('.form-section');
    if (formulario) {
        formulario.appendChild(container);
    }
    
    return container;
}

function getScoreClass(score) {
    if (score >= 80) return 'alto';
    if (score >= 60) return 'medio';
    if (score >= 40) return 'baixo';
    return 'muito-baixo';
}

// Função de debug para testar o enriquecimento
window.debugEnriquecimento = async function(cnpj) {
    try {
        console.log('🔍 Testando enriquecimento para CNPJ:', cnpj);
        
        // Simular dados básicos
        const dadosBasicos = {
            nome: 'Empresa Teste',
            fantasia: 'Teste LTDA',
            cnpj: cnpj,
            cep: '00000-000', // CEP genérico para teste
            cidade: 'Cidade Teste',
            uf: 'SP',
            cnae: '5611-2'
        };
        
        const resultado = await enriquecerDadosCliente(dadosBasicos);
        console.log('✅ Resultado do enriquecimento:', resultado);
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
        return null;
    }
};

console.log('💡 Use window.debugEnriquecimento("00.000.000/0001-00") para testar o sistema');
