// Único archivo que "conoce" qué módulos existen. Añadir un módulo nuevo en
// el futuro = crear su carpeta + agregar una línea aquí. Nada más en /core
// cambia.
import dashboard from '../modules/dashboard/index.js';
import tareas from '../modules/tareas/index.js';
import notas from '../modules/notas/index.js';
import agenda from '../modules/agenda/index.js';
import habitos from '../modules/habitos/index.js';
import enfoque from '../modules/enfoque/index.js';
import finanzas from '../modules/finanzas/index.js';
import proyectos from '../modules/proyectos/index.js';
import biblioteca from '../modules/biblioteca/index.js';

export const activeModules = [dashboard, tareas, notas, agenda, habitos, enfoque, finanzas, proyectos, biblioteca];
