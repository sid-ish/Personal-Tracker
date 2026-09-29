import { SYLLABI } from '../app/constants.js';
import { SCHEDULE_91, SCHED_SUBJ } from '../data/gate-schedule.js';
import { createRepository } from '../database/queries.js';
import { taskService } from './task-service.js';

async function ensurePaperSeeded(paper){
  const flagKey = 'gateSeeded_'+paper;
  const done = await gateService.meta.get(flagKey);
  if(done) return;
  const existing = await gateService.topics.getAll();
  if(existing.some(t=>t.paper===paper)){ await gateService.meta.put({key:flagKey,value:true}); return; }
  const syllabus = SYLLABI[paper];
  for(const subject in syllabus){
    for(const topic in syllabus[subject]){
      const subtopics = syllabus[subject][topic].map(n=>({n,s:false,p:false,r:0}));
      await gateService.topics.put({id:paper.toLowerCase()+'-'+subject+'-'+topic,paper,subject,topic,subtopics,notes:''});
    }
  }
  await gateService.meta.put({key:flagKey,value:true});
}

async function ensureGateSeeded(){
  const v2 = await gateService.meta.get('gateSchemaV2');
  if(v2) return;
  await gateService.topics.clear();
  await gateService.meta.put({key:'gateSchemaV2',value:true});
}

async function importGateSchedule(){
  for(const [day,date,subjCode,topic,ga,mainHrs,gaHrs,kind] of SCHEDULE_91){
    const subj = SCHED_SUBJ[subjCode]||subjCode;
    const isTest = kind==='t'||kind==='m';
    await taskService.put({
      id:'gs-'+day, text:`Day ${day} · ${subj}: ${topic}`, category:'gate',
      priority: isTest?'high':(kind==='b'?'low':'medium'),
      date, done:false, projectId:null, createdAt:new Date().toISOString(),
      estimatedMinutes:Math.round((mainHrs+gaHrs)*60), gaFocus:ga, gateKind:kind
    });
  }
  await gateService.meta.put({key:'scheduleImported',value:true});
}

export const gateService = {
  topics: createRepository('gateTopics'),
  meta: createRepository('meta'),
  pyq: createRepository('pyqRecords'),
  mistakes: createRepository('mistakes'),
  sessions: createRepository('studySessions'),
  ensurePaperSeeded,
  ensureGateSeeded,
  importGateSchedule,
};
