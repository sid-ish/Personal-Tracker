import { render, navigate } from './router.js';
import { handleError } from './errors.js';

/** Event registry. Pages and components contribute { click, change, focusout, input } groups keyed by data-act (or '#id'). */
const registry = { click: {}, change: {}, focusout: {}, input: {} };
const registered = new WeakSet();
export function registerActions(group) {
  if (!group || registered.has(group)) return; registered.add(group);
  for (const type in group) { registry[type] = registry[type] || {}; Object.assign(registry[type], group[type]); }
}
const isField = el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);

/** Handlers return false to skip the automatic re-render. */
async function dispatch(type, e) {
  if (e.target.closest('.modal, .palette, .menu, .popover')) { if (!e.target.closest('[data-global]')) return; }
  if (type === 'click') {
    const nav = e.target.closest('[data-view]');
    if (nav) { e.preventDefault(); await navigate(nav.dataset.view); return; }
  }
  const el = e.target.closest('[data-act]') || e.target.closest('button[id],input[id]');
  if (!el) return;
  if (type === 'click' && isField(el) && el.type !== 'button') return;
  if ((type === 'change' || type === 'focusout' || type === 'input') && !isField(el)) return;
  const handler = registry[type]?.[el.dataset.act || '#' + el.id];
  if (!handler) return;
  const result = await handler(el, e);
  if (result !== false) await render();
}

export function registerEvents() {
  ['click', 'change', 'focusout', 'input'].forEach(t => document.addEventListener(t, e => dispatch(t, e).catch(handleError)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.dataset?.submit && !e.shiftKey && !e.isComposing) { e.preventDefault(); document.querySelector(e.target.dataset.submit)?.click(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
  });
}
