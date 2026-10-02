import { ACH_TYPES, RESOURCE_STATUSES } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { knowledgeService } from '../../services/knowledge-service.js';
import { gateService } from '../../services/gate-service.js';
import { projectService } from '../../services/project-service.js';
import { fuzzyScore } from '../../utils/fuzzy.js';
import { fmtDate } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { icon } from '../../components/icons.js';
import { emptyState } from '../../components/empty-state.js';
import { openForm } from '../../components/forms.js';
import { openEventForm } from '../../components/entity-forms.js';
import { confirmModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { debounce } from '../../utils/dom.js';
import { allKnowledge, openKnowledgeItem, titleOf, tagsOf } from './knowledge-detail.js';
import { navigate, render as rerender } from '../../app/router.js';

const TABS = [['all', 'All'], ['note', 'Notes'], ['concept', 'Concepts'], ['resource', 'Resources'], ['mistakes', 'Mistakes'], ['document', 'Documents'], ['reference', 'References'], ['achievements', 'Achievements'], ['events', 'Events']];
const LEGACY = { notes: 'note', learning: 'resource', documents: 'document', resources: 'resource', concepts: 'concept', references: 'reference' };
const ICON = { note: 'StickyNote', concept: 'Lightbulb', resource: 'Link', document: 'FileText', reference: 'BookOpen' };

export async function render() {
  const tab = LEGACY[appState.knowledgeTab] || appState.knowledgeTab; appState.knowledgeTab = TABS.some(([k]) => k === tab) ? tab : 'all';
  const items = await allKnowledge(), counts = {}; items.forEach(i => counts[i._kind] = (counts[i._kind] || 0) + 1);
  const tagCount = {}; items.forEach(i => tagsOf(i).forEach(t => tagCount[t] = (tagCount[t] || 0) + 1));
  const head = `<div class="page-head"><div><h1>Knowledge</h1><div class="sub">Your second brain: notes, concepts, resources, mistakes and references.</div></div><div class="page-actions"><button class="btn primary" data-act="open-new" data-kind="knowledge">${icon('Plus')}New knowledge</button></div></div>
    <div class="tabs" role="tablist" aria-label="Knowledge categories">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${appState.knowledgeTab === k}" class="${appState.knowledgeTab === k ? 'active' : ''}" data-act="switch-knowledge" data-tab="${k}">${l}${counts[k] ? ` <span class="muted">${counts[k]}</span>` : ''}</button>`).join('')}</div>`;
  const t = appState.knowledgeTab; let body;
  if (t === 'mistakes') body = await mistakesView(); else if (t === 'achievements') body = await achievementsView(); else if (t === 'events') body = await eventsView();
  else {
    const q = appState.knowledgeQuery.trim(), tag = appState.knowledgeTag;
    let list = items.filter(i => t === 'all' || i._kind === t); if (tag) list = list.filter(i => tagsOf(i).includes(tag));
    if (q) list = list.map(i => ({ i, s: Math.max(fuzzyScore(q, titleOf(i)), fuzzyScore(q, i.content || '') * .4, fuzzyScore(q, tagsOf(i).join(' ')) * .7) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.i);
    else list.sort((a, b) => (b.updatedAt || '') > (a.updatedAt || '') ? 1 : -1);
    const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 14);
    body = `<div class="row wrap mb-4"><div class="field grow" style="min-width:220px"><label class="sr-only" for="kq">Search knowledge</label><input class="input" id="kq" data-act="k-search" type="search" placeholder="Search knowledge…" value="${esc(appState.knowledgeQuery)}" autocomplete="off"></div></div>
      ${tags.length ? `<div class="tag-row mb-4" role="group" aria-label="Filter by tag">${tags.map(([g, n]) => `<button class="tag-chip ${tag === g ? 'active' : ''}" data-act="k-tag" data-tag="${esc(g)}" aria-pressed="${tag === g}">#${esc(g)} <span class="muted">${n}</span></button>`).join('')}${tag ? '<button class="tag-chip" data-act="k-tag" data-tag="">Clear filter</button>' : ''}</div>` : ''}
      ${list.length ? `<div class="grid auto">${list.map(i => `<article class="card interactive kcard-note" data-act="k-open" data-store="${i._store}" data-id="${i.id}" role="button" tabindex="0" aria-label="Open ${esc(titleOf(i))}"><div class="row between"><span class="chip primary">${icon(ICON[i._kind] || 'FileText')}${i._kind}</span>${i._store === 'resources' ? `<select class="select sm" style="width:auto" data-act="res-status" data-id="${i.id}" aria-label="Status" onclick="event.stopPropagation()">${RESOURCE_STATUSES.map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}</select>` : ''}</div><h3 class="clamp-2">${esc(titleOf(i))}</h3>${i.content ? `<p class="t-small secondary clamp-2">${esc(i.content)}</p>` : i.url ? `<p class="t-caption muted truncate">${esc(i.url)}</p>` : ''}${tagsOf(i).length ? `<div class="tag-row mt-auto">${tagsOf(i).slice(0, 4).map(g => `<span class="tag">#${esc(g)}</span>`).join('')}</div>` : ''}</article>`).join('')}</div>`
        : (q || tag) ? emptyState({ icon: 'Search', title: 'No matches', text: 'Try a different search or clear the tag filter.' }) : emptyState({ icon: 'BookOpen', title: t === 'all' ? 'Your knowledge base is empty' : `No ${t}s yet`, text: 'Notes, concepts, resources and references you add will appear here.', action: { label: 'New knowledge', act: 'open-new', icon: 'Plus', attrs: { kind: 'knowledge' } } })}`;
  }
  return head + body;
}
async function mistakesView() {
  const ms = await gateService.mistakes.getAll(); ms.sort((a, b) => (!!a.resolved - !!b.resolved) || ((b.date || '') > (a.date || '') ? 1 : -1));
  if (!ms.length) return emptyState({ icon: 'Bug', title: 'No mistakes logged', text: 'Mistakes you log in GATE show up here so you can learn from them.', action: { label: 'Go to GATE', act: 'go-gate' } });
  return `<section class="card"><div class="list">${ms.map(m => `<div class="list-row top" style="align-items:flex-start"><input type="checkbox" class="check" style="margin-top:3px" data-act="mistake-resolve-k" data-id="${m.id}" ${m.resolved ? 'checked' : ''} aria-label="Resolved: ${esc(m.topic || m.subject)}"><div class="grow ${m.resolved ? 'muted' : ''}"><div class="t-small">${esc(m.topic || m.subject)} <span class="chip">${esc(m.mtype)}</span> <span class="chip">${esc(m.paper || 'ME')}</span></div><div class="t-caption secondary">${esc(m.what)}</div>${m.correct ? `<div class="t-caption text-green">Fix: ${esc(m.correct)}</div>` : ''}</div></div>`).join('')}</div></section>`;
}
async function achievementsView() {
  const [ach, projects] = await Promise.all([knowledgeService.achievements.getAll(), projectService.getAll()]);
  const tl = [...ach.map(a => ({ date: a.date, label: `${a.title}${a.organization ? ' — ' + a.organization : ''}`, tag: a.atype })), ...projects.flatMap(p => (p.changelog || []).map(c => ({ date: c.date, label: `${p.name}: ${c.title}`, tag: 'Project' })))].filter(x => x.date).sort((a, b) => b.date < a.date ? -1 : 1);
  return `<div class="row between mb-4"><span class="muted t-small">${ach.length} achievement${ach.length === 1 ? '' : 's'}</span><button class="btn primary" data-act="ach-add">${icon('Plus')}Add achievement</button></div>
    ${ach.length || tl.length ? `<div class="layout-2"><section class="card"><div class="card-title"><h3>Achievements</h3></div><div class="list">${ach.map(a => `<div class="list-row top" style="align-items:flex-start"><span class="text-yellow">${icon('Trophy')}</span><div class="grow"><div class="t-small" style="font-weight:600">${esc(a.title)} <span class="chip">${esc(a.atype)}</span></div><div class="t-caption muted">${[a.organization, a.date && fmtDate(a.date, { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).map(esc).join(' · ')}</div>${a.description ? `<div class="t-caption secondary mt-1">${esc(a.description)}</div>` : ''}</div><button class="btn icon sm ghost" data-act="ach-del" data-id="${a.id}" aria-label="Delete ${esc(a.title)}">${icon('Trash2', 'sm')}</button></div>`).join('') || '<div class="empty-inline">None yet.</div>'}</div></section>
      <section class="card"><div class="card-title"><h3>Timeline</h3></div>${tl.length ? `<ul class="tl-vert">${tl.slice(0, 15).map(x => `<li><div class="t-small" style="font-weight:600">${esc(x.label)}</div><div class="t-caption muted">${fmtDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${esc(x.tag)}</div></li>`).join('')}</ul>` : '<div class="empty-inline">Dated items appear here.</div>'}</section></div>` : emptyState({ icon: 'Trophy', title: 'No achievements yet', text: 'Log competitions, certifications and awards.', action: { label: 'Add achievement', act: 'ach-add', icon: 'Plus' } })}`;
}
async function eventsView() {
  const ev = await knowledgeService.events.getAll(); ev.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
  return `<div class="row between mb-4"><span class="muted t-small">${ev.length} event${ev.length === 1 ? '' : 's'} · shown on the calendar</span><button class="btn primary" data-act="ev-add">${icon('Plus')}New event</button></div>
    ${ev.length ? `<section class="card"><div class="list">${ev.map(e => `<div class="list-row"><span class="text-cyan">${icon('Calendar')}</span><div class="grow"><div class="t-small" style="font-weight:600">${esc(e.title)} <span class="chip">${esc(e.etype)}</span></div><div class="t-caption muted">${esc(e.date ? fmtDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date')}${e.time ? ' · ' + esc(e.time) : ''}${e.location ? ' · ' + esc(e.location) : ''}</div></div><button class="btn icon sm ghost" data-act="ev-edit" data-id="${e.id}" aria-label="Edit ${esc(e.title)}">${icon('Pencil', 'sm')}</button><button class="btn icon sm ghost" data-act="event-del" data-id="${e.id}" aria-label="Delete ${esc(e.title)}">${icon('Trash2', 'sm')}</button></div>`).join('')}</div></section>` : emptyState({ icon: 'Calendar', title: 'No events yet', text: 'Competitions, interviews and deadlines you add appear here and on the calendar.', action: { label: 'New event', act: 'ev-add', icon: 'Plus' } })}`;
}
const k = knowledgeService;
const doSearch = debounce(async () => { await rerender(); }, 220);
export const actions = {
  click: {
    'switch-knowledge': el => { appState.knowledgeTab = el.dataset.tab; },
    'k-tag': el => { appState.knowledgeTag = el.dataset.tag || null; }, 'k-open': el => { openKnowledgeItem(el.dataset.store, el.dataset.id); return false; },
    'go-gate': () => { navigate('gate'); return false; },
    'ev-add': () => { openEventForm(); return false; }, 'ev-edit': async el => { openEventForm(await k.events.get(el.dataset.id)); return false; },
    'event-del': async el => { if (!await confirmModal({ title: 'Delete this event?', message: 'It will also disappear from the calendar.', confirmLabel: 'Delete', danger: true })) return false; await k.events.remove(el.dataset.id); toast.success('Event deleted'); },
    'ach-del': async el => { if (!await confirmModal({ title: 'Delete this achievement?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) return false; await k.achievements.remove(el.dataset.id); toast.success('Achievement deleted'); },
    'ach-add': () => { openForm({ title: 'Add achievement', fields: [{ name: 'title', label: 'Title', required: true, full: true }, { name: 'atype', label: 'Type', type: 'select', options: ACH_TYPES }, { name: 'date', label: 'Date', type: 'date' }, { name: 'organization', label: 'Organization' }, { name: 'description', label: 'Description', type: 'textarea', full: true, rows: 3 }], onSubmit: async v => { await k.achievements.put({ id: 'ach' + Date.now(), title: v.title, atype: v.atype, date: v.date || null, organization: v.organization || '', description: v.description || '' }); toast.success('Achievement added'); rerender(); } }); return false; },
  },
  change: {
    'res-status': async el => { const r = await k.resources.get(el.dataset.id); r.status = el.value; await k.resources.put(r); toast.success('Status updated'); },
    'mistake-resolve-k': async el => { const m = await gateService.mistakes.get(el.dataset.id); m.resolved = el.checked; await gateService.mistakes.put(m); },
  },
  input: { 'k-search': el => { appState.knowledgeQuery = el.value; doSearch(); return false; } },
};
