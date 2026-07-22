export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, amount) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toISO(date);
}

// Días consecutivos hasta hoy (inclusive) presentes en `dates`. Usado por
// Hábitos (racha por hábito) y por el Panel de progreso (racha promedio).
export function computeStreak(dates) {
  const set = new Set(dates);
  let streak = 0;
  let cursor = todayISO();
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
