import { settings } from '../settings/settings.js';
import { configureDates } from '../../utils/dates.js';

export const THEMES = [
  { id: 'system', label: 'System', icon: 'Monitor' }, { id: 'light', label: 'Light', icon: 'Sun' }, { id: 'dark', label: 'Dark', icon: 'Moon' },
  { id: 'obsidian', label: 'Obsidian', icon: 'Moon' }, { id: 'midnight', label: 'Midnight', icon: 'Moon' }, { id: 'paper', label: 'Paper', icon: 'Sun' },
];
export const ACCENTS = [{ id: 'indigo', color: '#7b8cff' }, { id: 'cyan', color: '#3cc4de' }, { id: 'green', color: '#3fcf8e' }, { id: 'orange', color: '#f59a5b' }, { id: 'rose', color: '#f27a9a' }];
export const LIGHT_THEMES = ['light', 'paper'];

const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const resolvedTheme = () => { const t = settings.get('theme'); return t === 'system' ? (mq.matches ? 'dark' : 'light') : t; };
export const isLightTheme = () => LIGHT_THEMES.includes(resolvedTheme());

/** Applies theme, accent, density and motion preferences to <html>. Safe to call repeatedly. */
export function applyAppearance() {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme();
  root.dataset.themePref = settings.get('theme');
  root.dataset.accent = settings.get('accent');
  root.dataset.density = settings.get('compact') ? 'compact' : 'comfortable';
  root.dataset.motion = settings.get('animations') ? 'on' : 'off';
  const w = settings.get('workspace'); configureDates({ weekStart: w.weekStart, dateFormat: w.dateFormat });
}

export function initTheme(onChange) {
  applyAppearance();
  mq.addEventListener('change', () => { if (settings.get('theme') === 'system') { applyAppearance(); onChange?.(); } });
}
