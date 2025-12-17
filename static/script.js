// Configurações da aplicação
const AppConfig = {
    videoServerPort: 5001,
    updateInterval: 1000, // ms
    connectionTimeout: 5000, // ms
    reconnectDelay: 2000 // ms
};

class PostureStreamingApp {
    constructor() {
        this.videoServer = `http://${window.location.hostname}:${AppConfig.videoServerPort}`;
        this.apiUrl = `${this.videoServer}/api/status`;
        this.isConnected = false;
        this.goodReps = 0;
        this.badReps = 0;
        this.totalReps = 0;
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;

        this.initializeElements();
        this.setupEventListeners();
        this.initializeApp();
    }

    initializeElements() {
        // Elementos de status
        this.exerciseName = document.getElementById('exerciseName');
        this.totalReps = document.getElementById('totalReps');
        this.analysisStatus = document.getElementById('analysisStatus');
        this.overlayReps = document.getElementById('overlayReps');
        this.phaseText = document.getElementById('phaseText');

        // Elementos de feedback de postura
        this.postureFeedback = document.getElementById('postureFeedback');
        this.postureText = document.getElementById('postureText');
        this.postureIcon = document.getElementById('postureIcon');
        this.postureScore = document.getElementById('postureScore');
        this.scoreFill = document.getElementById('scoreFill');

        // Elementos de feedback de repetição
        this.repFeedback = document.getElementById('repFeedback');
        this.repText = document.getElementById('repText');
        this.repIcon = document.getElementById('repIcon');

        // Elementos de estatísticas
        this.goodRepsElement = document.getElementById('goodReps');
        this.badRepsElement = document.getElementById('badReps');
        this.accuracyElement = document.getElementById('accuracy');

        // Elementos de conexão
        this.statusDot = document.getElementById('statusDot');
        this.connectionText = document.getElementById('connectionText');
        this.serverAddress = document.getElementById('serverAddress');

        // Elemento de vídeo
        this.videoStream = document.getElementById('videoStream');
    }

    setupEventListeners() {
        // Recarregar vídeo em caso de erro
        this.videoStream.addEventListener('error', () => this.handleVideoError());

        // Recarregar página se conexão for perdida por muito tempo
        setInterval(() => {
            if (!this.isConnected && this.connectionAttempts > this.maxConnectionAttempts) {
                console.log('Reconectando à aplicação...');
                location.reload();
            }
        }, 30000); // 30 segundos
    }

    initializeApp() {
        this.updateServerAddress();
        this.initializeVideoStream();
        this.startStatusUpdates();
        this.showWelcomeMessage();
    }

    updateServerAddress() {
        const hostname = window.location.hostname;
        const port = window.location.port || '80';
        const protocol = window.location.protocol;
        this.serverAddress.textContent = `${protocol}//${hostname}:${port}`;
    }

    initializeVideoStream() {
        // Configurar streaming de vídeo com timestamp para evitar cache
        const timestamp = new Date().getTime();
        this.videoStream.src = `${this.videoServer}/video_feed?t=${timestamp}`;

        // Adicionar animação de entrada
        this.videoStream.classList.add('slide-in');
    }

    handleVideoError() {
        console.warn('Erro no streaming de vídeo, tentando reconectar...');
        setTimeout(() => {
            const timestamp = new Date().getTime();
            this.videoStream.src = `${this.videoServer}/video_feed?t=${timestamp}`;
        }, AppConfig.reconnectDelay);
    }

    async startStatusUpdates() {
        setInterval(async () => {
            await this.updateStatus();
        }, AppConfig.updateInterval);
    }

