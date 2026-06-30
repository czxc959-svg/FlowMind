const STORAGE_KEY = "flowmind_focus_v2";
const RING_LENGTH = 703.72;

const defaultState = {
  tasks: [
    {
      id: makeId(),
      title: "写下今天最重要的一个学习或工作目标",
      type: "study",
      energy: "medium",
      done: false,
      createdAt: new Date().toISOString()
    }
  ],
  distractions: [],
  sessions: [],
  dailyNotes: {},
  timer: {
    selectedMinutes: 25,
    blocker: "",
    reward: ""
  }
};

let state = loadState();
let backendAvailable = false;
let saveDebounce = null;
let filter = "open";
let timer = {
  total: state.timer.selectedMinutes * 60,
  left: state.timer.selectedMinutes * 60,
  running: false,
  startedAt: null,
  interval: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  drawFocusField();
  await syncFromBackend();
  renderAll();
  updateTimerDisplay();
});

async function syncFromBackend() {
  if (window.location.protocol === "file:") {
    backendAvailable = false;
    updateSyncLabel("离线模式");
    toast("你现在是直接打开文件。用“一键启动”进入完整后端模式。");
    return;
  }

  try {
    const response = await apiFetch("/api/focus");
    state = mergeState(response.data);
    backendAvailable = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncLabel("后端已连接");
  } catch (error) {
    backendAvailable = false;
    updateSyncLabel("离线缓存");
    toast("暂时连不上后端，已使用本地缓存");
  }
}

function bindEvents() {
  $("#today-label").textContent = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  updateSyncLabel("连接中");

  $("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#task-input").value.trim();
    if (!title) {
      toast("先写一个足够具体的动作");
      return;
    }
    state.tasks.unshift({
      id: makeId(),
      title,
      type: $("#task-type").value,
      energy: $("#task-energy").value,
      done: false,
      createdAt: new Date().toISOString()
    });
    $("#task-input").value = "";
    saveAndRender("已加入今日任务");
  });

  $$(".tool-btn").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      $$(".tool-btn").forEach((item) => item.classList.toggle("active", item === button));
      renderTasks();
    });
  });

  $$(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = Number(button.dataset.minutes);
      setTimerMinutes(minutes);
      $$(".preset-btn").forEach((item) => item.classList.toggle("active", item === button));
    });
  });

  $("#custom-minutes").addEventListener("change", () => {
    const minutes = clamp(Number($("#custom-minutes").value) || 30, 5, 120);
    $("#custom-minutes").value = minutes;
    setTimerMinutes(minutes);
    $$(".preset-btn").forEach((item) => item.classList.remove("active"));
  });

  $("#start-btn").addEventListener("click", startTimer);
  $("#pause-btn").addEventListener("click", pauseTimer);
  $("#reset-btn").addEventListener("click", resetTimer);
  $("#complete-btn").addEventListener("click", completeActiveTask);
  $("#fullscreen-btn").addEventListener("click", () => {
    document.body.classList.toggle("immersive");
    $("#fullscreen-btn").textContent = document.body.classList.contains("immersive") ? "退出沉浸" : "沉浸模式";
  });

  $("#distraction-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = $("#distraction-input").value.trim();
    if (!text) return;
    state.distractions.unshift({
      id: makeId(),
      text,
      createdAt: new Date().toISOString()
    });
    $("#distraction-input").value = "";
    saveAndRender("已收纳，回到当前目标");
  });

  $("#clear-distractions-btn").addEventListener("click", () => {
    state.distractions = [];
    saveAndRender("走神收纳已清空");
  });

  $("#clear-done-btn").addEventListener("click", () => {
    state.tasks = state.tasks.filter((task) => !task.done);
    saveAndRender("已清理完成项");
  });

  $("#export-btn").addEventListener("click", exportToday);
  $("#active-task").addEventListener("change", renderFocusScore);
  $("#daily-note").addEventListener("input", () => {
    state.dailyNotes[todayKey()] = $("#daily-note").value;
    saveState();
  });
  $("#blocker-input").addEventListener("input", () => {
    state.timer.blocker = $("#blocker-input").value;
    saveState();
    renderFocusScore();
  });
  $("#reward-input").addEventListener("input", () => {
    state.timer.reward = $("#reward-input").value;
    saveState();
    renderFocusScore();
  });
  $$(".ritual-check").forEach((box) => {
    box.addEventListener("change", renderFocusScore);
  });
}

