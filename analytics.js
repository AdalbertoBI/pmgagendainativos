// analytics.js - Sistema completo de analytics para PMG Agenda

class Analytics {
    constructor() {
        this.version = '1.0.0';
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.startTime = Date.now();
        this.events = [];
        this.metrics = {
            pageViews: 0,
            interactions: 0,
            errors: 0,
            performance: {}
        };
        this.config = {
            enableTracking: true,
            enablePerformance: true,
            enableErrors: true,
            enableHeatmap: false,
            batchSize: 50,
            flushInterval: 30000, // 30 segundos
            maxEvents: 1000
        };
        this.db = null;
        this.isInitialized = false;
    }

    // Inicializar sistema de analytics
    async init(config = {}) {
        try {
            console.log('📊 Inicializando Analytics...');
            
            // Aplicar configurações personalizadas
            this.config = { ...this.config, ...config };
            
            // Inicializar IndexedDB para analytics
            await this.initDB();
            
            // Configurar listeners de eventos
            this.setupEventListeners();
            
            // Configurar flush automático
            this.setupAutoFlush();
            
            // Coletar métricas de performance
            if (this.config.enablePerformance) {
                this.collectPerformanceMetrics();
            }

            // Registrar início da sessão
            this.trackEvent('session_start', {
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                url: window.location.href
            });

            this.isInitialized = true;
            console.log('✅ Analytics inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Analytics:', error);
        }
    }