    async updateStatus() {
        try {
            const response = await fetch(this.apiUrl, {
                signal: AbortSignal.timeout(AppConfig.connectionTimeout)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.updateUI(data);
            this.setConnectionStatus(true);
            this.connectionAttempts = 0;

        } catch (error) {
            console.warn('Erro ao conectar com o servidor:', error.message);
            this.setConnectionStatus(false);
            this.connectionAttempts++;
        }
    }

    updateUI(data) {
        // Atualizar informações básicas
        this.exerciseName.textContent = data.exercise_name || 'Aguardando...';
        this.totalReps.textContent = data.counter || 0;
        this.overlayReps.textContent = data.counter || 0;
        this.phaseText.textContent = `Fase: ${data.movement_phase || 'INICIANDO'}`;
        this.analysisStatus.textContent = 'Analisando...';

        // Atualizar feedback de postura
        this.updatePostureFeedback(
            data.posture_feedback,
            data.posture_feedback_type,
            data.posture_score
        );

        // Atualizar feedback de repetição
        this.updateRepFeedback(data.rep_feedback, data.rep_feedback_type);

        // Atualizar estatísticas
        this.updateStats(data);
    }

    updatePostureFeedback(message, type, score) {
        if (!message) return;

        this.postureText.textContent = message;
        this.postureScore.textContent = score || 100;
        this.scoreFill.style.width = `${score || 100}%`;

        // Atualizar classe CSS baseada no tipo
        this.updateFeedbackBoxClass(this.postureFeedback, type);

        // Atualizar ícone baseado no tipo
        this.updateFeedbackIcon(this.postureIcon, type);

        // Atualizar cores do score
        this.updateScoreColors(score);
    }

    updateRepFeedback(message, type) {
        if (!message) {
            this.repFeedback.classList.add('hidden');
            return;
        }

        this.repFeedback.classList.remove('hidden');
        this.repText.textContent = message;

        // Atualizar classe CSS baseada no tipo
        this.updateFeedbackBoxClass(this.repFeedback, type);

        // Atualizar ícone baseado no tipo
        this.updateFeedbackIcon(this.repIcon, type);

        // Contar repetições boas/ruins
        this.countRepQuality(type);
    }

    updateFeedbackBoxClass(element, type) {
        // Remover todas as classes de feedback
        element.classList.remove(
            'feedback-posture',
            'feedback-correct',
            'feedback-warning',
            'feedback-error'
        );

        // Adicionar classe baseada no tipo
        switch (type) {
            case 'CORRETO':
                element.classList.add('feedback-correct');
                break;
            case 'ATENCAO':
                element.classList.add('feedback-warning');
                break;
            case 'ERRO_CRITICO':
                element.classList.add('feedback-error');
                break;
            default:
                element.classList.add('feedback-posture');
        }
    }

    updateFeedbackIcon(iconElement, type) {
        // Atualizar ícone baseado no tipo
        switch (type) {
            case 'CORRETO':
                iconElement.className = 'fas fa-check-circle';
                iconElement.style.color = '#4cc9f0';
                break;
            case 'ATENCAO':
                iconElement.className = 'fas fa-exclamation-triangle';
                iconElement.style.color = '#f8961e';
                break;
            case 'ERRO_CRITICO':
                iconElement.className = 'fas fa-times-circle';
                iconElement.style.color = '#f72585';
                break;
            default:
                iconElement.className = 'fas fa-chart-bar';
                iconElement.style.color = '#4361ee';
        }
    }

    updateScoreColors(score) {
        // Atualizar cores do score e da barra
        if (score >= 80) {
            this.postureScore.style.color = '#4cc9f0';
            this.scoreFill.style.background = 'linear-gradient(90deg, #4cc9f0, #4361ee)';
        } else if (score >= 60) {
            this.postureScore.style.color = '#f8961e';
            this.scoreFill.style.background = 'linear-gradient(90deg, #f8961e, #f3722c)';
        } else {
            this.postureScore.style.color = '#f72585';
            this.scoreFill.style.background = 'linear-gradient(90deg, #f72585, #b5179e)';
        }
    }

    countRepQuality(type) {
        // Contar repetições boas e ruins baseadas no feedback
        if (type === 'CORRETO') {
            this.goodReps++;
            this.goodRepsElement.textContent = this.goodReps;
        } else if (type === 'ATENCAO' || type === 'ERRO_CRITICO') {
            this.badReps++;
            this.badRepsElement.textContent = this.badReps;
        }

        // Atualizar precisão
        this.updateAccuracy();
    }

    updateAccuracy() {
        const total = this.goodReps + this.badReps;
        if (total > 0) {
            const accuracy = Math.round((this.goodReps / total) * 100);
            this.accuracyElement.textContent = `${accuracy}%`;
        } else {
            this.accuracyElement.textContent = '0%';
        }
    }

    updateStats(data) {
        // Em uma implementação real, você buscaria estatísticas do servidor
        // Por enquanto, usamos apenas as contagens locais
        this.totalReps = data.counter || 0;
    }

    setConnectionStatus(connected) {
        if (connected) {
            this.statusDot.classList.add('connected');
            this.connectionText.textContent = 'Conectado ao servidor de análise';
            this.isConnected = true;
        } else {
            this.statusDot.classList.remove('connected');
            this.connectionText.textContent = 'Tentando conectar ao servidor...';
            this.isConnected = false;
        }
    }

    showWelcomeMessage() {
        // Mostrar mensagem de boas-vindas após 1 segundo
        setTimeout(() => {
            console.log('Aplicação de streaming de análise de postura inicializada!');
            console.log(`Servidor de vídeo: ${this.videoServer}`);
            console.log(`API: ${this.apiUrl}`);
        }, 1000);
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new PostureStreamingApp();
        console.log('Aplicação inicializada com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
        showError('Falha ao inicializar a aplicação. Recarregue a página.');
    }
});

// Função para mostrar erros na interface
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f72585;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    errorDiv.innerHTML = `
        <strong><i class="fas fa-exclamation-circle"></i> Erro</strong>
        <p style="margin-top: 8px; font-size: 14px;">${message}</p>
    `;

    document.body.appendChild(errorDiv);

    // Remover após 5 segundos
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Adicionar animação de saída ao CSS global
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);