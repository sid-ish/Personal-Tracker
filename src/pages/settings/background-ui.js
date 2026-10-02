import { settings } from '../../services/settings/settings.js';
import * as bg from '../../services/background/background.js';
import { openModal, confirmModal } from '../../components/modal.js';
import { openMenu } from '../../components/dropdown.js';
import { toast } from '../../components/toast.js';
import { icon } from '../../components/icons.js';
import { esc } from '../../utils/escape-html.js';
import { render } from '../../app/router.js';

export const TARGETS = [['global', 'Global'], ['dashboard', 'Dashboard'], ['gate', 'GATE'], ['projects', 'Projects'], ['focus', 'Focus mode']];
let target = 'global', draft = null;                       // draft = { cfg } while previewing an unsaved choice
export const setTarget = t => { target = t; draft = null; bg.endPreview(); };
export const getTarget = () => target;

const cfgOf = t => { const b = settings.get('background'); return t === 'global' ? b.global : (b.pages[t] || null); };
const effective = t => cfgOf(t) || settings.get('background.global');
function saveCfg(t, cfg) { const b = structuredClone(settings.get('background')); if (t === 'global') b.global = cfg; else b.pages[t] = cfg; settings.set('background', b); }
async function commit(t, cfg, msg = 'Background changed') { draft = null; bg.endPreview(); saveCfg(t, cfg); await bg.syncActiveFlags(); await bg.reapply(); toast.success(msg); await render(); }
const sameSel = (a, b) => a && b && a.type === b.type && (a.type === 'builtin' ? (a.ref === b.ref) : a.ref === b.ref);

