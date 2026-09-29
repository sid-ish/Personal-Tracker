import { appState } from '../../app/state.js';
import { progressBar } from '../../components/progress-bar.js';
import { addFormHtml, taskRowsHtml } from '../../components/task-list.js';
import { projectService } from '../../services/project-service.js';
import { taskService } from '../../services/task-service.js';
import { projStats } from '../../utils/calculations.js';
import { todayStr } from '../../utils/dates.js';
import { $ } from '../../utils/dom.js';
import { esc } from '../../utils/escape-html.js';

export async function renderProjects(){
  const projects = await projectService.getAll();
  const tasks = await taskService.getAll();
  const order=['active','planned','idea','paused','completed','archived'];
  projects.sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status));

  let html = `<h1>Projects</h1><div class="date">${projects.length} project${projects.length===1?'':'s'}</div>`;
  html += projects.length ? projects.map(p=>{
    const st = projStats(tasks,p.id); const open = appState.openProjectId===p.id;
    const ptasks = tasks.filter(t=>t.projectId===p.id);
    if(open){ appState.addDate = todayStr(); appState.addProject = p.id; }
    return `<div class="topic">
      <div class="topic-top" data-act="toggle-proj" data-id="${p.id}">
        <span class="tname">${open?'▾':'▸'} ${esc(p.name)} <span class="cat">(${p.status})</span></span>
        <span class="overall-pill">${st.pct}%</span>
      </div>
      ${p.description?`<div class="cat" style="margin-top:4px">${esc(p.description)}</div>`:''}
      ${progressBar(st.pct, 'margin-top:8px')}
      <div class="substat">${st.done}/${st.total} linked tasks done${p.targetDate?' · target '+p.targetDate:''}</div>
      ${open?`<div class="subtopics">
        ${taskRowsHtml(ptasks)}
        ${addFormHtml()}
        <label class="notes-label">Changelog</label>
        ${(p.changelog&&p.changelog.length) ? p.changelog.slice().reverse().map(c=>`<div class="subrow"><span class="sname">${esc(c.date)} — ${esc(c.title)}${c.desc?' · '+esc(c.desc):''}</span></div>`).join('') : '<div class="empty">No changelog entries yet.</div>'}
        <div class="addbar">
          <input type="text" id="clTitle" placeholder="What changed?">
          <input type="text" id="clDesc" placeholder="Details (optional)">
          <button class="mini" data-act="add-changelog" data-id="${p.id}">Log update</button>
        </div>
        <button class="mini" data-act="del-proj" data-id="${p.id}" style="margin-top:8px;color:var(--danger);border-color:var(--danger)">Delete project</button>
      </div>`:''}
    </div>`;
  }).join('') : '<div class="empty">No active projects yet. Create one below.</div>';

  html += `<div class="section"><h2>New project</h2><div class="card"><div class="addbar">
    <input type="text" id="newProjName" placeholder="Project name">
    <select id="newProjStatus"><option value="idea">Idea</option><option value="planned">Planned</option><option value="active" selected>Active</option></select>
    <input type="date" id="newProjTarget">
    <button class="primary" id="addProjBtn">Create</button>
  </div></div></div>`;
  return html;
}

export const projectActions = {
  click: {
    'toggle-proj': el => { appState.openProjectId = (appState.openProjectId === el.dataset.id) ? null : el.dataset.id; },
    'del-proj': el => projectService.deleteProject(el.dataset.id),
    '#addProjBtn': async () => {
      const name = $('newProjName').value.trim(); if (!name) return false;
      await projectService.put({ id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), name, status: $('newProjStatus').value, targetDate: $('newProjTarget').value || null, description: '', changelog: [], createdAt: new Date().toISOString() });
    },
    'add-changelog': async el => {
      const title = $('clTitle').value.trim(); if (!title) return false;
      const p = await projectService.get(el.dataset.id); p.changelog = p.changelog || [];
      p.changelog.push({ date: todayStr(), title, desc: $('clDesc').value.trim() });
      await projectService.put(p);
    },
  },
};