function renderAll() {
  renderTasks();
  renderActiveTaskSelect();
  renderDistractions();
  renderReview();
  renderScores();
  renderCoach();
  $("#daily-note").value = state.dailyNotes[todayKey()] || "";
  $("#blocker-input").value = state.timer.blocker || "";
  $("#reward-input").value = state.timer.reward || "";
  renderFocusScore();
}

function renderTasks() {
  const list = $("#task-list");
  const tasks = state.tasks.filter((task) => {
    if (filter === "done") return task.done;
    if (filter === "open") return !task.done;
    return true;
  });

  if (!tasks.length) {
    list.innerHTML = `<p class="empty">${filter === "done" ? "还没有完成项。" : "这里很清爽，添加一个下一步动作吧。"}</p>`;
    return;
  }

  list.innerHTML = tasks.map((task) => `
    <article class="task-item" data-energy="${task.energy}">
      <div class="task-main">
        <input type="checkbox" ${task.done ? "checked" : ""} data-toggle-task="${task.id}" aria-label="切换任务状态" />
        <div class="task-title ${task.done ? "done" : ""}">${escapeHtml(task.title)}</div>
        <button class="mini-action" data-delete-task="${task.id}" title="删除任务" aria-label="删除任务">删除</button>
      </div>
      <div class="task-meta">
        <span>${typeLabel(task.type)}</span>
        <span>${energyLabel(task.energy)}</span>
        <span>${formatTime(task.createdAt)}</span>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-toggle-task]").forEach((box) => {
    box.addEventListener("change", () => {
      const task = state.tasks.find((item) => item.id === box.dataset.toggleTask);
      if (!task) return;
      task.done = box.checked;
      task.doneAt = task.done ? new Date().toISOString() : null;
      saveAndRender(task.done ? "漂亮，完成了一个闭环" : "已恢复为待处理");
    });
  });

  list.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => task.id !== button.dataset.deleteTask);
      saveAndRender("任务已移除");
    });
  });
}

function renderActiveTaskSelect() {
  const select = $("#active-task");
  const openTasks = state.tasks.filter((task) => !task.done);
  select.innerHTML = openTasks.length
    ? openTasks.map((task) => `<option value="${task.id}">${escapeHtml(task.title)}</option>`).join("")
    : `<option value="">先添加一个任务</option>`;
}

function renderDistractions() {
  const list = $("#distraction-list");
  if (!state.distractions.length) {
    list.innerHTML = `<p class="empty">专注时冒出的想法会出现在这里。</p>`;
    return;
  }

  list.innerHTML = state.distractions.map((item) => `
    <article class="distraction-item">
      <div>${escapeHtml(item.text)}</div>
      <div class="task-meta">
        <span>${formatTime(item.createdAt)}</span>
        <button class="mini-action" data-convert-distraction="${item.id}">转成任务</button>
        <button class="mini-action" data-delete-distraction="${item.id}">完成/忽略</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-convert-distraction]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.distractions.find((entry) => entry.id === button.dataset.convertDistraction);
      if (!item) return;
      state.tasks.unshift({
        id: makeId(),
        title: item.text,
        type: "life",
        energy: "light",
        done: false,
        createdAt: new Date().toISOString()
      });
      state.distractions = state.distractions.filter((entry) => entry.id !== item.id);
      saveAndRender("已转成稍后处理的任务");
    });
  });

  list.querySelectorAll("[data-delete-distraction]").forEach((button) => {
    button.addEventListener("click", () => {
      state.distractions = state.distractions.filter((item) => item.id !== button.dataset.deleteDistraction);
      saveAndRender("已处理这条走神");
    });
  });
}

