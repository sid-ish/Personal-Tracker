import { supabase } from '../supabase.js';

const TABLE_MAP = {
  tasks: 'tasks',
  gateTopics: 'gate_topics',
  meta: 'app_meta',
};

const pending = new Map();

let sessionUserId = null;
let initialized = false;

function tableFor(store) {
  return TABLE_MAP[store] || null;
}

function isoNow() {
  return new Date().toISOString();
}

function normalizeDate(value) {
  if (!value || typeof value !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeTimestamp(value) {
  if (!value || typeof value !== 'string') return null;

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? null
    : d.toISOString();
}

function mapTask(record, userId) {
  return {
    user_id: userId,
    id: record.id,
    text: record.text ?? '',
    category: record.category ?? 'academic',
    priority: record.priority ?? 'medium',
    date: normalizeDate(record.date),
    done: Boolean(record.done),
    project_id: record.projectId ?? null,
    created_at:
      normalizeTimestamp(record.createdAt) ??
      isoNow(),
    estimated_minutes:
      Number.isFinite(record.estimatedMinutes)
        ? Math.round(record.estimatedMinutes)
        : null,
    ga_focus: record.gaFocus ?? null,
    gate_kind: record.gateKind ?? null,
    completed_at:
      normalizeTimestamp(record.completedAt),
  };
}

function mapGateTopic(record, userId) {
  return {
    user_id: userId,
    id: record.id,
    paper: record.paper ?? '',
    subject: record.subject ?? '',
    topic: record.topic ?? '',
    subtopics: Array.isArray(record.subtopics)
      ? record.subtopics
      : [],
    notes: record.notes ?? '',
    last_studied:
      normalizeDate(record.lastStudied),
    next_revision:
      normalizeDate(record.nextRevision),
    weak: Boolean(record.weak),
    resources: Array.isArray(record.resources)
      ? record.resources
      : [],
  };
}

function mapMeta(record, userId) {
  return {
    user_id: userId,
    key: record.key,
    value: record.value ?? null,
  };
}

function mapRecord(store, record) {
  if (!sessionUserId) return null;

  switch (store) {
    case 'tasks':
      return mapTask(record, sessionUserId);

    case 'gateTopics':
      return mapGateTopic(record, sessionUserId);

    case 'meta':
      return mapMeta(record, sessionUserId);

    default:
      return null;
  }
}

async function refreshSessionUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    sessionUserId = null;
    return null;
  }

  sessionUserId = data.user.id;

  return data.user;
}

export async function initCloudSync() {
  if (initialized) return;

  initialized = true;

  await refreshSessionUser();

  supabase.auth.onAuthStateChange((event, session) => {
    sessionUserId = session?.user?.id ?? null;

    if (!sessionUserId) {
      pending.clear();
    }
  });
}

export function isCloudSyncAvailable() {
  return Boolean(sessionUserId);
}

async function writeRemote(store, record) {
  const table = tableFor(store);

  if (!table || !sessionUserId) {
    return;
  }

  const mapped = mapRecord(store, record);

  if (!mapped) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(mapped, {
      onConflict:
        store === 'meta'
          ? 'user_id,key'
          : 'user_id,id',
    });

  if (error) {
    throw error;
  }
}

async function flush(store, record) {
  const key =
    `${store}:${store === 'meta' ? record.key : record.id}`;

  if (!sessionUserId) {
    pending.set(key, { store, record });
    return;
  }

  try {
    await writeRemote(store, record);
    pending.delete(key);
  } catch (error) {
    console.warn(
      `[CloudSync] ${store} mirror failed:`,
      error.message
    );

    pending.set(key, { store, record });
  }
}

export async function mirrorPut(store, record) {
  await initCloudSync();

  if (!tableFor(store)) {
    return;
  }

  // Never block IndexedDB because of a remote failure.
  void flush(store, structuredClone(record));
}

export async function mirrorDelete(store, id) {
  const table = tableFor(store);

  if (!table || !sessionUserId) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', sessionUserId)
    .eq(
      store === 'meta' ? 'key' : 'id',
      id
    );

  if (error) {
    console.warn(
      `[CloudSync] ${store} delete failed:`,
      error.message
    );
  }
}

export async function flushPending() {
  if (!sessionUserId || !pending.size) {
    return;
  }

  const items = [...pending.values()];

  for (const item of items) {
    await flush(item.store, item.record);
  }
}

export async function getCloudStatus() {
  await initCloudSync();

  return {
    connected: Boolean(sessionUserId),
    userId: sessionUserId,
    pending: pending.size,
  };
}