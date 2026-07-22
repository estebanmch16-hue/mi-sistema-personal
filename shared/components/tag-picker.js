// Selector interactivo de etiquetas para formularios de creación. Toma un
// contenedor vacío, lo llena con chips toggle-ables (snapshot del catálogo
// al momento de montar, igual que el <select> de cliente en Proyectos) y
// devuelve un getter de los ids seleccionados + un reset tras crear el ítem.
import { loadTags } from '../tags.js';
import { escapeHtml } from '../utils/dom.js';

export function createTagPicker(container) {
  const tags = loadTags();
  const selected = new Set();

  container.innerHTML =
    tags.length === 0
      ? '<span class="tag-picker-empty">Sin etiquetas — créalas en Etiquetas.</span>'
      : tags
          .map(
            (t) =>
              `<button type="button" class="tag-picker-chip" data-tag-id="${t.id}" style="--tag-color:${t.color}">${escapeHtml(t.label)}</button>`
          )
          .join('');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-picker-chip');
    if (!btn) return;
    const id = btn.dataset.tagId;
    if (selected.has(id)) {
      selected.delete(id);
      btn.classList.remove('is-selected');
    } else {
      selected.add(id);
      btn.classList.add('is-selected');
    }
  });

  return {
    getSelectedIds: () => Array.from(selected),
    reset() {
      selected.clear();
      container.querySelectorAll('.tag-picker-chip.is-selected').forEach((b) => b.classList.remove('is-selected'));
    },
  };
}
