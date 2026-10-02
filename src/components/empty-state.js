import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';
/** action: { label, act, attrs } renders a primary button wired to a data-act (or data-open for the shared openers). */
export function emptyState({ icon: ic = 'Inbox', title, text = '', action = null, compact = false }) {
  const attrs = action ? Object.entries(action.attrs || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ') : '';
  return `<div class="${compact ? 'empty-inline' : 'empty-state'}">${compact ? '' : `<div class="empty-icon">${icon(ic, 'lg')}</div>`}<h3 ${compact ? 'class="t-small secondary"' : ''}>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action ? `<button class="btn primary" data-act="${esc(action.act)}" ${attrs}>${action.icon ? icon(action.icon) : ''}${esc(action.label)}</button>` : ''}</div>`;
}
