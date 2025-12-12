class PostureStreamingApp {
    constructor() {
        this.videoServer = 'http://localhost:5001';
        this.apiUrl = `${this.videoServer}/api/status`;
        this.isConnected = false;
        this.lastUpdate = Date.now();
        this.sessionStartTime = Date.now();
        this.fps = 0;
        this.frameCount = 0;
        this.fpsInterval = null;

        this.initializeElements();
        this.setupEventListeners();
        this.initializeApp();
    }

    initializeElements() {
        // Elementos de status
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.apiStatus = document.getElementById('apiStatus');

        // Elementos de vídeo
        this.videoStream = document.getElementById('videoStream');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.refreshBtn = document.getElementById('refreshBtn');

        // Elementos de análise
        this.exerciseName = document.getElementById('exerciseName');
        this.repsCount = document.getElementById('repsCount');
        this.repsCounter = document.getElementById('repsCounter');
        this.movementPhase = document.getElementById('movementPhase');
        this.phaseText = document.getElementById('phaseText');
        this.postureScore = document.getElementById('postureScore');
        this.scoreFill = document.getElementById('scoreFill');
        this.postureFeedback = document.getElementById('postureFeedback');
        this.postureFeedbackType = document.getElementById('postureFeedbackType');

        // Elementos de sistema
        this.lastUpdateElement = document.getElementById('lastUpdate');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.sessionTimeElement = document.getElementById('sessionTime');
        this.currentTimeElement = document.getElementById('currentTime');

        // Modal
        this.instructionsModal = document.getElementById('instructionsModal');
        this.instructionsBtn = document.getElementById('instructionsBtn');
        this.logsBtn = document.getElementById('logsBtn');
        this.modalCloseButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    }

    setupEventListeners() {
        // Botões de vídeo
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.refreshBtn.addEventListener('click', () => this.refreshVideoStream());

        // Botões de ação
        this.instructionsBtn.addEventListener('click', () => this.showInstructions());
        this.logsBtn.addEventListener('click', () => this.showLogs());

        // Fechar modal
        this.modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.instructionsModal.classList.remove('active');
            });
        });

        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.instructionsModal.classList.contains('active')) {
                this.instructionsModal.classList.remove('active');
            }
        });

        // Contador de FPS do vídeo
        this.videoStream.addEventListener('load', () => {
            this.frameCount++;
        });
    }

    initializeApp() {
        // Atualizar horário atual
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);

        // Iniciar contador de FPS
        this.startFpsCounter();

        // Iniciar timer da sessão
        this.startSessionTimer();

        // Conectar ao servidor de análise
        this.connectToAnalysisServer();

        // Iniciar atualização de status
        this.startStatusUpdates();

        // Mostrar instruções inicialmente
        setTimeout(() => this.showInstructions(), 1000);
    }

    updateCurrentTime() {
        const now = new Date();
        this.currentTimeElement.textContent = now.toLocaleTimeString('pt-BR');
    }

    startFpsCounter() {
        this.fpsInterval = setInterval(() => {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsCounter.textContent = this.fps;
        }, 1000);
    }

    startSessionTimer() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.sessionTimeElement.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    async connectToAnalysisServer() {
        try {
            const response = await fetch(this.apiUrl, { timeout: 5000 });

            if (response.ok) {
                this.setConnectionStatus(true);
                this.isConnected = true;
            } else {
                this.setConnectionStatus(false);
                this.isConnected = false;
            }
        } catch (error) {
            this.setConnectionStatus(false);
            this.isConnected = false;
            console.warn('Não foi possível conectar ao servidor de análise:', error.message);
        }
    }

    setConnectionStatus(connected) {
        if (connected) {
            this.statusDot.classList.add('connected');
            this.statusText.textContent = 'Conectado ao servidor de análise';
            this.apiStatus.textContent = 'Conectado';
            this.apiStatus.className = 'connection-status-indicator connected';
        } else {
            this.statusDot.classList.remove('connected');
            this.statusText.textContent = 'Servidor de análise não encontrado';
            this.apiStatus.textContent = 'Desconectado';
            this.apiStatus.className = 'connection-status-indicator';
        }
    }

    async startStatusUpdates() {
        setInterval(async () => {
            if (!this.isConnected) {
                await this.connectToAnalysisServer();
                return;
            }

            try {
                const response = await fetch(this.apiUrl);
                if (!response.ok) throw new Error('Resposta não OK');

                const data = await response.json();
                this.updateUI(data);
                this.lastUpdate = Date.now();
                this.updateLastUpdateTime();

            } catch (error) {
                console.error('Erro ao buscar status:', error);
                this.setConnectionStatus(false);
                this.isConnected = false;
            }
        }, 1000); // Atualizar a cada segundo
    }

    updateUI(data) {
        // Atualizar informações básicas
        this.exerciseName.textContent = data.exercise_name || 'Aguardando...';
        this.repsCount.textContent = data.counter || 0;
        this.repsCounter.textContent = data.counter || 0;
        this.movementPhase.textContent = data.movement_phase || 'INICIANDO';
        this.phaseText.textContent = data.movement_phase || 'INICIANDO';

        // Atualizar score de postura
        const score = data.posture_score || 100;
        this.postureScore.textContent = score;
        this.scoreFill.style.width = `${score}%`;

        // Atualizar feedback de postura
        this.updatePostureFeedback(data.posture_feedback, data.posture_feedback_type);

        // Atualizar cor do score
        if (score >= 80) {
            this.scoreFill.style.background = 'linear-gradient(90deg, #4cc9f0, #4361ee)';
        } else if (score >= 60) {
            this.scoreFill.style.background = 'linear-gradient(90deg, #f8961e, #f3722c)';
        } else {
            this.scoreFill.style.background = 'linear-gradient(90deg, #f72585, #b5179e)';
        }
    }

    updatePostureFeedback(message, type) {
        const feedbackElement = this.postureFeedback;
        const typeElement = this.postureFeedbackType;

        // Atualizar mensagem
        const icon = feedbackElement.querySelector('i');
        const text = feedbackElement.querySelector('span');

        // Definir ícone baseado no tipo
        switch (type) {
            case 'CORRETO':
                icon.className = 'fas fa-check-circle';
                icon.style.color = '#4cc9f0';
                text.style.color = '#4cc9f0';
                break;
            case 'ATENCAO':
                icon.className = 'fas fa-exclamation-triangle';
                icon.style.color = '#f8961e';
                text.style.color = '#f8961e';
                break;
            case 'ERRO_CRITICO':
                icon.className = 'fas fa-times-circle';
                icon.style.color = '#f72585';
                text.style.color = '#f72585';
                break;
            default:
                icon.className = 'fas fa-info-circle';
                icon.style.color = '#4895ef';
                text.style.color = '#4895ef';
        }

        text.textContent = message || 'Aguardando análise...';

        // Atualizar badge de tipo
        let badgeClass = 'badge-info';
        if (type === 'CORRETO') badgeClass = 'badge-correct';
        if (type === 'ATENCAO') badgeClass = 'badge-warning';
        if (type === 'ERRO_CRITICO') badgeClass = 'badge-error';

        typeElement.innerHTML = `<span class="badge ${badgeClass}">${type || 'INFO'}</span>`;
    }

    updateLastUpdateTime() {
        const now = new Date();
        this.lastUpdateElement.textContent = now.toLocaleTimeString('pt-BR');
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');

        if (!document.fullscreenElement) {
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    refreshVideoStream() {
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        this.videoStream.src = `${this.videoServer}/video_feed?t=${timestamp}`;

        // Mostrar notificação
        this.showNotification('Streaming de vídeo atualizado');
    }

    showInstructions() {
        this.instructionsModal.classList.add('active');
    }

    showLogs() {
        // Em uma implementação futura, isso poderia abrir uma página de logs
        this.showNotification('Funcionalidade de logs em desenvolvimento');
    }

    showNotification(message) {
        // Criar notificação simples
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4361ee;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
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
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PostureStreamingApp();
});

// Manipular mudanças de fullscreen
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const icon = fullscreenBtn.querySelector('i');

    if (document.fullscreenElement) {
        icon.className = 'fas fa-compress';
        fullscreenBtn.title = 'Sair da tela cheia';
    } else {
        icon.className = 'fas fa-expand';
        fullscreenBtn.title = 'Tela cheia';
    }
});