import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack = [];

/**
 * Opens a dialog. `body` is an HTML string. `actions` are footer buttons: { label, variant, id, onClick(ctx) }.
 * onClick may return false to keep the dialog open. Returns { el, close, setLoading, setError }.
 */
export function openModal({ title, description = '', body = '', actions = [], wide = false, onOpen, onClose, labelledBy } = {}) {
  const opener = document.activeElement;
  const back = document.createElement('div'); back.className = 'modal-backdrop';
  const tid = 'm' + Math.random().toString(36).slice(2, 7);
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${tid}t" ${description ? `aria-describedby="${tid}d"` : ''}>
    <div class="modal-head"><h2 id="${tid}t">${esc(title)}</h2><button class="btn icon sm ghost" data-close aria-label="Close dialog">${icon('X')}</button></div>
    <div class="modal-body">${description ? `<p class="modal-desc mb-4" id="${tid}d">${esc(description)}</p>` : ''}${body}</div>
    ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button type="${a.submit ? 'submit' : 'button'}" ${a.form ? `form="${a.form}"` : ''} class="btn ${a.variant || ''}" data-i="${i}" ${a.id ? `id="${a.id}"` : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(back); document.documentElement.style.overflow = 'hidden';
  const dlg = back.querySelector('.modal');
  let closed = false;
  const ctx = {
    el: dlg, back,
    close(result) { if (closed) return; closed = true; const i = stack.indexOf(ctx); if (i >= 0) stack.splice(i, 1); back.remove(); if (!stack.length) document.documentElement.style.overflow = ''; try { opener?.focus?.({ preventScroll: true }); } catch { /* opener gone */ } onClose?.(result); },
    setLoading(on) { dlg.querySelectorAll('.modal-foot .btn').forEach(b => { b.disabled = on; }); const p = dlg.querySelector('.modal-foot .btn.primary,.modal-foot .btn.solid'); p?.classList.toggle('loading', on); },
    setError(msg) { let e = dlg.querySelector('.modal-error'); if (!e) { e = document.createElement('div'); e.className = 'field'; e.innerHTML = '<span class="err modal-error" role="alert"></span>'; dlg.querySelector('.modal-body').appendChild(e); } dlg.querySelector('.modal-error').textContent = msg; },
  };
  stack.push(ctx);
  back.addEventListener('mousedown', e => { if (e.target === back) back.dataset.down = '1'; else delete back.dataset.down; });
  back.addEventListener('click', e => { if (e.target === back && back.dataset.down) ctx.close(); });
  dlg.querySelector('[data-close]').onclick = () => ctx.close();
  dlg.querySelectorAll('.modal-foot [data-i]').forEach(b => { b.onclick = async () => { const a = actions[+b.dataset.i]; const r = await a.onClick?.(ctx); if (r !== false && a.close !== false) ctx.close(a.result); }; });
  back.addEventListener('keydown', e => {
    if (stack[stack.length - 1] !== ctx) return;
    if (e.key === 'Escape') { e.stopPropagation(); ctx.close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...dlg.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  onOpen?.(ctx);
  requestAnimationFrame(() => { (dlg.querySelector('[autofocus],.modal-body input:not([type=hidden]),.modal-body select,.modal-body textarea') || dlg.querySelector('.modal-foot .btn.primary') || dlg.querySelector('[data-close]'))?.focus(); });
  return ctx;
}
export const anyModalOpen = () => stack.length > 0;

/** Promise<boolean>. Used for every destructive action — nothing is deleted without this. */
export function confirmModal({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, details = '' } = {}) {
  return new Promise(resolve => {
    let decided = false;
    openModal({ title, body: `<p class="secondary">${esc(message)}</p>${details ? `<div class="t-caption muted mt-3">${esc(details)}</div>` : ''}`,
      actions: [{ label: cancelLabel, onClick: () => { decided = true; resolve(false); } }, { label: confirmLabel, variant: danger ? 'danger solid' : 'primary', onClick: () => { decided = true; resolve(true); } }],
      onClose: () => { if (!decided) resolve(false); } });
  });
}
