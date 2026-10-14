// --- App State ---
const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  habits: [],
  plannerItems: [],
  todos: [],
  expenses: [],
  daySummary: null,
  heatmap: [],
  summary: {},
  leaderboard: [],
  selectedFilter: 'all',
  timelineFilter: 'all', // all | morning | afternoon | evening
  selectedDate: getTodayDateString(),
  currentTab: 'habits',
  calCurrentMonth: new Date(),
  pomodoro: {
    mode: 'focus', // focus | shortBreak | longBreak
    durations: { focus: 25, shortBreak: 5, longBreak: 15 },
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    targetEndTime: null,
    timerInterval: null,
    linkedHabitId: null,
    stats: {
      sessionsToday: 0,
      totalMinutes: 0
    }
  }
};

// --- Web Audio Chime Sound Engine ---
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.3); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (_) {}
}

// --- Date Helpers ---
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dateStr) {
  const today = getTodayDateString();
  const yesterday = shiftDateString(today, -1);
  const tomorrow = shiftDateString(today, 1);

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = monthNames[dt.getMonth()];
  const dayStr = dt.getDate();

  if (dateStr === today) return `Today, ${monthStr} ${dayStr}`;
  if (dateStr === yesterday) return `Yesterday, ${monthStr} ${dayStr}`;
  if (dateStr === tomorrow) return `Tomorrow, ${monthStr} ${dayStr}`;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[dt.getDay()]}, ${monthStr} ${dayStr}`;
}

// --- API Client ---
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`/api${path}`, { ...options, headers });
    if (res.status === 401 && !path.startsWith('/auth/')) {
      state.token = '';
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      await ensureAuth();
      return { success: false, message: 'Session refreshed' };
    }
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: err.message };
  }
}

// --- Auth Bootstrap ---
async function ensureAuth() {
  if (state.token) {
    const verifyRes = await api('/auth/me');
    if (verifyRes.success && verifyRes.user) {
      state.user = verifyRes.user;
      localStorage.setItem('user', JSON.stringify(state.user));
      updateUserUI();
      return;
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.token = '';
      state.user = null;
    }
  }

  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  const registerRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `coder_${randomSuffix}`,
      email: `coder_${randomSuffix}@habit.local`,
      password: 'password123',
      displayName: `Coder #${randomSuffix}`
    })
  });

  if (registerRes.success && registerRes.token) {
    state.token = registerRes.token;
    state.user = registerRes.user;
    localStorage.setItem('token', state.token);
    localStorage.setItem('user', JSON.stringify(state.user));
    updateUserUI();

    // Populate starter habits
    await api('/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Drink 8 Glasses of Water',
        type: 'measurable',
        targetValue: 8,
        unit: 'glasses',
        color: '#58a6ff'
      })
    });
    await api('/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Deep Work Coding',
        type: 'pomodoro',
        targetValue: 4,
        unit: 'sessions',
        color: '#f85149'
      })
    });
    await api('/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Daily Code Commit',
        type: 'boolean',
        targetValue: 1,
        color: '#39d353'
      })
    });

    // Populate starter planner item
    await api('/planner', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Architecture & Daily Sprint Standup',
        startTime: '09:30',
        endTime: '10:30',
        type: 'meeting',
        linkOrLocation: 'Google Meet',
        dateString: state.selectedDate
      })
    });

    // Populate starter focus block
    await api('/planner', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Deep Coding & API Performance Optimization',
        startTime: '14:00',
        endTime: '15:30',
        type: 'focus_block',
        linkOrLocation: 'Focus Room',
        dateString: state.selectedDate
      })
    });

    // Populate starter To-Do
    await api('/todos', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Review pull request & test API endpoints',
        priority: 'high',
        dateString: state.selectedDate
      })
    });
  }
}

function updateUserUI() {
  const badgeText = document.getElementById('userBadgeText');
  if (state.user && badgeText) {
    badgeText.textContent = `@${state.user.username || 'user'}`;
  }
}

// ========================================================
// TAB 1: HABITS & 365-DAY HEATMAP
// ========================================================
async function loadHabitsData() {
  const [heatmapRes, habitsRes] = await Promise.all([
    api('/heatmap'),
    api('/habits')
  ]);

  if (heatmapRes.success) {
    state.heatmap = heatmapRes.heatmap || [];
    state.summary = heatmapRes.summary || state.summary;
    renderHabitsStats();
    renderHeatmap();
  }

  if (habitsRes.success) {
    state.habits = habitsRes.habits || [];
    renderHabitsList();
    populateHabitDropdown();
  }
}

function renderHabitsStats() {
  const curEl = document.getElementById('statCurrentStreak');
  if (curEl) curEl.textContent = `${state.summary.currentStreak || 0}d`;

  const bestEl = document.getElementById('statBestStreak');
  if (bestEl) bestEl.textContent = `${state.summary.bestStreak || 0}d`;

  const totalEl = document.getElementById('statTotalLogs');
  if (totalEl) totalEl.textContent = state.summary.totalContributions || 0;

  const activeEl = document.getElementById('statActiveDays');
  if (activeEl) activeEl.textContent = state.summary.activeDays || 0;

  const labelEl = document.getElementById('heatmapContributionsLabel');
  if (labelEl) labelEl.textContent = `${state.summary.totalContributions || 0} contributions in the last year`;
}

function renderHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  if (!grid || !state.heatmap.length) return;
  grid.innerHTML = '';

  state.heatmap.forEach(day => {
    const cell = document.createElement('div');
    cell.className = `heatmap-cell lvl-${day.level}`;
    cell.title = `${day.date}: ${day.count} of ${day.totalHabits} completed (${day.percentage}%)`;
    cell.addEventListener('click', () => {
      state.selectedDate = day.date;
      switchTab('planner');
      loadPlannerData(day.date);
    });
    grid.appendChild(cell);
  });

  const container = document.getElementById('heatmapScrollContainer');
  if (container) {
    setTimeout(() => { container.scrollLeft = container.scrollWidth; }, 100);
  }
}

function renderHabitsList() {
  const list = document.getElementById('habitsList');
  if (!list) return;

  const filtered = state.habits.filter(h => {
    if (state.selectedFilter === 'all') return true;
    return h.type === state.selectedFilter;
  });

  const countBadge = document.getElementById('habitsCountLabel');
  if (countBadge) countBadge.textContent = `${filtered.length} habits`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state-box">
        No habits match this filter. Tap + New Habit to get started.
      </div>`;
    return;
  }

  list.innerHTML = '';
  filtered.forEach(habit => {
    const isCompleted = habit.todayLog?.isCompleted || false;
    const value = habit.todayLog?.value || 0;

    const card = document.createElement('div');
    card.className = `habit-card ${isCompleted ? 'completed' : ''}`;

    let actionHTML = '';
    if (habit.type === 'boolean') {
      actionHTML = `
        <button class="btn-toggle-done ${isCompleted ? 'done' : ''}" onclick="toggleHabit('${habit._id}')">
          <span>${isCompleted ? '✓ Completed Today' : '○ Mark as Done'}</span>
        </button>`;
    } else if (habit.type === 'measurable') {
      const progress = Math.min(100, Math.round((value / habit.targetValue) * 100));
      actionHTML = `
        <div class="measurable-controls">
          <span class="counter-value">${value} / ${habit.targetValue} ${habit.unit || ''}</span>
          <div class="counter-btns">
            <button class="btn-icon" onclick="incrementHabit('${habit._id}', -1)">-</button>
            <button class="btn-icon" style="color: var(--accent-blue); border-color: var(--accent-blue);" onclick="incrementHabit('${habit._id}', 1)">+</button>
          </div>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${isCompleted ? 'done' : ''}" style="width: ${progress}%;"></div>
        </div>`;
    } else if (habit.type === 'pomodoro') {
      const progress = Math.min(100, Math.round((value / habit.targetValue) * 100));
      actionHTML = `
        <div class="measurable-controls">
          <span class="counter-value" style="color: var(--accent-red);">${value} / ${habit.targetValue} sessions</span>
          <button class="btn-toggle-done" style="width: auto; padding: 6px 14px; font-size: 0.78rem; background: var(--accent-red); color: white; border: none;" onclick="startFocusForHabit('${habit._id}')">
            ▶ Start Focus
          </button>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill done" style="width: ${progress}%; background-color: var(--accent-red);"></div>
        </div>`;
    }

    card.innerHTML = `
      <div class="habit-header">
        <div class="habit-meta">
          <span class="badge badge-${habit.type}">${habit.type.toUpperCase()}</span>
          <span class="streak-badge">🔥 ${habit.currentStreak || 0}d</span>
        </div>
        <button onclick="deleteHabit('${habit._id}')" class="btn-icon" style="color: var(--accent-red); width: 28px; height: 28px; font-size: 0.8rem;" title="Delete">✕</button>
      </div>
      <div class="habit-title">${habit.title}</div>
      ${habit.description ? `<div class="habit-desc">${habit.description}</div>` : ''}
      ${actionHTML}
    `;

    list.appendChild(card);
  });
}

// ========================================================
// TAB 2: POMODORO FOCUS TIMER
// ========================================================
function setPomodoroMode(mode) {
  if (state.pomodoro.timerInterval) clearInterval(state.pomodoro.timerInterval);
  state.pomodoro.mode = mode;
  state.pomodoro.isRunning = false;
  state.pomodoro.totalSeconds = state.pomodoro.durations[mode] * 60;
  state.pomodoro.remainingSeconds = state.pomodoro.totalSeconds;
  state.pomodoro.targetEndTime = null;

  document.querySelectorAll('.mode-pill').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
  const modeLabel = mode === 'focus' ? 'FOCUS SESSION' : (mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK');
  document.getElementById('timerModeLabel').textContent = modeLabel;
  document.getElementById('btnTimerPlayPause').textContent = '▶';
  document.getElementById('timerStatusLabel').textContent = 'Ready to start';

  const orb = document.getElementById('timerOrb');
  if (orb) orb.classList.remove('running');

  updateClockDisplay();
}

function toggleTimer() {
  if (state.pomodoro.isRunning) {
    state.pomodoro.isRunning = false;
    clearInterval(state.pomodoro.timerInterval);
    state.pomodoro.timerInterval = null;
    state.pomodoro.targetEndTime = null;

    document.getElementById('btnTimerPlayPause').textContent = '▶';
    document.getElementById('timerStatusLabel').textContent = 'Paused';

    const orb = document.getElementById('timerOrb');
    if (orb) orb.classList.remove('running');
  } else {
    state.pomodoro.isRunning = true;
    state.pomodoro.targetEndTime = Date.now() + state.pomodoro.remainingSeconds * 1000;

    document.getElementById('btnTimerPlayPause').textContent = '⏸';
    document.getElementById('timerStatusLabel').textContent = 'Stay in the zone';

    const orb = document.getElementById('timerOrb');
    if (orb) orb.classList.add('running');

    clearInterval(state.pomodoro.timerInterval);
    state.pomodoro.timerInterval = setInterval(syncTimerClock, 1000);
  }
}

function resetTimer() {
  setPomodoroMode(state.pomodoro.mode);
}

function syncTimerClock() {
  if (!state.pomodoro.targetEndTime) return;
  const diffSec = Math.round((state.pomodoro.targetEndTime - Date.now()) / 1000);
  if (diffSec <= 0) {
    state.pomodoro.remainingSeconds = 0;
    completePomodoro();
  } else {
    state.pomodoro.remainingSeconds = diffSec;
    updateClockDisplay();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.pomodoro.isRunning) {
    syncTimerClock();
  }
});

function updateClockDisplay() {
  const m = Math.floor(state.pomodoro.remainingSeconds / 60).toString().padStart(2, '0');
  const s = (state.pomodoro.remainingSeconds % 60).toString().padStart(2, '0');
  const clockText = `${m}:${s}`;

  const mainClock = document.getElementById('timerClock');
  if (mainClock) mainClock.textContent = clockText;

  const circle = document.getElementById('timerProgressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 105;
    const progress = 1 - (state.pomodoro.remainingSeconds / state.pomodoro.totalSeconds);
    circle.style.strokeDashoffset = circumference * (1 - progress);
  }
}

async function completePomodoro() {
  clearInterval(state.pomodoro.timerInterval);
  state.pomodoro.isRunning = false;
  document.getElementById('btnTimerPlayPause').textContent = '▶';
  document.getElementById('timerStatusLabel').textContent = 'Session complete!';

  const orb = document.getElementById('timerOrb');
  if (orb) orb.classList.remove('running');

  updateClockDisplay();
  playChime();
  triggerConfetti();

  const mode = state.pomodoro.mode;
  const habitId = state.pomodoro.linkedHabitId || document.getElementById('pomodoroHabitSelect').value;

  if (mode === 'focus') {
    await api('/pomodoro/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sessionType: 'focus',
        durationMinutes: state.pomodoro.durations.focus,
        status: 'completed',
        habitId: habitId || null
      })
    });
    state.pomodoro.stats.sessionsToday++;
    state.pomodoro.stats.totalMinutes += state.pomodoro.durations.focus;

    document.getElementById('statPomodoroToday').textContent = state.pomodoro.stats.sessionsToday;
    document.getElementById('statPomodoroMinutes').textContent = `${state.pomodoro.stats.totalMinutes} mins`;

    alert('🎉 Focus session completed! Progress recorded in your contribution heatmap.');
    loadHabitsData();
  }
}

function startFocusForHabit(habitId) {
  state.pomodoro.linkedHabitId = habitId;
  const select = document.getElementById('pomodoroHabitSelect');
  if (select) select.value = habitId;
  switchTab('pomodoro');
}

function populateHabitDropdown() {
  const select = document.getElementById('pomodoroHabitSelect');
  if (!select) return;
  const curVal = select.value || state.pomodoro.linkedHabitId;

  select.innerHTML = '<option value="">Link a habit to this session (optional)...</option>';
  state.habits.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h._id;
    opt.textContent = `${h.title} (${h.type})`;
    select.appendChild(opt);
  });
  if (curVal) select.value = curVal;
}

// ========================================================
// TAB 3: INTERACTIVE DAILY TIMELINE & SMART SCHEDULER
// ========================================================
async function loadPlannerData(date = state.selectedDate) {
  state.selectedDate = date;

  const labelEl = document.getElementById('plannerDateLabel');
  if (labelEl) labelEl.textContent = formatDayLabel(date);

  const [plannerRes, todosRes, dayRes] = await Promise.all([
    api(`/planner?date=${date}`),
    api(`/todos?date=${date}`),
    api(`/calendar/day?date=${date}`)
  ]);

  if (plannerRes.success) state.plannerItems = plannerRes.items || [];
  if (todosRes.success) state.todos = todosRes.todos || [];

  const score = dayRes.productivityScore || 0;
  const scorePill = document.getElementById('plannerScorePill');
  if (scorePill) scorePill.textContent = `🎯 ${score}% Productivity`;

  renderInteractiveTimeline();
  renderPlannerTodos();
}

function formatHourDisplay(h) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:00 ${ampm}`;
}

