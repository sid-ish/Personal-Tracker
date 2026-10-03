import { supabase } from '../supabase.js';
import { all } from '../../database/queries.js';

function normalizeDate(value) {
  if (!value) return null;

  if (typeof value !== 'string') {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function normalizeTimestamp(value) {
  if (!value) return null;

  if (typeof value !== 'string') {
    return null;
  }

  const time = new Date(value);

  return Number.isNaN(time.getTime())
    ? null
    : time.toISOString();
}

function mapTask(task, userId) {
  return {
    user_id: userId,
    id: task.id,
    text: task.text ?? '',
    category: task.category ?? 'academic',
    priority: task.priority ?? 'medium',
    date: normalizeDate(task.date),
    done: Boolean(task.done),
    project_id: task.projectId ?? null,
    created_at: normalizeTimestamp(task.createdAt) ?? new Date().toISOString(),
    completed_at: normalizeTimestamp(task.completedAt),
    estimated_minutes:
      Number.isFinite(task.estimatedMinutes)
        ? Math.round(task.estimatedMinutes)
        : null,
    ga_focus: task.gaFocus ?? null,
    gate_kind: task.gateKind ?? null,
    updated_at: new Date().toISOString(),
  };
}

function mapGateTopic(topic, userId) {
  return {
    user_id: userId,
    id: topic.id,
    paper: topic.paper ?? '',
    subject: topic.subject ?? '',
    topic: topic.topic ?? '',
    subtopics: Array.isArray(topic.subtopics)
      ? topic.subtopics
      : [],
    notes: topic.notes ?? '',
    last_studied: normalizeDate(topic.lastStudied),
    next_revision: normalizeDate(topic.nextRevision),
    weak: Boolean(topic.weak),
    resources: Array.isArray(topic.resources)
      ? topic.resources
      : [],
    updated_at: new Date().toISOString(),
  };
}

function mapMeta(record, userId) {
  return {
    user_id: userId,
    key: record.key,
    value: record.value ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error(
      'No authenticated Supabase user found. Sign in with Google first.'
    );
  }

  return data.user;
}

async function upsertBatch(table, rows, conflictColumns) {
  if (!rows.length) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(rows, {
      onConflict: conflictColumns,
    });

  if (error) {
    throw new Error(
      `${table} migration failed: ${error.message}`
    );
  }
}

export async function migrateLocalData() {
  console.log('[Migration] Starting local → Supabase migration...');

  const user = await getAuthenticatedUser();
  const userId = user.id;

  console.log('[Migration] Authenticated user:', user.email || userId);

  // Read IndexedDB only.
  const [
    tasks,
    gateTopics,
    meta,
  ] = await Promise.all([
    all('tasks'),
    all('gateTopics'),
    all('meta'),
  ]);

  console.log('[Migration] Local counts:', {
    tasks: tasks.length,
    gateTopics: gateTopics.length,
    meta: meta.length,
  });

  // ------------------------------------------------------------
  // 1. Tasks
  // ------------------------------------------------------------

  const taskRows = tasks.map(task =>
    mapTask(task, userId)
  );

  await upsertBatch(
    'tasks',
    taskRows,
    'user_id,id'
  );

  console.log(
    `[Migration] Uploaded ${taskRows.length} tasks`
  );

  // ------------------------------------------------------------
  // 2. GATE topics
  // ------------------------------------------------------------

  const gateRows = gateTopics.map(topic =>
    mapGateTopic(topic, userId)
  );

  await upsertBatch(
    'gate_topics',
    gateRows,
    'user_id,id'
  );

  console.log(
    `[Migration] Uploaded ${gateRows.length} GATE topics`
  );

  // ------------------------------------------------------------
  // 3. Meta records
  // ------------------------------------------------------------

  const metaRows = meta.map(record =>
    mapMeta(record, userId)
  );

  await upsertBatch(
    'app_meta',
    metaRows,
    'user_id,key'
  );

  console.log(
    `[Migration] Uploaded ${metaRows.length} meta records`
  );

  // ------------------------------------------------------------
  // 4. Verify remote counts
  // ------------------------------------------------------------

  async function countRemote(table) {
    const { count, error } = await supabase
      .from(table)
      .select('*', {
        count: 'exact',
        head: true,
      });

    if (error) {
      throw new Error(
        `${table} verification failed: ${error.message}`
      );
    }

    return count ?? 0;
  }

  const remoteCounts = {
    tasks: await countRemote('tasks'),
    gate_topics: await countRemote('gate_topics'),
    app_meta: await countRemote('app_meta'),
  };

  console.log('[Migration] Remote counts:', remoteCounts);

  // ------------------------------------------------------------
  // 5. Final verification
  // ------------------------------------------------------------

  if (remoteCounts.tasks !== tasks.length) {
    throw new Error(
      `Task count mismatch. Local=${tasks.length}, Remote=${remoteCounts.tasks}`
    );
  }

  if (remoteCounts.gate_topics !== gateTopics.length) {
    throw new Error(
      `GATE topic count mismatch. Local=${gateTopics.length}, Remote=${remoteCounts.gate_topics}`
    );
  }

  if (remoteCounts.app_meta !== meta.length) {
    throw new Error(
      `Meta count mismatch. Local=${meta.length}, Remote=${remoteCounts.app_meta}`
    );
  }

  console.log(
    '[Migration] SUCCESS. Local IndexedDB was not modified.'
  );

  return {
    userId,
    local: {
      tasks: tasks.length,
      gateTopics: gateTopics.length,
      meta: meta.length,
    },
    remote: remoteCounts,
  };
}