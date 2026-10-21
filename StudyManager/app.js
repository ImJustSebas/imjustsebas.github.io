let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let isPaused = false;
let isRunning = false;
let currentSubjectId = null;
let activeTimerSubjectId = null;
let currentView = "subjects";
let subjects = [];
let sessions = [];
let chartInstance = null;
let dailyGoalMs = 2 * 60 * 60 * 1000;
let toastTimeout = null;
let focusTimeout = null;
let pendingImport = null;
let currentSessionId = null;
let lastResetSnapshot = null;
let lastResetTimeout = null;
let audioContext = null;
let wakeLock = null;
let lastPersistAt = 0;
let longSessionWarned = false;
let veryLongSessionWarned = false;
let lastPomodoroRender = "";
let toastAction = null;
let toastActionTimeout = null;
const SNAPSHOT_KEY = "tempomind_snapshot_v1";

const STORAGE = {
  SUBJECTS: "tempomind_subjects_v2",
  SESSIONS: "tempomind_sessions_v2",
  ACTIVE: "tempomind_active_session_v2",
  GOAL: "tempomind_daily_goal_v2",
  THEME: "tempomind_theme_v2",
  POMODORO: "tempomind_pomodoro_v2",
};

const pomodoroConfig = {
  studyMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLong: 4,
};

const pomodoroState = {
  phase: "study",
  roundIndex: 1,
  phaseDurationMs: 25 * 60 * 1000,
};

let timerMode = "stopwatch";
const MOOD_LABELS = {
  1: "Mal",
  2: "Distraído",
  3: "Normal",
  4: "Bien",
  5: "Excelente",
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadTheme();
  loadData();
  loadGoal();
  loadPomodoroConfig();
  restoreActiveSession();
  bindEvents();
  initChart();
  renderApp();
}

function bindEvents() {
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("import-file")?.addEventListener("change", importData);

  document.querySelectorAll(".mood-dot").forEach((dot) => {
    dot.addEventListener("click", () => chooseMood(dot.dataset.mood));
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.view));
  });

  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.addEventListener("click", () => switchTimerMode(button.dataset.timerMode));
  });

  document.querySelectorAll(".pomodoro-config input[type='number']").forEach((input) => {
    input.addEventListener("change", handlePomodoroConfigChange);
  });

  document.querySelectorAll("[data-open-subject-modal]").forEach((button) => {
    button.addEventListener("click", openSubjectModal);
  });
  document.querySelectorAll("[data-go-subjects]").forEach((button) => {
    button.addEventListener("click", goToSubjects);
  });
  document.querySelectorAll("[data-start-timer]").forEach((button) => {
    button.addEventListener("click", startTimer);
  });
  document.querySelectorAll("[data-toggle-pause]").forEach((button) => {
    button.addEventListener("click", togglePause);
  });
  document.querySelectorAll("[data-stop-timer]").forEach((button) => {
    button.addEventListener("click", stopTimer);
  });
  document.querySelectorAll("[data-edit-goal]").forEach((button) => {
    button.addEventListener("click", editDailyGoal);
  });
  document.querySelectorAll("[data-export-data]").forEach((button) => {
    button.addEventListener("click", exportData);
  });
  document.querySelectorAll("[data-trigger-import]").forEach((button) => {
    button.addEventListener("click", triggerImport);
  });
  document.querySelectorAll("[data-confirm-reset]").forEach((button) => {
    button.addEventListener("click", confirmResetData);
  });
  document.querySelectorAll("[data-close-subject-modal]").forEach((button) => {
    button.addEventListener("click", closeSubjectModal);
  });
  document.querySelectorAll("[data-create-subject]").forEach((button) => {
    button.addEventListener("click", createSubject);
  });
  document.querySelectorAll("[data-discard-session]").forEach((button) => {
    button.addEventListener("click", discardSession);
  });
  document.querySelectorAll("[data-save-session]").forEach((button) => {
    button.addEventListener("click", saveSession);
  });
  document.querySelectorAll("[data-close-detail-modal]").forEach((button) => {
    button.addEventListener("click", closeDetailModal);
  });
  document.querySelectorAll("[data-close-confirm-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal("confirm-modal"));
  });
  document.querySelectorAll("[data-confirm-reset-data]").forEach((button) => {
    button.addEventListener("click", performResetData);
  });
  document.querySelectorAll("[data-close-import-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingImport = null;
      closeModal("import-confirm-modal");
    });
  });
  document.querySelectorAll("[data-confirm-import]").forEach((button) => {
    button.addEventListener("click", confirmImport);
  });
  document.querySelectorAll("[data-restore-snapshot]").forEach((button) => {
    button.addEventListener("click", restoreSnapshot);
  });
  document.querySelectorAll("[data-close-goal-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal("goal-modal"));
  });
  document.querySelectorAll("[data-save-goal]").forEach((button) => {
    button.addEventListener("click", saveGoal);
  });
  document.querySelectorAll("[data-edit-session]").forEach((button) => {
    button.addEventListener("click", editSessionNotes);
  });
  document.querySelectorAll("[data-dock-pause]").forEach((button) => {
    button.addEventListener("click", togglePause);
  });
  document.querySelectorAll("[data-dock-stop]").forEach((button) => {
    button.addEventListener("click", stopTimer);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && (isRunning || isPaused)) persistActiveSession();
    if (document.visibilityState === "visible" && isRunning && !isPaused) requestWakeLock();
  });
  window.addEventListener("pagehide", () => {
    if (isRunning || isPaused) persistActiveSession();
  });

  ["pointermove", "touchstart", "click", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, revealFocusMode, { passive: true });
  });

  document.addEventListener("keydown", handleKeyboard);
}

function loadPomodoroConfig() {
  const limits = {
    studyMin: [1, 180],
    shortBreakMin: [1, 60],
    longBreakMin: [1, 120],
    roundsBeforeLong: [1, 12],
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.POMODORO) || "null");
    if (!saved || typeof saved !== "object") {
      safeSetItem(STORAGE.POMODORO, JSON.stringify({ ...pomodoroConfig }));
      return;
    }

    const nextConfig = {};
    Object.keys(limits).forEach((key) => {
      const value = Number(saved[key]);
      const [minimum, maximum] = limits[key];
      nextConfig[key] = Number.isInteger(value) && value >= minimum && value <= maximum
        ? value
        : pomodoroConfig[key];
    });
    Object.assign(pomodoroConfig, nextConfig);
    safeSetItem(STORAGE.POMODORO, JSON.stringify({ ...pomodoroConfig }));
  } catch (error) {
    Object.assign(pomodoroConfig, { studyMin: 25, shortBreakMin: 5, longBreakMin: 15, roundsBeforeLong: 4 });
    safeSetItem(STORAGE.POMODORO, JSON.stringify({ ...pomodoroConfig }));
  }

  pomodoroState.phase = "study";
  pomodoroState.roundIndex = 1;
  pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60 * 1000;
}

