-- Abuse controls and onboarding safeguards for the invite-only ProjTrack beta.
-- Apply only after 202608230001_private_beta_workspaces.sql.

begin;

create table if not exists private.write_rate_windows (
  user_id uuid not null,
  window_started_at timestamptz not null,
  write_count integer not null default 0,
  primary key (user_id, window_started_at)
);

revoke all on private.write_rate_windows from public, anon, authenticated;

create or replace function private.enforce_private_beta_write_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_window timestamptz := date_trunc('minute', now());
  current_count integer;
begin
  -- Trusted migrations and server maintenance do not carry an end-user uid.
  if actor_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  insert into private.write_rate_windows (user_id, window_started_at, write_count)
  values (actor_id, current_window, 1)
  on conflict (user_id, window_started_at) do update
    set write_count = private.write_rate_windows.write_count + 1
  returning write_count into current_count;

  if current_count > 120 then
    raise exception 'Private beta write limit exceeded. Try again in one minute.'
      using errcode = 'P0001';
  end if;

  delete from private.write_rate_windows
  where user_id = actor_id
    and window_started_at < now() - interval '15 minutes';

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.enforce_private_beta_write_rate() from public, anon, authenticated;

create or replace function private.enforce_private_beta_content_limits()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  payload jsonb := to_jsonb(new);
  field_name text;
begin
  foreach field_name in array array['name', 'title'] loop
    if char_length(coalesce(payload ->> field_name, '')) > 160 then
      raise exception '% must be 160 characters or fewer', field_name using errcode = '22001';
    end if;
  end loop;

  foreach field_name in array array['description', 'notes', 'reviewer_notes'] loop
    if char_length(coalesce(payload ->> field_name, '')) > 5000 then
      raise exception '% must be 5000 characters or fewer', field_name using errcode = '22001';
    end if;
  end loop;

  if char_length(coalesce(payload ->> 'message', '')) > 1000 then
    raise exception 'message must be 1000 characters or fewer' using errcode = '22001';
  end if;

  foreach field_name in array array['email', 'phone', 'position', 'department', 'location', 'client', 'file_name'] loop
    if char_length(coalesce(payload ->> field_name, '')) > 255 then
      raise exception '% must be 255 characters or fewer', field_name using errcode = '22001';
    end if;
  end loop;

  if jsonb_typeof(payload -> 'attendees') = 'array'
     and jsonb_array_length(payload -> 'attendees') > 25 then
    raise exception 'An event may contain at most 25 attendees' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_private_beta_content_limits() from public, anon, authenticated;

create or replace function private.enforce_private_beta_row_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_value uuid := nullif(to_jsonb(new) ->> 'workspace_id', '')::uuid;
  allowed_rows integer := tg_argv[0]::integer;
  existing_rows bigint;
begin
  if workspace_value is null then
    raise exception 'workspace_id is required' using errcode = '23502';
  end if;

  execute format(
    'select count(*) from %I.%I where workspace_id = $1',
    tg_table_schema,
    tg_table_name
  )
  into existing_rows
  using workspace_value;

  if existing_rows >= allowed_rows then
    raise exception 'Private beta % quota reached for this workspace (maximum %)', tg_table_name, allowed_rows
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_private_beta_row_quota() from public, anon, authenticated;

do $$
declare
  application_table text;
  row_limit integer;
