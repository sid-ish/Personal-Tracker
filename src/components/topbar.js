import { icon } from './icons.js';
import { openMenu } from './dropdown.js';
import { settings } from '../services/settings/settings.js';
import { THEMES, applyAppearance } from '../services/theme/theme.js';
import { reapply } from '../services/background/background.js';
import { openQuickAdd } from './quick-add.js';
import { openPalette } from './command-palette.js';
import { openAttention } from './attention-center.js';
import { toast } from './toast.js';
import { navigate } from '../app/router.js';
import { appState } from '../app/state.js';
import { runExport, startImport } from './backup-ui.js';
import { toggleSidebar } from './sidebar.js';
import { fmtHMS } from '../utils/formatting.js';
import { focus, displaySec } from '../services/focus/focus.js';

export const topbarHtml = () => `<header class="topbar" role="banner">
  <button class="btn icon ghost show-mobile" data-act="open-drawer" aria-label="Open navigation">${icon('Menu')}</button>
  <div class="topbar-title"><span class="hide-mobile">Sidharth OS</span><span class="hide-mobile">${icon('ChevronRight', 'sm')}</span><strong id="crumb"></strong></div>
  <div class="topbar-center"><button class="btn sm" id="focusPill" data-view="focus" hidden aria-label="Active focus session"></button></div>
  <div class="topbar-actions">
    <button class="search-trigger hide-mobile" data-act="open-palette" aria-label="Search or run a command" aria-haspopup="dialog">${icon('Search', 'sm')}<span>Search or run a command</span><span class="kbd-group"><kbd>Ctrl</kbd><kbd>K</kbd></span></button>
    <button class="btn icon ghost show-mobile" data-act="open-palette" aria-label="Search">${icon('Search')}</button>
    <button class="btn icon primary" data-act="quick-add" aria-haspopup="menu" aria-expanded="false" aria-label="Quick add" data-tip="Quick add">${icon('Plus')}</button>
    <button class="btn icon ghost has-badge" data-act="open-attention" id="bellBtn" aria-haspopup="dialog" aria-expanded="false" aria-label="Attention centre" data-tip="Attention centre">${icon('Bell')}<span class="badge-dot" id="bellBadge" hidden></span></button>
    <button class="btn icon ghost" data-act="open-theme" id="themeBtn" aria-haspopup="menu" aria-expanded="false" aria-label="Theme and background" data-tip="Theme & background">${icon('Palette')}</button>
    <button class="avatar" data-act="open-profile" aria-haspopup="menu" aria-expanded="false" aria-label="Profile menu">S</button>
  </div></header>`;

export function updateFocusPill() {
  const p = document.getElementById('focusPill'); if (!p) return;
  const active = focus.isActive() && appState.view !== 'focus'; p.hidden = !active; if (!active) return;
  const s = focus.get(); p.innerHTML = `${icon(s.status === 'paused' ? 'Pause' : 'Timer', 'sm')}<span class="tnum">${fmtHMS(displaySec())}</span><span class="muted hide-mobile">${s.phase === 'break' ? 'Break' : 'Focus'}</span>`;
}
const cycleTheme = () => { const dark = document.documentElement.dataset.theme !== 'light' && document.documentElement.dataset.theme !== 'paper'; settings.set('theme', dark ? 'light' : 'dark'); applyAppearance(); reapply(); toast.info(`Theme: ${dark ? 'Light' : 'Dark'}`); };
export const toggleTheme = cycleTheme;

export const shellActions = {
  click: {
    'toggle-sidebar': () => { toggleSidebar(); return false; },
    'open-drawer': () => { document.documentElement.dataset.drawer = 'open'; return false; },
    'close-drawer': () => { document.documentElement.dataset.drawer = 'closed'; return false; },
    'open-palette': () => { openPalette(''); return false; },
    'quick-add': el => { openQuickAdd(el); return false; },
    'open-attention': el => { openAttention(el); return false; },
    'open-theme': el => {
      const cur = settings.get('theme');
      openMenu(el, [{ heading: 'THEME' }, ...THEMES.map(t => ({ label: t.label + (cur === t.id ? '  ✓' : ''), icon: t.icon, onClick: () => { settings.set('theme', t.id); applyAppearance(); reapply(); toast.info(`Theme: ${t.label}`); } })), { separator: true },
        { label: 'Change background…', icon: 'Image', onClick: () => { appState.settingsTab = 'appearance'; navigate('settings', { scroll: 'background' }); } }], { align: 'right' }); return false;
    },
    'open-profile': el => { openMenu(el, [{ heading: 'SIDHARTH' }, { label: 'Settings', icon: 'Settings', onClick: () => navigate('settings') }, { label: 'Keyboard shortcuts', icon: 'Keyboard', onClick: () => { appState.settingsTab = 'system'; navigate('settings', { scroll: 'shortcuts' }); } }, { separator: true }, { label: 'Export backup', icon: 'Download', onClick: runExport }, { label: 'Import backup', icon: 'Upload', onClick: startImport }], { align: 'right' }); return false; },
  },
};
