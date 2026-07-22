import { loadTags, saveTags, createTag, getPalette } from '../../shared/tags.js';
import { escapeHtml } from '../../shared/utils/dom.js';
import { iconSvg } from '../../shared/icons.js';
import { loadModuleStyles } from '../../shared/load-css.js';

let state = { tags: [] };
let els = {};

function render() {
  els.list.innerHTML = '';

  if (state.tags.length === 0) {
    els.list.innerHTML = '<p class="tags-empty">Aún no tienes etiquetas. Crea la primera arriba.</p>';
    return;
  }

  for (const tag of state.tags) {
    const row = document.createElement('div');
    row.className = 'card tag-row';
    row.dataset.id = tag.id;
    row.innerHTML = `
      <span class="tag-badge" style="--tag-color:${tag.color}">${escapeHtml(tag.label)}</span>
      <button type="button" class="tag-delete icon-button" aria-label="Eliminar etiqueta">${iconSvg('trash')}</button>
    `;
    els.list.appendChild(row);
  }
}

function persist() {
  saveTags(state.tags);
  render();
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = new FormData(els.form);
  const label = String(data.get('label') || '').trim();
  if (!label) return;
  const color = String(data.get('color') || getPalette()[0]);

  state.tags.push(createTag(label, color));
  els.form.reset();
  persist();
}

function handleListClick(e) {
  if (!e.target.closest('.tag-delete')) return;
  const row = e.target.closest('.tag-row');
  state.tags = state.tags.filter((t) => t.id !== row.dataset.id);
  persist();
}

export default {
  id: 'etiquetas',
  label: 'Etiquetas',
  icon: 'tag',
  group: 'Sistema',
  route: '#/etiquetas',

  mount(container) {
    loadModuleStyles('modules/etiquetas/etiquetas.css');
    state = { tags: loadTags() };

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Etiquetas</h1>
        <p class="view-subtitle">Etiquetas que puedes asignar en Tareas y Notas al crearlas.</p>
      </div>

      <form class="card tag-form">
        <input type="text" name="label" placeholder="Nombre de la etiqueta…" autocomplete="off" required />
        <div class="tag-color-picker">
          ${getPalette()
            .map(
              (c, i) => `
            <label class="tag-color-swatch" style="--tag-color:${c}">
              <input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''} />
            </label>
          `
            )
            .join('')}
        </div>
        <button type="submit" class="btn-primary">Crear etiqueta</button>
      </form>

      <div class="tag-list" id="tag-list"></div>
    `;

    els = {
      form: container.querySelector('.tag-form'),
      list: container.querySelector('#tag-list'),
    };

    els.form.addEventListener('submit', handleFormSubmit);
    els.list.addEventListener('click', handleListClick);

    render();
  },

  unmount() {
    els = {};
  },
};
