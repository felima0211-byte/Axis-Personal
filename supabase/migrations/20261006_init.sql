create extension if not exists "uuid-ossp";

create table if not exists projects (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  color text default '#6ec1e4',
  status text default 'active',
  parent_id text,
  created_at timestamptz default now()
);
alter table projects enable row level security;
drop policy if exists "owner" on projects;
create policy "owner" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists tasks (
  id text primary key,
  user_id uuid references auth.users not null,
  project_id text,
  title text not null,
  description text,
  status text default 'open',
  priority text default 'normal',
  due_at timestamptz,
  start_at timestamptz,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
drop policy if exists "owner" on tasks;
create policy "owner" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists messages (
  id text primary key,
  user_id uuid references auth.users not null,
  project_id text,
  content text not null,
  requester_name text,
  created_at timestamptz default now()
);
alter table messages enable row level security;
drop policy if exists "owner" on messages;
create policy "owner" on messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists documents (
  id text primary key,
  user_id uuid references auth.users not null,
  project_id text,
  name text not null,
  type text,
  size bigint default 0,
  data text,
  url text,
  kind text default 'file',
  created_at timestamptz default now()
);
alter table documents enable row level security;
drop policy if exists "owner" on documents;
create policy "owner" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
