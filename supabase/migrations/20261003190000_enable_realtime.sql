begin;

-- Enable Realtime for the tables that need live synchronization.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tasks',
    'projects',
    'project_milestones',
    'gate_topics',
    'gate_mistakes',
    'gate_pyq_records',
    'study_sessions',
    'internships',
    'universities',
    'skills',
    'resume_entries',
    'events',
    'knowledge_notes',
    'knowledge_resources',
    'knowledge_documents',
    'achievements',
    'backgrounds',
    'app_meta'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end
$$;

-- Keep full old rows available for UPDATE/DELETE events.
-- This makes DELETE handling reliable for our local mirror.
alter table public.tasks replica identity full;
alter table public.projects replica identity full;
alter table public.project_milestones replica identity full;
alter table public.gate_topics replica identity full;
alter table public.gate_mistakes replica identity full;
alter table public.gate_pyq_records replica identity full;
alter table public.study_sessions replica identity full;
alter table public.internships replica identity full;
alter table public.universities replica identity full;
alter table public.skills replica identity full;
alter table public.resume_entries replica identity full;
alter table public.events replica identity full;
alter table public.knowledge_notes replica identity full;
alter table public.knowledge_resources replica identity full;
alter table public.knowledge_documents replica identity full;
alter table public.achievements replica identity full;
alter table public.backgrounds replica identity full;
alter table public.app_meta replica identity full;

commit;