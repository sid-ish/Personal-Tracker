import { taskService } from '../../services/task-service.js';
import { gateService } from '../../services/gate-service.js';
import { projectService } from '../../services/project-service.js';
import { getCalendarItems, itemsOn } from '../../services/calendar-service.js';
import { getAttention } from '../../services/notifications/notifications.js';
import { daysToExam, minutesOn } from '../../services/analytics/analytics.js';
import { settings } from '../../services/settings/settings.js';
import { getBacklog, getTodayTasks, pickFocus, topicStats, projectProgress } from '../../utils/calculations.js';
import { todayStr, fmtDateLong, fmtDuration, fmtDate } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { appState } from '../../app/state.js';
import { navigate } from '../../app/router.js';
import { icon } from '../../components/icons.js';
import { metricCard } from '../../components/metric-card.js';
import { progressBar, progressRing } from '../../components/progress.js';
import { timelineHtml } from '../../components/timeline.js';
import { emptyState } from '../../components/empty-state.js';
import { clockHtml } from '../../components/clock.js';
import { plural } from '../../utils/formatting.js';
import { focus } from '../../services/focus/focus.js';

export async function render() {
  const [tasks, topics, sessions, projects, items, attention] = await Promise.all([taskService.getAll(), gateService.topics.getAll(), gateService.sessions.getAll(), projectService.getAll(), getCalendarItems(), getAttention()]);
  const t = todayStr(), todayTasks = getTodayTasks(tasks), doneToday = todayTasks.filter(x => x.done).length, backlog = getBacklog(tasks);
  const f = pickFocus(tasks), me = topics.filter(x => x.paper === 'ME');
  const gateAvg = me.length ? Math.round(me.reduce((s, x) => s + topicStats(x).overall, 0) / me.length) : 0;
  const studyMin = minutesOn(sessions, t), active = projects.filter(p => p.status === 'active');
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const planned = todayTasks.reduce((a, x) => a + (x.estimatedMinutes || 0), 0), pctDone = todayTasks.length ? Math.round(doneToday / todayTasks.length * 100) : 0;
  const exam = daysToExam(settings.get('gateExamDate')), running = focus.isActive();

  const focusCard = f ? `<section class="card focus-hero" aria-labelledby="fh">
      <div class="row between top wrap"><div class="grow"><div class="t-label" id="fh">Today’s focus</div>
        <h2 class="t-h1 mt-2 clamp-2">${esc(f.t.text)}</h2>
        <div class="row wrap gap-2 mt-2"><span class="pri ${f.t.priority || 'medium'}">${f.t.priority || 'medium'}</span><span class="chip">${esc(f.t.category || 'task')}</span>${f.t.estimatedMinutes ? `<span class="chip">${icon('Clock')}${fmtDuration(f.t.estimatedMinutes)}</span>` : ''}</div></div>
        <div class="hide-mobile">${clockHtml({ size: 'sm', date: true })}</div></div>
      <div class="mt-4"><div class="row between t-caption muted mb-2"><span>${doneToday} of ${todayTasks.length} tasks done today${planned ? ` · ${fmtDuration(planned)} planned` : ''}</span><span class="tnum">${pctDone}%</span></div>${progressBar(pctDone, 'thick')}</div>
      <div class="row wrap mt-4"><button class="btn primary lg" data-act="start-focus" data-id="${f.t.id}">${icon('Play')}${running ? 'Open focus session' : 'Start focus'}</button><button class="btn lg" data-view="today">View plan</button><button class="btn lg ghost" data-act="complete-focus" data-id="${f.t.id}">${icon('Check')}Mark complete</button></div>
      <div class="t-caption muted mt-3">${esc(f.reason)}</div></section>`
    : `<section class="card focus-hero">${emptyState({ icon: 'CheckCircle2', title: 'Nothing scheduled or overdue', text: 'Add a task to give today a focus, or start a free study session.', action: { label: 'New task', act: 'open-new', icon: 'Plus', attrs: { kind: 'task' } } })}<div class="row" style="justify-content:center"><button class="btn" data-act="start-focus">${icon('Timer')}Start free focus session</button></div></section>`;

  const attn = attention.slice(0, 5);
  return `<div class="page-head"><div><h1 class="t-display">${greet}, Sidharth</h1><div class="sub">${fmtDateLong(t)}</div></div>
      <div class="page-actions"><button class="btn" data-act="open-new" data-kind="session">${icon('Timer')}Log study</button><button class="btn primary" data-act="open-new" data-kind="task">${icon('Plus')}New task</button></div></div>
    ${focusCard}
    <div class="grid c4 section mt-6">
      ${metricCard(`${doneToday}<span class="muted">/${todayTasks.length}</span>`, 'Tasks today', backlog.length ? `<span class="text-red">${backlog.length} overdue</span>` : 'No backlog')}
      ${metricCard(fmtDuration(studyMin), 'Study today', plural(sessions.filter(s => s.date === t).length, 'session'))}
      ${metricCard(`${gateAvg}%`, 'GATE progress', exam !== null && exam >= 0 ? `${exam} days to the exam window` : 'ME syllabus')}
      ${metricCard(active.length, 'Active projects', `${projects.length} total`)}</div>
    <div class="layout-2">
      <div class="col gap-6">
        <section class="card" aria-labelledby="tl"><div class="card-title"><h3 id="tl">Today</h3><button class="btn sm ghost" data-view="calendar">Calendar ${icon('ArrowRight', 'sm')}</button></div>${timelineHtml(itemsOn(items, t).filter(i => i.kind !== 'session'), { empty: { title: 'A clear day', text: 'Nothing is scheduled for today yet.', action: null } })}</section>
        <section class="card" aria-labelledby="at"><div class="card-title"><h3 id="at">Attention required</h3>${attention.length > 5 ? `<span class="chip">${attention.length} total</span>` : ''}</div>
          ${attn.length ? `<div class="list">${attn.map(a => `<div class="list-row clickable" data-view="${a.route}" role="link" tabindex="0">${icon(a.icon)}<div class="grow"><div class="t-small truncate">${esc(a.title)}</div><div class="t-caption muted">${esc(a.detail)}</div></div><span class="chip ${a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'yellow' : ''}">${a.priority === 'high' ? 'High' : a.priority === 'medium' ? 'Soon' : 'Info'}</span></div>`).join('')}</div>` : emptyState({ compact: true, title: 'Nothing needs attention', text: 'Overdue work, deadlines and revisions will appear here.' })}</section>
      </div>
      <div class="col gap-6">
        <section class="card" aria-labelledby="pp"><div class="card-title"><h3 id="pp">Project pulse</h3><button class="btn sm ghost" data-view="projects">All ${icon('ArrowRight', 'sm')}</button></div>
          ${active.length ? `<div class="col gap-4">${active.slice(0, 4).map(p => { const st = projectProgress(p, tasks); return `<div class="pulse-row" data-act="open-project" data-id="${p.id}" role="button" tabindex="0"><div class="row between"><span class="t-small truncate">${esc(p.name)}</span><span class="t-caption tnum muted">${st.pct}%</span></div>${progressBar(st.pct, 'green')}<div class="t-caption muted mt-1">${st.source === 'tasks' ? `${st.done}/${st.total} tasks` : `${st.done}/${st.total} milestones`}${p.targetDate ? ` · due ${fmtDate(p.targetDate)}` : ''}</div></div>`; }).join('')}</div>` : emptyState({ compact: true, title: 'No active projects', text: 'Active projects and their progress show up here.', action: { label: 'Create project', act: 'open-new', attrs: { kind: 'project' } } })}</section>
        <section class="card row" aria-label="GATE preparation">${progressRing(gateAvg, { size: 64, stroke: 6 })}<div class="grow"><h3>GATE 2027 · ME</h3><div class="t-caption muted mt-1">${exam !== null && exam >= 0 ? `${exam} days until ${fmtDate(settings.get('gateExamDate'), { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Set the exam date in Settings'}</div></div><button class="btn sm" data-view="gate">Open</button></section>
      </div>
    </div>`;
}
export const actions = {
  click: {
    'start-focus': el => { const t = el.dataset.id; return (async () => { if (t) { const task = await taskService.get(t); if (task) Object.assign(appState.focusSetup, { title: task.text, category: task.category || 'gate' }); } await navigate('focus'); return false; })(); },
    'open-project': el => { appState.openProjectId = el.dataset.id; appState.projectTab = 'overview'; navigate('projects'); return false; },
  },
};
