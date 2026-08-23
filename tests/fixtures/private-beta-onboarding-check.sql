\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-4000-8000-000000000002',
  'tester@example.test',
  '{"name":"Beta Tester"}'::jsonb
);

do $$
declare
  readiness jsonb;
  workspace_count integer;
  project_count integer;
  task_count integer;
  event_count integer;
begin
  readiness := public.private_beta_readiness();

  if not coalesce((readiness ->> 'ready')::boolean, false) then
    raise exception 'Private beta readiness failed: %', readiness;
  end if;

  select count(*) into workspace_count
  from public.workspace_members
  where user_id = '00000000-0000-4000-8000-000000000002';

  select count(*) into project_count
  from public.projects
  where workspace_id in (
    select workspace_id from public.workspace_members
    where user_id = '00000000-0000-4000-8000-000000000002'
  );

  select count(*) into task_count
  from public.tasks
  where workspace_id in (
    select workspace_id from public.workspace_members
    where user_id = '00000000-0000-4000-8000-000000000002'
  );

  select count(*) into event_count
  from public.events
  where workspace_id in (
    select workspace_id from public.workspace_members
    where user_id = '00000000-0000-4000-8000-000000000002'
  );

  if workspace_count <> 1 or project_count <> 1 or task_count <> 2 or event_count <> 1 then
    raise exception
      'Unexpected starter data: workspaces %, projects %, tasks %, events %',
      workspace_count, project_count, task_count, event_count;
  end if;

  raise notice
    'PASS: invited user received one private workspace and fictional starter content';
end;
$$;

rollback;
