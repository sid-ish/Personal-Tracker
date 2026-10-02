import { openForm } from './forms.js';
import { toast } from './toast.js';
import { render } from '../app/router.js';
import { taskService } from '../services/task-service.js';
import { projectService } from '../services/project-service.js';
import { knowledgeService } from '../services/knowledge-service.js';
import { careerService } from '../services/career-service.js';
import { gateService } from '../services/gate-service.js';
import { TASK_CATEGORIES, PRIORITIES, EVENT_TYPES, PROJECT_STATUSES, INTERN_STATUSES, RESOURCE_TYPES, DOC_CATS } from '../app/constants.js';
import { todayStr } from '../utils/dates.js';
import { uid } from '../utils/dom.js';
import { parseTags } from '../utils/formatting.js';
import { isHttpUrl, isValidDate } from '../utils/validation.js';

const done = async msg => { toast.success(msg); await render(); };
const dateOk = v => v && !isValidDate(v) ? 'Enter a valid date.' : '';
const urlOk = v => v && !isHttpUrl(v) ? 'Use a full link starting with http:// or https://' : '';

export async function openTaskForm(task = null, { date, projectId } = {}) {
  const projects = (await projectService.getAll()).filter(p => !['archived', 'completed'].includes(p.status) || p.id === task?.projectId);
  openForm({ title: task ? 'Edit task' : 'New task', submitLabel: task ? 'Save changes' : 'Add task',
    values: task ? { ...task, estimatedMinutes: task.estimatedMinutes || '' } : { date: date || todayStr(), priority: 'medium', category: projectId ? 'project' : 'academic', projectId: projectId || '' },
    fields: [
      { name: 'text', label: 'Task', required: true, full: true, placeholder: 'What needs doing?' },
      { name: 'date', label: 'Due date', type: 'date', validate: dateOk }, { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
      { name: 'category', label: 'Category', type: 'select', options: TASK_CATEGORIES },
      { name: 'projectId', label: 'Project', type: 'select', options: [['', 'None'], ...projects.map(p => [p.id, p.name])] },
      { name: 'estimatedMinutes', label: 'Estimate (minutes)', type: 'number', min: 0, hint: 'Optional. Used for planned time.' },
    ],
    onSubmit: async v => { const base = task || { id: 't' + Date.now() + Math.random().toString(36).slice(2, 6), done: false, createdAt: new Date().toISOString() };
      await taskService.put({ ...base, text: v.text, date: v.date || todayStr(), priority: v.priority, category: v.category, projectId: v.projectId || null, estimatedMinutes: v.estimatedMinutes ? +v.estimatedMinutes : base.estimatedMinutes }); await done(task ? 'Task updated' : 'Task added'); } });
}
export function openEventForm(ev = null, { date } = {}) {
  openForm({ title: ev ? 'Edit event' : 'New event', submitLabel: ev ? 'Save changes' : 'Add event', values: ev || { date: date || todayStr(), etype: 'Meeting' },
    fields: [{ name: 'title', label: 'Title', required: true, full: true }, { name: 'etype', label: 'Type', type: 'select', options: EVENT_TYPES }, { name: 'date', label: 'Date', type: 'date', required: true, validate: dateOk },
      { name: 'time', label: 'Time', type: 'time' }, { name: 'location', label: 'Location' }, { name: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 3 }],
    onSubmit: async v => { await knowledgeService.events.put({ ...(ev || { id: 'ev' + Date.now() }), title: v.title, etype: v.etype, date: v.date, time: v.time || '', location: v.location || '', notes: v.notes || '' }); await done(ev ? 'Event updated' : 'Event added'); } });
}
export function openProjectForm(p = null) {
  openForm({ title: p ? 'Edit project' : 'New project', submitLabel: p ? 'Save changes' : 'Create project', values: p || { status: 'active' },
    fields: [{ name: 'name', label: 'Name', required: true, full: true }, { name: 'status', label: 'Status', type: 'select', options: PROJECT_STATUSES }, { name: 'targetDate', label: 'Deadline', type: 'date', validate: dateOk },
      { name: 'description', label: 'Description', type: 'textarea', full: true, rows: 3 }],
    onSubmit: async v => { const base = p || { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), changelog: [], milestones: [], notes: '', resources: [], createdAt: new Date().toISOString() };
      await projectService.put({ ...base, name: v.name, status: v.status, targetDate: v.targetDate || null, description: v.description || '' }); await done(p ? 'Project updated' : 'Project created'); } });
}
export function openMilestoneForm(project, m = null) {
  openForm({ title: m ? 'Edit milestone' : 'New milestone', submitLabel: m ? 'Save changes' : 'Add milestone', values: m || {},
    fields: [{ name: 'title', label: 'Milestone', required: true, full: true }, { name: 'date', label: 'Target date', type: 'date', validate: dateOk }],
    onSubmit: async v => { const p = await projectService.get(project.id); p.milestones = p.milestones || []; if (m) Object.assign(p.milestones.find(x => x.id === m.id), { title: v.title, date: v.date || null }); else p.milestones.push({ id: uid('ms'), title: v.title, date: v.date || null, done: false }); await projectService.put(p); await done(m ? 'Milestone updated' : 'Milestone added'); } });
}
export function openSessionForm(s = null) {
  openForm({ title: s ? 'Edit study session' : 'Log study session', submitLabel: s ? 'Save changes' : 'Log session', values: s || { date: todayStr(), category: 'gate', durationMin: 60 },
    fields: [{ name: 'what', label: 'What did you study?', required: true, full: true, placeholder: 'e.g. Transient conduction numericals' }, { name: 'date', label: 'Date', type: 'date', required: true, validate: dateOk },
      { name: 'durationMin', label: 'Duration (minutes)', type: 'number', required: true, min: 1, validate: v => (+v > 0 && +v <= 1440) ? '' : 'Enter minutes between 1 and 1440.' }, { name: 'category', label: 'Category', type: 'select', options: TASK_CATEGORIES }],
    onSubmit: async v => { await gateService.sessions.put({ ...(s || { id: 'ss' + Date.now(), createdAt: new Date().toISOString() }), date: v.date, category: v.category, what: v.what, durationMin: Math.round(+v.durationMin) }); await done('Study session logged'); } });
}

