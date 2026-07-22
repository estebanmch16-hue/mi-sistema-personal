import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { createTagPicker } from '../../shared/components/tag-picker.js';
import { tagBadgesHtml } from '../../shared/components/tag-badges.js';
import { loadTags } from '../../shared/tags.js';

const NAMESPACE = 'tareas';
const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

function loadTasks() {
  return storage.get(NAMESPACE, []);
}

function saveTasks(tasks) {
  storage.set(NAMESPACE, tasks);
}

function createTask(title, priority, tagIds) {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title, priority, tagIds, done: false, createdAt: now, completedAt: null };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// --- Estado y render de la vista completa (mount) ---
let state = { tasks: [], filter: 'pendientes', tagFilter: '' };
let els = {};
let tagPicker = null;

function filteredTasks() {
  let tasks = state.tasks;
  if (state.filter === 'pendientes') tasks = tasks.filter((t) => !t.done);
  else if (state.filter === 'completadas') tasks = tasks.filter((t) => t.done);

  if (state.tagFilter) tasks = tasks.filter((t) => (t.tagIds || []).includes(state.tagFilter));
  return tasks;
}

function emptyMessage() {
  if (state.filter === 'completadas') return 'Aún no completas ninguna tarea.';
  if (state.filter === 'todas') return 'No tienes tareas todavía. Agrega la primera arriba.';
  return 'No tienes tareas pendientes.';
}

function render() {
  const tasks = sortTasks(filteredTasks());
  els.list.innerHTML = '';

  if (tasks.length === 0) {
    els.list.innerHTML = `<li class="task-empty">${emptyMessage()}</li>`;
  } else {
    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.id;
      li.innerHTML = `
        <label class="task-checkbox">
          <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Completar tarea" />
        </label>
        <span class="task-title ${task.done ? 'is-done' : ''}">${escapeHtml(task.title)}</span>
        ${tagBadgesHtml(task.tagIds)}
        <span class="task-priority priority-${task.priority}">${task.priority}</span>
        <button class="task-delete icon-button" type="button" aria-label="Eliminar tarea">${iconSvg('trash')}</button>
      `;
      els.list.appendChild(li);
    }
  }

  const pending = state.tasks.filter((t) => !t.done).length;
  els.counter.textContent = `${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`;
}

function persist() {
  saveTasks(state.tasks);
  render();
}

function handleSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const title = String(data.get('title') || '').trim();
  if (!title) return;
  const priority = String(data.get('priority') || 'media');
  const tagIds = tagPicker.getSelectedIds();
  state.tasks.push(createTask(title, priority, tagIds));
  els.form.reset();
  tagPicker.reset();
  persist();
}

function handleListClick(e) {
  const item = e.target.closest('.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.closest('.task-delete')) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    persist();
    return;
  }

  if (e.target.matches('input[type="checkbox"]')) {
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      task.done = e.target.checked;
      task.completedAt = task.done ? new Date().toISOString() : null;
      persist();
    }
  }
}

function handleFilterClick(e) {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  els.filters.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
  render();
}

function handleTagFilterChange() {
  state.tagFilter = els.tagFilter.value;
  render();
}

export default {
  id: 'tareas',
  label: 'Tareas',
  icon: 'tasks',
  group: 'Productividad',
  route: '#/tareas',

  mount(container) {
    loadModuleStyles('modules/tareas/tareas.css');

    state = { tasks: loadTasks(), filter: 'pendientes', tagFilter: '' };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Tareas</h1>
        <p class="view-subtitle" id="tareas-counter"></p>
      </div>

      <form class="task-form">
        <input type="text" name="title" placeholder="¿Qué necesitas hacer?" autocomplete="off" required />
        <select name="priority">
          <option value="alta">Alta</option>
          <option value="media" selected>Media</option>
          <option value="baja">Baja</option>
        </select>
        <button type="submit" class="btn-primary">Agregar</button>
        <div class="tag-picker"></div>
      </form>

      <div class="task-filters">
        <button type="button" class="btn-ghost is-active" data-filter="pendientes">Pendientes</button>
        <button type="button" class="btn-ghost" data-filter="completadas">Completadas</button>
        <button type="button" class="btn-ghost" data-filter="todas">Todas</button>
        <select id="tareas-tag-filter">
          <option value="">Todas las etiquetas</option>
          ${loadTags()
            .map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`)
            .join('')}
        </select>
      </div>

      <ul class="task-list"></ul>
    `;

    els = {
      form: container.querySelector('.task-form'),
      list: container.querySelector('.task-list'),
      filters: container.querySelector('.task-filters'),
      counter: container.querySelector('#tareas-counter'),
      tagFilter: container.querySelector('#tareas-tag-filter'),
    };

    tagPicker = createTagPicker(els.form.querySelector('.tag-picker'));

    els.form.addEventListener('submit', handleSubmit);
    els.list.addEventListener('click', handleListClick);
    els.filters.addEventListener('click', handleFilterClick);
    els.tagFilter.addEventListener('change', handleTagFilterChange);

    render();
  },

  unmount() {
    els = {};
    tagPicker = null;
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/tareas/tareas.css');
      const tasks = loadTasks();
      const pending = tasks.filter((t) => !t.done);
      const top = sortTasks(pending).slice(0, 4);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('tasks')}
          <h3>Tareas</h3>
          <a href="#/tareas" class="widget-link">Ver todas</a>
        </div>
        <p class="widget-stat">${pending.length} pendiente${pending.length === 1 ? '' : 's'}</p>
        ${
          top.length
            ? `<ul class="widget-list">${top.map((t) => `<li>${escapeHtml(t.title)}</li>`).join('')}</ul>`
            : '<p class="widget-empty">Sin tareas pendientes.</p>'
        }
      `;
    },
  },
};
