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
import clientes from '../modules/clientes/index.js';
import configuracion from '../modules/configuracion/index.js';
import objetivos from '../modules/objetivos/index.js';
import progreso from '../modules/progreso/index.js';
import etiquetas from '../modules/etiquetas/index.js';

export const activeModules = [
  dashboard,
  progreso,
  tareas,
  notas,
  agenda,
  habitos,
  enfoque,
  finanzas,
  proyectos,
  biblioteca,
  clientes,
  configuracion,
  objetivos,
  etiquetas,
];
