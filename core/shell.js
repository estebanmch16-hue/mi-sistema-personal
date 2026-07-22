// Orquestador de la app: pinta el sidebar/topbar a partir del registro de
// módulos, conecta el router y el tema. No conoce a "tareas" ni a "habitos"
// por su nombre — solo itera sobre el contrato { id, label, icon, group,
// route, mount, unmount }.
import { initRouter } from './router.js';
import { initTheme, toggleTheme, getTheme } from './theme.js';
import { on } from './event-bus.js';
import { registerModule, getAllModules, getModuleByRoute } from './module-registry.js';
import { activeModules } from './modules.config.js';
import { roadmap } from './roadmap.js';
import { iconSvg } from '../shared/icons.js';
import { downloadBackup, importBackupFile } from './backup.js';

const navGroups = document.getElementById('nav-groups');
const topbarTitle = document.getElementById('topbar-title');
const viewOutlet = document.getElementById('view-outlet');
const themeToggleBtn = document.getElementById('theme-toggle');
const backupExportBtn = document.getElementById('backup-export');
const backupImportBtn = document.getElementById('backup-import');
const backupImportInput = document.getElementById('backup-import-input');

let activeModule = null;

function groupBy(modules) {
  const groups = new Map();
  for (const mod of modules) {
    const label = mod.group || 'General';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(mod);
  }
  return groups;
}

function renderSidebar() {
  navGroups.innerHTML = '';

  for (const [groupLabel, mods] of groupBy(getAllModules())) {
    const groupEl = document.createElement('div');
    groupEl.className = 'nav-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'nav-group-label';
    labelEl.textContent = groupLabel;
    groupEl.appendChild(labelEl);

    for (const mod of mods) {
      const link = document.createElement('a');
      link.className = 'nav-item';
      link.href = mod.route;
      link.dataset.route = mod.route;
      link.innerHTML = `${iconSvg(mod.icon)}<span>${mod.label}</span>`;
      groupEl.appendChild(link);
    }

    navGroups.appendChild(groupEl);
  }

  const roadmapGroup = document.createElement('div');
  roadmapGroup.className = 'nav-group';
  roadmapGroup.innerHTML = '<div class="nav-group-label">Próximamente</div>';

  for (const item of roadmap) {
    const entry = document.createElement('div');
    entry.className = 'nav-item is-disabled';
    entry.setAttribute('aria-disabled', 'true');
    const badge = item.version ? `<span class="nav-item-badge">${item.version}</span>` : '';
    entry.innerHTML = `${iconSvg(item.icon)}<span>${item.label}</span>${badge}`;
    roadmapGroup.appendChild(entry);
  }
  navGroups.appendChild(roadmapGroup);
}

function updateActiveNavItem(route) {
  navGroups.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.route === route);
  });
}

function renderRoute(route) {
  const mod = getModuleByRoute(route);

  activeModule?.unmount?.();
  viewOutlet.innerHTML = '';
  updateActiveNavItem(route);

  if (!mod) {
    viewOutlet.innerHTML = '<div class="card"><p>Módulo no encontrado.</p></div>';
    topbarTitle.textContent = 'Mi Sistema';
    activeModule = null;
    return;
  }

  topbarTitle.textContent = mod.label;
  mod.mount(viewOutlet);
  activeModule = mod;
}

function updateThemeIcon() {
  themeToggleBtn.innerHTML = iconSvg(getTheme() === 'dark' ? 'sun' : 'moon');
}

function wireThemeToggle() {
  themeToggleBtn.addEventListener('click', () => {
    toggleTheme();
    updateThemeIcon();
  });
  updateThemeIcon();
}

function wireBackupControls() {
  backupExportBtn.innerHTML = iconSvg('download');
  backupImportBtn.innerHTML = iconSvg('upload');

  backupExportBtn.addEventListener('click', downloadBackup);
  backupImportBtn.addEventListener('click', () => backupImportInput.click());

  backupImportInput.addEventListener('change', async () => {
    const file = backupImportInput.files[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Esto reemplazará tus datos actuales con los del archivo de respaldo. ¿Continuar?'
    );
    if (!confirmed) {
      backupImportInput.value = '';
      return;
    }

    try {
      await importBackupFile(file);
      window.location.reload();
    } catch (err) {
      window.alert('No se pudo importar el archivo: ' + err.message);
    } finally {
      backupImportInput.value = '';
    }
  });
}

function startApp() {
  activeModules.forEach(registerModule);

  initTheme();
  renderSidebar();
  wireThemeToggle();
  wireBackupControls();

  on('route:change', renderRoute);
  initRouter();
}

startApp();
