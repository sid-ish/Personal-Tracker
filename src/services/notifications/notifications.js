import { taskService } from '../task-service.js';
import { gateService } from '../gate-service.js';
import { projectService } from '../project-service.js';
import { careerService } from '../career-service.js';
import { knowledgeService } from '../knowledge-service.js';
import { todayStr, daysBetween, relDay, fmtDate } from '../../utils/dates.js';
import { getBacklog, getTodayTasks, projectProgress } from '../../utils/calculations.js';

const RANK = { high: 0, medium: 1, low: 2 };
const DKEY = 'sos_dismissed';
const readDismissed = () => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch { return {}; } };
export function dismiss(id) { const d = readDismissed(); d[id] = todayStr(); try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch { /* ignore */ } }
export function clearDismissed() { try { localStorage.removeItem(DKEY); } catch { /* ignore */ } }

/**
 * Builds the attention list. Deliberately selective: only things that are late, due soon, or worth celebrating,
 * capped per kind so the bell never turns into a feed.
 */
export async function getAttention() {
  const t = todayStr(); const items = [];
  const [tasks, topics, projects, interns, unis, events] = await Promise.all([taskService.getAll(), gateService.topics.getAll(), projectService.getAll(), careerService.internships.getAll(), careerService.universities.getAll(), knowledgeService.events.getAll()]);

  const overdue = getBacklog(tasks);
  overdue.slice(0, 4).forEach(x => items.push({ id: 'od:' + x.id, kind: 'overdue', priority: ['urgent', 'high'].includes(x.priority) ? 'high' : 'medium', icon: 'AlertTriangle', title: x.text, detail: `Overdue since ${fmtDate(x.date)}`, route: 'today' }));
  if (overdue.length > 4) items.push({ id: 'od-more:' + t, kind: 'overdue', priority: 'medium', icon: 'AlertTriangle', title: `${overdue.length - 4} more overdue tasks`, detail: 'Open Today to clear the backlog', route: 'today' });

  tasks.filter(x => !x.done && x.date === t && x.priority === 'urgent').slice(0, 2).forEach(x => items.push({ id: 'ug:' + x.id, kind: 'deadline', priority: 'high', icon: 'Flame', title: x.text, detail: 'Urgent · due today', route: 'today' }));

  const soon = (date, max = 7) => date && date >= t && daysBetween(t, date) <= max;
  events.filter(e => soon(e.date, 5)).forEach(e => items.push({ id: 'ev:' + e.id, kind: 'deadline', priority: ['Deadline', 'Exam', 'Interview'].includes(e.etype) ? 'high' : 'medium', icon: 'Calendar', title: e.title, detail: `${e.etype} · ${relDay(e.date)}`, route: 'calendar', date: e.date }));
  unis.filter(u => soon(u.deadline, 14)).forEach(u => items.push({ id: 'un:' + u.id, kind: 'deadline', priority: 'high', icon: 'GraduationCap', title: `${u.name} application`, detail: `Deadline ${relDay(u.deadline)}`, route: 'career' }));
  interns.filter(i => soon(i.deadline, 7) && !['rejected', 'withdrawn', 'accepted'].includes(i.status)).forEach(i => items.push({ id: 'in:' + i.id, kind: 'followup', priority: 'high', icon: 'Briefcase', title: `${i.company}: ${i.nextAction || 'application deadline'}`, detail: `Due ${relDay(i.deadline)}`, route: 'career' }));
  interns.filter(i => i.status === 'applied' && i.createdAt && daysBetween(i.createdAt.slice(0, 10), t) >= 14 && !i.followedUp).slice(0, 2).forEach(i => items.push({ id: 'fu:' + i.id, kind: 'followup', priority: 'low', icon: 'Mail', title: `Follow up with ${i.company}`, detail: 'Applied over two weeks ago', route: 'career' }));

  const dueRev = topics.filter(x => x.nextRevision && x.nextRevision <= t);
  dueRev.slice(0, 3).forEach(x => items.push({ id: 'rv:' + x.id + ':' + x.nextRevision, kind: 'revision', priority: x.nextRevision < t ? 'medium' : 'low', icon: 'RefreshCw', title: `Revise ${x.topic}`, detail: `${x.subject} · ${x.nextRevision < t ? 'overdue ' + relDay(x.nextRevision) : 'due today'}`, route: 'gate', ref: { paper: x.paper, subject: x.subject, topic: x.id } }));
  if (dueRev.length > 3) items.push({ id: 'rv-more:' + t, kind: 'revision', priority: 'low', icon: 'RefreshCw', title: `${dueRev.length - 3} more topics due for revision`, detail: 'See the GATE revision queue', route: 'gate' });

  projects.filter(p => !['completed', 'archived'].includes(p.status)).forEach(p => {
    (p.milestones || []).filter(m => !m.done && m.date && (m.date < t || soon(m.date, 5))).slice(0, 1).forEach(m => items.push({ id: 'ms:' + m.id, kind: 'milestone', priority: m.date < t ? 'high' : 'medium', icon: 'Milestone', title: `${p.name}: ${m.title}`, detail: m.date < t ? `Overdue since ${fmtDate(m.date)}` : `Milestone ${relDay(m.date)}`, route: 'projects', ref: { project: p.id } }));
    if (p.targetDate && p.targetDate < t) items.push({ id: 'pt:' + p.id, kind: 'milestone', priority: 'medium', icon: 'FolderKanban', title: `${p.name} passed its target date`, detail: `Target was ${fmtDate(p.targetDate)}`, route: 'projects', ref: { project: p.id } });
  });

  const today = getTodayTasks(tasks);
  if (today.length >= 3 && today.every(x => x.done)) items.push({ id: 'goal-day:' + t, kind: 'goal', priority: 'low', icon: 'Trophy', title: 'Today’s plan is complete', detail: `${today.length} of ${today.length} tasks done`, route: 'today' });
  projects.filter(p => projectProgress(p, tasks).pct === 100 && projectProgress(p, tasks).total >= 3 && p.status === 'active').slice(0, 1).forEach(p => items.push({ id: 'goal-p:' + p.id, kind: 'goal', priority: 'low', icon: 'Trophy', title: `${p.name} is 100% complete`, detail: 'Mark it completed?', route: 'projects', ref: { project: p.id } }));

  const hidden = readDismissed();
  return items.filter(i => hidden[i.id] !== t).sort((a, b) => RANK[a.priority] - RANK[b.priority]).slice(0, 25);
}
