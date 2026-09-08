let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let currentSubject = "";
let sessions = [];
let chartInstance = null;
let selectedSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    renderSessionsList();
    initChart();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    if (tabName === 'timer') {
        document.getElementById('tab-timer-btn').classList.add('active');
        document.getElementById('view-timer').classList.add('active');
    } else {
        document.getElementById('tab-stats-btn').classList.add('active');
        document.getElementById('view-stats').classList.add('active');
        updateChart();
    }
}

function startTimer() {
    const subjectInput = document.getElementById('subject-input');
    const subject = subjectInput.value.trim();

    if (!subject) {
        alert('Please enter a subject or topic before starting.');
        return;
    }

    currentSubject = subject;
    subjectInput.disabled = true;
    
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(updateTimerDisplay, 1000);

    document.getElementById('start-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
}

function updateTimerDisplay() {
    elapsedTime = Date.now() - startTime;
    document.getElementById('timer-display').innerText = formatMs(elapsedTime);
}

function stopTimer() {
    clearInterval(timerInterval);
    
    const summaryText = `Subject: ${currentSubject} | Duration: ${formatMs(elapsedTime)}`;
    document.getElementById('modal-session-summary').innerText = summaryText;
    document.getElementById('notes-modal').classList.remove('hidden');
}

function saveSession() {
    const notes = document.getElementById('modal-notes').value.trim();
    const now = new Date();

    const newSession = {
        id: Date.now().toString(),
        subject: currentSubject,
        durationMs: elapsedTime,
        startTimeISO: new Date(startTime).toISOString(),
        endTimeISO: now.toISOString(),
        notes: notes || "No notes"
    };

    sessions.push(newSession);
    persistSessions();
    resetTimerUI();
    closeModal('notes-modal');
    renderSessionsList();
}

function discardSession() {
    resetTimerUI();
    closeModal('notes-modal');
}

function resetTimerUI() {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedTime = 0;
    startTime = null;
    currentSubject = "";

    document.getElementById('timer-display').innerText = "00:00:00";
    document.getElementById('subject-input').value = "";
    document.getElementById('subject-input').disabled = false;
    document.getElementById('modal-notes').value = "";

    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('start-btn').classList.remove('hidden');
}

function persistSessions() {
    localStorage.setItem('study_sessions_data', JSON.stringify(sessions));
}

function loadSessions() {
    const stored = localStorage.getItem('study_sessions_data');
    if (stored) {
        try {
            sessions = JSON.parse(stored);
        } catch (e) {
            sessions = [];
        }
    }
}

function formatMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeRange(startISO, endISO) {
    const start = new Date(startISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const end = new Date(endISO).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
}

function renderSessionsList() {
    const container = document.getElementById('sessions-list');
    container.innerHTML = '';

    if (sessions.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No sessions recorded yet.</p>';
        return;
    }

    const sortedSessions = [...sessions].reverse();

    sortedSessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.onclick = () => openDetailModal(session.id);

        item.innerHTML = `
            <div class="session-info-main">
                <span class="session-title">${escapeHTML(session.subject)}</span>
                <span class="session-date">${formatDate(session.startTimeISO)}</span>
            </div>
            <span class="session-duration">${formatMs(session.durationMs)}</span>
        `;
        container.appendChild(item);
    });
}

function openDetailModal(id) {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    selectedSessionId = id;
    document.getElementById('detail-subject').innerText = session.subject;
    document.getElementById('detail-date').innerText = formatDate(session.startTimeISO);
    document.getElementById('detail-time').innerText = formatTimeRange(session.startTimeISO, session.endTimeISO);
    document.getElementById('detail-duration').innerText = formatMs(session.durationMs);
    document.getElementById('detail-notes').innerText = session.notes;

    document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetailModal() {
    closeModal('detail-modal');
    selectedSessionId = null;
}

function deleteCurrentDetailSession() {
    if (!selectedSessionId) return;
    sessions = sessions.filter(s => s.id !== selectedSessionId);
    persistSessions();
    closeDetailModal();
    renderSessionsList();
    updateChart();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function initChart() {
    const ctx = document.getElementById('sessionsChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Duration (Minutes)',
                data: [],
                backgroundColor: '#fff',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#fff' },
                    ticks: { color: '#fff' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#fff' }
                }
            },
            plugins: {
                legend: { display: false }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const session = sessions[index];
                    if (session) openDetailModal(session.id);
                }
            }
        }
    });
}

function updateChart() {
    if (!chartInstance) return;

    const recentSessions = [...sessions].slice(-10);

    const labels = recentSessions.map(s => s.subject);
    const durationMinutes = recentSessions.map(s => (s.durationMs / (1000 * 60)).toFixed(1));

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = durationMinutes;
    chartInstance.update();
}

function confirmResetData() {
    if (sessions.length === 0) {
        alert("There is no saved data to reset.");
        return;
    }

    const confirmed = confirm("Are you sure you want to delete all saved sessions? This action cannot be undone.");

    if (confirmed) {
        sessions = [];
        localStorage.removeItem('study_sessions_data');
        renderSessionsList();
        updateChart();
    }
}