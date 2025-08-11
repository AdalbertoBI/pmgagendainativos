/**
 * Arquivo para busca automática de dados do CNPJ
 * Utiliza APIs com suporte a CORS e proxies públicos
 */

// Função principal para buscar dados do CNPJ
async function buscarDadosCNPJ() {
    const cnpjInput = document.getElementById('cnpj-cpf');
    const loadingMsg = document.getElementById('loadingMsg');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    const reloadBtn = document.getElementById('reloadBtn');

    // Limpar mensagens anteriores
    limparMensagens();

    // Validar CNPJ
    const cnpj = cnpjInput.value.replace(/\D/g, '');
    if (!cnpj) {
        mostrarErro('Por favor, digite um CNPJ válido.');
        return;
    }

    if (cnpj.length !== 14) {
        mostrarErro('CNPJ deve conter 14 dígitos.');
        return;
    }

    if (!validarCNPJ(cnpj)) {
        mostrarErro('CNPJ inválido. Verifique os dígitos.');
        return;
    }

    // Mostrar loading
    loadingMsg.style.display = 'block';
    reloadBtn.disabled = true;
    reloadBtn.innerHTML = '⏳';

    try {
        // Primeira tentativa: BrasilAPI (tem CORS habilitado)
        let dados = await buscarBrasilAPI(cnpj);
        
        if (!dados || !dados.nome) {
            // Segunda tentativa: ReceitaWS via CORS Proxy
            dados = await buscarReceitaWSProxy(cnpj);
        }

        if (!dados || !dados.nome) {
            // Terceira tentativa: API CNPJ.ws
            dados = await buscarCNPJws(cnpj);
        }

        if (dados && dados.nome) {
            preencherFormulario(dados);
            mostrarSucesso('Dados encontrados e preenchidos automaticamente!');
            
            // 🔍 NOVO: Enriquecimento de dados demográficos e de mercado
            try {
                mostrarSucesso('Enriquecendo dados com informações demográficas...');
                const dadosEnriquecidos = await enriquecerDadosCliente(dados);
                if (dadosEnriquecidos && dadosEnriquecidos !== dados) {
                    exibirDadosEnriquecidos(dadosEnriquecidos);
                    mostrarSucesso('✅ Dados enriquecidos com análise de mercado e demografia!');
                }
            } catch (enriquecimentoError) {
                console.warn('Erro no enriquecimento de dados:', enriquecimentoError);
                // Não falha a operação principal se o enriquecimento der erro
            }
            
        } else {
            mostrarErro('Não foi possível encontrar dados para este CNPJ. Verifique se o CNPJ está correto.');
        }

    } catch (error) {
        console.error('Erro ao buscar dados do CNPJ:', error);
        mostrarErro('Erro ao buscar dados. Tente novamente em alguns minutos.');
    } finally {
        // Restaurar botão
        loadingMsg.style.display = 'none';
        reloadBtn.disabled = false;
        reloadBtn.innerHTML = '🔄';
    }
}

// Buscar dados na BrasilAPI (primeira opção - tem CORS)
async function buscarBrasilAPI(cnpj) {
    try {
        console.log('Tentando BrasilAPI...');
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('Dados BrasilAPI:', data);

        return {
            nome: data.legal_name,
            fantasia: data.trade_name || data.legal_name,
            email: data.email,
            telefone: data.phone,
            endereco: data.address?.street,
            numero: data.address?.number,
            bairro: data.address?.district,
            cidade: data.address?.city,
            uf: data.address?.state,
            cep: data.address?.zip_code,
            cnae: data.main_activity?.code || data.primary_activity?.[0]?.code,
            atividade_principal: data.main_activity?.text || data.primary_activity?.[0]?.text
        };

    } catch (error) {
        console.error('Erro BrasilAPI:', error);
        return null;
    }
}

// Buscar dados na ReceitaWS via CORS Proxy
async function buscarReceitaWSProxy(cnpj) {
    try {
        console.log('Tentando ReceitaWS via proxy...');
        // Usando um proxy CORS público
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = `https://receitaws.com.br/v1/cnpj/${cnpj}`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'ERROR') {
            throw new Error(data.message || 'Erro na consulta');
        }

        console.log('Dados ReceitaWS:', data);

        return {
            nome: data.nome,
            fantasia: data.fantasia || data.nome,
            email: data.email,
            telefone: data.telefone,
            endereco: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            cidade: data.municipio,
            uf: data.uf,
            cep: data.cep
        };

    } catch (error) {
        console.error('Erro ReceitaWS Proxy:', error);
        return null;
    }
}

