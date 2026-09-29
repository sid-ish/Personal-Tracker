import { navigate, render } from './router.js';
import { taskActions } from '../components/task-list.js';
import { timerActions } from '../components/timer.js';

import { handleError } from './errors.js';
import { dashboardActions } from '../pages/dashboard/dashboard.js';
import { gateActions } from '../pages/gate/gate.js';
import { careerActions } from '../pages/career/career.js';
import { knowledgeActions } from '../pages/knowledge/knowledge.js';
import { projectActions } from '../pages/projects/projects.js';
import { calendarActions } from '../pages/calendar/calendar.js';

const registry = { click: {}, change: {}, focusout: {} };
[taskActions, timerActions, topbarActions, dashboardActions, gateActions, careerActions, knowledgeActions, projectActions, calendarActions]
  .forEach(group => { for (const type in group) Object.assign(registry[type], group[type]); });

const isField = el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);

/** One delegated listener per event type for the whole app; actions are found via data-act (or the element id for form buttons). */
async function dispatch(type, e) {
  if (type === 'click') {
    const nav = e.target.closest('[data-view]');
    if (nav) { await navigate(nav.dataset.view); return; }
  }
  const el = e.target.closest('[data-act]') || e.target.closest('button[id],input[id]');
  if (!el) return;
  if (type === 'click' && isField(el)) return;          // checkboxes / selects use 'change'
  if ((type === 'change' || type === 'focusout') && !isField(el)) return;
  const handler = registry[type][el.dataset.act || '#' + el.id];
  if (!handler) return;
  const result = await handler(el, e);
  if (result !== false) await render();
}

export function registerEvents() {
  ['click', 'change', 'focusout'].forEach(t => document.addEventListener(t, e => dispatch(t, e).catch(handleError)));
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'newTxt') document.getElementById('addTaskBtn')?.click(); });
}
