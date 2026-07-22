// Dashboard: no conoce a "tareas" ni a "notas" por nombre. Solo pide a
// module-registry los módulos que exponen widget.mount() y les da un
// contenedor con la apariencia estándar (.card.widget-card).
import { getModulesWithWidget } from '../../core/module-registry.js';

export default {
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'dashboard',
  group: 'Principal',
  route: '#/dashboard',

  mount(container) {
    const widgetModules = getModulesWithWidget();

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Dashboard</h1>
        <p class="view-subtitle">Un vistazo rápido a tu día.</p>
      </div>
      <div class="widget-grid"></div>
    `;

    const grid = container.querySelector('.widget-grid');

    if (widgetModules.length === 0) {
      grid.innerHTML = '<p class="view-subtitle">Aún no hay módulos con widgets.</p>';
      return;
    }

    for (const mod of widgetModules) {
      const card = document.createElement('div');
      card.className = 'card widget-card';
      grid.appendChild(card);
      mod.widget.mount(card);
    }
  },

  unmount() {},
};
