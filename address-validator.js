// address-validator.js - Sistema de Validação com APIs Reais - VERSÃO COMPLETA

class AddressValidator {
    constructor() {
        // Dicionário de correções de grafias
        this.grafiaCorrections = {
            'EUGENIO': 'EUGÊNIO',
            'EUGÊNIO': 'EUGÊNIO',
            'SATELITE': 'SATÉLITE',
            'SATÉLITE': 'SATÉLITE',
            'AQUARIOS': 'AQUARIUS',
            'AQUÁRIOS': 'AQUARIUS',
            'AQUARIO': 'AQUARIUS',
            'RESINDENCIAL': 'RESIDENCIAL',
            'MORUMBY': 'MORUMBI',
            'BETANIA': 'BETÂNIA',
            'ISMENIA': 'ISMÊNIA',
            'ITAPUA': 'ITAPUÃ',
            'PARAIBA': 'PARAÍBA',
            'INDUSTRIAS': 'INDÚSTRIAS',
            'ESPERANCA': 'ESPERANÇA',
            'AMERICA': 'AMÉRICA',
            'JOSE': 'JOSÉ',
            'JOAO': 'JOÃO',
            'ANTONIO': 'ANTÔNIO',
            'SAO': 'SÃO'
        };

        // Normalizações de ruas específicas
        this.streetNormalizations = {
            'RUA 21 DE ABRIL': 'Rua Vinte e Um de Abril',
            'RUA VINTE E 1 DE ABRIL': 'Rua Vinte e Um de Abril',
            'RUA XV DE NOVEMBRO': 'Rua Quinze de Novembro',
            'RUA 15 DE NOVEMBRO': 'Rua Quinze de Novembro',
            'RUA 7 DE SETEMBRO': 'Rua Sete de Setembro',
            'AV JOAO XXIII': 'Avenida João XXIII',
            'AV JOÃO XXIII': 'Avenida João XXIII',
            'RUA CORONEL JOSE VICENTE': 'Rua Coronel José Vicente',
            'RUA CEL JOSE VICENTE': 'Rua Coronel José Vicente',
            'RUA MAJOR JOSE DIAS': 'Rua Major José Dias',
            'RUA MAJ JOSE DIAS': 'Rua Major José Dias',
            'AVENIDA PRESIDENTE VARGAS': 'Avenida Presidente Vargas',
            'AV PRESIDENTE VARGAS': 'Avenida Presidente Vargas'
        };

        // Padrões de números
        this.numeroPatterns = {
            'SN': 'S/N',
            'S/N': 'S/N',
            'S.N': 'S/N',
            'SEM NUMERO': 'S/N',
            'SEM NÚMERO': 'S/N',
            'SEM NUM': 'S/N',
            'S N': 'S/N'
        };

        console.log('✅ AddressValidator API Real inicializado');
    }

    // Método principal para validar e corrigir endereço
    validateAndCorrectAddress(cliente) {
        console.log(`🔍 Validando endereço: ${cliente['Nome Fantasia']}`);
        
        const resultado = {
            original: { ...cliente },
            corrigido: { ...cliente },
            correcoes: [],
            warnings: [],
            confianca: 1.0,
            enderecoFormatado: null
        };

        // 1. Corrigir grafias básicas
        this.corrigirGrafias(resultado);

        // 2. Validar e corrigir rua específica
        this.validarRuaEspecifica(resultado);

        // 3. Validar e corrigir número
        this.validarNumero(resultado);

        // 4. Validar e corrigir bairro
        this.validarBairro(resultado);

        // 5. Formatar endereço para API
        this.formatarEnderecoParaAPI(resultado);

        // 6. Validar consistência final
        this.validarConsistencia(resultado);

        console.log(`✅ Validação concluída: ${resultado.correcoes.length} correções`);
        
        return resultado;
    }