const KINDS = [['note', 'Note'], ['concept', 'Concept'], ['reference', 'Reference'], ['resource', 'Resource'], ['document', 'Document']];
const NOTE_KINDS = ['note', 'concept', 'reference'];
/** One form for everything in Knowledge. Editing keeps the item in its own store (note/concept/reference can swap among themselves). */
export function openKnowledgeForm(item = null, { kind = 'note', store = null } = {}) {
  const editing = !!item; const st = store || (kind === 'resource' ? 'resources' : kind === 'document' ? 'documents' : 'notes');
  const kinds = editing ? KINDS.filter(([k]) => (st === 'notes' ? NOTE_KINDS.includes(k) : st === 'resources' ? k === 'resource' : k === 'document')) : KINDS;
  const k0 = editing ? (st === 'notes' ? (item.kind || 'note') : st === 'resources' ? 'resource' : 'document') : kind;
  const values = editing ? { kind: k0, title: item.title || item.name, content: item.content || '', url: item.url || '', rtype: item.rtype || 'Website', category: item.category || 'Other', tags: (item.tags || []).join(', ') } : { kind: k0, rtype: 'Website', category: 'Other' };
  openForm({ title: editing ? 'Edit knowledge item' : 'New knowledge', submitLabel: editing ? 'Save changes' : 'Save', values, wide: true,
    fields: [{ name: 'kind', label: 'Type', type: 'select', options: kinds }, { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Convection notes' },
      { name: 'content', label: 'Content', type: 'textarea', full: true, rows: 6, showIf: { field: 'kind', in: NOTE_KINDS }, hint: 'Use #tags inline or the Tags field.' },
      { name: 'url', label: 'Link', full: true, type: 'url', placeholder: 'https://…', validate: urlOk, showIf: { field: 'kind', in: ['reference', 'resource', 'document'] } },
      { name: 'rtype', label: 'Resource type', type: 'select', options: RESOURCE_TYPES, showIf: { field: 'kind', in: ['resource'] } },
      { name: 'category', label: 'Document category', type: 'select', options: DOC_CATS, showIf: { field: 'kind', in: ['document'] } },
      { name: 'tags', label: 'Tags', full: true, placeholder: 'gate, heat-transfer, weak-area', hint: 'Comma or space separated.' }],
    onSubmit: async v => {
      const tags = parseTags(v.tags, v.content);
      if (NOTE_KINDS.includes(v.kind)) await knowledgeService.notes.put({ ...(editing ? item : { id: 'n' + Date.now() }), title: v.title, content: v.content || '', kind: v.kind, url: v.url || '', tags, updatedAt: new Date().toISOString() });
      else if (v.kind === 'resource') await knowledgeService.resources.put({ ...(editing ? item : { id: 'res' + Date.now(), status: 'saved' }), title: v.title, rtype: v.rtype, url: v.url || '', tags });
      else await knowledgeService.documents.put({ ...(editing ? item : { id: 'doc' + Date.now() }), name: v.title, category: v.category, url: v.url || '', tags });
      await done(editing ? 'Knowledge updated' : 'Knowledge saved'); } });
}
export function openCareerForm(i = null, { status } = {}) {
  openForm({ title: i ? 'Edit application' : 'New career entry', submitLabel: i ? 'Save changes' : 'Add entry', wide: true, values: i || { status: status || 'saved' },
    fields: [{ name: 'company', label: 'Company', required: true }, { name: 'role', label: 'Role' }, { name: 'status', label: 'Status', type: 'select', options: INTERN_STATUSES },
      { name: 'type', label: 'Type', placeholder: 'remote / onsite / hybrid' }, { name: 'location', label: 'Location' }, { name: 'startDate', label: 'Start date', type: 'date', validate: dateOk },
      { name: 'deadline', label: 'Application deadline', type: 'date', validate: dateOk }, { name: 'interviewDate', label: 'Interview date', type: 'date', validate: dateOk },
      { name: 'nextAction', label: 'Next action', full: true, placeholder: 'e.g. Send follow-up email' }, { name: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 3 }],
    onSubmit: async v => { await careerService.internships.put({ ...(i || { id: 'in' + Date.now(), createdAt: new Date().toISOString() }), company: v.company, role: v.role || '', status: v.status, type: v.type || '', location: v.location || '', startDate: v.startDate || null, deadline: v.deadline || null, interviewDate: v.interviewDate || null, nextAction: v.nextAction || '', notes: v.notes || '' }); await done(i ? 'Application updated' : 'Entry added'); } });
}
export const openNoteForm = () => openKnowledgeForm(null, { kind: 'note' });

const OPENERS = { task: openTaskForm, event: openEventForm, project: openProjectForm, session: openSessionForm, knowledge: () => openKnowledgeForm(), career: () => openCareerForm(), note: openNoteForm };
export function openNew(kind, ctx = {}) { return kind === 'task' ? openTaskForm(null, ctx) : kind === 'event' ? openEventForm(null, ctx) : OPENERS[kind]?.(); }
export const entityFormActions = { click: { 'open-new': el => { openNew(el.dataset.kind, { date: el.dataset.date || undefined, projectId: el.dataset.project || undefined }); return false; } } };
