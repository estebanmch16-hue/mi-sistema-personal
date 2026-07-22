import { iconSvg } from '../../shared/icons.js';
import { loadModuleStyles } from '../../shared/load-css.js';

const POMODORO_DURATIONS_MS = {
  trabajo: 25 * 60 * 1000,
  descanso_corto: 5 * 60 * 1000,
  descanso_largo: 15 * 60 * 1000,
};
const POMODORO_LABELS = {
  trabajo: 'Trabajo',
  descanso_corto: 'Descanso corto',
  descanso_largo: 'Descanso largo',
};
const CYCLES_BEFORE_LONG_BREAK = 4;
const DEFAULT_TIMER_MINUTES = 10;

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // Audio no disponible (ej. bloqueado por el navegador). No es crítico.
  }
}

// Estado a nivel de módulo (no dentro de mount): las 3 herramientas siguen
// corriendo aunque el usuario navegue a otra vista y vuelva. Solo se
// reinician al recargar la página, como cualquier cronómetro real.
let activeTab = 'pomodoro';

const pomodoro = {
  phase: 'trabajo',
  cyclesCompleted: 0,
  remainingMs: POMODORO_DURATIONS_MS.trabajo,
  running: false,
  endTime: null,
  intervalId: null,
};

const cronometro = {
  elapsedMs: 0,
  running: false,
  startedAt: null,
  intervalId: null,
};

const temporizador = {
  totalMs: DEFAULT_TIMER_MINUTES * 60 * 1000,
  remainingMs: DEFAULT_TIMER_MINUTES * 60 * 1000,
  running: false,
  endTime: null,
  intervalId: null,
};

let els = {};

// --- Pomodoro ---
function pomodoroNextPhase() {
  if (pomodoro.phase === 'trabajo') {
    pomodoro.cyclesCompleted += 1;
    pomodoro.phase = pomodoro.cyclesCompleted % CYCLES_BEFORE_LONG_BREAK === 0 ? 'descanso_largo' : 'descanso_corto';
  } else {
    pomodoro.phase = 'trabajo';
  }
  pomodoro.remainingMs = POMODORO_DURATIONS_MS[pomodoro.phase];
}

function pomodoroTick() {
  pomodoro.remainingMs = pomodoro.endTime - Date.now();
  if (pomodoro.remainingMs <= 0) {
    pomodoroPause();
    playBeep();
    pomodoroNextPhase();
  }
  renderPomodoro();
}

function pomodoroStart() {
  if (pomodoro.running) return;
  pomodoro.running = true;
  pomodoro.endTime = Date.now() + pomodoro.remainingMs;
  pomodoro.intervalId = setInterval(pomodoroTick, 250);
  renderPomodoro();
}

function pomodoroPause() {
  pomodoro.running = false;
  clearInterval(pomodoro.intervalId);
  pomodoro.intervalId = null;
  renderPomodoro();
}

function pomodoroToggle() {
  if (pomodoro.running) pomodoroPause();
  else pomodoroStart();
}

function pomodoroReset() {
  pomodoroPause();
  pomodoro.remainingMs = POMODORO_DURATIONS_MS[pomodoro.phase];
  renderPomodoro();
}

function pomodoroSkip() {
  pomodoroPause();
  pomodoroNextPhase();
  renderPomodoro();
}

function renderPomodoro() {
  if (!els.pomodoroPhase) return;
  els.pomodoroPhase.textContent = POMODORO_LABELS[pomodoro.phase];
  els.pomodoroTime.textContent = formatDuration(pomodoro.remainingMs);
  els.pomodoroCycles.textContent = `Ciclo ${pomodoro.cyclesCompleted + 1}`;
  els.pomodoroToggle.textContent = pomodoro.running ? 'Pausar' : 'Iniciar';
}

// --- Cronómetro ---
function cronometroTick() {
  cronometro.elapsedMs = Date.now() - cronometro.startedAt;
  renderCronometro();
}

function cronometroStart() {
  if (cronometro.running) return;
  cronometro.running = true;
  cronometro.startedAt = Date.now() - cronometro.elapsedMs;
  cronometro.intervalId = setInterval(cronometroTick, 250);
  renderCronometro();
}

function cronometroPause() {
  cronometro.running = false;
  clearInterval(cronometro.intervalId);
  cronometro.intervalId = null;
  renderCronometro();
}

function cronometroToggle() {
  if (cronometro.running) cronometroPause();
  else cronometroStart();
}

function cronometroReset() {
  cronometroPause();
  cronometro.elapsedMs = 0;
  renderCronometro();
}

function renderCronometro() {
  if (!els.cronometroTime) return;
  els.cronometroTime.textContent = formatDuration(cronometro.elapsedMs);
  els.cronometroToggle.textContent = cronometro.running ? 'Pausar' : 'Iniciar';
}

// --- Temporizador ---
function temporizadorTick() {
  temporizador.remainingMs = temporizador.endTime - Date.now();
  if (temporizador.remainingMs <= 0) {
    temporizador.remainingMs = 0;
    temporizadorPause();
    playBeep();
  }
  renderTemporizador();
}

function temporizadorStart() {
  if (temporizador.running) return;
  if (temporizador.remainingMs <= 0) temporizador.remainingMs = temporizador.totalMs;
  temporizador.running = true;
  temporizador.endTime = Date.now() + temporizador.remainingMs;
  temporizador.intervalId = setInterval(temporizadorTick, 250);
  renderTemporizador();
}

function temporizadorPause() {
  temporizador.running = false;
  clearInterval(temporizador.intervalId);
  temporizador.intervalId = null;
  renderTemporizador();
}

function temporizadorToggle() {
  if (temporizador.running) temporizadorPause();
  else temporizadorStart();
}

