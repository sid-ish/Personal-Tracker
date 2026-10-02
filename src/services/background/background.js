import { settings } from '../settings/settings.js';
import { createRepository } from '../../database/queries.js';
import { isLightTheme } from '../theme/theme.js';
import { BUILTIN, SOLIDS, GRADIENTS, builtinById } from './catalog.js';
import { uid, clamp } from '../../utils/dom.js';

const repo = createRepository('backgrounds');
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const urlCache = new Map();          // custom id -> object URL (full image)
const thumbCache = new Map();        // custom id -> object URL (thumbnail)
let currentRoute = 'dashboard';
let previewCfg = null;

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
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
  let blob = await toBlob(c, type, q); if (!blob || blob.type !== type) { type = 'image/jpeg'; blob = await toBlob(c, type, q); }
  return { blob, w, h, type };
}
/** Validates, decodes and downsizes (max 2560px, WebP) an uploaded file. Returns blobs plus a preview URL; nothing is stored yet. */
export async function processUpload(file) {
  if (!file) throw new Error('No file selected.');
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1048576} MB.`);
  const img = await decode(file);
  const full = await scaleTo(img, 2560, 'image/webp', .86);
  const thumb = await scaleTo(img, 360, 'image/webp', .8);
  return { blob: full.blob, thumb: thumb.blob, width: full.w, height: full.h, mimeType: full.type, size: full.blob.size, previewUrl: URL.createObjectURL(thumb.blob) };
}
export async function saveCustom({ name, blob, thumb, width, height, mimeType, size }) {
  const now = new Date().toISOString();
  const rec = { id: uid('bg'), name: (name || 'Custom background').trim().slice(0, 40), type: 'custom', mimeType, width, height, size, blob, thumb, createdAt: now, updatedAt: now, isActive: false };
  await repo.put(rec); return rec;
}
export async function renameCustom(id, name) { const r = await repo.get(id); if (!r) return; r.name = name.trim().slice(0, 40) || r.name; r.updatedAt = new Date().toISOString(); await repo.put(r); }
/** Deletes a custom background only. Built-ins have no record and are refused. Any setting still pointing at it falls back to the default. */
export async function deleteCustom(id) {
  if (builtinById(id)) throw new Error('Built-in backgrounds cannot be deleted.');
  await repo.remove(id);
  [urlCache, thumbCache].forEach(c => { if (c.has(id)) { URL.revokeObjectURL(c.get(id)); c.delete(id); } });
  const bg = structuredClone(settings.get('background'));
  const fallback = { type: 'builtin', ref: 'auto' };
  if (bg.global.type === 'custom' && bg.global.ref === id) Object.assign(bg.global, fallback);
  for (const k of Object.keys(bg.pages)) if (bg.pages[k]?.type === 'custom' && bg.pages[k].ref === id) delete bg.pages[k];
  settings.set('background', bg);
  await syncActiveFlags(); await apply();
}
export async function syncActiveFlags() {
  const bg = settings.get('background'); const used = new Set([bg.global, ...Object.values(bg.pages)].filter(c => c?.type === 'custom').map(c => c.ref));
  for (const r of await repo.getAll()) { const on = used.has(r.id); if (!!r.isActive !== on) { r.isActive = on; await repo.put(r); } }
}

/* ---------- applying to the DOM ---------- */
async function paint(cfg) {
  const layer = document.getElementById('bg-img'), ov = document.getElementById('bg-overlay'); if (!layer || !ov) return;
  const root = document.documentElement; const light = isLightTheme();
  let has = false, translucent = false; layer.style.background = ''; layer.style.backgroundImage = '';
  const fit = cfg.fit === 'contain' ? 'contain' : cfg.fit === 'stretch' ? '100% 100%' : 'cover';
  if (cfg.type === 'solid') { layer.style.background = (SOLIDS.find(s => s.id === cfg.ref) || SOLIDS[1]).color; has = true; }
  else if (cfg.type === 'gradient') { layer.style.background = (GRADIENTS.find(g => g.id === cfg.ref) || GRADIENTS[0]).css; has = true; translucent = true; }
  else if (cfg.type === 'builtin' || cfg.type === 'custom') {
    const url = cfg.type === 'builtin' ? (builtinById(resolveRef(cfg)) || BUILTIN[0]).url : await customUrl(cfg.ref);
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