// Buscar dados na CNPJ.ws (terceira opção)
async function buscarCNPJws(cnpj) {
    try {
        console.log('Tentando CNPJ.ws...');
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dados CNPJ.ws:', data);

        return {
            nome: data.razao_social,
            fantasia: data.estabelecimento?.nome_fantasia || data.razao_social,
            email: data.estabelecimento?.email,
            telefone: data.estabelecimento?.telefone1,
            endereco: data.estabelecimento?.logradouro,
            numero: data.estabelecimento?.numero,
            bairro: data.estabelecimento?.bairro,
            cidade: data.estabelecimento?.cidade?.nome,
            uf: data.estabelecimento?.estado?.sigla,
            cep: data.estabelecimento?.cep,
            cnae: data.estabelecimento?.atividade_principal?.codigo || data.cnae_fiscal_principal?.codigo,
            atividade_principal: data.estabelecimento?.atividade_principal?.descricao || data.cnae_fiscal_principal?.descricao
        };

    } catch (error) {
        console.error('Erro CNPJ.ws:', error);
        return null;
    }
}

// Preencher formulário com os dados encontrados
function preencherFormulario(dados) {
    console.log('Preenchendo formulário com:', dados);
    
    // Preencher campos apenas se estiverem vazios
    preencherCampo('cliente', dados.nome);
    preencherCampo('nome-fantasia', dados.fantasia || dados.nome);
    preencherCampo('email', dados.email);
    preencherCampo('telefone-comercial', formatarTelefoneAPI(dados.telefone));
    preencherCampo('endereco', dados.endereco);
    preencherCampo('numero', dados.numero);
    preencherCampo('bairro', dados.bairro);
    preencherCampo('cidade', dados.cidade);
    preencherCampo('uf', dados.uf);
    preencherCampo('cep', formatarCEP(dados.cep));
}

// Preencher campo apenas se estiver vazio
function preencherCampo(id, valor) {
    const campo = document.getElementById(id);
    if (campo && !campo.value && valor) {
        campo.value = valor;
        console.log(`Campo ${id} preenchido com: ${valor}`);
    }
}

// Validar CNPJ
function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;

    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;

    return true;
}

// Formatar telefone da API
function formatarTelefoneAPI(telefone) {
    if (!telefone) return '';
    
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 10) {
        return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (numeros.length === 11) {
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    return telefone;
}

// Formatar CEP
function formatarCEP(cep) {
    if (!cep) return '';
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length === 8) {
        return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return cep;
}

// Funções auxiliares para mensagens
function limparMensagens() {
    const loadingMsg = document.getElementById('loadingMsg');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    if (loadingMsg) loadingMsg.style.display = 'none';
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
}

function mostrarErro(mensagem) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
        errorMsg.textContent = mensagem;
        errorMsg.style.display = 'block';
    }
}

function mostrarSucesso(mensagem) {
    const successMsg = document.getElementById('successMsg');
    if (successMsg) {
        successMsg.textContent = mensagem;
        successMsg.style.display = 'block';
    }
}

// Buscar CEP automaticamente
async function buscarCEP(cep) {
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        const data = await response.json();
        
        if (data && !data.error) {
            preencherCampo('endereco', data.street);
            preencherCampo('bairro', data.district);
            preencherCampo('cidade', data.city);
            preencherCampo('uf', data.state);
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // CEP lookup
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep);
            }
        });
    }

    // CNPJ eventos
    const cnpjInput = document.getElementById('cnpj-cpf');
    if (cnpjInput) {
        // Enter para buscar
        cnpjInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarDadosCNPJ();
            }
        });

        // Formatação automática
        cnpjInput.addEventListener('input', function() {
            let valor = this.value.replace(/\D/g, '');
            if (valor.length <= 14) {
                valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
                valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
                valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
                this.value = valor;
            }
        });
    }
});
