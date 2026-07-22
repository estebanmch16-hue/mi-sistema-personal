import { getThemePreference, setThemePreference } from '../../core/theme.js';
import { downloadBackup, importBackupFile } from '../../core/backup.js';
import * as storage from '../../core/storage.js';
import { loadModuleStyles } from '../../shared/load-css.js';
import { getAllModules } from '../../core/module-registry.js';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

let els = {};

function renderThemeButtons() {
  const current = getThemePreference();
  els.themeButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.theme === current));
}

function handleThemeClick(e) {
  const btn = e.target.closest('[data-theme]');
  if (!btn) return;
  setThemePreference(btn.dataset.theme);
  renderThemeButtons();
}

function handleImportChange() {
  const file = els.importInput.files[0];
  if (!file) return;

  const confirmed = window.confirm(
    'Esto reemplazará tus datos actuales con los del archivo de respaldo. ¿Continuar?'
  );
  if (!confirmed) {
    els.importInput.value = '';
    return;
  }

  importBackupFile(file)
    .then(() => window.location.reload())
    .catch((err) => window.alert('No se pudo importar el archivo: ' + err.message))
    .finally(() => {
      els.importInput.value = '';
    });
}

function handleClearAll() {
  const confirmed = window.confirm(
    'Esto borra PERMANENTEMENTE todos tus datos (tareas, notas, agenda, hábitos, finanzas, ' +
      'proyectos, biblioteca, clientes) guardados en este navegador. No se puede deshacer. ' +
      '¿Seguro que quieres continuar?'
  );
  if (!confirmed) return;
  storage.clearAll();
  window.location.reload();
}

export default {
  id: 'configuracion',
  label: 'Configuración',
  icon: 'settings',
  group: 'Sistema',
  route: '#/configuracion',

  mount(container) {
    loadModuleStyles('modules/configuracion/configuracion.css');

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Configuración</h1>
        <p class="view-subtitle">Apariencia, respaldo de datos e información del sistema.</p>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section-title">Apariencia</h2>
        <div class="settings-theme-toggle">
          <button type="button" class="btn-ghost" data-theme="light">Claro</button>
          <button type="button" class="btn-ghost" data-theme="dark">Oscuro</button>
          <button type="button" class="btn-ghost" data-theme="system">Sistema</button>
        </div>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section-title">Datos</h2>
        <p class="settings-hint">Tus datos viven solo en este navegador. Exporta seguido para tener un respaldo.</p>
        <div class="settings-actions">
          <button type="button" class="btn-primary" id="settings-export">Exportar respaldo (.json)</button>
          <button type="button" class="btn-ghost" id="settings-import">Importar respaldo</button>
          <input type="file" id="settings-import-input" accept="application/json" hidden />
        </div>
        <p class="settings-hint">Uso actual de almacenamiento: <strong>${formatBytes(storage.getUsageBytes())}</strong></p>

        <div class="settings-danger-zone">
          <div>
            <p class="settings-danger-title">Borrar todos los datos</p>
            <p class="settings-hint">Elimina permanentemente todo lo guardado en este navegador.</p>
          </div>
          <button type="button" class="btn-danger" id="settings-clear-all">Borrar todo</button>
        </div>
      </div>

      <div class="card settings-section">
        <h2 class="settings-section-title">Acerca de</h2>
        <p class="settings-hint">Mi Sistema Personal — ${getAllModules().length} módulos activos.</p>
        <a class="settings-link" href="https://github.com/estebanmch16-hue/mi-sistema-personal" target="_blank" rel="noopener noreferrer">Ver código en GitHub</a>
      </div>
    `;

    els = {
      themeButtons: Array.from(container.querySelectorAll('.settings-theme-toggle [data-theme]')),
      exportBtn: container.querySelector('#settings-export'),
      importBtn: container.querySelector('#settings-import'),
      importInput: container.querySelector('#settings-import-input'),
      clearAllBtn: container.querySelector('#settings-clear-all'),
    };

    container.querySelector('.settings-theme-toggle').addEventListener('click', handleThemeClick);
    els.exportBtn.addEventListener('click', downloadBackup);
    els.importBtn.addEventListener('click', () => els.importInput.click());
    els.importInput.addEventListener('change', handleImportChange);
    els.clearAllBtn.addEventListener('click', handleClearAll);

    renderThemeButtons();
  },

  unmount() {
    els = {};
  },
};
