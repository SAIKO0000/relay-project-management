-- Read-only post-migration security audit for the dedicated private-beta
-- Supabase project. Run after 202608230001_private_beta_workspaces.sql.

do $$
declare
  insecure_item text;
begin
  if to_regclass('public.workspaces') is null
     or to_regclass('public.workspace_members') is null then
    raise exception 'Private beta workspace migration has not been applied';
  end if;

  select table_name
  into insecure_item
  from information_schema.columns column_info
  join pg_class relation on relation.relname = column_info.table_name
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where column_info.table_schema = 'public'
    and column_info.column_name = 'workspace_id'
    and namespace.nspname = 'public'
    and relation.relrowsecurity is false
  limit 1;

  if insecure_item is not null then
    raise exception 'RLS is disabled on tenant table public.%', insecure_item;
  end if;

  select format('%I.%I policy %I', schemaname, tablename, policyname)
  into insecure_item
  from pg_policies
  where (
    (
        schemaname = 'public'
        and tablename in (
          'workspaces', 'workspace_members', 'projects', 'personnel', 'tasks',
          'reports', 'notifications', 'events', 'photos', 'milestones',
          'fcm_tokens', 'report_reviewers', 'user_profiles', 'project_assignments'
        )
      )
      or (schemaname = 'storage' and tablename = 'objects')
    )
    and (
    roles && array['anon'::name, 'public'::name]
    or lower(coalesce(qual, '')) in ('true', '(true)')
    or lower(coalesce(with_check, '')) in ('true', '(true)')
    )
  limit 1;

  if insecure_item is not null then
    raise exception 'Broad or anonymous policy found: %', insecure_item;
  end if;

  select column_info.table_name
  into insecure_item
  from information_schema.columns column_info
  where column_info.table_schema = 'public'
    and column_info.column_name = 'workspace_id'
    and column_info.is_nullable = 'YES'
  limit 1;

  if insecure_item is not null then
    raise exception 'workspace_id is still nullable on public.%', insecure_item;
  end if;

  select bucket.id
  into insecure_item
  from storage.buckets bucket
  where bucket.id in (
    'project-documents', 'project-photos', 'avatars', 'profile-pictures',
    'project-files', 'report-attachments'
  )
    and bucket.public
  limit 1;

  if insecure_item is not null then
    raise exception 'Storage bucket % is public', insecure_item;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and not (roles <@ array['authenticated'::name])
  ) then
    raise exception 'A Storage policy applies to a role other than authenticated';
  end if;

  if exists (
    select 1
    from pg_views view_info
    join pg_class relation on relation.relname = view_info.viewname
    join pg_namespace namespace
      on namespace.oid = relation.relnamespace
      and namespace.nspname = view_info.schemaname
    where view_info.schemaname = 'public'
      and view_info.viewname in (
        'photos_with_uploader_names',
        'report_review_summary',
        'project_gantt_view'
      )
      and not coalesce(relation.reloptions, '{}'::text[]) @> array['security_invoker=true']
  ) then
    raise exception 'An exposed application view is not security_invoker';
  end if;

  raise notice 'PASS: private beta tables, policies, views, and Storage are fail-closed';
end;
$$;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd, policyname;
