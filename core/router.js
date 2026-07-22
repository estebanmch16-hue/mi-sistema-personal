// Hash router: no depende de configuración de servidor, por eso funciona
// directo en GitHub Pages sin reglas de rewrite.
import { emit } from './event-bus.js';

const DEFAULT_ROUTE = '#/dashboard';

function normalize(hash) {
  if (!hash || hash === '#') return DEFAULT_ROUTE;
  return hash;
}

export function getCurrentRoute() {
  return normalize(window.location.hash);
}

export function navigate(route) {
  if (window.location.hash === route) {
    emit('route:change', route);
  } else {
    window.location.hash = route;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    emit('route:change', getCurrentRoute());
  });

  // Si no hay hash, refleja el default en la URL (dispara hashchange más
  // tarde, de forma asíncrona). Emitimos también de una vez, sincrónico,
  // para que la primera vista se pinte sin esperar ese evento.
  if (!window.location.hash) {
    window.location.hash = DEFAULT_ROUTE;
  }
  emit('route:change', getCurrentRoute());
}
