-- Limpar schema anterior
drop table if exists public.project_files cascade;
drop table if exists public.sheet_snapshots cascade;
drop table if exists public.google_connections cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.reminders cascade;
drop table if exists public.tasks cascade;
drop table if exists public.messages cascade;
drop table if exists public.requesters cascade;
drop table if exists public.sections cascade;
drop table if exists public.sheet_sources cascade;
drop table if exists public.projects cascade;
drop type if exists public.task_status cascade;
drop type if exists public.task_priority cascade;
drop type if exists public.project_status cascade;
drop type if exists public.file_kind cascade;
drop type if exists public.file_sync_status cascade;
drop type if exists public.section_kind cascade;
drop type if exists public.message_source cascade;
drop type if exists public.extraction_status cascade;
drop type if exists public.sync_status cascade;
drop type if exists public.google_status cascade;
drop function if exists public.is_owner() cascade;
drop function if exists public.set_updated_at() cascade;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6ec1e4',
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy projects_owner on public.projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','confirmed','in_progress','done','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  source_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy tasks_owner on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  content text not null,
  requester_name text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending','done','failed')),
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy messages_owner on public.messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
create policy reminders_owner on public.reminders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger reminders_updated_at before update on public.reminders for each row execute function public.set_updated_at();

create index tasks_user_status on public.tasks(user_id, status);
create index tasks_user_due on public.tasks(user_id, due_at) where due_at is not null;
create index tasks_project on public.tasks(project_id);
create index messages_project on public.messages(project_id);
create index reminders_user_remind on public.reminders(user_id, remind_at) where done_at is null;
