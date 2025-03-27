// script.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toolbar = document.querySelector('.toolbar');
const tools = document.querySelectorAll('.tool');
const sizeInput = document.getElementById('size');
const opacityInput = document.getElementById('opacity');
const colorInput = document.getElementById('color');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const newCanvasBtn = document.getElementById('new-canvas');
const toggleThemeBtn = document.getElementById('toggle-theme');
const canvasList = document.getElementById('canvas-list');

let drawing = false;
let currentTool = 'pencil';
let history = [];
let redoStack = [];
let canvases = [];
let currentCanvas = 0;

// Ajustar tamaño del lienzo
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redraw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Selección de herramientas
tools.forEach(tool => {
    tool.addEventListener('click', () => {
        tools.forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        currentTool = tool.id;
    });
});

// Dibujar
function startDrawing(e) {
    drawing = true;
    ctx.beginPath();
    draw(e);
}

function stopDrawing() {
    if (drawing) {
        drawing = false;
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        redoStack = [];
    }
}

function draw(e) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineWidth = sizeInput.value;
    ctx.globalAlpha = opacityInput.value;
    ctx.strokeStyle = colorInput.value;

    if (currentTool === 'pencil') {
        ctx.lineCap = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'marker') {
        ctx.lineCap = 'square';
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'brush') {
        ctx.lineCap = 'round';
        ctx.lineWidth = sizeInput.value * 2;
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

// Eventos de dibujo
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchmove', draw);

// Deshacer y rehacer
undoBtn.addEventListener('click', () => {
    if (history.length > 0) {
        redoStack.push(history.pop());
        redraw();
    }
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        history.push(redoStack.pop());
        redraw();
    }
});

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
    }
}

// Múltiples lienzos
newCanvasBtn.addEventListener('click', () => {
    canvases[currentCanvas] = history.slice();
    history = [];
    currentCanvas = canvases.length;
    canvases.push([]);
    updateCanvasList();
});

function updateCanvasList() {
    canvasList.innerHTML = '';
    canvases.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.textContent = `Lienzo ${i + 1}`;
        btn.addEventListener('click', () => {
            canvases[currentCanvas] = history.slice();
            currentCanvas = i;
            history = canvases[i].slice();
            redraw();
        });
        canvasList.appendChild(btn);
    });
}

// Modo claro/oscuro
toggleThemeBtn.addEventListener('click', () => {
    document.documentElement.dataset.theme = 
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
});