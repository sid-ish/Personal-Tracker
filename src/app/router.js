import { renderDashboard } from '../pages/dashboard/dashboard.js';
import { renderToday } from '../pages/today/today.js';
import { renderGate } from '../pages/gate/gate.js';
import { renderProjects } from '../pages/projects/projects.js';
import { renderCalendar } from '../pages/calendar/calendar.js';
import { renderCareer } from '../pages/career/career.js';
import { renderKnowledge } from '../pages/knowledge/knowledge.js';
import { appState } from './state.js';

const routes = {
  dashboard: renderDashboard, today: renderToday, gate: renderGate, projects: renderProjects,
  calendar: renderCalendar, career: renderCareer, knowledge: renderKnowledge,
};

/** Renders the current view into #view. Handlers call this (via the dispatcher) after every mutation. */
export async function render() {
  const el = document.getElementById('view');
  const fn = routes[appState.view];
  if (!fn) throw new Error('Unknown view: ' + appState.view);
  el.innerHTML = await fn();
}

export function navigate(view) {
  appState.view = view;
  document.querySelectorAll('.navbtn,.bottomnav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  return render();
}