function handlePomodoroConfigChange(event) {
  const field = event.target.dataset.configField;
  if (!field) return;

  const limits = {
    studyMin: [1, 180],
    shortBreakMin: [1, 60],
    longBreakMin: [1, 120],
    roundsBeforeLong: [1, 12],
  };
  if (!limits[field]) return;
  const parsed = Number(event.target.value);
  const [minimum, maximum] = limits[field];
  const safeValue = Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : pomodoroConfig[field];
  event.target.value = String(safeValue);

  pomodoroConfig[field] = safeValue;
  safeSetItem(STORAGE.POMODORO, JSON.stringify({ ...pomodoroConfig }));

  if (!isRunning && !isPaused) {
    pomodoroState.phase = "study";
    pomodoroState.roundIndex = 1;
    pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60 * 1000;
    elapsedTime = 0;
    startTime = null;
    renderTimer();
  }
}

function switchTimerMode(mode) {
  if (!mode || !["stopwatch", "pomodoro"].includes(mode)) return;
  if (isRunning || isPaused) {
    showToast("Hay una sesión activa", "error");
    return;
  }

  timerMode = mode;
  if (timerMode === "pomodoro") {
    pomodoroState.phase = "study";
    pomodoroState.roundIndex = 1;
    pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60 * 1000;
    elapsedTime = 0;
    startTime = null;
  } else {
    elapsedTime = 0;
    startTime = null;
  }

  renderTimer();
}

function getPomodoroPhaseText() {
  if (pomodoroState.phase === "study") return `Ronda ${pomodoroState.roundIndex} de ${pomodoroConfig.roundsBeforeLong}`;
  if (pomodoroState.phase === "shortBreak") return "Descanso corto";
  return "Descanso largo";
}

function renderPomodoroState() {
  const signature = `${timerMode}|${pomodoroState.phase}|${pomodoroState.roundIndex}|${pomodoroConfig.roundsBeforeLong}|${isRunning}|${isPaused}`;
  if (signature === lastPomodoroRender) return;
  const phaseLabel = document.querySelector(".phase-label");
  const roundDots = document.querySelector(".round-dots");
  const configPanel = document.querySelector(".pomodoro-config");
  const modeTabs = document.querySelector(".mode-tabs");

  if (phaseLabel) {
    phaseLabel.textContent = getPomodoroPhaseText();
    phaseLabel.classList.toggle("hidden", timerMode !== "pomodoro");
  }

  if (roundDots) {
    roundDots.innerHTML = "";
    for (let roundNumber = 1; roundNumber <= pomodoroConfig.roundsBeforeLong; roundNumber += 1) {
      const dot = document.createElement("span");
      dot.className = "round-dot";
      if (roundNumber < pomodoroState.roundIndex) dot.classList.add("completed");
      if (roundNumber === pomodoroState.roundIndex) dot.classList.add("current");
      if (roundNumber > pomodoroState.roundIndex) dot.classList.add("pending");
      dot.setAttribute("aria-label", `Ronda ${roundNumber}`);
      roundDots.appendChild(dot);
    }
    roundDots.classList.toggle("hidden", timerMode !== "pomodoro");
  }

  if (configPanel) {
    configPanel.classList.toggle("hidden", timerMode !== "pomodoro" || isRunning || isPaused);
  }

  if (modeTabs) {
    modeTabs.classList.toggle("hidden", isRunning || isPaused);
  }

  document.querySelectorAll(".mode-tab").forEach((button) => {
    const isSelected = button.dataset.timerMode === timerMode;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-selected", String(isSelected));
  });

  const studyInput = document.getElementById("pomodoro-study");
  const shortInput = document.getElementById("pomodoro-short-break");
  const longInput = document.getElementById("pomodoro-long-break");
  const roundsInput = document.getElementById("pomodoro-rounds");
  if (studyInput) studyInput.value = String(pomodoroConfig.studyMin);
  if (shortInput) shortInput.value = String(pomodoroConfig.shortBreakMin);
  if (longInput) longInput.value = String(pomodoroConfig.longBreakMin);
  if (roundsInput) roundsInput.value = String(pomodoroConfig.roundsBeforeLong);
  lastPomodoroRender = signature;
}

function renderTimer() {
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stopBtn = document.getElementById("stop-btn");
  const timerDisplay = document.getElementById("timer-display");

  if (startBtn) startBtn.classList.toggle("hidden", isRunning);
  if (pauseBtn) pauseBtn.classList.toggle("hidden", !isRunning);
  if (stopBtn) stopBtn.classList.toggle("hidden", !isRunning);
  if (pauseBtn) pauseBtn.textContent = isPaused ? "Reanudar" : "Pausar";

  updateSessionDock();

  if (!timerDisplay) return;

  const digits = timerDisplay.querySelectorAll(".t-d");
  const displayMs = timerMode === "pomodoro"
    ? Math.max(0, (pomodoroState.phaseDurationMs || 60000) - elapsedTime)
    : elapsedTime;
  const values = formatMsParts(displayMs);
  digits.forEach((node, index) => {
    node.textContent = values[index];
  });

  timerDisplay.classList.toggle("is-running", isRunning && !isPaused);
  timerDisplay.classList.toggle("is-paused", isPaused);
  updateFocusMode();
  renderPomodoroState();
  updateGoalBar();
}

function startTimer() {
  if (isRunning) return;
  const targetSubject = currentSubjectId || activeTimerSubjectId;
  if (!targetSubject) return;

  activeTimerSubjectId = targetSubject;
  currentSubjectId = targetSubject;

  if (timerMode === "pomodoro") {
    pomodoroState.phase = "study";
    pomodoroState.roundIndex = 1;
    pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60000;
    elapsedTime = 0;
  }

  startTime = Date.now() - elapsedTime;
  isRunning = true;
  isPaused = false;
  longSessionWarned = false;
  veryLongSessionWarned = false;
  lastPersistAt = 0;

  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 250);
  requestWakeLock();
  persistActiveSession();
  lastPersistAt = Date.now();
  renderTimer();
  updateGoalBar();
}

function updateSessionDock() {
  const dock = document.getElementById("active-session-dock");
  const dockSubject = document.getElementById("session-dock-subject");
  const dockTime = document.getElementById("session-dock-time");
  const dockPause = document.querySelector("[data-dock-pause]");
  if (dockSubject) dockSubject.textContent = subjects.find((item) => item.id === activeTimerSubjectId)?.name || "Materia";
  if (dockTime) dockTime.textContent = formatMs(elapsedTime);
  if (dockPause) dockPause.textContent = isPaused ? "Reanudar" : "Pausar";
  if (dock) dock.classList.toggle("hidden", !(isRunning || isPaused) || currentView === "detail");
}

