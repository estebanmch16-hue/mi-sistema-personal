import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { loadModuleStyles } from '../../shared/load-css.js';

const NAMESPACE = 'biblioteca';

function loadDocuments() {
  return storage.get(NAMESPACE, []);
}

function saveDocuments(docs) {
  storage.set(NAMESPACE, docs);
}

function createDocument(title, url, category, notes) {
  return {
    id: crypto.randomUUID(),
    title,
    url,
    category: category || 'General',
    notes,
    createdAt: new Date().toISOString(),
  };
}

// El título se inserta con textContent (nunca innerHTML), pero el enlace es
// distinto: un <a href="..."> necesita la URL validada, porque un usuario
// podría pegar "javascript:..." y convertir el link en un vector de XSS
// contra sí mismo. Si no reconocemos la URL como http(s)/mailto/ruta local,
// no se convierte en enlace clicable.
function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function sortByRecent(docs) {
  return [...docs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function matchesFilter(doc, query) {
  if (!query) return true;
  const haystack = `${doc.title} ${doc.category} ${doc.notes}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

let state = { documents: [], filterQuery: '' };
let els = {};

function render() {
  const visible = sortByRecent(state.documents).filter((d) => matchesFilter(d, state.filterQuery));
  els.list.innerHTML = '';

  if (visible.length === 0) {
    els.list.innerHTML =
      state.documents.length === 0
        ? '<p class="library-empty">Aún no tienes documentos. Agrega el primero arriba.</p>'
        : '<p class="library-empty">Sin resultados para tu búsqueda.</p>';
    return;
  }

  for (const doc of visible) {
    const card = document.createElement('div');
    card.className = 'card library-item';
    card.dataset.id = doc.id;

    const header = document.createElement('div');
    header.className = 'library-item-header';

    const safeUrl = normalizeUrl(doc.url);
    const titleEl = document.createElement(safeUrl ? 'a' : 'span');
    titleEl.className = 'library-item-title';
    titleEl.textContent = doc.title;
    if (safeUrl) {
      titleEl.href = safeUrl;
      titleEl.target = '_blank';
      titleEl.rel = 'noopener noreferrer';
    } else {
      titleEl.classList.add('is-plain');
      titleEl.title = 'Enlace no reconocido como URL válida';
    }

    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'library-item-category';
    categoryBadge.textContent = doc.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'library-delete icon-button';
    deleteBtn.setAttribute('aria-label', 'Eliminar documento');
    deleteBtn.innerHTML = iconSvg('trash');

    header.append(titleEl, categoryBadge, deleteBtn);
    card.appendChild(header);

    if (doc.notes) {
      const notes = document.createElement('p');
      notes.className = 'library-item-notes';
      notes.textContent = doc.notes;
      card.appendChild(notes);
    }

    els.list.appendChild(card);
  }
}

function persist() {
  saveDocuments(state.documents);
  render();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const title = String(data.get('title') || '').trim();
  const url = String(data.get('url') || '').trim();
  if (!title || !url) return;
  const category = String(data.get('category') || '').trim();
  const notes = String(data.get('notes') || '').trim();

  state.documents.push(createDocument(title, url, category, notes));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  if (!e.target.closest('.library-delete')) return;
  const card = e.target.closest('.library-item');
  state.documents = state.documents.filter((d) => d.id !== card.dataset.id);
  persist();
}

function handleFilterInput() {
  state.filterQuery = els.filter.value;
  render();
}

export default {
  id: 'biblioteca',
  label: 'Biblioteca',
  icon: 'book',
  group: 'Trabajo',
  route: '#/biblioteca',

  mount(container) {
    loadModuleStyles('modules/biblioteca/biblioteca.css');
    state = { documents: loadDocuments(), filterQuery: '' };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Biblioteca</h1>
        <p class="view-subtitle">Guarda enlaces a tus documentos, planos, contratos y referencias.</p>
      </div>

      <form class="card library-form">
        <input type="text" name="title" placeholder="Título…" autocomplete="off" required />
        <input type="text" name="url" placeholder="Enlace o ruta (ej. https://drive.google.com/…)" autocomplete="off" required />
        <input type="text" name="category" placeholder="Categoría (opcional)" autocomplete="off" />
        <input type="text" name="notes" placeholder="Notas (opcional)" autocomplete="off" />
        <button type="submit" class="btn-primary">Agregar</button>
      </form>

      <input type="text" class="library-filter" id="library-filter" placeholder="Buscar en tu biblioteca…" autocomplete="off" />

      <div class="library-list" id="library-list"></div>
    `;

    els = {
      form: container.querySelector('.library-form'),
      filter: container.querySelector('#library-filter'),
      list: container.querySelector('#library-list'),
    };

    els.form.addEventListener('submit', handleFormSubmit);
    els.list.addEventListener('click', handleListClick);
    els.filter.addEventListener('input', handleFilterInput);

    render();
  },

  unmount() {
    els = {};
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/biblioteca/biblioteca.css');
      const docs = loadDocuments();
      const recent = sortByRecent(docs).slice(0, 3);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('book')}
          <h3>Biblioteca</h3>
          <a href="#/biblioteca" class="widget-link">Ver todo</a>
        </div>
        <p class="widget-stat">${docs.length} documento${docs.length === 1 ? '' : 's'}</p>
        ${
          recent.length
            ? `<ul class="widget-list">${recent.map((d) => `<li>${escapeHtml(d.title)}</li>`).join('')}</ul>`
            : '<p class="widget-empty">Sin documentos todavía.</p>'
        }
      `;
    },
  },
};
