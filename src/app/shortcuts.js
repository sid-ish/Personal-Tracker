import { navigate } from './router.js';
import { isTyping } from '../utils/dom.js';

/** Global single-key shortcuts. Ignored while typing or while a dialog is open; Ctrl/Cmd+K always works. */
const MAP = { t: 'today', g: 'gate', p: 'projects', c: 'calendar', f: 'focus', d: 'dashboard', k: 'knowledge', r: 'career', ',': 'settings' };
export const SHORTCUTS = [
  ['Ctrl K', 'Command palette'], ['/', 'Search everything'], ['N', 'New task'], ['T', 'Today'], ['D', 'Command Centre'], ['C', 'Calendar'], ['G', 'GATE 2027'], ['P', 'Projects'], ['K', 'Knowledge'], ['R', 'Career'], ['F', 'Focus mode'], [',', 'Settings'], ['[', 'Collapse sidebar'], ['Esc', 'Close dialog'],
];
export function initShortcuts({ openPalette, newTask, toggleSidebar }) {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(''); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (isTyping(e.target) || document.querySelector('.modal-backdrop, .palette-backdrop')) return;
    const k = e.key.toLowerCase();
    if (k === '/') { e.preventDefault(); openPalette(''); }
    else if (k === 'n') { e.preventDefault(); newTask(); }
    else if (k === '[') { e.preventDefault(); toggleSidebar(); }
    else if (MAP[k]) { e.preventDefault(); navigate(MAP[k]); }
  });
}