function tick() {
  if (!isRunning) return;

  const next = Date.now() - startTime;
  elapsedTime = Number.isFinite(next) && next >= 0 ? next : 0;
  if (timerMode === "stopwatch" && elapsedTime > 4 * 60 * 60 * 1000 && !longSessionWarned) {
    longSessionWarned = true;
    showToast("Sesión de más de 4 horas. Revisa si sigue activa.", "error");
  }
  if (timerMode === "stopwatch" && elapsedTime > 12 * 60 * 60 * 1000 && !veryLongSessionWarned) {
    veryLongSessionWarned = true;
    showToast("Sesión muy larga. ¿Sigues estudiando?", "error");
  }
  if (timerMode === "pomodoro") {
    const remainingMs = pomodoroState.phaseDurationMs - elapsedTime;
    if (remainingMs <= 0) {
      advancePomodoroPhase();
      return;
    }
  }

  renderTimer();
  if (Date.now() - lastPersistAt > 1000) {
    persistActiveSession();
    lastPersistAt = Date.now();
  }
  updateGoalBar();
}

function advancePomodoroPhase() {
  const previousPhase = pomodoroState.phase;
  const sessionStartTime = startTime ? new Date(startTime) : new Date();
  let studySaved = false;

  if (previousPhase === "study") {
    const studySession = {
      id: generateId(),
      subjectId: activeTimerSubjectId || currentSubjectId,
      durationMs: Number(pomodoroState.phaseDurationMs) || 0,
      startTimeISO: sessionStartTime.toISOString(),
      endTimeISO: new Date().toISOString(),
      notes: "",
      mood: "",
      tags: [],
    };

    if (studySession.subjectId) {
      sessions.push(studySession);
      studySaved = saveData();
      if (currentView === "stats") {
        updateStats();
        updateGoalBar();
        updateChart();
      }
      if (currentView === "subjects") renderSubjects();
      if (currentView === "detail") renderSessions();
    }

    if (studySaved) showToast(`Ronda ${pomodoroState.roundIndex} guardada`);

    if (pomodoroState.roundIndex === pomodoroConfig.roundsBeforeLong) {
      pomodoroState.phase = "longBreak";
      pomodoroState.phaseDurationMs = pomodoroConfig.longBreakMin * 60000;
    } else {
      pomodoroState.phase = "shortBreak";
      pomodoroState.phaseDurationMs = pomodoroConfig.shortBreakMin * 60000;
    }
  } else if (previousPhase === "shortBreak" || previousPhase === "longBreak") {
    pomodoroState.phase = "study";
    if (previousPhase === "longBreak") {
      pomodoroState.roundIndex = 1;
    } else {
      pomodoroState.roundIndex = Math.min((pomodoroState.roundIndex || 1) + 1, pomodoroConfig.roundsBeforeLong);
    }
    pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60000;
  }

  elapsedTime = 0;
  startTime = Date.now();
  updateTimerAnnouncement(`${getPomodoroPhaseText()} iniciada`);

  playChime();
  try {
    if ("vibrate" in navigator) navigator.vibrate(200);
  } catch (error) {
    // No-op
  }

  renderTimer();
  persistActiveSession();
  lastPersistAt = Date.now();
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

  updateTimerAnnouncement(isPaused ? "Sesión en pausa" : "Sesión reanudada");
  persistActiveSession();
  lastPersistAt = Date.now();
  renderTimer();
}

function finalizeSession() {
  isRunning = false;
  isPaused = false;
  releaseWakeLock();
  updateFocusMode();
  const sessionSubjectId = activeTimerSubjectId || currentSubjectId;
  const sessionSubject = subjects.find((subjectItem) => subjectItem.id === sessionSubjectId) || subject();
  resetSessionForm();

  if (!sessionSubject || elapsedTime < 1000) {
    resetTimer();
    return;
  }

  const summary = document.getElementById("modal-session-summary");
  if (summary) summary.textContent = `${sessionSubject.name} · ${formatMs(elapsedTime)}`;

  localStorage.removeItem(STORAGE.ACTIVE);
  openModal("notes-modal", document.getElementById("stop-btn"));
}

function stopTimer() {
  updateTimerAnnouncement("Sesión detenida");

  if (timerMode === "pomodoro") {
    if (!isPaused && startTime !== null) elapsedTime = Math.max(0, Date.now() - startTime);
    persistActiveSession();
    clearInterval(timerInterval);
    timerInterval = null;
    if (pomodoroState.phase === "study" && elapsedTime >= 1000) {
      finalizeSession();
      return;
    }

    isRunning = false;
    isPaused = false;
    updateFocusMode();
    resetTimer();
    return;
  }

  if (!isPaused && startTime !== null) {
    const next = Date.now() - startTime;
    elapsedTime = Number.isFinite(next) && next >= 0 ? next : 0;
  }

  persistActiveSession();
  clearInterval(timerInterval);
  timerInterval = null;
  finalizeSession();
}

function resetTimer() {
  releaseWakeLock();
  resetAllTimerState();
  document.querySelectorAll("#timer-display .t-d").forEach((node) => {
    node.textContent = "00";
  });

  updateTimerProgress();
  renderTimer();
  updateGoalBar();
  updateFocusMode();
}

function resetAllTimerState() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedTime = 0;
  startTime = null;
  isRunning = false;
  isPaused = false;
  activeTimerSubjectId = null;
  timerMode = "stopwatch";
  pomodoroState.phase = "study";
  pomodoroState.roundIndex = 1;
  pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60000;
  longSessionWarned = false;
  veryLongSessionWarned = false;
  lastPomodoroRender = "";
  currentSessionId = null;
  releaseWakeLock();
  resetSessionForm();
  localStorage.removeItem(STORAGE.ACTIVE);
  updateTimerAnnouncement("Sesión detenida");
}

function renderApp() {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const activeView = document.getElementById(`view-${currentView}`);
  if (activeView) activeView.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });

  if (currentView === "subjects") renderSubjects();
  if (currentView === "detail") renderDetail();
  if (currentView === "stats") {
    updateStats();
    updateGoalBar();
    updateChart();
    window.setTimeout(() => chartInstance?.resize(), 50);
  }
  updateSessionDock();
  updateFocusMode();
}

function switchTab(view) {
  if (!view || !["subjects", "stats"].includes(view)) return;
  currentView = view;
  renderApp();
  updateFocusMode();
}

function subject() {
  return subjects.find((item) => item.id === currentSubjectId) || null;
}

function renderSubjects() {
  const grid = document.getElementById("subjects-grid");
  const empty = document.getElementById("subjects-empty");
  const banner = document.getElementById("active-timer-banner");
  if (!grid || !empty) return;

  const max = Math.max(...subjects.map((subjectItem) => Number(subjectItem.totalMs || 0)), 0);
  grid.innerHTML = "";
  empty.classList.toggle("hidden", subjects.length > 0);

  if (banner) {
    if (activeTimerSubjectId) {
      const subjectName = subjects.find((s) => s.id === activeTimerSubjectId)?.name || "materia";
      banner.textContent = `Sesión activa en ${subjectName}`;
      banner.classList.remove("hidden");
      banner.classList.toggle("banner--warning", activeTimerSubjectId !== currentSubjectId);
    } else {
      banner.classList.add("hidden");
      banner.classList.remove("banner--warning");
    }
  }

  subjects.forEach((subjectItem, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subject-card";
    card.style.setProperty("--i", String(index));
    card.innerHTML = `
      <div class="subject-card-head">
        <span class="subject-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="subject-arrow" aria-hidden="true">→</span>
      </div>
      <div class="subject-card-body">
        <span class="subject-name">${escapeHTML(subjectItem.name)}</span>
        <span class="subject-total">${formatShort(subjectItem.totalMs)}</span>
      </div>
    `;
    card.addEventListener("click", () => openSubject(subjectItem.id));
    grid.appendChild(card);
  });

  const newSubject = document.createElement("button");
  newSubject.type = "button";
  newSubject.className = "subject-card subject-card--add";
  newSubject.innerHTML = '<span class="subject-name">+ Nueva materia</span>';
  newSubject.addEventListener("click", openSubjectModal);
  grid.appendChild(newSubject);
}

