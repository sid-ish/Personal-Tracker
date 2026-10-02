import { appState } from './state.js';
import { registerActions } from './actions.js';
import { VIEW_TITLES, NAV_ITEMS } from './constants.js';
import { skeletonHtml } from '../components/skeleton.js';
import { settings } from '../services/settings/settings.js';
import { apply as applyBackground } from '../services/background/background.js';
import { handleError } from './errors.js';

/** Pages load on demand (dynamic import), so startup only pays for the shell and the first page. */
const PAGES = {
  dashboard: () => import('../pages/dashboard/dashboard.js'), today: () => import('../pages/today/today.js'),
  focus: () => import('../pages/focus/focus.js'), calendar: () => import('../pages/calendar/calendar.js'),
  gate: () => import('../pages/gate/gate.js'), projects: () => import('../pages/projects/projects.js'),
  career: () => import('../pages/career/career.js'), knowledge: () => import('../pages/knowledge/knowledge.js'),
  settings: () => import('../pages/settings/settings.js'),
};
export const isView = v => v in PAGES;
const cache = {};
let token = 0;

const captureFocus = () => { const a = document.activeElement; if (!a || a === document.body || !a.closest?.('#view')) return null; return { act: a.dataset?.act, id: a.dataset?.id, key: a.dataset?.key, si: a.dataset?.si, date: a.dataset?.date, fid: a.id, tag: a.tagName, caret: a.selectionStart }; };
function restoreFocus(f) {
  if (!f) return; let el = null; const v = document.getElementById('view');
  if (f.fid) el = document.getElementById(f.fid);
  else if (f.act) el = [...v.querySelectorAll(`[data-act="${f.act}"]`)].find(n => (f.id === undefined || n.dataset.id === f.id) && (f.key === undefined || n.dataset.key === f.key) && (f.si === undefined || n.dataset.si === f.si) && (f.date === undefined || n.dataset.date === f.date));
  if (el) { el.focus({ preventScroll: true }); if (f.caret != null && el.setSelectionRange) try { el.setSelectionRange(f.caret, f.caret); } catch { /* not a text field */ } }
}

async function paint(view, { fresh }) {
  const my = ++token; const el = document.getElementById('view'); const mod = cache[view] || (cache[view] = await PAGES[view]());
  registerActions(mod.actions);
  const root = document.documentElement; const f = fresh ? null : captureFocus(); const y = window.scrollY;
  const skel = fresh ? setTimeout(() => { if (my === token) el.innerHTML = skeletonHtml(); }, 140) : null;
  let html; try { html = await mod.render(); } finally { clearTimeout(skel); }
  if (my !== token) return;                                   // a newer navigation superseded this render
  root.dataset.route = view;
  el.innerHTML = html;
  if (fresh) { el.classList.remove('page-enter'); el.classList.add('page-enter'); window.scrollTo(0, 0); el.focus({ preventScroll: true }); }
  else { window.scrollTo(0, y); restoreFocus(f); }
  await mod.mount?.(el, { fresh });
}

/** Re-renders the current view in place (used after every mutation). */
export async function render() { if (!isView(appState.view)) return; await paint(appState.view, { fresh: false }); }

async function show(view) {
  if (!isView(view)) view = settings.get('workspace.defaultPage') || 'dashboard';
  if (appState.view !== 'focus') appState.lastView = appState.view;
  appState.view = view;
  document.querySelectorAll('.navbtn,.bottomnav [data-view]').forEach(b => { const on = b.dataset.view === view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.title = `${VIEW_TITLES[view] || 'Sidharth OS'} · Sidharth OS`;
  const crumb = document.getElementById('crumb'); if (crumb) crumb.textContent = VIEW_TITLES[view] || '';
  document.documentElement.dataset.drawer = 'closed';
  applyBackground(view).catch(handleError);
  try { await paint(view, { fresh: true }); } catch (e) { handleError(e); document.getElementById('view').innerHTML = `<div class="empty-state"><h3>This page could not load</h3><p>Your data is safe. Try reloading.</p><button class="btn" onclick="location.reload()">Reload</button></div>`; }
}

/** Navigate by hash so Back/Forward and deep links work. Passing params stashes them for the target page. */
export async function navigate(view, params = {}) {
  appState.params = params;
  const target = '#/' + view;
  if (location.hash === target) return show(view);
  location.hash = target;                                      // hashchange handler performs the render
}
export function initRouter() {
  window.addEventListener('hashchange', () => show(location.hash.replace(/^#\/?/, '') || ''));
  return show(location.hash.replace(/^#\/?/, '') || '');
}
export const currentNav = () => NAV_ITEMS.find(n => n.view === appState.view);
