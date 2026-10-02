import { openModal } from './modal.js';
import { esc } from '../utils/escape-html.js';
import { toast } from './toast.js';
import { isBlank } from '../utils/validation.js';

const opt = o => Array.isArray(o) ? { value: o[0], label: o[1] } : typeof o === 'object' ? o : { value: o, label: o };

function fieldHtml(f, v) {
  const id = 'f_' + f.name, val = v ?? f.default ?? '';
  let ctl;
  if (f.type === 'textarea') ctl = `<textarea class="textarea" id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`;
  else if (f.type === 'select') ctl = `<select class="select" id="${id}" name="${f.name}">${(f.options || []).map(opt).map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  else ctl = `<input class="input" id="${id}" name="${f.name}" type="${f.type === 'tags' || f.type === 'url' ? 'text' : (f.type || 'text')}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.type === 'number' ? 'inputmode="numeric"' : ''} ${f.type === 'url' ? 'inputmode="url"' : ''} autocomplete="off" ${f.required ? 'aria-required="true"' : ''}>`;
  return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.name}" ${f.showIf ? `data-showif='${JSON.stringify(f.showIf)}'` : ''}><label for="${id}">${esc(f.label)}${f.required ? ' <span class="muted">(required)</span>' : ''}</label>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}<span class="err" role="alert" hidden></span></div>`;
}

/**
 * Generic form dialog. fields: { name, label, type, required, options, placeholder, hint, full, showIf:{field,in:[..]}, validate(value, all) }.
 * onSubmit(values) may throw to show an error; the dialog stays open until it resolves.
 */
export function openForm({ title, description, fields, values = {}, submitLabel = 'Save', onSubmit, wide = false }) {
  const body = `<form id="modalForm" novalidate><div class="form-grid">${fields.map(f => fieldHtml(f, values[f.name])).join('')}</div></form>`;
  const ctx = openModal({ title, description, body, wide, actions: [{ label: 'Cancel' }, { label: submitLabel, variant: 'primary', submit: true, form: 'modalForm', id: 'modalSubmit', close: false }] });
  const form = ctx.el.querySelector('#modalForm');
  const vis = () => form.querySelectorAll('[data-showif]').forEach(w => { const c = JSON.parse(w.dataset.showif); const cur = form.elements[c.field]?.value; w.hidden = !c.in.includes(cur); });
  vis(); form.addEventListener('change', vis);
  const read = () => { const o = {}; fields.forEach(f => { const el = form.elements[f.name]; if (el && !el.closest('[data-field]').hidden) o[f.name] = typeof el.value === 'string' ? el.value.trim() : el.value; }); return o; };
  async function submit() {
    const data = read(); let ok = true; let first = null;
    form.querySelectorAll('.field').forEach(w => { w.classList.remove('invalid'); const e = w.querySelector('.err'); if (e) e.hidden = true; });
    for (const f of fields) {
      const w = form.querySelector(`[data-field="${f.name}"]`); if (w.hidden) continue; let msg = '';
      if (f.required && isBlank(data[f.name])) msg = `${f.label} is required.`;
      else if (f.validate) msg = f.validate(data[f.name], data) || '';
      if (msg) { ok = false; w.classList.add('invalid'); const e = w.querySelector('.err'); e.textContent = msg; e.hidden = false; first = first || form.elements[f.name]; }
    }
    if (!ok) { first?.focus(); return false; }
    ctx.setLoading(true);
    try { await onSubmit(data); ctx.close(); } catch (e) { console.error(e); ctx.setLoading(false); toast.error(e.message || 'Could not save.'); }
    return false;
  }
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  return ctx;
}
