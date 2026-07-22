// Único archivo que "conoce" qué módulos existen. Añadir un módulo nuevo en
// el futuro = crear su carpeta + agregar una línea aquí. Nada más en /core
// cambia.
import dashboard from '../modules/dashboard/index.js';
import tareas from '../modules/tareas/index.js';
import notas from '../modules/notas/index.js';

export const activeModules = [dashboard, tareas, notas];
