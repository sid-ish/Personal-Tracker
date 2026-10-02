import { settings, DEFAULT_SETTINGS } from '../../services/settings/settings.js';
import { THEMES, ACCENTS, applyAppearance } from '../../services/theme/theme.js';
import { reapply } from '../../services/background/background.js';
import { storageInfo, resetAll } from '../../services/backup/backup.js';
import { clearDismissed } from '../../services/notifications/notifications.js';
import { appState } from '../../app/state.js';
import { NAV_ITEMS } from '../../app/constants.js';
import { SHORTCUTS } from '../../app/shortcuts.js';
import { icon } from '../../components/icons.js';
import { toast } from '../../components/toast.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { openForm } from '../../components/forms.js';
import { runExport, startImport } from '../../components/backup-ui.js';
import { refreshClocks } from '../../components/clock.js';
import { esc } from '../../utils/escape-html.js';
import { fmtDate } from '../../utils/dates.js';
import { render } from '../../app/router.js';
import { backgroundHtml, backgroundActions, hydrateThumbs, setTarget, getTarget } from './background-ui.js';

const TABS = [['appearance', 'Appearance', 'Palette'], ['focus', 'Focus', 'Timer'], ['workspace', 'Workspace', 'LayoutDashboard'], ['data', 'Data', 'Database'], ['system', 'System', 'Shield']];
const row = (title, desc, ctl) => `<div class="set-row"><div class="info"><div class="t-small" style="font-weight:600">${title}</div>${desc ? `<div class="t-caption muted">${desc}</div>` : ''}</div><div class="ctl">${ctl}</div></div>`;
const toggle = (key, on, label) => `<label class="switch"><input type="checkbox" data-act="set-toggle" data-key="${key}" ${on ? 'checked' : ''} aria-label="${label}"><span></span></label>`;
const select = (key, val, opts, label) => `<select class="select" data-act="set-select" data-key="${key}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${v}" ${String(val) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const swatch = t => ({ system: ['#0b0d12', '#f4f5f8'], light: ['#f4f5f8', '#ffffff'], dark: ['#0b0d12', '#161a23'], obsidian: ['#050608', '#101318'], midnight: ['#090c1c', '#131a36'], paper: ['#f1ede4', '#faf8f3'] })[t];
const fmtBytes = n => n == null ? '—' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

async function appearance() {
  return `<div class="col gap-6"><section class="card"><div class="card-title"><h3>Theme</h3></div><div class="theme-grid" role="group" aria-label="Theme">${THEMES.map(t => `<button class="theme-tile" data-act="set-theme" data-t="${t.id}" aria-pressed="${settings.get('theme') === t.id}"><span class="theme-swatch">${swatch(t.id).map(c => `<i style="background:${c}"></i>`).join('')}</span>${t.label}</button>`).join('')}</div>
      <div class="divider"></div>${row('Accent colour', 'Used for buttons, highlights and progress.', `<div class="swatch-row" role="group" aria-label="Accent colour">${ACCENTS.map(a => `<button class="swatch" style="background:${a.color}" data-act="set-accent" data-a="${a.id}" aria-pressed="${settings.get('accent') === a.id}" aria-label="${a.id}"></button>`).join('')}</div>`)}
      ${row('Compact mode', 'Tighter spacing for more on screen.', toggle('compact', settings.get('compact'), 'Compact mode'))}${row('Animations', 'Turn off to remove transitions. Your system’s reduced-motion setting is always respected.', toggle('animations', settings.get('animations'), 'Animations'))}</section>${await backgroundHtml()}</div>`;
}
function focusTab() {
  const f = settings.get('focus'), c = settings.get('clock');
  return `<div class="col gap-6"><section class="card"><div class="card-title"><h3>Timer</h3></div>
    ${row('Timer presets', 'Focus / break minutes shown in Pomodoro mode.', `<div class="row wrap" style="justify-content:flex-end">${f.presets.map(p => `<span class="chip primary">${esc(p.label)}</span>`).join('')}<button class="btn sm" data-act="edit-presets">Edit</button></div>`)}
    ${row('Default timer type', '', select('focus.mode', f.mode, [['pomodoro', 'Pomodoro'], ['countdown', 'Countdown'], ['countup', 'Count-up']], 'Default timer type'))}
    ${row('Default focus duration', 'Used by custom Pomodoro and Countdown (minutes).', `<input class="input" style="width:100px" type="number" min="1" max="720" data-act="set-num" data-key="focus.focusMin" value="${f.focusMin}" aria-label="Default focus minutes">`)}
    ${row('Break duration', 'Minutes (custom Pomodoro).', `<input class="input" style="width:100px" type="number" min="1" max="120" data-act="set-num" data-key="focus.breakMin" value="${f.breakMin ?? 5}" aria-label="Break minutes">`)}
    ${row('Completion sound', 'A short chime when a session ends.', toggle('focus.sound', f.sound, 'Completion sound'))}</section>
    <section class="card"><div class="card-title"><h3>Clock</h3></div>${row('Clock format', '', select('clock.hour12', c.hour12, [[false, '24-hour'], [true, '12-hour']], 'Clock format'))}${row('Show seconds', '', toggle('clock.seconds', c.seconds, 'Show seconds'))}
      ${row('Timezone', 'Display only. Your data always uses local dates.', select('clock.timezone', c.timezone, [['local', 'Local'], ['UTC', 'UTC'], ['Asia/Kolkata', 'India (IST)'], ['Europe/London', 'London'], ['America/New_York', 'New York'], ['Asia/Tokyo', 'Tokyo']], 'Timezone'))}</section>
    <div class="t-caption muted">Focus mode background is set below. Choose “Focus mode” as the target.</div></div>`;
}
const focusBg = () => backgroundHtml();
function workspace() {
  const w = settings.get('workspace');
  return `<section class="card"><div class="card-title"><h3>Workspace</h3></div>${row('Default page', 'Opens when you visit without a link.', select('workspace.defaultPage', w.defaultPage, NAV_ITEMS.map(n => [n.view, n.label]), 'Default page'))}${row('Week starts on', '', select('workspace.weekStart', w.weekStart, [[1, 'Monday'], [0, 'Sunday'], [6, 'Saturday']], 'Week start'))}${row('Date format', '', select('workspace.dateFormat', w.dateFormat, [['dmy', '2 Oct 2026 (day first)'], ['mdy', 'Oct 2, 2026 (month first)']], 'Date format'))}
    ${row('GATE exam date', 'First exam day, used for the days-remaining count.', `<input class="input" style="width:170px" type="date" data-act="set-date" data-key="gateExamDate" value="${esc(settings.get('gateExamDate') || '')}" aria-label="GATE exam date">`)}</section>`;
}
async function dataTab() {
  const i = await storageInfo(), lb = i.lastBackup;
  return `<div class="col gap-6"><section class="card"><div class="card-title"><h3>Backup</h3></div><div class="grid c3 mb-4"><div class="metric"><span class="l">Last backup</span><span class="n" style="font-size:1.1rem">${lb ? fmtDate(lb.at.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</span></div><div class="metric"><span class="l">Records</span><span class="n">${i.total}</span></div><div class="metric"><span class="l">Database size</span><span class="n" style="font-size:1.1rem">${fmtBytes(i.usage)}</span><span class="s">${i.quota ? 'of ' + fmtBytes(i.quota) + ' available' : ''}</span></div></div>
    <p class="t-small secondary mb-4">Everything lives in this browser. Export a backup regularly: it includes tasks, events, projects, career, knowledge, GATE, settings and custom backgrounds.</p>
    <div class="row wrap"><button class="btn primary" data-act="do-export">${icon('Download')}Export backup</button><button class="btn" data-act="do-import">${icon('Upload')}Import backup</button></div></section>
    <section class="card"><div class="card-title"><h3>Storage</h3></div><div class="grid c4">${Object.entries(i.counts).map(([k, n]) => `<div class="row between t-small"><span class="secondary">${esc(k)}</span><span class="tnum">${n}</span></div>`).join('')}</div></section>
    <section class="card"><div class="card-title"><h3>Reset</h3></div>${row('Restore dismissed alerts', 'Bring back notifications you dismissed today.', '<button class="btn sm" data-act="undismiss">Restore</button>')}${row('Reset settings', 'Restores appearance, focus and workspace defaults. Your data stays.', '<button class="btn sm" data-act="reset-settings">Reset settings</button>')}${row('Erase all data', 'Deletes everything stored in this browser. Export a backup first.', '<button class="btn sm danger" data-act="erase-all">Erase all data</button>')}</section></div>`;
}
function system() {
  return `<div class="col gap-6"><section class="card" id="shortcuts"><div class="card-title"><h3>Keyboard shortcuts</h3></div><div class="grid c2">${SHORTCUTS.map(([k, d]) => `<div class="row between t-small"><span class="secondary">${d}</span><span>${k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</span></div>`).join('')}</div><p class="t-caption muted mt-3">Single-key shortcuts are disabled while you’re typing in a field or a dialog is open.</p></section>
    <section class="card"><div class="card-title"><h3>Accessibility</h3></div><ul class="col gap-2 t-small secondary" style="padding-left:var(--sp-5);margin:0"><li>Everything is reachable by keyboard, with visible focus outlines.</li><li>Dialogs trap focus and close with Esc; menus use arrow keys.</li><li>Animations follow your system’s reduced-motion setting, or turn them off above.</li><li>Status is never shown by colour alone: chips and icons carry text labels.</li></ul></section>
    <section class="card"><div class="card-title"><h3>About</h3></div><div class="t-small secondary">Sidharth OS 2.0 · local-first command centre.<br>Data is stored in your browser’s IndexedDB (database “sidharthos”, version 8). Nothing is sent to a server.</div></section></div>`;
}
export async function render_() {
  const tab = appState.settingsTab;
  // Only realign the background target when the visible tab disagrees with it (never wipe an unsaved draft on re-render)
  if (tab === 'focus' && getTarget() !== 'focus') setTarget('focus'); else if (tab !== 'focus' && getTarget() === 'focus') setTarget('global');
  const body = tab === 'appearance' ? await appearance() : tab === 'focus' ? focusTab() + `<div class="mt-6">${await focusBg()}</div>` : tab === 'workspace' ? workspace() : tab === 'data' ? await dataTab() : system();
  return `<div class="page-head"><div><h1>Settings</h1><div class="sub">Appearance, focus, workspace and your data.</div></div></div>
    <div class="settings-grid"><nav class="settings-nav" aria-label="Settings sections">${TABS.map(([k, l, i]) => `<button class="${tab === k ? 'active' : ''}" data-act="set-tab" data-t="${k}" ${tab === k ? 'aria-current="true"' : ''}>${icon(i)}${l}</button>`).join('')}</nav><div>${body}</div></div>`;
}
export { render_ as render };
export async function mount(root) {
  hydrateThumbs(root); const p = appState.params; if (p?.scroll) { appState.params = {}; document.getElementById(p.scroll)?.scrollIntoView({ block: 'start' }); }
}
const set = (key, v) => { settings.set(key, v); };
export const actions = {
  click: {
    ...backgroundActions.click,
    'set-tab': el => { appState.settingsTab = el.dataset.t; setTarget(el.dataset.t === 'focus' ? 'focus' : 'global'); },
    'set-theme': async el => { set('theme', el.dataset.t); applyAppearance(); await reapply(); toast.success('Theme changed'); },
    'set-accent': el => { set('accent', el.dataset.a); applyAppearance(); toast.success('Accent changed'); },
    'do-export': async () => { await runExport(); },
    'do-import': () => { startImport(); return false; },
    'undismiss': () => { clearDismissed(); toast.success('Alerts restored'); },
    'reset-settings': async () => { if (!await confirmModal({ title: 'Reset settings?', message: 'Appearance, focus, workspace and background settings return to their defaults. Your tasks and records are not touched.', confirmLabel: 'Reset settings' })) return false; settings.replace(structuredClone({ ...DEFAULT_SETTINGS, lastBackup: settings.get('lastBackup') })); applyAppearance(); await reapply(); toast.success('Settings reset'); },
    'erase-all': () => { openModal({ title: 'Erase all data?', body: `<p class="secondary mb-4">This permanently deletes every task, project, note, GATE record, setting and custom background stored in this browser. It can’t be undone.</p><div class="field"><label for="eraseConfirm">Type <strong>ERASE</strong> to confirm</label><input class="input" id="eraseConfirm" autocomplete="off"></div>`, actions: [{ label: 'Cancel' }, { label: 'Erase everything', variant: 'danger solid', close: false, onClick: async c => { if (c.el.querySelector('#eraseConfirm').value.trim() !== 'ERASE') { c.setError('Type ERASE exactly to continue.'); return false; } c.setLoading(true); await resetAll(); c.close(); applyAppearance(); await reapply(); toast.success('All data erased'); await render(); return false; } }] }); return false; },
    'edit-presets': () => { const ps = settings.get('focus.presets'); openForm({ title: 'Timer presets', description: 'Focus and break minutes for each Pomodoro preset.', values: Object.fromEntries(ps.flatMap((p, i) => [[`f${i}`, p.focus], [`b${i}`, p.brk]])), fields: ps.flatMap((p, i) => [{ name: `f${i}`, label: `${p.label}: focus (min)`, type: 'number', required: true, validate: v => +v >= 1 && +v <= 600 ? '' : '1–600' }, { name: `b${i}`, label: `${p.label}: break (min)`, type: 'number', required: true, validate: v => +v >= 1 && +v <= 120 ? '' : '1–120' }]), onSubmit: async v => { settings.set('focus.presets', ps.map((p, i) => ({ ...p, focus: +v[`f${i}`], brk: +v[`b${i}`], label: `${+v[`f${i}`]} / ${+v[`b${i}`]}` }))); toast.success('Presets updated'); await render(); } }); return false; },
  },
  change: {
    ...backgroundActions.change,
    'set-toggle': async el => { const k = el.dataset.key; set(k, el.checked); applyAppearance(); refreshClocks(); toast.success('Setting updated'); return false; },
    'set-select': async el => { const k = el.dataset.key; let v = el.value; if (v === 'true') v = true; else if (v === 'false') v = false; else if (/^\d+$/.test(v) && /weekStart/.test(k)) v = +v; set(k, v); applyAppearance(); refreshClocks(); toast.success('Setting updated'); return false; },
    'set-num': el => { const v = Math.max(1, Math.round(+el.value || 1)); set(el.dataset.key, v); toast.success('Setting updated'); return false; },
    'set-date': el => { set(el.dataset.key, el.value || null); toast.success('Date saved'); return false; },
  },
  input: { ...backgroundActions.input },
};
