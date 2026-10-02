import { navigate } from '../app/router.js';
import { appState } from '../app/state.js';
import { parseDate } from '../utils/dates.js';
import { openKnowledgeItem } from '../pages/knowledge/knowledge-detail.js';

/** Navigates to the thing a search result points at, setting page state first so the page opens on it. */
export async function openResult(r) {
  const ref = r.ref || {};
  if (r.route === 'task' || r.route === 'calendar') { const d = ref.date || new Date().toISOString().slice(0, 10); appState.cals.main.selected = d; appState.cals.main.month = parseDate(d); appState.calSelected = d; appState.calView = r.route === 'task' ? 'day' : 'month'; return navigate('calendar', { highlight: ref.id }); }
  if (r.route === 'gate') { appState.gatePaper = ref.paper; appState.gateTab = 'subjects'; appState.gateSubject = ref.subject; appState.gateExpanded.add(ref.topic); return navigate('gate', { scrollTo: ref.topic }); }
  if (r.route === 'projects') { appState.openProjectId = ref.project; appState.projectTab = 'overview'; return navigate('projects'); }
  if (r.route === 'knowledge') { appState.knowledgeTab = ref.tab || 'all'; await navigate('knowledge'); if (ref.item && ref.store !== 'mistakes') openKnowledgeItem(ref.store, ref.item); return; }
  if (r.route === 'career') { appState.careerTab = ref.tab || 'pipeline'; return navigate('career', { item: ref.item }); }
  return navigate(r.route, ref);
}
