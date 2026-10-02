let tip = null, timer = null;
function hide() { clearTimeout(timer); tip?.remove(); tip = null; }
function show(el) {
  const text = el.dataset.tip; if (!text) return; hide();
  tip = document.createElement('div'); tip.className = 'tooltip'; tip.setAttribute('role', 'tooltip'); tip.textContent = text; document.body.appendChild(tip);
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let left, top;
  if (el.dataset.tipPos === 'right') { left = r.right + 10; top = r.top + (r.height - h) / 2; } else { left = r.left + (r.width - w) / 2; top = r.bottom + 8; if (top + h > innerHeight) top = r.top - h - 8; }
  tip.style.left = Math.max(6, Math.min(left, innerWidth - w - 6)) + 'px'; tip.style.top = Math.max(6, top) + 'px';
}
/** Delegated tooltips for any element with data-tip="text" (optional data-tip-pos="right"). Works on hover and keyboard focus. */
export function initTooltips() {
  const enter = e => { const el = e.target.closest?.('[data-tip]'); if (!el) return; clearTimeout(timer); timer = setTimeout(() => show(el), e.type === 'focusin' ? 0 : 380); };
  const leave = e => { if (e.target.closest?.('[data-tip]')) hide(); };
  document.addEventListener('mouseover', enter); document.addEventListener('focusin', enter);
  document.addEventListener('mouseout', leave); document.addEventListener('focusout', leave);
  document.addEventListener('mousedown', hide); document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
}
