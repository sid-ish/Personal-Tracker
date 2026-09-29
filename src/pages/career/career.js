import { INTERN_STATUSES, RESUME_SECTIONS, SKILL_CATS, UNI_CHECKLIST } from '../../app/constants.js';
import { appState } from '../../app/state.js';
import { careerService } from '../../services/career-service.js';
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/escape-html.js';

export async function renderCareer(){
  const tabs=['internships','highered','skills','resume'];
  const labels={internships:'Internships',highered:'Higher Studies',skills:'Skills',resume:'Resume'};
  const tabHtml = `<div class="papertabs">${tabs.map(t=>`<button class="papertab ${t===appState.careerTab?'active':''}" data-act="switch-career" data-tab="${t}">${labels[t]}</button>`).join('')}</div>`;
  let body='';
  if(appState.careerTab==='internships') body = await renderInternships();
  if(appState.careerTab==='highered') body = await renderHigherEd();
  if(appState.careerTab==='skills') body = await renderSkills();
  if(appState.careerTab==='resume') body = await renderResume();
  return `<h1>Career</h1>${tabHtml}${body}`;
}

export async function renderInternships(){
  const items = await careerService.internships.getAll();
  items.sort((a,b)=>INTERN_STATUSES.indexOf(a.status)-INTERN_STATUSES.indexOf(b.status));
  const counts={}; INTERN_STATUSES.forEach(o=>counts[o]=items.filter(i=>i.status===o).length);
  const pipeline = INTERN_STATUSES.filter(o=>counts[o]).map(o=>`${o} ${counts[o]}`).join(' · ')||'Nothing tracked yet.';
  const rows = items.map(i=>`<div class="topic">
    <div class="topic-top">
      <span class="tname">${esc(i.company)}${i.role?' — '+esc(i.role):''}</span>
      <select data-act="intern-status" data-id="${i.id}">${INTERN_STATUSES.map(o=>`<option value="${o}" ${i.status===o?'selected':''}>${o}</option>`).join('')}</select>
    </div>
    <div class="substat">${esc(i.type||'')}${i.location?' · '+esc(i.location):''}${i.startDate?' · starts '+i.startDate:''}</div>
    <button class="mini" data-act="intern-del" data-id="${i.id}" style="margin-top:6px">Remove</button>
  </div>`).join('');
  return `<div class="date">${pipeline}</div>
  <div class="section">${items.length?rows:'<div class="empty">No internships tracked yet. Add one below.</div>'}</div>
  <div class="card">
    <div class="addbar">
      <input type="text" id="inCompany" placeholder="Company">
      <input type="text" id="inRole" placeholder="Role">
      <select id="inStatus">${INTERN_STATUSES.map(o=>`<option value="${o}">${o}</option>`).join('')}</select>
    </div>
    <div class="addbar">
      <input type="text" id="inType" placeholder="Type (remote/onsite/hybrid)">
      <input type="text" id="inLocation" placeholder="Location">
      <input type="date" id="inStart">
      <button class="primary" id="inAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderHigherEd(){
  const unis = await careerService.universities.getAll();
  const rows = unis.map(u=>{
    const cl = u.checklist||{};
    const done = UNI_CHECKLIST.filter(k=>cl[k]).length;
    const pct = Math.round(done/UNI_CHECKLIST.length*100);
    const open = appState.openUniId===u.id;
    return `<div class="topic">
      <div class="topic-top" data-act="toggle-uni" data-id="${u.id}">
        <span class="tname">${open?'▾':'▸'} ${esc(u.name)} <span class="cat">(${esc(u.country||'')})</span></span>
        <span class="overall-pill">${pct}%</span>
      </div>
      <div class="substat">${esc(u.program||'')}${u.deadline?' · deadline '+u.deadline:''}</div>
      ${open?`<div class="subtopics">
        ${UNI_CHECKLIST.map(k=>`<label style="display:inline-flex;align-items:center;gap:4px;margin:4px 10px 4px 0;font-size:.72rem;color:var(--muted)"><input type="checkbox" data-act="uni-check" data-id="${u.id}" data-key="${k}" ${cl[k]?'checked':''}> ${k}</label>`).join('')}
        <button class="mini" data-act="uni-del" data-id="${u.id}" style="margin-top:8px;color:var(--danger);border-color:var(--danger)">Delete</button>
      </div>`:''}
    </div>`;
  }).join('');
  return `<div class="section">${unis.length?rows:'<div class="empty">No universities tracked yet.</div>'}</div>
  <div class="card">
    <div class="addbar">
      <input type="text" id="uName" placeholder="University">
      <input type="text" id="uCountry" placeholder="Country">
      <input type="text" id="uProgram" placeholder="Program/Degree">
      <input type="date" id="uDeadline">
      <button class="primary" id="uAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderSkills(){
  const skills = await careerService.skills.getAll();
  skills.sort((a,b)=>b.level-a.level);
  const rows = skills.map(s=>`<div class="subrow">
    <span class="sname">${esc(s.name)} <span class="cat">(${esc(s.category)})</span>${s.evidence?' — '+esc(s.evidence):''}</span>
    <select data-act="skill-level" data-id="${s.id}">${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.level===n?'selected':''}>${n}</option>`).join('')}</select>
    <button class="mini" data-act="skill-del" data-id="${s.id}">Remove</button>
  </div>`).join('');
  const catOpts = SKILL_CATS.map(c=>`<option value="${c}">${c}</option>`).join('');
  return `<div class="card">${skills.length?rows:'<div class="empty">No skills logged yet.</div>'}</div>
  <div class="card" style="margin-top:10px">
    <div class="addbar">
      <input type="text" id="skName" placeholder="Skill">
      <select id="skCat">${catOpts}</select>
      <input type="text" id="skEvidence" placeholder="Evidence (project/internship)">
      <button class="primary" id="skAddBtn">Add</button>
    </div>
  </div>`;
}

export async function renderResume(){
  const entries = await careerService.resume.getAll();
  const bySec={}; entries.forEach(e=>{(bySec[e.section]=bySec[e.section]||[]).push(e);});
  let html='';
  RESUME_SECTIONS.forEach(sec=>{
    const list = bySec[sec]||[];
    if(!list.length) return;
    html += `<div class="subject"><div class="subject-head"><h3>${sec}</h3></div>${list.map(e=>`<div class="subrow"><span class="sname">${esc(e.title)}${e.organization?' — '+esc(e.organization):''} ${e.date?'<span class="cat">('+esc(e.date)+')</span>':''}${e.description?'<br><span class="cat">'+esc(e.description)+'</span>':''}</span><button class="mini" data-act="resume-del" data-id="${e.id}">Remove</button></div>`).join('')}</div>`;
  });
  if(!entries.length) html = '<div class="empty">No resume entries yet.</div>';
  const secOpts = RESUME_SECTIONS.map(s=>`<option value="${s}">${s}</option>`).join('');
  return `${html}<div class="card" style="margin-top:10px">
    <div class="addbar">
      <select id="rSec">${secOpts}</select>
      <input type="text" id="rTitle" placeholder="Title">
      <input type="text" id="rOrg" placeholder="Organization (optional)">
      <input type="text" id="rDate" placeholder="Date (e.g. 2026)">
    </div>
    <div class="addbar">
      <input type="text" id="rDesc" placeholder="Description / highlight">
      <button class="primary" id="rAddBtn">Add</button>
    </div>
  </div>`;
}

const c = careerService;
export const careerActions = {
  click: {
    'switch-career': el => { appState.careerTab = el.dataset.tab; },
    'intern-del': el => c.internships.remove(el.dataset.id),
    '#inAddBtn': async () => {
      const company = $('inCompany').value.trim(); if (!company) return false;
      await c.internships.put({ id: 'in' + Date.now(), company, role: $('inRole').value.trim(), status: $('inStatus').value, type: $('inType').value.trim(), location: $('inLocation').value.trim(), startDate: $('inStart').value || null, createdAt: new Date().toISOString() });
    },
    'toggle-uni': el => { appState.openUniId = (appState.openUniId === el.dataset.id) ? null : el.dataset.id; },
    'uni-del': el => c.universities.remove(el.dataset.id),
    '#uAddBtn': async () => {
      const name = $('uName').value.trim(); if (!name) return false;
      await c.universities.put({ id: 'u' + Date.now(), name, country: $('uCountry').value.trim(), program: $('uProgram').value.trim(), deadline: $('uDeadline').value || null, checklist: {}, createdAt: new Date().toISOString() });
    },
    'skill-del': el => c.skills.remove(el.dataset.id),
    '#skAddBtn': async () => {
      const name = $('skName').value.trim(); if (!name) return false;
      await c.skills.put({ id: 'sk' + Date.now(), name, category: $('skCat').value, level: 1, evidence: $('skEvidence').value.trim() });
    },
    'resume-del': el => c.resume.remove(el.dataset.id),
    '#rAddBtn': async () => {
      const title = $('rTitle').value.trim(); if (!title) return false;
      await c.resume.put({ id: 'r' + Date.now(), section: $('rSec').value, title, organization: $('rOrg').value.trim(), date: $('rDate').value.trim(), description: $('rDesc').value.trim() });
    },
  },
  change: {
    'intern-status': async el => { const i = await c.internships.get(el.dataset.id); i.status = el.value; await c.internships.put(i); },
    'uni-check': async el => { const u = await c.universities.get(el.dataset.id); u.checklist = u.checklist || {}; u.checklist[el.dataset.key] = el.checked; await c.universities.put(u); },
    'skill-level': async el => { const s = await c.skills.get(el.dataset.id); s.level = +el.value; await c.skills.put(s); },
  },
};
