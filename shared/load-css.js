// Permite que cada módulo cargue su propio CSS la primera vez que se monta,
// sin que index.html tenga que editarse cada vez que se agrega un módulo.
const loaded = new Set();

export function loadModuleStyles(href) {
  if (loaded.has(href)) return;
  loaded.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
