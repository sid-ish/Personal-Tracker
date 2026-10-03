import { supabase } from '../supabase.js';
import { localPut, localDel } from '../../database/queries.js';
import { PULL_CONFIG } from './cloud-pull.js';

let realtimeChannel = null;
let activeUserId = null;
let started = false;

const PROJECT_MILESTONE_TABLE = 'project_milestones';

function getStoreFromTable(table) {
  for (const [store, config] of Object.entries(PULL_CONFIG)) {
    if (config.table === table) {
      return store;
    }
  }

  return null;
}

function getPayloadRecord(payload) {
  return payload?.new ?? payload?.old ?? null;
}

async function refreshProject(projectId, userId) {
  if (!projectId || !userId) {
    return;
  }

  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  /*
   * The project may have been deleted. In that case remove the
   * local project too.
   */
  if (!projectRow) {
    await localDel('projects', projectId);
    return;
  }

  const { data: milestoneRows, error: milestoneError } =
    await supabase
      .from(PROJECT_MILESTONE_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('position', { ascending: true });

  if (milestoneError) {
    throw milestoneError;
  }

  const config = PULL_CONFIG.projects;

  const milestones = (milestoneRows ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title ?? '',
    date: row.date ?? null,
    done: Boolean(row.done),
    position: Number(row.position ?? 0),
  }));

  await localPut('projects', {
    ...config.fromRemote(projectRow),
    milestones,
  });
}

async function applyChange(payload, userId) {
  const table = payload?.table;
  const eventType = payload?.eventType;

  /*
   * project_milestones are normalized in PostgreSQL but embedded
   * inside the local IndexedDB project object.
   *
   * Therefore any milestone change causes the parent project to
   * be re-fetched and rebuilt locally.
   */
  if (table === PROJECT_MILESTONE_TABLE) {
    const record = getPayloadRecord(payload);
    const projectId = record?.project_id;

    if (projectId) {
      await refreshProject(projectId, userId);
    }

    return;
  }

  const store = getStoreFromTable(table);

  if (!store) {
    return;
  }

  /*
   * DELETE:
   * use the old row because payload.new is null.
   */
  if (eventType === 'DELETE') {
    const record = payload?.old;

    if (!record) {
      return;
    }

    const config = PULL_CONFIG[store];
    const key = record[config.key];

    if (key !== undefined && key !== null) {
      await localDel(store, key);
    }

    return;
  }

  /*
   * INSERT / UPDATE
   */
  const record = payload?.new;

  if (!record) {
    return;
  }

  const config = PULL_CONFIG[store];

  if (!config?.fromRemote) {
    return;
  }

  await localPut(
    store,
    config.fromRemote(record),
  );
}

function handleError(table, error) {
  console.warn(
    `[CloudRealtime] ${table} event could not be applied:`,
    error?.message ?? error,
  );
}

export async function startCloudRealtime() {
  if (started && activeUserId) {
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn(
      '[CloudRealtime] Could not read auth session:',
      error.message,
    );
    return;
  }

  const user = data?.session?.user ?? null;

  if (!user) {
    return;
  }

  /*
   * Clean up a stale channel before creating a new one.
   */
  if (realtimeChannel) {
    await stopCloudRealtime();
  }

  activeUserId = user.id;
  started = true;

  const channelName = `sidharth-os-db-${user.id}`;

  realtimeChannel = supabase.channel(channelName);

  /*
   * Subscribe to every cloud-backed entity table.
   *
   * The user_id filter prevents unrelated users' rows from
   * reaching this client.
   */
  for (const config of Object.values(PULL_CONFIG)) {
    realtimeChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: config.table,
        filter: `user_id=eq.${user.id}`,
      },
      async (payload) => {
        try {
          await applyChange(payload, user.id);

          window.dispatchEvent(
            new CustomEvent('sos-cloud-change', {
              detail: {
                table: payload.table,
                eventType: payload.eventType,
              },
            }),
          );
        } catch (error) {
          handleError(payload.table, error);
        }
      },
    );
  }

  /*
   * project_milestones is not part of PULL_CONFIG because it has
   * no IndexedDB store of its own.
   */
  realtimeChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: PROJECT_MILESTONE_TABLE,
      filter: `user_id=eq.${user.id}`,
    },
    async (payload) => {
      try {
        await applyChange(payload, user.id);

        window.dispatchEvent(
          new CustomEvent('sos-cloud-change', {
            detail: {
              table: payload.table,
              eventType: payload.eventType,
            },
          }),
        );
      } catch (error) {
        handleError(payload.table, error);
      }
    },
  );

  realtimeChannel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.info(
        '[CloudRealtime] Connected.',
      );
    }

    if (status === 'CHANNEL_ERROR') {
      console.warn(
        '[CloudRealtime] Channel error:',
        error?.message ?? error,
      );
    }

    if (status === 'TIMED_OUT') {
      console.warn(
        '[CloudRealtime] Subscription timed out.',
      );
    }

    if (status === 'CLOSED') {
      console.info(
        '[CloudRealtime] Channel closed.',
      );
    }
  });
}

export async function stopCloudRealtime() {
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = null;
  activeUserId = null;
  started = false;
}

export function isCloudRealtimeActive() {
  return started && Boolean(activeUserId);
}

export function getCloudRealtimeStatus() {
  return {
    active: started,
    userId: activeUserId,
    channel: realtimeChannel?.topic ?? null,
  };
}