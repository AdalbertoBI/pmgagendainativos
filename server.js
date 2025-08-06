const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001; // Porta do seu backend

// Configurar CORS para permitir requisições do frontend
app.use(cors({
    origin: ['http://localhost:8000', 'http://127.0.0.1:8000'], // Seu frontend
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Endpoint para buscar CNPJ
app.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        
        // Validar CNPJ (apenas números, 14 dígitos)
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            return res.status(400).json({ 
                error: 'CNPJ deve ter 14 dígitos',
                status: 'ERROR' 
            });
        }

        console.log(`🔍 Buscando CNPJ: ${cnpjLimpo}`);

        // Fazer requisição para ReceitaWS
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PMG-Sistema-Prospeccao/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Verificar se a API retornou erro
        if (data.status === 'ERROR') {
            return res.status(404).json({
                error: data.message || 'CNPJ não encontrado',
                status: 'ERROR'
            });
        }

        console.log(`✅ CNPJ encontrado: ${data.nome}`);
        
        // Retornar dados para o frontend
        res.json(data);

    } catch (error) {
        console.error('❌ Erro na consulta CNPJ:', error);
        
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message,
            status: 'ERROR' 
        });
    }
});

// Endpoint de teste
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API funcionando',
        timestamp: new Date().toISOString() 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 Teste em: http://localhost:${PORT}/api/health`);
    console.log(`🔍 Exemplo: http://localhost:${PORT}/api/cnpj/44075808000103`);
});
