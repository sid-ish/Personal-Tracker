import { settings } from '../settings/settings.js';
import { createRepository } from '../../database/queries.js';
import { isLightTheme } from '../theme/theme.js';
import { BUILTIN, SOLIDS, GRADIENTS, builtinById } from './catalog.js';
import { uid, clamp } from '../../utils/dom.js';

const repo = createRepository('backgrounds');
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
// A small compressed file can still decode to a huge bitmap (width x height x 4 bytes). These cap that memory use while
// still allowing every normal camera photo (a 50 MP phone shot is ~8200x6150).
export const MAX_IMAGE_SIDE = 16384;
export const MAX_IMAGE_PIXELS = 60_000_000;
const urlCache = new Map();          // custom id -> object URL (full image)
const thumbCache = new Map();        // custom id -> object URL (thumbnail)
let currentRoute = 'dashboard';
let previewCfg = null;
let paintSeq = 0;                 // newest paint request wins; older async paints are discarded

/* ---------- resolution ---------- */
export const defaultCfg = () => settings.get('background.global');
export function resolveRef(cfg) {
  if (cfg.type === 'builtin' && cfg.ref === 'auto') return isLightTheme() ? 'minimal-light' : 'obsidian';
  return cfg.ref;
}
/** Which config applies to a route. Focus always honours its own override; other pages only when per-page backgrounds are enabled. */
export function cfgForRoute(route) {
  const bg = settings.get('background');
  if (route === 'focus' && bg.pages.focus) return bg.pages.focus;
  if (bg.perPage && bg.pages[route]) return bg.pages[route];
  return bg.global;
}

/* ---------- custom image store ---------- */
export async function listCustom() { const all = await repo.getAll(); return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); }
const objUrl = (cache, id, blob) => { if (!cache.has(id)) cache.set(id, URL.createObjectURL(blob)); return cache.get(id); };
export async function customUrl(id, thumb = false) {
  const cache = thumb ? thumbCache : urlCache; if (cache.has(id)) return cache.get(id);
  const rec = await repo.get(id); if (!rec) return null;
  return objUrl(cache, id, thumb && rec.thumb ? rec.thumb : rec.blob);
}
export async function thumbUrlFor(rec) { return objUrl(thumbCache, rec.id, rec.thumb || rec.blob); }

