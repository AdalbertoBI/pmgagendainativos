// database.js - Sistema de banco de dados robusto para PMG Agenda

class Database {
    constructor() {
        this.version = '2.1.0';
        this.dbName = 'pmg_agenda_main_db';
        this.dbVersion = 8;
        this.db = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.connectionRetries = 0;
        this.maxRetries = 5;
        this.retryDelay = 1000;
        
        // Configuração das stores
        this.stores = {
            clients: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'nomeFantasia', keyPath: 'Nome Fantasia', unique: false },
                    { name: 'cidade', keyPath: 'Cidade', unique: false },
                    { name: 'status', keyPath: 'Status', unique: false },
                    { name: 'timestamp', keyPath: 'Timestamp', unique: false }
                ]
            },
            ativos: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'nomeFantasia', keyPath: 'Nome Fantasia', unique: false },
                    { name: 'dataAtivacao', keyPath: 'Data Ativação', unique: false },
                    { name: 'dataPedido', keyPath: 'Data Pedido', unique: false }
                ]
            },
            novos: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'nomeFantasia', keyPath: 'Nome Fantasia', unique: false },
                    { name: 'dataNovo', keyPath: 'Data Novo', unique: false }
                ]
            },
            agenda: {
                keyPath: 'id',
                autoIncrement: false,
                indexes: [
                    { name: 'clienteId', keyPath: 'clienteId', unique: false },
                    { name: 'dia', keyPath: 'dia', unique: false },
                    { name: 'status', keyPath: 'status', unique: false }
                ]
            },
            observacoes: {
                keyPath: 'clienteId',
                autoIncrement: false,
                indexes: [
                    { name: 'timestamp', keyPath: 'timestamp', unique: false }
                ]
            },
            configuracoes: {
                keyPath: 'chave',
                autoIncrement: false,
                indexes: []
            },
            backup: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'timestamp', keyPath: 'timestamp', unique: false },
                    { name: 'tipo', keyPath: 'tipo', unique: false }
                ]
            },
            logs: {
                keyPath: 'id',
                autoIncrement: true,
                indexes: [
                    { name: 'timestamp', keyPath: 'timestamp', unique: false },
                    { name: 'tipo', keyPath: 'tipo', unique: false },
                    { name: 'nivel', keyPath: 'nivel', unique: false }
                ]
            }
        };
        
        this.eventHandlers = {
            onDataChange: [],
            onError: [],
            onBackup: []
        };
    }

    // Inicializar banco de dados
    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInit();
        return this.initializationPromise;
    }

    async _performInit() {
        console.log('🗄️ Inicializando sistema de banco de dados...');
        
        if (!window.indexedDB) {
            throw new Error('IndexedDB não é suportado neste navegador');
        }

        try {
            await this._initializeDatabase();
            await this._performMaintenance();
            await this._loadConfigurations();
            
            this.isInitialized = true;
            console.log('✅ Banco de dados inicializado com sucesso');
            
            // Verificar integridade dos dados
            await this._verifyDataIntegrity();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar banco:', error);
            
            if (this.connectionRetries < this.maxRetries) {
                this.connectionRetries++;
                console.log(`🔄 Tentativa ${this.connectionRetries}/${this.maxRetries} em ${this.retryDelay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                this.retryDelay *= 2; // Backoff exponencial
                
                this.initializationPromise = null;
                return this.init();
            }
            
            throw error;
        }
    }

    async _initializeDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error(`Erro ao abrir banco: ${request.error?.message || 'Erro desconhecido'}`));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                this.db.onerror = (errorEvent) => {
                    console.error('❌ Erro no banco de dados:', errorEvent.target.error);
                    this._emitEvent('onError', errorEvent.target.error);
                };

                this.db.onclose = () => {
                    console.warn('⚠️ Conexão com banco foi fechada');
                    this.isInitialized = false;
                };

                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                const oldVersion = event.oldVersion;
                
                console.log(`🔧 Atualizando banco da versão ${oldVersion} para ${this.dbVersion}`);
                
                try {
                    this._createStores(oldVersion);
                    this._migrateData(oldVersion);
                } catch (error) {
                    console.error('❌ Erro no upgrade do banco:', error);
                    reject(error);
                }
            };

            request.onblocked = () => {
                console.warn('⚠️ Upgrade do banco bloqueado. Feche outras abas da aplicação.');
            };
        });
    }

    _createStores(oldVersion) {
        Object.entries(this.stores).forEach(([storeName, storeConfig]) => {
            let store;
            
            // Criar store se não existir
            if (!this.db.objectStoreNames.contains(storeName)) {
                store = this.db.createObjectStore(storeName, {
                    keyPath: storeConfig.keyPath,
                    autoIncrement: storeConfig.autoIncrement
                });
                console.log(`📦 Store '${storeName}' criada`);
            } else {
                // Obter store existente para criar novos índices
                const transaction = this.db.transaction || 
                    (this.db.transaction ? this.db.transaction([storeName], 'readwrite') : null);
                if (transaction) {
                    store = transaction.objectStore(storeName);
                }
            }

            // Criar índices
            if (store && storeConfig.indexes) {
                storeConfig.indexes.forEach(indexConfig => {
                    if (!store.indexNames.contains(indexConfig.name)) {
                        try {
                            store.createIndex(indexConfig.name, indexConfig.keyPath, {
                                unique: indexConfig.unique
                            });
                            console.log(`📊 Índice '${indexConfig.name}' criado em '${storeName}'`);
                        } catch (error) {
                            console.warn(`⚠️ Erro ao criar índice '${indexConfig.name}':`, error);
                        }
                    }
                });
            }
        });
    }

    _migrateData(oldVersion) {
        // Migração de dados entre versões
        console.log(`🔄 Migrando dados da versão ${oldVersion}`);
        
        if (oldVersion < 5) {
            // Migração para versão 5: adicionar campos de timestamp
            this._addTimestampFields();
        }
        
        if (oldVersion < 6) {
            // Migração para versão 6: normalizar estrutura de dados
            this._normalizeDataStructure();
        }
        
        if (oldVersion < 7) {
            // Migração para versão 7: adicionar sistema de backup
            this._initializeBackupSystem();
        }
        
        if (oldVersion < 8) {
            // Migração para versão 8: adicionar logs
            this._initializeLoggingSystem();
        }
    }

    async _addTimestampFields() {
        const stores = ['clients', 'ativos', 'novos'];
        
        for (const storeName of stores) {
            try {
                const data = await this._getAllFromStore(storeName);
                const updatedData = data.map(item => ({
                    ...item,
                    Timestamp: item.Timestamp || Date.now(),
                    'Ultima Modificacao': Date.now()
                }));
                
                await this._clearStore(storeName);
                await this._bulkInsert(storeName, updatedData);
                
                console.log(`✅ Timestamps adicionados em '${storeName}'`);
            } catch (error) {
                console.warn(`⚠️ Erro na migração de '${storeName}':`, error);
            }
        }
    }

    async _normalizeDataStructure() {
        // Normalizar estrutura dos dados para consistência
        const stores = ['clients', 'ativos', 'novos'];
        
        for (const storeName of stores) {
            try {
                const data = await this._getAllFromStore(storeName);
                const normalizedData = data.map(item => this._normalizeClientData(item));
                
                await this._clearStore(storeName);
                await this._bulkInsert(storeName, normalizedData);
                
                console.log(`✅ Dados normalizados em '${storeName}'`);
            } catch (error) {
                console.warn(`⚠️ Erro na normalização de '${storeName}':`, error);
            }
        }
    }

    _normalizeClientData(client) {
        return {
            id: client.id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            'Nome Fantasia': client['Nome Fantasia'] || client.nomeFantasia || '',
            'Cliente': client.Cliente || client.cliente || client['Nome Fantasia'] || '',
            'Contato': client.Contato || client.contato || '',
            'Celular': client.Celular || client.celular || '',
            'Telefone': client.Telefone || client.telefone || '',
            'CNPJ/CPF': client['CNPJ/CPF'] || client.cnpj || client.cpf || '',
            'Email': client.Email || client.email || '',
            'Endereço': client.Endereço || client.endereco || '',
            'Cidade': client.Cidade || client.cidade || 'São José dos Campos',
            'UF': client.UF || client.uf || 'SP',
            'CEP': client.CEP || client.cep || '',
            'Segmento': client.Segmento || client.segmento || '',
            'Status': client.Status || client.status || 'Inativo',
            'Timestamp': client.Timestamp || Date.now(),
            'Ultima Modificacao': Date.now(),
            ...client // Preservar outros campos
        };
    }

    async _initializeBackupSystem() {
        console.log('🔧 Inicializando sistema de backup...');
        // Sistema de backup será inicializado automaticamente com as stores
    }

    async _initializeLoggingSystem() {
        console.log('🔧 Inicializando sistema de logs...');
        await this._log('system', 'Sistema de logs inicializado', 'info');
    }

    // Operações CRUD básicas
    async save(storeName, data) {
        if (!this.isInitialized) await this.init();
        
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Adicionar timestamp de modificação
            const dataWithTimestamp = {
                ...data,
                'Ultima Modificacao': Date.now()
            };
            
            const request = store.put(dataWithTimestamp);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    this._emitEvent('onDataChange', { action: 'save', store: storeName, data });
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            await this._log('database', `Erro ao salvar em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async get(storeName, key) {
        if (!this.isInitialized) await this.init();
        
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            await this._log('database', `Erro ao buscar ${key} em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async getAll(storeName) {
        if (!this.isInitialized) await this.init();
        
        try {
            return await this._getAllFromStore(storeName);
        } catch (error) {
            await this._log('database', `Erro ao buscar todos em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async _getAllFromStore(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        if (!this.isInitialized) await this.init();
        
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    this._emitEvent('onDataChange', { action: 'delete', store: storeName, key });
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            await this._log('database', `Erro ao deletar ${key} em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async clear(storeName) {
        if (!this.isInitialized) await this.init();
        
        try {
            await this._clearStore(storeName);
            this._emitEvent('onDataChange', { action: 'clear', store: storeName });
            
        } catch (error) {
            await this._log('database', `Erro ao limpar ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async _clearStore(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Operações em lote
    async bulkSave(storeName, dataArray) {
        if (!this.isInitialized) await this.init();
        
        try {
            await this._bulkInsert(storeName, dataArray);
            this._emitEvent('onDataChange', { action: 'bulkSave', store: storeName, count: dataArray.length });
            
            console.log(`✅ ${dataArray.length} registros salvos em '${storeName}'`);
            
        } catch (error) {
            await this._log('database', `Erro no bulk save em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async _bulkInsert(storeName, dataArray) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const promises = dataArray.map(data => {
            const dataWithTimestamp = {
                ...data,
                'Ultima Modificacao': Date.now()
            };
            
            return new Promise((resolve, reject) => {
                const request = store.put(dataWithTimestamp);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });
        
        await Promise.all(promises);
    }

    // Consultas avançadas
    async query(storeName, indexName, value, limit = null) {
        if (!this.isInitialized) await this.init();
        
        try {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName) {
                const index = store.index(indexName);
                request = value ? index.getAll(value, limit) : index.getAll(null, limit);
            } else {
                request = store.getAll(null, limit);
            }
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            await this._log('database', `Erro na consulta em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    async search(storeName, searchTerm, fields = ['Nome Fantasia']) {
        if (!this.isInitialized) await this.init();
        
        try {
            const allData = await this.getAll(storeName);
            const searchTermLower = searchTerm.toLowerCase();
            
            return allData.filter(item => {
                return fields.some(field => {
                    const value = item[field];
                    return value && value.toString().toLowerCase().includes(searchTermLower);
                });
            });
            
        } catch (error) {
            await this._log('database', `Erro na busca em ${storeName}: ${error.message}`, 'error');
            throw error;
        }
    }

    // Sistema de backup
    async createBackup(description = 'Backup automático') {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log('💾 Criando backup...');
            
            const backupData = {};
            const dataStores = ['clients', 'ativos', 'novos', 'agenda', 'observacoes'];
            
            // Coletar dados de todas as stores
            for (const storeName of dataStores) {
                backupData[storeName] = await this.getAll(storeName);
            }
            
            // Salvar backup
            const backup = {
                id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                data: backupData,
                description: description,
                version: this.version,
                tipo: 'manual'
            };
            
            await this.save('backup', backup);
            
            // Limitar número de backups (manter apenas os 10 mais recentes)
            await this._cleanOldBackups();
            
            console.log('✅ Backup criado com sucesso');
            this._emitEvent('onBackup', backup);
            
            return backup.id;
            
        } catch (error) {
            await this._log('database', `Erro ao criar backup: ${error.message}`, 'error');
            throw error;
        }
    }

    async restoreBackup(backupId) {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log(`🔄 Restaurando backup ${backupId}...`);
            
            const backup = await this.get('backup', backupId);
            if (!backup) {
                throw new Error('Backup não encontrado');
            }
            
            // Restaurar dados
            const dataStores = ['clients', 'ativos', 'novos', 'agenda', 'observacoes'];
            
            for (const storeName of dataStores) {
                if (backup.data[storeName]) {
                    await this.clear(storeName);
                    await this.bulkSave(storeName, backup.data[storeName]);
                }
            }
            
            await this._log('database', `Backup ${backupId} restaurado com sucesso`, 'info');
            console.log('✅ Backup restaurado com sucesso');
            
        } catch (error) {
            await this._log('database', `Erro ao restaurar backup: ${error.message}`, 'error');
            throw error;
        }
    }

    async listBackups() {
        if (!this.isInitialized) await this.init();
        
        try {
            const backups = await this.query('backup', 'timestamp', null);
            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            return [];
        }
    }

    async _cleanOldBackups(maxBackups = 10) {
        try {
            const backups = await this.listBackups();
            
            if (backups.length > maxBackups) {
                const toDelete = backups.slice(maxBackups);
                
                for (const backup of toDelete) {
                    await this.delete('backup', backup.id);
                }
                
                console.log(`🧹 ${toDelete.length} backups antigos removidos`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao limpar backups antigos:', error);
        }
    }

    // Sistema de logs
    async _log(categoria, mensagem, nivel = 'info') {
        if (!this.db) return;
        
        try {
            const log = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                categoria: categoria,
                mensagem: mensagem,
                nivel: nivel,
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            const transaction = this.db.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            store.add(log);
            
        } catch (error) {
            console.warn('⚠️ Erro ao salvar log:', error);
        }
    }

    async getLogs(limit = 100, nivel = null) {
        if (!this.isInitialized) await this.init();
        
        try {
            let logs;
            
            if (nivel) {
                logs = await this.query('logs', 'nivel', nivel, limit);
            } else {
                logs = await this.query('logs', 'timestamp', null, limit);
            }
            
            return logs.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('❌ Erro ao buscar logs:', error);
            return [];
        }
    }

    async clearLogs(olderThan = null) {
        if (!this.isInitialized) await this.init();
        
        try {
            if (olderThan) {
                // Limpar logs mais antigos que uma data específica
                const logs = await this.getAll('logs');
                const toDelete = logs.filter(log => log.timestamp < olderThan);
                
                for (const log of toDelete) {
                    await this.delete('logs', log.id);
                }
                
                console.log(`🧹 ${toDelete.length} logs antigos removidos`);
            } else {
                // Limpar todos os logs
                await this.clear('logs');
                console.log('🧹 Todos os logs foram removidos');
            }
        } catch (error) {
            console.error('❌ Erro ao limpar logs:', error);
        }
    }

    // Configurações
    async _loadConfigurations() {
        try {
            // Carregar configurações padrão se não existirem
            const configs = await this.getAll('configuracoes');
            
            if (configs.length === 0) {
                await this._createDefaultConfigurations();
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações:', error);
        }
    }

    async _createDefaultConfigurations() {
        const defaultConfigs = [
            {
                chave: 'backup_automatico',
                valor: true,
                descricao: 'Backup automático habilitado'
            },
            {
                chave: 'backup_intervalo',
                valor: 24, // horas
                descricao: 'Intervalo entre backups automáticos'
            },
            {
                chave: 'log_level',
                valor: 'info',
                descricao: 'Nível de logging'
            },
            {
                chave: 'max_logs',
                valor: 1000,
                descricao: 'Máximo de logs a manter'
            }
        ];
        
        for (const config of defaultConfigs) {
            await this.save('configuracoes', config);
        }
        
        console.log('⚙️ Configurações padrão criadas');
    }

    async getConfig(chave) {
        if (!this.isInitialized) await this.init();
        
        try {
            return await this.get('configuracoes', chave);
        } catch (error) {
            console.warn(`⚠️ Erro ao buscar configuração '${chave}':`, error);
            return null;
        }
    }

    async setConfig(chave, valor, descricao = '') {
        if (!this.isInitialized) await this.init();
        
        try {
            const config = {
                chave: chave,
                valor: valor,
                descricao: descricao,
                timestamp: Date.now()
            };
            
            await this.save('configuracoes', config);
            console.log(`⚙️ Configuração '${chave}' atualizada`);
            
        } catch (error) {
            console.error(`❌ Erro ao salvar configuração '${chave}':`, error);
            throw error;
        }
    }

    // Manutenção e otimização
    async _performMaintenance() {
        try {
            // Backup automático se configurado
            const backupConfig = await this.getConfig('backup_automatico');
            if (backupConfig?.valor) {
                await this._checkAutoBackup();
            }
            
            // Limpeza de logs antigos
            const maxLogsConfig = await this.getConfig('max_logs');
            if (maxLogsConfig?.valor) {
                await this._cleanOldLogs(maxLogsConfig.valor);
            }
            
        } catch (error) {
            console.warn('⚠️ Erro na manutenção:', error);
        }
    }

    async _checkAutoBackup() {
        try {
            const intervalConfig = await this.getConfig('backup_intervalo');
            const intervalo = intervalConfig?.valor || 24; // horas
            
            const backups = await this.listBackups();
            const lastBackup = backups[0];
            
            if (!lastBackup || (Date.now() - lastBackup.timestamp) > (intervalo * 60 * 60 * 1000)) {
                await this.createBackup('Backup automático');
            }
        } catch (error) {
            console.warn('⚠️ Erro no backup automático:', error);
        }
    }

    async _cleanOldLogs(maxLogs) {
        try {
            const logs = await this.getAll('logs');
            
            if (logs.length > maxLogs) {
                const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
                const toDelete = sortedLogs.slice(maxLogs);
                
                for (const log of toDelete) {
                    await this.delete('logs', log.id);
                }
                
                console.log(`🧹 ${toDelete.length} logs antigos removidos`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao limpar logs antigos:', error);
        }
    }

    async _verifyDataIntegrity() {
        try {
            console.log('🔍 Verificando integridade dos dados...');
            
            const stores = ['clients', 'ativos', 'novos'];
            let totalRecords = 0;
            let corruptedRecords = 0;
            
            for (const storeName of stores) {
                const data = await this.getAll(storeName);
                totalRecords += data.length;
                
                // Verificar registros corrompidos
                const corrupted = data.filter(item => !item.id || !item['Nome Fantasia']);
                corruptedRecords += corrupted.length;
                
                if (corrupted.length > 0) {
                    console.warn(`⚠️ ${corrupted.length} registros corrompidos encontrados em '${storeName}'`);
                    await this._fixCorruptedRecords(storeName, corrupted);
                }
            }
            
            console.log(`✅ Integridade verificada: ${totalRecords} registros, ${corruptedRecords} corrompidos`);
            
        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
        }
    }

    async _fixCorruptedRecords(storeName, corruptedRecords) {
        try {
            for (const record of corruptedRecords) {
                // Tentar corrigir o registro
                const fixedRecord = {
                    ...record,
                    id: record.id || `fixed-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    'Nome Fantasia': record['Nome Fantasia'] || 'Cliente sem nome',
                    'Ultima Modificacao': Date.now()
                };
                
                await this.save(storeName, fixedRecord);
            }
            
            console.log(`🔧 ${corruptedRecords.length} registros corrigidos em '${storeName}'`);
        } catch (error) {
            console.error(`❌ Erro ao corrigir registros em '${storeName}':`, error);
        }
    }

    // Sistema de eventos
    addEventListener(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        }
    }

    removeEventListener(event, handler) {
        if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[event].splice(index, 1);
            }
        }
    }

    _emitEvent(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Erro no handler do evento '${event}':`, error);
                }
            });
        }
    }

    // Estatísticas e informações
    async getStats() {
        if (!this.isInitialized) await this.init();
        
        try {
            const stats = {
                version: this.version,
                dbVersion: this.dbVersion,
                isInitialized: this.isInitialized,
                stores: {}
            };
            
            for (const storeName of Object.keys(this.stores)) {
                const data = await this.getAll(storeName);
                stats.stores[storeName] = {
                    count: data.length,
                    size: this._calculateSize(data)
                };
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return null;
        }
    }

    _calculateSize(data) {
        return new Blob([JSON.stringify(data)]).size;
    }

    // Exportar/Importar dados
    async exportAllData() {
        if (!this.isInitialized) await this.init();
        
        try {
            const exportData = {
                timestamp: Date.now(),
                version: this.version,
                data: {}
            };
            
            const dataStores = ['clients', 'ativos', 'novos', 'agenda', 'observacoes', 'configuracoes'];
            
            for (const storeName of dataStores) {
                exportData.data[storeName] = await this.getAll(storeName);
            }
            
            return exportData;
        } catch (error) {
            console.error('❌ Erro ao exportar dados:', error);
            throw error;
        }
    }

    async importAllData(importData) {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log('📥 Importando dados...');
            
            // Validar dados de importação
            if (!importData.data) {
                throw new Error('Dados de importação inválidos');
            }
            
            // Criar backup antes da importação
            await this.createBackup('Backup antes da importação');
            
            // Importar dados
            for (const [storeName, data] of Object.entries(importData.data)) {
                if (Array.isArray(data) && data.length > 0) {
                    await this.clear(storeName);
                    await this.bulkSave(storeName, data);
                    console.log(`✅ ${data.length} registros importados em '${storeName}'`);
                }
            }
            
            await this._log('database', 'Dados importados com sucesso', 'info');
            console.log('✅ Importação concluída com sucesso');
            
        } catch (error) {
            await this._log('database', `Erro na importação: ${error.message}`, 'error');
            throw error;
        }
    }

    // Cleanup e destruição
    async destroy() {
        try {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            this.isInitialized = false;
            this.initializationPromise = null;
            
            console.log('🗑️ Database destruído');
        } catch (error) {
            console.error('❌ Erro ao destruir database:', error);
        }
    }
}

// Instância global
window.Database = new Database();
console.log('✅ database.js carregado - Sistema de banco robusto');