begin
  foreach application_table in array array[
    'projects', 'personnel', 'tasks', 'reports', 'notifications', 'events',
    'photos', 'milestones', 'fcm_tokens', 'report_reviewers',
    'user_profiles', 'project_assignments'
  ]
  loop
    if to_regclass(format('public.%I', application_table)) is null then
      continue;
    end if;

    execute format('drop trigger if exists private_beta_write_rate on public.%I', application_table);
    execute format(
      'create trigger private_beta_write_rate before insert or update or delete on public.%I for each row execute function private.enforce_private_beta_write_rate()',
      application_table
    );

    execute format('drop trigger if exists private_beta_content_limits on public.%I', application_table);
    execute format(
      'create trigger private_beta_content_limits before insert or update on public.%I for each row execute function private.enforce_private_beta_content_limits()',
      application_table
    );

    row_limit := case application_table
      when 'projects' then 20
      when 'personnel' then 30
      when 'tasks' then 300
      when 'reports' then 75
      when 'notifications' then 500
      when 'events' then 200
      when 'photos' then 150
      when 'milestones' then 200
      when 'fcm_tokens' then 5
      when 'report_reviewers' then 300
      when 'user_profiles' then 5
      when 'project_assignments' then 200
      else null
    end;

    if row_limit is not null then
      execute format('drop trigger if exists private_beta_row_quota on public.%I', application_table);
      execute format(
        'create trigger private_beta_row_quota before insert on public.%I for each row execute function private.enforce_private_beta_row_quota(%L)',
        application_table,
        row_limit
      );
    end if;
  end loop;
end;
$$;

-- New personal workspaces receive small, fictional starter content. The rows
-- are ordinary tenant rows and may be edited or deleted by the workspace owner.
create or replace function private.seed_private_beta_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample_project_id uuid;
begin
  insert into public.projects (
    workspace_id, name, description, start_date, end_date, status, location,
    client, progress, team_size, created_by, budget, spent, priority, category
  )
  values (
    new.id,
    '[Sample] Substation Modernization',
    'Fictional starter project. Edit or delete it while evaluating ProjTrack.',
    current_date - 14,
    current_date + 75,
    'in-progress',
    'Demo Site',
    'Fictional Utility',
    25,
    4,
    new.created_by,
    250000,
    62500,
    'high',
    'Industrial'
  )
  returning id into sample_project_id;

  insert into public.tasks (
    workspace_id, project_id, title, name, description, start_date, end_date,
    due_date, status, priority, estimated_hours, progress, phase, category,
    duration, dependencies, gantt_position
  )
  values
    (new.id, sample_project_id, 'Review protection settings', 'Review protection settings', 'Validate coordination assumptions and document findings.', current_date - 7, current_date + 7, current_date + 7, 'in-progress', 'high', 24, 40, 'Engineering', 'planning', 14, array[]::text[], 1),
    (new.id, sample_project_id, 'Prepare commissioning plan', 'Prepare commissioning plan', 'Create a fictional commissioning sequence for evaluation.', current_date + 8, current_date + 25, current_date + 25, 'todo', 'medium', 32, 0, 'Commissioning', 'planning', 17, array[]::text[], 2);

  insert into public.events (
    workspace_id, title, description, date, time, type, project_id, location,
    attendees, created_by
  )
  values (
    new.id,
    'Sample design review',
    'Fictional calendar event created for private-beta evaluation.',
    current_date + 7,
    time '09:00',
    'review',
    sample_project_id,
    'Online',
    array['Private beta tester'],
    new.created_by
  );

  return new;
end;
$$;

revoke all on function private.seed_private_beta_workspace() from public, anon, authenticated;
drop trigger if exists on_private_beta_workspace_created on public.workspaces;
create trigger on_private_beta_workspace_created
  after insert on public.workspaces
  for each row execute function private.seed_private_beta_workspace();