function decode(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file); const img = new window.Image(); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That image could not be read.')); }; img.src = u; });
}
const toBlob = (canvas, type, q) => new Promise(r => canvas.toBlob(b => r(b), type, q));
async function scaleTo(img, max, type, q) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  try {
    const ctx = c.getContext('2d'); if (!ctx) throw new Error('Your browser could not process this image.');
    ctx.drawImage(img, 0, 0, w, h);
    let blob = await toBlob(c, type, q); if (!blob || blob.type !== type) { type = 'image/jpeg'; blob = await toBlob(c, type, q); }
    if (!blob || !blob.size) throw new Error('This image could not be converted. Try a different file.');
    return { blob, w, h, type };
  } finally { c.width = c.height = 0; }            // release the bitmap memory straight away
}
/** Validates, decodes and downsizes (max 2560px, WebP) an uploaded file. Returns blobs plus a preview URL; nothing is stored yet. */
export async function processUpload(file) {
  if (!file) throw new Error('No file selected.');
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1048576} MB.`);
  const img = await decode(file);
  try {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) throw new Error('That image could not be read.');
    if (w > MAX_IMAGE_SIDE || h > MAX_IMAGE_SIDE || w * h > MAX_IMAGE_PIXELS) throw new Error(`That image is ${w}×${h} pixels, which is too large to process safely. Resize it to under ${MAX_IMAGE_PIXELS / 1e6} megapixels and try again.`);
    const full = await scaleTo(img, 2560, 'image/webp', .86);
    const thumb = await scaleTo(img, 360, 'image/webp', .8);
    // The preview URL is created last, only once everything has succeeded, so a failed upload leaks nothing.
    return { blob: full.blob, thumb: thumb.blob, width: full.w, height: full.h, mimeType: full.type, size: full.blob.size, previewUrl: URL.createObjectURL(thumb.blob) };
  } finally { img.src = ''; }
}
export async function saveCustom({ name, blob, thumb, width, height, mimeType, size }) {
  const now = new Date().toISOString();
  const rec = { id: uid('bg'), name: (name || 'Custom background').trim().slice(0, 40), type: 'custom', mimeType, width, height, size, blob, thumb, createdAt: now, updatedAt: now, isActive: false };
  await repo.put(rec); return rec;
}
export async function renameCustom(id, name) { const r = await repo.get(id); if (!r) return; r.name = name.trim().slice(0, 40) || r.name; r.updatedAt = new Date().toISOString(); await repo.put(r); }
/** True when `id` is the custom background currently being previewed (unsaved). */
export const isPreviewing = id => previewCfg?.type === 'custom' && previewCfg.ref === id;
/** Revokes every cached object URL. Needed when stored blobs change under existing IDs (e.g. after a backup import). */
export function clearUrlCaches() { [urlCache, thumbCache].forEach(c => { c.forEach(u => URL.revokeObjectURL(u)); c.clear(); }); }
const releaseUrls = id => [urlCache, thumbCache].forEach(c => { if (c.has(id)) { URL.revokeObjectURL(c.get(id)); c.delete(id); } });
const isGone = (cfg, ids) => cfg?.type === 'custom' && !ids.has(cfg.ref);
/**
 * Repairs saved settings that point at custom backgrounds which no longer exist. A global background falls back to the
 * default (keeping its opacity/blur/overlay); page overrides are removed so the page falls back to the global background.
 * Overrides for pages are repaired even while per-page mode is off, so re-enabling it later never references a missing image.
 */
export async function repairReferences() {
  const ids = new Set((await repo.getAll()).map(r => r.id));
  const bg = structuredClone(settings.get('background')); let changed = false;
  if (isGone(bg.global, ids)) { Object.assign(bg.global, { type: 'builtin', ref: 'auto' }); changed = true; }
  for (const k of Object.keys(bg.pages || {})) if (isGone(bg.pages[k], ids)) { delete bg.pages[k]; changed = true; }
  if (changed) settings.set('background', bg);
  if (isGone(previewCfg, ids)) previewCfg = null;
  await syncActiveFlags();
  return changed;
}
/**
 * Deletes a custom background only (built-ins have no record and are refused). Order matters:
 * 1. drop any preview of it  2. remove the record  3. repair saved references  4. repaint the effective background
 * 5. only then revoke its object URLs, so the page never points at a revoked URL.
 * Returns { wasPreviewing } so the caller can discard its own draft state.
 */
export async function deleteCustom(id) {
  if (builtinById(id)) throw new Error('Built-in backgrounds cannot be deleted.');
  const wasPreviewing = isPreviewing(id);
  if (wasPreviewing) previewCfg = null;
  await repo.remove(id);
  try { await repairReferences(); await apply(); }
  finally { releaseUrls(id); }
  return { wasPreviewing };
}
export async function syncActiveFlags() {
  const bg = settings.get('background'); const used = new Set([bg.global, ...Object.values(bg.pages)].filter(c => c?.type === 'custom').map(c => c.ref));
  for (const r of await repo.getAll()) { const on = used.has(r.id); if (!!r.isActive !== on) { r.isActive = on; await repo.put(r); } }
}

/* ---------- applying to the DOM ---------- */
async function paint(cfg) {
  const my = ++paintSeq;
  // The only async step (reading a custom image from IndexedDB) happens BEFORE touching the DOM. If a newer paint was
  // requested meanwhile (fast navigation, a new preview), this result is stale and is dropped instead of overwriting it.
  const url = cfg.type === 'builtin' ? (builtinById(resolveRef(cfg)) || BUILTIN[0]).url : cfg.type === 'custom' ? await customUrl(cfg.ref) : null;
  if (my !== paintSeq) return;
  const layer = document.getElementById('bg-img'), ov = document.getElementById('bg-overlay'); if (!layer || !ov) return;
  const root = document.documentElement; const light = isLightTheme();
  let has = false, translucent = false; layer.style.background = ''; layer.style.backgroundImage = '';
  const fit = cfg.fit === 'contain' ? 'contain' : cfg.fit === 'stretch' ? '100% 100%' : 'cover';
  if (cfg.type === 'solid') { layer.style.background = (SOLIDS.find(s => s.id === cfg.ref) || SOLIDS[1]).color; has = true; }
  else if (cfg.type === 'gradient') { layer.style.background = (GRADIENTS.find(g => g.id === cfg.ref) || GRADIENTS[0]).css; has = true; translucent = true; }
  else if (cfg.type === 'builtin' || cfg.type === 'custom') {
    if (url) { layer.style.backgroundImage = `url("${url}")`; layer.style.backgroundSize = fit; layer.style.backgroundPosition = cfg.position || 'center'; layer.style.backgroundRepeat = 'no-repeat'; has = true; translucent = true; }
  }
  layer.dataset.type = has ? cfg.type : 'none'; layer.dataset.ref = has ? (cfg.type === 'builtin' ? resolveRef(cfg) : cfg.ref) : '';
  layer.style.opacity = has ? clamp(cfg.opacity ?? 100, 0, 100) / 100 : 0;
  layer.style.filter = cfg.blur ? `blur(${clamp(cfg.blur, 0, 40)}px)` : '';
  ov.style.background = light ? '#fff' : '#000';
  ov.style.opacity = has ? clamp(cfg.overlay ?? 0, 0, 90) / 100 : 0;
  root.dataset.bg = has && translucent ? 'on' : 'off';
  root.style.setProperty('--panel-alpha', has && translucent ? (light ? '84%' : '76%') : '100%');
  root.style.setProperty('--panel-blur', has && translucent ? '16px' : '0px');
}
/** Applies the background for a route (or the in-progress preview, if any). */
export async function apply(route = currentRoute) { currentRoute = route; return paint(previewCfg || cfgForRoute(route)); }
export const reapply = () => apply(currentRoute);
export const startPreview = cfg => { previewCfg = cfg; return paint(cfg); };
export const cancelPreview = () => { previewCfg = null; return apply(); };
export const endPreview = () => { previewCfg = null; };

/* ---------- backup helpers ---------- */
const blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
export async function exportCustom() {
  const out = []; for (const r of await repo.getAll()) { const { blob, thumb, ...meta } = r; out.push({ ...meta, dataUrl: await blobToDataUrl(blob), thumbUrl: thumb ? await blobToDataUrl(thumb) : null }); }
  return out;
}
export async function importCustomRecords(list) {
  const recs = []; for (const m of list || []) { if (!m?.id || !m.dataUrl) continue; const { dataUrl, thumbUrl, ...meta } = m; recs.push({ ...meta, blob: await (await fetch(dataUrl)).blob(), thumb: thumbUrl ? await (await fetch(thumbUrl)).blob() : null }); }
  return recs;
}
export { BUILTIN, SOLIDS, GRADIENTS };
