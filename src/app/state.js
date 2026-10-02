import { todayStr } from '../utils/dates.js';

/** Single mutable app state. Pages read/write it; the router re-renders after actions. */
export const appState = {
  view: 'dashboard', lastView: 'dashboard',
  params: {},                       // one-shot navigation params (e.g. search result -> GATE topic)
  gatePaper: 'ME', gateTab: 'subjects', gateSubject: null, gateExpanded: new Set(),
  calView: 'month',
  cals: {                           // one entry per reusable-calendar instance
    main: { month: new Date(), selected: todayStr() }, focus: { month: new Date(), selected: todayStr() },
    dash: { month: new Date(), selected: todayStr() }, today: { month: new Date(), selected: todayStr() },
  },
  openProjectId: null, projectTab: 'overview', projectFilter: 'all',
  careerTab: 'pipeline', openUniId: null,
  knowledgeTab: 'all', knowledgeQuery: '', knowledgeTag: null,
  settingsTab: 'appearance',
  focusSetup: { title: '', category: 'gate', mode: null, presetId: null, custom: 45 },
  calSelected: todayStr(),          // kept for compatibility with the original name
};