function openSubject(id) {
  if (activeTimerSubjectId && activeTimerSubjectId !== id) {
    showToast("Hay una sesión activa en otra materia. Deténla primero.", "error");
    return;
  }
  currentSubjectId = id;
  currentView = "detail";
  renderApp();
}

function goToSubjects() {
  currentView = "subjects";
  renderApp();
  updateFocusMode();
}

function openSubjectModal() {
  const nameInput = document.getElementById("subject-name");
  if (!nameInput) return;
  nameInput.value = "";
  openModal("subject-modal", document.activeElement);
  window.setTimeout(() => nameInput.focus(), 50);
}

function closeSubjectModal() {
  closeModal("subject-modal");
}

function createSubject() {
  const nameInput = document.getElementById("subject-name");
  if (!nameInput) return;

  const name = nameInput.value.trim();
  if (!name) {
    showToast("Escribe un nombre", "error");
    return;
  }

  subjects.push({
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    totalMs: 0,
  });

  saveData();
  closeModal("subject-modal");
  renderApp();
}

function renderDetail() {
  if (activeTimerSubjectId && currentSubjectId !== activeTimerSubjectId) {
    currentSubjectId = activeTimerSubjectId;
  }
  const selectedSubject = subject();
  if (!selectedSubject) return goToSubjects();

  const detailName = document.getElementById("detail-view-name");
  const detailTotal = document.getElementById("detail-view-total");
  if (detailName) detailName.textContent = selectedSubject.name;
  if (detailTotal) detailTotal.textContent = formatShort(selectedSubject.totalMs);

  renderTimer();
  renderSessions();
}

function saveSession() {
  const now = new Date();
  const tagsInput = document.getElementById("modal-tags");
  const notesInput = document.getElementById("modal-notes");
  const moodSelect = document.getElementById("modal-mood");
  if (currentSessionId) {
    const existingSession = sessions.find((session) => session.id === currentSessionId);
    if (existingSession && tagsInput && notesInput && moodSelect) {
      existingSession.notes = notesInput.value;
      existingSession.mood = moodSelect.value;
      existingSession.tags = tagsInput.value.split(",").map((tag) => tag.trim()).filter(Boolean);
      saveData();
      currentSessionId = null;
      resetSessionForm();
      closeModal("notes-modal");
      renderApp();
      return;
    }
  }
  const sessionSubjectId = activeTimerSubjectId || currentSubjectId;

  if (!sessionSubjectId || !tagsInput || !notesInput || !moodSelect) {
    resetTimer();
    return;
  }

  const savedSession = {
    id: currentSessionId || generateId(),
    subjectId: sessionSubjectId,
    durationMs: Number(elapsedTime) || 0,
    startTimeISO: new Date(now - elapsedTime).toISOString(),
    endTimeISO: now.toISOString(),
    notes: notesInput.value,
    mood: moodSelect.value,
    tags: tagsInput.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };

  const existingIndex = sessions.findIndex((session) => session.id === currentSessionId);
  if (currentSessionId && existingIndex !== -1) {
    sessions[existingIndex] = { ...sessions[existingIndex], ...savedSession };
  } else {
    sessions.push(savedSession);
  }

  saveData();
  currentSessionId = null;
  resetSessionForm();
  resetTimer();
  closeModal("notes-modal");
  renderApp();
}

function discardSession() {
  if (currentSessionId) {
    currentSessionId = null;
    resetSessionForm();
    closeModal("notes-modal");
    return;
  }
  resetSessionForm();
  resetTimer();
  closeModal("notes-modal");
}

function resetSessionForm() {
  const title = document.getElementById("notes-modal-title");
  const notes = document.getElementById("modal-notes");
  const tags = document.getElementById("modal-tags");
  const moodSelect = document.getElementById("modal-mood");
  const moodDots = document.querySelectorAll(".mood-dot");
  const currentMood = document.getElementById("mood-current-label");

  if (title) title.textContent = "Sesión finalizada";
  if (notes) notes.value = "";
  if (tags) tags.value = "";
  if (moodSelect) moodSelect.value = "";
  moodDots.forEach((dot) => {
    dot.classList.remove("selected");
    dot.setAttribute("aria-checked", "false");
  });
  if (currentMood) currentMood.textContent = "Sin ánimo";
}

function chooseMood(value) {
  const moodSelect = document.getElementById("modal-mood");
  const moodDots = document.querySelectorAll(".mood-dot");
  const currentMood = document.getElementById("mood-current-label");
  if (!moodSelect || !currentMood) return;

  const nextValue = value === moodSelect.value ? "" : value;
  moodSelect.value = nextValue;

  moodDots.forEach((dot) => {
    const selected = dot.dataset.mood === nextValue;
    dot.classList.toggle("selected", selected);
    dot.setAttribute("aria-checked", String(selected));
  });

  currentMood.textContent = nextValue ? MOOD_LABELS[nextValue] : "Sin ánimo";
}

function loadData() {
  subjects = parseStoredArray(STORAGE.SUBJECTS).filter((item) => (
    item && typeof item.id === "string" && item.id.trim() && typeof item.name === "string"
  ));
  sessions = parseStoredArray(STORAGE.SESSIONS).filter((item) => (
    item &&
    typeof item.id === "string" &&
    typeof item.subjectId === "string" &&
    Number.isFinite(item.durationMs) &&
    item.durationMs >= 0 &&
    typeof item.startTimeISO === "string" &&
    !Number.isNaN(new Date(item.startTimeISO).getTime())
  ));
  syncTotals();
}

function parseStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(value)) return value;
  } catch (error) {
    // Invalid persisted JSON is discarded below.
  }
  localStorage.removeItem(key);
  return [];
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    showToast("No se pudo guardar. Revisa el espacio del navegador.", "error");
    return false;
  }
}

function syncTotals() {
  subjects.forEach((subjectItem) => {
    subjectItem.totalMs = sessions
      .filter((session) => session.subjectId === subjectItem.id)
      .reduce((total, session) => total + Number(session.durationMs || 0), 0);
  });
}

function saveData() {
  syncTotals();
  const subjectsSaved = safeSetItem(STORAGE.SUBJECTS, JSON.stringify(subjects));
  const sessionsSaved = safeSetItem(STORAGE.SESSIONS, JSON.stringify(sessions));
  return subjectsSaved && sessionsSaved;
}

