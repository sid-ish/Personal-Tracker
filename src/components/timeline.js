import { esc } from '../utils/escape-html.js';
import { icon } from './icons.js';
import { KIND_META } from '../services/calendar-service.js';
import { fmtDate } from '../utils/dates.js';
import { emptyState } from './empty-state.js';

const TONE = { task: 'primary', session: 'green', event: 'cyan', interview: 'cyan', deadline: 'red', milestone: 'orange', revision: 'yellow' };
const ROUTE = { project: 'projects', career: 'career', gate: 'gate', event: 'calendar', session: 'today', task: 'today' };

/** A vertical agenda. Tasks get a checkbox; other items link to where they live. */
export function timelineHtml(items, { showDate = false, empty = { title: 'Nothing scheduled', text: 'Add a task or event to fill this in.' } } = {}) {
  if (!items.length) return emptyState({ compact: true, ...empty });
  return `<ol class="timeline" role="list">${items.map(i => { const m = KIND_META[i.kind] || KIND_META.task, tone = TONE[i.kind] || 'primary';
    const lead = i.kind === 'task' ? `<input type="checkbox" class="check" data-act="toggle" data-id="${esc(i.ref.id)}" ${i.done ? 'checked' : ''} aria-label="${i.done ? 'Mark incomplete' : 'Mark complete'}: ${esc(i.title)}">` : `<span class="tl-icon text-${tone}">${icon(m.icon, 'sm')}</span>`;
    const link = i.kind === 'task' ? '' : ` data-view="${ROUTE[i.ref?.type] || 'calendar'}" role="link" tabindex="0"`;
    return `<li class="tl-row ${i.done ? 'done' : ''}"><span class="tl-time tnum">${esc(i.time || (showDate ? fmtDate(i.date) : ''))}</span>${lead}<div class="tl-body grow"${link}><div class="t-small truncate">${esc(i.title)}</div>${i.sub ? `<div class="t-caption muted truncate">${esc(i.sub)}</div>` : ''}</div><span class="chip ${tone === 'primary' ? '' : tone}">${esc(m.label.replace(/s$/, ''))}</span></li>`; }).join('')}</ol>`;
}
