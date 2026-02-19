// Application settings
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
        // Connection elements
        this.statusDot = document.getElementById('statusDot');
        this.connectionText = document.getElementById('connectionText');
        this.serverAddress = document.getElementById('serverAddress');

        // Video elements
        this.videoStream = document.getElementById('videoStream');
    }

    setupEventListeners() {
        // Reload video if there's an issue
        this.videoStream.addEventListener('error', () => this.handleVideoError());

        // Reload page if connection is lost for too long
        setInterval(() => {
            if (!this.isConnected && this.connectionAttempts > this.maxConnectionAttempts) {
                console.log('Reconnecting to the application...');
                location.reload();
            }
        }, 30000); // 30 seconds
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
        // Configure video streaming with timestamp to avoid caching
        const timestamp = new Date().getTime();
        this.videoStream.src = `${this.videoServer}/video_feed?t=${timestamp}`;

        // Add entrance animation
        this.videoStream.classList.add('slide-in');
    }

    handleVideoError() {
        console.warn('Video streaming error, trying to reconnect...');
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
            console.warn('Error connecting to the server:', error.message);
            this.setConnectionStatus(false);
            this.connectionAttempts++;
        }
    }
    
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new PostureStreamingApp();
        console.log('Aplication successfully started!');
    } catch (error) {
        console.error('Error initializing the application:', error);
        showError('Failed to initialize the application. Please reload the page.');
    }
});

// Function to display errors in the interface
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

    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// Add exit animation to global CSS
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