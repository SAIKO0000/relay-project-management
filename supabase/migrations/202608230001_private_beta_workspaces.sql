-- Private beta tenant isolation for ProjTrack.
--
-- IMPORTANT:
--   1. Back up the target Supabase project before applying this migration.
--   2. Apply only to the dedicated private-beta project, never the public demo.
--   3. Disable public sign-ups in Supabase Auth and invite approved users only.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  is_default boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create unique index if not exists workspace_members_one_default_per_user
  on public.workspace_members (user_id)
  where is_default;
create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id, workspace_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin')
  );
$$;

create or replace function private.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.workspace_id
  from public.workspace_members member
  where member.user_id = (select auth.uid())
  order by member.is_default desc, member.joined_at, member.workspace_id
  limit 1;
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_admin(uuid) from public, anon;
revoke all on function private.current_workspace_id() from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.current_workspace_id() to authenticated;

drop policy if exists private_beta_workspaces_select on public.workspaces;
drop policy if exists private_beta_workspaces_update on public.workspaces;
drop policy if exists private_beta_workspaces_delete on public.workspaces;
create policy private_beta_workspaces_select
  on public.workspaces for select to authenticated
  using ((select private.is_workspace_member(id)));
create policy private_beta_workspaces_update
  on public.workspaces for update to authenticated
  using ((select private.is_workspace_admin(id)))
  with check ((select private.is_workspace_admin(id)));
create policy private_beta_workspaces_delete
  on public.workspaces for delete to authenticated
  using (
    exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = id
        and member.user_id = (select auth.uid())
        and member.role = 'owner'
    )
  );

drop policy if exists private_beta_members_select on public.workspace_members;
drop policy if exists private_beta_members_insert on public.workspace_members;
drop policy if exists private_beta_members_update on public.workspace_members;
drop policy if exists private_beta_members_delete on public.workspace_members;
create policy private_beta_members_select
  on public.workspace_members for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy private_beta_members_insert
  on public.workspace_members for insert to authenticated
  with check ((select private.is_workspace_admin(workspace_id)));
create policy private_beta_members_update
  on public.workspace_members for update to authenticated
  using ((select private.is_workspace_admin(workspace_id)))
  with check ((select private.is_workspace_admin(workspace_id)));
create policy private_beta_members_delete
  on public.workspace_members for delete to authenticated
  using ((select private.is_workspace_admin(workspace_id)));

revoke all on public.workspaces, public.workspace_members from anon;
grant select, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;

alter table public.personnel
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Add tenant columns before provisioning users so signup triggers can always
-- write an explicit workspace_id, including when an admin sends an invitation.
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
    'user_profiles',
    'project_assignments'
  ]
  loop
    if to_regclass(format('public.%I', application_table)) is not null then
      execute format(
        'alter table public.%I add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade',
        application_table
      );
      execute format(
        'alter table public.%I alter column workspace_id set default private.current_workspace_id()',
        application_table
      );
    end if;
  end loop;
end;
$$;

