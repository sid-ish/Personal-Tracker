import { icon } from './icons.js';
import { esc } from '../utils/escape-html.js';

let openEl = null, cleanup = null;
export function closeMenu() { cleanup?.(); cleanup = null; openEl?.remove(); openEl = null; }

function place(el, anchor, align) {
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, m = 8;
  let left = align === 'right' ? r.right - w : r.left; left = Math.max(m, Math.min(left, innerWidth - w - m));
  let top = r.bottom + 6; if (top + h > innerHeight - m) top = Math.max(m, r.top - h - 6);
  el.style.left = left + 'px'; el.style.top = top + 'px';
}
function attach(el, anchor, align, onClose) {
  closeMenu(); document.body.appendChild(el); openEl = el; place(el, anchor, align);
  const onDown = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); anchor.focus?.(); } };
  const onResize = () => place(el, anchor, align);
  setTimeout(() => document.addEventListener('mousedown', onDown), 0);
  document.addEventListener('keydown', onKey, true); window.addEventListener('resize', onResize);
  anchor.setAttribute('aria-expanded', 'true');
  cleanup = () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize); anchor.setAttribute('aria-expanded', 'false'); onClose?.(); };
}

/** items: { label, icon, onClick, danger, kbd } | { separator:true } | { heading:'Label' } */
export function openMenu(anchor, items, { align = 'left' } = {}) {
  if (openEl && anchor.getAttribute('aria-expanded') === 'true') { closeMenu(); return; }
  const el = document.createElement('div'); el.className = 'menu'; el.setAttribute('role', 'menu');
  el.innerHTML = items.map((it, i) => it.separator ? '<div class="menu-sep" role="separator"></div>' : it.heading ? `<div class="menu-label">${esc(it.heading)}</div>` :
    `<button class="menu-item ${it.danger ? 'danger' : ''}" role="menuitem" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>${it.kbd ? `<span class="kbd-hint"><kbd>${esc(it.kbd)}</kbd></span>` : ''}</button>`).join('');
  attach(el, anchor, align);
  const btns = [...el.querySelectorAll('.menu-item')]; let idx = -1;
  const focusAt = i => { idx = (i + btns.length) % btns.length; btns[idx]?.focus(); };
  el.addEventListener('click', e => { const b = e.target.closest('.menu-item'); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.onClick?.(); });
  el.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(idx + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(idx - 1); } else if (e.key === 'Tab') { e.preventDefault(); closeMenu(); } });
  focusAt(0); return el;
}
/** A free-form panel (used by notifications). `html` is rendered inside .popover-body. */
export function openPopover(anchor, { title, html, onMount, align = 'right' } = {}) {
  if (openEl && anchor.getAttribute('aria-expanded') === 'true') { closeMenu(); return null; }
  const el = document.createElement('div'); el.className = 'popover'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title || 'Panel');
  el.innerHTML = `<div class="popover-head"><h3>${esc(title || '')}</h3><button class="btn icon sm ghost" aria-label="Close" data-pclose>${icon('X')}</button></div><div class="popover-body">${html}</div>`;
  attach(el, anchor, align); el.querySelector('[data-pclose]').onclick = () => { closeMenu(); anchor.focus(); }; onMount?.(el); return el;
}
