import { DB_NAME, DB_VERSION } from './schema.js';
import { upgrade } from './migrations.js';

let dbPromise = null;

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => upgrade(e.target.result);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => console.warn('[db] open blocked: close other tabs running Sidharth OS');
    });
  }
  return dbPromise;
}

export const initialize = () => getDatabase();
