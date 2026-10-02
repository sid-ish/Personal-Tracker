import { openPopover, closeMenu } from './dropdown.js';
import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';
import { getAttention, dismiss } from '../services/notifications/notifications.js';
import { navigate } from '../app/router.js';
import { appState } from '../app/state.js';
import { skeletonRows } from './skeleton.js';
import { emptyState } from './empty-state.js';

const LABEL = { high: 'Needs attention', medium: 'Coming up', low: 'For your information' };
const CHIP = { high: 'red', medium: 'yellow', low: '' };

function listHtml(items) {
  if (!items.length) return emptyState({ icon: 'CheckCircle2', title: 'All clear', text: 'Overdue work, deadlines and revision reminders will show up here.', compact: false });
  return ['high', 'medium', 'low'].map(p => { const g = items.filter(i => i.priority === p); return g.length ? `<div class="menu-label">${LABEL[p].toUpperCase()}</div>${g.map(i => `<div class="list-row clickable" data-id="${esc(i.id)}" tabindex="0" role="button">${icon(i.icon)}<div class="grow"><div class="t-small truncate">${esc(i.title)}</div><div class="t-caption muted truncate">${esc(i.detail)}</div></div><span class="chip ${CHIP[p]}">${p === 'high' ? 'High' : p === 'medium' ? 'Soon' : 'Info'}</span><button class="btn icon sm ghost" data-dismiss="${esc(i.id)}" aria-label="Dismiss: ${esc(i.title)}">${icon('X', 'sm')}</button></div>`).join('')}` : ''; }).join('');
}
export async function refreshBadge() {
  try { const items = await getAttention(); const n = items.filter(i => i.priority !== 'low').length; const b = document.getElementById('bellBadge'); if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; } document.getElementById('bellBtn')?.setAttribute('aria-label', `Attention centre${n ? `, ${n} item${n === 1 ? '' : 's'} need attention` : ''}`); return items; } catch (e) { console.error(e); return []; }
}
export async function openAttention(anchor) {
  const el = openPopover(anchor, { title: 'Attention', html: skeletonRows(3) }); if (!el) return;
  let items = await getAttention(); const body = el.querySelector('.popover-body');
  const paint = () => { body.innerHTML = listHtml(items); };
  paint();
  const go = it => { closeMenu(); const r = it.ref || {};
    if (it.route === 'gate' && r.topic) { appState.gatePaper = r.paper; appState.gateTab = 'subjects'; appState.gateSubject = r.subject; appState.gateExpanded.add(r.topic); }
    if (it.route === 'projects' && r.project) appState.openProjectId = r.project;
    if (it.route === 'calendar' && it.date) { appState.cals.main.selected = it.date; appState.cals.main.month = new Date(it.date + 'T00:00:00'); }
    navigate(it.route, { ...r }); };
  body.addEventListener('click', e => { const d = e.target.closest('[data-dismiss]'); if (d) { dismiss(d.dataset.dismiss); items = items.filter(i => i.id !== d.dataset.dismiss); paint(); refreshBadge(); return; } const row = e.target.closest('[data-id]'); if (row) go(items.find(i => i.id === row.dataset.id)); });
  body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-id]')) e.target.click(); });
}
