import { supabase } from '../supabase.js';

/*
 * LOCAL-FIRST CLOUD SYNC
 *
 * IndexedDB is always written first.
 * Supabase is mirrored in the background.
 *
 * Cloud failures never block local app usage.
 * Failed writes/deletes are kept in an in-memory queue and retried.
 *
 * Projects are special:
 * locally:
 *   project.milestones = [...]
 *
 * remotely:
 *   projects
 *   project_milestones
 */

const TABLE_CONFIG = {
  tasks: {
    table: 'tasks',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      text: r.text ?? '',
      category: r.category ?? 'academic',
      priority: r.priority ?? 'medium',
      date: normalizeDate(r.date),
      done: Boolean(r.done),
      project_id: r.projectId ?? null,

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),

      completed_at:
        normalizeTimestamp(r.completedAt),

      estimated_minutes:
        Number.isFinite(Number(r.estimatedMinutes))
          ? Math.round(Number(r.estimatedMinutes))
          : null,

      ga_focus: r.gaFocus ?? null,
      gate_kind: r.gateKind ?? null,
    }),
  },

  projects: {
    table: 'projects',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      name: r.name ?? '',
      status: r.status ?? 'active',
      target_date: normalizeDate(r.targetDate),
      description: r.description ?? '',
      notes: r.notes ?? '',

      changelog:
        Array.isArray(r.changelog)
          ? r.changelog
          : [],

      resources:
        Array.isArray(r.resources)
          ? r.resources
          : [],

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  gateTopics: {
    table: 'gate_topics',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      paper: r.paper ?? '',
      subject: r.subject ?? '',
      topic: r.topic ?? '',

      subtopics:
        Array.isArray(r.subtopics)
          ? r.subtopics
          : [],

      notes: r.notes ?? '',

      last_studied:
        normalizeDate(r.lastStudied),

      next_revision:
        normalizeDate(r.nextRevision),

      weak: Boolean(r.weak),

      resources:
        Array.isArray(r.resources)
          ? r.resources
          : [],
    }),
  },

  mistakes: {
    table: 'gate_mistakes',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      paper: r.paper ?? 'ME',
      subject: r.subject ?? null,
      topic: r.topic ?? '',
      mtype: r.mtype ?? null,
      what: r.what ?? '',
      correct: r.correct ?? '',
      date: normalizeDate(r.date),
      resolved: Boolean(r.resolved),

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  pyqRecords: {
    table: 'gate_pyq_records',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      paper: r.paper ?? '',
      subject: r.subject ?? '',
      topic: r.topic ?? '',
      year: String(r.year ?? ''),

      attempted:
        Number(r.attempted ?? 0),

      correct:
        Number(r.correct ?? 0),

      date:
        normalizeDate(r.date),

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  studySessions: {
    table: 'study_sessions',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,

      date:
        normalizeDate(r.date),

      category:
        r.category ?? null,

      what:
        r.what ?? '',

      duration_min:
        Number(r.durationMin ?? 0),

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  internships: {
    table: 'internships',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      company: r.company ?? '',
      role: r.role ?? '',
      status: r.status ?? 'saved',
      type: r.type ?? '',
      location: r.location ?? '',

      start_date:
        normalizeDate(r.startDate),

      deadline:
        normalizeDate(r.deadline),

      interview_date:
        normalizeDate(r.interviewDate),

      next_action:
        r.nextAction ?? '',

      notes:
        r.notes ?? '',

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  universities: {
    table: 'universities',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      name: r.name ?? '',
      country: r.country ?? '',
      program: r.program ?? '',

      deadline:
        normalizeDate(r.deadline),

      checklist:
        r.checklist ?? {},

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  skills: {
    table: 'skills',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      name: r.name ?? '',
      category: r.category ?? null,

      level:
        Number(r.level ?? 1),

      evidence:
        r.evidence ?? '',

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  resumeEntries: {
    table: 'resume_entries',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      section: r.section ?? null,
      title: r.title ?? '',
      organization: r.organization ?? '',
      date: r.date ?? null,
      description: r.description ?? '',

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  events: {
    table: 'events',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,
      title: r.title ?? '',
      etype: r.etype ?? 'Meeting',

      date:
        normalizeDate(r.date),

      time:
        r.time || null,

      location:
        r.location ?? '',

      notes:
        r.notes ?? '',

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  resources: {
    table: 'knowledge_resources',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,

      title:
        r.title ?? null,

      rtype:
        r.rtype ?? null,

      url:
        r.url ?? '',

      status:
        r.status ?? 'saved',

      tags:
        Array.isArray(r.tags)
          ? r.tags
          : [],

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  documents: {
    table: 'knowledge_documents',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,

      name:
        r.name ?? null,

      category:
        r.category ?? 'Other',

      url:
        r.url ?? '',

      tags:
        Array.isArray(r.tags)
          ? r.tags
          : [],

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  notes: {
    table: 'knowledge_notes',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,

      title:
        r.title ?? '',

      content:
        r.content ?? '',

      kind:
        r.kind ?? 'note',

      url:
        r.url ?? '',

      tags:
        Array.isArray(r.tags)
          ? r.tags
          : [],

      updated_at:
        normalizeTimestamp(r.updatedAt) ??
        new Date().toISOString(),

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  achievements: {
    table: 'achievements',
    key: 'id',

    toRemote: (r, userId) => ({
      user_id: userId,
      id: r.id,

      title:
        r.title ?? '',

      atype:
        r.atype ?? null,

      date:
        r.date ?? null,

      organization:
        r.organization ?? '',

      description:
        r.description ?? '',

      created_at:
        normalizeTimestamp(r.createdAt) ??
        new Date().toISOString(),
    }),
  },

  meta: {
    table: 'app_meta',
    key: 'key',

    toRemote: (r, userId) => ({
      user_id: userId,
      key: r.key,

      value:
        r.value ?? null,
    }),
  },
};

const MILESTONE_TABLE = 'project_milestones';

let sessionUserId = null;
let initialized = false;

const pending = new Map();

function normalizeDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function normalizeTimestamp(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function configFor(store) {
  return TABLE_CONFIG[store] ?? null;
}

function pendingKey(store, key) {
  return `${store}:${String(key)}`;
}

async function refreshSessionUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (
    error ||
    !data?.user
  ) {
    sessionUserId = null;
    return null;
  }

  sessionUserId =
    data.user.id;

  return data.user;
}

export async function initCloudSync() {
  if (!initialized) {
    initialized = true;

    await refreshSessionUser();

    supabase.auth.onAuthStateChange(
      (_event, session) => {
        sessionUserId =
          session?.user?.id ?? null;

        if (!sessionUserId) {
          pending.clear();
        }
      }
    );
  } else if (!sessionUserId) {
    await refreshSessionUser();
  }
}

export function isCloudSyncAvailable() {
  return Boolean(sessionUserId);
}

/* ------------------------------------------------------------
 * PROJECTS
 * ------------------------------------------------------------ */

async function writeProject(record) {
  if (!sessionUserId) {
    return;
  }

  const projectRow =
    TABLE_CONFIG.projects.toRemote(
      record,
      sessionUserId
    );

  const { error: projectError } =
    await supabase
      .from('projects')
      .upsert(
        projectRow,
        {
          onConflict: 'user_id,id',
        }
      );

  if (projectError) {
    throw projectError;
  }

  const milestones =
    Array.isArray(record.milestones)
      ? record.milestones
      : [];

  /*
   * Reconcile the normalized milestone table.
   * The local project object is the complete source of truth
   * for its embedded milestone array.
   */

  const { error: deleteError } =
    await supabase
      .from(MILESTONE_TABLE)
      .delete()
      .eq(
        'user_id',
        sessionUserId
      )
      .eq(
        'project_id',
        record.id
      );

  if (deleteError) {
    throw deleteError;
  }

  if (!milestones.length) {
    return;
  }

  const rows =
    milestones.map(
      (milestone, index) => ({
        user_id:
          sessionUserId,

        id:
          milestone.id,

        project_id:
          record.id,

        title:
          milestone.title ?? '',

        date:
          normalizeDate(
            milestone.date
          ),

        done:
          Boolean(
            milestone.done
          ),

        position:
          Number.isFinite(
            Number(
              milestone.position
            )
          )
            ? Number(
                milestone.position
              )
            : index,
      })
    );

  const {
    error: milestoneError,
  } = await supabase
    .from(MILESTONE_TABLE)
    .upsert(
      rows,
      {
        onConflict:
          'user_id,id',
      }
    );

  if (milestoneError) {
    throw milestoneError;
  }
}

/* ------------------------------------------------------------
 * NORMAL ROW WRITE
 * ------------------------------------------------------------ */

async function writeRemote(
  store,
  record
) {
  const config =
    configFor(store);

  if (
    !config ||
    !sessionUserId
  ) {
    return;
  }

  if (
    store === 'projects'
  ) {
    await writeProject(
      record
    );

    return;
  }

  const row =
    config.toRemote(
      record,
      sessionUserId
    );

  const {
    error,
  } = await supabase
    .from(config.table)
    .upsert(
      row,
      {
        onConflict:
          store === 'meta'
            ? 'user_id,key'
            : 'user_id,id',
      }
    );

  if (error) {
    throw error;
  }
}

/* ------------------------------------------------------------
 * DELETE
 * ------------------------------------------------------------ */

async function deleteRemote(
  store,
  key
) {
  const config =
    configFor(store);

  if (
    !config ||
    !sessionUserId
  ) {
    return;
  }

  const {
    error,
  } = await supabase
    .from(config.table)
    .delete()
    .eq(
      'user_id',
      sessionUserId
    )
    .eq(
      config.key,
      key
    );

  if (error) {
    throw error;
  }
}

/* ------------------------------------------------------------
 * QUEUE PUT
 * ------------------------------------------------------------ */

async function queuePut(
  store,
  record
) {
  const config =
    configFor(store);

  if (!config) {
    return;
  }

  const key =
    pendingKey(
      store,
      record[config.key]
    );

  if (!sessionUserId) {
    pending.set(
      key,
      {
        type: 'put',
        store,
        record:
          structuredClone(
            record
          ),
      }
    );

    return;
  }

  try {
    await writeRemote(
      store,
      structuredClone(record)
    );

    pending.delete(key);
  } catch (error) {
    console.warn(
      `[CloudSync] ${store} mirror failed:`,
      error?.message ?? error
    );

    pending.set(
      key,
      {
        type: 'put',
        store,
        record:
          structuredClone(
            record
          ),
      }
    );
  }
}

/* ------------------------------------------------------------
 * QUEUE DELETE
 * ------------------------------------------------------------ */

async function queueDelete(
  store,
  keyValue
) {
  const config =
    configFor(store);

  if (!config) {
    return;
  }

  const key =
    pendingKey(
      store,
      keyValue
    );

  if (!sessionUserId) {
    pending.set(
      key,
      {
        type: 'delete',
        store,
        key: keyValue,
      }
    );

    return;
  }

  try {
    await deleteRemote(
      store,
      keyValue
    );

    pending.delete(key);
  } catch (error) {
    console.warn(
      `[CloudSync] ${store} delete failed:`,
      error?.message ?? error
    );

    pending.set(
      key,
      {
        type: 'delete',
        store,
        key: keyValue,
      }
    );
  }
}

/* ------------------------------------------------------------
 * PUBLIC MIRROR API
 * ------------------------------------------------------------ */

export async function mirrorPut(
  store,
  record
) {
  await initCloudSync();

  if (!configFor(store)) {
    return;
  }

  /*
   * Never block IndexedDB.
   */
  void queuePut(
    store,
    record
  );
}

export async function mirrorDelete(
  store,
  key
) {
  await initCloudSync();

  if (!configFor(store)) {
    return;
  }

  /*
   * Never block IndexedDB.
   */
  void queueDelete(
    store,
    key
  );
}

/* ------------------------------------------------------------
 * RETRY QUEUE
 * ------------------------------------------------------------ */

export async function flushPending() {
  await initCloudSync();

  if (
    !sessionUserId ||
    !pending.size
  ) {
    return;
  }

  const items =
    [...pending.entries()];

  for (
    const [
      queueKey,
      item,
    ] of items
  ) {
    try {
      if (
        item.type ===
        'delete'
      ) {
        await deleteRemote(
          item.store,
          item.key
        );
      } else {
        await writeRemote(
          item.store,
          structuredClone(
            item.record
          )
        );
      }

      pending.delete(
        queueKey
      );
    } catch (error) {
      console.warn(
        `[CloudSync] retry failed for ${item.store}:`,
        error?.message ?? error
      );
    }
  }
}

/* ------------------------------------------------------------
 * STATUS
 * ------------------------------------------------------------ */

export async function getCloudStatus() {
  await initCloudSync();

  return {
    connected:
      Boolean(
        sessionUserId
      ),

    userId:
      sessionUserId,

    pending:
      pending.size,
  };
}