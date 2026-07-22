import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { toISO, todayISO } from '../../shared/utils/dates.js';

const NAMESPACE = 'agenda';
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function loadEvents() {
  return storage.get(NAMESPACE, []);
}

function saveEvents(events) {
  storage.set(NAMESPACE, events);
}

function createEvent(title, date, time) {
  return { id: crypto.randomUUID(), title, date, time: time || null, createdAt: new Date().toISOString() };
}

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({ day, inMonth: false, iso: toISO(new Date(year, month - 1, day)) });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, inMonth: true, iso: toISO(new Date(year, month, day)) });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay, inMonth: false, iso: toISO(new Date(year, month + 1, nextDay)) });
    nextDay++;
  }
  return cells;
}

function groupByDate(events) {
  const map = new Map();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  return map;
}

function sortByTime(events) {
  return [...events].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });
}

function relativeDayLabel(iso) {
  const today = todayISO();
  const tomorrow = toISO(new Date(Date.now() + 86400000));
  if (iso === today) return 'Hoy';
  if (iso === tomorrow) return 'Mañana';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// --- Estado y render de la vista completa (mount) ---
let state = { events: [], viewYear: 0, viewMonth: 0, selectedDate: '' };
let els = {};

function renderCalendar() {
  els.monthLabel.textContent = new Date(state.viewYear, state.viewMonth, 1).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  });

  const cells = getMonthMatrix(state.viewYear, state.viewMonth);
  const eventsByDate = groupByDate(state.events);
  const today = todayISO();

  els.grid.innerHTML = '';
  for (const cell of cells) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar-day';
    if (!cell.inMonth) btn.classList.add('is-outside');
    if (cell.iso === today) btn.classList.add('is-today');
    if (cell.iso === state.selectedDate) btn.classList.add('is-selected');
    if (eventsByDate.has(cell.iso)) btn.classList.add('has-events');
    btn.dataset.date = cell.iso;
    btn.textContent = cell.day;
    els.grid.appendChild(btn);
  }
}

