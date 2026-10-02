import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';
import { fuzzyScore, highlight } from '../utils/fuzzy.js';
import { navigate } from '../app/router.js';
import { appState } from '../app/state.js';
import { NAV_ITEMS } from '../app/constants.js';
import { searchAll } from '../services/search/search.js';
import { openResult } from './search.js';
import { openNew } from './entity-forms.js';
import { runExport, startImport } from './backup-ui.js';
import { toggleTheme } from './topbar.js';
import { toggleSidebar } from './sidebar.js';
import { debounce } from '../utils/dom.js';

const nav = NAV_ITEMS.map(n => ({ group: 'Navigation', label: n.label, icon: n.icon, keys: [n.key], run: () => navigate(n.view), kw: n.view }));
const commands = () => [
  ...nav,
  { group: 'Actions', label: 'New Task', icon: 'ListChecks', keys: ['N'], run: () => openNew('task'), kw: 'add todo create' },
  { group: 'Actions', label: 'New Event', icon: 'CalendarPlus', run: () => openNew('event'), kw: 'add calendar create' },
  { group: 'Actions', label: 'New Project', icon: 'FolderKanban', run: () => openNew('project'), kw: 'add create' },
  { group: 'Actions', label: 'New Knowledge', icon: 'BookOpen', run: () => openNew('knowledge'), kw: 'add note concept resource create' },
  { group: 'Actions', label: 'New Career Entry', icon: 'Briefcase', run: () => openNew('career'), kw: 'add application internship create' },
  { group: 'Actions', label: 'Log Study Session', icon: 'Timer', run: () => openNew('session'), kw: 'add hours' },
  { group: 'Actions', label: 'Start Focus Session', icon: 'Play', keys: ['F'], run: () => navigate('focus'), kw: 'pomodoro timer study' },
  { group: 'System', label: 'Toggle Theme', icon: 'Moon', run: toggleTheme, kw: 'dark light' },
  { group: 'System', label: 'Change Background', icon: 'Image', run: () => { appState.settingsTab = 'appearance'; navigate('settings', { scroll: 'background' }); }, kw: 'wallpaper image' },
  { group: 'System', label: 'Export Data', icon: 'Download', run: runExport, kw: 'backup save' },
  { group: 'System', label: 'Import Data', icon: 'Upload', run: startImport, kw: 'backup restore' },
  { group: 'System', label: 'Toggle Sidebar', icon: 'PanelLeftClose', keys: ['['], run: toggleSidebar },
  { group: 'System', label: 'Keyboard Shortcuts', icon: 'Keyboard', run: () => { appState.settingsTab = 'system'; navigate('settings', { scroll: 'shortcuts' }); } },
];
let open = false;

/** Ctrl+K palette: commands (fuzzy) first, then live results from every store once the query has 2+ characters. */
export function openPalette(initial = '') {
  if (open) return; open = true;
  const opener = document.activeElement;
  const back = document.createElement('div'); back.className = 'palette-backdrop';
  back.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette"><div class="palette-input">${icon('Search')}<input id="palInput" role="combobox" aria-expanded="true" aria-controls="palList" aria-autocomplete="list" placeholder="Type a command or search tasks, notes, topics…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="palette-list" id="palList" role="listbox" aria-label="Results"></div><div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> select</span><span><kbd>Esc</kbd> close</span></div></div>`;
  document.body.appendChild(back); document.documentElement.style.overflow = 'hidden';
  const input = back.querySelector('#palInput'), list = back.querySelector('#palList'); input.value = initial;
  let flat = [], idx = 0, seq = 0, dataGroups = [];
  const close = () => { open = false; back.remove(); document.documentElement.style.overflow = ''; try { opener?.focus?.({ preventScroll: true }); } catch { /* gone */ } };
  const keysHtml = k => k?.length ? `<span class="kbd-hint">${k.map(x => `<kbd>${esc(x)}</kbd>`).join('')}</span>` : '';

  function build() {
    const q = input.value.trim(); let cmds = commands();
    if (q) cmds = cmds.map(c => ({ ...c, s: Math.max(fuzzyScore(q, c.label), fuzzyScore(q, c.kw || '') * .5) })).filter(c => c.s > 0).sort((a, b) => b.s - a.s); else cmds = cmds.filter(c => c.group !== 'Navigation' || true);
    const groups = []; ['Navigation', 'Actions', 'System'].forEach(g => { const items = cmds.filter(c => c.group === g); if (items.length) groups.push({ label: g.toUpperCase(), items: items.map(c => ({ kind: 'cmd', ...c })) }); });
    dataGroups.forEach(g => groups.push({ label: g.group.toUpperCase(), items: g.items.map(r => ({ kind: 'res', label: r.title, sub: r.sub, snippet: r.snippet, icon: r.icon, r })) }));
    if (q && !groups.length) { list.innerHTML = `<div class="empty-inline" style="padding:24px;text-align:center">No results for “${esc(q)}”.</div>`; flat = []; return; }
    flat = groups.flatMap(g => g.items);
    let n = 0;
    list.innerHTML = groups.map(g => `<div class="menu-label" role="presentation">${esc(g.label)}</div>${g.items.map(it => { const i = n++; return `<button class="palette-item ${i === idx ? 'active' : ''}" role="option" id="pal${i}" data-i="${i}" aria-selected="${i === idx}">${icon(it.icon)}<span class="grow truncate">${it.kind === 'res' ? highlight(it.label, q) : highlight(it.label, q)}${it.sub ? ` <span class="sub">${esc(it.sub)}</span>` : ''}${it.snippet ? `<div class="sub truncate">${esc(it.snippet)}</div>` : ''}</span>${it.kind === 'cmd' ? keysHtml(it.keys) : ''}</button>`; }).join('')}`).join('');
    input.setAttribute('aria-activedescendant', 'pal' + idx);
  }
  const mark = () => { list.querySelectorAll('.palette-item').forEach(b => { const on = +b.dataset.i === idx; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest' }); }); input.setAttribute('aria-activedescendant', 'pal' + idx); };
  const run = async it => { close(); if (it.kind === 'cmd') await it.run(); else await openResult(it.r); };
  const fetchData = debounce(async () => { const q = input.value.trim(); const my = ++seq; if (q.length < 2) { dataGroups = []; return; } const g = await searchAll(q); if (my !== seq) return; dataGroups = g; build(); }, 120);

  input.addEventListener('input', () => { idx = 0; dataGroups = input.value.trim().length < 2 ? [] : dataGroups; build(); fetchData(); });
  back.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); idx = flat.length ? (idx + 1) % flat.length : 0; mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = flat.length ? (idx - 1 + flat.length) % flat.length : 0; mark(); }
    else if (e.key === 'Home') { idx = 0; mark(); } else if (e.key === 'End') { idx = Math.max(0, flat.length - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[idx]) run(flat[idx]); }
    else if (e.key === 'Tab') e.preventDefault();                       // focus stays in the palette
  });
  list.addEventListener('mousemove', e => { const b = e.target.closest('.palette-item'); if (b && +b.dataset.i !== idx) { idx = +b.dataset.i; mark(); } });
  list.addEventListener('click', e => { const b = e.target.closest('.palette-item'); if (b) run(flat[+b.dataset.i]); });
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  build(); input.focus(); if (initial) fetchData();
}
