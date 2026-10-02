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

/* ---------- Sidharth OS 2.0 additions ---------- */
export function projectProgress(p, tasks) {
  const st = projStats(tasks, p.id);
  if (st.total) return { ...st, source: 'tasks' };
  const ms = p.milestones || []; const done = ms.filter(m => m.done).length;
  return { total: ms.length, done, pct: ms.length ? Math.round(done / ms.length * 100) : 0, source: 'milestones' };
}
export function nextMilestone(p) { return (p.milestones || []).filter(m => !m.done).sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1)[0] || null; }
export const isWeakTopic = t => t.weak === true || (topicStats(t).theory > 0 && topicStats(t).overall < 35);
const REV_DAYS = [0, 3, 7, 21];
/** Spaced-revision interval (days) after a subtopic reaches revision count r (1-3). */
export const revisionInterval = r => REV_DAYS[r] || 0;
export function subjectSummary(topics) {
  const n = topics.length || 1;
  const overall = Math.round(topics.reduce((a, t) => a + topicStats(t).overall, 0) / n);
  const subs = topics.flatMap(t => t.subtopics || []);
  const last = topics.map(t => t.lastStudied).filter(Boolean).sort().pop() || null;
  const next = topics.map(t => t.nextRevision).filter(Boolean).sort()[0] || null;
  return { overall, topicCount: topics.length, subCount: subs.length, studied: subs.filter(s => s.s).length, last, next, weak: topics.filter(isWeakTopic) };
}
