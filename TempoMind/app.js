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

const STORAGE = {
  SUBJECTS: "tempomind_subjects_v2",
  SESSIONS: "tempomind_sessions_v2",
  ACTIVE: "tempomind_active_session_v2",
  GOAL: "tempomind_daily_goal_v2",
  THEME: "tempomind_theme_v2",
};

const COLORS = ["#ffffff"];
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
  restoreActiveSession();
  bindEvents();
  initChart();
  renderApp();
}

function bindEvents() {
  document.getElementById("theme-toggle-btn")?.addEventListener("click", toggleTheme);
  document.getElementById("import-file")?.addEventListener("change", importData);

  document.getElementById("subject-name")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createSubject();
    }
  });

  document.querySelectorAll(".mood-dot").forEach((dot) => {
    dot.addEventListener("click", () => chooseMood(dot.dataset.mood));
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.view));
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
  document.querySelectorAll("[data-close-goal-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal("goal-modal"));
  });
  document.querySelectorAll("[data-save-goal]").forEach((button) => {
    button.addEventListener("click", saveGoal);
  });

  ["pointermove", "touchstart", "click", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, revealFocusMode, { passive: true });
  });

  document.addEventListener("keydown", handleKeyboard);
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
}

function switchTab(view) {
  if (!view || !["subjects", "stats"].includes(view)) return;
  currentView = view;
  renderApp();
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
    } else {
      banner.classList.add("hidden");
    }
  }

  subjects.forEach((subjectItem, index) => {
    const progress = max ? Math.max((subjectItem.totalMs / max) * 100, 4) : 0;
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
        <span class="subject-progress" aria-hidden="true"><span style="width:${progress}%"></span></span>
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
  currentSubjectId = id;
  currentView = "detail";
  renderApp();
}

function goToSubjects() {
  currentView = "subjects";
  renderApp();
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
    id: Date.now().toString(),
    name,
    color: document.getElementById("subject-color")?.value || COLORS[0],
    createdAt: new Date().toISOString(),
    totalMs: 0,
  });

  saveData();
  closeModal("subject-modal");
  renderApp();
}

function renderDetail() {
  const selectedSubject = subject();
  if (!selectedSubject) return goToSubjects();

  const detailName = document.getElementById("detail-view-name");
  const detailTotal = document.getElementById("detail-view-total");
  if (detailName) detailName.textContent = selectedSubject.name;
  if (detailTotal) detailTotal.textContent = formatShort(selectedSubject.totalMs);

  renderTimer();
  renderSessions();
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

  if (!timerDisplay) return;

  const digits = timerDisplay.querySelectorAll(".t-d");
  const values = formatMsParts(elapsedTime);
  digits.forEach((node, index) => {
    node.textContent = values[index];
  });

  timerDisplay.classList.toggle("is-running", isRunning && !isPaused);
  timerDisplay.classList.toggle("is-paused", isPaused);
  updateFocusMode();
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
  const digits = document.querySelectorAll("#timer-display .t-d");
  const values = formatMsParts(elapsedTime);
  digits.forEach((node, index) => {
    node.textContent = values[index];
  });

  updateTimerProgress();
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

  if (!isPaused && startTime !== null) {
    elapsedTime = Date.now() - startTime;
  }

  isRunning = false;
  isPaused = false;
  updateFocusMode();

  const sessionSubjectId = activeTimerSubjectId || currentSubjectId;
  const sessionSubject = subjects.find((s) => s.id === sessionSubjectId) || subject();
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

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsedTime = 0;
  startTime = null;
  isRunning = false;
  isPaused = false;
  activeTimerSubjectId = null;
  localStorage.removeItem(STORAGE.ACTIVE);

  document.querySelectorAll("#timer-display .t-d").forEach((node) => {
    node.textContent = "00";
  });

  updateTimerProgress();
  renderTimer();
  updateGoalBar();
  updateFocusMode();
}

function saveSession() {
  const now = new Date();
  const tagsInput = document.getElementById("modal-tags");
  const notesInput = document.getElementById("modal-notes");
  const moodSelect = document.getElementById("modal-mood");
  const sessionSubjectId = activeTimerSubjectId || currentSubjectId;

  if (!sessionSubjectId || !tagsInput || !notesInput || !moodSelect) {
    resetTimer();
    return;
  }

  sessions.push({
    id: Date.now().toString(),
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
  });

  saveData();
  resetSessionForm();
  resetTimer();
  closeModal("notes-modal");
  renderApp();
}

function discardSession() {
  resetSessionForm();
  resetTimer();
  closeModal("notes-modal");
}

function resetSessionForm() {
  const notes = document.getElementById("modal-notes");
  const tags = document.getElementById("modal-tags");
  const moodSelect = document.getElementById("modal-mood");
  const moodDots = document.querySelectorAll(".mood-dot");
  const currentMood = document.getElementById("mood-current-label");

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
  subjects.forEach((subjectItem) => {
    subjectItem.totalMs = sessions
      .filter((session) => session.subjectId === subjectItem.id)
      .reduce((total, session) => total + Number(session.durationMs || 0), 0);
  });
}

function saveData() {
  syncTotals();
  localStorage.setItem(STORAGE.SUBJECTS, JSON.stringify(subjects));
  localStorage.setItem(STORAGE.SESSIONS, JSON.stringify(sessions));
}