export async function backgroundHtml() {
  const custom = await bg.listCustom(), b = settings.get('background'), cur = draft?.cfg || effective(target), saved = effective(target);
  const isSel = c => sameSel(draft ? draft.cfg : saved, c) || (!draft && saved.type === 'builtin' && saved.ref === 'auto' && c.type === 'builtin' && c.ref === bg.resolveRef(saved));
  const tile = (c, thumb, name, extra = '') => { const on = !draft && isSel(c), pending = draft && sameSel(draft.cfg, c);
    return `<div class="bg-tile" role="button" tabindex="0" data-act="bg-pick" data-type="${c.type}" data-ref="${esc(c.ref)}" aria-pressed="${on || pending}" aria-label="${esc(name)}${on ? ', active' : ''}">${thumb}${on ? `<span class="chip green bg-active">${icon('Check')}Active</span>` : pending ? '<span class="chip primary bg-active">Previewing</span>' : ''}<div class="bg-name"><span class="truncate">${esc(name)}</span></div>${extra}</div>`; };
  const solid = bg.SOLIDS.map(s => tile({ type: 'solid', ref: s.id }, `<div class="bg-thumb" style="background:${s.color}"></div>`, s.name)).join('');
  const grad = bg.GRADIENTS.map(g => tile({ type: 'gradient', ref: g.id }, `<div class="bg-thumb" style="background:${g.css}"></div>`, g.name)).join('');
  const built = bg.BUILTIN.map(i => tile({ type: 'builtin', ref: i.id }, `<img class="bg-thumb" src="${i.url}" alt="" loading="lazy" decoding="async">`, i.name)).join('');
  const cust = custom.map(c => tile({ type: 'custom', ref: c.id }, `<div class="bg-thumb" data-thumb="${c.id}"></div>`, c.name, `<button class="btn icon sm ghost bg-menu" data-act="bg-menu" data-id="${c.id}" aria-haspopup="menu" aria-label="Options for ${esc(c.name)}">${icon('MoreHorizontal', 'sm')}</button>`)).join('');
  const slider = (label, key, min, max, unit = '%') => `<div class="slider-row"><label for="bgs-${key}">${label}</label><input type="range" id="bgs-${key}" data-act="bg-slider" data-key="${key}" min="${min}" max="${max}" value="${cur[key] ?? 0}"><span class="tnum muted" id="bgsv-${key}">${cur[key] ?? 0}${unit}</span></div>`;
  const sel = (label, key, opts) => `<div class="field"><label for="bgsel-${key}">${label}</label><select class="select" id="bgsel-${key}" data-act="bg-select" data-key="${key}">${opts.map(([v, l]) => `<option value="${v}" ${(cur[key] || opts[0][0]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
  const hasImg = ['builtin', 'custom'].includes(cur.type);
  return `<section class="card" id="background" aria-labelledby="bgh"><div class="card-title"><h3 id="bgh">Background</h3><div class="row"><button class="btn sm" data-act="bg-remove">Remove background</button><button class="btn sm" data-act="bg-reset">Reset</button></div></div>
    <div class="row wrap mb-4"><div class="segmented" role="group" aria-label="Apply background to">${TARGETS.map(([k, l]) => `<button data-act="bg-target" data-t="${k}" aria-pressed="${target === k}" ${k !== 'global' && k !== 'focus' && !b.perPage ? 'disabled style="opacity:.45;pointer-events:none"' : ''}>${l}</button>`).join('')}</div>
      ${target !== 'global' && cfgOf(target) ? `<button class="btn sm ghost" data-act="bg-inherit">Use global background</button>` : ''}</div>
    <div class="set-row" style="border:0;padding-top:0"><div class="info"><div class="t-small" style="font-weight:600">Different background per page</div><div class="t-caption muted">Off by default. Dashboard, GATE and Projects follow the global background unless this is on. Focus mode can always have its own.</div></div><label class="switch"><input type="checkbox" data-act="bg-perpage" ${b.perPage ? 'checked' : ''} aria-label="Different background per page"><span></span></label></div>
    ${target !== 'global' && !cfgOf(target) ? `<p class="t-caption muted mb-4">${TARGETS.find(x => x[0] === target)[1]} currently uses the global background. Pick one below to override it.</p>` : ''}
    <div class="label mb-2">Solid</div><div class="bg-grid mb-4">${solid}</div><div class="label mb-2">Gradients</div><div class="bg-grid mb-4">${grad}</div>
    <div class="label mb-2">Images</div><div class="bg-grid mb-4">${built}</div>
    <div class="label mb-2">Custom backgrounds</div><div class="bg-grid">${cust}<button class="bg-tile bg-upload" data-act="bg-upload">${icon('Upload', 'lg')}<span class="t-small">Upload background</span><span class="t-caption muted">JPG, PNG or WebP · up to 10 MB</span></button></div>
    ${draft ? `<div class="bg-bar" role="region" aria-label="Unsaved background"><span class="grow t-small">Previewing a new background. It isn’t saved yet.</span><button class="btn" data-act="bg-cancel">Cancel</button><button class="btn primary" data-act="bg-save">${icon('Check')}Use this background</button></div>` : ''}
    <div class="divider"></div><div class="col gap-4">${slider('Background opacity', 'opacity', 10, 100)}${slider('Blur', 'blur', 0, 30, 'px')}${slider('Overlay darkness', 'overlay', 0, 90)}
      <div class="form-grid">${sel('Position', 'position', [['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']])}${sel('Fit', 'fit', [['cover', 'Cover'], ['contain', 'Contain'], ['stretch', 'Stretch']])}</div>
      ${hasImg ? '' : '<p class="t-caption muted">Position and fit apply to image backgrounds.</p>'}<p class="t-caption muted">A readability overlay is added automatically so text stays legible on any image.</p></div></section>`;
}
/** Fills custom thumbnails lazily (they live in IndexedDB as blobs). */
export async function hydrateThumbs(root) {
  const nodes = [...root.querySelectorAll('[data-thumb]')]; if (!nodes.length) return;
  const io = new IntersectionObserver(async entries => { for (const e of entries) { if (!e.isIntersecting) continue; io.unobserve(e.target); const u = await bg.customUrl(e.target.dataset.thumb, true); if (u) { e.target.style.backgroundImage = `url("${u}")`; } } }, { rootMargin: '200px' });
  nodes.forEach(n => io.observe(n));
}
const pick = (type, ref) => ({ ...effective(target), type, ref });

export const backgroundActions = {
  click: {
    'bg-target': el => { setTarget(el.dataset.t); bg.apply(el.dataset.t === 'global' ? 'dashboard' : el.dataset.t); },
    'bg-pick': async el => { const cfg = pick(el.dataset.type, el.dataset.ref); draft = { cfg }; await bg.startPreview(cfg); },
    'bg-cancel': async () => { draft = null; await bg.cancelPreview(); },
    'bg-save': async () => { if (draft) await commit(target, draft.cfg); return false; },
    'bg-reset': async () => { if (!await confirmModal({ title: 'Reset background?', message: 'This restores the default background and its opacity, blur and overlay settings.', confirmLabel: 'Reset' })) return false; const t = target; const fresh = structuredClone({ type: 'builtin', ref: 'auto', opacity: 100, blur: 0, overlay: 45, position: 'center', fit: 'cover' }); if (t === 'global') await commit(t, fresh, 'Background reset'); else { const b = structuredClone(settings.get('background')); delete b.pages[t]; settings.set('background', b); draft = null; await bg.syncActiveFlags(); await bg.reapply(); toast.success('Background reset'); } return false; },
    'bg-remove': async () => { await commit(target, { ...effective(target), type: 'none', ref: '' }, 'Background removed'); return false; },
    'bg-inherit': async () => { const b = structuredClone(settings.get('background')); delete b.pages[target]; settings.set('background', b); await bg.syncActiveFlags(); await bg.reapply(); toast.info('Using the global background'); },
    'bg-upload': () => { startUpload(); return false; },
    'bg-menu': async el => { const rec = (await bg.listCustom()).find(r => r.id === el.dataset.id); if (!rec) return false;
      openMenu(el, [{ label: 'Use', icon: 'Check', onClick: async () => { const cfg = pick('custom', rec.id); draft = { cfg }; await bg.startPreview(cfg); await render(); } }, { label: 'Rename', icon: 'Pencil', onClick: () => renameDialog(rec) }, { separator: true }, { label: 'Delete', icon: 'Trash2', danger: true, onClick: async () => { if (!await confirmModal({ title: 'Delete this background?', message: `“${rec.name}” will be removed from your gallery. If it is in use, the default background is restored.`, confirmLabel: 'Delete', danger: true })) return; await bg.deleteCustom(rec.id); draft = null; toast.success('Background deleted'); await render(); } }], { align: 'right' }); return false; },
  },
  change: {
    'bg-perpage': async el => { const b = structuredClone(settings.get('background')); b.perPage = el.checked; settings.set('background', b); if (!el.checked && !['global', 'focus'].includes(target)) setTarget('global'); await bg.reapply(); },
    'bg-select': el => { const cfg = { ...(draft?.cfg || effective(target)), [el.dataset.key]: el.value }; if (draft) { draft.cfg = cfg; return bg.startPreview(cfg).then(() => false); } saveCfg(target, cfg); bg.reapply(); return false; },
  },
  input: {
    'bg-slider': el => { const key = el.dataset.key, v = +el.value; document.getElementById('bgsv-' + key).textContent = v + (key === 'blur' ? 'px' : '%'); const cfg = { ...(draft?.cfg || effective(target)), [key]: v }; if (draft) { draft.cfg = cfg; bg.startPreview(cfg); } else { saveCfg(target, cfg); bg.reapply(); } return false; },
  },
};

function renameDialog(rec) {
  openModal({ title: 'Rename background', body: `<div class="field"><label for="bgRename">Name</label><input class="input" id="bgRename" value="${esc(rec.name)}" maxlength="40" autocomplete="off"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', variant: 'primary', onClick: async c => { const v = c.el.querySelector('#bgRename').value.trim(); if (!v) { c.setError('Enter a name.'); return false; } await bg.renameCustom(rec.id, v); toast.success('Background renamed'); await render(); } }] });
}
function startUpload() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'; input.hidden = true; document.body.appendChild(input);
  input.addEventListener('cancel', () => input.remove());
  input.onchange = async () => {
    const file = input.files[0]; input.remove(); if (!file) return;
    let proc; try { proc = await bg.processUpload(file); } catch (e) { toast.error(e.message); return; }
    const base = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
    const ctx = openModal({ title: 'Custom background', description: 'Check the preview and give it a name.', body: `<img class="preview-img mb-4" src="${proc.previewUrl}" alt="Preview of the uploaded background"><div class="field"><label for="bgName">Name</label><input class="input" id="bgName" value="${esc(base)}" maxlength="40" autocomplete="off"><span class="hint">${proc.width}×${proc.height} · ${(proc.size / 1024).toFixed(0)} KB after optimising</span></div>`,
      onClose: () => URL.revokeObjectURL(proc.previewUrl),
      actions: [{ label: 'Cancel' }, { label: 'Save to gallery', onClick: async c => save(c, false), close: false }, { label: 'Use background', variant: 'primary', onClick: async c => save(c, true), close: false }] });
    async function save(c, use) {
      const name = c.el.querySelector('#bgName').value.trim(); if (!name) { c.setError('Enter a name for this background.'); return false; }
      c.setLoading(true);
      try { const rec = await bg.saveCustom({ ...proc, name }); c.close(); if (use) { await commit(target, pick('custom', rec.id), 'Background saved and applied'); } else { toast.success('Added to your gallery'); await render(); } }
      catch (e) { console.error(e); c.setLoading(false); c.setError('Could not save this image. Browser storage may be full.'); }
      return false;
    }
  };
  input.click();
}
