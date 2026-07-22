// Respaldo manual: descarga/restaura todos los namespaces vía storage.js.
// No sabe qué es "tareas" o "notas" — exportAll() ya junta todo automáticamente.
import { exportAll, importAll } from './storage.js';

export function downloadBackup() {
  const payload = exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mi-sistema-personal-backup-${date}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function importBackupFile(file) {
  const text = await file.text();
  const payload = JSON.parse(text);
  importAll(payload);
}
