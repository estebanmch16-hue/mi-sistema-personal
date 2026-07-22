import * as storage from './storage.js';
import { emit } from './event-bus.js';

const NAMESPACE = 'theme';
const root = document.documentElement;
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function systemPrefersDark() {
  return darkMediaQuery.matches;
}

// La preferencia guardada puede ser 'light' | 'dark' | 'system'. 'system' no
// se resuelve una sola vez: se recalcula cada vez para seguir el SO en vivo.
export function getThemePreference() {
  return storage.get(NAMESPACE, 'system');
}

export function getTheme() {
  const preference = getThemePreference();
  return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

function applyTheme() {
  const resolved = getTheme();
  root.setAttribute('data-theme', resolved);
  emit('theme:change', resolved);
}

export function setThemePreference(preference) {
  storage.set(NAMESPACE, preference);
  applyTheme();
}

// Toggle rápido (botón del topbar): siempre fija una preferencia explícita
// claro/oscuro, nunca "system" (para eso está la pantalla de Configuración).
export function toggleTheme() {
  setThemePreference(getTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  applyTheme();
  darkMediaQuery.addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme();
  });
}
