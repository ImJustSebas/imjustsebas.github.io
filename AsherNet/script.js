// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDAPcijJ3FgFwfqJIj_rntH4NJn136Kvk0",
    authDomain: "app-de-mensajes-b4b7c.firebaseapp.com",
    databaseURL: "https://app-de-mensajes-b4b7c-default-rtdb.firebaseio.com",
    projectId: "app-de-mensajes-b4b7c",
    storageBucket: "app-de-mensajes-b4b7c.firebasestorage.app",
    messagingSenderId: "470376363770",
    appId: "1:470376363770:web:dd9e3b09a8be305afabb43"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('messages');
const commandsRef = database.ref('commands');
const typingRef = database.ref('typing');
const configRef = database.ref('config');

// Referencias a elementos del DOM
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearChatButton = document.getElementById('clear-chat');
const sidebar = document.getElementById('sidebar');
const userIpElement = document.getElementById('user-ip');
const deviceIdElement = document.getElementById('device-id');
const sessionExpires = document.getElementById('session-expires');
const connectionStatus = document.getElementById('connection-status');
const pinChangeInput = document.getElementById('new-pin-input');
const changePinBtn = document.getElementById('change-pin-btn');
const refreshSessionBtn = document.getElementById('refresh-session');
const exportChatBtn = document.getElementById('export-chat');
const typingIndicator = document.getElementById('typing-indicator');
const messageCountElement = document.getElementById('message-count');
const pinInputs = document.querySelectorAll('.pin-digit');
const pinSubmit = document.getElementById('pin-submit');

// Variables globales
let userIP = 'Desconocido';
let encryptionKey = "CipherKey2006";
let currentPIN = "2006";
const ADMIN_PIN = "1100";
let sessionTimer;
let sessionEndTime;
let deviceId;
let messageCount = 0;
let isTyping = false;
let typingTimeout;
let isAdmin = false;

// Generar ID único del dispositivo
function getDeviceId() {
    let id = localStorage.getItem('ashernet_deviceId');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('ashernet_deviceId', id);
    }
    return id;
}

// Cargar PIN desde Firebase o usar por defecto
async function loadPINFromFirebase() {
    try {
        const snapshot = await configRef.child('pin').once('value');
        if (snapshot.exists()) {
            currentPIN = snapshot.val();
            encryptionKey = "CipherKey" + currentPIN;
        }
    } catch (error) {
        console.log("Usando PIN por defecto:", currentPIN);
    }
}

// Actualizar contador de mensajes
function updateMessageCount() {
    messageCount++;
    messageCountElement.textContent = `${messageCount} mensajes transmitidos`;
}

// Verificar si hay una sesión activa
async function checkSession() {
    await loadPINFromFirebase();
    
    const sessionData = localStorage.getItem('ashernet_session');
    if (sessionData) {
        const session = JSON.parse(sessionData);
        const currentTime = Date.now();
        const timeLeft = session.expires - currentTime;
        
        if (timeLeft > 0) {
            // Sesión válida
            deviceId = getDeviceId();
            deviceIdElement.textContent = deviceId.substr(0, 12) + "...";
            
            // Verificar si es admin desde la sesión guardada
            isAdmin = session.isAdmin || false;
            
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            
            // Mostrar panel de admin si corresponde
            if (isAdmin) {
                sidebar.style.display = 'block';
                clearChatButton.style.display = 'block';
            }
            
            initializeApp();
            startSessionTimer(timeLeft);
            return true;
        } else {
            // Sesión expirada
            localStorage.removeItem('ashernet_session');
        }
    }
    return false;
}

// Iniciar temporizador de sesión
function startSessionTimer(duration) {
    clearInterval(sessionTimer);
    
    sessionEndTime = Date.now() + duration;
    updateSessionTimer();
    
    sessionTimer = setInterval(() => {
        const timeLeft = sessionEndTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(sessionTimer);
            showError("Sesión expirada. Por favor vuelva a autenticarse.");
            setTimeout(() => {
                localStorage.removeItem('ashernet_session');
                location.reload();
            }, 3000);
        } else {
            updateSessionTimer();
        }
    }, 1000);
}

// Actualizar visualización del temporizador
function updateSessionTimer() {
    const timeLeft = Math.max(0, sessionEndTime - Date.now());
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    sessionExpires.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await loadPINFromFirebase();
    deviceId = getDeviceId();
    deviceIdElement.textContent = deviceId.substr(0, 12) + "...";
    
    if (!checkSession()) {
        pinInputs[0].focus();
    }
});

// Configurar campos de PIN
pinInputs.forEach((input, index) => {
    input.addEventListener('input', function() {
        if (this.value.length === 1) {
            const nextId = this.getAttribute('data-next');
            if (nextId) {
                document.getElementById(nextId).focus();
            }
        }
    });
    
    input.addEventListener('keydown', function(e) {
        if (e.key === "Backspace" && this.value === '') {
            if (index > 0) {
                pinInputs[index-1].focus();
            }
        }
    });
});