function renderSessions() {
  const box = document.getElementById("sessions-list");
  const count = document.getElementById("sessions-count");
  if (!box) return;

  const list = sessions
    .filter((session) => session.subjectId === currentSubjectId)
    .slice()
    .sort((a, b) => new Date(b.startTimeISO) - new Date(a.startTimeISO));
  if (count) count.textContent = String(list.length);

  if (!list.length) {
    box.innerHTML = '<div class="empty-state"><p>Aún no hay sesiones registradas.</p></div>';
    return;
  }

  box.innerHTML = list
    .map((session, index) => {
      const tags = Array.isArray(session.tags) && session.tags.length ? session.tags.join(", ") : "Sin etiqueta";
      return `
        <button type="button" class="session-item" data-id="${escapeAttr(session.id)}" style="--i:${index}">
          <span class="session-date">${formatDate(session.startTimeISO)}</span>
          <span class="session-duration">${formatMs(session.durationMs)}</span>
          <span class="session-tags" title="${escapeAttr(tags)}">${escapeHTML(tags)}</span>
          <span class="session-arrow" aria-hidden="true">→</span>
        </button>
      `;
    })
    .join("");

  box.querySelectorAll(".session-item").forEach((button) => {
    button.addEventListener("click", () => openSession(button.dataset.id));
  });
}

function openSession(id) {
  const session = sessions.find((item) => item.id === id);
  if (!session) return;
  currentSessionId = id;
  const editButton = document.querySelector("[data-edit-session]");
  if (editButton) editButton.classList.toggle("hidden", session.notes !== "" || session.mood !== "");

  const subjectName = subjects.find((item) => item.id === session.subjectId)?.name || "Materia";
  const moodText = session.mood && MOOD_LABELS[session.mood] ? MOOD_LABELS[session.mood] : "Sin especificar";
  const tagsText = Array.isArray(session.tags) && session.tags.length ? session.tags.join(", ") : "Sin etiquetas";

  const detailTitle = document.getElementById("detail-modal-title");
  if (detailTitle) detailTitle.textContent = subjectName;

  const detailSubject = document.getElementById("detail-subject");
  if (detailSubject) detailSubject.textContent = subjectName;

  const detailDuration = document.getElementById("detail-duration");
  if (detailDuration) detailDuration.textContent = formatMs(session.durationMs);

  const detailDate = document.getElementById("detail-date");
  if (detailDate) detailDate.textContent = formatDate(session.startTimeISO);

  const detailMood = document.getElementById("detail-mood");
  if (detailMood) detailMood.textContent = moodText;

  const detailTags = document.getElementById("detail-tags");
  if (detailTags) detailTags.textContent = tagsText;

  const detailNotes = document.getElementById("detail-notes");
  if (detailNotes) detailNotes.textContent = session.notes || "Sin notas";

  openModal("detail-modal", document.activeElement);
}

function editSessionNotes() {
  const sessionId = currentSessionId;
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return;
  const notes = document.getElementById("modal-notes");
  const tags = document.getElementById("modal-tags");
  const mood = document.getElementById("modal-mood");
  const summary = document.getElementById("modal-session-summary");
  const modalTitle = document.getElementById("notes-modal-title");
  if (modalTitle) modalTitle.textContent = "Editar notas";
  if (notes) notes.value = session.notes || "";
  if (tags) tags.value = Array.isArray(session.tags) ? session.tags.join(", ") : "";
  if (mood) mood.value = session.mood || "";
  document.querySelectorAll(".mood-dot").forEach((dot) => {
    const selected = dot.dataset.mood === session.mood;
    dot.classList.toggle("selected", selected);
    dot.setAttribute("aria-checked", String(selected));
  });
  const currentMood = document.getElementById("mood-current-label");
  if (currentMood) currentMood.textContent = session.mood ? MOOD_LABELS[session.mood] : "Sin ánimo";
  if (summary) {
    const subjectName = subjects.find((item) => item.id === session.subjectId)?.name || "Materia";
    summary.textContent = `${subjectName} · ${formatMs(session.durationMs)}`;
  }
  closeModal("detail-modal");
  window.setTimeout(() => {
    currentSessionId = sessionId;
    openModal("notes-modal", document.activeElement);
  }, 220);
}

function closeDetailModal() {
  currentSessionId = null;
  closeModal("detail-modal");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  if (modal._closeTimeout) {
    clearTimeout(modal._closeTimeout);
    modal._closeTimeout = null;
  }
  modal.classList.add("is-closing");
  const closeTimeout = window.setTimeout(() => {
    if (modal._closeTimeout !== closeTimeout) return;
    modal._closeTimeout = null;
    modal.classList.add("hidden");
    modal.classList.remove("is-closing");
    document.body.style.overflow = modal._previousOverflow || "";
    const restoreTarget = modal._returnFocus;
    if (restoreTarget && typeof restoreTarget.focus === "function") {
      restoreTarget.focus();
    }
  }, 200);
  modal._closeTimeout = closeTimeout;
}

function openModal(id, trigger) {
  const modal = document.getElementById(id);
  if (!modal) return;

  const wasVisible = !modal.classList.contains("hidden");
  if (modal._closeTimeout) {
    clearTimeout(modal._closeTimeout);
    modal._closeTimeout = null;
  }
  if (!wasVisible) modal._previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  modal._returnFocus = trigger || document.activeElement;
  modal.classList.remove("hidden");
  modal.classList.remove("is-closing");

  const focusTarget = modal.querySelector(".modal-card") || modal;
  if (focusTarget) {
    window.setTimeout(() => focusTarget.focus(), 50);
  }
}