function renderInteractiveTimeline() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  container.innerHTML = '';

  // Determine hours to display based on timelineFilter
  let startHour = 6;
  let endHour = 23;
  if (state.timelineFilter === 'morning') { startHour = 6; endHour = 12; }
  else if (state.timelineFilter === 'afternoon') { startHour = 12; endHour = 17; }
  else if (state.timelineFilter === 'evening') { startHour = 17; endHour = 23; }

  // Check if viewing today for live current time indicator
  const isToday = state.selectedDate === getTodayDateString();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (let h = startHour; h <= endHour; h++) {
    const hourStr = String(h).padStart(2, '0');
    const row = document.createElement('div');
    row.className = 'timeline-hour-row';

    // Find items starting in this hour (e.g. "09:30" matches hour 9)
    const itemsInHour = state.plannerItems.filter(item => {
      if (!item.startTime) return false;
      const itemH = parseInt(item.startTime.split(':')[0], 10);
      return itemH === h;
    });

    let cardsHtml = '';
    if (itemsInHour.length > 0) {
      itemsInHour.forEach(item => {
        const catLabels = {
          meeting: '🟣 Meeting',
          focus_block: '🟢 Deep Work',
          study: '🔵 Task',
          workout: '🟠 Workout',
          routine: '🌸 Routine',
          personal: '⭐ Personal'
        };

        cardsHtml += `
          <div class="timeline-card type-${item.type} ${item.isCompleted ? 'completed' : ''}">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="timeline-card-time">${item.startTime} - ${item.endTime}</span>
                <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase;">${catLabels[item.type] || item.type}</span>
              </div>
              <div class="timeline-card-title">${item.title}</div>
              ${item.linkOrLocation ? `<div style="font-size: 0.75rem; color: var(--accent-blue); margin-top: 3px;">📍 ${item.linkOrLocation}</div>` : ''}
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-left: 10px;">
              <button onclick="togglePlanner('${item._id}')" class="btn-icon" style="color: ${item.isCompleted ? 'var(--accent-neon)' : 'var(--text-secondary)'}; font-size: 1rem;">
                ${item.isCompleted ? '✓' : '○'}
              </button>
              <button onclick="deletePlanner('${item._id}')" class="btn-icon" style="color: var(--accent-red); font-size: 0.8rem;">✕</button>
            </div>
          </div>
        `;
      });
    } else {
      cardsHtml = `
        <div class="empty-timeline-slot" onclick="openScheduleForHour('${hourStr}:00')">
          <span>+ Plan ${formatHourDisplay(h)} time block</span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Available</span>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="timeline-hour-time">${formatHourDisplay(h)}</div>
      <div class="timeline-axis">
        <div class="timeline-track-line"></div>
        <div class="timeline-node"></div>
      </div>
      <div class="timeline-events-column">
        ${cardsHtml}
      </div>
    `;

    // If current time falls inside this hour row, render the live laser line!
    if (isToday && currentHour === h) {
      const offsetPercent = Math.min(95, Math.max(5, (currentMinute / 60) * 100));
      const marker = document.createElement('div');
      marker.className = 'timeline-now-indicator';
      marker.style.top = `${offsetPercent}%`;
      marker.innerHTML = `<span class="timeline-now-badge">● LIVE NOW (${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')})</span>`;
      row.appendChild(marker);
    }

    container.appendChild(row);
  }
}

