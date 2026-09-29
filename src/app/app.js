import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/pages.css';
import '../styles/responsive.css';

import { initialize } from '../database/db.js';
import { run as runMigrations } from '../database/migrations.js';
import { appState } from './state.js';
import { themeOrder } from './constants.js';
import { navigate } from './router.js';
import { registerEvents } from './actions.js';
import { registerGlobalErrorHandlers, handleError } from './errors.js';
import { sidebarHtml } from '../components/sidebar.js';
import { bottomNavHtml } from '../components/bottom-nav.js';
import { topbarHtml, applyTheme } from '../components/topbar.js';
import { startTimerTicker } from '../components/timer.js';

function initializeState() {
  const i = themeOrder.indexOf(localStorage.getItem('sos_theme') || 'system');
  appState.themeIdx = i < 0 ? 0 : i;
}

async function boot() {
  registerGlobalErrorHandlers();
  await initialize();
  await runMigrations();
  initializeState();
  document.getElementById('app').innerHTML =
    `<div class="app">${sidebarHtml()}<div class="main">${topbarHtml()}<div id="view"></div></div></div>${bottomNavHtml()}`;
  applyTheme();
  registerEvents();
  startTimerTicker();
  await navigate('dashboard');
}

boot().catch(handleError);
