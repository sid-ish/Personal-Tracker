import { appState } from '../../app/state.js';
import { addFormHtml, taskRowsHtml } from '../../components/task-list.js';
import { calendarService } from '../../services/calendar-service.js';
import { todayStr } from '../../utils/dates.js';

export async function renderCalendar(){
  const tasks = await calendarService.getTasks();
  const year=appState.calMonth.getFullYear(), month=appState.calMonth.getMonth();
  const startDow = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const monthLabel = appState.calMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const pendingDates = calendarService.pendingDates(tasks);

  let cells='';
  for(let i=0;i<startDow;i++) cells+='<div class="calcell other"></div>';
  for(let d=1; d<=daysInMonth; d++){
    const ds = todayStr(new Date(year,month,d));
    cells+=`<div class="calcell ${ds===todayStr()?'today':''} ${ds===appState.calSelected?'sel':''}" data-act="pick-day" data-date="${ds}">${d}${pendingDates.has(ds)?'<span class="dot"></span>':''}</div>`;
  }
  appState.addDate = appState.calSelected; appState.addProject = null;
  const dayTasks = calendarService.tasksOn(tasks, appState.calSelected);

  return `
  <h1>Calendar</h1>
  <div class="calnav">
    <button class="mini" data-act="cal-prev">Prev</button>
    <div class="date" style="margin:0">${monthLabel}</div>
    <button class="mini" data-act="cal-next">Next</button>
  </div>
  <div class="calgrid">${cells}</div>
  <div class="section" style="margin-top:16px"><h2>${appState.calSelected}${appState.calSelected===todayStr()?' · today':''}</h2>
    <div class="card">${taskRowsHtml(dayTasks)}${addFormHtml()}</div>
  </div>`;
}

export const calendarActions = {
  click: {
    'pick-day': el => { appState.calSelected = el.dataset.date; },
    'cal-prev': () => { const m = appState.calMonth; appState.calMonth = new Date(m.getFullYear(), m.getMonth() - 1, 1); },
    'cal-next': () => { const m = appState.calMonth; appState.calMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1); },
  },
};
