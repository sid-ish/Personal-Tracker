import { getDatabase } from './db.js';

const run = async (store, mode, fn) => {
  const db = await getDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const rq = fn(tx.objectStore(store));
    if (mode === 'readonly') { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }
    else { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }
  });
};

export const all = store => run(store, 'readonly', s => s.getAll());
export const get = (store, key) => run(store, 'readonly', s => s.get(key));
export const put = (store, val) => run(store, 'readwrite', s => s.put(val));
export const del = (store, key) => run(store, 'readwrite', s => s.delete(key));
/** Writes many records to one store in a single transaction (all-or-nothing). */
export async function bulkPut(store, records) {
  if (!records.length) return;
  const db = await getDatabase();
  return new Promise((res, rej) => { const tx = db.transaction(store, 'readwrite'); const os = tx.objectStore(store); records.forEach(r => os.put(r)); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}
/**
 * Runs `writeFn(stores)` inside ONE readwrite transaction spanning every store in `names`.
 * It resolves only after the transaction commits. Any failure (a request error, or a synchronous throw such as an
 * invalid key) aborts the transaction, so IndexedDB rolls back every write made so far and nothing is changed.
 */
async function writeAcross(names, writeFn) {
  const db = await getDatabase();
  return new Promise((res, rej) => {
    let tx, failure = null;
    try { tx = db.transaction(names, 'readwrite'); } catch (e) { rej(e); return; }
    tx.oncomplete = () => res();
    tx.onabort = () => rej(failure || tx.error || new Error('The database transaction was aborted.'));
    try { writeFn(Object.fromEntries(names.map(n => [n, tx.objectStore(n)]))); }
    catch (e) { failure = e; try { tx.abort(); } catch { /* already finished */ } }
  });
}
/** Upserts records into several stores atomically: either every record in every store is written, or none are. */
export function mergeAll(map) {
  const names = Object.keys(map).filter(n => map[n]?.length);
  if (!names.length) return Promise.resolve();
  return writeAcross(names, os => names.forEach(n => map[n].forEach(r => os[n].put(r))));
}
/** Clears every named store and writes the given records, atomically across ALL stores: a failure rolls everything back. */
export function replaceAll(map) {
  const names = Object.keys(map);
  return writeAcross(names, os => names.forEach(n => { os[n].clear(); map[n].forEach(r => os[n].put(r)); }));
}
export const count = store => run(store, 'readonly', s => s.count());
export const clear = store => run(store, 'readwrite', s => s.clear());

/** Repository for one store. Services build on this; a cloud adapter would implement the same 5 methods. */
export const createRepository = store => ({
  getAll: () => all(store),
  get: key => get(store, key),
  put: val => put(store, val),
  remove: key => del(store, key),
  count: () => count(store),
  clear: () => clear(store),
});