function renderSessions() {
  const box = document.getElementById("sessions-list");
  const count = document.getElementById("sessions-count");
  if (!box) return;

  const list = sessions.filter((session) => session.subjectId === currentSubjectId);
  if (count) count.textContent = String(list.length);

  if (!list.length) {
    box.innerHTML = '<div class="empty-state"><p>Aún no hay sesiones registradas.</p></div>';
    return;
  }

  box.innerHTML = list
    .map((session, index) => {
      const tags = Array.isArray(session.tags) && session.tags.length ? session.tags.join(", ") : "Sin etiqueta";
      return `
        <button type="button" class="session-item" data-id="${session.id}" style="--i:${index}">
          <span class="session-date">${formatDate(session.startTimeISO)}</span>
          <span class="session-duration">${formatMs(session.durationMs)}</span>
          <span class="session-tags" title="${escapeHTML(tags)}">${escapeHTML(tags)}</span>
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

function closeDetailModal() {
  closeModal("detail-modal");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.add("is-closing");
  window.setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("is-closing");
    const restoreTarget = modal._returnFocus;
    if (restoreTarget && typeof restoreTarget.focus === "function") {
      restoreTarget.focus();
    }
  }, 200);
}

function openModal(id, trigger) {
  const modal = document.getElementById(id);
  if (!modal) return;

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
}

function today() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  return sessions
    .filter((session) => new Date(session.startTimeISO) >= dayStart)
    .reduce((total, session) => total + Number(session.durationMs || 0), 0);
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

function revealFocusMode(event) {
  if (!document.body.classList.contains("focus-mode")) return;
  if (event && event.type === "keydown" && event.key === "Tab") return;
  document.body.classList.add("focus-awake");
  clearTimeout(focusTimeout);
  focusTimeout = setTimeout(() => document.body.classList.remove("focus-awake"), 3000);
}

function loadGoal() {
  const value = Number(localStorage.getItem(STORAGE.GOAL));
  if (Number.isFinite(value) && value > 0) dailyGoalMs = value * 60 * 60 * 1000;
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
  if (!Number.isFinite(value) || value < 0.5) {
    if (error) {
      error.textContent = "La meta debe ser de al menos 0.5h.";
      error.classList.remove("hidden");
    }
    return;
  }

  dailyGoalMs = value * 60 * 60 * 1000;
  localStorage.setItem(STORAGE.GOAL, String(value));

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
        backgroundColor: initial.values.map((_, index) => index === initial.values.length - 1 ? getComputedStyle(document.body).getPropertyValue("--fg").trim() : hexToRgba(getComputedStyle(document.body).getPropertyValue("--fg").trim(), 0.32)),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 28,
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
          cornerRadius: 12,
          padding: 10,
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
            font: { family: getComputedStyle(document.body).fontFamily, size: 12 },
          },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          maxTicksLimit: 5,
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue("--fg-2").trim(),
            font: { family: getComputedStyle(document.body).fontFamily, size: 12 },
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
  const dayData = getLast7Days();
  const todayIndex = dayData.values.length - 1;

  chartInstance.data.labels = dayData.labels;
  chartInstance.data.datasets[0].data = dayData.values.map((value) => value / 60000);
  chartInstance.data.datasets[0].backgroundColor = dayData.values.map((_, index) => index === todayIndex ? fg : hexToRgba(fg, 0.32));

  chartInstance.options.plugins.tooltip.backgroundColor = fg;
  chartInstance.options.plugins.tooltip.titleColor = styles.getPropertyValue("--bg").trim();
  chartInstance.options.plugins.tooltip.bodyColor = styles.getPropertyValue("--bg").trim();
  chartInstance.options.scales.x.ticks.color = fg2;
  chartInstance.options.scales.y.ticks.color = fg2;
  chartInstance.options.scales.x.ticks.font.family = styles.fontFamily;
  chartInstance.options.scales.y.ticks.font.family = styles.fontFamily;
  chartInstance.update();
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const safe = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  const parsed = Number.parseInt(safe, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function exportData() {
  const blob = new Blob([JSON.stringify({ subjects, sessions })], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tempomind-data.json";
  link.click();
}

function triggerImport() {
  document.getElementById("import-file")?.click();
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (eventInfo) => {
    try {
      const parsed = JSON.parse(String(eventInfo.target.result));
      if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions)) {
        showToast("El archivo no tiene el formato esperado", "error");
        return;
      }

      subjects = parsed.subjects.map((subjectItem) => ({
        ...subjectItem,
        id: String(subjectItem.id),
        name: String(subjectItem.name || "Materia"),
        color: subjectItem.color || COLORS[0],
        totalMs: Number(subjectItem.totalMs) || 0,
      }));

      sessions = parsed.sessions.map((session) => ({
        ...session,
        id: String(session.id),
        subjectId: String(session.subjectId),
        durationMs: Number(session.durationMs) || 0,
        notes: session.notes || "",
        mood: session.mood || "",
        tags: Array.isArray(session.tags) ? session.tags.map((tag) => String(tag)) : [],
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

  reader.readAsText(file);
}

function confirmResetData() {
  openModal("confirm-modal", document.activeElement);
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

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.remove("is-visible");
  toast.classList.add("is-visible");
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  localStorage.setItem(STORAGE.THEME, isLight ? "light" : "dark");
  updateThemeColor();
  if (currentView === "stats") updateChart();
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE.THEME);
  const light = saved ? saved === "light" : window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  document.body.classList.toggle("light", Boolean(light));
  updateThemeColor();
}

function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute("content", document.body.classList.contains("light") ? "#ffffff" : "#000000");
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

function handleKeyboard(event) {
  const interactiveTarget = event.target && event.target.closest("button, a, input, textarea, select, [contenteditable]");
  const modalOpen = document.querySelector(".modal-overlay:not(.hidden)");

  if (event.code === "Space" && currentView === "detail" && !modalOpen && !interactiveTarget) {
    event.preventDefault();
    isRunning ? togglePause() : startTimer();
  }

  if (event.key === "Escape" && modalOpen && modalOpen.id !== "notes-modal") {
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
    if (!data || !data.subjectId || !subjects.some((subjectItem) => subjectItem.id === data.subjectId)) {
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
