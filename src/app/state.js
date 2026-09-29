import { todayStr } from '../utils/dates.js';

/** Single mutable app state (replaces the scattered globals of the original file). */
const freshTimer = () => ({ running: false, startedAt: null, elapsedBase: 0 });

export const appState = {
  view: 'dashboard',
  gatePaper: 'ME',
  gateExpanded: new Set(),
  calMonth: new Date(),
  calSelected: todayStr(),
  openProjectId: null,
  careerTab: 'internships',
  openUniId: null,
  knowledgeTab: 'events',
  timer: freshTimer(),
  showTimerLogForm: false,
  addDate: todayStr(),      // date a newly added task gets (was CURRENT_ADD_DATE)
  addProject: null,         // project a newly added task links to (was CURRENT_ADD_PROJECT)
  themeIdx: 0,
};
export const resetTimer = () => { appState.timer = freshTimer(); };
