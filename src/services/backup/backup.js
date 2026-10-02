import { all, bulkPut, replaceAll, count, clear } from '../../database/queries.js';
import { ALL_STORES, STORES, DB_VERSION } from '../../database/schema.js';
import { exportCustom, importCustomRecords } from '../background/background.js';
import { settings } from '../settings/settings.js';
import { todayStr } from '../../utils/dates.js';

export const FORMAT = 'sidharth-os-backup';
export const FORMAT_VERSION = 2;
const keyOf = Object.fromEntries(STORES.map(s => [s.name, s.keyPath]));
const BLOB_STORES = ['backgrounds'];                       // serialised separately as data URLs
const JSON_STORES = ALL_STORES.filter(s => !BLOB_STORES.includes(s));

export async function buildSnapshot({ includeBackgrounds = true } = {}) {
  await settings.flush();
  const stores = {}; for (const s of JSON_STORES) stores[s] = await all(s);
  const snap = { format: FORMAT, version: FORMAT_VERSION, dbVersion: DB_VERSION, exportedAt: new Date().toISOString(), stores };
  if (includeBackgrounds) snap.backgrounds = await exportCustom();
  return snap;
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
/** Downloads a JSON backup and records "last backup" in settings. */
export async function exportBackup({ label = '' } = {}) {
  const snap = await buildSnapshot(); const text = JSON.stringify(snap);
  const records = Object.values(snap.stores).reduce((n, a) => n + a.length, 0) + (snap.backgrounds?.length || 0);
  download(`sidharth-os-${label ? label + '-' : ''}backup-${todayStr()}.json`, text);
  if (!label) settings.set('lastBackup', { at: snap.exportedAt, records, bytes: text.length });
  return { records, bytes: text.length };
}
/** Last-resort export of raw store contents if the app can't boot (used by the recovery page). */
export async function exportRecovery() {
  const data = { format: FORMAT, recovery: true, exportedAt: new Date().toISOString(), stores: {}, localStorage: {} };
  try { for (const s of JSON_STORES) data.stores[s] = await all(s); } catch (e) { data.error = String(e); }
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('sos_')) data.localStorage[k] = localStorage.getItem(k); } } catch { /* ignore */ }
  download(`sidharth-os-recovery-${todayStr()}.json`, JSON.stringify(data));
}

/** Parses and validates a backup file without touching the database. Handles the original (bare store map) and v2 formats. */
export async function readBackupFile(file) {
  const res = { ok: false, errors: [], warnings: [], counts: {}, total: 0, skipped: 0, data: null, legacy: false, backgrounds: 0 };
  if (!file) { res.errors.push('No file selected.'); return res; }
  if (file.size > 200 * 1048576) { res.errors.push('That file is too large to be a backup.'); return res; }
  let json; try { json = JSON.parse(await file.text()); } catch { res.errors.push('That file is not valid JSON, so it can’t be a backup.'); return res; }
  if (!json || typeof json !== 'object' || Array.isArray(json)) { res.errors.push('This file doesn’t look like a Sidharth OS backup.'); return res; }
  if (json.format && json.format !== FORMAT) { res.errors.push('This file was not exported by Sidharth OS.'); return res; }
  if (json.version > FORMAT_VERSION) res.warnings.push('This backup was made by a newer version. Unknown data will be ignored.');
  const src = json.stores || (res.legacy = true, json);
  const clean = {};
  for (const s of JSON_STORES) {
    if (!(s in src)) continue;
    if (!Array.isArray(src[s])) { res.warnings.push(`“${s}” is not a list and was skipped.`); continue; }
    const good = src[s].filter(r => r && typeof r === 'object' && r[keyOf[s]] !== undefined && r[keyOf[s]] !== null && r[keyOf[s]] !== '');
    res.skipped += src[s].length - good.length; if (src[s].length !== good.length) res.warnings.push(`${src[s].length - good.length} invalid record(s) in “${s}” will be skipped.`);
    clean[s] = good; res.counts[s] = good.length; res.total += good.length;
  }
  const unknown = Object.keys(src).filter(k => !ALL_STORES.includes(k) && !['format', 'version'].includes(k)); if (unknown.length && !res.legacy) res.warnings.push('Ignored unknown sections: ' + unknown.join(', '));
  res.backgrounds = Array.isArray(json.backgrounds) ? json.backgrounds.filter(b => b?.id && typeof b.dataUrl === 'string' && b.dataUrl.startsWith('data:image/')).length : 0;
  if (!res.total && !res.backgrounds) { res.errors.push('This backup contains no records.'); return res; }
  res.ok = true; res.data = { stores: clean, backgrounds: json.backgrounds || [] }; res.exportedAt = json.exportedAt || null; return res;
}
/** merge: upserts by ID, nothing is deleted. replace: swaps all data in one atomic transaction (a failure leaves the current data intact). */
export async function importBackup(parsed, mode = 'merge') {
  const bgs = await importCustomRecords(parsed.data.backgrounds);
  if (mode === 'replace') {
    const map = Object.fromEntries(ALL_STORES.map(s => [s, []]));
    for (const s of JSON_STORES) map[s] = parsed.data.stores[s] || [];
    map.backgrounds = bgs; await replaceAll(map);
  } else {
    for (const s of JSON_STORES) if (parsed.data.stores[s]?.length) await bulkPut(s, parsed.data.stores[s]);
    if (bgs.length) await bulkPut('backgrounds', bgs);
  }
  await settings.load();
}
export async function storageInfo() {
  const counts = {}; let total = 0; for (const s of ALL_STORES) { counts[s] = await count(s); total += counts[s]; }
  let usage = null, quota = null; try { const e = await navigator.storage?.estimate?.(); usage = e?.usage ?? null; quota = e?.quota ?? null; } catch { /* unsupported */ }
  return { counts, total, usage, quota, lastBackup: settings.get('lastBackup') };
}
export async function resetAll() {
  for (const s of ALL_STORES) await clear(s);
  try { Object.keys(localStorage).filter(k => k.startsWith('sos_')).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
  settings.replace(null);
}
