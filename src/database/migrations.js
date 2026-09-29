import { STORES } from './schema.js';

/** Runs inside onupgradeneeded. Idempotent: only creates stores that don't exist yet, never touches data. */
export function upgrade(db) {
  for (const s of STORES) {
    if (!db.objectStoreNames.contains(s.name)) db.createObjectStore(s.name, { keyPath: s.keyPath });
  }
}

/**
 * Data migrations (gateSchemaV2, gateSeeded_<paper>, scheduleImported) are lazy and flag-based, exactly as in the
 * original app; they live in services/gate-service.js and run when the GATE page is first opened.
 */
export async function run() {}
