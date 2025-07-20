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

// Referencias a elementos del DOM
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearChatButton = document.getElementById('clear-chat');
const connectionStatus = document.getElementById('connection-status');
const userIpElement = document.getElementById('user-ip');
const adminPanel = document.getElementById('admin-panel');
const pinChangeInput = document.getElementById('new-pin-input');
const changePinBtn = document.getElementById('change-pin-btn');
const pinChangeSuccess = document.getElementById('pin-change-success');
const pinError = document.getElementById('pin-error');
const pinInputs = document.querySelectorAll('.pin-digit');
const pinSubmit = document.getElementById('pin-submit');
const sessionStatus = document.getElementById('session-status');
const sessionExpires = document.getElementById('session-expires');
const deviceIdElement = document.getElementById('device-id');

// Variables globales
let userIP = 'Desconocido';
let encryptionKey = "CipherKey2006"; // Clave de cifrado basada en el PIN
const adminIP = "177.93.0.18"; // IP del administrador
let currentPIN = "2006"; // PIN por defecto
let sessionTimer;
let sessionEndTime;
let deviceId;

// Generar ID único del dispositivo
function getDeviceId() {
    let id = localStorage.getItem('cipherlink_deviceId');
    if (!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cipherlink_deviceId', id);
    }
    return id;
}

// Verificar si hay una sesión activa
function checkSession() {
    const sessionData = localStorage.getItem('cipherlink_session');
    if (sessionData) {
        const session = JSON.parse(sessionData);
        const currentTime = Date.now();
        const timeLeft = session.expires - currentTime;
        
        if (timeLeft > 0) {
            // Sesión válida
            currentPIN = session.pin;
            encryptionKey = "CipherKey" + currentPIN;
            deviceId = getDeviceId();
            deviceIdElement.textContent = deviceId.substr(0, 8) + "...";
            
            loginScreen.style.display = 'none';
            appContainer.style.display = 'flex';
            initializeApp();
            startSessionTimer(timeLeft);
            return true;
        } else {
            // Sesión expirada
            localStorage.removeItem('cipherlink_session');
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
            sessionStatus.textContent = "EXPIRADA";
            showError("Sesión expirada. Por favor vuelva a autenticarse.");
            setTimeout(() => {
                localStorage.removeItem('cipherlink_session');
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
document.addEventListener('DOMContentLoaded', () => {
    deviceId = getDeviceId();
    deviceIdElement.textContent = deviceId.substr(0, 8) + "...";
    
    if (!checkSession()) {
        pinInputs[0].focus();
    }
});

// Verificar si hay un PIN almacenado
const storedPIN = localStorage.getItem('cipherlink_pin');
if (storedPIN) {
    currentPIN = storedPIN;
    encryptionKey = "CipherKey" + currentPIN;
}

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
function verifyPIN() {
    const enteredPIN = Array.from(pinInputs).map(input => input.value).join('');
    
    if (enteredPIN === currentPIN) {
        // Guardar sesión (10 minutos)
        const sessionData = {
            pin: currentPIN,
            expires: Date.now() + 600000 // 10 minutos
        };
        localStorage.setItem('cipherlink_session', JSON.stringify(sessionData));
        
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        initializeApp();
        startSessionTimer(600000);
    } else {
        pinError.style.display = 'block';
        // Limpiar campos de PIN
        pinInputs.forEach(input => input.value = '');
        pinInputs[0].focus();
        
        // Efecto de vibración para indicar error
        loginScreen.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], {
            duration: 300,
            iterations: 2
        });
    }
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
                connectionStatus.textContent = 'CIFRADO';
                
                // Mostrar panel de administrador si corresponde
                if (userIP === adminIP) {
                    adminPanel.style.display = 'block';
                    clearChatButton.style.display = 'block';
                }
                resolve();
            })
            .catch(error => {
                showError('Error al obtener IP: ' + error.message);
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
                <div class="message system">
                    <div class="message-header">SISTEMA CIPHERLINK</div>
                    <div class="message-content">
                        Historial de comunicaciones borrado por el administrador.
                    </div>
                    <div class="timestamp">Acción administrativa</div>
                </div>
            `;
            showStatus('Historial de comunicaciones eliminado por administrador');
            
            // Forzar scroll al final
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
    });
}

// Inicializar la aplicación después de la autenticación
async function initializeApp() {
    await getIP();
    setupRealtimeListener();
    setupCommandListener();
    
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
                
                messageInput.value = '';
                messageInput.focus();
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
        if (userIP !== adminIP) {
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
                    <div class="message system">
                        <div class="message-header">SISTEMA CIPHERLINK</div>
                        <div class="message-content">
                            Historial de comunicaciones borrado por el administrador.
                        </div>
                        <div class="timestamp">Acción administrativa</div>
                    </div>
                `;
                
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
    changePinBtn.addEventListener('click', () => {
        if (userIP !== adminIP) return;
        
        const newPIN = pinChangeInput.value.trim();
        
        if (!newPIN || newPIN.length !== 4 || isNaN(newPIN)) {
            pinChangeSuccess.textContent = "PIN inválido. Debe ser 4 dígitos.";
            pinChangeSuccess.className = "status-message status-error";
            pinChangeSuccess.style.display = 'block';
            return;
        }
        
        currentPIN = newPIN;
        encryptionKey = "CipherKey" + currentPIN;
        localStorage.setItem('cipherlink_pin', currentPIN);
        
        // Actualizar sesión con nuevo PIN
        const sessionData = JSON.parse(localStorage.getItem('cipherlink_session'));
        if (sessionData) {
            sessionData.pin = currentPIN;
            localStorage.setItem('cipherlink_session', JSON.stringify(sessionData));
        }
        
        pinChangeSuccess.textContent = "PIN actualizado correctamente. Nueva clave de cifrado activa.";
        pinChangeSuccess.className = "status-message status-success";
        pinChangeSuccess.style.display = 'block';
        pinChangeInput.value = '';
        
        setTimeout(() => {
            pinChangeSuccess.style.display = 'none';
        }, 3000);
    });
    
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
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const shortDeviceId = device.substr(0, 6) + "...";
    
    messageElement.innerHTML = `
        <div class="message-header">
            ${isSent ? 'TÚ' : `DISPOSITIVO: ${ip}`}
            <span class="device-id">ID: ${shortDeviceId}</span>
        </div>
        <div class="message-content">${message}</div>
        <div class="timestamp">${timestamp}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    
    // Scroll al fondo del chat
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
    
    if (!isSent) {
        showStatus('Mensaje cifrado recibido');
    }
}

// Efecto de terminal - cursor parpadeante en campo de mensaje
messageInput.addEventListener('focus', function() {
    this.classList.add('blink');
});

messageInput.addEventListener('blur', function() {
    this.classList.remove('blink');
});
