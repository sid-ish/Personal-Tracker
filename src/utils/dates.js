const cfg = { weekStart: 1, locale: 'en-GB' };
/** Applies workspace preferences (week start, date format) to every date helper below. */
export function configureDates({ weekStart, dateFormat } = {}) {
  if (weekStart !== undefined) cfg.weekStart = +weekStart;
  if (dateFormat) cfg.locale = dateFormat === 'mdy' ? 'en-US' : 'en-GB';
}
export function todayStr(d = new Date()) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
export const parseDate = s => new Date(s + 'T00:00:00');
export function addDays(dateStr, n) { const d = parseDate(dateStr); d.setDate(d.getDate() + n); return todayStr(d); }
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
export const fmtDate = (s, o = { day: 'numeric', month: 'short' }) => s ? parseDate(s).toLocaleDateString(cfg.locale, o) : '';
export const fmtDateLong = s => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtMonth = d => d.toLocaleDateString(cfg.locale, { month: 'long', year: 'numeric' });
/** "Today", "Tomorrow", "in 3d", "2d ago" or a short date. */
export function relDay(s) {
  if (!s) return '';
  const n = daysBetween(todayStr(), s);
  if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
  if (n > 1 && n < 8) return 'in ' + n + 'd'; if (n < -1 && n > -8) return -n + 'd ago';
  return fmtDate(s);
}
export function weekStartOf(s) { const d = parseDate(s); const diff = (d.getDay() - cfg.weekStart + 7) % 7; d.setDate(d.getDate() - diff); return todayStr(d); }
/** 42 date strings (6 weeks) for the month containing (year, month), starting on the configured week start. */
export function monthGrid(year, month) {
  const first = todayStr(new Date(year, month, 1));
  const start = weekStartOf(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function dowLabels(style = 'short') {
  const base = parseDate('2026-10-04'); // a Sunday
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + ((cfg.weekStart + i) % 7)); return d.toLocaleDateString(cfg.locale, { weekday: style }); });
}
export function fmtDuration(min) { min = Math.round(min || 0); if (min < 60) return min + 'm'; const h = Math.floor(min / 60), m = min % 60; return m ? h + 'h ' + m + 'm' : h + 'h'; }
