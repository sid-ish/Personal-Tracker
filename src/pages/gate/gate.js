import { SYLLABI } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { navigate, render as rerender } from '../../app/router.js';
import { gateService } from '../../services/gate-service.js';
import { taskService } from '../../services/task-service.js';
import { settings } from '../../services/settings/settings.js';
import { daysToExam, studyByDay, studyByWeek, masteryBySubject, completionBySubject, pyqBySubject, revisionFrequency, streakDays } from '../../services/analytics/analytics.js';
import { topicStats, subjectSummary, isWeakTopic, revisionInterval } from '../../utils/calculations.js';
import { todayStr, addDays, fmtDate, relDay } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';
import { icon } from '../../components/icons.js';
import { progressBar, progressRing } from '../../components/progress.js';
import { barChart, hBars } from '../../components/charts.js';
import { emptyState } from '../../components/empty-state.js';
import { openForm } from '../../components/forms.js';
import { toast } from '../../components/toast.js';
import { confirmModal } from '../../components/modal.js';
import { MISTAKE_TYPES } from '../../app/constants.js';
import { openSessionForm } from '../../components/entity-forms.js';

const revClass = r => r <= 0 ? '' : r === 1 ? 'r1' : 'r2plus';
const TABS = [['subjects', 'Subjects'], ['revision', 'Revision'], ['analytics', 'Analytics'], ['practice', 'PYQs & mistakes']];

