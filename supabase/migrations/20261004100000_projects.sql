-- Projects table
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name_enc text not null,
  slug text not null,
  color text not null default '#6ec1e4',
  status public.project_status not null default 'active',
  description_enc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Files per project (uploads + google sheets)
create type public.file_kind as enum ('upload', 'google_sheet');
create type public.file_sync_status as enum ('idle', 'syncing', 'synced', 'error', 'disconnected');

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name_enc text not null,
  kind public.file_kind not null default 'upload',
  mime_type text,
  size_bytes bigint,
  storage_path text,
  google_sheet_id text,
  google_range text,
  google_tab text,
  sync_status public.file_sync_status not null default 'idle',
  last_error text check (char_length(last_error) <= 200),
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add project_id to tasks, messages, reminders (nullable for backwards compat)
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.messages add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.reminders add column if not exists project_id uuid references public.projects(id) on delete set null;

-- Indexes
create index projects_user_id_status_idx on public.projects(user_id, status);
create index project_files_project_id_idx on public.project_files(project_id);
create index tasks_project_id_idx on public.tasks(project_id);
create index messages_project_id_idx on public.messages(project_id);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['projects','project_files'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid() and public.is_owner())', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() and public.is_owner())', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid() and public.is_owner()) with check (user_id = auth.uid() and public.is_owner())', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid() and public.is_owner())', t||'_delete', t);
  end loop;
end $$;

-- Triggers
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger project_files_updated_at before update on public.project_files
  for each row execute function public.set_updated_at();
