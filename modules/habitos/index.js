import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { todayISO, addDays, computeStreak } from '../../shared/utils/dates.js';

const NAMESPACE = 'habitos';
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function loadHabits() {
  return storage.get(NAMESPACE, []);
}

function saveHabits(habits) {
  storage.set(NAMESPACE, habits);
}

function createHabit(name) {
  return { id: crypto.randomUUID(), name, completions: [], createdAt: new Date().toISOString() };
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(addDays(todayISO(), -i));
  }
  return days;
}

function weekdayInitial(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return WEEKDAY_INITIALS[date.getDay()];
}

function toggleDay(habit, iso) {
  const idx = habit.completions.indexOf(iso);
  if (idx === -1) habit.completions.push(iso);
  else habit.completions.splice(idx, 1);
}

let state = { habits: [] };
let els = {};

function render() {
  els.list.innerHTML = '';

  if (state.habits.length === 0) {
    els.list.innerHTML = '<li class="habit-empty">Aún no tienes hábitos. Agrega el primero arriba.</li>';
    return;
  }

  const days = last7Days();
  const today = todayISO();

  for (const habit of state.habits) {
    const li = document.createElement('li');
    li.className = 'habit-item';
    li.dataset.id = habit.id;

    const streak = computeStreak(habit.completions);
    const streakLabel = streak > 0 ? `${streak} día${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}` : 'Sin racha';

    li.innerHTML = `
      <div class="habit-info">
        <span class="habit-name">${escapeHtml(habit.name)}</span>
        <span class="habit-streak">${streakLabel}</span>
      </div>
      <div class="habit-days">
        ${days
          .map(
            (iso) => `
          <button type="button" class="habit-day ${habit.completions.includes(iso) ? 'is-done' : ''} ${
              iso === today ? 'is-today' : ''
            }" data-date="${iso}" aria-label="${iso}">${weekdayInitial(iso)}</button>
        `
          )
          .join('')}
      </div>
      <button type="button" class="habit-delete icon-button" aria-label="Eliminar hábito">${iconSvg('trash')}</button>
    `;
    els.list.appendChild(li);
  }
}

function persist() {
  saveHabits(state.habits);
  render();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  state.habits.push(createHabit(name));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  const item = e.target.closest('.habit-item');
  if (!item) return;
  const habit = state.habits.find((h) => h.id === item.dataset.id);
  if (!habit) return;

  if (e.target.closest('.habit-delete')) {
    state.habits = state.habits.filter((h) => h.id !== habit.id);
    persist();
    return;
  }

  const dayBtn = e.target.closest('.habit-day');
  if (dayBtn) {
    toggleDay(habit, dayBtn.dataset.date);
    persist();
  }
}

export default {
  id: 'habitos',
  label: 'Hábitos',
  icon: 'repeat',
  group: 'Productividad',
  route: '#/habitos',

  mount(container) {
    loadModuleStyles('modules/habitos/habitos.css');
    state = { habits: loadHabits() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Hábitos</h1>
        <p class="view-subtitle">Marca los últimos 7 días para ver tu racha.</p>
      </div>

      <form class="habit-form">
        <input type="text" name="name" placeholder="Nuevo hábito…" autocomplete="off" required />
        <button type="submit" class="btn-primary">Agregar</button>
      </form>

      <ul class="habit-list"></ul>
    `;

    els = {
      form: container.querySelector('.habit-form'),
      list: container.querySelector('.habit-list'),
    };

    els.form.addEventListener('submit', handleFormSubmit);
    els.list.addEventListener('click', handleListClick);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/habitos/habitos.css');
      const habits = loadHabits();
      const today = todayISO();
      const doneToday = habits.filter((h) => h.completions.includes(today)).length;
      const pending = habits.filter((h) => !h.completions.includes(today)).slice(0, 4);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('repeat')}
          <h3>Hábitos</h3>
          <a href="#/habitos" class="widget-link">Ver todos</a>
        </div>
        <p class="widget-stat">${doneToday}/${habits.length} hoy</p>
        ${
          habits.length === 0
            ? '<p class="widget-empty">Sin hábitos todavía.</p>'
            : pending.length
              ? `<ul class="widget-list">${pending.map((h) => `<li>${escapeHtml(h.name)}</li>`).join('')}</ul>`
              : '<p class="widget-empty">Todos completados hoy.</p>'
        }
      `;
    },
  },
};