    // Inicializar banco de dados para analytics
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('analytics_db', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para eventos
                if (!db.objectStoreNames.contains('events')) {
                    const eventsStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                    eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    eventsStore.createIndex('event', 'event', { unique: false });
                    eventsStore.createIndex('sessionId', 'sessionId', { unique: false });
                }

                // Store para métricas
                if (!db.objectStoreNames.contains('metrics')) {
                    const metricsStore = db.createObjectStore('metrics', { keyPath: 'id', autoIncrement: true });
                    metricsStore.createIndex('date', 'date', { unique: false });
                    metricsStore.createIndex('type', 'type', { unique: false });
                }

                // Store para erros
                if (!db.objectStoreNames.contains('errors')) {
                    const errorsStore = db.createObjectStore('errors', { keyPath: 'id', autoIncrement: true });
                    errorsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    errorsStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Gerar ID de sessão único
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Obter ou gerar ID de usuário
    getUserId() {
        let userId = localStorage.getItem('analytics_user_id');
        if (!userId) {
            userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('analytics_user_id', userId);
        }
        return userId;
    }

    // Configurar listeners de eventos globais
    setupEventListeners() {
        // Click tracking
        document.addEventListener('click', (event) => {
            this.trackClick(event);
        });

        // Page visibility
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('page_visibility', {
                visible: !document.hidden,
                timestamp: Date.now()
            });
        });

        // Unload tracking
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                sessionDuration: Date.now() - this.startTime,
                timestamp: Date.now()
            });
            this.flush(true); // Flush síncrono
        });

        // Error tracking
        if (this.config.enableErrors) {
            window.addEventListener('error', (event) => {
                this.trackError({
                    type: 'javascript_error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error ? event.error.stack : null
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.trackError({
                    type: 'unhandled_promise_rejection',
                    reason: event.reason,
                    stack: event.reason ? event.reason.stack : null
                });
            });
        }

        // Scroll tracking
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackEvent('scroll', {
                    scrollY: window.scrollY,
                    scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
                    timestamp: Date.now()
                });
            }, 250);
        });

        // Resize tracking
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.trackEvent('window_resize', {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    timestamp: Date.now()
                });
            }, 250);
        });
    }

    // Configurar flush automático
    setupAutoFlush() {
        setInterval(() => {
            if (this.events.length > 0) {
                this.flush();
            }
        }, this.config.flushInterval);

        // Flush quando atingir batchSize
        if (this.events.length >= this.config.batchSize) {
            this.flush();
        }
    }

    // Rastrear evento genérico
    trackEvent(eventName, data = {}) {
        if (!this.config.enableTracking) return;

        const event = {
            id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            event: eventName,
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            data: data
        };

        this.events.push(event);
        this.metrics.interactions++;

        // Limitar número de eventos em memória
        if (this.events.length > this.config.maxEvents) {
            this.events = this.events.slice(-this.config.maxEvents);
        }

        console.log(`📊 Event: ${eventName}`, data);

        // Auto-flush se necessário
        if (this.events.length >= this.config.batchSize) {
            this.flush();
        }
    }

    // Rastrear cliques
    trackClick(event) {
        const element = event.target;
        const data = {
            tagName: element.tagName,
            id: element.id || null,
            className: element.className || null,
            text: element.textContent ? element.textContent.substring(0, 100) : null,
            href: element.href || null,
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        };

        this.trackEvent('click', data);
    }

    // Rastrear erros
    trackError(error) {
        if (!this.config.enableErrors) return;

        const errorData = {
            id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            url: window.location.href,
            ...error
        };

        this.metrics.errors++;

        // Salvar erro no IndexedDB
        if (this.db) {
            const transaction = this.db.transaction(['errors'], 'readwrite');
            const store = transaction.objectStore('errors');
            store.add(errorData);
        }

        console.error('📊 Error tracked:', errorData);
    }

    // Coletar métricas de performance
    collectPerformanceMetrics() {
        if (!window.performance || !window.performance.getEntriesByType) return;

        // Navigation timing
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.metrics.performance.navigation = {
                loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                responseTime: navigation.responseEnd - navigation.requestStart,
                transferSize: navigation.transferSize || 0
            };
        }

        // Resource timing
        const resources = performance.getEntriesByType('resource');
        this.metrics.performance.resources = resources.map(resource => ({
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize || 0,
            type: this.getResourceType(resource.name)
        }));

        // Memory usage (se disponível)
        if (performance.memory) {
            this.metrics.performance.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }

        // Core Web Vitals
        this.collectCoreWebVitals();
    }

    // Coletar Core Web Vitals
    collectCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.trackEvent('core_web_vital', {
                metric: 'LCP',
                value: lastEntry.startTime,
                rating: this.getLCPRating(lastEntry.startTime)
            });
        }).observe({entryTypes: ['largest-contentful-paint']});

        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                this.trackEvent('core_web_vital', {
                    metric: 'FID',
                    value: entry.processingStart - entry.startTime,
                    rating: this.getFIDRating(entry.processingStart - entry.startTime)
                });
            });
        }).observe({entryTypes: ['first-input']});

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }

            this.trackEvent('core_web_vital', {
                metric: 'CLS',
                value: clsValue,
                rating: this.getCLSRating(clsValue)
            });
        }).observe({entryTypes: ['layout-shift']});
    }

    // Ratings para Core Web Vitals
    getLCPRating(value) {
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
    }

    getFIDRating(value) {
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
    }

    getCLSRating(value) {
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
    }

    // Determinar tipo de recurso
    getResourceType(url) {
        if (url.match(/\.(js)$/)) return 'script';
        if (url.match(/\.(css)$/)) return 'stylesheet';
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
        return 'other';
    }

    // MÉTODOS ESPECÍFICOS PARA PMG AGENDA

    // Rastrear upload de planilha
    trackFileUpload(fileInfo) {
        this.trackEvent('file_upload', {
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            fileType: fileInfo.type,
            success: true
        });
    }

    // Rastrear mudança de aba
    trackTabChange(tabName) {
        this.trackEvent('tab_change', {
            tab: tabName,
            previousTab: this.currentTab || null
        });
        this.currentTab = tabName;
    }

    // Rastrear filtros aplicados
    trackFiltersApplied(filters) {
        this.trackEvent('filters_applied', {
            sortOption: filters.sort || null,
            selectedCities: filters.cidadesSelecionadas ? filters.cidadesSelecionadas.length : 0,
            filterCount: Object.keys(filters).length
        });
    }

    // Rastrear ações de cliente
    trackClientAction(action, clientData) {
        this.trackEvent('client_action', {
            action: action, // 'view', 'edit', 'activate', 'deactivate', 'delete'
            clientId: clientData.id || null,
            clientType: clientData.Status || null
        });
    }

    // Rastrear uso do mapa
    trackMapUsage(action, data = {}) {
        this.trackEvent('map_usage', {
            action: action, // 'load', 'marker_click', 'edit_mode', 'position_change'
            ...data
        });
    }

    // Rastrear agendamentos
    trackScheduleAction(action, scheduleData) {
        this.trackEvent('schedule_action', {
            action: action, // 'create', 'complete', 'remove'
            scheduleType: scheduleData.tipo || null,
            scheduleDay: scheduleData.dia || null
        });
    }

    // Rastrear exportação de dados
    trackDataExport(exportType, recordCount) {
        this.trackEvent('data_export', {
            exportType: exportType, // 'inativos', 'novos', 'ativos'
            recordCount: recordCount
        });
    }

    // Rastrear busca/pesquisa
    trackSearch(query, results) {
        this.trackEvent('search', {
            query: query,
            resultCount: results ? results.length : 0,
            hasResults: results && results.length > 0
        });
    }

    // Rastrear tempo gasto em funcionalidades
    startTimer(feature) {
        this.timers = this.timers || {};
        this.timers[feature] = Date.now();
    }

    endTimer(feature) {
        if (!this.timers || !this.timers[feature]) return;

        const duration = Date.now() - this.timers[feature];
        this.trackEvent('feature_usage_time', {
            feature: feature,
            duration: duration
        });

        delete this.timers[feature];
    }

    // Flush eventos para armazenamento
    async flush(sync = false) {
        if (this.events.length === 0) return;

        const eventsToFlush = [...this.events];
        this.events = [];

        try {
            if (this.db) {
                const transaction = this.db.transaction(['events'], 'readwrite');
                const store = transaction.objectStore('events');

                for (const event of eventsToFlush) {
                    store.add(event);
                }

                if (sync) {
                    // Flush síncrono para beforeunload
                    await new Promise((resolve) => {
                        transaction.oncomplete = resolve;
                        transaction.onerror = resolve;
                    });
                }
            }

            console.log(`📊 Flushed ${eventsToFlush.length} events`);
        } catch (error) {
            console.error('❌ Erro ao fazer flush dos eventos:', error);
            // Recolocar eventos na fila em caso de erro
            this.events.unshift(...eventsToFlush);
        }
    }

    // Obter relatório de analytics
    async getAnalyticsReport(dateRange = 7) {
        if (!this.db) return null;

        const endDate = Date.now();
        const startDate = endDate - (dateRange * 24 * 60 * 60 * 1000);

        try {
            const transaction = this.db.transaction(['events', 'errors'], 'readonly');
            const eventsStore = transaction.objectStore('events');
            const errorsStore = transaction.objectStore('errors');

            // Buscar eventos no período
            const eventsRequest = eventsStore.index('timestamp').getAll(IDBKeyRange.bound(startDate, endDate));
            const errorsRequest = errorsStore.index('timestamp').getAll(IDBKeyRange.bound(startDate, endDate));

            const events = await new Promise(resolve => {
                eventsRequest.onsuccess = () => resolve(eventsRequest.result);
            });

            const errors = await new Promise(resolve => {
                errorsRequest.onsuccess = () => resolve(errorsRequest.result);
            });

            return this.generateReport(events, errors, dateRange);
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            return null;
        }
    }

    // Gerar relatório detalhado
    generateReport(events, errors, dateRange) {
        const report = {
            period: `${dateRange} dias`,
            generated: new Date().toISOString(),
            summary: {
                totalEvents: events.length,
                totalErrors: errors.length,
                uniqueUsers: new Set(events.map(e => e.userId)).size,
                sessions: new Set(events.map(e => e.sessionId)).size
            },
            events: {
                byType: this.groupBy(events, 'event'),
                byDay: this.groupEventsByDay(events),
                topEvents: this.getTopEvents(events, 10)
            },
            userBehavior: {
                avgSessionDuration: this.calculateAvgSessionDuration(events),
                tabUsage: this.analyzeTabUsage(events),
                featureUsage: this.analyzeFeatureUsage(events)
            },
            performance: {
                coreWebVitals: this.analyzeCoreWebVitals(events),
                loadTimes: this.analyzeLoadTimes(events),
                errorRate: errors.length / events.length * 100
            },
            errors: {
                byType: this.groupBy(errors, 'type'),
                topErrors: this.getTopErrors(errors, 5),
                timeline: this.groupErrorsByDay(errors)
            }
        };

        return report;
    }

    // Funções auxiliares para relatórios
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key] || 'unknown';
            groups[group] = (groups[group] || 0) + 1;
            return groups;
        }, {});
    }

    groupEventsByDay(events) {
        const groups = {};
        events.forEach(event => {
            const day = new Date(event.timestamp).toISOString().split('T')[0];
            groups[day] = (groups[day] || 0) + 1;
        });
        return groups;
    }

    groupErrorsByDay(errors) {
        const groups = {};
        errors.forEach(error => {
            const day = new Date(error.timestamp).toISOString().split('T')[0];
            groups[day] = (groups[day] || 0) + 1;
        });
        return groups;
    }

    getTopEvents(events, limit) {
        const eventCounts = this.groupBy(events, 'event');
        return Object.entries(eventCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([event, count]) => ({ event, count }));
    }

    getTopErrors(errors, limit) {
        const errorCounts = this.groupBy(errors, 'message');
        return Object.entries(errorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([message, count]) => ({ message, count }));
    }

    calculateAvgSessionDuration(events) {
        const sessions = {};
        events.forEach(event => {
            if (!sessions[event.sessionId]) {
                sessions[event.sessionId] = { start: event.timestamp, end: event.timestamp };
            } else {
                sessions[event.sessionId].end = Math.max(sessions[event.sessionId].end, event.timestamp);
            }
        });

        const durations = Object.values(sessions).map(s => s.end - s.start);
        return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    }

    analyzeTabUsage(events) {
        const tabEvents = events.filter(e => e.event === 'tab_change');
        return this.groupBy(tabEvents, 'data.tab');
    }

    analyzeFeatureUsage(events) {
        const features = {};
        events.forEach(event => {
            if (event.event === 'file_upload') features.fileUpload = (features.fileUpload || 0) + 1;
            if (event.event === 'client_action') features.clientActions = (features.clientActions || 0) + 1;
            if (event.event === 'map_usage') features.mapUsage = (features.mapUsage || 0) + 1;
            if (event.event === 'schedule_action') features.scheduling = (features.scheduling || 0) + 1;
            if (event.event === 'data_export') features.dataExport = (features.dataExport || 0) + 1;
        });
        return features;
    }

    analyzeCoreWebVitals(events) {
        const cwvEvents = events.filter(e => e.event === 'core_web_vital');
        const metrics = {};

        cwvEvents.forEach(event => {
            const metric = event.data.metric;
            if (!metrics[metric]) metrics[metric] = [];
            metrics[metric].push(event.data.value);
        });

        // Calcular médias
        Object.keys(metrics).forEach(metric => {
            const values = metrics[metric];
            metrics[metric] = {
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                count: values.length
            };
        });

        return metrics;
    }

    analyzeLoadTimes(events) {
        const loadEvents = events.filter(e => e.event === 'session_start');
        // Análise adicional de tempos de carregamento baseada nos dados de performance
        return {
            avgLoadTime: this.metrics.performance.navigation?.loadTime || 0,
            totalSessions: loadEvents.length
        };
    }

    // Exportar dados de analytics
    async exportAnalytics(format = 'json') {
        const report = await this.getAnalyticsReport(30); // 30 dias

        if (format === 'json') {
            const dataStr = JSON.stringify(report, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            // Converter para CSV
            const csv = this.convertToCSV(report);
            const dataBlob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
    }

    // Converter relatório para CSV
    convertToCSV(report) {
        let csv = 'Metric,Value\n';
        
        // Summary
        csv += `Total Events,${report.summary.totalEvents}\n`;
        csv += `Total Errors,${report.summary.totalErrors}\n`;
        csv += `Unique Users,${report.summary.uniqueUsers}\n`;
        csv += `Sessions,${report.summary.sessions}\n`;
        
        // Top Events
        csv += '\nTop Events\n';
        csv += 'Event,Count\n';
        report.events.topEvents.forEach(item => {
            csv += `${item.event},${item.count}\n`;
        });
        
        return csv;
    }

    // Limpar dados antigos
    async cleanOldData(daysToKeep = 90) {
        if (!this.db) return;

        const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

        try {
            const transaction = this.db.transaction(['events', 'errors'], 'readwrite');
            const eventsStore = transaction.objectStore('events');
            const errorsStore = transaction.objectStore('errors');

            // Limpar eventos antigos
            const eventsIndex = eventsStore.index('timestamp');
            const eventsRequest = eventsIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));

            eventsRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Limpar erros antigos
            const errorsIndex = errorsStore.index('timestamp');
            const errorsRequest = errorsIndex.openCursor(IDBKeyRange.upperBound(cutoffDate));

            errorsRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            console.log(`🧹 Dados antigos (>${daysToKeep} dias) foram limpos`);
        } catch (error) {
            console.error('❌ Erro ao limpar dados antigos:', error);
        }
    }

    // Obter métricas em tempo real
    getRealtimeMetrics() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            sessionDuration: Date.now() - this.startTime,
            eventsCount: this.events.length,
            interactionsCount: this.metrics.interactions,
            errorsCount: this.metrics.errors,
            currentUrl: window.location.href,
            isOnline: navigator.onLine,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null
        };
    }

    // Configurar monitoramento customizado
    addCustomMetric(name, value, tags = {}) {
        this.trackEvent('custom_metric', {
            metricName: name,
            metricValue: value,
            tags: tags
        });
    }

    // Parar tracking (para desenvolvimento/debug)
    stop() {
        this.config.enableTracking = false;
        this.flush();
        console.log('📊 Analytics parado');
    }

    // Reiniciar tracking
    start() {
        this.config.enableTracking = true;
        console.log('📊 Analytics reiniciado');
    }

    // Obter configuração atual
    getConfig() {
        return { ...this.config };
    }

    // Atualizar configuração
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('📊 Configuração atualizada:', this.config);
    }
}

// Instância global do Analytics
window.Analytics = new Analytics();

// Auto-inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Analytics.init();
    });
} else {
    window.Analytics.init();
}

// Integração com PMG Agenda (se disponível)
document.addEventListener('DOMContentLoaded', () => {
    // Integrar com sistema de abas
    const originalOpenTab = window.openTab;
    if (typeof originalOpenTab === 'function') {
        window.openTab = function(tab) {
            window.Analytics.trackTabChange(tab);
            return originalOpenTab.apply(this, arguments);
        };
    }

    // Integrar com client manager
    if (window.clientManager) {
        const originalOpenModal = window.clientManager.openModal;
        if (typeof originalOpenModal === 'function') {
            window.clientManager.openModal = function(item, source) {
                window.Analytics.trackClientAction('view', item);
                return originalOpenModal.apply(this, arguments);
            };
        }
    }
});

console.log('📊 analytics.js carregado - Sistema completo de analytics');

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Analytics;
}
