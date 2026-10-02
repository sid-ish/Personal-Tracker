import { taskService } from '../task-service.js';
import { gateService } from '../gate-service.js';
import { projectService } from '../project-service.js';
import { careerService } from '../career-service.js';
import { knowledgeService } from '../knowledge-service.js';
import { fuzzyScore } from '../../utils/fuzzy.js';
import { fmtDate } from '../../utils/dates.js';

const GROUP_ORDER = ['GATE', 'Knowledge', 'Tasks', 'Projects', 'Career', 'Events', 'Mistakes', 'Notes'];
const GROUP_ICON = { GATE: 'GraduationCap', Knowledge: 'BookOpen', Tasks: 'ListChecks', Projects: 'FolderKanban', Career: 'Briefcase', Events: 'Calendar', Mistakes: 'Bug', Notes: 'StickyNote' };
const snip = (t, q) => { t = String(t || '').replace(/\s+/g, ' '); const i = t.toLowerCase().indexOf(String(q).toLowerCase()); return i < 0 ? t.slice(0, 80) : (i > 30 ? '…' : '') + t.slice(Math.max(0, i - 30), i + 60); };

/** Builds a fresh in-memory index from every store (cheap at personal-data scale) and ranks it against `query`. */
export async function searchAll(query, { perGroup = 6, max = 30 } = {}) {
  const q = String(query || '').trim(); if (!q) return [];
  const [tasks, topics, projects, interns, unis, skills, resume, events, notes, resources, docs, mistakes, achievements] = await Promise.all([
    taskService.getAll(), gateService.topics.getAll(), projectService.getAll(), careerService.internships.getAll(), careerService.universities.getAll(), careerService.skills.getAll(), careerService.resume.getAll(),
    knowledgeService.events.getAll(), knowledgeService.notes.getAll(), knowledgeService.resources.getAll(), knowledgeService.documents.getAll(), gateService.mistakes.getAll(), knowledgeService.achievements.getAll()]);
  const out = []; const push = (group, title, sub, route, ref, secondary = '', tags = []) => {
    const s = Math.max(fuzzyScore(q, title), fuzzyScore(q, (tags || []).join(' ')) * .8, fuzzyScore(q, secondary) * .45, fuzzyScore(q, sub) * .3); if (s > 0) out.push({ group, title, sub, route, ref, score: s, icon: GROUP_ICON[group], snippet: s < fuzzyScore(q, title) + 1 && secondary ? snip(secondary, q) : '' });
  };
  topics.forEach(t => {
    push('GATE', t.topic, `${t.paper} · ${t.subject}`, 'gate', { paper: t.paper, subject: t.subject, topic: t.id });
    (t.subtopics || []).forEach(s => push('GATE', s.n, `${t.topic} · ${t.subject}`, 'gate', { paper: t.paper, subject: t.subject, topic: t.id }));
    if (t.notes) push('Notes', `Notes: ${t.topic}`, `${t.paper} · ${t.subject}`, 'gate', { paper: t.paper, subject: t.subject, topic: t.id }, t.notes);
  });
  notes.forEach(n => push('Knowledge', n.title, `${({ note: 'Note', concept: 'Concept', reference: 'Reference' })[n.kind || 'note']}${n.tags?.length ? ' · #' + n.tags.join(' #') : ''}`, 'knowledge', { tab: n.kind === 'concept' ? 'concepts' : n.kind === 'reference' ? 'references' : 'notes', item: n.id, store: 'notes' }, n.content, n.tags));
  resources.forEach(r => push('Knowledge', r.title, `Resource · ${r.rtype}`, 'knowledge', { tab: 'resources', item: r.id, store: 'resources' }, r.url, r.tags));
  docs.forEach(d => push('Knowledge', d.name, `Document · ${d.category}`, 'knowledge', { tab: 'documents', item: d.id, store: 'documents' }, d.url, d.tags));
  achievements.forEach(a => push('Knowledge', a.title, `Achievement · ${a.atype}`, 'knowledge', { tab: 'achievements', item: a.id, store: 'achievements' }, a.description));
  mistakes.forEach(m => push('Mistakes', m.topic || m.subject, `${m.paper || 'ME'} · ${m.mtype}`, 'knowledge', { tab: 'mistakes', item: m.id, store: 'mistakes' }, `${m.what} ${m.correct || ''}`));
  tasks.forEach(t => push('Tasks', t.text, `${t.done ? 'Done' : 'Open'} · ${fmtDate(t.date)}`, 'task', { date: t.date, id: t.id }));
  projects.forEach(p => push('Projects', p.name, `Project · ${p.status}`, 'projects', { project: p.id }, `${p.description || ''} ${p.notes || ''}`));
  interns.forEach(i => push('Career', `${i.company}${i.role ? ' — ' + i.role : ''}`, `Application · ${i.status}`, 'career', { tab: 'pipeline', item: i.id }, `${i.notes || ''} ${i.nextAction || ''}`));
  unis.forEach(u => push('Career', u.name, `University · ${u.country || ''}`, 'career', { tab: 'highered', item: u.id }, u.program));
  skills.forEach(s => push('Career', s.name, `Skill · ${s.category}`, 'career', { tab: 'skills' }, s.evidence));
  resume.forEach(r => push('Career', r.title, `Resume · ${r.section}`, 'career', { tab: 'resume' }, r.description));
  events.forEach(e => push('Events', e.title, `${e.etype} · ${fmtDate(e.date)}`, 'calendar', { date: e.date }, e.location));
  const counts = {}; const ranked = out.sort((a, b) => b.score - a.score).filter(r => (counts[r.group] = (counts[r.group] || 0) + 1) <= perGroup).slice(0, max);
  return GROUP_ORDER.map(g => ({ group: g, items: ranked.filter(r => r.group === g) })).filter(g => g.items.length);
}
