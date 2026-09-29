import { themeOrder } from '../app/constants.js';
import { appState } from '../app/state.js';

export const topbarHtml = () => `<div class="topbar"><button class="iconbtn" id="themeBtn">Theme</button></div>`;

export function applyTheme() {
  const t = themeOrder[appState.themeIdx];
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('sos_theme', t);
  document.getElementById('themeBtn').textContent = t === 'system' ? 'Auto' : (t === 'dark' ? 'Dark' : 'Light');
}

export const topbarActions = {
  click: { '#themeBtn': () => { appState.themeIdx = (appState.themeIdx + 1) % themeOrder.length; applyTheme(); return false; } },
};