// Función para verificar el PIN
async function verifyPIN() {
    const enteredPIN = Array.from(pinInputs).map(input => input.value).join('');
    
    // Verificar si es admin (1100)
    if (enteredPIN === ADMIN_PIN) {
        isAdmin = true;
        showStatus("Acceso de administrador concedido");
    }
    // Verificar si es usuario normal (PIN actual)
    else if (enteredPIN === currentPIN) {
        isAdmin = false;
    } else {
        // PIN incorrecto
        pinInputs.forEach(input => {
            input.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            input.style.background = 'rgba(255, 0, 0, 0.1)';
        });
        
        setTimeout(() => {
            pinInputs.forEach(input => {
                input.style.borderColor = '';
                input.style.background = '';
                input.value = '';
            });
            pinInputs[0].focus();
        }, 1000);
        return;
    }
    
    // Guardar sesión (10 minutos)
    const sessionData = {
        pin: enteredPIN === ADMIN_PIN ? ADMIN_PIN : currentPIN,
        isAdmin: isAdmin,
        expires: Date.now() + 600000 // 10 minutos
    };
    localStorage.setItem('ashernet_session', JSON.stringify(sessionData));
    
    loginScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    
    // Mostrar panel de admin si corresponde
    if (isAdmin) {
        sidebar.style.display = 'block';
        clearChatButton.style.display = 'block';
        showStatus("Modo administrador activado");
    }
    
    initializeApp();
    startSessionTimer(600000);
}

pinSubmit.addEventListener('click', verifyPIN);

// Permitir Enter para enviar PIN
pinInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === "Enter") {
            verifyPIN();
        }
    });
});

// Función para cifrar mensajes
function encryptMessage(message) {
    return CryptoJS.AES.encrypt(message, encryptionKey).toString();
}

// Función para descifrar mensajes
function decryptMessage(ciphertext) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || "*** MENSAJE NO DESCIFRABLE ***";
    } catch (e) {
        console.error("Error de descifrado:", e);
        return "*** MENSAJE NO DESCIFRABLE ***";
    }
}

// Funciones para mostrar estado y errores
function showStatus(message) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
}

// Obtener la IP del usuario
function getIP() {
    return new Promise((resolve) => {
        fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => {
                userIP = data.ip;
                userIpElement.textContent = userIP;
                resolve();
            })
            .catch(error => {
                console.error('Error al obtener IP:', error);
                userIpElement.textContent = '127.0.0.1';
                resolve();
            });
    });
}

// Configurar escucha en tiempo real para mensajes nuevos
function setupRealtimeListener() {
    messagesRef.orderByChild('timestamp').on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        // Solo mostrar mensajes de otros dispositivos
        if (message.deviceId !== deviceId) {
            const decryptedMessage = decryptMessage(message.text);
            addMessageToChat(decryptedMessage, message.ip, message.deviceId, false);
            updateMessageCount();
        }
    });
}

// Configurar escucha para comandos de borrado
function setupCommandListener() {
    commandsRef.on('value', (snapshot) => {
        const command = snapshot.val();
        if (command && command.action === 'clear_chat') {
            // Borrar el chat localmente
            chatContainer.innerHTML = `
                <div class="system-message">
                    <div class="system-header">SISTEMA ASHERNET</div>
                    <div class="system-content">
                        Historial de comunicaciones borrado por el administrador.
                    </div>
                    <div class="system-time">Acción administrativa</div>
                </div>
            `;
            showStatus('Historial de comunicaciones eliminado por administrador');
            
            messageCount = 0;
            updateMessageCount();
            
            // Forzar scroll al final
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
    });
}

// Configurar indicador de escritura
function setupTypingIndicator() {
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            typingRef.set({
                deviceId: deviceId,
                ip: userIP,
                typing: true
            });
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            typingRef.set({
                deviceId: deviceId,
                ip: userIP,
                typing: false
            });
        }, 1000);
    });
    
    typingRef.on('value', (snapshot) => {
        const typingData = snapshot.val();
        if (typingData && typingData.deviceId !== deviceId && typingData.typing) {
            typingIndicator.textContent = `${typingData.ip} está escribiendo...`;
        } else {
            typingIndicator.textContent = '';
        }
    });
}

