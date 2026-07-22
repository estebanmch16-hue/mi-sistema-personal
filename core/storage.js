// Adapter único de persistencia. Todos los módulos leen/escriben por su
// propio "namespace" y nunca tocan localStorage directamente. Esto es lo que
// permite migrar a IndexedDB (o a un backend) en el futuro sin tocar módulos.
const PREFIX = 'msp:';

function key(namespace) {
  return `${PREFIX}${namespace}`;
}

export function get(namespace, defaultValue = null) {
  const raw = localStorage.getItem(key(namespace));
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function set(namespace, value) {
  localStorage.setItem(key(namespace), JSON.stringify(value));
}

export function remove(namespace) {
  localStorage.removeItem(key(namespace));
}

function listNamespaces() {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

// Junta todos los namespaces existentes en un solo JSON exportable.
// Un módulo nuevo aparece aquí automáticamente: el core no sabe qué es
// "tareas" o "habitos", solo ve namespaces.
export function exportAll() {
  const data = {};
  for (const ns of listNamespaces()) {
    data[ns] = get(ns);
  }
  return { exportedAt: new Date().toISOString(), data };
}

export function importAll(payload) {
  if (!payload || typeof payload.data !== 'object') {
    throw new Error('Formato de respaldo inválido');
  }
  for (const [ns, value] of Object.entries(payload.data)) {
    set(ns, value);
  }
}

export function clearAll() {
  for (const ns of listNamespaces()) {
    remove(ns);
  }
}

export function getUsageBytes() {
  let total = 0;
  for (const ns of listNamespaces()) {
    total += key(ns).length + (localStorage.getItem(key(ns)) || '').length;
  }
  return total;
}
