import { ACH_TYPES, DOC_CATS, EVENT_TYPES, RESOURCE_STATUSES, RESOURCE_TYPES } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { knowledgeService } from '../../services/knowledge-service.js';
import { projectService } from '../../services/project-service.js';
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/escape-html.js';

export async function renderKnowledge(){
  const tabs=['events','learning','documents','notes','achievements'];
  const labels={events:'Events',learning:'Learning',documents:'Documents',notes:'Notes',achievements:'Achievements'};
  const tabHtml = `<div class="papertabs">${tabs.map(t=>`<button class="papertab ${t===appState.knowledgeTab?'active':''}" data-act="switch-knowledge" data-tab="${t}">${labels[t]}</button>`).join('')}</div>`;
  let body='';
  if(appState.knowledgeTab==='events') body = await renderEvents();
  if(appState.knowledgeTab==='learning') body = await renderLearning();
  if(appState.knowledgeTab==='documents') body = await renderDocuments();
  if(appState.knowledgeTab==='notes') body = await renderNotes();
  if(appState.knowledgeTab==='achievements') body = await renderAchievements();
  return `<h1>Knowledge</h1>${tabHtml}${body}`;
}

export async function renderEvents(){
  const events = await knowledgeService.events.getAll();
  events.sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
  const rows = events.map(e=>`<div class="topic">
    <div class="topic-top">
      <span class="tname">${esc(e.title)} <span class="cat">(${esc(e.etype)})</span></span>
      <span class="overall-pill">${esc(e.date||'')}</span>
    </div>
    ${e.location?`<div class="substat">${esc(e.location)}</div>`:''}
    <button class="mini" data-act="event-del" data-id="${e.id}" style="margin-top:6px">Remove</button>
  </div>`).join('');
  const typeOpts = EVENT_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('');
  return `<div class="section">${events.length?rows:'<div class="empty">No events yet.</div>'}</div>
  <div class="card">
    <div class="addbar">
      <input type="text" id="evTitle" placeholder="Event title">
      <select id="evType">${typeOpts}</select>
      <input type="date" id="evDate">
    </div>
    <div class="addbar">
      <input type="text" id="evLocation" placeholder="Location (optional)">
      <button class="primary" id="evAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderLearning(){
  const resources = await knowledgeService.resources.getAll();
  const rows = resources.map(r=>`<div class="subrow">
    <span class="sname">${esc(r.title)} <span class="cat">(${esc(r.rtype)})</span>${r.url?` — <a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:var(--primary)">Open link</a>`:''}</span>
    <select data-act="res-status" data-id="${r.id}">${RESOURCE_STATUSES.map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}</select>
    <button class="mini" data-act="res-del" data-id="${r.id}">Remove</button>
  </div>`).join('');
  const typeOpts = RESOURCE_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('');
  return `<div class="card">${resources.length?rows:'<div class="empty">No learning resources saved yet.</div>'}</div>
  <div class="card" style="margin-top:10px">
    <div class="addbar">
      <input type="text" id="resTitle" placeholder="Title">
      <select id="resType">${typeOpts}</select>
      <input type="text" id="resUrl" placeholder="Link (optional)">
      <button class="primary" id="resAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderDocuments(){
  const docs = await knowledgeService.documents.getAll();
  const rows = docs.map(d=>`<div class="subrow">
    <span class="sname">${esc(d.name)} <span class="cat">(${esc(d.category)})</span>${d.url?` — <a href="${esc(d.url)}" target="_blank" rel="noopener" style="color:var(--primary)">Open link</a>`:''}</span>
    <button class="mini" data-act="doc-del" data-id="${d.id}">Remove</button>
  </div>`).join('');
  const catOpts = DOC_CATS.map(c=>`<option value="${c}">${c}</option>`).join('');
  return `<div class="card">${docs.length?rows:'<div class="empty">No documents indexed yet.</div>'}</div>
  <div class="card" style="margin-top:10px">
    <div class="addbar">
      <input type="text" id="docName" placeholder="Document name">
      <select id="docCat">${catOpts}</select>
      <input type="text" id="docUrl" placeholder="Link (optional)">
      <button class="primary" id="docAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderNotes(){
  const notes = await knowledgeService.notes.getAll();
  notes.sort((a,b)=>(b.updatedAt||'')>(a.updatedAt||'')?1:-1);
  const rows = notes.map(n=>`<div class="topic">
    <div class="topic-top">
      <span class="tname">${esc(n.title)}</span>
      <button class="mini" data-act="note-del" data-id="${n.id}">Remove</button>
    </div>
    <div class="substat">${esc((n.content||'').slice(0,140))}${(n.content||'').length>140?'...':''}</div>
  </div>`).join('');
  return `<div class="section">${notes.length?rows:'<div class="empty">No notes yet.</div>'}</div>
  <div class="card">
    <div class="addbar"><input type="text" id="noteTitle" placeholder="Note title"></div>
    <div class="addbar"><textarea class="notesbox" id="noteContent" placeholder="Write your note..."></textarea></div>
    <div class="addbar"><button class="primary" id="noteAddBtn">Save note</button></div>
  </div>`;
}

export async function renderAchievements(){
  const achievements = await knowledgeService.achievements.getAll();
  const projects = await projectService.getAll();
  const timeline = [
    ...achievements.map(a=>({date:a.date,label:`${a.title}${a.organization?' — '+a.organization:''}`,tag:a.atype})),
    ...projects.flatMap(p=>(p.changelog||[]).map(c=>({date:c.date,label:`${p.name}: ${c.title}`,tag:'Project'})))
  ].filter(x=>x.date).sort((a,b)=>b.date<a.date?-1:1);

  const timelineHtml = timeline.length ? timeline.slice(0,15).map(x=>`<div class="subrow"><span class="sname">${esc(x.date)} — ${esc(x.label)} <span class="cat">(${esc(x.tag)})</span></span></div>`).join('') : '<div class="empty">Nothing dated yet — log an achievement or a project changelog entry.</div>';

  const rows = achievements.map(a=>`<div class="topic">
    <div class="topic-top">
      <span class="tname">${esc(a.title)} <span class="cat">(${esc(a.atype)})</span></span>
      <span class="overall-pill">${esc(a.date||'')}</span>
    </div>
    ${a.organization?`<div class="substat">${esc(a.organization)}</div>`:''}
    ${a.description?`<div class="substat">${esc(a.description)}</div>`:''}
    <button class="mini" data-act="ach-del" data-id="${a.id}" style="margin-top:6px">Remove</button>
  </div>`).join('');
  const typeOpts = ACH_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('');

  return `<div class="section"><h2>Timeline</h2><div class="card">${timelineHtml}</div></div>
  <div class="section"><h2>Achievements</h2>
    <div class="section">${achievements.length?rows:'<div class="empty">No achievements logged yet.</div>'}</div>
    <div class="card">
      <div class="addbar">
        <input type="text" id="achTitle" placeholder="Title">
        <select id="achType">${typeOpts}</select>
        <input type="date" id="achDate">
      </div>
      <div class="addbar">
        <input type="text" id="achOrg" placeholder="Organization (optional)">
        <input type="text" id="achDesc" placeholder="Description (optional)">
        <button class="primary" id="achAddBtn">Add</button>
      </div>
    </div>
  </div>`;
}

const k = knowledgeService;
export const knowledgeActions = {
  click: {
    'switch-knowledge': el => { appState.knowledgeTab = el.dataset.tab; },
    'event-del': el => k.events.remove(el.dataset.id),
    '#evAddBtn': async () => {
      const title = $('evTitle').value.trim(); if (!title) return false;
      await k.events.put({ id: 'ev' + Date.now(), title, etype: $('evType').value, date: $('evDate').value || null, location: $('evLocation').value.trim() });
    },
    'res-del': el => k.resources.remove(el.dataset.id),
    '#resAddBtn': async () => {
      const title = $('resTitle').value.trim(); if (!title) return false;
      await k.resources.put({ id: 'res' + Date.now(), title, rtype: $('resType').value, url: $('resUrl').value.trim(), status: 'saved' });
    },
    'doc-del': el => k.documents.remove(el.dataset.id),
    '#docAddBtn': async () => {
      const name = $('docName').value.trim(); if (!name) return false;
      await k.documents.put({ id: 'doc' + Date.now(), name, category: $('docCat').value, url: $('docUrl').value.trim() });
    },
    'note-del': el => k.notes.remove(el.dataset.id),
    '#noteAddBtn': async () => {
      const title = $('noteTitle').value.trim(); if (!title) return false;
      await k.notes.put({ id: 'n' + Date.now(), title, content: $('noteContent').value, updatedAt: new Date().toISOString() });
    },
    'ach-del': el => k.achievements.remove(el.dataset.id),
    '#achAddBtn': async () => {
      const title = $('achTitle').value.trim(); if (!title) return false;
      await k.achievements.put({ id: 'ach' + Date.now(), title, atype: $('achType').value, date: $('achDate').value || null, organization: $('achOrg').value.trim(), description: $('achDesc').value.trim() });
    },
  },
  change: {
    'res-status': async el => { const r = await k.resources.get(el.dataset.id); r.status = el.value; await k.resources.put(r); },
  },
};