function renderReview() {
  const log = $("#session-log");
  const todaySessions = state.sessions.filter((session) => session.date === todayKey()).slice().reverse();
  log.innerHTML = todaySessions.length
    ? todaySessions.map((session) => `
      <article class="session-item">
        <strong>${escapeHtml(session.taskTitle || "自由专注")}</strong>
        <div class="session-meta">
          <span>${session.minutes} 分钟</span>
          <span>${formatTime(session.finishedAt)}</span>
          <span>收纳 ${session.distractions} 条走神</span>
          <span>准备度 ${session.focusScore || 0}%</span>
        </div>
      </article>
    `).join("")
    : `<p class="empty">完成第一轮冲刺后，这里会生成记录。</p>`;

  const heatmap = $("#heatmap");
  heatmap.innerHTML = lastSevenDays().map((date) => {
    const minutes = state.sessions
      .filter((session) => session.date === date.key)
      .reduce((sum, session) => sum + session.minutes, 0);
    const alpha = Math.min(0.72, 0.08 + minutes / 180);
    return `
      <div class="heat-day" style="background: rgba(47, 125, 98, ${alpha}); color: ${minutes > 75 ? "#fffaf2" : "var(--muted)"}">
        <span>${date.label}</span>
        <strong style="color: ${minutes > 75 ? "#fffaf2" : "var(--ink)"}">${minutes}</strong>
      </div>
    `;
  }).join("");
}

function renderScores() {
  const todaySessions = state.sessions.filter((session) => session.date === todayKey());
  $("#score-minutes").textContent = todaySessions.reduce((sum, session) => sum + session.minutes, 0);
  $("#score-sessions").textContent = todaySessions.length;
  $("#score-done").textContent = state.tasks.filter((task) => task.done && task.doneAt?.startsWith(todayKey())).length;
}

function renderCoach() {
  const open = state.tasks.filter((task) => !task.done);
  const deep = open.filter((task) => task.energy === "deep");
  const minutes = state.sessions
    .filter((session) => session.date === todayKey())
    .reduce((sum, session) => sum + session.minutes, 0);

  const todaySessions = state.sessions.filter((session) => session.date === todayKey());
  const distractions = todaySessions.reduce((sum, session) => sum + (session.distractions || 0), 0);
  const rate = todaySessions.length ? (distractions / todaySessions.length).toFixed(1) : "0";

  if (timer.running) {
    $("#coach-title").textContent = "已经进入冲刺";
    $("#coach-message").textContent = "现在只需要做下一步。任何不属于当前目标的想法，都放进走神收纳。";
  } else if (minutes >= 90) {
    $("#coach-title").textContent = "今天已经很扎实";
    $("#coach-message").textContent = "继续前先安排一次真正的休息。高质量恢复也是专注系统的一部分。";
  } else if (deep.length > 2) {
    $("#coach-title").textContent = "深度任务偏多";
    $("#coach-message").textContent = "挑一个最关键的深度任务，不要同时推进。完成一轮后再决定下一步。";
  } else if (!open.length) {
    $("#coach-title").textContent = "清单已收尾";
    $("#coach-message").textContent = "可以写一句复盘，或者补一个明天早上最容易启动的任务。";
  } else {
    $("#coach-title").textContent = "先开一轮短冲刺";
    $("#coach-message").textContent = "如果迟迟开始不了，把时长设成 15 分钟。目标不是完美，是先进入轨道。";
  }

  $("#coach-distraction-rate").textContent = `干扰率 ${rate}/轮`;
  $("#coach-rest-plan").textContent = `休息建议：${getRestPlan(minutes)}`;
}

function renderFocusScore() {
  const checked = $$(".ritual-check").filter((box) => box.checked).length;
  const hasTask = Boolean($("#active-task").value);
  const hasBlocker = Boolean(($("#blocker-input")?.value || "").trim());
  const hasReward = Boolean(($("#reward-input")?.value || "").trim());
  const score = Math.round(((checked / 3) * 55) + (hasTask ? 20 : 0) + (hasBlocker ? 15 : 0) + (hasReward ? 10 : 0));

  $("#focus-score-title").textContent = `专注准备度 ${Math.min(score, 100)}%`;
  if (score >= 85) {
    $("#focus-score-message").textContent = "状态很好。按开始后，把这一轮当成一个封闭实验。";
  } else if (score >= 55) {
    $("#focus-score-message").textContent = "已经差不多了。再处理一个明显干扰，进入会更稳。";
  } else {
    $("#focus-score-message").textContent = "先把环境阻力降下来。越具体，越容易开始。";
  }
}

