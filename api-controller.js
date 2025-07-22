// api-controller.js - CONTROLE RIGOROSO de APIs
class APIController {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequest = 0;
        
        // Rate limits RIGOROSOS
        this.limits = {
            nominatim: 2000, // 2 segundos entre requests
            viacep: 1000     // 1 segundo entre requests
        };
        
        // Cache robusto
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 horas
        
        console.log('✅ APIController inicializado com rate limiting rigoroso');
    }

    async processQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                await this.enforceRateLimit(request.service);
                const result = await this.executeRequest(request);
                request.resolve(result);
                
            } catch (error) {
                request.reject(error);
            }
        }
        
        this.isProcessing = false;
    }

    async enforceRateLimit(service) {
        const limit = this.limits[service] || 1000;
        const elapsed = Date.now() - this.lastRequest;
        
        if (elapsed < limit) {
            const delay = limit - elapsed;
            console.log(`⏳ Rate limit ${service}: aguardando ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequest = Date.now();
    }

    async geocode(address) {
        return new Promise((resolve, reject) => {
            // Verificar cache primeiro
            const cacheKey = address.toLowerCase().trim();
            const cached = this.cache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
                console.log('📦 Cache hit:', address.substring(0, 50));
                resolve(cached.data);
                return;
            }
            
            // Adicionar à queue
            this.requestQueue.push({
                service: 'nominatim',
                address: address,
                resolve: resolve,
                reject: reject
            });
            
            this.processQueue();
        });
    }

    async executeRequest(request) {
        const { service, address } = request;
        
        try {
            let result = null;
            
            if (service === 'nominatim') {
                result = await this.queryNominatim(address);
            }
            
            if (result) {
                // Cache resultado
                this.cache.set(address.toLowerCase().trim(), {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Request ${service} falhou:`, error.message);
            throw error;
        }
    }

    async queryNominatim(address) {
        const params = new URLSearchParams({
            q: address,
            format: 'json',
            limit: '1',
            countrycodes: 'BR',
            'accept-language': 'pt-BR'
        });
        
        const url = `https://nominatim.openstreetmap.org/search?${params}`;
        
        console.log(`🌐 Nominatim: ${address.substring(0, 50)}...`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PMG-Agenda/1.0'
            },
            signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Nenhum resultado');
        }
        
        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            display_name: result.display_name,
            confidence: 0.8
        };
    }
}

window.apiController = new APIController();
console.log('✅ api-controller.js carregado');
