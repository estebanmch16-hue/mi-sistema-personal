import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';

const NAMESPACE = 'proyectos';
// Lectura directa del namespace de Clientes: integración entre 2 módulos
// específicos, ver nota equivalente en modules/clientes/index.js.
const CLIENTS_NAMESPACE = 'clientes';
const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado',
};

function loadProjects() {
  return storage.get(NAMESPACE, []);
}

function saveProjects(projects) {
  storage.set(NAMESPACE, projects);
}

function loadClients() {
  return storage.get(CLIENTS_NAMESPACE, []);
}

function findClientName(clientId) {
  if (!clientId) return null;
  const client = loadClients().find((c) => c.id === clientId);
  return client ? client.name : null;
}

function createProject(name, description, clientId) {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    clientId: clientId || null,
    status: 'pendiente',
    tasks: [],
    createdAt: new Date().toISOString(),
  };
}

function createTask(title) {
  return { id: crypto.randomUUID(), title, done: false };
}

function computeProgress(project) {
  if (project.tasks.length === 0) return 0;
  const done = project.tasks.filter((t) => t.done).length;
  return Math.round((done / project.tasks.length) * 100);
}

// El estado se deriva del checklist, no se edita a mano: evita que quede
// desincronizado del progreso real. Un proyecto sin tareas queda "pendiente".
function syncStatusFromProgress(project) {
  if (project.tasks.length === 0) return;
  const progress = computeProgress(project);
  if (progress === 100) project.status = 'completado';
  else if (progress > 0) project.status = 'en_progreso';
  else project.status = 'pendiente';
}

let state = { projects: [] };
let els = {};

function findProject(id) {
  return state.projects.find((p) => p.id === id);
}

function render() {
  els.list.innerHTML = '';

  if (state.projects.length === 0) {
    els.list.innerHTML = '<p class="project-empty">Aún no tienes proyectos. Crea el primero arriba.</p>';
    return;
  }

  for (const project of state.projects) {
    const progress = computeProgress(project);
    const clientName = findClientName(project.clientId);

    const card = document.createElement('div');
    card.className = 'card project-card';
    card.dataset.id = project.id;
    card.innerHTML = `
      <div class="project-header">
        <div class="project-title-group">
          <h3 class="project-name">${escapeHtml(project.name)}</h3>
          ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}
        </div>
        ${clientName ? `<span class="project-client-badge">${escapeHtml(clientName)}</span>` : ''}
        <span class="project-status status-${project.status}">${STATUS_LABELS[project.status]}</span>
        <button type="button" class="project-delete icon-button" aria-label="Eliminar proyecto">${iconSvg('trash')}</button>
      </div>

      <div class="project-progress">
        <div class="project-progress-bar"><div class="project-progress-fill" style="width:${progress}%"></div></div>
        <span class="project-progress-label">${progress}%</span>
      </div>

      <ul class="project-tasks">
        ${project.tasks
          .map(
            (t) => `
          <li class="project-task" data-task-id="${t.id}">
            <label class="project-task-checkbox"><input type="checkbox" ${t.done ? 'checked' : ''} /></label>
            <span class="project-task-title ${t.done ? 'is-done' : ''}">${escapeHtml(t.title)}</span>
            <button type="button" class="project-task-delete icon-button" aria-label="Eliminar tarea">${iconSvg('trash')}</button>
          </li>
        `
          )
          .join('')}
      </ul>

      <form class="project-task-form">
        <input type="text" name="title" placeholder="Nueva tarea del proyecto…" autocomplete="off" required />
        <button type="submit" class="btn-ghost">Agregar</button>
      </form>
    `;
    els.list.appendChild(card);
  }
}

function persist() {
  saveProjects(state.projects);
  render();
}

function handleCreateSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const description = String(data.get('description') || '').trim();
  const clientId = String(data.get('clientId') || '') || null;
  state.projects.push(createProject(name, description, clientId));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  const card = e.target.closest('.project-card');
  if (!card) return;
  const project = findProject(card.dataset.id);
  if (!project) return;

  if (e.target.closest('.project-delete')) {
    state.projects = state.projects.filter((p) => p.id !== project.id);
    persist();
    return;
  }

  const taskItem = e.target.closest('.project-task');
  if (taskItem && e.target.closest('.project-task-delete')) {
    project.tasks = project.tasks.filter((t) => t.id !== taskItem.dataset.taskId);
    syncStatusFromProgress(project);
    persist();
  }
}

function handleListChange(e) {
  if (!e.target.matches('input[type="checkbox"]')) return;
  const card = e.target.closest('.project-card');
  const taskItem = e.target.closest('.project-task');
  const project = findProject(card.dataset.id);
  const task = project.tasks.find((t) => t.id === taskItem.dataset.taskId);
  task.done = e.target.checked;
  syncStatusFromProgress(project);
  persist();
}

function handleListSubmit(e) {
  const form = e.target.closest('.project-task-form');
  if (!form) return;
  e.preventDefault();
  const card = e.target.closest('.project-card');
  const project = findProject(card.dataset.id);
  const input = form.querySelector('input[name="title"]');
  const title = input.value.trim();
  if (!title) return;
  project.tasks.push(createTask(title));
  syncStatusFromProgress(project);
  persist();
}

export default {
  id: 'proyectos',
  label: 'Proyectos',
  icon: 'briefcase',
  group: 'Trabajo',
  route: '#/proyectos',

  mount(container) {
    loadModuleStyles('modules/proyectos/proyectos.css');
    state = { projects: loadProjects() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Proyectos</h1>
        <p class="view-subtitle">Organiza tus proyectos con checklist y progreso automático.</p>
      </div>

      <form class="card project-form">
        <input type="text" name="name" placeholder="Nombre del proyecto…" autocomplete="off" required />
        <input type="text" name="description" placeholder="Descripción (opcional)" autocomplete="off" />
        <select name="clientId">
          <option value="">Sin cliente</option>
          ${loadClients()
            .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
            .join('')}
        </select>
        <button type="submit" class="btn-primary">Crear proyecto</button>
      </form>

      <div class="project-list" id="project-list"></div>
    `;

    els = {
      form: container.querySelector('.project-form'),
      list: container.querySelector('#project-list'),
    };

    els.form.addEventListener('submit', handleCreateSubmit);
    els.list.addEventListener('click', handleListClick);
    els.list.addEventListener('change', handleListChange);
    els.list.addEventListener('submit', handleListSubmit);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/proyectos/proyectos.css');
      const projects = loadProjects();
      const active = projects.filter((p) => p.status !== 'completado');

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('briefcase')}
          <h3>Proyectos</h3>
          <a href="#/proyectos" class="widget-link">Ver todos</a>
        </div>
        <p class="widget-stat">${active.length} activo${active.length === 1 ? '' : 's'}</p>
        ${
          active.length
            ? `<ul class="widget-list">${active
                .slice(0, 4)
                .map((p) => `<li>${escapeHtml(p.name)} — ${computeProgress(p)}%</li>`)
                .join('')}</ul>`
            : '<p class="widget-empty">Sin proyectos activos.</p>'
        }
      `;
    },
  },
};
