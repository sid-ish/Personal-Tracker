import { getCalendarItems, groupByDate, itemsOn, KIND_META } from '../../services/calendar-service.js';
import { appState } from '../../app/state.js';
import { calendarHtml, calendarLegend } from '../../components/calendar.js';
import { timelineHtml } from '../../components/timeline.js';
import { taskQuickAddHtml } from '../../components/task-list.js';
import { icon } from '../../components/icons.js';
import { esc } from '../../utils/escape-html.js';
import { todayStr, addDays, weekStartOf, parseDate, fmtDate, fmtDateLong } from '../../utils/dates.js';

const LEG = ['task', 'session', 'event', 'deadline', 'milestone', 'revision'];
const sel = () => appState.cals.main.selected;

function weekHtml(items) {
  const start = weekStartOf(sel()), t = todayStr();
  return `<div class="week-grid">${Array.from({ length: 7 }, (_, i) => { const d = addDays(start, i), list = itemsOn(items, d);
    return `<section class="card tight week-col ${d === t ? 'is-today' : ''}" aria-label="${fmtDateLong(d)}"><button class="week-head" data-act="cal-pick" data-cal="main" data-date="${d}"><span class="t-caption muted">${parseDate(d).toLocaleDateString('en-GB', { weekday: 'short' })}</span><span class="week-num ${d === sel() ? 'sel' : ''}">${parseDate(d).getDate()}</span></button>
      <div class="col gap-1">${list.length ? list.slice(0, 8).map(i => `<div class="wk-item ${KIND_META[i.kind]?.cls || 'task'} ${i.done ? 'done' : ''}" title="${esc(i.title)}">${icon(KIND_META[i.kind]?.icon || 'Circle', 'sm')}<span class="truncate">${esc(i.title)}</span></div>`).join('') + (list.length > 8 ? `<div class="t-caption muted">+${list.length - 8} more</div>` : '') : '<div class="t-caption muted">—</div>'}</div></section>`; }).join('')}</div>`;
}
export async function render() {
  const items = await getCalendarItems(), by = groupByDate(items), v = appState.calView, s = sel(), c = appState.cals.main;
  appState.addDate = s; appState.addProject = null;
  const range = v === 'week' ? `${fmtDate(weekStartOf(s))} – ${fmtDate(addDays(weekStartOf(s), 6))}` : v === 'day' ? fmtDateLong(s) : '';
  const stepBtn = (dir) => `data-act="cal-step" data-dir="${dir}"`;
  const dayPanel = `<section class="card" aria-label="Schedule for ${fmtDateLong(s)}"><div class="card-title"><h3>${fmtDateLong(s)}${s === todayStr() ? ' <span class="chip primary">Today</span>' : ''}</h3></div>${timelineHtml(itemsOn(items, s), { empty: { title: 'Nothing scheduled', text: 'Add a task or event for this day.' } })}${taskQuickAddHtml({ date: s, id: 'cal' })}<div class="row wrap mt-3"><button class="btn sm" data-act="open-new" data-kind="event" data-date="${s}">${icon('CalendarPlus', 'sm')}New event</button></div></section>`;
  let body;
  if (v === 'month') body = `<div class="layout-2"><section class="card cal-big">${calendarHtml('main', by)}<div class="mt-4">${calendarLegend(LEG)}</div></section>${dayPanel}</div>`;
  else if (v === 'week') body = `<div class="row between mb-4"><div class="row"><button class="btn icon sm" ${stepBtn(-7)} aria-label="Previous week">${icon('ChevronLeft')}</button><button class="btn icon sm" ${stepBtn(7)} aria-label="Next week">${icon('ChevronRight')}</button><strong>${range}</strong></div><button class="btn sm" data-act="cal-today" data-cal="main">Today</button></div>${weekHtml(items)}<div class="mt-4">${calendarLegend(LEG)}</div><div class="mt-6">${dayPanel}</div>`;
  else body = `<div class="row between mb-4"><div class="row"><button class="btn icon sm" ${stepBtn(-1)} aria-label="Previous day">${icon('ChevronLeft')}</button><button class="btn icon sm" ${stepBtn(1)} aria-label="Next day">${icon('ChevronRight')}</button><strong>${range}</strong></div><button class="btn sm" data-act="cal-today" data-cal="main">Today</button></div><div class="layout-2">${dayPanel}<section class="card">${calendarHtml('main', by, { compact: true })}</section></div>`;
  return `<div class="page-head"><div><h1>Calendar</h1><div class="sub">Tasks, study sessions, deadlines, milestones and revisions in one place.</div></div>
    <div class="page-actions"><div class="segmented" role="tablist" aria-label="Calendar view">${['month', 'week', 'day'].map(x => `<button role="tab" aria-selected="${v === x}" data-act="cal-view" data-v="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join('')}</div><button class="btn primary" data-act="open-new" data-kind="event" data-date="${s}">${icon('Plus')}New event</button></div></div>${body}`;
}
export const actions = {
  click: {
    'cal-view': el => { appState.calView = el.dataset.v; },
    'cal-step': el => { const c = appState.cals.main, d = addDays(c.selected, +el.dataset.dir); c.selected = d; c.month = parseDate(d); appState.calSelected = d; },
  },
};
