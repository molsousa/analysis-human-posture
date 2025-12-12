/**
 * API Client para comunicação com o servidor Python
 */

class APIError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

class PostureAnalyzerAPI {
    constructor(baseUrl = 'http://localhost:5000') {
        this.baseUrl = baseUrl;
        this.authToken = null;
    }

    /**
     * Faz uma requisição HTTP genérica
     * @param {string} endpoint - Endpoint da API
     * @param {Object} options - Opções do fetch
     * @returns {Promise<Object>} - Resposta da API
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });

            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new APIError(
                    data.message || `HTTP ${response.status}: ${response.statusText}`,
                    response.status
                );
            }

            return data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            // Erro de rede ou conexão
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new APIError('Não foi possível conectar ao servidor. Verifique se o servidor está rodando.', 0);
            }
            
            throw new APIError(error.message || 'Erro desconhecido na requisição', 0);
        }
    }

    /**
     * Testa a conexão com o servidor
     * @returns {Promise<boolean>} - True se conectado
     */
    async testConnection() {
        try {
            await this.request('/api/status', { timeout: 5000 });
            return true;
        } catch (error) {
            console.warn('Conexão com o servidor falhou:', error.message);
            return false;
        }
    }

    /**
     * Obtém o status atual da análise
     * @returns {Promise<Object>} - Status da análise
     */
    async getStatus() {
        return await this.request('/api/status');
    }

    /**
     * Lista os exercícios disponíveis
     * @returns {Promise<Array>} - Lista de exercícios
     */
    async getExercises() {
        return await this.request('/api/exercises');
    }

    /**
     * Inicia a análise de um exercício
     * @param {string} exercise - Nome do arquivo do exercício
     * @param {boolean} useWebcam - Usar webcam ou arquivo
     * @param {string} videoFile - Caminho do arquivo de vídeo (opcional)
     * @returns {Promise<Object>} - Resultado da operação
     */
    async startAnalysis(exercise, useWebcam = true, videoFile = null) {
        return await this.request('/api/start', {
            method: 'POST',
            body: JSON.stringify({
                exercise,
                use_webcam: useWebcam,
                video_file: videoFile
            })
        });
    }

    /**
     * Para a análise em andamento
     * @returns {Promise<Object>} - Resultado da operação
     */
    async stopAnalysis() {
        return await this.request('/api/stop', {
            method: 'POST'
        });
    }

    /**
     * Reseta o contador de repetições
     * @returns {Promise<Object>} - Resultado da operação
     */
    async resetCounter() {
        return await this.request('/api/reset', {
            method: 'POST'
        });
    }

    /**
     * Obtém o relatório da sessão atual
     * @returns {Promise<Object>} - Relatório da sessão
     */
    async getReport() {
        return await this.request('/api/report');
    }

    /**
     * Faz upload de um arquivo de vídeo
     * @param {File} file - Arquivo de vídeo
     * @returns {Promise<Object>} - Resultado do upload
     */
    async uploadVideo(file) {
        const formData = new FormData();
        formData.append('video', file);

        return await this.request('/api/upload', {
            method: 'POST',
            headers: {
                // Não definir Content-Type aqui, o browser vai definir com boundary
            },
            body: formData
        });
    }

    /**
     * Lista os vídeos disponíveis
     * @returns {Promise<Array>} - Lista de vídeos
     */
    async getVideos() {
        return await this.request('/api/videos');
    }

    /**
     * Obtém configurações do sistema
     * @returns {Promise<Object>} - Configurações
     */
    async getSettings() {
        return await this.request('/api/settings');
    }

    /**
     * Atualiza configurações do sistema
     * @param {Object} settings - Novas configurações
     * @returns {Promise<Object>} - Resultado da operação
     */
    async updateSettings(settings) {
        return await this.request('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    /**
     * Obtém estatísticas históricas
     * @param {string} period - Período (day, week, month)
     * @returns {Promise<Object>} - Estatísticas
     */
    async getStats(period = 'week') {
        return await this.request(`/api/stats?period=${period}`);
    }

    /**
     * Exporta dados da sessão
     * @param {string} format - Formato (json, csv)
     * @returns {Promise<Blob>} - Dados exportados
     */
    async exportData(format = 'json') {
        const response = await fetch(`${this.baseUrl}/api/export?format=${format}`, {
            headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
        });

        if (!response.ok) {
            throw new APIError(`Export failed: ${response.statusText}`, response.status);
        }

        return await response.blob();
    }

    /**
     * Configura autenticação
     * @param {string} token - Token de autenticação
     */
    setAuthToken(token) {
        this.authToken = token;
    }

    /**
     * Remove autenticação
     */
    clearAuth() {
        this.authToken = null;
    }
}

// Criar instância global da API
window.API = new PostureAnalyzerAPI();

// Funções auxiliares globais
window.downloadBlob = function(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Auto-detectar URL do servidor em diferentes ambientes
function detectServerUrl() {
    // Se estiver em produção com um domínio específico
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.origin;
    }
    
    // Tentar diferentes portas
    const ports = [5000, 8000, 8080];
    const hostname = window.location.hostname;
    
    // Retornar a porta padrão, mas o usuário pode sobrescrever
    return `http://${hostname}:5000`;
}

// Atualizar URL base da API
window.API.baseUrl = detectServerUrl();

console.log(`API configurada para: ${window.API.baseUrl}`);