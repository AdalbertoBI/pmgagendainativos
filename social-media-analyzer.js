// 📱 Social Media Analyzer - Versão Picture-in-Picture v2.4.1.0
console.log('🚀 Carregando Social Media Analyzer Picture-in-Picture v2.4.1.0...');

class SocialMediaAnalyzer {
    constructor() {
        this.currentAnalysisPanel = null;
        this.currentInstagramTab = null;
        this.extractedData = [];
    }

    // 🎯 Analisar Instagram com painel picture-in-picture
    async analyzeInstagram(url) {
        console.log('🎯 Iniciando análise picture-in-picture do Instagram:', url);
        
        try {
            // Validar URL
            if (!this.validateInstagramUrl(url)) {
                throw new Error('URL do Instagram inválida');
            }

            // Criar painel picture-in-picture
            const panel = this.createPictureInPicturePanel(url);
            
            // Abrir aba do Instagram
            const instagramTab = window.open(url, 'instagram_pip', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            this.currentInstagramTab = instagramTab;

            return {
                success: true,
                method: 'picture_in_picture',
                panel: panel,
                tab: instagramTab,
                message: 'Painel picture-in-picture criado. Navegue na aba do Instagram e use os botões para extrair dados.'
            };
            
        } catch (error) {
            console.error('❌ Erro na análise picture-in-picture:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 🖼️ Criar painel picture-in-picture
    createPictureInPicturePanel(url) {
        // Remover painel anterior se existir
        if (this.currentAnalysisPanel) {
            this.currentAnalysisPanel.remove();
        }

        const panel = document.createElement('div');
        panel.className = 'pip-analysis-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
            color: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: 'Segoe UI', sans-serif;
            border: 3px solid rgba(255,255,255,0.2);
            cursor: move;
        `;

        panel.innerHTML = `
            <div class="panel-header" style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 28px;">📱</span>
                <h3 style="margin: 5px 0; font-size: 16px;">Instagram Picture-in-Picture</h3>
                <p style="margin: 0; font-size: 11px; opacity: 0.9;">Navegue e extraia dados em tempo real</p>
            </div>
            
            <div class="navigation-section" style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px;">🧭 Navegação:</h4>
                <div style="display: flex; gap: 6px;">
                    <button class="nav-btn focus-tab" style="flex: 1; background: #4267B2; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">
                        👁️ Ver Aba
                    </button>
                    <button class="nav-btn new-tab" style="flex: 1; background: #1877f2; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;">
                        🚀 Nova Aba
                    </button>
                </div>
            </div>
            
            <div class="extraction-section" style="background: rgba(0,255,0,0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px;">📊 Extrair Dados:</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <button class="extract-btn profile" style="background: #ff6b35; color: white; border: none; padding: 6px 4px; border-radius: 3px; cursor: pointer; font-size: 9px;">
                        👤 Perfil
                    </button>
                    <button class="extract-btn followers" style="background: #4ecdc4; color: white; border: none; padding: 6px 4px; border-radius: 3px; cursor: pointer; font-size: 9px;">
                        👥 Seguidores
                    </button>
                    <button class="extract-btn posts" style="background: #45b7d1; color: white; border: none; padding: 6px 4px; border-radius: 3px; cursor: pointer; font-size: 9px;">
                        📸 Posts
                    </button>
                    <button class="extract-btn engagement" style="background: #96ceb4; color: white; border: none; padding: 6px 4px; border-radius: 3px; cursor: pointer; font-size: 9px;">
                        💝 Engajamento
                    </button>
                </div>
            </div>
            
            <div class="status-section" style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 10px;">
                <div><strong>🔗 URL:</strong> <span class="current-url" style="word-break: break-all;">${this.extractUsernameFromUrl(url)}</span></div>
                <div style="margin-top: 4px;"><strong>📊 Status:</strong> <span class="extraction-status">Aguardando dados</span></div>
                <div><strong>📋 Extraídos:</strong> <span class="extracted-count">0 itens</span></div>
            </div>
            
            <div class="actions-section" style="display: flex; gap: 6px; justify-content: center;">
                <button class="action-btn copy-data" style="background: #28a745; color: white; border: none; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold;">
                    📋 Copiar Dados
                </button>
                <button class="action-btn save-file" style="background: #17a2b8; color: white; border: none; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 10px;">
                    💾 Salvar
                </button>
                <button class="action-btn close-panel" style="background: #dc3545; color: white; border: none; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 10px;">
                    ✕ Fechar
                </button>
            </div>
            
            <div class="results-section" style="display: none; margin-top: 12px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; max-height: 120px; overflow-y: auto;">
                <h5 style="margin: 0 0 6px 0; font-size: 11px;">📋 Dados Extraídos:</h5>
                <div class="results-content" style="font-size: 9px; line-height: 1.2;"></div>
            </div>
        `;

        // Configurar funcionalidades
        this.setupPanelEvents(panel, url);
        
        // Tornar arrastável
        this.makePanelDraggable(panel);
        
        document.body.appendChild(panel);
        this.currentAnalysisPanel = panel;
        
        return panel;
    }

    // 🎮 Configurar eventos do painel
    setupPanelEvents(panel, url) {
        // Navegação
        panel.querySelector('.focus-tab').onclick = () => {
            if (this.currentInstagramTab && !this.currentInstagramTab.closed) {
                this.currentInstagramTab.focus();
                this.updateStatus(panel, 'Aba em foco', 'info');
            } else {
                this.updateStatus(panel, 'Aba não encontrada', 'error');
            }
        };

        panel.querySelector('.new-tab').onclick = () => {
            this.currentInstagramTab = window.open(url, 'instagram_pip', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            this.updateStatus(panel, 'Nova aba aberta', 'success');
        };

        // Extração de dados
        panel.querySelector('.profile').onclick = () => this.extractProfileData(panel, url);
        panel.querySelector('.followers').onclick = () => this.extractFollowersData(panel, url);
        panel.querySelector('.posts').onclick = () => this.extractPostsData(panel, url);
        panel.querySelector('.engagement').onclick = () => this.extractEngagementData(panel, url);

        // Ações
        panel.querySelector('.copy-data').onclick = () => this.copyExtractedData(panel);
        panel.querySelector('.save-file').onclick = () => this.saveDataToFile(panel);
        panel.querySelector('.close-panel').onclick = () => this.closePictureInPicture(panel);
    }

    // 👤 Extrair dados do perfil
    extractProfileData(panel, url) {
        this.updateStatus(panel, 'Extraindo dados do perfil...', 'extracting');
        
        const profileData = {
            username: this.extractUsernameFromUrl(url),
            profile_url: url,
            extracted_at: new Date().toLocaleString(),
            instructions: 'Vá para a aba do Instagram e observe: nome, bio, link externo, verificação'
        };
        
        this.addExtractedData(panel, 'Perfil', profileData);
        this.updateStatus(panel, 'Template de perfil criado ✅', 'success');
    }

    // 👥 Extrair dados de seguidores
    extractFollowersData(panel, url) {
        this.updateStatus(panel, 'Extraindo dados de seguidores...', 'extracting');
        
        const followersData = {
            username: this.extractUsernameFromUrl(url),
            instructions: 'Na aba do Instagram, clique em "seguidores" e conte manualmente',
            followers_count: 'Digite aqui o número de seguidores',
            following_count: 'Digite aqui o número de seguindo',
            extracted_at: new Date().toLocaleString()
        };
        
        this.addExtractedData(panel, 'Seguidores', followersData);
        this.updateStatus(panel, 'Template de seguidores criado ✅', 'success');
    }

    // 📸 Extrair dados de posts
    extractPostsData(panel, url) {
        this.updateStatus(panel, 'Extraindo dados de posts...', 'extracting');
        
        const postsData = {
            username: this.extractUsernameFromUrl(url),
            instructions: 'Analise os posts recentes na aba do Instagram',
            posts_count: 'Digite o número total de posts',
            recent_posts: 'Descreva os 3 posts mais recentes',
            post_frequency: 'Com que frequência posta? (diário, semanal, etc.)',
            extracted_at: new Date().toLocaleString()
        };
        
        this.addExtractedData(panel, 'Posts', postsData);
        this.updateStatus(panel, 'Template de posts criado ✅', 'success');
    }

    // 💝 Extrair dados de engajamento
    extractEngagementData(panel, url) {
        this.updateStatus(panel, 'Extraindo dados de engajamento...', 'extracting');
        
        const engagementData = {
            username: this.extractUsernameFromUrl(url),
            instructions: 'Observe curtidas e comentários nos posts recentes',
            avg_likes: 'Média de curtidas por post',
            avg_comments: 'Média de comentários por post',
            engagement_rate: 'Taxa de engajamento estimada',
            best_post: 'Post com melhor engajamento',
            extracted_at: new Date().toLocaleString()
        };
        
        this.addExtractedData(panel, 'Engajamento', engagementData);
        this.updateStatus(panel, 'Template de engajamento criado ✅', 'success');
    }

    // 📋 Adicionar dados extraídos
    addExtractedData(panel, category, data) {
        const resultsSection = panel.querySelector('.results-section');
        const resultsContent = panel.querySelector('.results-content');
        
        resultsSection.style.display = 'block';
        
        const dataDiv = document.createElement('div');
        dataDiv.style.cssText = 'margin-bottom: 6px; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 3px;';
        dataDiv.innerHTML = `
            <strong>📊 ${category}:</strong><br>
            ${Object.entries(data).map(([key, value]) => `<span style="font-size: 8px;">${key}: ${value}</span>`).join('<br>')}
        `;
        
        resultsContent.appendChild(dataDiv);
        
        // Atualizar contador
        const countElement = panel.querySelector('.extracted-count');
        const currentCount = parseInt(countElement.textContent) || 0;
        countElement.textContent = `${currentCount + 1} itens`;
        
        // Armazenar dados
        this.extractedData.push({ category, data, timestamp: new Date() });
    }

    // 📋 Copiar dados extraídos
    copyExtractedData(panel) {
        if (this.extractedData.length === 0) {
            alert('⚠️ Nenhum dado foi extraído ainda!');
            return;
        }
        
        const textData = this.extractedData.map(item => 
            `📊 ${item.category}:\n${Object.entries(item.data).map(([key, value]) => `${key}: ${value}`).join('\n')}\n`
        ).join('\n---\n\n');
        
        navigator.clipboard.writeText(textData).then(() => {
            this.updateStatus(panel, 'Dados copiados para clipboard! 📋', 'success');
        }).catch(() => {
            // Fallback para navegadores antigos
            const textarea = document.createElement('textarea');
            textarea.value = textData;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.updateStatus(panel, 'Dados copiados (fallback)! 📋', 'success');
        });
    }

    // 💾 Salvar dados em arquivo
    saveDataToFile(panel) {
        if (this.extractedData.length === 0) {
            alert('⚠️ Nenhum dado foi extraído ainda!');
            return;
        }
        
        const dataToSave = {
            extracted_at: new Date().toISOString(),
            total_items: this.extractedData.length,
            data: this.extractedData
        };
        
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `instagram_analysis_${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.updateStatus(panel, 'Arquivo salvo! 💾', 'success');
    }

    // ✕ Fechar picture-in-picture
    closePictureInPicture(panel) {
        if (this.currentInstagramTab && !this.currentInstagramTab.closed) {
            if (confirm('Fechar também a aba do Instagram?')) {
                this.currentInstagramTab.close();
            }
        }
        
        panel.remove();
        this.currentAnalysisPanel = null;
        this.extractedData = [];
    }

    // 📈 Atualizar status
    updateStatus(panel, message, type = 'info') {
        const statusElement = panel.querySelector('.extraction-status');
        statusElement.textContent = message;
        
        const colors = {
            info: '#17a2b8',
            extracting: '#ffc107', 
            success: '#28a745',
            error: '#dc3545'
        };
        
        statusElement.style.color = colors[type] || colors.info;
    }

    // 🖱️ Tornar painel arrastável
    makePanelDraggable(panel) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        let xOffset = 0, yOffset = 0;

        panel.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === panel || e.target.closest('.panel-header')) {
                isDragging = true;
                panel.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                panel.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        });

        document.addEventListener('mouseup', () => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            panel.style.cursor = 'move';
        });
    }

    // ✅ Validar URL do Instagram
    validateInstagramUrl(url) {
        const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
        return instagramRegex.test(url);
    }

    // 🔍 Extrair username da URL
    extractUsernameFromUrl(url) {
        const match = url.match(/instagram\.com\/([^\/\?]+)/);
        return match ? match[1] : 'username_desconhecido';
    }
}

// 🚀 Instância global
try {
    const socialMediaAnalyzerPIP = new SocialMediaAnalyzer();
    window.socialMediaAnalyzerPIP = socialMediaAnalyzerPIP;
    console.log('📱 Social Media Analyzer Picture-in-Picture carregado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao carregar Social Media Analyzer:', error);
    console.error('Stack trace:', error.stack);
}

console.log('📋 Variáveis globais disponíveis:', {
    socialMediaAnalyzerPIP: !!window.socialMediaAnalyzerPIP,
    SocialMediaAnalyzer: typeof SocialMediaAnalyzer
});
