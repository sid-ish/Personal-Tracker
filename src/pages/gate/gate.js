import { SYLLABI } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { progressBar } from '../../components/progress-bar.js';
import { revClass } from './gate-calculations.js';
import { gateService } from '../../services/gate-service.js';
import { taskService } from '../../services/task-service.js';
import { topicStats } from '../../utils/calculations.js';
import { todayStr } from '../../utils/dates.js';
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/escape-html.js';

export async function renderGate(){
  await gateService.ensureGateSeeded();
  await gateService.ensurePaperSeeded(appState.gatePaper);
  const allTopics = await gateService.topics.getAll();
  const topics = allTopics.filter(t=>t.paper===appState.gatePaper);
  const scheduleImported = await gateService.meta.get('scheduleImported');
  const bySubject = {};
  topics.forEach(t=>{ (bySubject[t.subject]=bySubject[t.subject]||[]).push(t); });
  const overallAvg = topics.length? Math.round(topics.reduce((s,x)=>s+topicStats(x).overall,0)/topics.length):0;

  const tabs = `<div class="papertabs">${['ME','RA','GA'].map(p=>`<button class="papertab ${p===appState.gatePaper?'active':''}" data-act="switch-paper" data-paper="${p}">${p}</button>`).join('')}</div>`;

  let scheduleBlock = '';
  if(appState.gatePaper==='ME'){
    if(!scheduleImported){
      scheduleBlock = `<div class="card" style="margin-bottom:18px">
        <h3 style="margin:0 0 4px">91-day schedule not imported yet</h3>
        <div class="cat">Your Prep Tracker workbook (1 Oct – 30 Dec 2026, sectional tests, buffer days) hasn't been loaded into Today/Calendar yet.</div>
        <button class="primary" style="margin-top:10px" data-act="import-schedule">Import 91-Day Schedule</button>
      </div>`;
    } else {
      const allTasks = await taskService.getAll();
      const schedTasks = allTasks.filter(t=>t.id&&t.id.startsWith('gs-'));
      const doneCount = schedTasks.filter(t=>t.done).length;
      scheduleBlock = `<div class="card" style="margin-bottom:18px">
        <div class="substat">Schedule imported: ${doneCount}/${schedTasks.length} days complete. Days appear in Today and Calendar — mark them done as you study.</div>
      </div>`;
    }
  }

  let html = `<h1>GATE 2027 — ${appState.gatePaper}</h1>${tabs}<div class="date">Overall syllabus progress: ${overallAvg}% · click a topic to open its subtopics</div>`;
  html += scheduleBlock;
  for(const subject in bySubject){
    const ts = bySubject[subject];
    const avg = Math.round(ts.reduce((s,x)=>s+topicStats(x).overall,0)/ts.length);
    html += `<div class="subject">
      <div class="subject-head"><h3>${esc(subject)}</h3><span class="pct">${avg}%</span></div>
      ${progressBar(avg)}
      ${ts.map(t=>{
        const st=topicStats(t); const open=appState.gateExpanded.has(t.id);
        return `<div class="topic">
          <div class="topic-top" data-act="toggle-topic" data-id="${t.id}">
            <span class="tname">${open?'▾':'▸'} ${esc(t.topic)}</span>
            <span class="overall-pill">${st.overall}%</span>
          </div>
          <div class="substat">Theory ${st.theory}% · PYQs ${st.pyqPct}% · Revision ${st.revision}%</div>
          ${open?`<div class="subtopics">
            ${t.subtopics.map((s,i)=>`
              <div class="subrow">
                <span class="sname">${esc(s.n)}</span>
                <label><input type="checkbox" data-act="sub-toggle" data-kind="s" data-id="${t.id}" data-si="${i}" ${s.s?'checked':''}> Studied</label>
                <label><input type="checkbox" data-act="sub-toggle" data-kind="p" data-id="${t.id}" data-si="${i}" ${s.p?'checked':''}> PYQ done</label>
                <button class="revbtn ${revClass(s.r)}" data-act="sub-rev" data-id="${t.id}" data-si="${i}">Rev ×${s.r}</button>
              </div>`).join('')}
            <label class="notes-label">Notes for ${esc(t.topic)}</label>
            <textarea class="notesbox" data-act="topic-notes" data-id="${t.id}" placeholder="Formulas, tricky points, doubts...">${esc(t.notes||'')}</textarea>
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  }
  html += renderRevisionQueue(topics);
  html += await renderPyqAnalytics(topics);
  html += await renderMistakeLog();
  return html;
}

export function renderRevisionQueue(topics){
  const due=[];
  topics.forEach(t=>t.subtopics.forEach((s,i)=>{ if(s.s && s.r<2) due.push({t,s,i}); }));
  due.sort((a,b)=>a.s.r-b.s.r);
  const rows = due.slice(0,10).map(d=>`<div class="subrow">
    <span class="sname">${esc(d.t.topic)} — ${esc(d.s.n)} <span class="cat">(${esc(d.t.subject)})</span></span>
    <button class="revbtn ${revClass(d.s.r)}" data-act="sub-rev" data-id="${d.t.id}" data-si="${d.i}">Rev ×${d.s.r}</button>
  </div>`).join('');
  return `<div class="section"><h2>Revision due (${due.length})</h2><div class="card">${due.length?rows:'<div class="empty">Nothing studied yet needs revision.</div>'}</div></div>`;
}

export async function renderPyqAnalytics(topics){
  const all = await gateService.pyq.getAll();
  const records = all.filter(r=>r.paper===appState.gatePaper);
  const totalAtt = records.reduce((a,r)=>a+r.attempted,0), totalCorr = records.reduce((a,r)=>a+r.correct,0);
  const accuracy = totalAtt? Math.round(totalCorr/totalAtt*100):0;
  const bySubj={};
  records.forEach(r=>{ (bySubj[r.subject]=bySubj[r.subject]||{att:0,corr:0}); bySubj[r.subject].att+=r.attempted; bySubj[r.subject].corr+=r.correct; });
  const subjRows = Object.keys(bySubj).map(s=>{ const d=bySubj[s]; const pct=d.att?Math.round(d.corr/d.att*100):0; return {s,pct,att:d.att}; }).sort((a,b)=>a.pct-b.pct);
  const subjOpts = Object.keys(SYLLABI[appState.gatePaper]).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');

  return `<div class="section"><h2>PYQ accuracy — ${appState.gatePaper}</h2>
    <div class="card">
      <div class="grid4" style="margin-bottom:0">
        <div class="metric"><div class="n">${totalAtt}</div><div class="l">Attempted</div></div>
        <div class="metric"><div class="n">${accuracy}%</div><div class="l">Accuracy</div></div>
      </div>
      ${subjRows.length?subjRows.map(r=>`<div class="substat" style="margin-top:8px">${esc(r.s)}: ${r.pct}% (${r.att} attempted)${r.pct<60?' — needs work':''}</div>`).join(''):'<div class="empty" style="margin-top:8px">No PYQ sessions logged yet for this paper.</div>'}
      <div class="addbar" style="margin-top:12px">
        <select id="pySubj">${subjOpts}</select>
        <input type="text" id="pyTopic" placeholder="Topic">
        <input type="number" id="pyYear" placeholder="Year" style="width:70px">
      </div>
      <div class="addbar">
        <input type="number" id="pyAtt" placeholder="Attempted" style="width:90px">
        <input type="number" id="pyCorr" placeholder="Correct" style="width:90px">
        <button class="primary" id="pyAddBtn">Log PYQ set</button>
      </div>
    </div>
  </div>`;
}

export async function renderMistakeLog(){
  const all = await gateService.mistakes.getAll();
  const mistakes = all.filter(m=>(m.paper||'ME')===appState.gatePaper);
  mistakes.sort((a,b)=> (a.resolved-b.resolved) || (b.date>a.date?1:-1) );
  const types = ['concept gap','formula forgotten','calculation','sign error','misread','time pressure','guess','carelessness','other'];
  const subjOpts = Object.keys(SYLLABI[appState.gatePaper]).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  const open = mistakes.filter(m=>!m.resolved), resolved = mistakes.filter(m=>m.resolved);
  const row = m=>`<div class="topic">
    <div class="topic-top">
      <span class="tname">${esc(m.topic||m.subject)} <span class="cat">(${esc(m.mtype)})</span></span>
      <label style="font-size:.68rem;color:var(--muted)"><input type="checkbox" data-act="mistake-resolve" data-id="${m.id}" ${m.resolved?'checked':''}> Resolved</label>
    </div>
    <div class="substat">${esc(m.what)}</div>
    ${m.correct?`<div class="substat">Fix: ${esc(m.correct)}</div>`:''}
    <button class="mini" data-act="mistake-del" data-id="${m.id}" style="margin-top:6px">Remove</button>
  </div>`;

  return `<div class="section"><h2>Mistake log — ${open.length} open</h2>
    <div class="card">
      ${open.length?open.map(row).join(''):'<div class="empty">No open mistakes logged.</div>'}
      ${resolved.length?`<div class="notes-label">Resolved (${resolved.length})</div>${resolved.map(row).join('')}`:''}
      <div class="addbar" style="margin-top:12px">
        <select id="mSubj">${subjOpts}</select>
        <select id="mType">${types.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
        <input type="text" id="mTopic" placeholder="Topic (e.g. Mohr's circle)">
      </div>
      <div class="addbar">
        <input type="text" id="mWhat" placeholder="What went wrong">
        <input type="text" id="mCorrect" placeholder="Correct approach (optional)">
        <button class="primary" id="mAddBtn">Log mistake</button>
      </div>
    </div>
  </div>`;
}

const saveTopic = async (id, mutate) => { const t = await gateService.topics.get(id); mutate(t); await gateService.topics.put(t); };

export const gateActions = {
  click: {
    'toggle-topic': el => { const s = appState.gateExpanded; s.has(el.dataset.id) ? s.delete(el.dataset.id) : s.add(el.dataset.id); },
    'sub-rev': el => saveTopic(el.dataset.id, t => { const s = t.subtopics[+el.dataset.si]; s.r = (s.r + 1) % 4; }),
    'import-schedule': async el => { el.disabled = true; el.textContent = 'Importing...'; await gateService.importGateSchedule(); },
    'switch-paper': el => { appState.gatePaper = el.dataset.paper; appState.gateExpanded = new Set(); },
    '#pyAddBtn': async () => {
      const att = parseInt($('pyAtt').value, 10), corr = parseInt($('pyCorr').value, 10);
      if (!att || isNaN(corr)) return false;
      await gateService.pyq.put({ id: 'py' + Date.now(), paper: appState.gatePaper, subject: $('pySubj').value, topic: $('pyTopic').value.trim(), year: $('pyYear').value.trim(), attempted: att, correct: Math.min(corr, att), date: todayStr() });
    },
    'mistake-del': el => gateService.mistakes.remove(el.dataset.id),
    '#mAddBtn': async () => {
      const what = $('mWhat').value.trim(); if (!what) return false;
      await gateService.mistakes.put({ id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6), paper: appState.gatePaper, subject: $('mSubj').value, topic: $('mTopic').value.trim(), mtype: $('mType').value, what, correct: $('mCorrect').value.trim(), date: todayStr(), resolved: false });
    },
  },
  change: {
    'sub-toggle': el => saveTopic(el.dataset.id, t => { t.subtopics[+el.dataset.si][el.dataset.kind] = el.checked; }),
    'mistake-resolve': async el => { const m = await gateService.mistakes.get(el.dataset.id); m.resolved = el.checked; await gateService.mistakes.put(m); },
  },
  focusout: {
    'topic-notes': async el => { await saveTopic(el.dataset.id, t => { t.notes = el.value; }); return false; },
  },
};
