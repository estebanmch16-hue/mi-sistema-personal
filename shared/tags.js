// Catálogo compartido de etiquetas. Cualquier módulo puede guardar
// `tagIds: []` en sus propios ítems y usar findTags() para mostrarlas —
// este archivo es el único que sabe dónde viven las etiquetas.
import * as storage from '../core/storage.js';

const NAMESPACE = 'tags';
const PALETTE = ['#635bff', '#e5484d', '#f5a623', '#30a46c', '#0ea5e9', '#a855f7', '#ec4899', '#64748b'];

export function loadTags() {
  return storage.get(NAMESPACE, []);
}

export function saveTags(tags) {
  storage.set(NAMESPACE, tags);
}

export function createTag(label, color) {
  return { id: crypto.randomUUID(), label, color };
}

export function getPalette() {
  return PALETTE;
}

export function findTags(tagIds) {
  if (!tagIds || tagIds.length === 0) return [];
  const all = loadTags();
  return tagIds.map((id) => all.find((t) => t.id === id)).filter(Boolean);
}
