# 📊 Sistema de Enriquecimento de Dados Demográficos

## 🎯 **Objetivo**
Enriquecer automaticamente os dados dos clientes consultados por CNPJ com informações demográficas, de mercado e análise competitiva utilizando apenas APIs gratuitas.

## 🔍 **Funcionamento**

### **1. Dados Básicos (CNPJ)**
- Obtém informações da empresa via APIs gratuitas (BrasilAPI, CNPJ.ws)
- Inclui: nome, endereço, CEP, CNAE, atividade principal

### **2. Enriquecimento Demográfico**
Utiliza o CEP para obter:

#### **📍 Coordenadas Geográficas**
- **API**: ViaCEP + Nominatim (OpenStreetMap)
- **Dados**: Latitude/Longitude precisas do endereço

#### **👥 Demografia Local (Raio 5km)**
- **API**: Overpass API (OpenStreetMap)
- **Dados Obtidos**:
  - População estimada no raio de 5km
  - Densidade populacional (hab/km²)
  - Localidades próximas e seus tipos

#### **🏪 Análise Competitiva (Raio 5km)**
- **API**: Overpass API (OpenStreetMap)
- **Dados Obtidos**:
  - Total de estabelecimentos comerciais
  - Densidade comercial (est/km²)
  - Tipos de estabelecimentos predominantes
  - Lista de concorrentes próximos

#### **🎯 Mercado Local (Raio 2km)**
- **API**: Overpass API (OpenStreetMap)
- **Análise de Amenidades**:
  - Bancos, ATMs
  - Restaurantes, cafés
  - Farmácias, hospitais
  - Escolas, universidades
  - Shopping centers
- **Score de Atratividade**: 0-100 baseado nas amenidades
- **Classificação da Área**: 
  - Área Comercial Intensa
  - Área Comercial Moderada  
  - Área Residencial com Comércio
  - Área Residencial
  - Área Rural ou Pouco Desenvolvida

#### **💰 Dados Econômicos Regionais**
- **API**: IBGE (Serviços de Dados)
- **Dados Obtidos**:
  - Código IBGE do município
  - Dados socioeconômicos oficiais
  - Informações estatísticas regionais

## 🚀 **Como Usar**

### **Método Integrado (Recomendado)**
1. Digite um CNPJ no campo
2. Adicione palavras-chave do cardápio
3. Clique em "**Analisar e Criar Prospecção**"
4. O sistema executará automaticamente:
   - Busca de dados básicos do CNPJ
   - **Enriquecimento demográfico completo**
   - Análise de cardápio
   - Sugestões de produtos
   - Criação de prospecção personalizada

### **Método Alternativo (Apenas Dados CNPJ)**
1. Digite um CNPJ no campo
2. Clique em "**Buscar API**"
3. O enriquecimento é executado automaticamente após obter os dados básicos

## 📋 **Onde São Exibidas as Informações**

### **Seção "Informações da Empresa"**
Todas as informações enriquecidas são exibidas de forma organizada:

#### **📊 Dados Básicos da Empresa**
- Nome/Fantasia, CNPJ, CNAE
- Atividade principal
- Endereço completo, CEP
- Situação, abertura, capital social
- Telefone e email (se disponíveis)

#### **📊 Análise Demográfica e de Mercado**
- **Demografia Local (5km)**: População e densidade
- **Análise Competitiva (5km)**: Estabelecimentos e concorrência
- **Mercado Local (2km)**: Score de atratividade e classificação
- **Dados Econômicos**: Informações regionais oficiais
- **Localização Geográfica**: Coordenadas precisas

### **👥 Demografia Local (5km)**
```
População Estimada: 45.230 habitantes
Densidade: 1.809 hab/km²
```

### **🏪 Análise Competitiva (5km)**
```
Estabelecimentos: 234
Densidade Comercial: 9 est/km²
Tipos Predominantes: [restaurante (45), loja (32), farmácia (18)]
```

### **🎯 Mercado Local (2km)**
```
Score Atratividade: 78/100
Classificação: Área Comercial Moderada
```

## 🔧 **APIs Utilizadas (Todas Gratuitas)**

| API | Finalidade | Limite | Chave Necessária |
|-----|------------|--------|------------------|
| **ViaCEP** | Dados do CEP | Ilimitado | ❌ Não |
| **Nominatim** | Coordenadas | Limitado por uso | ❌ Não |
| **Overpass API** | Dados geográficos | Limitado por uso | ❌ Não |
| **IBGE** | Dados econômicos | Ilimitado | ❌ Não |
| **BrasilAPI** | Dados CNPJ | Limitado por uso | ❌ Não |
| **CNPJ.ws** | Dados CNPJ | Limitado por uso | ❌ Não |

## ⚡ **Performance & Cache**

### **Sistema de Cache**
- Cache automático em memória
- Evita requisições desnecessárias
- Dados armazenados por sessão

### **Timeouts & Limites**
- Timeout de 25 segundos por API
- Fallback automático entre APIs
- Tratamento de erros robusto

## 🎨 **Interface**

### **Loading States**
- Indicadores visuais de progresso
- Mensagens informativas
- Botões com estados de carregamento

### **Exibição de Resultados**
- Cards organizados por categoria
- Cores indicativas para scores
- Layout responsivo
- Tags visuais para tipos de estabelecimentos

## 🛠️ **Implementação Técnica**

### **Estrutura de Arquivos**
```
enriquecimento-dados.js    // Lógica principal do enriquecimento
cnpj-api.js               // APIs de consulta CNPJ (modificado)
prospeccao.js             // Integração com sistema (modificado)
prospeccao.html           // Interface (modificado)
prospeccao.css            // Estilos dos dados enriquecidos (modificado)
```

### **Principais Funções**
- `enriquecerDadosCliente()` - Função principal
- `obterCoordenadasPorCEP()` - Conversão CEP → Coordenadas
- `obterDadosDemograficos()` - População e densidade
- `buscarEstabelecimentosSimilares()` - Análise competitiva
- `analisarMercadoLocal()` - Score de atratividade
- `obterDadosEconomicosRegiao()` - Dados IBGE

## 🎯 **Benefícios para Vendas**

### **Segmentação Inteligente**
- Identifica potencial de mercado por região
- Analisa densidade de concorrentes
- Avalia atratividade comercial da área

### **Estratégia de Abordagem**
- Adapta discurso conforme perfil demográfico
- Identifica oportunidades baseadas em amenidades
- Personaliza ofertas por região

### **Qualificação de Leads**
- Score automático de atratividade
- Classificação de área comercial
- Densidade populacional como indicador de potencial

## 🚨 **Limitações**

1. **Dependência de APIs Externas**: Sujeito a instabilidades
2. **Precisão dos Dados**: Baseado em dados disponíveis no OpenStreetMap
3. **Cobertura Geográfica**: Melhor para áreas urbanas
4. **Limites de Uso**: APIs têm rate limits informais
5. **Dados Atualizados**: Dependem da atualização das fontes

## 🔮 **Possíveis Melhorias Futuras**

1. **Cache Persistente**: Armazenar dados no localStorage
2. **Integração Google Places**: Dados mais precisos (requer chave)
3. **Análise de Renda**: Dados socioeconômicos mais detalhados  
4. **Mapas Visuais**: Integração com mapas interativos
5. **Relatórios**: Exportação de análises completas
6. **Histórico**: Comparação temporal de dados

---

## 📞 **Suporte Técnico**

Para dúvidas ou melhorias, consulte:
- Logs do console do navegador
- Função `window.debugProspeccaoClients()` para debug
- Arquivo `enriquecimento-dados.js` para customizações
