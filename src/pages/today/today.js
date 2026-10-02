import { taskService } from '../../services/task-service.js';
import { gateService } from '../../services/gate-service.js';
import { getCalendarItems, itemsOn, groupByDate } from '../../services/calendar-service.js';
import { getBacklog, getTodayTasks, priorityRank, getUpcoming } from '../../utils/calculations.js';
import { todayStr, fmtDateLong, fmtDuration, relDay, addDays } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { appState } from '../../app/state.js';
import { navigate } from '../../app/router.js';
import { icon } from '../../components/icons.js';
import { taskRowsHtml, taskQuickAddHtml } from '../../components/task-list.js';
import { timelineHtml } from '../../components/timeline.js';
import { progressRing } from '../../components/progress.js';
import { calendarHtml, calendarLegend } from '../../components/calendar.js';
import { emptyState } from '../../components/empty-state.js';
import { toast } from '../../components/toast.js';
import { confirmModal } from '../../components/modal.js';

export async function render() {
  const [tasks, sessions, items] = await Promise.all([taskService.getAll(), gateService.sessions.getAll(), getCalendarItems()]);
  const t = todayStr(), today = getTodayTasks(tasks).sort((a, b) => (a.done - b.done) || priorityRank(a.priority) - priorityRank(b.priority));
  const open = today.filter(x => !x.done), done = today.length - open.length, backlog = getBacklog(tasks), upcoming = getUpcoming(tasks, 7).slice(0, 6);
  const sel = appState.cals.today.selected, todaySessions = sessions.filter(s => s.date === t), studyMin = todaySessions.reduce((a, s) => a + s.durationMin, 0);
  const pct = today.length ? Math.round(done / today.length * 100) : 0, planned = today.reduce((a, x) => a + (x.estimatedMinutes || 0), 0);
  const deadlines = items.filter(i => i.kind === 'deadline' && i.date >= t && i.date <= addDays(t, 14)).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 5);
  const events = items.filter(i => ['event', 'interview'].includes(i.kind) && i.date >= t && i.date <= addDays(t, 7)).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 5);
  appState.addDate = t; appState.addProject = null;
  return `<div class="page-head"><div><h1>Today</h1><div class="sub">${fmtDateLong(t)}</div></div>
      <div class="page-actions"><button class="btn" data-act="open-new" data-kind="session">${icon('Timer')}Log study</button><button class="btn" data-act="open-new" data-kind="event" data-date="${t}">${icon('CalendarPlus')}New event</button><button class="btn primary" data-view="focus">${icon('Play')}Start focus</button></div></div>
    <section class="card row wrap gap-6 section" aria-label="Daily progress">${progressRing(pct, { size: 76, stroke: 7 })}
      <div class="grow"><h2>${done === today.length && today.length ? 'Everything done for today' : `${open.length} task${open.length === 1 ? '' : 's'} left`}</h2><div class="t-small muted mt-1">${done} of ${today.length} complete${planned ? ` · ${fmtDuration(planned)} planned` : ''}</div></div>
      <div class="row gap-6"><div class="metric"><span class="l">Studied today</span><span class="n">${fmtDuration(studyMin)}</span></div><div class="metric"><span class="l">Sessions</span><span class="n">${todaySessions.length}</span></div><div class="metric"><span class="l">Overdue</span><span class="n ${backlog.length ? 'text-red' : ''}">${backlog.length}</span></div></div></section>
    <div class="layout-2">
      <div class="col gap-6">
        <section class="card"><div class="card-title"><h3>Tasks</h3></div>${taskRowsHtml(today, { emptyTitle: 'No tasks for today', emptyText: 'Add one below, or move something from the backlog.' })}${taskQuickAddHtml({ date: t, id: 'today' })}</section>
        <section class="card"><div class="card-title"><h3>Timeline</h3></div>${timelineHtml(itemsOn(items, t).filter(i => i.kind !== 'task'), { empty: { title: 'No events or deadlines today', text: 'Events, deadlines, milestones and study sessions for today appear here.' } })}</section>
        <section class="card"><div class="card-title"><h3>Study sessions</h3><button class="btn sm" data-act="open-new" data-kind="session">${icon('Plus', 'sm')}Log</button></div>
          ${todaySessions.length ? `<div class="list">${todaySessions.map(s => `<div class="list-row"><span class="text-green">${icon('Timer')}</span><div class="grow"><div class="t-small">${esc(s.what || 'Study session')}</div><div class="t-caption muted">${esc(s.category || '')}</div></div><span class="chip green">${fmtDuration(s.durationMin)}</span><button class="btn icon sm ghost" data-act="session-del" data-id="${s.id}" aria-label="Delete session">${icon('Trash2', 'sm')}</button></div>`).join('')}</div>` : emptyState({ compact: true, title: 'No sessions yet today', text: 'Run a focus session or log time you studied.', action: { label: 'Start focus', act: 'go-focus' } })}</section>
        <section class="card"><div class="card-title"><h3>Backlog ${backlog.length ? `<span class="chip red">${backlog.length}</span>` : ''}</h3>${backlog.length ? `<button class="btn sm" data-act="backlog-all">Move all to today</button>` : ''}</div>
          ${backlog.length ? `<div class="list">${backlog.map(x => `<div class="task-row"><span class="txt">${esc(x.text)}</span><span class="meta">${relDay(x.date)}</span><span class="pri ${x.priority || 'medium'}">${x.priority || 'medium'}</span><button class="btn sm" data-act="movetoday" data-id="${x.id}">Move to today</button></div>`).join('')}</div>` : emptyState({ compact: true, title: 'Nothing overdue', text: 'Unfinished tasks from earlier days will collect here.' })}</section>
      </div>
      <aside class="col gap-6" aria-label="Schedule">
        <section class="card">${calendarHtml('today', groupByDate(items), { compact: true })}<div class="mt-3">${calendarLegend(['task', 'event', 'deadline', 'milestone'])}</div>
          ${sel !== t ? `<div class="divider"></div><div class="t-label mb-2">${fmtDateLong(sel)}</div>${timelineHtml(itemsOn(items, sel), { empty: { title: 'Nothing on this day' } })}` : ''}</section>
        <section class="card"><div class="card-title"><h3>Upcoming events</h3></div>${timelineHtml(events, { showDate: true, empty: { title: 'No events this week' } })}</section>
        <section class="card"><div class="card-title"><h3>Deadlines</h3></div>${timelineHtml(deadlines, { showDate: true, empty: { title: 'No deadlines in the next 2 weeks' } })}</section>
        ${upcoming.length ? `<section class="card"><div class="card-title"><h3>Next 7 days</h3></div>${taskRowsHtml(upcoming, { showDate: true })}</section>` : ''}
      </aside></div>`;
}
export const actions = {
  click: {
    'go-focus': () => { navigate('focus'); return false; },
    'session-del': async el => { if (!await confirmModal({ title: 'Delete this session?', message: 'The logged study time will be removed from your totals.', confirmLabel: 'Delete session', danger: true })) return false; await gateService.sessions.remove(el.dataset.id); toast.success('Session deleted'); },
    'backlog-all': async () => { const list = getBacklog(await taskService.getAll()); for (const x of list) await taskService.put({ ...x, date: todayStr() }); toast.success(`Moved ${list.length} tasks to today`); },
  },
};