create or replace function private.provision_private_beta_user(
  target_user_id uuid,
  target_email text,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  provisioned_workspace_id uuid;
  display_name text;
begin
  select member.workspace_id
  into provisioned_workspace_id
  from public.workspace_members member
  where member.user_id = target_user_id
  order by member.is_default desc, member.joined_at, member.workspace_id
  limit 1;

  if provisioned_workspace_id is null then
    display_name := coalesce(
      nullif(trim(target_metadata ->> 'name'), ''),
      nullif(split_part(coalesce(target_email, ''), '@', 1), ''),
      'Private beta user'
    );

    insert into public.workspaces (name, created_by)
    values (left(display_name || '''s workspace', 100), target_user_id)
    returning id into provisioned_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role, is_default)
    values (provisioned_workspace_id, target_user_id, 'owner', true);
  end if;

  -- Link an existing personnel record when possible; otherwise create one.
  update public.personnel
  set user_id = target_user_id,
      workspace_id = coalesce(workspace_id, provisioned_workspace_id)
  where user_id is null
    and target_email is not null
    and lower(email) = lower(target_email);

  if not exists (select 1 from public.personnel where user_id = target_user_id) then
    insert into public.personnel (name, email, position, phone, user_id, workspace_id)
    values (
      coalesce(nullif(trim(target_metadata ->> 'name'), ''), split_part(target_email, '@', 1), 'Private beta user'),
      target_email,
      nullif(trim(target_metadata ->> 'position'), ''),
      nullif(trim(target_metadata ->> 'phone'), ''),
      target_user_id,
      provisioned_workspace_id
    )
    on conflict (email) do nothing;
  end if;

  if to_regclass('public.user_profiles') is not null then
    execute $profile$
      insert into public.user_profiles (id, email, name, workspace_id)
      values ($1, $2, $3, $4)
      on conflict (id) do update
      set email = excluded.email,
          name = coalesce(user_profiles.name, excluded.name),
          workspace_id = coalesce(user_profiles.workspace_id, excluded.workspace_id)
    $profile$
    using
      target_user_id,
      target_email,
      coalesce(nullif(trim(target_metadata ->> 'name'), ''), split_part(target_email, '@', 1), 'Private beta user'),
      provisioned_workspace_id;
  end if;

  return provisioned_workspace_id;
end;
$$;

revoke all on function private.provision_private_beta_user(uuid, text, jsonb)
  from public, anon, authenticated;

create or replace function private.handle_new_private_beta_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_private_beta_user(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

revoke all on function private.handle_new_private_beta_user()
  from public, anon, authenticated;

-- Replace the legacy profile trigger. It did not write workspace_id and would
-- make admin invitations fail after the tenant column becomes NOT NULL.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_private_beta_user_created on auth.users;
create trigger on_private_beta_user_created
  after insert on auth.users
  for each row execute function private.handle_new_private_beta_user();

-- Give every existing Auth user an isolated personal workspace before data
-- backfill. New invited users are handled by the trigger above.
do $$
declare
  existing_user record;
begin
  for existing_user in
    select id, email, raw_user_meta_data
    from auth.users
    order by created_at, id
  loop
    perform private.provision_private_beta_user(
      existing_user.id,
      existing_user.email,
      existing_user.raw_user_meta_data
    );
  end loop;
end;
$$;

-- Backfill root records from their owning users. Orphaned legacy rows go only
-- to the oldest existing owner workspace; they are never exposed to all users.
do $$
declare
  fallback_workspace_id uuid;
begin
  select id into fallback_workspace_id
  from public.workspaces
  order by created_at, id
  limit 1;

  if to_regclass('public.projects') is not null then
    update public.projects project
    set workspace_id = coalesce(
      (
        select member.workspace_id
        from public.workspace_members member
        where member.user_id = project.created_by
        order by member.is_default desc, member.joined_at
        limit 1
      ),
      fallback_workspace_id
    )
    where project.workspace_id is null;
  end if;

  if to_regclass('public.personnel') is not null then
    update public.personnel person
    set workspace_id = coalesce(
      (
        select member.workspace_id
        from public.workspace_members member
        where member.user_id = person.user_id
        order by member.is_default desc, member.joined_at
        limit 1
      ),
      fallback_workspace_id
    )
    where person.workspace_id is null;
  end if;

  if to_regclass('public.notifications') is not null then
    update public.notifications notification
    set workspace_id = coalesce(
      (
        select member.workspace_id
        from public.workspace_members member
        where member.user_id = notification.user_id
        order by member.is_default desc, member.joined_at
        limit 1
      ),
      fallback_workspace_id
    )
    where notification.workspace_id is null;
  end if;

  if to_regclass('public.fcm_tokens') is not null then
    update public.fcm_tokens token
    set workspace_id = coalesce(
      (
        select member.workspace_id
        from public.workspace_members member
        where member.user_id = token.user_id
        order by member.is_default desc, member.joined_at
        limit 1
      ),
      fallback_workspace_id
    )
    where token.workspace_id is null;
  end if;

  if to_regclass('public.user_profiles') is not null then
    update public.user_profiles profile
    set workspace_id = coalesce(
      (
        select member.workspace_id
        from public.workspace_members member
        where member.user_id = profile.id
        order by member.is_default desc, member.joined_at
        limit 1
      ),
      fallback_workspace_id
    )
    where profile.workspace_id is null;
  end if;

  if to_regclass('public.tasks') is not null then
    update public.tasks child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.reports') is not null then
    update public.reports child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.events') is not null then
    update public.events child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.photos') is not null then
    update public.photos child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.milestones') is not null then
    update public.milestones child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.report_reviewers') is not null then
    update public.report_reviewers child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.reports parent where parent.id = child.report_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;

  if to_regclass('public.project_assignments') is not null then
    update public.project_assignments child
    set workspace_id = coalesce(
      (select parent.workspace_id from public.projects parent where parent.id = child.project_id),
      fallback_workspace_id
    )
    where child.workspace_id is null;
  end if;
end;
$$;

-- Fail closed when existing data cannot be assigned. Because the migration is
-- transactional, a failure leaves the target database unchanged.
do $$
declare
  application_table text;
  unassigned_rows bigint;
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
    'user_profiles',
    'project_assignments'
  ]
  loop
    if to_regclass(format('public.%I', application_table)) is not null then
      execute format('select count(*) from public.%I where workspace_id is null', application_table)
      into unassigned_rows;

      if unassigned_rows > 0 then
        raise exception
          'Private beta migration stopped: % row(s) in public.% could not be assigned to a workspace. Create an owner Auth user, then retry.',
          unassigned_rows,
          application_table;
      end if;

      execute format('alter table public.%I alter column workspace_id set not null', application_table);
      execute format('create index if not exists %I on public.%I (workspace_id)', application_table || '_workspace_id_idx', application_table);
    end if;
  end loop;
end;
$$;

-- Remove all legacy table policies on tenant data. PostgreSQL combines
-- permissive policies with OR, so leaving one broad policy would defeat the
-- workspace boundary.
do $$
declare
  application_table text;
  existing_policy record;
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
    'user_profiles',
    'project_assignments'
  ]
  loop
    if to_regclass(format('public.%I', application_table)) is null then
      continue;
    end if;

    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = application_table
    loop
      execute format('drop policy %I on public.%I', existing_policy.policyname, application_table);
    end loop;

    execute format('alter table public.%I enable row level security', application_table);
    execute format('revoke all on public.%I from anon', application_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', application_table);

    if application_table in ('notifications', 'fcm_tokens') then
      execute format(
        'create policy private_beta_%1$s_select on public.%1$I for select to authenticated using ((select private.is_workspace_member(workspace_id)) and user_id = (select auth.uid()))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_insert on public.%1$I for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and user_id = (select auth.uid()))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_update on public.%1$I for update to authenticated using ((select private.is_workspace_member(workspace_id)) and user_id = (select auth.uid())) with check ((select private.is_workspace_member(workspace_id)) and user_id = (select auth.uid()))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_delete on public.%1$I for delete to authenticated using ((select private.is_workspace_member(workspace_id)) and user_id = (select auth.uid()))',
        application_table
      );
    elsif application_table = 'personnel' then
      execute 'create policy private_beta_personnel_select on public.personnel for select to authenticated using ((select private.is_workspace_member(workspace_id)))';
      execute 'create policy private_beta_personnel_insert on public.personnel for insert to authenticated with check ((select private.is_workspace_member(workspace_id)))';
      execute 'create policy private_beta_personnel_update on public.personnel for update to authenticated using ((select private.is_workspace_member(workspace_id)) and (user_id = (select auth.uid()) or (select private.is_workspace_admin(workspace_id)))) with check ((select private.is_workspace_member(workspace_id)) and (user_id = (select auth.uid()) or (select private.is_workspace_admin(workspace_id))))';
      execute 'create policy private_beta_personnel_delete on public.personnel for delete to authenticated using ((select private.is_workspace_admin(workspace_id)))';
    elsif application_table = 'user_profiles' then
      execute 'create policy private_beta_user_profiles_select on public.user_profiles for select to authenticated using ((select private.is_workspace_member(workspace_id)))';
      execute 'create policy private_beta_user_profiles_insert on public.user_profiles for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and id = (select auth.uid()))';
      execute 'create policy private_beta_user_profiles_update on public.user_profiles for update to authenticated using ((select private.is_workspace_member(workspace_id)) and id = (select auth.uid())) with check ((select private.is_workspace_member(workspace_id)) and id = (select auth.uid()))';
      execute 'create policy private_beta_user_profiles_delete on public.user_profiles for delete to authenticated using ((select private.is_workspace_member(workspace_id)) and id = (select auth.uid()))';
    else
      execute format(
        'create policy private_beta_%1$s_select on public.%1$I for select to authenticated using ((select private.is_workspace_member(workspace_id)))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_insert on public.%1$I for insert to authenticated with check ((select private.is_workspace_member(workspace_id)))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_update on public.%1$I for update to authenticated using ((select private.is_workspace_member(workspace_id))) with check ((select private.is_workspace_member(workspace_id)))',
        application_table
      );
      execute format(
        'create policy private_beta_%1$s_delete on public.%1$I for delete to authenticated using ((select private.is_workspace_member(workspace_id)))',
        application_table
      );
    end if;
  end loop;
end;
$$;

-- Existing aggregate/uploader views must obey the caller's RLS context.
do $$
declare
  application_view text;
begin
  foreach application_view in array array[
    'photos_with_uploader_names',
    'report_review_summary',
    'project_gantt_view'
  ]
  loop
    if to_regclass(format('public.%I', application_view)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', application_view);
      execute format('revoke all on public.%I from anon', application_view);
      execute format('grant select on public.%I to authenticated', application_view);
    end if;
  end loop;
end;
$$;

-- Storage access is based on the first path segment. New uploads must use:
--   <workspace_uuid>/<feature>/<generated_filename>
create or replace function private.is_workspace_storage_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.user_id = (select auth.uid())
      and member.workspace_id::text = split_part(object_name, '/', 1)
  );
$$;

create or replace function private.can_read_legacy_storage_object(
  object_bucket_id text,
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when object_bucket_id = 'project-documents' then exists (
      select 1
      from public.reports report
      where report.file_path = object_name
        and private.is_workspace_member(report.workspace_id)
    )
    when object_bucket_id = 'project-photos' then exists (
      select 1
      from public.photos photo
      where photo.storage_path = object_name
        and private.is_workspace_member(photo.workspace_id)
    )
    else false
  end;
$$;

create or replace function private.can_read_workspace_avatar(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.personnel person
    join public.workspace_members member
      on member.workspace_id = person.workspace_id
    where member.user_id = (select auth.uid())
      and person.user_id::text = split_part(object_name, '/', 1)
  );
$$;

revoke all on function private.is_workspace_storage_path(text) from public, anon;
revoke all on function private.can_read_legacy_storage_object(text, text) from public, anon;
revoke all on function private.can_read_workspace_avatar(text) from public, anon;
grant execute on function private.is_workspace_storage_path(text) to authenticated;
grant execute on function private.can_read_legacy_storage_object(text, text) to authenticated;
grant execute on function private.can_read_workspace_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-documents', 'project-documents', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']),
  ('project-photos', 'project-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-pictures', 'profile-pictures', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-files', 'project-files', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']),
  ('report-attachments', 'report-attachments', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', existing_policy.policyname);
  end loop;
end;
$$;

create policy private_beta_storage_select
  on storage.objects for select to authenticated
  using (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (
        (select private.is_workspace_storage_path(name))
        or (select private.can_read_legacy_storage_object(bucket_id, name))
      )
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and (
        split_part(name, '/', 1) = (select auth.uid())::text
        or (select private.can_read_workspace_avatar(name))
      )
    )
  );

create policy private_beta_storage_insert
  on storage.objects for insert to authenticated
  with check (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (select private.is_workspace_storage_path(name))
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

create policy private_beta_storage_update
  on storage.objects for update to authenticated
  using (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (
        (select private.is_workspace_storage_path(name))
        or (select private.can_read_legacy_storage_object(bucket_id, name))
      )
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  )
  with check (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (select private.is_workspace_storage_path(name))
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

create policy private_beta_storage_delete
  on storage.objects for delete to authenticated
  using (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (
        (select private.is_workspace_storage_path(name))
        or (select private.can_read_legacy_storage_object(bucket_id, name))
      )
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and split_part(name, '/', 1) = (select auth.uid())::text
    )
  );

commit;