export async function render() {
  await gateService.ensureGateSeeded(); await gateService.ensurePaperSeeded(appState.gatePaper);
  const paper = appState.gatePaper, all = await gateService.topics.getAll(), topics = all.filter(t => t.paper === paper);
  const sum = subjectSummary(topics), exam = daysToExam(settings.get('gateExamDate'));
  const tab = TABS.some(([k]) => k === appState.gateTab) ? appState.gateTab : 'subjects';
  const head = `<div class="page-head"><div><h1>GATE 2027</h1><div class="sub">${paper === 'ME' ? 'Mechanical Engineering' : paper === 'RA' ? 'Robotics and Automation' : 'General Aptitude'}</div></div>
    <div class="page-actions"><div class="segmented" role="group" aria-label="Paper">${['ME', 'RA', 'GA'].map(p => `<button data-act="switch-paper" data-paper="${p}" aria-pressed="${p === paper}">${p}</button>`).join('')}</div><button class="btn primary" data-act="gate-focus">${icon('Play')}Study now</button></div></div>
    <section class="card row wrap gap-6 section" aria-label="Overall preparation">${progressRing(sum.overall, { size: 84, stroke: 8 })}<div class="grow"><div class="t-label">Overall preparation</div><div class="t-h1 mt-1">${sum.overall}% <span class="t-small muted">· ${sum.studied} of ${sum.subCount} subtopics studied</span></div>${progressBar(sum.overall, 'thick')}</div>
      <div class="row gap-6"><div class="metric"><span class="l">Days remaining</span><span class="n">${exam !== null && exam >= 0 ? exam : '—'}</span><span class="s">${exam !== null ? 'Exams from ' + fmtDate(settings.get('gateExamDate'), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Set date in Settings'}</span></div></div></section>
    <div class="tabs" role="tablist" aria-label="GATE sections">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'active' : ''}" data-act="gate-tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'subjects') body = await subjectsView(topics, paper);
  else if (tab === 'revision') body = revisionView(topics);
  else if (tab === 'analytics') body = await analyticsView(topics, paper);
  else body = await practiceView(paper);
  return head + body;
}

async function scheduleBlock(paper) {
  if (paper !== 'ME') return '';
  if (!await gateService.meta.get('scheduleImported')) return `<section class="card section"><div class="row between wrap"><div><h3>91-day schedule not imported yet</h3><div class="t-small muted mt-1">Your prep schedule (1 Oct – 30 Dec 2026, sectional tests, buffer days) hasn’t been loaded into Today and Calendar.</div></div><button class="btn primary" data-act="import-schedule">Import 91-day schedule</button></div></section>`;
  const st = (await taskService.getAll()).filter(t => t.id?.startsWith('gs-')), d = st.filter(t => t.done).length;
  return `<section class="card tight section row between wrap"><div class="t-small"><strong>91-day schedule</strong> <span class="muted">· ${d} of ${st.length} days complete. Days appear in Today and Calendar.</span></div><div style="width:200px">${progressBar(st.length ? d / st.length * 100 : 0, 'green')}</div></section>`;
}
async function subjectsView(topics, paper) {
  const by = {}; topics.forEach(t => (by[t.subject] = by[t.subject] || []).push(t));
  const subj = appState.gateSubject && by[appState.gateSubject] ? appState.gateSubject : null;
  if (!subj) return `${await scheduleBlock(paper)}<div class="grid auto">${Object.entries(by).map(([name, ts]) => { const s = subjectSummary(ts);
    return `<button class="card interactive subject-card" data-act="open-subject" data-s="${esc(name)}" aria-label="${esc(name)}, ${s.overall} percent"><div class="row between top"><h3>${esc(name)}</h3>${progressRing(s.overall, { size: 48, stroke: 5 })}</div>${progressBar(s.overall)}
      <div class="t-caption muted">${s.topicCount} topics · ${s.studied}/${s.subCount} subtopics studied</div>
      <div class="row between t-caption muted"><span>${s.last ? 'Last studied ' + relDay(s.last) : 'Not started'}</span><span>${s.next ? 'Revise ' + relDay(s.next) : ''}</span></div>
      ${s.weak.length ? `<div class="tag-row">${s.weak.slice(0, 3).map(w => `<span class="chip orange">${icon('Flag')}${esc(w.topic)}</span>`).join('')}</div>` : ''}</button>`; }).join('')}</div>`;
  const ts = by[subj], s = subjectSummary(ts);
  return `<div class="row mb-4"><button class="btn sm" data-act="close-subject">${icon('ArrowLeft', 'sm')}All subjects</button><h2>${esc(subj)}</h2><span class="chip primary">${s.overall}%</span></div>
    ${s.weak.length ? `<div class="card tight mb-4"><div class="t-label mb-2">Weak areas</div><div class="tag-row">${s.weak.map(w => `<span class="chip orange">${icon('Flag')}${esc(w.topic)}</span>`).join('')}</div></div>` : ''}
    <div class="col gap-2">${ts.map(topicHtml).join('')}</div>`;
}
function topicHtml(t) {
  const st = topicStats(t), open = appState.gateExpanded.has(t.id), weak = isWeakTopic(t), pyqDone = (t.subtopics || []).filter(s => s.p).length;
  return `<article class="card topic-card" id="topic-${esc(t.id)}"><div class="topic-head" data-act="toggle-topic" data-id="${esc(t.id)}" role="button" tabindex="0" aria-expanded="${open}">${icon(open ? 'ChevronDown' : 'ChevronRight', 'sm')}<span class="grow"><span class="t-body" style="font-weight:600">${esc(t.topic)}</span>${weak ? ` <span class="chip orange">${icon('Flag')}Weak</span>` : ''}${st.theory === 100 && st.overall >= 90 ? ' <span class="chip green">✓ Complete</span>' : ''}</span><span class="t-caption muted hide-mobile">Theory ${st.theory}% · PYQ ${st.pyqPct}% · Rev ${st.revision}%</span><span class="chip ${st.overall >= 70 ? 'green' : st.overall >= 35 ? 'primary' : ''}">${st.overall}%</span></div>
    ${open ? `<div class="topic-body"><div class="kv"><div><div class="k">Mastery</div><div class="v">${st.overall}%</div></div><div><div class="k">Last studied</div><div class="v">${t.lastStudied ? relDay(t.lastStudied) : 'Never'}</div></div><div><div class="k">Next revision</div><div class="v">${t.nextRevision ? relDay(t.nextRevision) : 'Not set'}</div></div><div><div class="k">PYQ status</div><div class="v">${pyqDone}/${(t.subtopics || []).length} done</div></div></div>
      ${(t.subtopics || []).map((s, i) => `<div class="sub-row"><span class="sname">${esc(s.n)}</span><label><input type="checkbox" data-act="sub-toggle" data-kind="s" data-id="${esc(t.id)}" data-si="${i}" ${s.s ? 'checked' : ''}> Studied</label><label><input type="checkbox" data-act="sub-toggle" data-kind="p" data-id="${esc(t.id)}" data-si="${i}" ${s.p ? 'checked' : ''}> PYQ done</label><button class="revbtn ${revClass(s.r)}" data-act="sub-rev" data-id="${esc(t.id)}" data-si="${i}" aria-label="Revision count ${s.r}. Press to increase">Rev ×${s.r}</button></div>`).join('')}
      ${(t.resources || []).length ? `<div class="mt-3"><div class="t-label mb-2">Resources</div><div class="col gap-1">${t.resources.map(r => /^https?:\/\//.test(r) ? `<a class="t-small text-primary" href="${esc(r)}" target="_blank" rel="noopener">${esc(r)}</a>` : `<span class="t-small">${esc(r)}</span>`).join('')}</div></div>` : ''}
      <label class="label mt-3" style="display:block" for="n-${esc(t.id)}">Notes for ${esc(t.topic)}</label><textarea class="notesbox" id="n-${esc(t.id)}" data-act="topic-notes" data-id="${esc(t.id)}" placeholder="Formulas, tricky points, doubts…">${esc(t.notes || '')}</textarea>
      <div class="row wrap mt-3"><button class="btn primary sm" data-act="topic-continue" data-id="${esc(t.id)}">${icon('Play', 'sm')}Continue</button><button class="btn sm" data-act="topic-pyq" data-id="${esc(t.id)}">Practice PYQs</button><button class="btn sm" data-act="topic-details" data-id="${esc(t.id)}">${icon('Pencil', 'sm')}Details</button><button class="btn sm ${t.weak ? 'danger' : ''}" data-act="topic-weak" data-id="${esc(t.id)}">${icon('Flag', 'sm')}${t.weak ? 'Unflag weak' : 'Flag as weak'}</button></div></div>` : ''}</article>`;
}
function revisionView(topics) {
  const t = todayStr(), due = [];
  topics.forEach(tp => (tp.subtopics || []).forEach((s, i) => { if (s.s && s.r < 3) due.push({ tp, s, i }); }));
  due.sort((a, b) => a.s.r - b.s.r); const sched = topics.filter(x => x.nextRevision).sort((a, b) => a.nextRevision < b.nextRevision ? -1 : 1).slice(0, 8);
  return `<div class="layout-2"><section class="card"><div class="card-title"><h3>Revision queue <span class="chip">${due.length}</span></h3></div>${due.length ? `<div class="list">${due.slice(0, 15).map(d => `<div class="list-row"><div class="grow"><div class="t-small">${esc(d.tp.topic)} — ${esc(d.s.n)}</div><div class="t-caption muted">${esc(d.tp.subject)}</div></div><button class="revbtn ${revClass(d.s.r)}" data-act="sub-rev" data-id="${esc(d.tp.id)}" data-si="${d.i}">Rev ×${d.s.r}</button></div>`).join('')}</div>` : emptyState({ icon: 'RefreshCw', title: 'Nothing to revise yet', text: 'Subtopics you mark as studied are queued here until revised.' })}</section>
    <section class="card"><div class="card-title"><h3>Scheduled revisions</h3></div>${sched.length ? `<div class="list">${sched.map(x => `<div class="list-row clickable" data-act="open-topic" data-id="${esc(x.id)}" tabindex="0" role="button"><div class="grow"><div class="t-small truncate">${esc(x.topic)}</div><div class="t-caption muted">${esc(x.subject)}</div></div><span class="chip ${x.nextRevision < t ? 'red' : x.nextRevision === t ? 'yellow' : ''}">${relDay(x.nextRevision)}</span></div>`).join('')}</div>` : emptyState({ compact: true, title: 'No dates set', text: 'Pressing “Rev” on a subtopic schedules the next revision automatically.' })}</section></div>`;
}
async function analyticsView(topics, paper) {
  const [sessions, pyq] = await Promise.all([gateService.sessions.getAll(), gateService.pyq.getAll()]); const records = pyq.filter(r => r.paper === paper), gs = sessions.filter(s => s.category === 'gate' || true);
  const week = studyByWeek(gs, 8), thisWeek = week.at(-1).value, totalH = gs.reduce((a, s) => a + s.durationMin, 0) / 60;
  const py = pyqBySubject(records), tot = records.reduce((a, r) => a + r.attempted, 0), cor = records.reduce((a, r) => a + r.correct, 0);
  return `<div class="grid c4 section"><div class="card metric tight"><span class="l">This week</span><span class="n">${thisWeek.toFixed(1)}h</span></div><div class="card metric tight"><span class="l">All-time study</span><span class="n">${totalH.toFixed(1)}h</span></div><div class="card metric tight"><span class="l">Study streak</span><span class="n">${streakDays(gs)}d</span></div><div class="card metric tight"><span class="l">PYQ accuracy</span><span class="n">${tot ? Math.round(cor / tot * 100) : 0}%</span><span class="s">${tot} attempted</span></div></div>
    <div class="grid c2"><section class="card"><div class="card-title"><h3>Study hours · last 14 days</h3></div>${barChart(studyByDay(gs, 14), { unit: 'h', label: 'Study hours per day' })}</section>
      <section class="card"><div class="card-title"><h3>Weekly trend</h3></div>${barChart(week, { unit: 'h', alt: true, label: 'Study hours per week' })}</section>
      <section class="card"><div class="card-title"><h3>Topic mastery by subject</h3></div>${hBars(masteryBySubject(topics))}</section>
      <section class="card"><div class="card-title"><h3>Syllabus completion</h3></div>${hBars(completionBySubject(topics), { tone: 'green' })}</section>
      <section class="card"><div class="card-title"><h3>PYQ accuracy by subject</h3></div>${py.length ? hBars(py.map(p => ({ ...p, note: p.attempted + ' attempted' })), { tone: 'cyan' }) : emptyState({ compact: true, title: 'No PYQ sets logged', text: 'Log a set under “PYQs & mistakes” to see accuracy here.' })}</section>
      <section class="card"><div class="card-title"><h3>Revision frequency</h3></div>${barChart(revisionFrequency(topics), { decimals: 0, label: 'Subtopics by revision count' })}<div class="t-caption muted mt-2">Studied subtopics grouped by how many times you’ve revised them.</div></section></div>`;
}
async function practiceView(paper) {
  const [pyq, mistakes] = await Promise.all([gateService.pyq.getAll(), gateService.mistakes.getAll()]); const records = pyq.filter(r => r.paper === paper).sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
  const ms = mistakes.filter(m => (m.paper || 'ME') === paper).sort((a, b) => (!!a.resolved - !!b.resolved) || ((b.date || '') > (a.date || '') ? 1 : -1)), open = ms.filter(m => !m.resolved).length;
  return `<div class="layout-2"><section class="card"><div class="card-title"><h3>PYQ sets</h3><button class="btn sm primary" data-act="pyq-add">${icon('Plus', 'sm')}Log set</button></div>
      ${records.length ? `<div class="list">${records.slice(0, 12).map(r => { const p = r.attempted ? Math.round(r.correct / r.attempted * 100) : 0; return `<div class="list-row"><div class="grow"><div class="t-small">${esc(r.subject)}${r.topic ? ' · ' + esc(r.topic) : ''}</div><div class="t-caption muted">${r.year ? esc(r.year) + ' · ' : ''}${fmtDate(r.date)}</div></div><span class="chip ${p >= 70 ? 'green' : p >= 50 ? 'yellow' : 'red'}">${r.correct}/${r.attempted} · ${p}%</span><button class="btn icon sm ghost" data-act="pyq-del" data-id="${r.id}" aria-label="Delete PYQ set">${icon('Trash2', 'sm')}</button></div>`; }).join('')}</div>` : emptyState({ icon: 'Target', title: 'No PYQ sets yet', text: 'Log attempted and correct counts to track accuracy by subject.', action: { label: 'Log PYQ set', act: 'pyq-add' } })}</section>
    <section class="card"><div class="card-title"><h3>Mistake log <span class="chip ${open ? 'orange' : ''}">${open} open</span></h3><button class="btn sm primary" data-act="mistake-add">${icon('Plus', 'sm')}Log</button></div>
      ${ms.length ? `<div class="list">${ms.map(m => `<div class="list-row top" style="align-items:flex-start"><input type="checkbox" class="check" style="margin-top:3px" data-act="mistake-resolve" data-id="${m.id}" ${m.resolved ? 'checked' : ''} aria-label="Resolved: ${esc(m.topic || m.subject)}"><div class="grow ${m.resolved ? 'muted' : ''}"><div class="t-small">${esc(m.topic || m.subject)} <span class="chip">${esc(m.mtype)}</span></div><div class="t-caption secondary">${esc(m.what)}</div>${m.correct ? `<div class="t-caption text-green">Fix: ${esc(m.correct)}</div>` : ''}</div><button class="btn icon sm ghost" data-act="mistake-del" data-id="${m.id}" aria-label="Delete mistake">${icon('Trash2', 'sm')}</button></div>`).join('')}</div>` : emptyState({ icon: 'Bug', title: 'No mistakes logged', text: 'Capture what went wrong and the correct approach so you don’t repeat it.', action: { label: 'Log a mistake', act: 'mistake-add' } })}</section></div>`;
}

export function mount() {
  const id = (history.state && history.state.scrollTo) || null;
  const t = appState.params?.scrollTo; if (t) { appState.params = {}; document.getElementById('topic-' + t)?.scrollIntoView({ block: 'center' }); }
}
const saveTopic = async (id, mutate) => { const t = await gateService.topics.get(id); if (!t) return; mutate(t); await gateService.topics.put(t); return t; };
const subjectOptions = () => Object.keys(SYLLABI[appState.gatePaper]).map(s => [s, s]);

export const actions = {
  click: {
    'switch-paper': el => { appState.gatePaper = el.dataset.paper; appState.gateExpanded = new Set(); appState.gateSubject = null; },
    'gate-tab': el => { appState.gateTab = el.dataset.tab; },
    'open-subject': el => { appState.gateSubject = el.dataset.s; }, 'close-subject': () => { appState.gateSubject = null; },
    'toggle-topic': el => { const s = appState.gateExpanded; s.has(el.dataset.id) ? s.delete(el.dataset.id) : s.add(el.dataset.id); },
    'open-topic': async el => { const t = await gateService.topics.get(el.dataset.id); if (!t) return false; appState.gateTab = 'subjects'; appState.gateSubject = t.subject; appState.gateExpanded.add(t.id); },
    'sub-rev': el => saveTopic(el.dataset.id, t => { const s = t.subtopics[+el.dataset.si]; s.r = (s.r + 1) % 4; if (s.r > 0) { t.lastStudied = todayStr(); t.nextRevision = addDays(todayStr(), revisionInterval(s.r)); } else if (!t.subtopics.some(x => x.r > 0)) t.nextRevision = null; }),
    'import-schedule': async el => { el.disabled = true; el.textContent = 'Importing…'; await gateService.importGateSchedule(); toast.success('91-day schedule imported'); },
    'gate-focus': () => { navigate('focus'); return false; },
    'topic-continue': async el => { const t = await gateService.topics.get(el.dataset.id); Object.assign(appState.focusSetup, { title: `${t.subject}: ${t.topic}`, category: 'gate' }); navigate('focus'); return false; },
    'topic-pyq': async el => { const t = await gateService.topics.get(el.dataset.id); appState.gateTab = 'practice'; openPyqForm({ subject: t.subject, topic: t.topic }); },
    'topic-weak': el => saveTopic(el.dataset.id, t => { t.weak = !t.weak; }),
    'topic-details': async el => { const t = await gateService.topics.get(el.dataset.id); openForm({ title: `${t.topic} details`, values: { nextRevision: t.nextRevision || '', resources: (t.resources || []).join('\n') }, submitLabel: 'Save details',
      fields: [{ name: 'nextRevision', label: 'Next revision date', type: 'date' }, { name: 'resources', label: 'Resources (one per line)', type: 'textarea', full: true, rows: 4, hint: 'Links, book chapters, video titles.' }],
      onSubmit: async v => { await saveTopic(t.id, x => { x.nextRevision = v.nextRevision || null; x.resources = (v.resources || '').split('\n').map(s => s.trim()).filter(Boolean); }); toast.success('GATE topic updated'); await rerender(); } }); return false; },
    'pyq-add': () => { openPyqForm(); return false; },
    'pyq-del': async el => { if (!await confirmModal({ title: 'Delete this PYQ set?', message: 'It will no longer count toward your accuracy.', confirmLabel: 'Delete', danger: true })) return false; await gateService.pyq.remove(el.dataset.id); toast.success('PYQ set deleted'); },
    'mistake-add': () => { openMistakeForm(); return false; },
    'mistake-del': async el => { if (!await confirmModal({ title: 'Delete this mistake entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) return false; await gateService.mistakes.remove(el.dataset.id); toast.success('Mistake deleted'); },
    'log-session': () => { openSessionForm(); return false; },
  },
  change: {
    'sub-toggle': el => saveTopic(el.dataset.id, t => { t.subtopics[+el.dataset.si][el.dataset.kind] = el.checked; if (el.dataset.kind === 's' && el.checked) t.lastStudied = todayStr(); }),
    'mistake-resolve': async el => { const m = await gateService.mistakes.get(el.dataset.id); m.resolved = el.checked; await gateService.mistakes.put(m); },
  },
  focusout: { 'topic-notes': async el => { const t = await gateService.topics.get(el.dataset.id); if (t && (t.notes || '') !== el.value) { await saveTopic(t.id, x => { x.notes = el.value; }); toast.success('Notes saved', { duration: 1400 }); } return false; } },
};
function openPyqForm(values = {}) {
  openForm({ title: 'Log PYQ set', submitLabel: 'Log set', values, fields: [{ name: 'subject', label: 'Subject', type: 'select', options: subjectOptions() }, { name: 'topic', label: 'Topic' }, { name: 'year', label: 'Year' },
    { name: 'attempted', label: 'Attempted', type: 'number', required: true, min: 1, validate: v => +v >= 1 ? '' : 'Enter at least 1.' }, { name: 'correct', label: 'Correct', type: 'number', required: true, min: 0, validate: (v, a) => +v < 0 ? 'Cannot be negative.' : +v > +a.attempted ? 'Cannot exceed attempted.' : '' }],
    onSubmit: async v => { await gateService.pyq.put({ id: 'py' + Date.now(), paper: appState.gatePaper, subject: v.subject, topic: v.topic || '', year: v.year || '', attempted: +v.attempted, correct: Math.min(+v.correct, +v.attempted), date: todayStr() }); toast.success('PYQ set logged'); await rerender(); } });
}
function openMistakeForm() {
  openForm({ title: 'Log a mistake', submitLabel: 'Log mistake', fields: [{ name: 'subject', label: 'Subject', type: 'select', options: subjectOptions() }, { name: 'mtype', label: 'Type', type: 'select', options: MISTAKE_TYPES }, { name: 'topic', label: 'Topic', full: true, placeholder: 'e.g. Mohr’s circle' },
    { name: 'what', label: 'What went wrong', required: true, full: true, type: 'textarea', rows: 3 }, { name: 'correct', label: 'Correct approach', full: true, type: 'textarea', rows: 2 }],
    onSubmit: async v => { await gateService.mistakes.put({ id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), paper: appState.gatePaper, subject: v.subject, topic: v.topic || '', mtype: v.mtype, what: v.what, correct: v.correct || '', date: todayStr(), resolved: false }); toast.success('Mistake logged'); await rerender(); } });
}
