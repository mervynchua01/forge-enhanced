-- Supabase schema for Forge (Phase 1 foundation)

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  project_title text not null unique,
  project_key text not null unique,
  description text not null,
  project_lead uuid not null references users(id) on delete restrict,
  members uuid[] not null default '{}'::uuid[],
  target_date date not null,
  status text not null default 'To Do',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null,
  status text not null default 'To Do',
  priority text not null default 'None',
  due_date date,
  project_id uuid not null references projects(id) on delete cascade,
  assignees uuid[] not null default '{}'::uuid[],
  created_by uuid references users(id) on delete set null,
  comment jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  prd_text text,
  draft_tickets jsonb not null default '[]'::jsonb,
  chat_history jsonb not null default '[]'::jsonb,
  state text not null default 'generating',
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table agent_tasks enable row level security;

-- Users can read all profiles and update their own.
create policy "users_select" on users
  for select
  to authenticated
  using (true);

create policy "users_insert_self" on users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "users_update_self" on users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Projects accessible to lead or members.
create policy "projects_select" on projects
  for select
  to authenticated
  using (
    project_lead = auth.uid()
    or auth.uid() = any (members)
  );

create policy "projects_insert" on projects
  for insert
  to authenticated
  with check (project_lead = auth.uid());

create policy "projects_update" on projects
  for update
  to authenticated
  using (
    project_lead = auth.uid()
    or auth.uid() = any (members)
  )
  with check (
    project_lead = auth.uid()
    or auth.uid() = any (members)
  );

-- Tasks accessible to project members.
create policy "tasks_select" on tasks
  for select
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "tasks_insert" on tasks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "tasks_update" on tasks
  for update
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "tasks_delete" on tasks
  for delete
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

-- Agent tasks accessible to project members.
create policy "agent_tasks_select" on agent_tasks
  for select
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = agent_tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "agent_tasks_insert" on agent_tasks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from projects
      where projects.id = agent_tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "agent_tasks_update" on agent_tasks
  for update
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = agent_tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  )
  with check (
    exists (
      select 1 from projects
      where projects.id = agent_tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );

create policy "agent_tasks_delete" on agent_tasks
  for delete
  to authenticated
  using (
    exists (
      select 1 from projects
      where projects.id = agent_tasks.project_id
        and (projects.project_lead = auth.uid() or auth.uid() = any (projects.members))
    )
  );
