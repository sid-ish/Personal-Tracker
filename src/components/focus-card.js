import { esc } from '../utils/escape-html.js';

export function focusCardHtml(focus) {
  let focusHtml = '<div class="focus-empty">Nothing scheduled or overdue — you\'re clear.</div>';
  if(focus){
    focusHtml = `<div class="focus-card">
      <div class="tag">Focus now</div>
      <h3>${esc(focus.t.text)}</h3>
      <p>${esc(focus.t.category||'task')} · ${esc(focus.t.priority||'medium')} priority</p>
      <button class="btn" data-act="complete-focus" data-id="${focus.t.id}">Mark complete</button>
      <div class="why">${esc(focus.reason)}</div>
    </div>`;
  }
  return focusHtml;
}
