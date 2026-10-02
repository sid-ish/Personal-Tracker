import { addDays, todayStr, weekStartOf, daysBetween, fmtDate } from '../../utils/dates.js';
import { topicStats } from '../../utils/calculations.js';

export const daysToExam = date => date ? daysBetween(todayStr(), date) : null;
export const minutesOn = (sessions, date) => sessions.filter(s => s.date === date).reduce((a, s) => a + (s.durationMin || 0), 0);
export function studyByDay(sessions, n = 14) { const t = todayStr(); return Array.from({ length: n }, (_, i) => { const d = addDays(t, i - n + 1); return { key: d, label: fmtDate(d, { day: 'numeric' }), value: minutesOn(sessions, d) / 60 }; }); }
export function studyByWeek(sessions, n = 8) {
  const start = weekStartOf(todayStr());
  return Array.from({ length: n }, (_, i) => { const w = addDays(start, (i - n + 1) * 7); const end = addDays(w, 6); const min = sessions.filter(s => s.date >= w && s.date <= end).reduce((a, s) => a + (s.durationMin || 0), 0); return { key: w, label: fmtDate(w), value: min / 60 }; });
}
export function streakDays(sessions) { const days = new Set(sessions.map(s => s.date)); let d = todayStr(), n = 0; if (!days.has(d)) d = addDays(d, -1); while (days.has(d)) { n++; d = addDays(d, -1); } return n; }
export function masteryBySubject(topics) { const by = {}; topics.forEach(t => (by[t.subject] = by[t.subject] || []).push(t)); return Object.entries(by).map(([k, ts]) => ({ key: k, label: k, value: Math.round(ts.reduce((a, t) => a + topicStats(t).overall, 0) / ts.length) })); }
export function completionBySubject(topics) { const by = {}; topics.forEach(t => { const b = (by[t.subject] = by[t.subject] || { s: 0, n: 0 }); (t.subtopics || []).forEach(x => { b.n++; if (x.s) b.s++; }); }); return Object.entries(by).map(([k, v]) => ({ key: k, label: k, value: v.n ? Math.round(v.s / v.n * 100) : 0 })); }
export function pyqBySubject(records) { const by = {}; records.forEach(r => { const b = (by[r.subject] = by[r.subject] || { a: 0, c: 0 }); b.a += r.attempted; b.c += r.correct; }); return Object.entries(by).map(([k, v]) => ({ key: k, label: k, value: v.a ? Math.round(v.c / v.a * 100) : 0, attempted: v.a })); }
/** How many studied subtopics sit at each revision count (0-3). */
export function revisionFrequency(topics) { const c = [0, 0, 0, 0]; topics.forEach(t => (t.subtopics || []).forEach(s => { if (s.s) c[Math.min(3, s.r || 0)]++; })); return c.map((value, i) => ({ key: 'r' + i, label: i === 0 ? 'Not revised' : `Rev ×${i}`, value })); }
