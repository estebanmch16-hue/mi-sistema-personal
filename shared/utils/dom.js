// Escapa texto de usuario antes de insertarlo vía innerHTML (previene XSS).
// Cualquier módulo que renderice texto guardado por el usuario debe usar esto.
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
