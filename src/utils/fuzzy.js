import { esc } from './escape-html.js';
/** 0 = no match. Substring matches outrank loose subsequence matches; earlier and word-start matches rank higher. */
export function fuzzyScore(query, text) {
  const q = String(query).toLowerCase().trim(), t = String(text || '').toLowerCase();
  if (!q) return 1; if (!t) return 0;
  const idx = t.indexOf(q);
  if (idx >= 0) return 200 - idx * 2 + (idx === 0 || /\W/.test(t[idx - 1]) ? 30 : 0) - t.length * .05;
  let qi = 0, score = 0, last = -2;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += (last === i - 1 ? 4 : 1) + (i === 0 || /\W/.test(t[i - 1]) ? 3 : 0); last = i; qi++; }
  }
  return qi === q.length ? score : 0;
}
/** Escaped HTML with the matched substring wrapped in <mark>. */
export function highlight(text, query) {
  const s = String(text || ''), q = String(query || '').trim().toLowerCase();
  if (!q) return esc(s);
  const i = s.toLowerCase().indexOf(q);
  return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
}