// Inicializar la aplicación después de la autenticación
async function initializeApp() {
    await getIP();
    setupRealtimeListener();
    setupCommandListener();
    setupTypingIndicator();
    
    // Enviar mensaje
    sendButton.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        
        if (message) {
            try {
                const encryptedMessage = encryptMessage(message);
                
                await messagesRef.push({
                    ip: userIP,
                    deviceId: deviceId,
                    text: encryptedMessage,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Crear mensaje local
                addMessageToChat(message, userIP, deviceId, true);
                updateMessageCount();
                
                messageInput.value = '';
                messageInput.focus();
                
                // Limpiar indicador de escritura
                if (isTyping) {
                    isTyping = false;
                    typingRef.set({
                        deviceId: deviceId,
                        ip: userIP,
                        typing: false
                    });
                }
            } catch (error) {
                showError('Error al enviar mensaje: ' + error.message);
            }
        } else {
            showError('Escriba un mensaje para enviar');
        }
    });
    
    // Enviar con Enter
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === "Enter") {
            sendButton.click();
        }
    });
    
    // Borrar chat (solo para admin)
    clearChatButton.addEventListener('click', async () => {
        if (!isAdmin) {
            showError('Acceso denegado: Solo el administrador puede borrar el chat');
            return;
        }
        
        if (confirm('¿ESTÁ SEGURO DE BORRAR TODAS LAS COMUNICACIONES?\nEsta acción no se puede deshacer.')) {
            try {
                // Borrar mensajes de Firebase
                await messagesRef.remove();
                
                // Enviar comando de borrado a todos los dispositivos
                await commandsRef.set({
                    action: 'clear_chat',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Borrar el chat localmente
                chatContainer.innerHTML = `
                    <div class="system-message">
                        <div class="system-header">SISTEMA ASHERNET</div>
                        <div class="system-content">
                            Historial de comunicaciones borrado por el administrador.
                        </div>
                        <div class="system-time">Acción administrativa</div>
                    </div>
                `;
                
                messageCount = 0;
                updateMessageCount();
                
                showStatus('Historial de comunicaciones eliminado');
                
                // Forzar scroll al final
                setTimeout(() => {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }, 100);
            } catch (error) {
                showError('Error al borrar comunicaciones: ' + error.message);
            }
        }
    });
    
    // Cambiar PIN (solo admin)
    changePinBtn.addEventListener('click', async () => {
        if (!isAdmin) {
            showError('Acceso denegado: Solo el administrador puede cambiar el PIN');
            return;
        }
        
        const newPIN = pinChangeInput.value.trim();
        
        if (!newPIN || newPIN.length !== 4 || isNaN(newPIN)) {
            const successDiv = document.getElementById('pin-change-success');
            successDiv.textContent = "PIN inválido. Debe ser 4 dígitos.";
            successDiv.className = "status-message status-error";
            successDiv.style.display = 'block';
            setTimeout(() => { successDiv.style.display = 'none'; }, 3000);
            return;
        }
        
        try {
            // Guardar nuevo PIN en Firebase
            await configRef.child('pin').set(newPIN);
            
            // Actualizar variables locales
            currentPIN = newPIN;
            encryptionKey = "CipherKey" + currentPIN;
            
            const successDiv = document.getElementById('pin-change-success');
            successDiv.textContent = `PIN actualizado a ${newPIN}. Todos los usuarios deberán usar este nuevo código.`;
            successDiv.className = "status-message status-success";
            successDiv.style.display = 'block';
            pinChangeInput.value = '';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 4000);
            
        } catch (error) {
            showError('Error al actualizar PIN: ' + error.message);
        }
    });
    
    // Renovar sesión
    if (refreshSessionBtn) {
        refreshSessionBtn.addEventListener('click', () => {
            const sessionData = JSON.parse(localStorage.getItem('ashernet_session'));
            if (sessionData) {
                sessionData.expires = Date.now() + 600000;
                localStorage.setItem('ashernet_session', JSON.stringify(sessionData));
                startSessionTimer(600000);
                showStatus('Sesión renovada por 10 minutos');
            }
        });
    }
    
    // Exportar chat (placeholder)
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', () => {
            showStatus('Función de exportación en desarrollo');
        });
    }
    
    // Forzar scroll al fondo del chat al iniciar
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 300);
}

// Función para añadir mensaje al chat
function addMessageToChat(message, ip, device, isSent = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const shortDeviceId = device.substr(0, 8) + "...";
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${isSent ? 'TÚ' : `DISPOSITIVO ${shortDeviceId}`}</span>
            <span class="message-ip">${ip}</span>
        </div>
        <div class="message-content">${message}</div>
        <div class="message-time">${timestamp}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    
    // Scroll al fondo del chat
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
    
    if (!isSent) {
        // Efecto de notificación sutil
        messageElement.style.animation = 'fadeIn 0.5s ease-out';
    }
}

// Efectos de interfaz
messageInput.addEventListener('focus', function() {
    this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    this.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
});

messageInput.addEventListener('blur', function() {
    this.style.borderColor = '';
    this.style.boxShadow = '';
});