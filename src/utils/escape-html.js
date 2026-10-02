const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes any value for safe insertion into HTML text or double-quoted attributes. */
export function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => MAP[c]); }
