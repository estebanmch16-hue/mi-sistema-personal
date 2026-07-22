// Registro de módulos activos. El core solo conoce el contrato
// { id, label, icon, group, route, mount, unmount, widget?, search? } —
// nunca lógica específica de "tareas" o "habitos".
const modules = new Map();

export function registerModule(module) {
  if (!module?.id || !module?.route || typeof module.mount !== 'function') {
    throw new Error('Un módulo debe tener al menos { id, route, mount() }');
  }
  modules.set(module.route, module);
}

export function getModuleByRoute(route) {
  return modules.get(route);
}

export function getAllModules() {
  return Array.from(modules.values());
}

export function getModulesWithWidget() {
  return getAllModules().filter((m) => typeof m.widget?.mount === 'function');
}

export function getModulesWithSearch() {
  return getAllModules().filter((m) => typeof m.search?.index === 'function');
}
