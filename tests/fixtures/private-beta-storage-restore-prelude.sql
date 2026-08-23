\set ON_ERROR_STOP on

create schema if not exists storage authorization postgres;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text,
  type text,
  versioning_status text
);

create table if not exists storage.objects (
  id uuid primary key,
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  version text,
  owner_id text,
  user_metadata jsonb,
  archived_at timestamptz,
  is_delete_marker boolean default false,
  is_versioned boolean default false
);

alter table storage.objects enable row level security;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;
