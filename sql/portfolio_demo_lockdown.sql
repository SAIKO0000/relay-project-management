-- Run this only on the dedicated Supabase project used by the public portfolio.
-- It deliberately disables all browser access to application data. Demo Mode
-- runs from browser-local seed data, so the public deployment does not need it.

begin;

-- Keep future public-schema objects private until explicitly granted.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

create table if not exists public.portfolio_keepalive (
  id smallint primary key check (id = 1),
  label text not null default 'portfolio-demo'
);

insert into public.portfolio_keepalive (id)
values (1)
on conflict (id) do nothing;

alter table public.portfolio_keepalive enable row level security;
revoke all privileges on table public.portfolio_keepalive from anon, authenticated;
grant select on table public.portfolio_keepalive to anon;

drop policy if exists "Portfolio keepalive read" on public.portfolio_keepalive;
create policy "Portfolio keepalive read"
  on public.portfolio_keepalive
  for select
  to anon
  using (true);

do $$
declare
  application_table text;
begin
  foreach application_table in array array[
    'projects',
    'personnel',
    'tasks',
    'reports',
    'notifications',
    'events',
    'photos',
    'milestones',
    'fcm_tokens',
    'report_reviewers',
    'user_profiles'
  ]
  loop
    if to_regclass(format('public.%I', application_table)) is not null then
      execute format('alter table public.%I enable row level security', application_table);
      execute format(
        'revoke all privileges on table public.%I from anon, authenticated',
        application_table
      );
    end if;
  end loop;
end
$$;

do $$
declare
  public_object record;
begin
  for public_object in
    select schemaname, viewname
    from pg_views
    where schemaname = 'public'
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      public_object.schemaname,
      public_object.viewname
    );
  end loop;

  for public_object in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format(
      'revoke all privileges on sequence %I.%I from anon, authenticated',
      public_object.sequence_schema,
      public_object.sequence_name
    );
  end loop;

  for public_object in
    select p.oid::regprocedure::text as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format(
      'revoke execute on function %s from anon, authenticated, public',
      public_object.function_signature
    );
  end loop;
end
$$;

-- Storage is also private in the public portfolio project. Blob previews in
-- Demo Mode use browser object URLs and never reach this bucket.
update storage.buckets
set public = false
where id in ('project-documents', 'project-photos', 'avatars');

revoke all privileges on table storage.objects from anon, authenticated;

commit;