function updateStats() {
  const total = sessions.reduce((sum, session) => sum + Number(session.durationMs || 0), 0);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const weekTotal = sessions.reduce((totalMs, session) => {
    const started = new Date(session.startTimeISO);
    return started >= weekStart ? totalMs + Number(session.durationMs || 0) : totalMs;
  }, 0);

  const activeDays = new Set(sessions.map((session) => new Date(session.startTimeISO).toDateString()));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (activeDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const avg = activeDays.size ? total / activeDays.size : 0;
  const statToday = document.getElementById("stat-today");
  const statWeek = document.getElementById("stat-week");
  const statAverage = document.getElementById("stat-average");
  const statStreak = document.getElementById("stat-streak");

  if (statToday) statToday.textContent = formatShort(today());
  if (statWeek) statWeek.textContent = formatShort(weekTotal);
  if (statAverage) statAverage.textContent = formatShort(avg);
  if (statStreak) statStreak.textContent = `${streak} día${streak === 1 ? "" : "s"}`;
  renderHeatmap();
}

function today() {
  const now = new Date();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  return sessions
    .filter((session) => {
      const started = new Date(session.startTimeISO);
      return started >= dayStart && started <= now;
    })
    .reduce((total, session) => total + Number(session.durationMs || 0), 0);
}

function renderHeatmap() {
  const grid = document.getElementById("heatmap-grid");
  if (!grid) return;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  dayStart.setDate(dayStart.getDate() - 89);
  const days = [];

  for (let offset = 0; offset < 90; offset += 1) {
    const date = new Date(dayStart);
    date.setDate(dayStart.getDate() + offset);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const total = sessions.reduce((sum, session) => {
      const started = new Date(session.startTimeISO);
      return started >= date && started < nextDate ? sum + Number(session.durationMs || 0) : sum;
    }, 0);
    days.push({ date, total });
  }

  const positiveTotals = days.map((day) => day.total).filter((total) => total > 0).sort((a, b) => a - b);
  const thresholds = [0.25, 0.5, 0.75].map((quartile) => (
    positiveTotals.length ? positiveTotals[Math.max(0, Math.ceil(positiveTotals.length * quartile) - 1)] : Infinity
  ));
  grid.replaceChildren();
  days.forEach((day) => {
    let level = 0;
    if (day.total > 0) {
      level = day.total <= thresholds[0] ? 1 : day.total <= thresholds[1] ? 2 : day.total <= thresholds[2] ? 3 : 4;
    }
    const cell = document.createElement("span");
    cell.className = `heatmap-cell level-${level}`;
    cell.title = `${day.date.toLocaleDateString("es-ES")}: ${formatShort(day.total)}`;
    cell.setAttribute("aria-label", `${day.date.toLocaleDateString("es-ES")}: ${formatShort(day.total)}`);
    grid.appendChild(cell);
  });
}

function updateGoalBar() {
  const current = today();
  const safeGoal = dailyGoalMs > 0 ? dailyGoalMs : 1;
  const progress = Math.min(Math.max(current / safeGoal, 0), 1);
  const activeValue = isRunning || isPaused ? Math.min(Math.max((current + elapsedTime) / safeGoal, 0), 1) : progress;

  const goalFill = document.getElementById("goal-fill");
  if (goalFill) goalFill.style.width = `${progress * 100}%`;

  const goalText = document.getElementById("goal-text");
  if (goalText) goalText.textContent = `${formatShort(current)} / ${formatShort(safeGoal)}`;

  const timerProgressFill = document.getElementById("timer-progress-fill");
  if (timerMode === "pomodoro") {
    const ratio = Math.min(Math.max(elapsedTime / Math.max(pomodoroState.phaseDurationMs || 60000, 1), 0), 1);
    if (timerProgressFill) timerProgressFill.style.width = `${ratio * 100}%`;
    const timerLabel = document.getElementById("timer-progress-label");
    if (timerLabel) timerLabel.textContent = getPomodoroPhaseText();
    return;
  }

  if (timerProgressFill) timerProgressFill.style.width = `${activeValue * 100}%`;

  const timerLabel = document.getElementById("timer-progress-label");
  if (timerLabel) timerLabel.textContent = `${Math.round(activeValue * 100)}%`;
}

function updateTimerProgress() {
  updateGoalBar();
}

function updateFocusMode() {
  const shouldFocus = currentView === "detail" && isRunning && !isPaused;
  document.body.classList.toggle("focus-mode", shouldFocus);
  if (!shouldFocus) document.body.classList.remove("focus-awake");
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || wakeLock) return;
  try {
    const requestedWakeLock = await navigator.wakeLock.request("screen");
    if (!isRunning || isPaused) {
      await requestedWakeLock.release();
      return;
    }
    wakeLock = requestedWakeLock;
  } catch (error) {
    // Wake Lock is optional and may be unavailable in the current browser state.
  }
}

function releaseWakeLock() {
  if (!wakeLock) return;
  const currentWakeLock = wakeLock;
  wakeLock = null;
  try {
    currentWakeLock.release().catch(function () {});
  } catch (error) {
    // Wake Lock release is best-effort.
  }
}

async function playChime() {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") await audioContext.resume();
    const notes = [220, 330, 440];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + index * 0.08 + 0.18);
      oscillator.stop(audioContext.currentTime + index * 0.08 + 0.2);
    });
  } catch (error) {
    // Audio is optional and failures should not interrupt the timer.
  }
}

function updateTimerAnnouncement(message) {
  const announcement = document.getElementById("timer-a11y");
  if (announcement) announcement.textContent = message;
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function revealFocusMode(event) {
  if (!document.body.classList.contains("focus-mode")) return;
  if (event && event.type === "keydown" && event.key === "Tab") return;
  document.body.classList.add("focus-awake");
  clearTimeout(focusTimeout);
  focusTimeout = setTimeout(() => document.body.classList.remove("focus-awake"), 3000);
}

function loadGoal() {
  const stored = localStorage.getItem(STORAGE.GOAL);
  const value = Number(stored);
  if (Number.isFinite(value) && value >= 0.5 && value <= 24) {
    dailyGoalMs = value * 60 * 60 * 1000;
  } else if (stored !== null) {
    dailyGoalMs = 2 * 60 * 60 * 1000;
    localStorage.removeItem(STORAGE.GOAL);
  }
}

function editDailyGoal() {
  const field = document.getElementById("goal-hours");
  const error = document.getElementById("goal-error");
  if (field) field.value = (dailyGoalMs / (60 * 60 * 1000)).toFixed(1).replace(/\.0$/, "");
  if (error) {
    error.textContent = "";
    error.classList.add("hidden");
  }

  openModal("goal-modal", document.activeElement);
  window.setTimeout(() => field?.focus(), 50);
}

function saveGoal() {
  const field = document.getElementById("goal-hours");
  const error = document.getElementById("goal-error");
  if (!field) return;

  const value = Number(field.value);
  if (!Number.isFinite(value) || value < 0.5 || value > 24) {
    if (error) {
      error.textContent = "La meta debe estar entre 0.5h y 24h.";
      error.classList.remove("hidden");
    }
    return;
  }

  dailyGoalMs = value * 60 * 60 * 1000;
  safeSetItem(STORAGE.GOAL, String(value));

  if (error) {
    error.textContent = "";
    error.classList.add("hidden");
  }

  closeModal("goal-modal");
  updateGoalBar();
}

function initChart() {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = getComputedStyle(document.body).getPropertyValue("--fg-2").trim();

  const initial = getLast7Days();
  chartInstance = new Chart(document.getElementById("sessionsChart"), {
    type: "bar",
    data: {
      labels: initial.labels,
      datasets: [{
        data: initial.values.map((value) => value / 60000),
        backgroundColor: initial.values.map((_, index) => index === initial.values.length - 1 ? getComputedStyle(document.body).getPropertyValue("--fg").trim() : "#e3e3de"),
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 24,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: "easeOutCubic" },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: getComputedStyle(document.body).getPropertyValue("--fg").trim(),
          titleColor: getComputedStyle(document.body).getPropertyValue("--bg").trim(),
          bodyColor: getComputedStyle(document.body).getPropertyValue("--bg").trim(),
          borderWidth: 0,
          cornerRadius: 4,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const raw = items[0]?.label || "";
              const dayData = getLast7Days();
              const index = dayData.labels.indexOf(raw);
              const date = dayData.dates[index];
              return date ? new Date(date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : raw;
            },
            label: (context) => `Total: ${formatShort((context.parsed.y || 0) * 60000)}`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--fg-2").trim(),
            font: { family: getComputedStyle(document.body).fontFamily, size: 11 },
          },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          maxTicksLimit: 5,
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--fg-2").trim(),
            font: { family: getComputedStyle(document.body).fontFamily, size: 11 },
            callback: (value) => formatShort(value * 60000),
          },
        },
      },
    },
  });
}