    // Corrigir grafias básicas
    corrigirGrafias(resultado) {
        const campos = ['Endereco', 'Bairro', 'Cidade'];
        
        campos.forEach(campo => {
            if (resultado.corrigido[campo]) {
                const original = resultado.corrigido[campo];
                let corrigido = original.toUpperCase();
                
                Object.keys(this.grafiaCorrections).forEach(errado => {
                    const correto = this.grafiaCorrections[errado];
                    const regex = new RegExp(errado, 'gi');
                    if (regex.test(corrigido)) {
                        corrigido = corrigido.replace(regex, correto);
                        resultado.correcoes.push({
                            campo: campo,
                            tipo: 'grafia',
                            original: original,
                            corrigido: corrigido,
                            motivo: `Correção de grafia: ${errado} → ${correto}`
                        });
                    }
                });
                
                resultado.corrigido[campo] = corrigido;
            }
        });
    }

    // Validar rua específica
    validarRuaEspecifica(resultado) {
        if (!resultado.corrigido.Endereco) return;

        const enderecoOriginal = resultado.corrigido.Endereco.toUpperCase();
        
        Object.keys(this.streetNormalizations).forEach(ruaKey => {
            const ruaCorreta = this.streetNormalizations[ruaKey];
            
            if (enderecoOriginal.includes(ruaKey)) {
                resultado.corrigido.Endereco = ruaCorreta;
                resultado.correcoes.push({
                    campo: 'Endereco',
                    tipo: 'rua_especifica',
                    original: resultado.original.Endereco,
                    corrigido: ruaCorreta,
                    motivo: `Normalização de rua: ${ruaKey} → ${ruaCorreta}`
                });
            }
        });
    }

    // Validar número
    validarNumero(resultado) {
        if (!resultado.corrigido.Numero) return;

        const numeroOriginal = resultado.corrigido.Numero.toString().toUpperCase();
        
        Object.keys(this.numeroPatterns).forEach(padrao => {
            if (numeroOriginal.includes(padrao)) {
                const numeroCorrigido = this.numeroPatterns[padrao];
                resultado.corrigido.Numero = numeroCorrigido;
                
                if (numeroOriginal !== numeroCorrigido) {
                    resultado.correcoes.push({
                        campo: 'Numero',
                        tipo: 'numero_padrao',
                        original: resultado.original.Numero,
                        corrigido: numeroCorrigido,
                        motivo: `Padronização de número: ${padrao} → ${numeroCorrigido}`
                    });
                }
            }
        });
    }

    // Validar bairro
    validarBairro(resultado) {
        if (!resultado.corrigido.Bairro) return;

        let bairro = resultado.corrigido.Bairro;
        
        // Aplicar capitalização correta
        bairro = this.applyProperCapitalization(bairro);
        
        if (bairro !== resultado.corrigido.Bairro) {
            resultado.corrigido.Bairro = bairro;
            resultado.correcoes.push({
                campo: 'Bairro',
                tipo: 'capitalizacao',
                original: resultado.original.Bairro,
                corrigido: bairro,
                motivo: 'Capitalização correta aplicada'
            });
        }
    }

    // Formatar endereço para API com múltiplas variações
    formatarEnderecoParaAPI(resultado) {
        const rua = resultado.corrigido.Endereco || '';
        const numero = resultado.corrigido.Numero || '';
        const bairro = resultado.corrigido.Bairro || '';
        const cidade = resultado.corrigido.Cidade || 'São José dos Campos';
        const uf = resultado.corrigido.UF || 'SP';
        const cep = resultado.corrigido.CEP || '';

        // Múltiplas formatações para maximizar chances de sucesso nas APIs
        resultado.enderecoFormatado = {
            // Formato mais completo
            completo: `${rua}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            
            // Formato sem número (para ruas que não têm numeração específica)
            semNumero: `${rua}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            
            // Formato com CEP (mais preciso quando disponível)
            comCEP: `${cep}, ${bairro}, ${cidade}, ${uf}, Brasil`,
            
            // Formato simples
            simples: `${cidade}, ${uf}, Brasil`,
            
            // Variações estratégicas para diferentes APIs
            variacoes: [
                // Prioridade 1: Endereço mais específico
                `${rua}, ${numero}, ${bairro}, ${cidade}, SP`,
                `${rua} ${numero}, ${bairro}, ${cidade}, SP`,
                `${rua}, ${numero}, ${bairro}, ${cidade}`,
                
                // Prioridade 2: Sem número
                `${rua}, ${bairro}, ${cidade}, SP`,
                `${rua}, ${bairro}, ${cidade}`,
                
                // Prioridade 3: Com CEP
                `${cep}, ${cidade}, SP`,
                `${rua}, ${cep}, ${cidade}`,
                
                // Prioridade 4: Bairro e cidade
                `${bairro}, ${cidade}, SP`,
                `${bairro}, ${cidade}`,
                
                // Prioridade 5: Apenas cidade
                `${cidade}, SP`,
                `${cidade}, São Paulo`,
                
                // Formato internacional
                `${rua}, ${numero}, ${bairro}, ${cidade}, São Paulo, Brasil`,
                `${rua}, ${bairro}, ${cidade}, São Paulo, Brasil`
            ].filter(addr => addr.length > 10 && !addr.includes('undefined') && !addr.includes('null'))
        };

        console.log(`📍 Endereço formatado para APIs:`, resultado.enderecoFormatado.completo);
        console.log(`📋 ${resultado.enderecoFormatado.variacoes.length} variações geradas`);
    }

