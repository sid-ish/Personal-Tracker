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
/** Clears every named store and writes the given records, atomically across ALL stores: a failure rolls everything back. */
export async function replaceAll(map) {
  const db = await getDatabase(); const names = Object.keys(map);
  return new Promise((res, rej) => { const tx = db.transaction(names, 'readwrite'); names.forEach(n => { const os = tx.objectStore(n); os.clear(); map[n].forEach(r => os.put(r)); }); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
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
