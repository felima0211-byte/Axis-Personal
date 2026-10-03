-- ENUMS
create type public.task_status as enum ('draft','confirmed','in_progress','done','archived');
create type public.task_priority as enum ('low','normal','high','urgent');
create type public.section_kind as enum ('general','spreadsheet');
create type public.message_source as enum ('pasted','whatsapp','email','other');
create type public.extraction_status as enum ('pending_extraction','extracted','failed');
create type public.sync_status as enum ('idle','syncing','error');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- SECTIONS
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null,
  kind public.section_kind not null default 'general',
  color text not null default '#d97706' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, slug)
);

-- REQUESTERS (nome criptografado + índice cego para busca por igualdade)
create table public.requesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name_enc text not null,
  name_index text not null,
  notes_enc text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name_index)
);

-- MESSAGES (conversa original, sempre criptografada)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  requester_id uuid,
  content_enc text not null,
  content_hash text not null,
  source public.message_source not null default 'pasted',
  extraction_status public.extraction_status not null default 'pending_extraction',
  extraction_error text check (char_length(extraction_error) <= 200),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, content_hash),
  foreign key (user_id, requester_id) references public.requesters (user_id, id) on delete set null (requester_id)
);

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section_id uuid,
  requester_id uuid,
  message_id uuid,
  title_enc text not null,
  description_enc text,
  source_excerpt_enc text,
  status public.task_status not null default 'draft',
  priority public.task_priority not null default 'normal',
  due_at timestamptz,
  ai_confidence numeric(3,2) check (ai_confidence between 0 and 1),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, section_id) references public.sections (user_id, id) on delete set null (section_id),
  foreign key (user_id, requester_id) references public.requesters (user_id, id) on delete set null (requester_id),
  foreign key (user_id, message_id) references public.messages (user_id, id) on delete set null (message_id)
);

-- REMINDERS
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid,
  section_id uuid,
  title_enc text not null,
  remind_at timestamptz not null,
  done_at timestamptz,
  recurrence text check (char_length(recurrence) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, task_id) references public.tasks (user_id, id) on delete cascade,
  foreign key (user_id, section_id) references public.sections (user_id, id) on delete set null (section_id)
);

-- SHEET_SOURCES (modelo apenas; sem tokens do Google)
create table public.sheet_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section_id uuid not null,
  google_sheet_id text not null,
  range text,
  label text,
  last_synced_at timestamptz,
  sync_status public.sync_status not null default 'idle',
  last_error text check (char_length(last_error) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, section_id) references public.sections (user_id, id) on delete cascade
);

-- AUDIT_LOG (append-only)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ip_hash text,
  occurred_at timestamptz not null default now()
);

-- ÍNDICES
create index tasks_user_status_due on public.tasks (user_id, status, due_at);
create index tasks_user_created on public.tasks (user_id, created_at desc, id desc);
create index tasks_section on public.tasks (section_id);
create index tasks_message on public.tasks (message_id);
create index messages_user_created on public.messages (user_id, created_at desc, id desc);
create index requesters_user_created on public.requesters (user_id, created_at desc, id desc);
create index reminders_user_remind on public.reminders (user_id, remind_at) where done_at is null;
create index reminders_user_created on public.reminders (user_id, created_at desc, id desc);
create index sheet_sources_section on public.sheet_sources (section_id);
create index audit_user_time on public.audit_log (user_id, occurred_at desc);

-- RLS: negar por padrão; só o dono, só as próprias linhas
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

do $$
declare t text;
begin
  foreach t in array array['sections','requesters','messages','tasks','reminders','sheet_sources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid() and public.is_owner())', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid() and public.is_owner())', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid() and public.is_owner()) with check (user_id = auth.uid() and public.is_owner())', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid() and public.is_owner())', t||'_delete', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t||'_updated_at', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
create policy audit_select on public.audit_log for select to authenticated using (user_id = auth.uid() and public.is_owner());
create policy audit_insert on public.audit_log for insert to authenticated with check (user_id = auth.uid() and public.is_owner());
revoke update, delete, truncate on public.audit_log from authenticated, anon;