    // Validar consistência final
    validarConsistencia(resultado) {
        // Verificar se tem informações mínimas
        if (!resultado.corrigido.Endereco || !resultado.corrigido.Bairro) {
            resultado.warnings.push({
                campo: 'geral',
                tipo: 'informacao_incompleta',
                valor: null,
                motivo: 'Endereço ou bairro não informados'
            });
            resultado.confianca -= 0.3;
        }

        // Verificar CEP de São Paulo
        if (resultado.corrigido.CEP) {
            const cep = resultado.corrigido.CEP.replace(/\D/g, '');
            if (cep.length === 8) {
                const cepNum = parseInt(cep.substring(0, 5));
                if (cepNum < 1000 || cepNum > 19999) {
                    resultado.warnings.push({
                        campo: 'CEP',
                        tipo: 'cep_fora_sp',
                        valor: resultado.corrigido.CEP,
                        motivo: 'CEP pode não ser de São Paulo'
                    });
                    resultado.confianca -= 0.2;
                }
            }
        }

        // Verificar cidade
        if (resultado.corrigido.Cidade) {
            const cidade = resultado.corrigido.Cidade.toUpperCase();
            if (!cidade.includes('SAO JOSE') && !cidade.includes('SJC')) {
                resultado.warnings.push({
                    campo: 'Cidade',
                    tipo: 'cidade_diferente_sjc',
                    valor: resultado.corrigido.Cidade,
                    motivo: 'Cidade pode não ser São José dos Campos'
                });
                resultado.confianca -= 0.1;
            }
        }
    }

    // Aplicar capitalização correta
    applyProperCapitalization(text) {
        if (!text) return '';
        
        const prepositions = ['da', 'de', 'do', 'das', 'dos', 'e', 'em'];
        const words = text.toLowerCase().split(' ');
        
        const capitalizedWords = words.map((word, index) => {
            if (!word) return word;
            
            if (index > 0 && prepositions.includes(word.toLowerCase())) {
                return word.toLowerCase();
            }
            
            const specialTerms = {
                'são': 'São',
                'santo': 'Santo',
                'santa': 'Santa'
            };
            
            const lowerWord = word.toLowerCase();
            if (specialTerms[lowerWord]) {
                return specialTerms[lowerWord];
            }
            
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
        
        return capitalizedWords.join(' ');
    }

    // Debug de endereço
    debugEndereco(cliente) {
        console.log('🔍 DEBUG - Validando endereço:', cliente);
        
        const resultado = this.validateAndCorrectAddress(cliente);
        
        console.log('📊 Resultado da validação:');
        console.log('  Original:', resultado.original);
        console.log('  Corrigido:', resultado.corrigido);
        console.log('  Endereço formatado:', resultado.enderecoFormatado);
        console.log('  Correções:', resultado.correcoes);
        console.log('  Warnings:', resultado.warnings);
        console.log('  Confiança:', resultado.confianca);
        
        return resultado;
    }
}

// Instanciar e disponibilizar globalmente
window.AddressValidator = new AddressValidator();

console.log('✅ address-validator.js API Real carregado');
