import { getDatabase } from './db.js';
import {
  mirrorPut,
  mirrorDelete,
} from '../services/cloud/cloud-sync.js';

const run = async (store, mode, fn) => {
  const db = await getDatabase();

  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const rq = fn(tx.objectStore(store));

    if (mode === 'readonly') {
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    } else {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(
        tx.error ||
        new Error('The database transaction was aborted.')
      );
    }
  });
};

// ------------------------------------------------------------
// BASIC READ OPERATIONS
// ------------------------------------------------------------

export const all = store =>
  run(
    store,
    'readonly',
    s => s.getAll()
  );

export const get = (store, key) =>
  run(
    store,
    'readonly',
    s => s.get(key)
  );

// ------------------------------------------------------------
// NORMAL LOCAL WRITE
// ------------------------------------------------------------
//
// This is the normal application write path.
//
// IndexedDB is written FIRST.
// Then the change is mirrored to Supabase.
//
// A cloud failure must never prevent the local
// IndexedDB write from succeeding.
//

export const put = async (store, val) => {
  await run(
    store,
    'readwrite',
    s => s.put(val)
  );

  // IndexedDB remains authoritative.
  // Cloud mirroring never blocks the local write.
  void mirrorPut(
    store,
    val
  );

  return val;
};

export const del = async (store, key) => {
  await run(
    store,
    'readwrite',
    s => s.delete(key)
  );

  // Mirror the deletion after the local
  // IndexedDB deletion succeeds.
  void mirrorDelete(
    store,
    key
  );

  return key;
};

// ------------------------------------------------------------
// CLOUD → LOCAL WRITE OPERATIONS
// ------------------------------------------------------------
//
// IMPORTANT:
//
// These functions intentionally DO NOT call mirrorPut()
// or mirrorDelete().
//
// They are for:
//   Supabase → IndexedDB
//   Realtime → IndexedDB
//   Cloud bootstrap → IndexedDB
//
// Without these separate functions:
//
//   Supabase
//      ↓
//   IndexedDB put()
//      ↓
//   Supabase
//      ↓
//   Realtime
//      ↓
//   IndexedDB
//      ↓
//   💥 echo loop
//
// ------------------------------------------------------------

export const localPut = (
  store,
  val
) =>
  run(
    store,
    'readwrite',
    s => s.put(val)
  );

export const localDel = (
  store,
  key
) =>
  run(
    store,
    'readwrite',
    s => s.delete(key)
  );

// ------------------------------------------------------------
// BULK WRITE
// ------------------------------------------------------------

/**
 * Writes many records to one store in a single transaction.
 *
 * This function is intentionally local-only.
 * It is used for bulk database operations such as
 * imports/rebuilds where mirroring each individual record
 * would be undesirable.
 */
export async function bulkPut(
  store,
  records
) {
  if (!records.length) return;

  const db = await getDatabase();

  return new Promise((res, rej) => {
    const tx = db.transaction(
      store,
      'readwrite'
    );

    const os = tx.objectStore(store);

    records.forEach(record => {
      os.put(record);
    });

    tx.oncomplete = () => res();

    tx.onerror = () =>
      rej(
        tx.error ||
        new Error('Bulk write failed.')
      );

    tx.onabort = () =>
      rej(
        tx.error ||
        new Error('Bulk write transaction aborted.')
      );
  });
}

// ------------------------------------------------------------
// MULTI-STORE TRANSACTION
// ------------------------------------------------------------

/**
 * Runs writeFn(stores) inside ONE readwrite
 * transaction spanning every store in `names`.
 *
 * It resolves only after the transaction commits.
 *
 * Any failure aborts the transaction, so IndexedDB
 * rolls back every write made during the transaction.
 */
async function writeAcross(
  names,
  writeFn
) {
  const db = await getDatabase();

  return new Promise((res, rej) => {
    let tx;
    let failure = null;

    try {
      tx = db.transaction(
        names,
        'readwrite'
      );
    } catch (e) {
      rej(e);
      return;
    }

    tx.oncomplete = () => res();

    tx.onerror = () => {
      rej(
        failure ||
        tx.error ||
        new Error(
          'The database transaction failed.'
        )
      );
    };

    tx.onabort = () => {
      rej(
        failure ||
        tx.error ||
        new Error(
          'The database transaction was aborted.'
        )
      );
    };

    try {
      writeFn(
        Object.fromEntries(
          names.map(name => [
            name,
            tx.objectStore(name),
          ])
        )
      );
    } catch (e) {
      failure = e;

      try {
        tx.abort();
      } catch {
        // Transaction may already have finished.
      }
    }
  });
}

// ------------------------------------------------------------
// MERGE ALL
// ------------------------------------------------------------

/**
 * Upserts records into several stores atomically.
 *
 * Local-only operation.
 */
export function mergeAll(
  map
) {
  const names = Object.keys(map)
    .filter(
      name =>
        Array.isArray(map[name]) &&
        map[name].length > 0
    );

  if (!names.length) {
    return Promise.resolve();
  }

  return writeAcross(
    names,
    stores => {
      names.forEach(name => {
        map[name].forEach(record => {
          stores[name].put(record);
        });
      });
    }
  );
}

// ------------------------------------------------------------
// REPLACE ALL
// ------------------------------------------------------------

/**
 * Clears every named store and writes the supplied
 * records atomically across ALL stores.
 *
 * Local-only operation.
 *
 * WARNING:
 * This is intentionally destructive to the selected
 * IndexedDB stores. Callers must explicitly choose it.
 */
export function replaceAll(
  map
) {
  const names = Object.keys(map);

  return writeAcross(
    names,
    stores => {
      names.forEach(name => {
        stores[name].clear();

        const records = Array.isArray(map[name])
          ? map[name]
          : [];

        records.forEach(record => {
          stores[name].put(record);
        });
      });
    }
  );
}

// ------------------------------------------------------------
// STORE UTILITIES
// ------------------------------------------------------------

export const count = store =>
  run(
    store,
    'readonly',
    s => s.count()
  );

export const clear = store =>
  run(
    store,
    'readwrite',
    s => s.clear()
  );

// ------------------------------------------------------------
// REPOSITORY
// ------------------------------------------------------------

/**
 * Repository for one IndexedDB store.
 *
 * Normal application writes go through put()/del(),
 * which mirror changes to Supabase.
 *
 * Cloud/realtime code should use localPut()/localDel()
 * when applying remote changes locally.
 */
export const createRepository = store => ({
  getAll: () => all(store),

  get: key =>
    get(
      store,
      key
    ),

  put: val =>
    put(
      store,
      val
    ),

  remove: key =>
    del(
      store,
      key
    ),

  count: () =>
    count(store),

  clear: () =>
    clear(store),
});