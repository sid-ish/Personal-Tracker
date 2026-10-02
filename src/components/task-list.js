import { openTaskForm } from './entity-forms.js';
import { taskService } from '../services/task-service.js';
import { addDays, todayStr, relDay } from '../utils/dates.js';
import { esc } from '../utils/escape-html.js';
import { icon } from './icons.js';
import { toast } from './toast.js';
import { confirmModal } from './modal.js';
import { emptyState } from './empty-state.js';

const catLabel = c => ({ gate: 'GATE', academic: 'Academic', project: 'Project', personal: 'Personal', other: 'Other' })[c] || c || '';

export function taskRowsHtml(list, { showDate = false, emptyTitle = 'No tasks here', emptyText = '' } = {}) {
  if (!list.length) return emptyState({ compact: true, title: emptyTitle, text: emptyText });
  return `<div class="list">${list.map(x => `
    <div class="task-row ${x.done ? 'done' : ''}">
      <input type="checkbox" class="check" data-act="toggle" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="${x.done ? 'Mark incomplete' : 'Mark complete'}: ${esc(x.text)}">
      <span class="txt">${esc(x.text)}</span>
      ${x.estimatedMinutes ? `<span class="meta hide-mobile">${Math.round(x.estimatedMinutes / 6) / 10}h</span>` : ''}
      <span class="meta hide-mobile">${esc(catLabel(x.category))}${showDate && x.date && x.date !== todayStr() ? ' · ' + relDay(x.date) : ''}</span>
      <span class="pri ${x.priority || 'medium'}">${x.priority || 'medium'}</span>
      <span class="row-actions">
        <button class="btn icon sm ghost" data-act="task-edit" data-id="${x.id}" aria-label="Edit task" data-tip="Edit">${icon('Pencil', 'sm')}</button>
        <button class="btn icon sm ghost" data-act="push" data-id="${x.id}" aria-label="Push to tomorrow" data-tip="Push a day">${icon('ArrowRight', 'sm')}</button>
        <button class="btn icon sm ghost" data-act="del" data-id="${x.id}" aria-label="Delete task" data-tip="Delete">${icon('Trash2', 'sm')}</button>
      </span>
    </div>`).join('')}</div>`;
}

/** Inline "add a task" input. Enter submits; "More" opens the full form with the same date/project. */
export function taskQuickAddHtml({ date = todayStr(), projectId = '', id = 'q' } = {}) {
  return `<div class="quick-input"><input class="input" id="qt_${id}" data-submit="#qb_${id}" data-qdate="${date}" data-qproject="${projectId}" placeholder="Add a task and press Enter…" aria-label="New task title" autocomplete="off">
    <button class="btn primary" id="qb_${id}" data-act="task-quick" data-for="qt_${id}">${icon('Plus')}Add</button>
    <button class="btn" data-open="task" data-date="${date}" data-project="${projectId}" data-act="open-new" data-kind="task" aria-label="Add task with details">Details</button></div>`;
}

const saveTask = async (id, mutate) => { const t = await taskService.get(id); if (!t) return; mutate(t); await taskService.put(t); return t; };

/** Shared task actions, used by Dashboard, Today, Calendar and Projects. */
export const taskActions = {
  change: {
    toggle: async el => { const t = await saveTask(el.dataset.id, t => { t.done = el.checked; t.completedAt = el.checked ? new Date().toISOString() : null; }); if (t?.done) toast.success('Task completed'); },
  },
  click: {
    del: async el => {
      const t = await taskService.get(el.dataset.id); if (!t) return false;
      if (!await confirmModal({ title: 'Delete this task?', message: `“${t.text}” will be removed permanently.`, confirmLabel: 'Delete task', danger: true })) return false;
      await taskService.remove(t.id); toast.success('Task deleted');
    },
    push: async el => { await saveTask(el.dataset.id, t => { t.date = addDays(t.date || todayStr(), 1); }); toast.info('Moved to tomorrow'); },
    movetoday: async el => { await saveTask(el.dataset.id, t => { t.date = todayStr(); }); toast.info('Moved to today'); },
    'complete-focus': async el => { await saveTask(el.dataset.id, t => { t.done = true; t.completedAt = new Date().toISOString(); }); toast.success('Task completed'); },
    'task-edit': async el => { await openTaskForm(await taskService.get(el.dataset.id)); return false; },
    'task-quick': async el => {
      const input = document.getElementById(el.dataset.for); const text = input.value.trim(); if (!text) { input.focus(); return false; }
      await taskService.put({ id: 't' + Date.now() + Math.random().toString(36).slice(2, 6), text, category: input.dataset.qproject ? 'project' : 'academic', priority: 'medium', date: input.dataset.qdate || todayStr(), projectId: input.dataset.qproject || null, done: false, createdAt: new Date().toISOString() });
      toast.success('Task added');
    },
  },
};
