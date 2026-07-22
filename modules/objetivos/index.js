import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { todayISO } from '../../shared/utils/dates.js';

const NAMESPACE = 'objetivos';

function loadGoals() {
  return storage.get(NAMESPACE, []);
}

function saveGoals(goals) {
  storage.set(NAMESPACE, goals);
}

function createGoal(title, description, target, unit, targetDate) {
  return {
    id: crypto.randomUUID(),
    title,
    description,
    target,
    current: 0,
    unit,
    targetDate: targetDate || null,
    createdAt: new Date().toISOString(),
  };
}

function computeProgress(goal) {
  if (!goal.target || goal.target <= 0) return 0;
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

function isCompleted(goal) {
  return goal.current >= goal.target;
}

function formatAmount(value, unit) {
  const formatted = value.toLocaleString('es');
  return unit ? `${formatted} ${unit}` : formatted;
}

function dateLabel(targetDate) {
  if (!targetDate) return null;
  const diff = Math.round(
    (new Date(`${targetDate}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 86400000
  );
  if (diff > 0) return `Vence en ${diff} día${diff === 1 ? '' : 's'}`;
  if (diff === 0) return 'Vence hoy';
  return `Venció hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'}`;
}

let state = { goals: [] };
let els = {};

function render() {
  els.list.innerHTML = '';

  if (state.goals.length === 0) {
    els.list.innerHTML = '<p class="goal-empty">Aún no tienes objetivos. Crea el primero arriba.</p>';
    return;
  }

  for (const goal of state.goals) {
    const progress = computeProgress(goal);
    const completed = isCompleted(goal);
    const dLabel = dateLabel(goal.targetDate);

    const card = document.createElement('div');
    card.className = 'card goal-card';
    card.dataset.id = goal.id;
    card.innerHTML = `
      <div class="goal-header">
        <div class="goal-title-group">
          <h3 class="goal-name">${escapeHtml(goal.title)}</h3>
          ${goal.description ? `<p class="goal-description">${escapeHtml(goal.description)}</p>` : ''}
        </div>
        ${
          completed
            ? '<span class="goal-status status-completado">Completado</span>'
            : dLabel
              ? `<span class="goal-date">${dLabel}</span>`
              : ''
        }
        <button type="button" class="goal-delete icon-button" aria-label="Eliminar objetivo">${iconSvg('trash')}</button>
      </div>

      <div class="goal-progress">
        <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${progress}%"></div></div>
        <span class="goal-progress-label">${formatAmount(goal.current, goal.unit)} / ${formatAmount(goal.target, goal.unit)}</span>
      </div>

      ${
        completed
          ? ''
          : `<form class="goal-progress-form">
              <input type="number" name="delta" placeholder="Agregar avance…" step="any" required />
              <button type="submit" class="btn-ghost">Agregar</button>
            </form>`
      }
    `;
    els.list.appendChild(card);
  }
}

function persist() {
  saveGoals(state.goals);
  render();
}

function handleCreateSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const title = String(data.get('title') || '').trim();
  if (!title) return;
  const target = Number(data.get('target'));
  if (!target || target <= 0) return;
  const description = String(data.get('description') || '').trim();
  const unit = String(data.get('unit') || '').trim();
  const targetDate = String(data.get('targetDate') || '') || null;

  state.goals.push(createGoal(title, description, target, unit, targetDate));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  if (!e.target.closest('.goal-delete')) return;
  const card = e.target.closest('.goal-card');
  state.goals = state.goals.filter((g) => g.id !== card.dataset.id);
  persist();
}

function handleListSubmit(e) {
  const form = e.target.closest('.goal-progress-form');
  if (!form) return;
  e.preventDefault();
  const card = e.target.closest('.goal-card');
  const goal = state.goals.find((g) => g.id === card.dataset.id);
  const input = form.querySelector('[name="delta"]');
  const delta = Number(input.value);
  if (!delta) return;
  goal.current = Math.max(0, goal.current + delta);
  persist();
}

export default {
  id: 'objetivos',
  label: 'Objetivos',
  icon: 'target',
  group: 'Productividad',
  route: '#/objetivos',

  mount(container) {
    loadModuleStyles('modules/objetivos/objetivos.css');
    state = { goals: loadGoals() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Objetivos</h1>
        <p class="view-subtitle">Metas medibles con progreso acumulado.</p>
      </div>

      <form class="card goal-form">
        <input type="text" name="title" placeholder="Objetivo…" autocomplete="off" required />
        <input type="text" name="description" placeholder="Descripción (opcional)" autocomplete="off" />
        <input type="number" name="target" placeholder="Meta (ej. 5000)" step="any" min="0.01" required />
        <input type="text" name="unit" placeholder="Unidad (opcional: $, km, libros…)" autocomplete="off" />
        <input type="date" name="targetDate" />
        <button type="submit" class="btn-primary">Crear objetivo</button>
      </form>

      <div class="goal-list" id="goal-list"></div>
    `;

    els = {
      form: container.querySelector('.goal-form'),
      list: container.querySelector('#goal-list'),
    };

    els.form.addEventListener('submit', handleCreateSubmit);
    els.list.addEventListener('click', handleListClick);
    els.list.addEventListener('submit', handleListSubmit);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/objetivos/objetivos.css');
      const goals = loadGoals();
      const active = goals.filter((g) => !isCompleted(g));

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('target')}
          <h3>Objetivos</h3>
          <a href="#/objetivos" class="widget-link">Ver todos</a>
        </div>
        <p class="widget-stat">${active.length} activo${active.length === 1 ? '' : 's'}</p>
        ${
          active.length
            ? `<ul class="widget-list">${active
                .slice(0, 4)
                .map((g) => `<li>${escapeHtml(g.title)} — ${computeProgress(g)}%</li>`)
                .join('')}</ul>`
            : '<p class="widget-empty">Sin objetivos activos.</p>'
        }
      `;
    },
  },
};
