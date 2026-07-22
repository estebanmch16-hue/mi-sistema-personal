// Chips de solo lectura para mostrar las etiquetas de un ítem ya guardado.
import { findTags } from '../tags.js';
import { escapeHtml } from '../utils/dom.js';

export function tagBadgesHtml(tagIds) {
  const tags = findTags(tagIds);
  if (tags.length === 0) return '';
  return `<span class="tag-badges">${tags
    .map((t) => `<span class="tag-badge" style="--tag-color:${t.color}">${escapeHtml(t.label)}</span>`)
    .join('')}</span>`;
}
