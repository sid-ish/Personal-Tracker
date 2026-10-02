import { taskService } from './task-service.js';
import { gateService } from './gate-service.js';
import { projectService } from './project-service.js';
import { careerService } from './career-service.js';
import { knowledgeService } from './knowledge-service.js';

/** Dot/legend classes used by the calendar component. */
export const KIND_META = {
  task: { label: 'Tasks', cls: 'task', icon: 'ListChecks' }, session: { label: 'Study sessions', cls: 'session', icon: 'Timer' },
  event: { label: 'Events', cls: 'event', icon: 'Calendar' }, deadline: { label: 'Deadlines', cls: 'deadline', icon: 'Flag' },
  milestone: { label: 'Milestones', cls: 'milestone', icon: 'Milestone' }, revision: { label: 'GATE revisions', cls: 'revision', icon: 'RefreshCw' },
  interview: { label: 'Interviews', cls: 'event', icon: 'Users' },
};
const DEADLINE_TYPES = ['Deadline', 'Exam'];

/** One flat, date-keyed feed of everything that belongs on a calendar. */
export async function getCalendarItems() {
  const [tasks, sessions, events, projects, interns, unis, topics] = await Promise.all([
    taskService.getAll(), gateService.sessions.getAll(), knowledgeService.events.getAll(), projectService.getAll(),
    careerService.internships.getAll(), careerService.universities.getAll(), gateService.topics.getAll(),
  ]);
  const items = [];
  tasks.forEach(t => t.date && items.push({ id: 't:' + t.id, date: t.date, kind: 'task', title: t.text, sub: t.category, done: !!t.done, priority: t.priority, ref: { type: 'task', id: t.id } }));
  sessions.forEach(s => s.date && items.push({ id: 's:' + s.id, date: s.date, kind: 'session', title: s.what || 'Study session', sub: s.durationMin + ' min', done: true, ref: { type: 'session', id: s.id } }));
  events.forEach(e => e.date && items.push({ id: 'e:' + e.id, date: e.date, time: e.time || '', kind: e.etype === 'Interview' ? 'interview' : DEADLINE_TYPES.includes(e.etype) ? 'deadline' : 'event', title: e.title, sub: [e.etype, e.location].filter(Boolean).join(' · '), ref: { type: 'event', id: e.id } }));
  projects.forEach(p => { (p.milestones || []).forEach(m => m.date && items.push({ id: 'm:' + m.id, date: m.date, kind: 'milestone', title: m.title, sub: p.name, done: !!m.done, ref: { type: 'project', id: p.id } })); if (p.targetDate) items.push({ id: 'pd:' + p.id, date: p.targetDate, kind: 'deadline', title: p.name + ' target', sub: 'Project', ref: { type: 'project', id: p.id } }); });
  interns.forEach(i => { if (i.deadline) items.push({ id: 'id:' + i.id, date: i.deadline, kind: 'deadline', title: `${i.company} application`, sub: i.role || 'Internship', ref: { type: 'career', id: i.id } }); if (i.interviewDate) items.push({ id: 'ii:' + i.id, date: i.interviewDate, kind: 'interview', title: `${i.company} interview`, sub: i.role || '', ref: { type: 'career', id: i.id } }); });
  unis.forEach(u => u.deadline && items.push({ id: 'u:' + u.id, date: u.deadline, kind: 'deadline', title: `${u.name} deadline`, sub: u.program || 'Higher studies', ref: { type: 'career', id: u.id } }));
  topics.forEach(t => t.nextRevision && items.push({ id: 'r:' + t.id, date: t.nextRevision, kind: 'revision', title: `Revise ${t.topic}`, sub: t.subject, ref: { type: 'gate', id: t.id } }));
  return items;
}
export function groupByDate(items) { const m = new Map(); items.forEach(i => { if (!m.has(i.date)) m.set(i.date, []); m.get(i.date).push(i); }); return m; }
export const itemsOn = (items, date) => items.filter(i => i.date === date).sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);

/* Original helpers kept for existing callers */
export const calendarService = {
  getTasks: () => taskService.getAll(),
  pendingDates: tasks => new Set(tasks.filter(t => !t.done).map(t => t.date)),
  tasksOn: (tasks, date) => tasks.filter(t => t.date === date),
};