function getLast7Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labels = [];
  const dates = [];
  const values = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const total = sessions.reduce((sum, session) => {
      const sessionDate = new Date(session.startTimeISO);
      return sessionDate >= start && sessionDate <= end ? sum + Number(session.durationMs || 0) : sum;
    }, 0);

    labels.push(date.toLocaleDateString("es-ES", { weekday: "short" }));
    dates.push(date.toISOString());
    values.push(total);
  }

  return { labels, dates, values };
}

function updateChart() {
  if (!chartInstance || typeof Chart === "undefined") return;

  const styles = getComputedStyle(document.body);
  const fg = styles.getPropertyValue("--fg").trim();
  const fg2 = styles.getPropertyValue("--fg-2").trim();
  const line = styles.getPropertyValue("--line").trim();
  const dayData = getLast7Days();
  const todayIndex = dayData.values.length - 1;

  chartInstance.data.labels = dayData.labels;
  chartInstance.data.datasets[0].data = dayData.values.map((value) => value / 60000);
  chartInstance.data.datasets[0].backgroundColor = dayData.values.map((_, index) => index === todayIndex ? fg : line);

  chartInstance.options.plugins.tooltip.backgroundColor = fg;
  chartInstance.options.plugins.tooltip.titleColor = styles.getPropertyValue("--bg").trim();
  chartInstance.options.plugins.tooltip.bodyColor = styles.getPropertyValue("--bg").trim();
  chartInstance.options.scales.x.ticks.color = fg2;
  chartInstance.options.scales.y.ticks.color = fg2;
  chartInstance.options.scales.x.ticks.font.family = styles.fontFamily;
  chartInstance.options.scales.y.ticks.font.family = styles.fontFamily;
  chartInstance.update();
}

function exportData() {
  const blob = new Blob([JSON.stringify({ subjects, sessions })], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tempomind-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function triggerImport() {
  document.getElementById("import-file")?.click();
}

function importData(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (eventInfo) => {
    try {
      const parsed = JSON.parse(String(eventInfo.target.result));
      if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
        showToast("El archivo no tiene el formato esperado", "error");
        return;
      }

      const importedSubjects = parsed.subjects
        .filter((item) => item && typeof item.id === "string" && item.id.trim() && typeof item.name === "string")
        .map((item) => ({ ...item, id: item.id, name: item.name, totalMs: Number(item.totalMs) || 0 }));
      const importedSubjectIds = new Set(importedSubjects.map((item) => item.id));
      const importedSessions = parsed.sessions
        .filter((session) => {
          if (!session || typeof session !== "object") return false;
          const startValid = typeof session.startTimeISO === "string" && !Number.isNaN(new Date(session.startTimeISO).getTime());
          const endValid = typeof session.endTimeISO === "string" && !Number.isNaN(new Date(session.endTimeISO).getTime());
          return typeof session.id === "string" &&
            typeof session.subjectId === "string" &&
            importedSubjectIds.has(session.subjectId) &&
            startValid &&
            endValid;
        })
        .map((session) => {
          const duration = Number(session.durationMs);
          const mood = ["1", "2", "3", "4", "5"].includes(String(session.mood || "")) ? String(session.mood) : "";
          return {
            ...session,
            id: session.id,
            subjectId: session.subjectId,
            durationMs: Number.isFinite(duration) && duration >= 0 ? duration : 0,
            notes: typeof session.notes === "string" ? session.notes : "",
            mood,
            tags: Array.isArray(session.tags)
              ? session.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
              : [],
          };
        });

      pendingImport = { subjects: importedSubjects, sessions: importedSessions };
      const summary = document.getElementById("import-confirm-summary");
      if (summary) summary.textContent = `Se reemplazarán ${importedSubjects.length} materias y ${importedSessions.length} sesiones.`;
      updateSnapshotButtons();
      openModal("import-confirm-modal", document.activeElement);
    } catch (error) {
      showToast("No se pudo importar el archivo JSON", "error");
    } finally {
      input.value = "";
    }
  };
  reader.onerror = () => {
    input.value = "";
    showToast("No se pudo importar el archivo JSON", "error");
  };
  reader.readAsText(file);
}

function confirmImport() {
  if (!pendingImport) return;
  const snapshotSaved = saveSnapshot();
  clearTimeout(lastResetTimeout);
  lastResetTimeout = null;
  lastResetSnapshot = null;
  subjects = pendingImport.subjects;
  sessions = pendingImport.sessions;
  resetAllTimerState();
  currentSubjectId = null;
  const dataSaved = saveData();
  renderApp();
  closeModal("import-confirm-modal");
  pendingImport = null;
  if (dataSaved && snapshotSaved) showToast("Datos importados correctamente", "success");
  else if (dataSaved) showToast("Datos importados, pero no se pudo crear el backup.", "error");
}

function confirmResetData() {
  const summary = document.getElementById("confirm-reset-summary");
  if (summary) summary.textContent = `Se eliminarán ${subjects.length} materias y ${sessions.length} sesiones.`;
  updateSnapshotButtons();
  openModal("confirm-modal", document.activeElement);
}

function performResetData() {
  const snapshotSaved = saveSnapshot();
  clearTimeout(lastResetTimeout);
  lastResetSnapshot = { subjects: subjects.map((item) => ({ ...item })), sessions: sessions.map((item) => ({ ...item, tags: Array.isArray(item.tags) ? item.tags.slice() : [] })) };
  lastResetTimeout = window.setTimeout(() => {
    lastResetSnapshot = null;
    lastResetTimeout = null;
    if (toastAction && toastAction.onClick === undoReset) {
      const toast = document.getElementById("toast");
      toast?.querySelector("button")?.remove();
      toastAction = null;
    }
  }, 5000);
  resetAllTimerState();
  currentSubjectId = null;
  subjects = [];
  sessions = [];
  const dataSaved = saveData();
  closeModal("confirm-modal");
  renderApp();
  const message = dataSaved && snapshotSaved
    ? "Datos borrados."
    : "No se pudo guardar todo. ";
  showToast(message, dataSaved && snapshotSaved ? "success" : "error", 6000, {
    label: "Pulsa aquí para deshacer",
    onClick: undoReset,
  });
}

function undoReset() {
  if (!lastResetSnapshot) return;
  clearTimeout(lastResetTimeout);
  lastResetTimeout = null;
  subjects = lastResetSnapshot.subjects;
  sessions = lastResetSnapshot.sessions;
  lastResetSnapshot = null;
  saveData();
  renderApp();
}

function saveSnapshot() {
  return safeSetItem(SNAPSHOT_KEY, JSON.stringify({
    subjects,
    sessions,
    createdAt: new Date().toISOString(),
  }));
}

function restoreSnapshot() {
  let snapshot;
  try {
    snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
  } catch (error) {
    snapshot = null;
  }
  if (!snapshot || !Array.isArray(snapshot.subjects) || !Array.isArray(snapshot.sessions)) {
    updateSnapshotButtons();
    showToast("No hay backup disponible", "error");
    return;
  }
  clearTimeout(lastResetTimeout);
  lastResetTimeout = null;
  lastResetSnapshot = null;
  subjects = snapshot.subjects;
  sessions = snapshot.sessions;
  resetAllTimerState();
  currentSubjectId = null;
  const dataSaved = saveData();
  renderApp();
  const activeModal = document.querySelector(".modal-overlay:not(.hidden)");
  if (activeModal) closeModal(activeModal.id);
  pendingImport = null;
  if (dataSaved) showToast("Backup restaurado", "success");
}

function updateSnapshotButtons() {
  let available = false;
  try {
    const snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
    available = Boolean(snapshot && Array.isArray(snapshot.subjects) && Array.isArray(snapshot.sessions));
  } catch (error) {
    available = false;
  }
  document.querySelectorAll("[data-restore-snapshot]").forEach((button) => {
    button.disabled = !available;
    button.title = available ? "" : "No hay backup disponible";
  });
}

function showToast(message, type = "success", duration = 2500, action) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimeout);
  clearTimeout(toastActionTimeout);
  toast.replaceChildren(document.createTextNode(message));
  toastAction = action || null;
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-ghost btn-small";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      toast.classList.remove("is-visible");
      if (toastAction && typeof toastAction.onClick === "function") toastAction.onClick();
    });
    toast.appendChild(document.createTextNode(" "));
    toast.appendChild(button);
  }
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  toast.classList.remove("toast--error", "toast--success");
  toast.classList.add(type === "error" ? "toast--error" : "toast--success");
  toast.classList.remove("is-visible");
  toast.classList.add("is-visible");
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), duration);
  if (action) toastActionTimeout = toastTimeout;
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  safeSetItem(STORAGE.THEME, isDark ? "dark" : "light");
  updateThemeColor();
  if (currentView === "stats") updateChart();
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE.THEME);
  const dark = saved ? saved === "dark" : Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", Boolean(dark));
  updateThemeColor();
}

