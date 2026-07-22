import * as storage from '../../core/storage.js';
import { iconSvg } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { debounce } from '../../shared/utils/debounce.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { createTagPicker } from '../../shared/components/tag-picker.js';
import { tagBadgesHtml } from '../../shared/components/tag-badges.js';
import { loadTags } from '../../shared/tags.js';

const NAMESPACE = 'notas';

function loadNotes() {
  return storage.get(NAMESPACE, []);
}

function saveNotes(notes) {
  storage.set(NAMESPACE, notes);
}

function createNote(text, tagIds) {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), text, tagIds, createdAt: now, updatedAt: now };
}

function sortNotes(notes) {
  return [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function firstLine(text) {
  return text.split('\n')[0].slice(0, 80);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

let state = { notes: [], tagFilter: '' };
let els = {};
let tagPicker = null;
const persistDebounced = debounce(() => saveNotes(state.notes), 400);

function filteredNotes() {
  if (!state.tagFilter) return state.notes;
  return state.notes.filter((n) => (n.tagIds || []).includes(state.tagFilter));
}

function render() {
  const notes = sortNotes(filteredNotes());
  els.grid.innerHTML = '';

  if (notes.length === 0) {
    els.grid.innerHTML = state.tagFilter
      ? '<p class="notes-empty">Sin notas con esa etiqueta.</p>'
      : '<p class="notes-empty">Aún no tienes notas. Escribe la primera arriba.</p>';
    return;
  }

  for (const note of notes) {
    const card = document.createElement('div');
    card.className = 'card note-card';
    card.dataset.id = note.id;
    card.innerHTML = `
      <textarea class="note-textarea">${escapeHtml(note.text)}</textarea>
      ${tagBadgesHtml(note.tagIds)}
      <div class="note-footer">
        <span class="note-date">${formatDate(note.updatedAt)}</span>
        <button type="button" class="note-delete icon-button" aria-label="Eliminar nota">${iconSvg('trash')}</button>
      </div>
    `;
    els.grid.appendChild(card);
  }
}

function handleComposerSubmit(e) {
  e.preventDefault();
  const text = els.composerInput.value.trim();
  if (!text) return;
  const tagIds = tagPicker.getSelectedIds();
  state.notes.push(createNote(text, tagIds));
  els.composerInput.value = '';
  tagPicker.reset();
  saveNotes(state.notes);
  render();
}

function handleGridInput(e) {
  if (!e.target.matches('.note-textarea')) return;
  const card = e.target.closest('.note-card');
  const note = state.notes.find((n) => n.id === card.dataset.id);
  if (note) {
    note.text = e.target.value;
    note.updatedAt = new Date().toISOString();
    persistDebounced();
  }
}

function handleGridClick(e) {
  if (!e.target.closest('.note-delete')) return;
  const card = e.target.closest('.note-card');
  state.notes = state.notes.filter((n) => n.id !== card.dataset.id);
  saveNotes(state.notes);
  render();
}

function handleTagFilterChange() {
  state.tagFilter = els.tagFilter.value;
  render();
}

export default {
  id: 'notas',
  label: 'Notas rápidas',
  icon: 'notes',
  group: 'Productividad',
  route: '#/notas',

  mount(container) {
    loadModuleStyles('modules/notas/notas.css');

    state = { notes: loadNotes(), tagFilter: '' };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Notas rápidas</h1>
        <p class="view-subtitle">Escribe algo y se guarda solo. Haz clic en cualquier nota para editarla.</p>
      </div>

      <form class="note-composer">
        <textarea placeholder="Escribe una nota…" autocomplete="off"></textarea>
        <div class="tag-picker"></div>
        <div class="note-composer-actions">
          <select id="notas-tag-filter">
            <option value="">Todas las etiquetas</option>
            ${loadTags()
              .map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`)
              .join('')}
          </select>
          <button type="submit" class="btn-primary">Guardar nota</button>
        </div>
      </form>

      <div class="notes-grid"></div>
    `;

    els = {
      composer: container.querySelector('.note-composer'),
      composerInput: container.querySelector('.note-composer textarea'),
      grid: container.querySelector('.notes-grid'),
      tagFilter: container.querySelector('#notas-tag-filter'),
    };

    tagPicker = createTagPicker(els.composer.querySelector('.tag-picker'));

    els.composer.addEventListener('submit', handleComposerSubmit);
    els.grid.addEventListener('input', handleGridInput);
    els.grid.addEventListener('click', handleGridClick);
    els.tagFilter.addEventListener('change', handleTagFilterChange);

    render();
  },

  unmount() {
    els = {};
    tagPicker = null;
  },

  widget: {
    mount(container) {
      loadModuleStyles('modules/notas/notas.css');
      const notes = sortNotes(loadNotes());
      const recent = notes.slice(0, 3);

      container.innerHTML = `
        <div class="widget-header">
          ${iconSvg('notes')}
          <h3>Notas rápidas</h3>
          <a href="#/notas" class="widget-link">Ver todas</a>
        </div>
        <p class="widget-stat">${notes.length} nota${notes.length === 1 ? '' : 's'}</p>
        ${
          recent.length
            ? `<ul class="widget-list">${recent.map((n) => `<li>${escapeHtml(firstLine(n.text))}</li>`).join('')}</ul>`
            : '<p class="widget-empty">Sin notas todavía.</p>'
        }
      `;
    },
  },
};
