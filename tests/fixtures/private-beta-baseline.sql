-- Minimal Supabase-compatible baseline used only by the disposable SQL test.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end;
$$;

create schema auth;
create schema storage;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(), name varchar not null, description text,
  start_date date, end_date date, status varchar default 'planning', location varchar,
  client varchar, progress integer default 0, team_size integer default 1,
  created_by uuid references auth.users(id), created_at timestamp default now(),
  updated_at timestamp default now(), actual_end_date date, budget numeric default 0,
  spent numeric default 0, priority varchar default 'medium', category varchar,
  attachment_url text, attachment_name text
);

create table public.personnel (
  id uuid primary key default gen_random_uuid(), name varchar not null, email varchar unique,
  phone varchar, position varchar, role varchar, department varchar, status varchar default 'active',
  avatar_url text, created_at timestamp default now(), updated_at timestamp default now(),
  user_id uuid unique references auth.users(id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  title varchar not null, name varchar, description text, due_date date, status varchar default 'todo',
  priority varchar default 'medium', assigned_to uuid references public.personnel(id), estimated_hours integer,
  created_at timestamp default now(), updated_at timestamp default now(), start_date date, end_date date,
  progress integer default 0, phase varchar, category varchar, duration integer, dependencies text[],
  assignee varchar, gantt_position integer, completed_at timestamptz, assignee_headcounts jsonb default '{}', notes text
);

create table public.reports (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  file_name varchar not null, file_path varchar not null, file_url text, file_type varchar, file_size integer,
  uploaded_by uuid references auth.users(id), uploaded_at timestamp default now(), updated_at timestamp default now(),
  category varchar default 'Progress Report', status varchar default 'pending', description text,
  uploader_name text, uploader_position text, assigned_reviewer uuid references public.personnel(id),
  reviewer_notes text, assigned_reviewer_id uuid, title text
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
  message text not null, type varchar default 'info', read boolean default false, created_at timestamp default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(), title varchar not null, description text, date date not null,
  time time not null, type varchar not null, project_id uuid references public.projects(id) on delete cascade,
  location varchar not null, attendees text[], created_by uuid references auth.users(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null, file_name text not null,
  file_size integer not null, file_type text not null, storage_path text not null, upload_date date not null,
  description text, uploaded_by uuid references auth.users(id), created_at timestamptz default now(),
  updated_at timestamptz default now(), title text
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  name text not null, target_date date not null, actual_date date, completed boolean default false,
  description text, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.fcm_tokens (
  id uuid primary key default gen_random_uuid(), user_id uuid unique not null references auth.users(id),
  token text unique not null, device_info jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now()
);

create table public.report_reviewers (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports(id) on delete cascade,
  reviewer_id uuid not null references public.personnel(id) on delete cascade, status text default 'pending',
  reviewer_notes text, assigned_at timestamptz default now(), reviewed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(), unique (report_id, reviewer_id)
);

create table public.user_profiles (
  id uuid primary key references auth.users(id), email text, name text, created_at timestamptz default now()
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  personnel_id uuid not null references public.personnel(id) on delete cascade, role text, assigned_at timestamptz default now()
);

create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id),
  name text not null, owner uuid, metadata jsonb, created_at timestamptz default now(), unique (bucket_id, name)
);

alter table storage.objects enable row level security;

create view public.photos_with_uploader_names as select photo.* from public.photos photo;
create view public.report_review_summary as select report.id from public.reports report;
create view public.project_gantt_view as select project.id from public.projects project;

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'owner@example.test', '{"name":"Owner"}');

insert into public.personnel (name, email)
values ('Legacy Owner', 'owner@example.test');

insert into public.projects (name, description, created_by)
values ('Legacy project', 'Backfill validation row', '00000000-0000-4000-8000-000000000001');