function setTimerMinutes(minutes) {
  if (timer.running) {
    toast("计时中先暂停或重置，再调整时长");
    return;
  }
  state.timer.selectedMinutes = minutes;
  timer.total = minutes * 60;
  timer.left = timer.total;
  saveState();
  updateTimerDisplay();
}

function startTimer() {
  if (timer.running) return;
  if (!$("#active-task").value && state.tasks.some((task) => !task.done)) {
    toast("先选择一个当前目标");
    return;
  }
  if (!$("#blocker-input").value.trim()) {
    toast("先写下这一轮最可能的干扰，专注会更稳");
    $("#blocker-input").focus();
    return;
  }
  timer.running = true;
  timer.startedAt = timer.startedAt || new Date().toISOString();
  $("#timer-phase").textContent = "专注中";
  $("#timer-hint").textContent = `防守重点：${$("#blocker-input").value.trim()}`;
  timer.interval = window.setInterval(() => {
    timer.left -= 1;
    if (timer.left <= 0) finishSession();
    updateTimerDisplay();
  }, 1000);
  renderCoach();
}

function pauseTimer() {
  if (!timer.running) return;
  window.clearInterval(timer.interval);
  timer.running = false;
  $("#timer-phase").textContent = "已暂停";
  $("#timer-hint").textContent = "暂停不是失败。回来时按开始继续。";
  updateTimerDisplay();
  renderCoach();
}

function resetTimer() {
  window.clearInterval(timer.interval);
  timer.running = false;
  timer.startedAt = null;
  timer.left = timer.total;
  $("#timer-phase").textContent = "准备专注";
  $("#timer-hint").textContent = "开始后只做当前目标，其他想法先收纳。";
  updateTimerDisplay();
  renderCoach();
}

function finishSession() {
  window.clearInterval(timer.interval);
  const selectedTask = state.tasks.find((task) => task.id === $("#active-task").value);
  const minutes = Math.round(timer.total / 60);
  state.sessions.push({
    id: makeId(),
    date: todayKey(),
    minutes,
    taskId: selectedTask?.id || "",
    taskTitle: selectedTask?.title || "自由专注",
    distractions: state.distractions.length,
    blocker: state.timer.blocker || "",
    reward: state.timer.reward || "",
    focusScore: getCurrentFocusScore(),
    startedAt: timer.startedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString()
  });
  timer.running = false;
  timer.startedAt = null;
  timer.left = timer.total;
  $("#timer-phase").textContent = "冲刺完成";
  $("#timer-hint").textContent = state.timer.reward
    ? `记录已保存。现在去做恢复：${state.timer.reward}`
    : "记录已保存。站起来活动一下，再决定是否继续。";
  saveAndRender("一轮专注完成，记得休息");
  updateTimerDisplay();
}

function completeActiveTask() {
  const task = state.tasks.find((item) => item.id === $("#active-task").value);
  if (!task) {
    toast("没有可完成的当前任务");
    return;
  }
  task.done = true;
  task.doneAt = new Date().toISOString();
  saveAndRender("当前目标已标记完成");
}

function updateTimerDisplay() {
  const minutes = Math.floor(timer.left / 60);
  const seconds = timer.left % 60;
  $("#timer-display").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progress = timer.total ? 1 - timer.left / timer.total : 0;
  $("#ring-progress").style.strokeDashoffset = String(RING_LENGTH * (1 - progress));
  $("#pause-btn").disabled = !timer.running;
  document.title = timer.running ? `${$("#timer-display").textContent} - FlowMind` : "FlowMind 专注作战台";
}