function openScheduleForHour(startHourStr) {
  const [h, m] = startHourStr.split(':').map(Number);
  const nextH = (h + 1) % 24;
  const startStr = `${String(h).padStart(2, '0')}:00`;
  const endStr = `${String(nextH).padStart(2, '0')}:00`;

  document.getElementById('meetingStart').value = startStr;
  document.getElementById('meetingEnd').value = endStr;
  openModal('newMeetingModal');
}

function renderPlannerTodos() {
  const container = document.getElementById('todosList');
  if (!container) return;

  const completed = state.todos.filter(t => t.isCompleted).length;
  const countBadge = document.getElementById('plannerTodoBadge');
  if (countBadge) countBadge.textContent = `${completed}/${state.todos.length} done`;

  if (state.todos.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        All tasks cleared for this day! Type a task above to schedule or track one.
      </div>`;
    return;
  }

  container.innerHTML = '';
  state.todos.forEach(todo => {
    const el = document.createElement('div');
    el.className = 'todo-item';
    el.innerHTML = `
      <div class="todo-left">
        <button onclick="toggleTodo('${todo._id}')" class="btn-icon" style="color: ${todo.isCompleted ? 'var(--accent-neon)' : 'var(--text-secondary)'}; font-size: 1.15rem;">
          ${todo.isCompleted ? '✓' : '○'}
        </button>
        <div>
          <span class="todo-title ${todo.isCompleted ? 'completed' : ''}">${todo.title}</span>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 8px;">
            <span class="priority-pill priority-${todo.priority}">${todo.priority}</span>
            <button onclick="scheduleTodoIntoTimeline('${todo.title.replace(/'/g, "\\'")}')" style="background: none; border: none; color: var(--accent-blue); font-size: 0.72rem; font-weight: 700; cursor: pointer;">
              🕒 Schedule Slot
            </button>
          </div>
        </div>
      </div>
      <button onclick="deleteTodo('${todo._id}')" class="btn-icon" style="color: var(--accent-red);">✕</button>
    `;
    container.appendChild(el);
  });
}

function scheduleTodoIntoTimeline(title) {
  document.getElementById('meetingTitle').value = title;
  document.getElementById('meetingType').value = 'study';
  openModal('newMeetingModal');
}

// ========================================================
// TAB 4: CALENDAR, EXPENSES & SCREEN TIME HUB
// ========================================================
async function loadHubData(date = state.selectedDate) {
  state.selectedDate = date;
  renderCalendarWidget();

  const [dayRes, expRes] = await Promise.all([
    api(`/calendar/day?date=${date}`),
    api(`/expenses?date=${date}`)
  ]);

  if (dayRes.success) {
    state.daySummary = dayRes;
    const score = dayRes.productivityScore || 0;
    document.getElementById('hubScoreValue').textContent = `${score}%`;
    document.getElementById('hubDateTitle').textContent = `Summary for ${formatDayLabel(date)}`;

    let feedback = 'Decent progress! Keep building habits.';
    if (score >= 80) feedback = '🏆 Outstanding productivity streak!';
    else if (score >= 60) feedback = '🔥 High momentum day!';
    else if (score < 40) feedback = '🌱 Great start, complete more habits to raise score.';
    document.getElementById('hubScoreFeedback').textContent = feedback;

    // Screen Time
    const stTotal = dayRes.summary?.screenTime?.totalMinutes || 0;
    const stProd = dayRes.summary?.screenTime?.productiveMinutes || 0;
    const stHours = Math.floor(stTotal / 60);
    const stMins = stTotal % 60;
    document.getElementById('hubScreenTotal').textContent = `${stHours}h ${stMins}m`;
    document.getElementById('hubScreenProductive').textContent = `${stProd}m productive`;
  }

  if (expRes.success) {
    state.expenses = expRes.expenses || [];
    const total = state.expenses.reduce((s, e) => s + (e.amount || 0), 0);
    document.getElementById('hubExpenseTotal').textContent = `$${total.toFixed(2)}`;
    document.getElementById('hubExpenseCount').textContent = `${state.expenses.length} transactions`;

    renderHubExpensesList();
  }
}

function renderHubExpensesList() {
  const container = document.getElementById('hubExpensesList');
  if (!container) return;

  if (state.expenses.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        No expenses recorded for this date.<br>
        <button onclick="openModal('addExpenseModal')" style="margin-top: 8px; padding: 4px 14px; background: var(--card-elevated); border: 1px solid var(--border-color); color: var(--accent-orange); border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 700;">
          + Log Expense
        </button>
      </div>`;
    return;
  }

  const categoryEmojis = {
    food: '🍔',
    tech: '💻',
    transport: '🚗',
    books: '📚',
    health: '💊',
    bills: '📄',
    entertainment: '🍿',
    other: '🛒'
  };

  container.innerHTML = '';
  state.expenses.forEach(e => {
    const card = document.createElement('div');
    card.className = 'day-expense-card';
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.3rem;">${categoryEmojis[e.category] || '🛒'}</span>
        <div>
          <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">${e.title}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${e.category}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class="expense-amount-badge">$${Number(e.amount).toFixed(2)}</span>
        <button onclick="deleteExpense('${e._id}')" class="btn-icon" style="color: var(--accent-red);">✕</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderCalendarWidget() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const current = state.calCurrentMonth;
  const year = current.getFullYear();
  const month = current.getMonth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[month]} ${year}`;

  grid.innerHTML = '';
  const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  dayHeaders.forEach(dh => {
    const l = document.createElement('div');
    l.className = 'cal-day-label';
    l.textContent = dh;
    grid.appendChild(l);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    grid.appendChild(empty);
  }

  const todayStr = getTodayDateString();

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = `cal-day-cell ${dStr === state.selectedDate ? 'selected' : ''} ${dStr === todayStr ? 'today' : ''}`;
    cell.textContent = d;

    cell.addEventListener('click', () => {
      loadHubData(dStr);
    });

    grid.appendChild(cell);
  }
}

// ========================================================
// TAB 5: LEADERBOARD
// ========================================================
async function loadLeaderboardData() {
  const res = await api('/leaderboard');
  const container = document.getElementById('leaderboardList');
  if (!container) return;

  if (res.success && res.leaderboard) {
    state.leaderboard = res.leaderboard;
    container.innerHTML = '';
    state.leaderboard.forEach(user => {
      const isTop3 = user.rank <= 3;
      const card = document.createElement('div');
      card.className = `leaderboard-card ${user.isCurrentUser ? 'current-user' : ''}`;
      card.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div class="rank-badge ${isTop3 ? `rank-${user.rank}` : ''}">${user.rank}</div>
          <div>
            <div class="user-info-name">${user.displayName} ${user.isCurrentUser ? '<span style="color: var(--accent-neon); font-size: 0.75rem;">(You)</span>' : ''}</div>
            <div class="user-info-username">@${user.username} • ${user.habitsCompletedToday} habits done today</div>
          </div>
        </div>
        <div class="streak-score">
          <div class="streak-score-val">🔥 ${user.currentStreak}d</div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">best: ${user.bestStreak}d</div>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

// ========================================================
// ACTIONS (HABITS, TODOS, PLANNER, EXPENSES)
// ========================================================
async function toggleHabit(habitId) {
  const res = await api('/logs/toggle-today', { method: 'POST', body: JSON.stringify({ habitId }) });
  if (res.success && res.isCompleted) {
    triggerConfetti();
    playChime();
  }
  loadHabitsData();
}

async function incrementHabit(habitId, amount) {
  const res = await api('/logs/increment', { method: 'POST', body: JSON.stringify({ habitId, amount }) });
  if (res.success && res.log?.isCompleted) {
    triggerConfetti();
    playChime();
  }
  loadHabitsData();
}

async function deleteHabit(id) {
  if (!confirm('Are you sure you want to delete this habit?')) return;
  await api(`/habits/${id}`, { method: 'DELETE' });
  loadHabitsData();
}

async function togglePlanner(id) {
  const res = await api(`/planner/${id}/toggle`, { method: 'PATCH' });
  if (res.success && res.item?.isCompleted) {
    triggerConfetti();
    playChime();
  }
  loadPlannerData(state.selectedDate);
}

async function deletePlanner(id) {
  await api(`/planner/${id}`, { method: 'DELETE' });
  loadPlannerData(state.selectedDate);
}

async function toggleTodo(id) {
  const res = await api(`/todos/${id}/toggle`, { method: 'PATCH' });
  if (res.success && res.todo?.isCompleted) {
    triggerConfetti();
    playChime();
  }
  loadPlannerData(state.selectedDate);
}

async function deleteTodo(id) {
  await api(`/todos/${id}`, { method: 'DELETE' });
  loadPlannerData(state.selectedDate);
}

async function deleteExpense(id) {
  await api(`/expenses/${id}`, { method: 'DELETE' });
  loadHubData(state.selectedDate);
}

// ========================================================
// NAVIGATION & MODALS
// ========================================================
function switchTab(tab) {
  state.currentTab = tab;
  const views = ['viewHabits', 'viewPomodoro', 'viewPlanner', 'viewHub', 'viewLeaderboard'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  const activeView = {
    habits: 'viewHabits',
    pomodoro: 'viewPomodoro',
    planner: 'viewPlanner',
    hub: 'viewHub',
    leaderboard: 'viewLeaderboard'
  }[tab];

  if (activeView && document.getElementById(activeView)) {
    document.getElementById(activeView).style.display = tab === 'pomodoro' ? 'flex' : 'block';
  }

  // Show Floating Action Button only on Habits view
  const fab = document.getElementById('btnOpenNewHabitModal');
  if (fab) fab.style.display = tab === 'habits' ? 'flex' : 'none';

  document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
  const navMap = {
    habits: 'navHabits',
    pomodoro: 'navPomodoro',
    planner: 'navPlanner',
    hub: 'navHub',
    leaderboard: 'navLeaderboard'
  };
  if (navMap[tab] && document.getElementById(navMap[tab])) {
    document.getElementById(navMap[tab]).classList.add('active');
  }

  if (tab === 'habits') loadHabitsData();
  if (tab === 'planner') loadPlannerData(state.selectedDate);
  if (tab === 'hub') loadHubData(state.selectedDate);
  if (tab === 'leaderboard') loadLeaderboardData();
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// ========================================================
// INITIALIZE EVENT LISTENERS
// ========================================================
window.addEventListener('DOMContentLoaded', async () => {
  await ensureAuth();
  await loadHabitsData();

  // Bottom Navigation
  document.getElementById('navHabits').addEventListener('click', () => switchTab('habits'));
  document.getElementById('navPomodoro').addEventListener('click', () => switchTab('pomodoro'));
  document.getElementById('navPlanner').addEventListener('click', () => switchTab('planner'));
  document.getElementById('navHub').addEventListener('click', () => switchTab('hub'));
  document.getElementById('navLeaderboard').addEventListener('click', () => switchTab('leaderboard'));

  // Header Account Badge Click
  document.getElementById('userBadge').addEventListener('click', () => {
    updateAccountModalProfile();
    openModal('accountModal');
  });

  // Invite Button on Leaderboard
  document.getElementById('btnOpenInviteModal')?.addEventListener('click', () => openModal('inviteModal'));

  // Planner Day Navigator
  document.getElementById('plannerPrevDay').addEventListener('click', () => {
    state.selectedDate = shiftDateString(state.selectedDate, -1);
    loadPlannerData(state.selectedDate);
  });
  document.getElementById('plannerNextDay').addEventListener('click', () => {
    state.selectedDate = shiftDateString(state.selectedDate, 1);
    loadPlannerData(state.selectedDate);
  });
  document.getElementById('plannerTodayJumpBtn').addEventListener('click', () => {
    state.selectedDate = getTodayDateString();
    loadPlannerData(state.selectedDate);
  });

  // Timeline Filter Tabs
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timelineFilter = btn.dataset.filter;
      renderInteractiveTimeline();
    });
  });

  // Smart Inline Task / Event Input Form (Auto-Detects Times like "2pm", "10:30am")
  document.getElementById('quickTodoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('quickTodoInput');
    const raw = input.value.trim();
    if (!raw) return;

    input.value = '';

    // Smart regex: detect if user included time like "10am", "2pm", "14:30", "11:00am"
    const timeMatch = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    let isScheduled = false;

    if (timeMatch && (timeMatch[3] || timeMatch[2])) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2] : '00';
      const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : '';

      if (meridian === 'pm' && hour < 12) hour += 12;
      if (meridian === 'am' && hour === 12) hour = 0;

      if (hour >= 0 && hour <= 23) {
        const startStr = `${String(hour).padStart(2, '0')}:${minutes}`;
        const endHour = (hour + 1) % 24;
        const endStr = `${String(endHour).padStart(2, '0')}:${minutes}`;

        // Clean title
        const cleanTitle = raw.replace(timeMatch[0], '').trim() || raw;

        const res = await api('/planner', {
          method: 'POST',
          body: JSON.stringify({
            title: cleanTitle,
            startTime: startStr,
            endTime: endStr,
            type: 'study',
            dateString: state.selectedDate
          })
        });

        if (res.success) {
          isScheduled = true;
          triggerConfetti();
          await loadPlannerData(state.selectedDate);
        }
      }
    }

    if (!isScheduled) {
      const res = await api('/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: raw,
          priority: 'medium',
          dateString: state.selectedDate
        })
      });

      if (res.success) {
        triggerConfetti();
        await loadPlannerData(state.selectedDate);
      }
    }
  });

  // Filter Chips on Habits
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      state.selectedFilter = btn.dataset.filter;
      renderHabitsList();
    });
  });

  // Pomodoro Controls
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.addEventListener('click', () => setPomodoroMode(btn.dataset.mode));
  });
  document.getElementById('btnTimerPlayPause').addEventListener('click', toggleTimer);
  document.getElementById('btnTimerReset').addEventListener('click', resetTimer);
  document.getElementById('btnTimerSkip').addEventListener('click', () => {
    state.pomodoro.remainingSeconds = 1;
    syncTimerClock();
  });
  document.getElementById('pomodoroHabitSelect').addEventListener('change', (e) => {
    state.pomodoro.linkedHabitId = e.target.value;
  });

  // Calendar Prev/Next
  document.getElementById('calPrevMonth').addEventListener('click', () => {
    state.calCurrentMonth.setMonth(state.calCurrentMonth.getMonth() - 1);
    renderCalendarWidget();
  });
  document.getElementById('calNextMonth').addEventListener('click', () => {
    state.calCurrentMonth.setMonth(state.calCurrentMonth.getMonth() + 1);
    renderCalendarWidget();
  });

  // Modals Open Triggers
  document.getElementById('btnOpenNewHabitModal').addEventListener('click', () => openModal('newHabitModal'));
  document.getElementById('btnOpenNewMeetingModal').addEventListener('click', () => openModal('newMeetingModal'));
  document.getElementById('btnOpenNewTodoModal').addEventListener('click', () => openModal('newTodoModal'));
  document.getElementById('btnOpenAddExpenseModal').addEventListener('click', () => openModal('addExpenseModal'));
  document.getElementById('btnOpenScreenTimeModal').addEventListener('click', () => openModal('screenTimeModal'));

  // Modals Close Triggers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // Habit Type Selector in Modal
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isCustom = btn.dataset.type !== 'boolean';
      document.getElementById('targetValueGroup').style.display = isCustom ? 'block' : 'none';
      if (btn.dataset.type === 'pomodoro') {
        document.getElementById('newHabitUnit').value = 'sessions';
        document.getElementById('newHabitTarget').value = '4';
      } else if (btn.dataset.type === 'measurable') {
        document.getElementById('newHabitUnit').value = 'glasses';
        document.getElementById('newHabitTarget').value = '8';
      }
    });
  });

  // Submit Habit
  document.getElementById('btnCreateHabitSubmit').addEventListener('click', async () => {
    const title = document.getElementById('newHabitTitle').value.trim();
    const desc = document.getElementById('newHabitDesc').value.trim();
    const type = document.querySelector('.type-btn.active').dataset.type;
    const target = Number(document.getElementById('newHabitTarget').value) || 1;
    const unit = document.getElementById('newHabitUnit').value.trim();
    if (!title) return alert('Please enter habit title');

    const res = await api('/habits', {
      method: 'POST',
      body: JSON.stringify({ title, description: desc, type, targetValue: target, unit })
    });

    if (!res.success) {
      alert('Failed to create habit: ' + (res.message || 'Error'));
      return;
    }

    document.getElementById('newHabitTitle').value = '';
    document.getElementById('newHabitDesc').value = '';
    closeModal('newHabitModal');
    triggerConfetti();
    await loadHabitsData();
  });

  // Submit Meeting / Schedule Block
  document.getElementById('btnSaveMeeting').addEventListener('click', async () => {
    const title = document.getElementById('meetingTitle').value.trim();
    const start = document.getElementById('meetingStart').value;
    const end = document.getElementById('meetingEnd').value;
    const type = document.getElementById('meetingType').value;
    const link = document.getElementById('meetingLink').value.trim();
    if (!title) return alert('Please enter event title');

    const res = await api('/planner', {
      method: 'POST',
      body: JSON.stringify({
        title,
        startTime: start,
        endTime: end,
        type,
        linkOrLocation: link,
        dateString: state.selectedDate
      })
    });

    if (res.success) {
      document.getElementById('meetingTitle').value = '';
      document.getElementById('meetingLink').value = '';
      closeModal('newMeetingModal');
      triggerConfetti();
      await loadPlannerData(state.selectedDate);
    }
  });

  // Submit To-Do Task
  document.getElementById('btnSaveTodo').addEventListener('click', async () => {
    const title = document.getElementById('todoTitleInput').value.trim();
    const priority = document.getElementById('todoPriorityInput').value;
    if (!title) return alert('Please enter task description');

    const res = await api('/todos', {
      method: 'POST',
      body: JSON.stringify({
        title,
        priority,
        dateString: state.selectedDate
      })
    });

    if (res.success) {
      document.getElementById('todoTitleInput').value = '';
      closeModal('newTodoModal');
      await loadPlannerData(state.selectedDate);
    }
  });

  // Submit Expense
  document.getElementById('btnSaveExpense').addEventListener('click', async () => {
    const title = document.getElementById('expenseTitleInput').value.trim();
    const amount = Number(document.getElementById('expenseAmountInput').value);
    const category = document.getElementById('expenseCategoryInput').value;
    if (!title || !amount || amount <= 0) return alert('Please enter valid expense title and amount');

    const res = await api('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        title,
        amount,
        category,
        dateString: state.selectedDate
      })
    });

    if (res.success) {
      document.getElementById('expenseTitleInput').value = '';
      document.getElementById('expenseAmountInput').value = '';
      closeModal('addExpenseModal');
      triggerConfetti();
      await loadHubData(state.selectedDate);
    }
  });

  // Submit Screen Time
  document.getElementById('btnSaveScreenTime').addEventListener('click', async () => {
    const total = Number(document.getElementById('stTotalMinutes').value) || 0;
    const prod = Number(document.getElementById('stProductiveMinutes').value) || 0;
    const ent = Number(document.getElementById('stEntertainmentMinutes').value) || 0;

    const res = await api('/screentime', {
      method: 'POST',
      body: JSON.stringify({
        totalMinutes: total,
        productiveMinutes: prod,
        entertainmentMinutes: ent,
        dateString: state.selectedDate
      })
    });

    if (res.success) {
      closeModal('screenTimeModal');
      await loadHubData(state.selectedDate);
    }
  });

  // Copy Buttons in Invite Modal
  document.getElementById('btnCopyWifiUrl')?.addEventListener('click', () => {
    const input = document.getElementById('shareWifiUrl');
    navigator.clipboard.writeText(input.value);
    const btn = document.getElementById('btnCopyWifiUrl');
    btn.textContent = 'Copied! ✓';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });

  document.getElementById('btnCopyWorldwideUrl')?.addEventListener('click', () => {
    const input = document.getElementById('shareWorldwideUrl');
    navigator.clipboard.writeText(input.value);
    const btn = document.getElementById('btnCopyWorldwideUrl');
    btn.textContent = 'Copied! ✓';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });

  // WhatsApp Direct Share Setup
  const btnWhatsApp = document.getElementById('btnWhatsAppShare');
  if (btnWhatsApp) {
    const shareMessage = encodeURIComponent(
      `🔥 Hey! I'm using Habit Tracker to build daily streaks, hour-by-hour timeline planning & Pomodoro focus.\n\nJoin my live streak leaderboard and compete with me here:\nhttps://rich-wasps-divide.loca.lt\n(Tunnel password if asked: 103.177.183.236)`
    );
    btnWhatsApp.href = `https://api.whatsapp.com/send?text=${shareMessage}`;
  }



  // Login With Name
  document.getElementById('btnNameLoginSubmit').addEventListener('click', async () => {
    const name = document.getElementById('nameLoginInput').value.trim();
    if (!name) return alert('Please enter your name');

    const res = await api('/auth/name-login', {
      method: 'POST',
      body: JSON.stringify({ name })
    });

    if (res.success && res.token) {
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('token', state.token);
      localStorage.setItem('user', JSON.stringify(state.user));
      updateUserUI();
      updateAccountModalProfile();
      closeModal('accountModal');
      triggerConfetti();
      await loadHabitsData();
      alert(`Welcome, ${res.user.displayName || res.user.username}!`);
    } else {
      alert('Login failed: ' + (res.message || 'Unknown error'));
    }
  });

  // Google Sign-In Handler
  document.getElementById('btnGoogleSignIn').addEventListener('click', async () => {
    const googleEmail = prompt('Enter your Google email address to sign in:', 'user@gmail.com');
    if (!googleEmail || !googleEmail.includes('@')) return;

    const googleName = prompt('Enter your name for your profile:', googleEmail.split('@')[0]) || googleEmail.split('@')[0];

    const res = await api('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        email: googleEmail,
        name: googleName,
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      })
    });

    if (res.success && res.token) {
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('token', state.token);
      localStorage.setItem('user', JSON.stringify(state.user));
      updateUserUI();
      updateAccountModalProfile();
      closeModal('accountModal');
      triggerConfetti();
      await loadHabitsData();
      alert(`Signed in as ${res.user.displayName}!`);
    } else {
      alert('Google Sign-In failed: ' + (res.message || 'Unknown error'));
    }
  });

  // Sign Out
  document.getElementById('btnSignOut').addEventListener('click', async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = '';
    state.user = null;
    closeModal('accountModal');
    await ensureAuth();
    await loadHabitsData();
    alert('Signed out. Switched to a fresh profile.');
  });
});

function updateAccountModalProfile() {
  if (state.user) {
    document.getElementById('accountDisplayName').textContent = state.user.displayName || state.user.username;
    document.getElementById('accountUsername').textContent = `@${state.user.username}`;
    const initial = (state.user.displayName || state.user.username)[0].toUpperCase();
    document.getElementById('accountAvatar').textContent = initial;
  }
}

// --- 3D Particle Confetti Engine ---
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#00e676', '#38bdf8', '#c084fc', '#fbbf24', '#fb7185', '#ffffff'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.75) * 17,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      alpha: 1
    });
  }

  let animationFrame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // gravity
      p.vx *= 0.98;
      p.rotation += p.vRotation;
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        alive++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (alive > 0) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  animate();
}

// ========================================================
// SERVICE WORKER REGISTRATION (PWA & APK READINESS)
// ========================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch((err) => console.log('[PWA] Service Worker registration failed:', err));
  });
}

