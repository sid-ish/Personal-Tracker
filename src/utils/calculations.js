import { addDays, todayStr } from './dates.js';

export function topicStats(t){
  const subs=t.subtopics||[]; const n=subs.length||1;
  const studied=subs.filter(s=>s.s).length, pyq=subs.filter(s=>s.p).length, revSum=subs.reduce((a,s)=>a+s.r,0);
  const theory=Math.round(studied/n*100), pyqPct=Math.round(pyq/n*100), revision=Math.round(Math.min(1,revSum/(n*2))*100);
  return {theory,pyqPct,revision,overall:Math.round((theory+pyqPct+revision)/3)};
}

export function priorityRank(p){ return {urgent:0,high:1,medium:2,low:3}[p] ?? 2; }

export function getBacklog(tasks){ const t=todayStr(); return tasks.filter(x=>!x.done && x.date && x.date<t).sort((a,b)=>a.date<b.date?-1:1); }

export function getTodayTasks(tasks){ const t=todayStr(); return tasks.filter(x=>x.date===t); }

export function getUpcoming(tasks,days=7){ const t=todayStr(); const end=addDays(t,days); return tasks.filter(x=>!x.done && x.date>t && x.date<=end).sort((a,b)=>a.date<b.date?-1:1); }

export function pickFocus(tasks){
  const today=getTodayTasks(tasks).filter(x=>!x.done);
  const backlog=getBacklog(tasks);
  const pool = today.length? today.map(t=>({t,reason:"Highest-priority incomplete task scheduled today."})) :
               backlog.length? backlog.map(t=>({t,reason:"Overdue since "+t.date+" — nothing else is scheduled today."})) : [];
  if(!pool.length) return null;
  pool.sort((a,b)=>priorityRank(a.t.priority)-priorityRank(b.t.priority));
  return pool[0];
}

export function projStats(tasks,pid){ const ts=tasks.filter(t=>t.projectId===pid); const done=ts.filter(t=>t.done).length; return {total:ts.length,done,pct:ts.length?Math.round(done/ts.length*100):0}; }
