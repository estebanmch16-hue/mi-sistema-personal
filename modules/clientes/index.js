import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';

const NAMESPACE = 'clientes';
// Lectura directa del namespace de Proyectos: integración entre 2 módulos
// específicos, no un servicio genérico (no se justifica con solo un caso).
const PROJECTS_NAMESPACE = 'proyectos';

function loadClients() {
  return storage.get(NAMESPACE, []);
}

function saveClients(clients) {
  storage.set(NAMESPACE, clients);
}

function createClient(name, email, phone, company, notes) {
  return { id: crypto.randomUUID(), name, email, phone, company, notes, createdAt: new Date().toISOString() };
}

function countActiveProjects(clientId) {
  const projects = storage.get(PROJECTS_NAMESPACE, []);
  return projects.filter((p) => p.clientId === clientId && p.status !== 'completado').length;
}

function sortByName(clients) {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function buildContactRow(client) {
  const row = document.createElement('div');
  row.className = 'client-contact';

  if (client.email) {
    const link = document.createElement('a');
    link.href = `mailto:${client.email}`;
    link.className = 'client-contact-item';
    link.textContent = client.email;
    row.appendChild(link);
  }

  if (client.phone) {
    const link = document.createElement('a');
    link.href = `tel:${client.phone.replace(/[^\d+]/g, '')}`;
    link.className = 'client-contact-item';
    link.textContent = client.phone;
    row.appendChild(link);
  }

  return row;
}

let state = { clients: [] };
let els = {};

function render() {
  const clients = sortByName(state.clients);
  els.list.innerHTML = '';

  if (clients.length === 0) {
    els.list.innerHTML = '<p class="client-empty">Aún no tienes clientes. Agrega el primero arriba.</p>';
    return;
  }

  for (const client of clients) {
    const activeProjects = countActiveProjects(client.id);

    const card = document.createElement('div');
    card.className = 'card client-card';
    card.dataset.id = client.id;

    const header = document.createElement('div');
    header.className = 'client-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'client-title-group';
    const nameEl = document.createElement('h3');
    nameEl.className = 'client-name';
    nameEl.textContent = client.name;
    titleGroup.appendChild(nameEl);
    if (client.company) {
      const companyEl = document.createElement('p');
      companyEl.className = 'client-company';
      companyEl.textContent = client.company;
      titleGroup.appendChild(companyEl);
    }
    header.appendChild(titleGroup);

    if (activeProjects > 0) {
      const badge = document.createElement('span');
      badge.className = 'client-projects-badge';
      badge.textContent = `${activeProjects} proyecto${activeProjects === 1 ? '' : 's'} activo${activeProjects === 1 ? '' : 's'}`;
      header.appendChild(badge);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'client-delete icon-button';
    deleteBtn.setAttribute('aria-label', 'Eliminar cliente');
    deleteBtn.innerHTML = iconSvg('trash');
    header.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(buildContactRow(client));

    if (client.notes) {
      const notesEl = document.createElement('p');
      notesEl.className = 'client-notes';
      notesEl.textContent = client.notes;
      card.appendChild(notesEl);
    }

    els.list.appendChild(card);
  }
}

function persist() {
  saveClients(state.clients);
  render();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const email = String(data.get('email') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const company = String(data.get('company') || '').trim();
  const notes = String(data.get('notes') || '').trim();

  state.clients.push(createClient(name, email, phone, company, notes));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  if (!e.target.closest('.client-delete')) return;
  const card = e.target.closest('.client-card');
  state.clients = state.clients.filter((c) => c.id !== card.dataset.id);
  persist();
}

export default {
  id: 'clientes',
  label: 'Clientes',
  icon: 'users',
  group: 'Trabajo',
  route: '#/clientes',

  mount(container) {
    loadModuleStyles('modules/clientes/clientes.css');
    state = { clients: loadClients() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Clientes</h1>
        <p class="view-subtitle">Datos de contacto y proyectos activos por cliente.</p>
      </div>

      <form class="card client-form">
        <input type="text" name="name" placeholder="Nombre…" autocomplete="off" required />
        <input type="text" name="company" placeholder="Empresa (opcional)" autocomplete="off" />
        <input type="email" name="email" placeholder="Email (opcional)" autocomplete="off" />
        <input type="tel" name="phone" placeholder="Teléfono (opcional)" autocomplete="off" />
        <input type="text" name="notes" placeholder="Notas (opcional)" autocomplete="off" />
        <button type="submit" class="btn-primary">Agregar</button>
      </form>

      <div class="client-list" id="client-list"></div>
    `;

    els = {
      form: container.querySelector('.client-form'),
      list: container.querySelector('#client-list'),
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
      loadModuleStyles('modules/clientes/clientes.css');
      const clients = loadClients();
      const withActive = clients
        .map((c) => ({ client: c, active: countActiveProjects(c.id) }))
        .filter((x) => x.active > 0)
        .sort((a, b) => b.active - a.active)
        .slice(0, 4);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('users')}
          <h3>Clientes</h3>
          <a href="#/clientes" class="widget-link">Ver todos</a>
        </div>
        <p class="widget-stat">${clients.length} cliente${clients.length === 1 ? '' : 's'}</p>
        ${
          withActive.length
            ? `<ul class="widget-list">${withActive
                .map((x) => `<li>${escapeHtml(x.client.name)} — ${x.active} proyecto${x.active === 1 ? '' : 's'}</li>`)
                .join('')}</ul>`
            : '<p class="widget-empty">Sin proyectos activos asignados.</p>'
        }
      `;
    },
  },
};
