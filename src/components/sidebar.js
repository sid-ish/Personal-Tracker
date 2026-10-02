import { NAV_GROUPS } from '../app/constants.js';
import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';
import { settings } from '../services/settings/settings.js';

export const BRAND_MARK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" opacity=".55"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>`;

export const sidebarHtml = () => `<aside class="sidebar" id="sidebar" aria-label="Primary">
  <div class="brand"><div class="brand-mark">${BRAND_MARK}</div><div class="brand-text"><div class="brand-name">SIDHARTH OS</div><div class="brand-sub">COMMAND CENTRE</div></div></div>
  <nav class="nav" aria-label="Main navigation">${NAV_GROUPS.map(g => `<div class="nav-group" role="group" aria-label="${esc(g.label)}"><div class="nav-label">${g.label}</div>${g.items.map(n => `<a class="navbtn" href="#/${n.view}" data-view="${n.view}" data-tip="${esc(n.label)}" data-tip-pos="right">${icon(n.icon)}<span class="label">${esc(n.label)}</span><span class="kbd-hint"><kbd>${esc(n.key)}</kbd></span></a>`).join('')}</div>`).join('')}</nav>
  <div class="side-foot">
    <a class="navbtn" href="#/focus" data-view="focus" data-tip="Focus mode" data-tip-pos="right">${icon('Timer')}<span class="label">Focus mode</span><span class="kbd-hint"><kbd>F</kbd></span></a>
    <button class="navbtn" data-act="toggle-sidebar" data-tip="Collapse sidebar" data-tip-pos="right" aria-label="Collapse or expand sidebar" aria-expanded="true">${icon('PanelLeftClose')}<span class="label">Collapse</span><span class="kbd-hint"><kbd>[</kbd></span></button>
  </div></aside><div class="sidebar-scrim" data-act="close-drawer"></div>`;

export function setSidebarCollapsed(on, persist = true) {
  const app = document.querySelector('.app'); if (!app) return;
  app.dataset.sidebar = on ? 'collapsed' : 'expanded';
  const b = document.querySelector('[data-act=toggle-sidebar]'); if (b) { b.setAttribute('aria-expanded', String(!on)); b.dataset.tip = on ? 'Expand sidebar' : 'Collapse sidebar'; b.querySelector('.icon').outerHTML = icon(on ? 'PanelLeftOpen' : 'PanelLeftClose'); }
  if (persist) settings.set('sidebarCollapsed', on);
}
export const toggleSidebar = () => setSidebarCollapsed(document.querySelector('.app')?.dataset.sidebar !== 'collapsed');
