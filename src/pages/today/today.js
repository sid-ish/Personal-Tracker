import { appState } from '../../app/state.js';
import { addFormHtml, taskRowsHtml } from '../../components/task-list.js';
import { timerCardHtml } from '../../components/timer.js';
import { taskService } from '../../services/task-service.js';
import { getBacklog, getTodayTasks, priorityRank } from '../../utils/calculations.js';
import { todayStr } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';

export async function renderToday(){
  const tasks = await taskService.getAll();
  const today = getTodayTasks(tasks).sort((a,b)=>priorityRank(a.priority)-priorityRank(b.priority));
  const backlog = getBacklog(tasks);
  appState.addDate = todayStr(); appState.addProject = null;

  const backlogRows = backlog.length ? backlog.map(x=>`
    <div class="task-row">
      <span class="pri ${x.priority||'medium'}">${x.priority||'med'}</span>
      <span class="txt">${esc(x.text)} <span class="cat">(was ${x.date})</span></span>
      <button class="mini" data-act="movetoday" data-id="${x.id}">Move to today</button>
    </div>`).join('') : '<div class="empty">Nothing pending.</div>';

  return `
  <h1>Today</h1>
  <div class="date">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long'})}</div>
  ${timerCardHtml()}
  <div class="card section">
    ${taskRowsHtml(today)}
    ${addFormHtml()}
  </div>
  <div class="section"><h2>Backlog</h2><div class="card">${backlogRows}</div></div>`;
}

export const todayActions = {};
