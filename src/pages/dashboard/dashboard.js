import { focusCardHtml } from '../../components/focus-card.js';
import { metricCard } from '../../components/metric-card.js';
import { exportAllData, importAllData } from '../../database/export-import.js';
import { gateService } from '../../services/gate-service.js';
import { taskService } from '../../services/task-service.js';
import { getBacklog, getTodayTasks, getUpcoming, pickFocus, topicStats } from '../../utils/calculations.js';
import { todayStr } from '../../utils/dates.js';
import { esc } from '../../utils/escape-html.js';

export async function renderDashboard(){
  const tasks = await taskService.getAll();
  const gate = await gateService.topics.getAll();
  const sessions = await gateService.sessions.getAll();
  const t = todayStr();
  const todayTasks = getTodayTasks(tasks);
  const doneToday = todayTasks.filter(x=>x.done).length;
  const backlog = getBacklog(tasks);
  const upcoming = getUpcoming(tasks,7);
  const focus = pickFocus(tasks);
  const gateAvg = (()=>{ const me=gate.filter(x=>x.paper==='ME'); return me.length? Math.round(me.reduce((s,x)=>s+topicStats(x).overall,0)/me.length) : 0; })();
  const studyMinToday = sessions.filter(s=>s.date===t).reduce((a,s)=>a+s.durationMin,0);
  const studyLabel = studyMinToday>=60? Math.floor(studyMinToday/60)+'h '+(studyMinToday%60)+'m' : studyMinToday+'m';
  const hr = new Date().getHours();
  const greet = hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const focusHtml = focusCardHtml(focus);

  const upcomingHtml = upcoming.length ? upcoming.map(x=>`<div class="daychip"><span class="d">${x.date.slice(5)}</span><span class="n">${esc(x.text.slice(0,16))}</span></div>`).join('') : '<div class="empty">Nothing in the next 7 days.</div>';

  return `
  <h1>${greet}, Sidharth</h1>
  <div class="date">${dateLabel}</div>
  <div class="grid4">
    ${metricCard(`${doneToday}/${todayTasks.length}`, `Today's tasks`)}
    ${metricCard(`${studyLabel}`, `Study today`)}
    ${metricCard(`${backlog.length}`, `Overdue`)}
    ${metricCard(`${gateAvg}%`, `GATE progress`)}
  </div>
  <div class="section">${focusHtml}</div>
  <div class="section"><h2>Upcoming</h2><div class="strip">${upcomingHtml}</div></div>
  <div class="section"><h2>Needs attention</h2>
    ${backlog.length? backlog.slice(0,5).map(x=>`<div class="task-row"><span class="pri ${x.priority||'medium'}">${x.priority||'med'}</span><span class="txt">${esc(x.text)}</span><span class="cat">since ${x.date}</span></div>`).join('') : '<div class="empty">Nothing overdue. Clear board.</div>'}
  </div>
  <div class="section"><h2>Data</h2><div class="card">
    <div class="substat">Everything lives only in this browser's storage. Back it up regularly.</div>
    <div class="addbar" style="margin-top:8px">
      <button class="primary" data-act="export-data">Export backup (JSON)</button>
      <label class="mini" style="cursor:pointer;display:inline-flex;align-items:center">Import backup<input type="file" id="importFile" accept="application/json" style="display:none"></label>
    </div>
  </div></div>`;
}

export const dashboardActions = {
  click: { 'export-data': async () => { await exportAllData(); return false; } },
  change: {
    '#importFile': async el => {
      const file = el.files[0]; if (!file) return false;
      const ok = confirm('This will overwrite any records with matching IDs from the backup. Continue?');
      if (ok) await importAllData(file);
      el.value = ''; return ok;
    },
  },
};
