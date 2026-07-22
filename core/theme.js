import * as storage from './storage.js';
import { emit } from './event-bus.js';

const NAMESPACE = 'theme';
const root = document.documentElement;

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getTheme() {
  return storage.get(NAMESPACE, systemPrefersDark() ? 'dark' : 'light');
}

export function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  storage.set(NAMESPACE, theme);
  emit('theme:change', theme);
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  setTheme(getTheme());
}
