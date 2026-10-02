const p2 = n => String(n).padStart(2, '0');
/** mm:ss, or hh:mm:ss once past an hour. */
export function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? p2(h) + ':' : '') + p2(m) + ':' + p2(s); }
/** Always hh:mm:ss (focus display). */
export function fmtHMS(sec) { sec = Math.max(0, Math.floor(sec)); return p2(Math.floor(sec / 3600)) + ':' + p2(Math.floor((sec % 3600) / 60)) + ':' + p2(sec % 60); }
export const pct = (n, d) => d ? Math.round(n / d * 100) : 0;
export const plural = (n, w, pl = w + 's') => n + ' ' + (n === 1 ? w : pl);
export function parseTags(raw, extraText = '') {
  const fromField = String(raw || '').split(/[\s,]+/).map(t => t.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9-]/g, '')).filter(Boolean);
  const fromText = (String(extraText).match(/(^|\s)#([a-z0-9-]+)/gi) || []).map(t => t.trim().slice(1).toLowerCase());
  return [...new Set([...fromField, ...fromText])];
}
