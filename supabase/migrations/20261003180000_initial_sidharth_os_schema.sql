-- Sidharth OS 2.0
-- Initial user-owned PostgreSQL schema + RLS
-- Phase 2: schema only. No application data is inserted here.
-- Storage bucket/policies are intentionally handled in a later migration.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.app_meta (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.skills (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  name text not null,
  category text,
  level smallint not null default 1,
  evidence text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.resume_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  section text,
  title text not null,
  organization text not null default '',
  date text,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.achievements (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  title text not null,
  atype text,
  date text,
  organization text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.universities (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  name text not null,
  country text not null default '',
  program text not null default '',
  deadline date,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.internships (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  company text not null,
  role text not null default '',
  status text not null default 'saved',
  type text not null default '',
  location text not null default '',
  start_date date,
  deadline date,
  interview_date date,
  next_action text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  title text not null,
  etype text not null default 'Meeting',
  date date not null,
  time time,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.knowledge_notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  title text not null,
  content text not null default '',
  kind text not null default 'note',
  url text not null default '',
  tags text[] not null default '{}'::text[],
  updated_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.knowledge_resources (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  title text,
  rtype text,
  url text not null default '',
  status text not null default 'saved',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.knowledge_documents (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  name text,
  category text not null default 'Other',
  url text not null default '',
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.projects (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  name text not null,
  status text not null default 'active',
  target_date date,
  description text not null default '',
  notes text not null default '',
  changelog jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.project_milestones (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  project_id text not null,
  title text not null,
  date date,
  done boolean not null default false,
  position integer,
  primary key (user_id, id),
  constraint project_milestones_project_fk
    foreign key (user_id, project_id)
    references public.projects (user_id, id)
    on delete cascade
);

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  text text not null,
  category text default 'academic',
  priority text default 'medium',
  date date,
  done boolean not null default false,
  project_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  estimated_minutes integer,
  ga_focus text,
  gate_kind text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint tasks_project_fk
    foreign key (user_id, project_id)
    references public.projects (user_id, id)
    on delete set null (project_id)
);

create table public.gate_topics (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  paper text not null,
  subject text not null,
  topic text not null,
  subtopics jsonb not null default '[]'::jsonb,
  notes text not null default '',
  last_studied date,
  next_revision date,
  weak boolean not null default false,
  resources text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.gate_mistakes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  paper text not null default 'ME',
  subject text,
  topic text not null default '',
  mtype text,
  what text not null,
  correct text not null default '',
  date date,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.gate_pyq_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  paper text not null,
  subject text not null,
  topic text not null default '',
  year text not null default '',
  attempted integer not null,
  correct integer not null,
  date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.study_sessions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  date date not null,
  category text,
  what text not null,
  duration_min integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.backgrounds (
  user_id uuid not null default auth.uid() references auth.users(id) on delete no action,
  id text not null,
  name text not null default 'Custom background',
  type text not null default 'custom',
  mime_type text not null,
  width integer not null,
  height integer not null,
  size_bytes bigint not null,
  storage_path text not null,
  thumb_path text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Secondary indexes. Each one leads with user_id for RLS-friendly filtering.
create index tasks_user_date_idx on public.tasks (user_id, date);
create index tasks_user_done_date_idx on public.tasks (user_id, done, date);
create index tasks_user_project_idx on public.tasks (user_id, project_id);
create index project_milestones_user_project_idx on public.project_milestones (user_id, project_id);
create index project_milestones_user_date_idx on public.project_milestones (user_id, date);
create index gate_topics_user_paper_subject_idx on public.gate_topics (user_id, paper, subject);
create index gate_topics_user_next_revision_idx on public.gate_topics (user_id, next_revision) where next_revision is not null;
create index gate_mistakes_user_paper_resolved_idx on public.gate_mistakes (user_id, paper, resolved);
create index gate_pyq_records_user_paper_subject_idx on public.gate_pyq_records (user_id, paper, subject);
create index study_sessions_user_date_idx on public.study_sessions (user_id, date);
create index internships_user_status_idx on public.internships (user_id, status);
create index internships_user_deadline_idx on public.internships (user_id, deadline);
create index events_user_date_idx on public.events (user_id, date);
create index knowledge_notes_tags_gin_idx on public.knowledge_notes using gin (tags);
create index knowledge_resources_tags_gin_idx on public.knowledge_resources using gin (tags);
create index knowledge_documents_tags_gin_idx on public.knowledge_documents using gin (tags);
create index backgrounds_user_created_idx on public.backgrounds (user_id, created_at desc);

-- updated_at triggers.
create trigger app_meta_set_updated_at before update on public.app_meta
for each row execute function public.set_updated_at();

create trigger skills_set_updated_at before update on public.skills
for each row execute function public.set_updated_at();

create trigger resume_entries_set_updated_at before update on public.resume_entries
for each row execute function public.set_updated_at();

create trigger achievements_set_updated_at before update on public.achievements
for each row execute function public.set_updated_at();

create trigger universities_set_updated_at before update on public.universities
for each row execute function public.set_updated_at();

create trigger internships_set_updated_at before update on public.internships
for each row execute function public.set_updated_at();

create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

create trigger knowledge_notes_set_updated_at before update on public.knowledge_notes
for each row execute function public.set_updated_at();

create trigger knowledge_resources_set_updated_at before update on public.knowledge_resources
for each row execute function public.set_updated_at();

create trigger knowledge_documents_set_updated_at before update on public.knowledge_documents
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create trigger gate_topics_set_updated_at before update on public.gate_topics
for each row execute function public.set_updated_at();

create trigger gate_mistakes_set_updated_at before update on public.gate_mistakes
for each row execute function public.set_updated_at();

create trigger gate_pyq_records_set_updated_at before update on public.gate_pyq_records
for each row execute function public.set_updated_at();

create trigger study_sessions_set_updated_at before update on public.study_sessions
for each row execute function public.set_updated_at();

create trigger backgrounds_set_updated_at before update on public.backgrounds
for each row execute function public.set_updated_at();

-- Lock all app tables to authenticated users with ownership enforced by RLS.
revoke all on table public.app_meta, public.skills, public.resume_entries,
  public.achievements, public.universities, public.internships, public.events,
  public.knowledge_notes, public.knowledge_resources, public.knowledge_documents,
  public.projects, public.project_milestones, public.tasks, public.gate_topics,
  public.gate_mistakes, public.gate_pyq_records, public.study_sessions,
  public.backgrounds
from anon;

grant select, insert, update, delete on table public.app_meta, public.skills,
  public.resume_entries, public.achievements, public.universities,
  public.internships, public.events, public.knowledge_notes,
  public.knowledge_resources, public.knowledge_documents, public.projects,
  public.project_milestones, public.tasks, public.gate_topics,
  public.gate_mistakes, public.gate_pyq_records, public.study_sessions,
  public.backgrounds
to authenticated;

alter table public.app_meta enable row level security;
alter table public.skills enable row level security;
alter table public.resume_entries enable row level security;
alter table public.achievements enable row level security;
alter table public.universities enable row level security;
alter table public.internships enable row level security;
alter table public.events enable row level security;
alter table public.knowledge_notes enable row level security;
alter table public.knowledge_resources enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.gate_topics enable row level security;
alter table public.gate_mistakes enable row level security;
alter table public.gate_pyq_records enable row level security;
alter table public.study_sessions enable row level security;
alter table public.backgrounds enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_meta',
    'skills',
    'resume_entries',
    'achievements',
    'universities',
    'internships',
    'events',
    'knowledge_notes',
    'knowledge_resources',
    'knowledge_documents',
    'projects',
    'project_milestones',
    'tasks',
    'gate_topics',
    'gate_mistakes',
    'gate_pyq_records',
    'study_sessions',
    'backgrounds'
  ] loop
    execute format(
      'create policy %I_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );

    execute format(
      'create policy %I_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t, t
    );

    execute format(
      'create policy %I_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t, t
    );

    execute format(
      'create policy %I_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t, t
    );
  end loop;
end
$$;

-- Prevent normal authenticated clients from changing ownership directly.
revoke update (user_id) on table public.app_meta, public.skills, public.resume_entries,
  public.achievements, public.universities, public.internships, public.events,
  public.knowledge_notes, public.knowledge_resources, public.knowledge_documents,
  public.projects, public.project_milestones, public.tasks, public.gate_topics,
  public.gate_mistakes, public.gate_pyq_records, public.study_sessions,
  public.backgrounds
from authenticated;

commit;
