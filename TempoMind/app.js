let timerInterval = null,
  startTime = null,
  elapsedTime = 0,
  isPaused = false,
  isRunning = false,
  currentSubjectId = null,
  activeTimerSubjectId = null,
  currentView = "subjects",
  subjects = [],
  sessions = [],
  chartInstance = null,
  chartSessions = [],
  selectedSessionId = null,
  dailyGoalMs = 7200000,
  toastTimeout = null;
const STORAGE = {
  SUBJECTS: "tempomind_subjects_v2",
  SESSIONS: "tempomind_sessions_v2",
  ACTIVE: "tempomind_active_session_v2",
  GOAL: "tempomind_daily_goal_v2",
  THEME: "tempomind_theme_v2",
};
const COLORS = [
  "#6c8cff",
  "#f59e0b",
  "#4ade80",
  "#f472b6",
  "#22d3ee",
  "#a78bfa",
  "#fb7185",
  "#a3e635",
];
document.addEventListener("DOMContentLoaded", init);
function init() {
  loadTheme();
  loadData();
  loadGoal();
  restoreActiveSession();
  document.getElementById("import-file").onchange = importData;
  document.addEventListener("keydown", handleKeyboard);
  initChart();
  renderApp();
}
function renderApp() {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  if (document.getElementById(`view-${currentView}`)) {
    document.getElementById(`view-${currentView}`).classList.add("active");
  }
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.dataset.view === currentView ||
          (currentView === "detail" && b.dataset.view === "subjects"),
      ),
    );
  if (currentView === "subjects") renderSubjects();
  if (currentView === "detail") renderDetail();
  if (currentView === "stats") {
    updateStats();
    updateGoalBar();
    updateChart();
    setTimeout(() => chartInstance?.resize(), 50);
  }
}
function switchTab(v) {
  currentView = v === "stats" ? "stats" : "subjects";
  renderApp();
}
function openSubject(id) {
  currentSubjectId = id;
  currentView = "detail";
  renderApp();
}
function goToSubjects() {
  currentView = "subjects";
  renderApp();
}
function subject() {
  return subjects.find((s) => s.id === currentSubjectId);
}
function renderSubjects() {
  const grid = document.getElementById("subjects-grid"),
    empty = document.getElementById("subjects-empty"),
    banner = document.getElementById("active-timer-banner");
  grid.innerHTML = "";
  empty.classList.toggle("hidden", subjects.length > 0);
  const max = Math.max(...subjects.map((s) => s.totalMs), 0);
  if (activeTimerSubjectId) {
    const subjectName =
      subjects.find((s) => s.id === activeTimerSubjectId)?.name || "materia";
    banner.textContent = `Sesión activa en ${subjectName}`;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
  subjects.forEach((s) => {
    const p = max ? Math.max((s.totalMs / max) * 100, 2) : 0,
      c = document.createElement("button");
    c.className = "subject-card";
    c.style.setProperty("--subject-color", s.color);
    c.onclick = () => openSubject(s.id);
    c.innerHTML = `<span class="subject-card-top"><span class="subject-dot"></span><b>${escapeHTML(s.name)}</b><span class="subject-arrow">→</span></span><strong class="subject-total">${formatShort(s.totalMs)}</strong><span class="subject-progress"><span style="width:${p}%"></span></span><small class="subject-progress-label">${max ? Math.round(p) + "% del máximo" : "Aún sin sesiones"}</small>`;
    grid.appendChild(c);
  });
}
function openSubjectModal() {
  document.getElementById("subject-name").value = "";
  document.getElementById("subject-color").value =
    COLORS[subjects.length % COLORS.length];
  document.getElementById("subject-modal").classList.remove("hidden");
}
function closeSubjectModal() {
  closeModal("subject-modal");
}
function createSubject() {
  const name = document.getElementById("subject-name").value.trim();
  if (!name) return showToast("Escribe un nombre", "error");
  subjects.push({
    id: Date.now().toString(),
    name,
    color: document.getElementById("subject-color").value,
    createdAt: new Date().toISOString(),
    totalMs: 0,
  });
  saveData();
  closeSubjectModal();
  renderApp();
}
function renderDetail() {
  const s = subject();
  if (!s) return goToSubjects();
  document.getElementById("detail-view-name").textContent = s.name;
  document.getElementById("detail-view-total").textContent = formatShort(
    s.totalMs,
  );
  document.getElementById("detail-view-dot").style.background = s.color;
  renderTimer();
  renderSessions();
}
function renderTimer() {
  document.getElementById("start-btn").classList.toggle("hidden", isRunning);
  document.getElementById("pause-btn").classList.toggle("hidden", !isRunning);
  document.getElementById("stop-btn").classList.toggle("hidden", !isRunning);
  document.getElementById("pause-btn").textContent = isPaused
    ? "Reanudar"
    : "Pausar";
  document
    .getElementById("timer-pulse")
    .classList.toggle("hidden", !isRunning || isPaused);
}
function startTimer() {
  if (isRunning) return;
  const targetSubject = currentSubjectId || activeTimerSubjectId;
  if (!targetSubject) return;
  activeTimerSubjectId = targetSubject;
  currentSubjectId = targetSubject;
  startTime = Date.now() - elapsedTime;
  isRunning = true;
  isPaused = false;
  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
  persistActiveSession();
  renderTimer();
  updateGoalBar();
}
function tick() {
  if (!isRunning) return;
  elapsedTime = Date.now() - startTime;
  document.getElementById("timer-display").textContent = formatMs(elapsedTime);
  persistActiveSession();
  updateGoalBar();
}
function togglePause() {
  if (!isRunning) return;
  if (isPaused) {
    startTime = Date.now() - elapsedTime;
    clearInterval(timerInterval);
    timerInterval = setInterval(tick, 250);
    isPaused = false;
  } else {
    clearInterval(timerInterval);
    elapsedTime = Date.now() - startTime;
    isPaused = true;
  }
  persistActiveSession();
  renderTimer();
}
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  if (!isPaused) elapsedTime = Date.now() - startTime;
  isRunning = false;
  isPaused = false;
  const sessionSubjectId = activeTimerSubjectId || currentSubjectId;
  const sessionSubject =
    subjects.find((s) => s.id === sessionSubjectId) || subject();
  if (!sessionSubject || elapsedTime < 1000) return resetTimer();
  localStorage.removeItem(STORAGE.ACTIVE);
  document.getElementById("modal-session-summary").textContent =
    `${sessionSubject.name} · ${formatMs(elapsedTime)}`;
  document.getElementById("notes-modal").classList.remove("hidden");
}
function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedTime = 0;
  startTime = null;
  isRunning = false;
  isPaused = false;
  activeTimerSubjectId = null;
  localStorage.removeItem(STORAGE.ACTIVE);
  document.getElementById("timer-display").textContent = "00:00:00";
  renderTimer();
  updateGoalBar();
  document.getElementById("timer-ring")?.style.setProperty("--progress", 0);
}
function saveSession() {
  const now = new Date(),
    raw = document.getElementById("modal-tags").value,
    sessionSubjectId = activeTimerSubjectId || currentSubjectId;
  if (!sessionSubjectId) return resetTimer();
  sessions.push({
    id: Date.now().toString(),
    subjectId: sessionSubjectId,
    durationMs: Number(elapsedTime) || 0,
    startTimeISO: new Date(now - elapsedTime).toISOString(),
    endTimeISO: now.toISOString(),
    notes: document.getElementById("modal-notes").value,
    mood: document.getElementById("modal-mood").value,
    tags: raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  });
  syncTotals();
  saveData();
  resetTimer();
  closeModal("notes-modal");
  renderApp();
}
function discardSession() {
  resetTimer();
  closeModal("notes-modal");
}
function loadData() {
  try {
    subjects = JSON.parse(localStorage.getItem(STORAGE.SUBJECTS) || "[]");
  } catch (error) {
    subjects = [];
    localStorage.removeItem(STORAGE.SUBJECTS);
  }
  try {
    sessions = JSON.parse(localStorage.getItem(STORAGE.SESSIONS) || "[]");
  } catch (error) {
    sessions = [];
    localStorage.removeItem(STORAGE.SESSIONS);
  }
  syncTotals();
}
function syncTotals() {
  subjects.forEach((s) => {
    s.totalMs = sessions
      .filter((x) => x.subjectId === s.id)
      .reduce((n, x) => n + Number(x.durationMs || 0), 0);
  });
}
function saveData() {
  syncTotals();
  localStorage.setItem(STORAGE.SUBJECTS, JSON.stringify(subjects));
  localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(sessions));
}
function renderSessions() {
  const box = document.getElementById("sessions-list");
  if (!box) return;
  const list = sessions.filter((s) => s.subjectId === currentSubjectId);
  box.innerHTML = list.length
    ? list
        .map(
          (s) =>
            `<div class="session-item" onclick="openSession('${s.id}')"><span>${formatDate(s.startTimeISO)}</span><b>${formatMs(s.durationMs)}</b></div>`,
        )
        .join("")
    : '<div class="empty-state"><p>Aún no hay sesiones registradas</p></div>';
}
function openSession(id) {
  selectedSessionId = id;
  const s = sessions.find((x) => x.id === id);
  if (!s) return;
  const subjectName =
    subjects.find((item) => item.id === s.subjectId)?.name || "Materia";
  document.getElementById("detail-subject").textContent = subjectName;
  document.getElementById("detail-duration").textContent = formatMs(
    s.durationMs,
  );
  document.getElementById("detail-date").textContent = formatDate(
    s.startTimeISO,
  );
  const moodMap = {
    1: "Mal",
    2: "Distraído",
    3: "Normal",
    4: "Bien",
    5: "Excelente",
  };
  document.getElementById("detail-mood").textContent =
    s.mood && moodMap[s.mood] ? moodMap[s.mood] : "Sin especificar";
  document.getElementById("detail-tags").textContent =
    Array.isArray(s.tags) && s.tags.length
      ? s.tags.join(", ")
      : "Sin etiquetas";
  document.getElementById("detail-notes").textContent = s.notes || "Sin notas";
  document.getElementById("detail-modal").classList.remove("hidden");
}
function closeDetailModal() {
  closeModal("detail-modal");
}
function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}
function updateStats() {
  const total = sessions.reduce((n, s) => n + Number(s.durationMs || 0), 0);
  const activeDays = new Set(
    sessions.map((s) => new Date(s.startTimeISO).toDateString()),
  );
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekTotal = sessions.reduce((n, s) => {
    const ts = new Date(s.startTimeISO);
    return ts >= weekStart ? n + Number(s.durationMs || 0) : n;
  }, 0);
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (activeDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const avg = activeDays.size ? total / activeDays.size : 0;
  document.getElementById("stat-today").textContent = formatShort(today());
  document.getElementById("stat-week").textContent = formatShort(weekTotal);
  document.getElementById("stat-average").textContent = formatShort(avg);
  document.getElementById("stat-streak").textContent =
    `${streak} día${streak === 1 ? "" : "s"}`;
}
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => new Date(s.startTimeISO) >= d)
    .reduce((n, s) => n + Number(s.durationMs || 0), 0);
}
function updateGoalBar() {
  const current = today();
  const safeGoal = dailyGoalMs > 0 ? dailyGoalMs : 1;
  const progress = Math.min(Math.max(current / safeGoal, 0), 1);
  const ringValue =
    isRunning || isPaused
      ? Math.min((current + elapsedTime) / safeGoal, 1)
      : progress;
  const ring = document.getElementById("timer-ring");
  ring?.style.setProperty(
    "--progress",
    String(Math.min(Math.max(ringValue, 0), 1)),
  );
  const goalFill = document.getElementById("goal-fill");
  if (goalFill) goalFill.style.width = `${progress * 100}%`;
  const goalText = document.getElementById("goal-text");
  if (goalText)
    goalText.textContent = `${formatShort(current)} / ${formatShort(safeGoal)}`;
}
function loadGoal() {
  const n = Number(localStorage.getItem(STORAGE.GOAL));
  if (Number.isFinite(n) && n > 0) dailyGoalMs = n * 3600000;
}
function editDailyGoal() {
  const n = Number(prompt("Horas objetivo por día", dailyGoalMs / 3600000));
  if (!Number.isFinite(n) || n < 1) {
    showToast("La meta debe ser al menos 1 hora", "error");
    return;
  }
  dailyGoalMs = n * 3600000;
  localStorage.setItem(STORAGE.GOAL, String(n));
  updateGoalBar();
}
function initChart() {
  chartInstance = new Chart(document.getElementById("sessionsChart"), {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: "#6c8cff" }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}
function updateChart() {
  if (!chartInstance) return;
  chartSessions = sessions.slice(-10).map((s) => ({ ...s }));
  chartInstance.data.labels = chartSessions.map((s) => {
    const subject = subjects.find((item) => item.id === s.subjectId);
    return subject ? subject.name : "Sin materia";
  });
  chartInstance.data.datasets[0].data = chartSessions.map(
    (s) => Number(s.durationMs || 0) / 60000,
  );
  chartInstance.update();
}
function exportData() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify({ subjects, sessions })], {
      type: "application/json",
    }),
  );
  a.download = "tempomind-data.json";
  a.click();
}
function triggerImport() {
  document.getElementById("import-file").click();
}
function importData(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = (x) => {
    try {
      const parsed = JSON.parse(String(x.target.result));
      if (
        !parsed ||
        !Array.isArray(parsed.subjects) ||
        !Array.isArray(parsed.sessions)
      ) {
        showToast("El archivo no tiene el formato esperado", "error");
        return;
      }
      subjects = parsed.subjects.map((s) => ({
        ...s,
        id: String(s.id),
        name: String(s.name || "Materia"),
        color: s.color || COLORS[0],
        totalMs: Number(s.totalMs) || 0,
      }));
      sessions = parsed.sessions.map((s) => ({
        ...s,
        id: String(s.id),
        subjectId: String(s.subjectId),
        durationMs: Number(s.durationMs) || 0,
        notes: s.notes || "",
        mood: s.mood || "",
        tags: Array.isArray(s.tags) ? s.tags.map((tag) => String(tag)) : [],
      }));
      clearInterval(timerInterval);
      timerInterval = null;
      elapsedTime = 0;
      startTime = null;
      isRunning = false;
      isPaused = false;
      activeTimerSubjectId = null;
      currentSubjectId = null;
      localStorage.removeItem(STORAGE.ACTIVE);
      saveData();
      renderApp();
      showToast("Datos importados correctamente", "success");
    } catch (error) {
      showToast("No se pudo importar el archivo JSON", "error");
    }
  };
  r.readAsText(file);
}
function confirmResetData() {
  document.getElementById("confirm-modal").classList.remove("hidden");
}
function performResetData() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedTime = 0;
  startTime = null;
  isRunning = false;
  isPaused = false;
  activeTimerSubjectId = null;
  currentSubjectId = null;
  subjects = [];
  sessions = [];
  localStorage.removeItem(STORAGE.ACTIVE);
  saveData();
  closeModal("confirm-modal");
  renderApp();
}
function showToast(m, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  clearTimeout(toastTimeout);
  t.textContent = m;
  t.className = `toast ${type}`;
  t.classList.remove("hidden");
  toastTimeout = setTimeout(() => t.classList.add("hidden"), 2500);
}
function toggleTheme() {
  document.body.classList.toggle("light");
  localStorage.setItem(
    STORAGE.THEME,
    document.body.classList.contains("light") ? "light" : "dark",
  );
}
function loadTheme() {
  document.body.classList.toggle(
    "light",
    localStorage.getItem(STORAGE.THEME) === "light",
  );
}
function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function formatShort(ms) {
  const m = Math.round(ms / 60000),
    h = Math.floor(m / 60),
    r = m % 60;
  return h ? `${h}h ${r ? `${r}m` : ""}` : m ? `${r}m` : "0m";
}
function formatDate(i) {
  return new Date(i).toLocaleDateString("es-ES");
}
function escapeHTML(v) {
  return String(v).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
}
function handleKeyboard(e) {
  if (
    e.code === "Space" &&
    currentView === "detail" &&
    !e.target.matches("input,textarea,select")
  ) {
    e.preventDefault();
    isRunning ? togglePause() : startTimer();
  }
}
function persistActiveSession() {
  if (isRunning || isPaused) {
    localStorage.setItem(
      STORAGE.ACTIVE,
      JSON.stringify({
        subjectId: activeTimerSubjectId || currentSubjectId,
        elapsedTime,
        isPaused,
      }),
    );
    return;
  }
  localStorage.removeItem(STORAGE.ACTIVE);
}
function restoreActiveSession() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE.ACTIVE) || "null");
    if (
      !data ||
      !data.subjectId ||
      !subjects.some((s) => s.id === data.subjectId)
    ) {
      localStorage.removeItem(STORAGE.ACTIVE);
      return;
    }
    activeTimerSubjectId = data.subjectId;
    currentSubjectId = data.subjectId;
    currentView = "detail";
    elapsedTime = Number(data.elapsedTime) || 0;
    isRunning = true;
    isPaused = Boolean(data.isPaused);
    if (!isPaused) {
      startTime = Date.now() - elapsedTime;
      clearInterval(timerInterval);
      timerInterval = setInterval(tick, 250);
    }
  } catch (error) {
    localStorage.removeItem(STORAGE.ACTIVE);
  }
}
