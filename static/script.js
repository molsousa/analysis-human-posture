// Configurações
const API_BASE_URL = `http://${window.location.hostname}:5000`;

// Elementos DOM
let statusDot, statusText, currentExercise, currentReps, analysisStatus;
let exerciseSelect, videoSelect, startBtn, stopBtn, refreshBtn;
let logsList, errorModal, errorMessage;
let videoSourceRadios, videoFileGroup;

// Estado da aplicação
let appState = {
    isRunning: false,
    currentExercise: null,
    stats: {
        current_reps: 0
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    initializeElements();
    setupEventListeners();
    initializeApp();
});

function initializeElements() {
    // Elementos de status
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    currentExercise = document.getElementById('currentExercise');
    currentReps = document.getElementById('currentReps');
    analysisStatus = document.getElementById('analysisStatus');

    // Elementos de controle
    exerciseSelect = document.getElementById('exerciseSelect');
    videoSelect = document.getElementById('videoSelect');
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    refreshBtn = document.getElementById('refreshBtn');

    // Elementos de logs
    logsList = document.getElementById('logsList');

    // Modal
    errorModal = document.getElementById('errorModal');
    errorMessage = document.getElementById('errorMessage');

    // Controles de vídeo
    videoSourceRadios = document.querySelectorAll('input[name="videoSource"]');
    videoFileGroup = document.getElementById('videoFileGroup');

    // URL do servidor
    document.getElementById('serverUrl').textContent = API_BASE_URL;
}

function setupEventListeners() {
    // Botões
    startBtn.addEventListener('click', startAnalysis);
    stopBtn.addEventListener('click', stopAnalysis);
    refreshBtn.addEventListener('click', refreshData);

    // Radio buttons para fonte de vídeo
    videoSourceRadios.forEach(radio => {
        radio.addEventListener('change', handleVideoSourceChange);
    });

    // Botão para atualizar logs
    document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);

    // Fechar modal
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            errorModal.classList.add('hidden');
        });
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !errorModal.classList.contains('hidden')) {
            errorModal.classList.add('hidden');
        }
    });
}

function initializeApp() {
    // Atualizar tempo do servidor
    updateServerTime();
    setInterval(updateServerTime, 1000);

    // Carregar dados iniciais
    refreshData();

    // Iniciar atualização de status
    setInterval(updateStatus, 2000);
}

function updateServerTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR');
    document.getElementById('serverTime').textContent = timeString;
}

async function refreshData() {
    try {
        await Promise.all([
            loadExercises(),
            loadVideos(),
            loadLogs(),
            updateStatus()
        ]);

        updateConnectionStatus(true);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        updateConnectionStatus(false);
    }
}

async function loadExercises() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/exercises`);
        const exercises = await response.json();

        exerciseSelect.innerHTML = '<option value="">Selecione um exercício...</option>';
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.file;
            option.textContent = exercise.name;
            exerciseSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        exerciseSelect.innerHTML = '<option value="">Erro ao carregar exercícios</option>';
    }
}

async function loadVideos() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/videos`);
        const videos = await response.json();

        videoSelect.innerHTML = '<option value="">Selecione um vídeo...</option>';
        videos.forEach(video => {
            const option = document.createElement('option');
            option.value = video.name;
            option.textContent = video.name;
            videoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
        videoSelect.innerHTML = '<option value="">Nenhum vídeo encontrado</option>';
    }
}

async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/logs`);
        const logs = await response.json();

        if (logs.length === 0) {
            logsList.innerHTML = '<div class="log-placeholder">Nenhum log encontrado</div>';
            return;
        }

        logsList.innerHTML = '';
        logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <div><strong>${log.name}</strong></div>
                <div style="font-size: 12px; color: #666;">
                    ${log.modified} • ${(log.size / 1024).toFixed(1)} KB
                </div>
            `;
            logsList.appendChild(logItem);
        });
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        logsList.innerHTML = '<div class="log-placeholder">Erro ao carregar logs</div>';
    }
}

async function updateStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        const status = await response.json();

        appState = status;
        updateUI();
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        updateConnectionStatus(false);
    }
}

function updateUI() {
    // Atualizar status
    if (appState.is_running) {
        statusDot.classList.add('active');
        statusText.textContent = 'Conectado';
        analysisStatus.textContent = 'Em execução';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusDot.classList.remove('active');
        statusText.textContent = 'Conectado';
        analysisStatus.textContent = 'Parado';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    // Atualizar informações do exercício
    currentExercise.textContent = appState.current_exercise || 'Nenhum';
    currentReps.textContent = appState.stats.current_reps || 0;
}

function updateConnectionStatus(connected) {
    if (connected) {
        statusDot.style.backgroundColor = '#2ecc71';
        statusText.textContent = 'Conectado';
    } else {
        statusDot.style.backgroundColor = '#e74c3c';
        statusText.textContent = 'Desconectado';
    }
}

function handleVideoSourceChange(e) {
    videoFileGroup.classList.toggle('hidden', e.target.value !== 'video');
}

async function startAnalysis() {
    const exercise = exerciseSelect.value;
    const useWebcam = document.querySelector('input[name="videoSource"]:checked').value === 'webcam';
    const videoFile = useWebcam ? null : videoSelect.value;

    if (!exercise) {
        showError('Por favor, selecione um exercício');
        return;
    }

    if (!useWebcam && !videoFile) {
        showError('Por favor, selecione um arquivo de vídeo');
        return;
    }

    try {
        startBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/api/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exercise: exercise,
                use_webcam: useWebcam,
                video_file: videoFile
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Análise iniciada com sucesso! A janela do OpenCV será aberta no computador.');

            // Atualizar status após um breve delay
            setTimeout(updateStatus, 1000);
        } else {
            showError(`Erro ao iniciar análise: ${result.message}`);
            startBtn.disabled = false;
        }
    } catch (error) {
        showError(`Erro de conexão: ${error.message}`);
        startBtn.disabled = false;
    }
}

async function stopAnalysis() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stop`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Análise parada com sucesso');
            updateStatus();
        } else {
            showError(`Erro ao parar análise: ${result.message}`);
        }
    } catch (error) {
        showError(`Erro de conexão: ${error.message}`);
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.remove('hidden');
}

function showNotification(message) {
    // Cria uma notificação simples
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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

// Adicionar estilos de animação
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
`;
document.head.appendChild(style);