function temporizadorReset() {
  temporizadorPause();
  temporizador.remainingMs = temporizador.totalMs;
  renderTemporizador();
}

function handleMinutesChange() {
  const minutes = Math.max(1, Math.min(180, Number(els.temporizadorMinutes.value) || DEFAULT_TIMER_MINUTES));
  temporizador.totalMs = minutes * 60 * 1000;
  if (!temporizador.running) {
    temporizador.remainingMs = temporizador.totalMs;
    renderTemporizador();
  }
}

function renderTemporizador() {
  if (!els.temporizadorTime) return;
  els.temporizadorTime.textContent = formatDuration(temporizador.remainingMs);
  els.temporizadorToggle.textContent = temporizador.running ? 'Pausar' : 'Iniciar';
  els.temporizadorMinutes.disabled = temporizador.running;
}

// --- Tabs ---
function switchTab(tab) {
  activeTab = tab;
  els.tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tab));
  els.panels.pomodoro.hidden = tab !== 'pomodoro';
  els.panels.cronometro.hidden = tab !== 'cronometro';
  els.panels.temporizador.hidden = tab !== 'temporizador';
}

export default {
  id: 'enfoque',
  label: 'Enfoque',
  icon: 'timer',
  group: 'Productividad',
  route: '#/enfoque',

  mount(container) {
    loadModuleStyles('modules/enfoque/enfoque.css');

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Enfoque</h1>
        <p class="view-subtitle">Pomodoro, cronómetro y temporizador para tus sesiones de trabajo.</p>
      </div>

      <div class="focus-tabs">
        <button type="button" class="btn-ghost" data-tab="pomodoro">Pomodoro</button>
        <button type="button" class="btn-ghost" data-tab="cronometro">Cronómetro</button>
        <button type="button" class="btn-ghost" data-tab="temporizador">Temporizador</button>
      </div>

      <div class="card focus-panel" id="panel-pomodoro">
        <p class="focus-phase" id="pomodoro-phase"></p>
        <p class="focus-time" id="pomodoro-time"></p>
        <p class="focus-meta" id="pomodoro-cycles"></p>
        <div class="focus-controls">
          <button type="button" class="btn-primary" id="pomodoro-toggle"></button>
          <button type="button" class="btn-ghost" id="pomodoro-skip">Saltar</button>
          <button type="button" class="btn-ghost" id="pomodoro-reset">Reiniciar</button>
        </div>
      </div>

      <div class="card focus-panel" id="panel-cronometro" hidden>
        <p class="focus-time" id="cronometro-time"></p>
        <div class="focus-controls">
          <button type="button" class="btn-primary" id="cronometro-toggle"></button>
          <button type="button" class="btn-ghost" id="cronometro-reset">Reiniciar</button>
        </div>
      </div>

      <div class="card focus-panel" id="panel-temporizador" hidden>
        <label class="focus-setup">
          Minutos
          <input type="number" min="1" max="180" value="${DEFAULT_TIMER_MINUTES}" id="temporizador-minutes" />
        </label>
        <p class="focus-time" id="temporizador-time"></p>
        <div class="focus-controls">
          <button type="button" class="btn-primary" id="temporizador-toggle"></button>
          <button type="button" class="btn-ghost" id="temporizador-reset">Reiniciar</button>
        </div>
      </div>
    `;

    els = {
      tabButtons: Array.from(container.querySelectorAll('.focus-tabs [data-tab]')),
      panels: {
        pomodoro: container.querySelector('#panel-pomodoro'),
        cronometro: container.querySelector('#panel-cronometro'),
        temporizador: container.querySelector('#panel-temporizador'),
      },
      pomodoroPhase: container.querySelector('#pomodoro-phase'),
      pomodoroTime: container.querySelector('#pomodoro-time'),
      pomodoroCycles: container.querySelector('#pomodoro-cycles'),
      pomodoroToggle: container.querySelector('#pomodoro-toggle'),
      cronometroTime: container.querySelector('#cronometro-time'),
      cronometroToggle: container.querySelector('#cronometro-toggle'),
      temporizadorTime: container.querySelector('#temporizador-time'),
      temporizadorToggle: container.querySelector('#temporizador-toggle'),
      temporizadorMinutes: container.querySelector('#temporizador-minutes'),
    };

    els.tabButtons.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    els.pomodoroToggle.addEventListener('click', pomodoroToggle);
    container.querySelector('#pomodoro-skip').addEventListener('click', pomodoroSkip);
    container.querySelector('#pomodoro-reset').addEventListener('click', pomodoroReset);
    els.cronometroToggle.addEventListener('click', cronometroToggle);
    container.querySelector('#cronometro-reset').addEventListener('click', cronometroReset);
    els.temporizadorToggle.addEventListener('click', temporizadorToggle);
    container.querySelector('#temporizador-reset').addEventListener('click', temporizadorReset);
    els.temporizadorMinutes.addEventListener('change', handleMinutesChange);

    switchTab(activeTab);
    renderPomodoro();
    renderCronometro();
    renderTemporizador();
  },

  unmount() {
    // Los timers NO se detienen aquí a propósito: un Pomodoro debe seguir
    // corriendo aunque el usuario navegue a Tareas o Notas. Solo se limpian
    // las referencias al DOM de esta vista.
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/enfoque/enfoque.css');
      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('timer')}
          <h3>Enfoque</h3>
          <a href="#/enfoque" class="widget-link">Abrir</a>
        </div>
        ${
          pomodoro.running
            ? `<p class="widget-stat">${formatDuration(pomodoro.remainingMs)}</p><p class="widget-empty">${POMODORO_LABELS[pomodoro.phase]}</p>`
            : '<p class="widget-empty">Sin sesión de pomodoro activa.</p>'
        }
      `;
    },
  },
};