function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute("content", document.body.classList.contains("dark") ? "#1a1614" : "#d7d7d0");
}

function formatMs(ms) {
  const safeMs = Number(ms) || 0;
  const seconds = Math.floor(safeMs / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatMsParts(ms) {
  const safeMs = Number(ms) || 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  return [
    String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
    String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0"),
    String(totalSeconds % 60).padStart(2, "0"),
  ];
}

function formatShort(ms) {
  const totalMinutes = Math.round(Number(ms || 0) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return totalMinutes ? `${minutes || totalMinutes}m` : "0m";
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/"/g, "&amp;quot;").replace(/'/g, "&amp;#39;");
}

function handleKeyboard(event) {
  const interactiveTarget = event.target && typeof event.target.closest === "function" &&
    event.target.closest("button, a, input, textarea, select, [contenteditable]");
  const modalOpen = document.querySelector(".modal-overlay:not(.hidden)");

  if (modalOpen && event.key === "Tab") {
    const focusable = Array.from(modalOpen.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.disabled && element.offsetParent !== null);
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIndex = focusable.indexOf(document.activeElement);
      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  if (event.code === "Space" && currentView === "detail" && !modalOpen) {
    if (event.repeat) return;
    if (event.target !== document.body) return;
    event.preventDefault();
    isRunning ? togglePause() : startTimer();
  }

  if (event.key === "Escape" && modalOpen && modalOpen.id !== "notes-modal") {
    if (modalOpen.id === "import-confirm-modal") pendingImport = null;
    closeModal(modalOpen.id);
  }

  if (event.key === "Enter") {
    const subjectInput = document.getElementById("subject-name");
    const goalInput = document.getElementById("goal-hours");

    if (document.activeElement === subjectInput) {
      event.preventDefault();
      createSubject();
    }

    if (document.activeElement === goalInput) {
      event.preventDefault();
      saveGoal();
    }
  }
}

function persistActiveSession() {
  if (isRunning || isPaused) {
    return safeSetItem(
      STORAGE.ACTIVE,
      JSON.stringify({
        subjectId: activeTimerSubjectId || currentSubjectId,
        elapsedTime,
        isPaused,
        mode: timerMode,
        phase: pomodoroState.phase,
        roundIndex: pomodoroState.roundIndex,
        phaseDurationMs: pomodoroState.phaseDurationMs,
        startTime: startTime || Date.now(),
        pomodoroConfig: { ...pomodoroConfig },
      }),
    );
  }

  localStorage.removeItem(STORAGE.ACTIVE);
  return true;
}

function restoreActiveSession() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE.ACTIVE) || "null");
    if (!data || !data.subjectId || !subjects.some((subjectItem) => subjectItem.id === data.subjectId)) {
      localStorage.removeItem(STORAGE.ACTIVE);
      return;
    }

    activeTimerSubjectId = data.subjectId;
    currentSubjectId = data.subjectId;
    currentView = "detail";
    timerMode = data.mode === "pomodoro" ? "pomodoro" : "stopwatch";
    elapsedTime = Number(data.elapsedTime) || 0;
    isPaused = Boolean(data.isPaused);

    if (timerMode === "pomodoro") {
      pomodoroState.phase = data.phase || "study";
      pomodoroState.roundIndex = Number(data.roundIndex) || 1;
      pomodoroState.phaseDurationMs = Number(data.phaseDurationMs) || pomodoroConfig.studyMin * 60000;
      if (data.pomodoroConfig) Object.assign(pomodoroConfig, data.pomodoroConfig);
    }

    if (timerMode === "stopwatch") {
      isRunning = true;
      if (!isPaused) {
        startTime = Date.now() - elapsedTime;
        clearInterval(timerInterval);
        timerInterval = setInterval(tick, 250);
      }
      return;
    }

    if (!isPaused) {
      const savedStartTime = Number(data.startTime) || Date.now();
      const nextElapsed = Math.max(0, Date.now() - savedStartTime);
      if (nextElapsed >= pomodoroState.phaseDurationMs) {
        showToast("Sesión de pomodoro finalizada mientras no estabas");
        localStorage.removeItem(STORAGE.ACTIVE);
        timerMode = "pomodoro";
        elapsedTime = 0;
        startTime = null;
        isRunning = false;
        isPaused = false;
        pomodoroState.phase = "study";
        pomodoroState.roundIndex = 1;
        pomodoroState.phaseDurationMs = pomodoroConfig.studyMin * 60000;
        return;
      }
      elapsedTime = nextElapsed;
      startTime = Date.now() - elapsedTime;
      isRunning = true;
      clearInterval(timerInterval);
      timerInterval = setInterval(tick, 250);
      return;
    }

    isRunning = true;
    startTime = Date.now() - elapsedTime;
  } catch (error) {
    localStorage.removeItem(STORAGE.ACTIVE);
  }
}