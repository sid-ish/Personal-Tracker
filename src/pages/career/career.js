import { PIPELINE, INTERN_STATUSES, RESUME_SECTIONS, SKILL_CATS, UNI_CHECKLIST } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { careerService } from '../../services/career-service.js';
import { todayStr, fmtDate, relDay, daysBetween } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { icon } from '../../components/icons.js';
import { emptyState } from '../../components/empty-state.js';
import { openCareerForm } from '../../components/entity-forms.js';
import { openForm } from '../../components/forms.js';
import { openMenu } from '../../components/dropdown.js';
import { confirmModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { progressBar } from '../../components/progress.js';
import { render as rerender } from '../../app/router.js';
import { isValidDate } from '../../utils/validation.js';

const TABS = [['pipeline', 'Pipeline'], ['highered', 'Higher studies'], ['skills', 'Skills'], ['resume', 'Resume']];
const colOf = s => PIPELINE.find(c => c.statuses.includes(s)) || PIPELINE[0];

export async function render() {
  const tab = TABS.some(([k]) => k === appState.careerTab) ? appState.careerTab : 'pipeline';
  const body = tab === 'pipeline' ? await pipeline() : tab === 'highered' ? await higherEd() : tab === 'skills' ? await skills() : await resume();
  const primary = tab === 'pipeline' ? `<button class="btn primary" data-act="open-new" data-kind="career">${icon('Plus')}New entry</button>` : tab === 'highered' ? `<button class="btn primary" data-act="uni-add">${icon('Plus')}Add university</button>` : tab === 'skills' ? `<button class="btn primary" data-act="skill-add">${icon('Plus')}Add skill</button>` : `<button class="btn primary" data-act="resume-add">${icon('Plus')}Add entry</button>`;
  return `<div class="page-head"><div><h1>Career</h1><div class="sub">Applications, higher studies, skills and your resume.</div></div><div class="page-actions">${primary}</div></div>
    <div class="tabs" role="tablist" aria-label="Career sections">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'active' : ''}" data-act="switch-career" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}
async function pipeline() {
  const items = await careerService.internships.getAll(), t = todayStr();
  const live = items.filter(i => !['rejected', 'withdrawn'].includes(i.status));
  const dl = live.filter(i => i.deadline && i.deadline >= t).sort((a, b) => a.deadline < b.deadline ? -1 : 1);
  const follow = items.filter(i => i.nextAction && !['rejected', 'withdrawn', 'accepted'].includes(i.status));
  const stat = (l, n, s = '') => `<div class="card metric tight"><span class="l">${l}</span><span class="n">${n}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  const header = `<div class="grid c4 section">${stat('Applications', items.filter(i => i.status !== 'saved').length, `${items.length} tracked`)}${stat('Interviews', items.filter(i => i.status === 'interview').length, items.filter(i => i.interviewDate && i.interviewDate >= t).length + ' scheduled')}${stat('Upcoming deadlines', dl.length, dl[0] ? `Next: ${esc(dl[0].company)} ${relDay(dl[0].deadline)}` : 'None')}${stat('Follow-ups', follow.length, follow.length ? 'Actions pending' : 'All caught up')}</div>`;
  if (!items.length) return header + emptyState({ icon: 'Briefcase', title: 'No applications yet', text: 'Track internships and jobs from saved to offer.', action: { label: 'Add entry', act: 'open-new', icon: 'Plus', attrs: { kind: 'career' } } });
  const cols = PIPELINE.map(c => { const list = items.filter(i => colOf(i.status).id === c.id).sort((a, b) => (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1);
    return `<section class="kcol" data-col="${c.id}" aria-label="${c.label}, ${list.length}"><div class="kcol-head"><span class="t-small" style="font-weight:620">${c.label}</span><span class="chip">${list.length}</span></div>
      ${list.map(i => `<article class="kcard" draggable="true" data-card="${i.id}"><div class="row between top"><div class="grow"><div class="t-small" style="font-weight:620">${esc(i.company)}</div><div class="t-caption secondary">${esc(i.role || '')}</div></div><button class="btn icon sm ghost" data-act="card-menu" data-id="${i.id}" aria-haspopup="menu" aria-label="Options for ${esc(i.company)}">${icon('MoreHorizontal', 'sm')}</button></div>
        <div class="row wrap gap-2"><span class="chip ${i.status === 'offer' || i.status === 'accepted' ? 'green' : i.status === 'rejected' || i.status === 'withdrawn' ? 'red' : i.status === 'interview' ? 'cyan' : ''}">${i.status}</span>${i.deadline ? `<span class="chip ${i.deadline < t ? 'red' : daysBetween(t, i.deadline) <= 5 ? 'yellow' : ''}">${icon('Flag')}${fmtDate(i.deadline)}</span>` : ''}${i.startDate ? `<span class="chip">${icon('Calendar')}${fmtDate(i.startDate)}</span>` : ''}</div>
        ${i.nextAction ? `<div class="t-caption"><span class="muted">Next:</span> ${esc(i.nextAction)}</div>` : ''}${i.notes ? `<div class="t-caption muted clamp-2">${esc(i.notes)}</div>` : ''}${i.createdAt ? `<div class="t-caption muted">Added ${fmtDate(i.createdAt.slice(0, 10))}</div>` : ''}
        <label class="show-mobile t-caption muted" style="align-items:center;gap:8px">Move to <select class="select sm" data-act="intern-status" data-id="${i.id}" aria-label="Status for ${esc(i.company)}">${INTERN_STATUSES.map(o => `<option ${i.status === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label></article>`).join('') || `<div class="t-caption muted" style="padding:var(--sp-3)">Drop a card here</div>`}
      <button class="btn sm ghost" data-act="col-add" data-status="${c.statuses[0]}">${icon('Plus', 'sm')}Add</button></section>`; }).join('');
  return `${header}<div class="kanban" id="kanban">${cols}</div>`;
}
async function higherEd() {
  const unis = await careerService.universities.getAll(); unis.sort((a, b) => (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1);
  if (!unis.length) return emptyState({ icon: 'GraduationCap', title: 'No universities tracked', text: 'Add programs and track documents for each application.', action: { label: 'Add university', act: 'uni-add', icon: 'Plus' } });
  return `<div class="col gap-3">${unis.map(u => { const cl = u.checklist || {}, done = UNI_CHECKLIST.filter(k => cl[k]).length, pct = Math.round(done / UNI_CHECKLIST.length * 100), open = appState.openUniId === u.id;
    return `<article class="card"><div class="row between" data-act="toggle-uni" data-id="${u.id}" role="button" tabindex="0" aria-expanded="${open}" style="cursor:pointer"><div class="grow"><h3>${esc(u.name)} ${u.country ? `<span class="muted t-small">(${esc(u.country)})</span>` : ''}</h3><div class="t-caption muted">${esc(u.program || '')}${u.deadline ? ` · deadline ${fmtDate(u.deadline)} (${relDay(u.deadline)})` : ''}</div></div><span class="chip ${pct === 100 ? 'green' : 'primary'}">${pct}%</span>${icon(open ? 'ChevronDown' : 'ChevronRight', 'sm')}</div><div class="mt-3">${progressBar(pct)}</div>
      ${open ? `<div class="row wrap gap-4 mt-4">${UNI_CHECKLIST.map(k => `<label class="row gap-2 t-small"><input type="checkbox" data-act="uni-check" data-id="${u.id}" data-key="${k}" ${cl[k] ? 'checked' : ''}>${k}</label>`).join('')}</div><div class="row mt-4"><button class="btn sm danger" data-act="uni-del" data-id="${u.id}">${icon('Trash2', 'sm')}Delete</button></div>` : ''}</article>`; }).join('')}</div>`;
}
async function skills() {
  const list = await careerService.skills.getAll(); list.sort((a, b) => b.level - a.level);
  if (!list.length) return emptyState({ icon: 'Zap', title: 'No skills logged', text: 'Rate your skills 1–5 and note the evidence behind each.', action: { label: 'Add skill', act: 'skill-add', icon: 'Plus' } });
  return `<section class="card"><div class="list">${list.map(s => `<div class="list-row"><div class="grow"><div class="t-small" style="font-weight:600">${esc(s.name)} <span class="chip">${esc(s.category)}</span></div>${s.evidence ? `<div class="t-caption muted">${esc(s.evidence)}</div>` : ''}</div><select class="select sm" style="width:80px" data-act="skill-level" data-id="${s.id}" aria-label="Level for ${esc(s.name)}">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${s.level === n ? 'selected' : ''}>${n} / 5</option>`).join('')}</select><button class="btn icon sm ghost" data-act="skill-del" data-id="${s.id}" aria-label="Delete ${esc(s.name)}">${icon('Trash2', 'sm')}</button></div>`).join('')}</div></section>`;
}
async function resume() {
  const entries = await careerService.resume.getAll();
  if (!entries.length) return emptyState({ icon: 'FileText', title: 'No resume entries', text: 'Collect education, projects and achievements in one place.', action: { label: 'Add entry', act: 'resume-add', icon: 'Plus' } });
  const by = {}; entries.forEach(e => (by[e.section] = by[e.section] || []).push(e));
  return `<div class="col gap-4">${RESUME_SECTIONS.filter(s => by[s]).map(s => `<section class="card"><div class="card-title"><h3>${s}</h3></div><div class="list">${by[s].map(e => `<div class="list-row top" style="align-items:flex-start"><div class="grow"><div class="t-small" style="font-weight:600">${esc(e.title)}${e.organization ? ` <span class="muted" style="font-weight:400">— ${esc(e.organization)}</span>` : ''}</div>${e.date ? `<div class="t-caption muted">${esc(e.date)}</div>` : ''}${e.description ? `<div class="t-caption secondary mt-1">${esc(e.description)}</div>` : ''}</div><button class="btn icon sm ghost" data-act="resume-del" data-id="${e.id}" aria-label="Delete ${esc(e.title)}">${icon('Trash2', 'sm')}</button></div>`).join('')}</div></section>`).join('')}</div>`;
}
const c = careerService, ok = v => v && !isValidDate(v) ? 'Enter a valid date.' : '';
const del = async (repo, id, what) => { if (!await confirmModal({ title: `Delete this ${what}?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) return false; await repo.remove(id); toast.success(`${what[0].toUpperCase() + what.slice(1)} deleted`); };
const add = (title, fields, onSubmit) => { openForm({ title, fields, onSubmit: async v => { await onSubmit(v); toast.success('Saved'); await rerender(); } }); return false; };

export function mount(root) {
  const k = root.querySelector('#kanban'); if (!k || k.dataset.bound) return; k.dataset.bound = '1'; let dragId = null;
  k.addEventListener('dragstart', e => { const card = e.target.closest('[data-card]'); if (!card) return; dragId = card.dataset.card; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  k.addEventListener('dragend', e => { e.target.closest?.('[data-card]')?.classList.remove('dragging'); k.querySelectorAll('.over').forEach(x => x.classList.remove('over')); });
  k.addEventListener('dragover', e => { const col = e.target.closest('[data-col]'); if (col) { e.preventDefault(); k.querySelectorAll('.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); } });
  k.addEventListener('drop', async e => { const col = e.target.closest('[data-col]'); if (!col || !dragId) return; e.preventDefault(); const def = PIPELINE.find(p => p.id === col.dataset.col), i = await c.internships.get(dragId); if (i && colOf(i.status).id !== def.id) { i.status = def.statuses[0]; await c.internships.put(i); toast.success(`Moved to ${def.label}`); } dragId = null; await rerender(); });
}
export const actions = {
  click: {
    'switch-career': el => { appState.careerTab = el.dataset.tab; },
    'col-add': el => { openCareerForm(null, { status: el.dataset.status }); return false; },
    'card-menu': async el => { const i = await c.internships.get(el.dataset.id); openMenu(el, [{ label: 'Edit', icon: 'Pencil', onClick: () => openCareerForm(i) }, ...PIPELINE.filter(p => p.id !== colOf(i.status).id).map(p => ({ label: `Move to ${p.label}`, icon: 'ArrowRight', onClick: async () => { i.status = p.statuses[0]; await c.internships.put(i); toast.success(`Moved to ${p.label}`); await rerender(); } })), { separator: true }, { label: 'Delete', icon: 'Trash2', danger: true, onClick: async () => { if (await del(c.internships, i.id, 'application') !== false) await rerender(); } }], { align: 'right' }); return false; },
    'toggle-uni': el => { appState.openUniId = appState.openUniId === el.dataset.id ? null : el.dataset.id; },
    'uni-del': async el => { const r = await del(c.universities, el.dataset.id, 'university'); if (r !== false) appState.openUniId = null; return r; },
    'uni-add': () => add('Add university', [{ name: 'name', label: 'University', required: true }, { name: 'country', label: 'Country' }, { name: 'program', label: 'Program / degree' }, { name: 'deadline', label: 'Deadline', type: 'date', validate: ok }], v => c.universities.put({ id: 'u' + Date.now(), name: v.name, country: v.country || '', program: v.program || '', deadline: v.deadline || null, checklist: {}, createdAt: new Date().toISOString() })),
    'skill-del': el => del(c.skills, el.dataset.id, 'skill'),
    'skill-add': () => add('Add skill', [{ name: 'name', label: 'Skill', required: true }, { name: 'category', label: 'Category', type: 'select', options: SKILL_CATS }, { name: 'evidence', label: 'Evidence (project / internship)', full: true }], v => c.skills.put({ id: 'sk' + Date.now(), name: v.name, category: v.category, level: 1, evidence: v.evidence || '' })),
    'resume-del': el => del(c.resume, el.dataset.id, 'resume entry'),
    'resume-add': () => add('Add resume entry', [{ name: 'section', label: 'Section', type: 'select', options: RESUME_SECTIONS }, { name: 'title', label: 'Title', required: true }, { name: 'organization', label: 'Organization' }, { name: 'date', label: 'Date', placeholder: 'e.g. 2026' }, { name: 'description', label: 'Description / highlight', type: 'textarea', full: true, rows: 3 }], v => c.resume.put({ id: 'r' + Date.now(), section: v.section, title: v.title, organization: v.organization || '', date: v.date || '', description: v.description || '' })),
  },
  change: {
    'intern-status': async el => { const i = await c.internships.get(el.dataset.id); i.status = el.value; await c.internships.put(i); toast.success('Status updated'); },
    'uni-check': async el => { const u = await c.universities.get(el.dataset.id); u.checklist = u.checklist || {}; u.checklist[el.dataset.key] = el.checked; await c.universities.put(u); },
    'skill-level': async el => { const s = await c.skills.get(el.dataset.id); s.level = +el.value; await c.skills.put(s); },
  },
};
