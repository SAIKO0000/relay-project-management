-- User-visible Relay branding for private-beta starter workspaces.
-- Keep the previously applied isolation and safeguard migrations immutable.

begin;

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
    'Fictional starter project. Edit or delete it while evaluating Relay.',
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

update public.projects
set description = 'Fictional starter project. Edit or delete it while evaluating Relay.'
where name = '[Sample] Substation Modernization'
  and description = 'Fictional starter project. Edit or delete it while evaluating ProjTrack.';

commit;
