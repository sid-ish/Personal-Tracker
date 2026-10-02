import { render as rerender } from '../../app/router.js';
import { appState } from '../../app/state.js';
import { projectService } from '../../services/project-service.js';
import { taskService } from '../../services/task-service.js';
import { projectProgress, nextMilestone } from '../../utils/calculations.js';
import { todayStr, fmtDate, relDay } from '../../utils/dates.js';
import { uid } from '../../utils/dom.js';
import { esc } from '../../utils/escape-html.js';
import { icon } from '../../components/icons.js';
import { progressBar } from '../../components/progress.js';
import { taskRowsHtml, taskQuickAddHtml } from '../../components/task-list.js';
import { emptyState } from '../../components/empty-state.js';
import { openProjectForm, openMilestoneForm } from '../../components/entity-forms.js';
import { openForm } from '../../components/forms.js';
import { openMenu } from '../../components/dropdown.js';
import { confirmModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { PROJECT_STATUSES } from '../../app/constants.js';
import { isHttpUrl } from '../../utils/validation.js';

const STATUS_CHIP = { active: 'green', planned: 'cyan', idea: '', paused: 'yellow', completed: 'primary', archived: '' };
const TABS = ['overview', 'tasks', 'milestones', 'notes', 'resources', 'timeline'];

export async function render() {
  const [projects, tasks] = await Promise.all([projectService.getAll(), taskService.getAll()]);
  const open = projects.find(p => p.id === appState.openProjectId);
  if (open) return detail(open, tasks);
  appState.openProjectId = null;
  const order = PROJECT_STATUSES, filter = appState.projectFilter;
  const list = projects.filter(p => filter === 'all' || p.status === filter).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return `<div class="page-head"><div><h1>Projects</h1><div class="sub">${projects.length} project${projects.length === 1 ? '' : 's'} · ${projects.filter(p => p.status === 'active').length} active</div></div><div class="page-actions"><button class="btn primary" data-act="open-new" data-kind="project">${icon('Plus')}New project</button></div></div>
    ${projects.length ? `<div class="segmented mb-4" role="group" aria-label="Filter by status">${['all', ...PROJECT_STATUSES.slice(0, 5)].map(s => `<button data-act="proj-filter" data-s="${s}" aria-pressed="${filter === s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>` : ''}
    ${list.length ? `<div class="grid auto">${list.map(p => { const st = projectProgress(p, tasks), nm = nextMilestone(p), pt = tasks.filter(t => t.projectId === p.id), msN = (p.milestones || []).length;
      return `<article class="card interactive project-card" data-act="open-project" data-id="${p.id}" role="button" tabindex="0" aria-label="Open ${esc(p.name)}"><div class="row between top"><h3 class="clamp-2">${esc(p.name)}</h3><span class="chip ${STATUS_CHIP[p.status] || ''}">${p.status}</span></div>
        ${p.description ? `<p class="t-small secondary clamp-2">${esc(p.description)}</p>` : ''}<div><div class="row between t-caption muted mb-2"><span>${pt.filter(t => t.done).length}/${pt.length} tasks · ${msN} milestone${msN === 1 ? '' : 's'}</span><span class="tnum">${st.pct}%</span></div>${progressBar(st.pct, 'green')}</div>
        <div class="t-caption muted">${nm ? `Next: ${esc(nm.title)}${nm.date ? ' · ' + relDay(nm.date) : ''}` : 'No upcoming milestone'}${p.targetDate ? ` · due ${fmtDate(p.targetDate)}` : ''}</div></article>`; }).join('')}</div>`
      : projects.length ? emptyState({ title: `No ${filter} projects`, text: 'Try a different filter.' }) : emptyState({ icon: 'FolderKanban', title: 'No projects yet', text: 'Projects you create will appear here.', action: { label: 'Create project', act: 'open-new', icon: 'Plus', attrs: { kind: 'project' } } })}`;
}
function detail(p, tasks) {
  const st = projectProgress(p, tasks), pt = tasks.filter(t => t.projectId === p.id), tab = TABS.includes(appState.projectTab) ? appState.projectTab : 'overview', nm = nextMilestone(p), openT = pt.filter(t => !t.done);
  appState.addDate = todayStr(); appState.addProject = p.id;
  const ms = (p.milestones || []).slice().sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
  let body = '';
  if (tab === 'overview') body = `<div class="layout-2"><div class="col gap-6"><section class="card"><div class="card-title"><h3>About</h3></div><p class="secondary">${p.description ? esc(p.description) : '<span class="muted">No description yet. Use Edit to add one.</span>'}</p></section>
      <section class="card"><div class="card-title"><h3>Open tasks <span class="chip">${openT.length}</span></h3></div>${taskRowsHtml(openT.slice(0, 6), { emptyTitle: 'No open tasks', emptyText: 'Add the next step in the Tasks tab.' })}</section></div>
      <div class="col gap-6"><section class="card"><div class="metric"><span class="l">Progress</span><span class="n">${st.pct}%</span></div>${progressBar(st.pct, 'green thick')}<div class="t-caption muted mt-2">${st.source === 'tasks' ? `${st.done} of ${st.total} tasks done` : `${st.done} of ${st.total} milestones done (no tasks linked yet)`}</div></section>
      <section class="card"><div class="t-label mb-2">Next milestone</div>${nm ? `<div class="t-body" style="font-weight:600">${esc(nm.title)}</div><div class="t-caption muted">${nm.date ? relDay(nm.date) : 'No date'}</div>` : '<div class="t-small muted">None set.</div>'}${p.targetDate ? `<div class="divider"></div><div class="t-label mb-1">Deadline</div><div class="t-body">${fmtDate(p.targetDate, { day: 'numeric', month: 'long', year: 'numeric' })} <span class="muted">· ${relDay(p.targetDate)}</span></div>` : ''}</section></div></div>`;
  else if (tab === 'tasks') body = `<section class="card">${taskRowsHtml(pt.sort((a, b) => a.done - b.done), { showDate: true, emptyTitle: 'No tasks linked', emptyText: 'Tasks you add here are linked to this project.' })}${taskQuickAddHtml({ date: todayStr(), projectId: p.id, id: 'proj' })}</section>`;
  else if (tab === 'milestones') body = `<section class="card"><div class="card-title"><h3>Milestones</h3><button class="btn sm primary" data-act="ms-add" data-id="${p.id}">${icon('Plus', 'sm')}Add</button></div>${ms.length ? ms.map(m => `<div class="ms-row"><input type="checkbox" class="check" data-act="ms-toggle" data-id="${p.id}" data-ms="${m.id}" ${m.done ? 'checked' : ''} aria-label="Complete milestone: ${esc(m.title)}"><div class="grow ${m.done ? 'muted' : ''}"><div class="t-small">${esc(m.title)}</div><div class="t-caption muted">${m.date ? fmtDate(m.date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}</div></div>${!m.done && m.date && m.date < todayStr() ? '<span class="chip red">Overdue</span>' : ''}<button class="btn icon sm ghost" data-act="ms-menu" data-id="${p.id}" data-ms="${m.id}" aria-haspopup="menu" aria-label="Milestone options">${icon('MoreHorizontal')}</button></div>`).join('') : emptyState({ compact: true, title: 'No milestones yet', text: 'Break the project into checkpoints.', action: { label: 'Add milestone', act: 'ms-add', attrs: { id: p.id } } })}</section>`;
  else if (tab === 'notes') body = `<section class="card"><label class="label" for="pnotes">Project notes</label><textarea class="notesbox" id="pnotes" data-act="proj-notes" data-id="${p.id}" rows="12" placeholder="Design decisions, test results, ideas…">${esc(p.notes || '')}</textarea><div class="t-caption muted mt-2">Saved automatically when you click away.</div></section>`;
  else if (tab === 'resources') body = `<section class="card"><div class="card-title"><h3>Resources</h3><button class="btn sm primary" data-act="res-add" data-id="${p.id}">${icon('Plus', 'sm')}Add</button></div>${(p.resources || []).length ? p.resources.map(r => `<div class="list-row">${icon('Link')}<div class="grow truncate">${r.url ? `<a class="text-primary" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)}</div><button class="btn icon sm ghost" data-act="res-rm" data-id="${p.id}" data-r="${r.id}" aria-label="Remove ${esc(r.title)}">${icon('Trash2', 'sm')}</button></div>`).join('') : emptyState({ compact: true, title: 'No resources', text: 'Save datasheets, repos, papers and CAD links here.', action: { label: 'Add resource', act: 'res-add', attrs: { id: p.id } } })}</section>`;
  else { const ev = [...(p.changelog || []).map(c => ({ d: c.date, t: c.title, s: c.desc, k: '' })), ...ms.filter(m => m.date || m.done).map(m => ({ d: m.date || '', t: m.title, s: 'Milestone', k: m.done ? 'ms done' : 'ms' })), ...pt.filter(t => t.completedAt).map(t => ({ d: t.completedAt.slice(0, 10), t: t.text, s: 'Task completed', k: 'done' }))].filter(e => e.d).sort((a, b) => a.d < b.d ? 1 : -1);
    body = `<section class="card"><div class="card-title"><h3>Timeline</h3><button class="btn sm primary" data-act="log-add" data-id="${p.id}">${icon('Plus', 'sm')}Log update</button></div>${ev.length ? `<ul class="tl-vert">${ev.map(e => `<li class="${e.k}"><div class="t-small" style="font-weight:600">${esc(e.t)}</div><div class="t-caption muted">${fmtDate(e.d, { day: 'numeric', month: 'short', year: 'numeric' })}${e.s ? ' · ' + esc(e.s) : ''}</div></li>`).join('')}</ul>` : emptyState({ compact: true, title: 'Nothing on the timeline', text: 'Logged updates, milestones and finished tasks appear here.' })}</section>`; }
  return `<div class="page-head"><div><button class="btn sm ghost mb-2" data-act="close-project">${icon('ArrowLeft', 'sm')}All projects</button><h1>${esc(p.name)} <span class="chip ${STATUS_CHIP[p.status] || ''}" style="vertical-align:middle">${p.status}</span></h1></div><div class="page-actions"><button class="btn" data-act="proj-edit" data-id="${p.id}">${icon('Pencil')}Edit</button><button class="btn danger" data-act="proj-del" data-id="${p.id}">${icon('Trash2')}Delete</button></div></div>
    <div class="tabs" role="tablist" aria-label="Project sections">${TABS.map(t => `<button role="tab" aria-selected="${tab === t}" class="${tab === t ? 'active' : ''}" data-act="proj-tab" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>${body}`;
}
const mutate = async (id, fn) => { const p = await projectService.get(id); fn(p); await projectService.put(p); };
export const actions = {
  click: {
    'open-project': el => { appState.openProjectId = el.dataset.id; appState.projectTab = 'overview'; },
    'close-project': () => { appState.openProjectId = null; }, 'proj-tab': el => { appState.projectTab = el.dataset.t; }, 'proj-filter': el => { appState.projectFilter = el.dataset.s; },
    'proj-edit': async el => { openProjectForm(await projectService.get(el.dataset.id)); return false; },
    'proj-del': async el => { const p = await projectService.get(el.dataset.id); if (!await confirmModal({ title: `Delete “${p.name}”?`, message: 'The project is removed. Its tasks are kept but unlinked.', confirmLabel: 'Delete project', danger: true })) return false; await projectService.deleteProject(p.id); appState.openProjectId = null; toast.success('Project deleted'); },
    'ms-add': async el => { openMilestoneForm(await projectService.get(el.dataset.id)); return false; },
    'ms-toggle': () => false,
    'ms-menu': async el => { const p = await projectService.get(el.dataset.id), m = p.milestones.find(x => x.id === el.dataset.ms); openMenu(el, [{ label: 'Edit', icon: 'Pencil', onClick: () => openMilestoneForm(p, m) }, { label: 'Delete', icon: 'Trash2', danger: true, onClick: async () => { if (await confirmModal({ title: 'Delete this milestone?', message: `“${m.title}” will be removed.`, confirmLabel: 'Delete', danger: true })) { await mutate(p.id, x => { x.milestones = x.milestones.filter(y => y.id !== m.id); }); toast.success('Milestone deleted'); rerender(); } } }], { align: 'right' }); return false; },
    'res-add': el => { openForm({ title: 'Add resource', fields: [{ name: 'title', label: 'Title', required: true, full: true }, { name: 'url', label: 'Link', full: true, placeholder: 'https://…', validate: v => v && !isHttpUrl(v) ? 'Use a full http(s) link.' : '' }], onSubmit: async v => { await mutate(el.dataset.id, p => { (p.resources = p.resources || []).push({ id: uid('r'), title: v.title, url: v.url || '' }); }); toast.success('Resource added'); rerender(); } }); return false; },
    'res-rm': async el => { await mutate(el.dataset.id, p => { p.resources = (p.resources || []).filter(r => r.id !== el.dataset.r); }); toast.info('Resource removed'); },
    'log-add': el => { openForm({ title: 'Log update', fields: [{ name: 'title', label: 'What changed?', required: true, full: true }, { name: 'desc', label: 'Details', type: 'textarea', full: true, rows: 3 }], submitLabel: 'Log update', onSubmit: async v => { await mutate(el.dataset.id, p => { (p.changelog = p.changelog || []).push({ date: todayStr(), title: v.title, desc: v.desc || '' }); }); toast.success('Project updated'); rerender(); } }); return false; },
  },
  change: { 'ms-toggle': async el => { await mutate(el.dataset.id, p => { const m = p.milestones.find(x => x.id === el.dataset.ms); m.done = el.checked; }); if (el.checked) toast.success('Milestone complete'); } },
  focusout: { 'proj-notes': async el => { const p = await projectService.get(el.dataset.id); if (p && (p.notes || '') !== el.value) { p.notes = el.value; await projectService.put(p); toast.success('Notes saved', { duration: 1400 }); } return false; } },
};