function getCurrentFocusScore() {
  const checked = $$(".ritual-check").filter((box) => box.checked).length;
  const hasTask = Boolean($("#active-task").value);
  const hasBlocker = Boolean(($("#blocker-input")?.value || "").trim());
  const hasReward = Boolean(($("#reward-input")?.value || "").trim());
  return Math.min(100, Math.round(((checked / 3) * 55) + (hasTask ? 20 : 0) + (hasBlocker ? 15 : 0) + (hasReward ? 10 : 0)));
}

function getRestPlan(minutes) {
  if (timer.running) return "结束后离屏休息";
  if (minutes >= 120) return "离开屏幕 15 分钟";
  if (minutes >= 60) return "走动 8 分钟";
  if (state.timer.reward) return state.timer.reward;
  return "完成一轮后喝水走动";
}

function exportToday() {
  const lines = [];
  const today = todayKey();
  lines.push(`FlowMind 今日记录 ${today}`);
  lines.push("");
  lines.push("完成任务：");
  state.tasks
    .filter((task) => task.done && task.doneAt?.startsWith(today))
    .forEach((task) => lines.push(`- ${task.title}`));
  lines.push("");
  lines.push("专注冲刺：");
  state.sessions
    .filter((session) => session.date === today)
    .forEach((session) => lines.push(`- ${session.minutes} 分钟：${session.taskTitle}`));
  lines.push("");
  lines.push("复盘：");
  lines.push(state.dailyNotes[today] || "未填写");
  navigator.clipboard?.writeText(lines.join("\n")).then(
    () => toast("今日记录已复制到剪贴板"),
    () => toast("浏览器不允许复制，可手动选中文本导出")
  );
}

function saveAndRender(message) {
  saveState();
  renderAll();
  if (message) toast(message);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeState(saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleBackendSave();
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function lastSevenDays() {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: index === 6 ? "今" : labels[date.getDay()]
    };
  });
}

function typeLabel(type) {
  return {
    study: "学习",
    work: "工作",
    create: "创作",
    life: "生活"
  }[type] || "任务";
}

function energyLabel(energy) {
  return {
    deep: "深度专注",
    medium: "中等精力",
    light: "轻量处理"
  }[energy] || "中等精力";
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
}

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || "请求失败");
  }
  return data;
}

function scheduleBackendSave() {
  if (!backendAvailable || window.location.protocol === "file:") return;
  window.clearTimeout(saveDebounce);
  saveDebounce = window.setTimeout(async () => {
    try {
      await apiFetch("/api/focus", {
        method: "PUT",
        body: JSON.stringify(state)
      });
      updateSyncLabel("已保存");
    } catch (error) {
      backendAvailable = false;
      updateSyncLabel("离线缓存");
    }
  }, 350);
}

function updateSyncLabel(text) {
  const el = $("#sync-label");
  if (el) el.textContent = text;
}

function mergeState(input) {
  const merged = {
    ...structuredClone(defaultState),
    ...(input || {})
  };
  merged.tasks = Array.isArray(merged.tasks) && merged.tasks.length ? merged.tasks : structuredClone(defaultState.tasks);
  merged.distractions = Array.isArray(merged.distractions) ? merged.distractions : [];
  merged.sessions = Array.isArray(merged.sessions) ? merged.sessions : [];
  merged.dailyNotes = merged.dailyNotes && typeof merged.dailyNotes === "object" ? merged.dailyNotes : {};
  merged.timer = {
    ...defaultState.timer,
    ...(merged.timer || {})
  };
  return merged;
}

function drawFocusField() {
  const canvas = $("#focus-field");
  const context = canvas.getContext("2d");
  const points = Array.from({ length: 46 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2.4,
    speed: 0.0004 + Math.random() * 0.0007
  }));

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  function frame(time) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach((point, index) => {
      const x = (point.x * canvas.width + Math.sin(time * point.speed + index) * 28) % canvas.width;
      const y = (point.y * canvas.height + Math.cos(time * point.speed + index) * 22) % canvas.height;
      context.beginPath();
      context.arc(x, y, point.r * window.devicePixelRatio, 0, Math.PI * 2);
      context.fillStyle = index % 3 === 0 ? "rgba(22,116,134,.22)" : "rgba(47,125,98,.24)";
      context.fill();
    });
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
}
