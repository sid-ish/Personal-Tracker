import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';

const ICON = { success: 'CheckCircle2', error: 'XCircle', warning: 'AlertTriangle', info: 'Info' };
const MAX = 4;
function root() { let r = document.getElementById('toast-root'); if (!r) { r = document.createElement('div'); r.id = 'toast-root'; r.setAttribute('aria-live', 'polite'); r.setAttribute('role', 'status'); document.body.appendChild(r); } return r; }

/** toast('Saved', { type, duration, action: { label, onClick } }). Errors stay longer; every toast can be dismissed. */
export function toast(message, { type = 'success', duration, action } = {}) {
  const r = root(); while (r.children.length >= MAX) r.firstElementChild.remove();
  const el = document.createElement('div'); el.className = `toast ${type}`;
  el.innerHTML = `${icon(ICON[type] || 'Info', 'lead')}<span class="msg">${esc(message)}</span>${action ? `<button class="btn sm ghost" data-a>${esc(action.label)}</button>` : ''}<button class="btn icon sm ghost" aria-label="Dismiss notification" data-x>${icon('X', 'sm')}</button>`;
  const close = () => { if (!el.isConnected) return; el.classList.add('leaving'); setTimeout(() => el.remove(), 180); };
  el.querySelector('[data-x]').onclick = close;
  if (action) el.querySelector('[data-a]').onclick = () => { action.onClick?.(); close(); };
  r.appendChild(el); setTimeout(close, duration ?? (type === 'error' ? 7000 : 3600)); return close;
}
['success', 'info', 'warning', 'error'].forEach(t => { toast[t] = (m, o) => toast(m, { ...o, type: t }); });
