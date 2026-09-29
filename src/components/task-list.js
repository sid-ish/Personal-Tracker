import { render } from '../app/router.js';
import { appState } from '../app/state.js';
import { taskService } from '../services/task-service.js';
import { addDays, todayStr } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { esc } from '../utils/escape-html.js';

export function taskRowsHtml(list){
  return list.length ? list.map(x=>`
    <div class="task-row ${x.done?'done':''}">
      <input type="checkbox" data-act="toggle" data-id="${x.id}" ${x.done?'checked':''}>
      <span class="pri ${x.priority||'medium'}">${x.priority||'med'}</span>
      <span class="txt">${esc(x.text)}</span>
      <span class="cat">${esc(x.category||'')}${x.date&&x.date!==todayStr()?' · '+x.date:''}</span>
      <button class="mini" data-act="push" data-id="${x.id}">Push</button>
      <button class="mini" data-act="del" data-id="${x.id}">Remove</button>
    </div>`).join('') : '<div class="empty">No tasks here yet.</div>';
}

export function addFormHtml(){
  return `<div class="addbar">
    <select id="newCat"><option value="academic">Academic</option><option value="gate">GATE</option><option value="project">Project</option><option value="personal">Personal</option><option value="other">Other</option></select>
    <select id="newPri"><option value="medium" selected>Medium</option><option value="urgent">Urgent</option><option value="high">High</option><option value="low">Low</option></select>
    <input type="text" id="newTxt" placeholder="Add a task...">
    <button class="primary" id="addTaskBtn">Add</button>
  </div>`;
}

const saveTask = async (id, mutate) => { const t = await taskService.get(id); mutate(t); await taskService.put(t); };
const complete = el => saveTask(el.dataset.id, t => { t.done = true; t.completedAt = new Date().toISOString(); });

/** Shared task actions, used by Dashboard, Today, Calendar and Projects. Handlers return false to skip re-render. */
export const taskActions = {
  change: {
    toggle: el => saveTask(el.dataset.id, t => { t.done = el.checked; t.completedAt = el.checked ? new Date().toISOString() : null; }),
  },
  click: {
    del: el => taskService.remove(el.dataset.id),
    push: el => saveTask(el.dataset.id, t => { t.date = addDays(t.date, 1); }),
    movetoday: el => saveTask(el.dataset.id, t => { t.date = todayStr(); }),
    'complete-focus': complete,
    '#addTaskBtn': async () => {
      const txt = $('newTxt').value.trim(); if (!txt) return false;
      await taskService.put({ id: 't' + Date.now() + Math.random().toString(36).slice(2, 6), text: txt, category: $('newCat').value, priority: $('newPri').value, date: appState.addDate, projectId: appState.addProject, done: false, createdAt: new Date().toISOString() });
    },
  },
};