function renderDayPanel() {
  els.dayTitle.textContent = new Date(`${state.selectedDate}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const dayEvents = sortByTime(state.events.filter((e) => e.date === state.selectedDate));
  els.eventsList.innerHTML = '';

  if (dayEvents.length === 0) {
    els.eventsList.innerHTML = '<li class="agenda-empty">Sin eventos este día.</li>';
    return;
  }

  for (const ev of dayEvents) {
    const li = document.createElement('li');
    li.className = 'agenda-event';
    li.dataset.id = ev.id;
    li.innerHTML = `
      <span class="agenda-event-time">${ev.time || 'Todo el día'}</span>
      <span class="agenda-event-title">${escapeHtml(ev.title)}</span>
      <button class="agenda-delete icon-button" type="button" aria-label="Eliminar evento">${iconSvg('trash')}</button>
    `;
    els.eventsList.appendChild(li);
  }
}

function render() {
  renderCalendar();
  renderDayPanel();
}

function persist() {
  saveEvents(state.events);
  render();
}

function selectDate(iso) {
  state.selectedDate = iso;
  const [y, m] = iso.split('-').map(Number);
  state.viewYear = y;
  state.viewMonth = m - 1;
  render();
}

function handlePrevMonth() {
  state.viewMonth -= 1;
  if (state.viewMonth < 0) {
    state.viewMonth = 11;
    state.viewYear -= 1;
  }
  renderCalendar();
}

function handleNextMonth() {
  state.viewMonth += 1;
  if (state.viewMonth > 11) {
    state.viewMonth = 0;
    state.viewYear += 1;
  }
  renderCalendar();
}

function handleToday() {
  const now = new Date();
  state.viewYear = now.getFullYear();
  state.viewMonth = now.getMonth();
  state.selectedDate = todayISO();
  render();
}

function handleGridClick(e) {
  const btn = e.target.closest('.calendar-day');
  if (!btn) return;
  selectDate(btn.dataset.date);
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const title = String(data.get('title') || '').trim();
  if (!title) return;
  const time = String(data.get('time') || '') || null;
  state.events.push(createEvent(title, state.selectedDate, time));
  els.form.reset();
  persist();
}

function handleEventsClick(e) {
  if (!e.target.closest('.agenda-delete')) return;
  const li = e.target.closest('.agenda-event');
  state.events = state.events.filter((ev) => ev.id !== li.dataset.id);
  persist();
}

export default {
  id: 'agenda',
  label: 'Agenda',
  icon: 'calendar',
  group: 'Productividad',
  route: '#/agenda',

  mount(container) {
    loadModuleStyles('modules/agenda/agenda.css');

    const now = new Date();
    state = {
      events: loadEvents(),
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth(),
      selectedDate: todayISO(),
    };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Agenda</h1>
        <p class="view-subtitle">Organiza tus eventos por día.</p>
      </div>

      <div class="agenda-layout">
        <div class="card calendar-card">
          <div class="calendar-header">
            <button type="button" class="icon-button" id="agenda-prev" aria-label="Mes anterior"></button>
            <span class="calendar-month-label" id="agenda-month-label"></span>
            <button type="button" class="btn-ghost" id="agenda-today">Hoy</button>
            <button type="button" class="icon-button" id="agenda-next" aria-label="Mes siguiente"></button>
          </div>
          <div class="calendar-weekdays">
            ${WEEKDAY_LABELS.map((d) => `<span>${d}</span>`).join('')}
          </div>
          <div class="calendar-grid" id="agenda-grid"></div>
        </div>

        <div class="card agenda-day-panel">
          <h2 class="agenda-day-title" id="agenda-day-title"></h2>
          <form class="agenda-form" id="agenda-form">
            <input type="text" name="title" placeholder="Nuevo evento…" autocomplete="off" required />
            <input type="time" name="time" />
            <button type="submit" class="btn-primary">Agregar</button>
          </form>
          <ul class="agenda-events" id="agenda-events"></ul>
        </div>
      </div>
    `;

    els = {
      grid: container.querySelector('#agenda-grid'),
      monthLabel: container.querySelector('#agenda-month-label'),
      prevBtn: container.querySelector('#agenda-prev'),
      nextBtn: container.querySelector('#agenda-next'),
      todayBtn: container.querySelector('#agenda-today'),
      dayTitle: container.querySelector('#agenda-day-title'),
      form: container.querySelector('#agenda-form'),
      eventsList: container.querySelector('#agenda-events'),
    };

    els.prevBtn.innerHTML = iconSvg('chevron-left');
    els.nextBtn.innerHTML = iconSvg('chevron-right');

    els.prevBtn.addEventListener('click', handlePrevMonth);
    els.nextBtn.addEventListener('click', handleNextMonth);
    els.todayBtn.addEventListener('click', handleToday);
    els.grid.addEventListener('click', handleGridClick);
    els.form.addEventListener('submit', handleFormSubmit);
    els.eventsList.addEventListener('click', handleEventsClick);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/agenda/agenda.css');
      const events = loadEvents();
      const today = todayISO();

      const upcoming = events
        .filter((e) => e.date >= today)
        .sort((a, b) => `${a.date}${a.time || '00:00'}`.localeCompare(`${b.date}${b.time || '00:00'}`))
        .slice(0, 4);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('calendar')}
          <h3>Agenda</h3>
          <a href="#/agenda" class="widget-link">Ver todas</a>
        </div>
        ${
          upcoming.length
            ? `<ul class="widget-list">${upcoming
                .map((e) => `<li>${relativeDayLabel(e.date)}${e.time ? ' · ' + e.time : ''} — ${escapeHtml(e.title)}</li>`)
                .join('')}</ul>`
            : '<p class="widget-empty">Sin eventos próximos.</p>'
        }
      `;
    },
  },
};
