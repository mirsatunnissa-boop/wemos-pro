// Wemos Notification App JavaScript

class WemosNotificationApp {
    constructor() {
        this.isConnected = false;
        this.wemosIP = '192.168.1.100';
        this.wemosPort = 8080;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.logs = [];
        this.maxLogs = 100;
        
        this.initializeApp();
    }
    
    initializeApp() {
        document.addEventListener('deviceready', () => this.onDeviceReady());
        this.setupEventListeners();
        this.addLog('Aplikasi diinisialisasi', 'info');
    }
    
    onDeviceReady() {
        this.addLog('Device Ready - Cordova siap', 'success');
        this.setupNotificationPermissions();
        this.restoreSettings();
        this.setupBackgroundMode();
    }
    
    setupEventListeners() {
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnect());
        document.getElementById('clearLogBtn').addEventListener('click', () => this.clearLogs());
        document.getElementById('wemosIP').addEventListener('change', (e) => this.wemosIP = e.target.value);
        document.getElementById('wemosPort').addEventListener('change', (e) => this.wemosPort = parseInt(e.target.value));
        document.getElementById('volume').addEventListener('change', (e) => {
            document.getElementById('volumeValue').textContent = e.target.value;
            this.saveSettings();
        });
        
        ['soundEnabled', 'vibrationEnabled', 'screenWakeup'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveSettings());
        });
    }
    
    connect() {
        if (this.isConnected) {
            this.addLog('Sudah terhubung ke Wemos', 'warning');
            return;
        }
        
        this.addLog(`Menghubungkan ke ${this.wemosIP}:${this.wemosPort}...`, 'info');
        document.getElementById('connectBtn').disabled = true;
        
        // Simulasi koneksi WebSocket
        this.establishWebSocketConnection();
    }
    
    establishWebSocketConnection() {
        try {
            const wsURL = `ws://${this.wemosIP}:${this.wemosPort}/ws`;
            this.socket = new WebSocket(wsURL);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateStatus('online');
                this.addLog('Terhubung ke Wemos!', 'success');
                document.getElementById('connectBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = false;
                
                // Kirim pesan hello
                this.sendMessage({
                    type: 'hello',
                    device: 'android',
                    version: '1.0.0'
                });
            };
            
            this.socket.onmessage = (event) => this.handleWebSocketMessage(event);
            
            this.socket.onerror = (error) => {
                this.addLog(`Error WebSocket: ${error}`, 'error');
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this.updateStatus('offline');
                this.addLog('Koneksi terputus', 'warning');
                document.getElementById('connectBtn').disabled = false;
                document.getElementById('disconnectBtn').disabled = true;
                
                // Coba reconnect
                this.attemptReconnect();
            };
        } catch (error) {
            this.addLog(`Gagal membuat koneksi: ${error.message}`, 'error');
            this.attemptReconnect();
        }
    }
    
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'alarm':
                    this.handleAlarm(message);
                    break;
                case 'notification':
                    this.handleNotification(message);
                    break;
                case 'status':
                    this.handleStatus(message);
                    break;
                default:
                    this.addLog(`Pesan tidak dikenal: ${message.type}`, 'warning');
            }
        } catch (error) {
            this.addLog(`Error parsing message: ${error.message}`, 'error');
        }
    }
    
    handleAlarm(message) {
        this.addLog(`ALARM dari Wemos: ${message.message}`, 'warning');
        this.displayAlarm(message);
        this.triggerWakeUp(message);
    }
    
    handleNotification(message) {
        this.addLog(`Notifikasi: ${message.message}`, 'info');
        this.displayAlarm(message);
        
        const screenWakeup = document.getElementById('screenWakeup').checked;
        if (screenWakeup) {
            this.triggerWakeUp(message);
        }
    }
    
    handleStatus(message) {
        this.addLog(`Status Wemos: ${message.status}`, 'info');
    }
    
    triggerWakeUp(message) {
        // Acquire wake lock
        if (cordova && cordova.plugins && cordova.plugins.backgroundMode) {
            cordova.plugins.backgroundMode.wakeUp();
        }
        
        // Play notification sound
        if (document.getElementById('soundEnabled').checked) {
            this.playNotificationSound();
        }
        
        // Vibration
        if (document.getElementById('vibrationEnabled').checked) {
            this.triggerVibration();
        }
        
        // Show local notification with wake-up capability
        this.showWakeUpNotification(message);
        
        this.addLog('Layar dibangunkan, notifikasi ditampilkan', 'success');
    }
    
    playNotificationSound() {
        try {
            if (cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
                const volume = parseInt(document.getElementById('volume').value);
                // Volume sudah diatur melalui sistem
            }
        } catch (error) {
            this.addLog(`Error playing sound: ${error.message}`, 'error');
        }
    }
    
    triggerVibration() {
        try {
            if (navigator.vibrate) {
                // Vibrate for 500ms, pause 200ms, vibrate 500ms
                navigator.vibrate([500, 200, 500, 200, 500]);
            }
        } catch (error) {
            this.addLog(`Error vibration: ${error.message}`, 'error');
        }
    }
    
    showWakeUpNotification(message) {
        try {
            if (cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
                cordova.plugins.notification.local.schedule({
                    id: Date.now(),
                    title: message.title || 'Wemos Alarm',
                    text: message.message,
                    sound: true,
                    ongoing: true,
                    badge: 1,
                    priority: 2,
                    autoCancel: false,
                    wakeup: true
                });
            }
        } catch (error) {
            this.addLog(`Error scheduling notification: ${error.message}`, 'error');
        }
    }
    
    displayAlarm(message) {
        const alarmList = document.getElementById('alarmList');
        if (alarmList.querySelector('p')) {
            alarmList.innerHTML = '';
        }
        
        const item = document.createElement('div');
        item.className = 'alarm-item';
        item.innerHTML = `
            <div class="time">${new Date().toLocaleTimeString('id-ID')}</div>
            <div class="message">${message.message}</div>
            <div class="status">Tipe: ${message.type}</div>
        `;
        
        alarmList.insertBefore(item, alarmList.firstChild);
        
        // Hapus alarm lama
        while (alarmList.children.length > 10) {
            alarmList.removeChild(alarmList.lastChild);
        }
    }
    
    sendMessage(message) {
        if (!this.isConnected || !this.socket) {
            this.addLog('Tidak terhubung ke Wemos', 'error');
            return;
        }
        
        try {
            this.socket.send(JSON.stringify(message));
        } catch (error) {
            this.addLog(`Error sending message: ${error.message}`, 'error');
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.updateStatus('offline');
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('disconnectBtn').disabled = true;
        this.addLog('Koneksi ditutup', 'warning');
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.addLog(`Mencoba reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'info');
            
            setTimeout(() => {
                this.establishWebSocketConnection();
            }, this.reconnectDelay);
        } else {
            this.addLog('Gagal reconnect setelah beberapa percobaan', 'error');
        }
    }
    
    setupNotificationPermissions() {
        if (cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.requestPermission({
                success: () => this.addLog('Izin notifikasi diberikan', 'success'),
                error: () => this.addLog('Izin notifikasi ditolak', 'error')
            });
        }
    }
    
    setupBackgroundMode() {
        if (cordova && cordova.plugins && cordova.plugins.backgroundMode) {
            cordova.plugins.backgroundMode.enable();
            cordova.plugins.backgroundMode.setDefaults({
                title: 'Wemos Notification',
                text: 'Menerima notifikasi dari Wemos',
                ticker: 'Wemos App Running'
            });
            this.addLog('Background mode diaktifkan', 'success');
        }
    }
    
    updateStatus(status) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = `Status: ${status === 'online' ? 'Online' : 'Offline'}`;
        statusEl.className = `status ${status}`;
    }
    
    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('id-ID');
        const logEntry = `[${timestamp}] ${message}`;
        
        this.logs.push({ message: logEntry, type });
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        this.displayLogs();
        console.log(`[${type.toUpperCase()}] ${logEntry}`);
    }
    
    displayLogs() {
        const logArea = document.getElementById('logArea');
        logArea.innerHTML = this.logs
            .map(log => `<div class="log-entry ${log.type}">${log.message}</div>`)
            .join('');
        logArea.scrollTop = logArea.scrollHeight;
    }
    
    clearLogs() {
        this.logs = [];
        document.getElementById('logArea').innerHTML = '';
        this.addLog('Log cleared', 'info');
    }
    
    saveSettings() {
        const settings = {
            wemosIP: this.wemosIP,
            wemosPort: this.wemosPort,
            soundEnabled: document.getElementById('soundEnabled').checked,
            vibrationEnabled: document.getElementById('vibrationEnabled').checked,
            screenWakeup: document.getElementById('screenWakeup').checked,
            volume: document.getElementById('volume').value
        };
        
        localStorage.setItem('wemosSettings', JSON.stringify(settings));
        this.addLog('Pengaturan disimpan', 'info');
    }
    
    restoreSettings() {
        const saved = localStorage.getItem('wemosSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.wemosIP = settings.wemosIP || '192.168.1.100';
            this.wemosPort = settings.wemosPort || 8080;
            
            document.getElementById('wemosIP').value = this.wemosIP;
            document.getElementById('wemosPort').value = this.wemosPort;
            document.getElementById('soundEnabled').checked = settings.soundEnabled !== false;
            document.getElementById('vibrationEnabled').checked = settings.vibrationEnabled !== false;
            document.getElementById('screenWakeup').checked = settings.screenWakeup !== false;
            document.getElementById('volume').value = settings.volume || 15;
            
            this.addLog('Pengaturan dipulihkan', 'info');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.wemosApp = new WemosNotificationApp();
    });
} else {
    window.wemosApp = new WemosNotificationApp();
}