-- Tight single-file limits and a small aggregate object count make abuse hit a
-- hard denial instead of creating paid usage. File content is also restricted
-- in the application before Storage receives it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-documents', 'project-documents', false, 5242880, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']),
  ('project-photos', 'project-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-pictures', 'profile-pictures', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-files', 'project-files', false, 5242880, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']),
  ('report-attachments', 'report-attachments', false, 5242880, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.workspace_storage_quota_allows(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_workspace_storage_path(object_name))
    and (
      select count(*) < 60
      from storage.objects object_row
      where object_row.bucket_id in (
        'project-documents', 'project-photos', 'project-files', 'report-attachments'
      )
        and split_part(object_row.name, '/', 1) = split_part(object_name, '/', 1)
    );
$$;

revoke all on function private.workspace_storage_quota_allows(text) from public, anon;
grant execute on function private.workspace_storage_quota_allows(text) to authenticated;

create or replace function private.avatar_storage_quota_allows(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    split_part(object_name, '/', 1) = (select auth.uid())::text
    and (
      select count(*) < 3
      from storage.objects avatar
      where avatar.bucket_id in ('avatars', 'profile-pictures')
        and split_part(avatar.name, '/', 1) = (select auth.uid())::text
    );
$$;

revoke all on function private.avatar_storage_quota_allows(text) from public, anon;
grant execute on function private.avatar_storage_quota_allows(text) to authenticated;

drop policy if exists private_beta_storage_insert on storage.objects;
create policy private_beta_storage_insert
  on storage.objects for insert to authenticated
  with check (
    (
      bucket_id in ('project-documents', 'project-photos', 'project-files', 'report-attachments')
      and (select private.workspace_storage_quota_allows(name))
    )
    or (
      bucket_id in ('avatars', 'profile-pictures')
      and (select private.avatar_storage_quota_allows(name))
    )
  );

-- Service-role-only readiness result used by the local owner CLI. Authenticated
-- browser users cannot call this function or inspect security configuration.
create or replace function public.private_beta_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  core_tables_secure boolean;
  policies_secure boolean;
  buckets_secure boolean;
  guards_present boolean;
begin
  select count(*) = 6
  into core_tables_secure
  from information_schema.columns column_info
  join pg_class relation on relation.relname = column_info.table_name
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where column_info.table_schema = 'public'
    and column_info.table_name in ('projects', 'personnel', 'tasks', 'reports', 'events', 'photos')
    and column_info.column_name = 'workspace_id'
    and column_info.is_nullable = 'NO'
    and namespace.nspname = 'public'
    and relation.relrowsecurity;

  select not exists (
    select 1
    from pg_policies
    where (
      (schemaname = 'public' and tablename in ('workspaces', 'workspace_members', 'projects', 'personnel', 'tasks', 'reports', 'notifications', 'events', 'photos', 'milestones', 'fcm_tokens', 'report_reviewers', 'user_profiles', 'project_assignments'))
      or (schemaname = 'storage' and tablename = 'objects')
    )
      and (
        roles && array['anon'::name, 'public'::name]
        or lower(coalesce(qual, '')) in ('true', '(true)')
        or lower(coalesce(with_check, '')) in ('true', '(true)')
      )
  ) into policies_secure;

  select count(*) = 6
  into buckets_secure
  from storage.buckets bucket
  where bucket.id in ('project-documents', 'project-photos', 'avatars', 'profile-pictures', 'project-files', 'report-attachments')
    and not bucket.public
    and bucket.file_size_limit <= case
      when bucket.id = 'project-photos' then 3145728
      when bucket.id in ('avatars', 'profile-pictures') then 2097152
      else 5242880
    end;

  select count(*) = 18
  into guards_present
  from (
    select distinct event_object_table, trigger_name
    from information_schema.triggers
    where trigger_schema = 'public'
      and trigger_name in ('private_beta_write_rate', 'private_beta_content_limits', 'private_beta_row_quota')
      and event_object_table in ('projects', 'personnel', 'tasks', 'reports', 'events', 'photos')
  ) guard;

  return jsonb_build_object(
    'ready', core_tables_secure and policies_secure and buckets_secure and guards_present,
    'core_tables_secure', core_tables_secure,
    'policies_secure', policies_secure,
    'buckets_secure', buckets_secure,
    'guards_present', guards_present
  );
end;
$$;

revoke all on function public.private_beta_readiness() from public, anon, authenticated;
grant execute on function public.private_beta_readiness() to service_role;

commit;
