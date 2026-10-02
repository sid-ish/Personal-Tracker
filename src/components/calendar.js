import { appState } from '../app/state.js';
import { icon } from './icons.js';
import { todayStr, fmtMonth, monthGrid, dowLabels, parseDate } from '../utils/dates.js';
import { KIND_META } from '../services/calendar-service.js';

/**
 * The one calendar component (Calendar page, Dashboard, Today, Focus mode).
 * State lives in appState.cals[id] = { month: Date, selected: 'YYYY-MM-DD' }.
 * `byDate` is a Map<date, items[]> from calendar-service.groupByDate.
 */
export function calendarHtml(id, byDate = new Map(), { compact = false, title = true } = {}) {
  const st = appState.cals[id]; const y = st.month.getFullYear(), m = st.month.getMonth(), t = todayStr();
  const cells = monthGrid(y, m).map(ds => {
    const d = parseDate(ds), out = d.getMonth() !== m; const kinds = [...new Set((byDate.get(ds) || []).map(i => KIND_META[i.kind]?.cls || 'task'))].slice(0, 4);
    const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + (kinds.length ? `, ${(byDate.get(ds) || []).length} item${(byDate.get(ds) || []).length === 1 ? '' : 's'}` : '');
    return `<button class="cal-cell ${out ? 'out' : ''} ${ds === t ? 'today' : ''} ${ds === st.selected ? 'sel' : ''}" data-act="cal-pick" data-cal="${id}" data-date="${ds}" aria-label="${label}" ${ds === st.selected ? 'aria-pressed="true"' : ''}>${d.getDate()}<span class="cal-dots">${kinds.map(k => `<i class="${k}"></i>`).join('')}</span></button>`;
  }).join('');
  return `<div class="cal ${compact ? 'compact' : ''}" data-cal-root="${id}">
    <div class="cal-head">${title ? `<div class="cal-title" aria-live="polite">${fmtMonth(st.month)}</div>` : '<div class="grow"></div>'}
      <button class="btn sm ghost" data-act="cal-today" data-cal="${id}">Today</button>
      <button class="btn icon sm ghost" data-act="cal-prev" data-cal="${id}" aria-label="Previous month">${icon('ChevronLeft')}</button>
      <button class="btn icon sm ghost" data-act="cal-next" data-cal="${id}" aria-label="Next month">${icon('ChevronRight')}</button></div>
    <div class="cal-grid" role="group" aria-label="${fmtMonth(st.month)}">${dowLabels('narrow').map(d => `<div class="cal-dow" aria-hidden="true">${d}</div>`).join('')}${cells}</div></div>`;
}
export const calendarLegend = kinds => `<div class="legend">${kinds.map(k => `<span><i class="cal-dots-i ${KIND_META[k].cls}" style="background:var(--${({ task: 'primary', event: 'cyan', session: 'green', deadline: 'red', milestone: 'orange', revision: 'yellow' })[KIND_META[k].cls]})"></i>${KIND_META[k].label}</span>`).join('')}</div>`;

export const calendarActions = {
  click: {
    'cal-pick': el => { const s = appState.cals[el.dataset.cal]; s.selected = el.dataset.date; const d = parseDate(el.dataset.date); if (d.getMonth() !== s.month.getMonth()) s.month = new Date(d.getFullYear(), d.getMonth(), 1); if (el.dataset.cal === 'main') appState.calSelected = el.dataset.date; },
    'cal-prev': el => { const s = appState.cals[el.dataset.cal]; s.month = new Date(s.month.getFullYear(), s.month.getMonth() - 1, 1); },
    'cal-next': el => { const s = appState.cals[el.dataset.cal]; s.month = new Date(s.month.getFullYear(), s.month.getMonth() + 1, 1); },
    'cal-today': el => { const s = appState.cals[el.dataset.cal]; s.month = new Date(); s.selected = todayStr(); if (el.dataset.cal === 'main') appState.calSelected = s.selected; },
  },
};
