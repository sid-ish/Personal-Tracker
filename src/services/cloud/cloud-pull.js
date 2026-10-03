import { supabase } from '../supabase.js';
import { all, localPut, clear, count } from '../../database/queries.js';

/*
 * Cloud -> IndexedDB pull.
 *
 * IMPORTANT:
 * Use localPut(), NOT put(), when applying cloud data locally.
 * That prevents cloud-pulled records from being mirrored straight back
 * to Supabase and creating a sync echo loop.
 */
export const PULL_CONFIG = {
  tasks: {
    table: 'tasks',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      text: r.text ?? '',
      category: r.category ?? 'academic',
      priority: r.priority ?? 'medium',
      date: r.date ?? null,
      done: Boolean(r.done),
      projectId: r.project_id ?? null,
      createdAt: r.created_at ?? null,
      completedAt: r.completed_at ?? null,
      estimatedMinutes:
        Number.isFinite(Number(r.estimated_minutes))
          ? Number(r.estimated_minutes)
          : null,
      gaFocus: r.ga_focus ?? null,
      gateKind: r.gate_kind ?? null,
    }),
  },

  projects: {
    table: 'projects',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      name: r.name ?? '',
      status: r.status ?? 'active',
      targetDate: r.target_date ?? null,
      description: r.description ?? '',
      notes: r.notes ?? '',
      changelog: Array.isArray(r.changelog) ? r.changelog : [],
      resources: Array.isArray(r.resources) ? r.resources : [],
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
      milestones: [],
    }),
  },

  gateTopics: {
    table: 'gate_topics',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      paper: r.paper ?? '',
      subject: r.subject ?? '',
      topic: r.topic ?? '',
      subtopics: Array.isArray(r.subtopics) ? r.subtopics : [],
      notes: r.notes ?? '',
      lastStudied: r.last_studied ?? null,
      nextRevision: r.next_revision ?? null,
      weak: Boolean(r.weak),
      resources: Array.isArray(r.resources) ? r.resources : [],
      updatedAt: r.updated_at ?? null,
    }),
  },

  mistakes: {
    table: 'gate_mistakes',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      paper: r.paper ?? 'ME',
      subject: r.subject ?? null,
      topic: r.topic ?? '',
      mtype: r.mtype ?? null,
      what: r.what ?? '',
      correct: r.correct ?? '',
      date: r.date ?? null,
      resolved: Boolean(r.resolved),
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  pyqRecords: {
    table: 'gate_pyq_records',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      paper: r.paper ?? '',
      subject: r.subject ?? '',
      topic: r.topic ?? '',
      year: String(r.year ?? ''),
      attempted: Number(r.attempted ?? 0),
      correct: Number(r.correct ?? 0),
      date: r.date ?? null,
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  studySessions: {
    table: 'study_sessions',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      date: r.date ?? null,
      category: r.category ?? null,
      what: r.what ?? '',
      durationMin: Number(r.duration_min ?? 0),
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  internships: {
    table: 'internships',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      company: r.company ?? '',
      role: r.role ?? '',
      status: r.status ?? 'saved',
      type: r.type ?? '',
      location: r.location ?? '',
      startDate: r.start_date ?? null,
      deadline: r.deadline ?? null,
      interviewDate: r.interview_date ?? null,
      nextAction: r.next_action ?? '',
      notes: r.notes ?? '',
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  universities: {
    table: 'universities',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      name: r.name ?? '',
      country: r.country ?? '',
      program: r.program ?? '',
      deadline: r.deadline ?? null,
      checklist: r.checklist ?? {},
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  skills: {
    table: 'skills',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      name: r.name ?? '',
      category: r.category ?? null,
      level: Number(r.level ?? 1),
      evidence: r.evidence ?? '',
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  resumeEntries: {
    table: 'resume_entries',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      section: r.section ?? null,
      title: r.title ?? '',
      organization: r.organization ?? '',
      date: r.date ?? null,
      description: r.description ?? '',
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  events: {
    table: 'events',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      title: r.title ?? '',
      etype: r.etype ?? 'Meeting',
      date: r.date ?? null,
      time: r.time ?? null,
      location: r.location ?? '',
      notes: r.notes ?? '',
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  resources: {
    table: 'knowledge_resources',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      title: r.title ?? '',
      rtype: r.rtype ?? null,
      url: r.url ?? '',
      status: r.status ?? 'saved',
      tags: Array.isArray(r.tags) ? r.tags : [],
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  documents: {
    table: 'knowledge_documents',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      name: r.name ?? '',
      category: r.category ?? 'Other',
      url: r.url ?? '',
      tags: Array.isArray(r.tags) ? r.tags : [],
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  notes: {
    table: 'knowledge_notes',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      title: r.title ?? '',
      content: r.content ?? '',
      kind: r.kind ?? 'note',
      url: r.url ?? '',
      tags: Array.isArray(r.tags) ? r.tags : [],
      updatedAt: r.updated_at ?? null,
      createdAt: r.created_at ?? null,
    }),
  },

  achievements: {
    table: 'achievements',
    key: 'id',
    fromRemote: (r) => ({
      id: r.id,
      title: r.title ?? '',
      atype: r.atype ?? null,
      date: r.date ?? null,
      organization: r.organization ?? '',
      description: r.description ?? '',
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },

  meta: {
    table: 'app_meta',
    key: 'key',
    fromRemote: (r) => ({
      key: r.key,
      value: r.value ?? null,
      updatedAt: r.updated_at ?? null,
    }),
  },
};

const MILESTONE_TABLE = 'project_milestones';

let activeUserId = null;

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return null;
    }
    throw error;
  }

  return data?.user ?? null;
}

async function fetchRows(table, userId) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function fetchAllCloudData(userId) {
  const entries = Object.entries(PULL_CONFIG);
  const result = {};

  const fetched = await Promise.all(
    entries.map(async ([store, config]) => {
      const rows = await fetchRows(config.table, userId);
      return [store, rows];
    }),
  );

  for (const [store, rows] of fetched) {
    result[store] = rows;
  }

  result.projectMilestones = await fetchRows(
    MILESTONE_TABLE,
    userId,
  );

  return result;
}

function attachProjectMilestones(projectRows, milestoneRows) {
  const byProject = new Map();

  for (const row of milestoneRows) {
    if (!byProject.has(row.project_id)) {
      byProject.set(row.project_id, []);
    }

    byProject.get(row.project_id).push({
      id: row.id,
      projectId: row.project_id,
      title: row.title ?? '',
      date: row.date ?? null,
      done: Boolean(row.done),
      position: Number(row.position ?? 0),
    });
  }

  return projectRows.map((project) => ({
    ...project,
    milestones: (byProject.get(project.id) ?? []).sort(
      (a, b) => a.position - b.position,
    ),
  }));
}

async function replaceStoreFromCloud(store, remoteRows) {
  const config = PULL_CONFIG[store];

  if (!config) {
    return 0;
  }

  await clear(store);

  for (const row of remoteRows) {
    await localPut(
      store,
      config.fromRemote(row),
    );
  }

  return remoteRows.length;
}

function cloudHasData(cloudData) {
  return Object.entries(PULL_CONFIG).some(
    ([store]) =>
      Array.isArray(cloudData[store]) &&
      cloudData[store].length > 0,
  );
}

/**
 * Pull the authenticated user's cloud data into IndexedDB.
 *
 * This replaces the stores being pulled with the cloud copy.
 *
 * Background images are intentionally excluded.
 * Their binary files belong in Supabase Storage.
 */
export async function pullCloudData() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      reason: 'not-authenticated',
      stores: {},
    };
  }

  activeUserId = user.id;

  const cloudData = await fetchAllCloudData(user.id);
  const stores = {};

  /*
   * Projects are normalized in Postgres, but the local IndexedDB
   * project object keeps milestones embedded inside the project.
   */
  const projectRows = attachProjectMilestones(
    cloudData.projects ?? [],
    cloudData.projectMilestones ?? [],
  );

  for (const [store] of Object.entries(PULL_CONFIG)) {
    const rows =
      store === 'projects'
        ? projectRows
        : cloudData[store] ?? [];

    stores[store] = await replaceStoreFromCloud(
      store,
      rows,
    );
  }

  // projectMilestones has no local IndexedDB store.
  stores.projectMilestones =
    cloudData.projectMilestones?.length ?? 0;

  return {
    success: true,
    userId: user.id,
    stores,
  };
}

/**
 * Used during app startup.
 *
 * Bootstrap from cloud only when the local app contains
 * no meaningful user-created data.
 *
 * Seeded/static GATE topics and app_meta do not block
 * a fresh-device cloud restore.
 */
export async function bootstrapFromCloud() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      bootstrapped: false,
      reason: 'not-authenticated',
    };
  }

  /*
   * These are the dynamic/user-data stores.
   *
   * Do NOT use gateTopics or meta as the bootstrap signal because
   * those may already contain static/seeded data on a fresh device.
   */
  const DYNAMIC_STORES = [
    'tasks',
    'projects',
    'mistakes',
    'pyqRecords',
    'studySessions',
    'internships',
    'universities',
    'skills',
    'resumeEntries',
    'events',
    'resources',
    'documents',
    'notes',
    'achievements',
  ];

  const counts = await Promise.all(
    DYNAMIC_STORES.map(async (store) => [
      store,
      await count(store),
    ]),
  );

  const hasLocalData = counts.some(
    ([, storeCount]) => storeCount > 0,
  );

  if (hasLocalData) {
    return {
      bootstrapped: false,
      reason: 'local-data-present',
    };
  }

  const cloudData = await fetchAllCloudData(user.id);

  if (!cloudHasData(cloudData)) {
    return {
      bootstrapped: false,
      reason: 'cloud-empty',
    };
  }

  const result = await pullCloudData();

  return {
    bootstrapped: true,
    ...result,
  };
}

export async function getCloudPullStatus() {
  const user = await getAuthenticatedUser();

  return {
    connected: Boolean(user),
    userId: user?.id ?? null,
    activeUserId,
  };
}