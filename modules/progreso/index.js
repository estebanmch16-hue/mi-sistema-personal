// Panel de progreso: no es dueño de ningún dato propio. Lee directamente
// los namespaces de otros módulos (solo lectura) para armar un resumen
// agregado. Es la integración cruzada más amplia del sistema — por eso
// cada métrica vive en su propia función, nombrada por el módulo que lee.
import * as storage from '../../core/storage.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { todayISO, computeStreak } from '../../shared/utils/dates.js';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function getTareasStats() {
  const tareas = storage.get('tareas', []);
  const total = tareas.length;
  const completadas = tareas.filter((t) => t.done).length;
  const rate = total === 0 ? 0 : Math.round((completadas / total) * 100);
  return { total, completadas, rate };
}

function getHabitosStats() {
  const habitos = storage.get('habitos', []);
  const today = todayISO();
  const total = habitos.length;
  const hoyCompletados = habitos.filter((h) => h.completions.includes(today)).length;
  const avgStreak =
    total === 0 ? 0 : Math.round(habitos.reduce((sum, h) => sum + computeStreak(h.completions), 0) / total);
  const hoyRate = total === 0 ? 0 : Math.round((hoyCompletados / total) * 100);
  return { total, hoyCompletados, avgStreak, hoyRate };
}

function computeProjectProgress(project) {
  if (!project.tasks || project.tasks.length === 0) return 0;
  const done = project.tasks.filter((t) => t.done).length;
  return Math.round((done / project.tasks.length) * 100);
}

function getProyectosStats() {
  const proyectos = storage.get('proyectos', []);
  const activos = proyectos.filter((p) => p.status !== 'completado');
  const avgProgress =
    activos.length === 0
      ? 0
      : Math.round(activos.reduce((sum, p) => sum + computeProjectProgress(p), 0) / activos.length);
  return { total: proyectos.length, activos: activos.length, completados: proyectos.length - activos.length, avgProgress };
}

function getObjetivosStats() {
  const objetivos = storage.get('objetivos', []);
  const activos = objetivos.filter((g) => g.current < g.target);
  const avgProgress =
    activos.length === 0
      ? 0
      : Math.round(
          activos.reduce((sum, g) => sum + (g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0), 0) /
            activos.length
        );
  return { total: objetivos.length, activos: activos.length, completados: objetivos.length - activos.length, avgProgress };
}

function getFinanzasStats() {
  const transacciones = storage.get('finanzas', []);
  const currentMonth = todayISO().slice(0, 7);
  let balance = 0;
  let monthNet = 0;
  for (const t of transacciones) {
    const signed = t.type === 'ingreso' ? t.amount : -t.amount;
    balance += signed;
    if (t.date.slice(0, 7) === currentMonth) monthNet += signed;
  }
  return { balance, monthNet };
}

function getAgendaStats() {
  const eventos = storage.get('agenda', []);
  const today = todayISO();
  return { proximos: eventos.filter((e) => e.date >= today).length };
}

export default {
  id: 'progreso',
  label: 'Progreso',
  icon: 'bar-chart',
  group: 'Principal',
  route: '#/progreso',

  mount(container) {
    loadModuleStyles('modules/progreso/progreso.css');

    const tareas = getTareasStats();
    const habitos = getHabitosStats();
    const proyectos = getProyectosStats();
    const objetivos = getObjetivosStats();
    const finanzas = getFinanzasStats();
    const agenda = getAgendaStats();

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Progreso</h1>
        <p class="view-subtitle">Un vistazo agregado a todos tus módulos.</p>
      </div>

      <div class="stats-grid">
        <div class="card stats-tile">
          <span class="stats-tile-label">Tareas completadas</span>
          <span class="stats-tile-value">${tareas.completadas} / ${tareas.total}</span>
          <div class="stats-bar"><div class="stats-bar-fill" style="width:${tareas.rate}%"></div></div>
        </div>

        <div class="card stats-tile">
          <span class="stats-tile-label">Hábitos hoy</span>
          <span class="stats-tile-value">${habitos.hoyCompletados} / ${habitos.total}</span>
          <div class="stats-bar"><div class="stats-bar-fill" style="width:${habitos.hoyRate}%"></div></div>
          <span class="stats-tile-hint">Racha promedio: ${habitos.avgStreak} día${habitos.avgStreak === 1 ? '' : 's'}</span>
        </div>

        <div class="card stats-tile">
          <span class="stats-tile-label">Proyectos activos</span>
          <span class="stats-tile-value">${proyectos.activos}</span>
          <div class="stats-bar"><div class="stats-bar-fill" style="width:${proyectos.avgProgress}%"></div></div>
          <span class="stats-tile-hint">Progreso promedio: ${proyectos.avgProgress}% · ${proyectos.completados} completados</span>
        </div>

        <div class="card stats-tile">
          <span class="stats-tile-label">Objetivos activos</span>
          <span class="stats-tile-value">${objetivos.activos}</span>
          <div class="stats-bar"><div class="stats-bar-fill" style="width:${objetivos.avgProgress}%"></div></div>
          <span class="stats-tile-hint">Progreso promedio: ${objetivos.avgProgress}% · ${objetivos.completados} completados</span>
        </div>

        <div class="card stats-tile">
          <span class="stats-tile-label">Balance total</span>
          <span class="stats-tile-value ${finanzas.balance >= 0 ? 'is-income' : 'is-expense'}">${formatCurrency(finanzas.balance)}</span>
          <span class="stats-tile-hint">Neto este mes: ${finanzas.monthNet >= 0 ? '+' : ''}${formatCurrency(finanzas.monthNet)}</span>
        </div>

        <div class="card stats-tile">
          <span class="stats-tile-label">Eventos próximos</span>
          <span class="stats-tile-value">${agenda.proximos}</span>
        </div>
      </div>
    `;
  },

  unmount() {},
};
