import { createRepository } from '../../database/queries.js';

const repo = createRepository('meta');
const KEY = 'settings';

export const DEFAULT_SETTINGS = {
  theme: 'system',            // system | light | dark | obsidian | midnight | paper
  accent: 'indigo',           // indigo | cyan | green | orange | rose
  compact: false,
  animations: true,
  sidebarCollapsed: false,
  background: {
    perPage: false,           // when true, per-page overrides below are honoured
    global: { type: 'builtin', ref: 'auto', opacity: 100, blur: 0, overlay: 45, position: 'center', fit: 'cover' },
    pages: {},                // dashboard | focus | gate | projects -> same shape as global (or absent)
  },
  focus: {
    sound: true, breakMin: 5, mode: 'pomodoro', presetId: '25-5', focusMin: 25, breakMin: 5, countdownMin: 60,
    presets: [{ id: '25-5', label: '25 / 5', focus: 25, brk: 5 }, { id: '50-10', label: '50 / 10', focus: 50, brk: 10 }, { id: '90-15', label: '90 / 15', focus: 90, brk: 15 }],
  },
  clock: { hour12: false, seconds: true, timezone: 'local' },
  workspace: { defaultPage: 'dashboard', weekStart: 1, dateFormat: 'dmy' },
  gateExamDate: '2027-02-06',
  lastBackup: null,
};

let state = structuredClone(DEFAULT_SETTINGS);
const listeners = new Set();

const merge = (base, over) => {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over || {})) out[k] = (k in base) ? merge(base[k], over[k]) : over[k];
  return out;
};
const walk = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

let saveTimer;
const persist = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => repo.put({ key: KEY, value: state }).catch(e => console.error('[settings] save failed', e)), 150);
  try { localStorage.setItem('sos_theme', state.theme); localStorage.setItem('sos_accent', state.accent); } catch { /* storage may be unavailable */ }
};

export const settings = {
  async load() {
    try { const rec = await repo.get(KEY); state = merge(DEFAULT_SETTINGS, rec?.value || {}); } catch (e) { console.error('[settings] load failed, using defaults', e); }
    return state;
  },
  all: () => state,
  get: path => walk(state, path),
  set(path, value) {
    const keys = path.split('.'); const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] ?? {}), state);
    target[last] = value; persist(); listeners.forEach(fn => fn(path, value));
  },
  /** Replace the entire settings object (used by backup import / reset). */
  replace(next) { state = merge(DEFAULT_SETTINGS, next || {}); persist(); listeners.forEach(fn => fn('*', state)); },
  reset() { settings.replace(structuredClone(DEFAULT_SETTINGS)); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  flush: () => repo.put({ key: KEY, value: state }),
};
