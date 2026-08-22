import { DEMO_USER_EMAIL, DEMO_USER_ID } from './config'

export type DemoRecord = Record<string, unknown> & { id: string }
export type DemoDatabase = Record<string, DemoRecord[]>

const isoDate = (offsetDays: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

const now = () => new Date().toISOString()

export function createDemoSeedData(): DemoDatabase {
  const timestamp = now()

  const personnel: DemoRecord[] = [
    { id: DEMO_USER_ID, user_id: DEMO_USER_ID, name: 'Alex Morgan', email: DEMO_USER_EMAIL, phone: '+63 917 555 0101', position: 'Project Manager', role: 'admin', department: 'Project Delivery', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Sarah Johnson', email: 'sarah.johnson@example.test', phone: '+63 917 555 0102', position: 'Site Engineer', role: 'member', department: 'Engineering', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Mike Davis', email: 'mike.davis@example.test', phone: '+63 917 555 0103', position: 'Civil Engineer', role: 'member', department: 'Engineering', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Emily Chen', email: 'emily.chen@example.test', phone: '+63 917 555 0104', position: 'Design Engineer', role: 'member', department: 'Design', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'David Rodriguez', email: 'david.rodriguez@example.test', phone: '+63 917 555 0105', position: 'Safety Officer', role: 'member', department: 'Safety', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Lisa Wang', email: 'lisa.wang@example.test', phone: '+63 917 555 0106', position: 'Quality Engineer', role: 'member', department: 'Quality', status: 'active', avatar_url: null, created_at: timestamp, updated_at: timestamp },
  ]

  const projects: DemoRecord[] = [
    { id: '450e8400-e29b-41d4-a716-446655440001', name: 'North District Substation Upgrade', description: 'Modernization of protection, control, and distribution equipment for a growing commercial district.', start_date: isoDate(-110), end_date: isoDate(80), status: 'in-progress', location: 'North District, Metro Manila', client: 'MetroGrid Utilities', progress: 68, team_size: 12, budget: 2500000, spent: 1625000, priority: 'high', category: 'Electrical Infrastructure', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '450e8400-e29b-41d4-a716-446655440002', name: 'Riverside Solar Microgrid', description: 'Solar generation, battery storage, and resilient distribution for a riverside community campus.', start_date: isoDate(-65), end_date: isoDate(145), status: 'in-progress', location: 'Riverside District', client: 'Riverside Development Council', progress: 42, team_size: 8, budget: 1800000, spent: 720000, priority: 'high', category: 'Renewable Energy', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '450e8400-e29b-41d4-a716-446655440003', name: 'Green Valley Distribution Network', description: 'Completed medium-voltage distribution and smart metering rollout for a residential development.', start_date: isoDate(-280), end_date: isoDate(-35), status: 'completed', location: 'Green Valley', client: 'Valley Homes', progress: 100, team_size: 15, budget: 3200000, spent: 3120000, priority: 'medium', category: 'Distribution', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '450e8400-e29b-41d4-a716-446655440004', name: 'Technology Campus Power System', description: 'Primary and standby power design for a manufacturing and research campus.', start_date: isoDate(15), end_date: isoDate(250), status: 'planning', location: 'East Industrial Park', client: 'TechCore Industries', progress: 15, team_size: 10, budget: 4500000, spent: 675000, priority: 'high', category: 'Industrial', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '450e8400-e29b-41d4-a716-446655440005', name: 'Central Bridge Lighting Retrofit', description: 'Energy-efficient roadway, architectural, and emergency lighting retrofit for a landmark bridge.', start_date: isoDate(-90), end_date: isoDate(35), status: 'in-progress', location: 'Central City', client: 'City Public Works', progress: 76, team_size: 6, budget: 1200000, spent: 900000, priority: 'medium', category: 'Public Infrastructure', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '450e8400-e29b-41d4-a716-446655440006', name: 'Lakeside Community Center', description: 'Efficient electrical, emergency-power, and building-management systems for a multipurpose center.', start_date: isoDate(30), end_date: isoDate(210), status: 'planning', location: 'Lakeside Community', client: 'Lakeside Municipality', progress: 5, team_size: 7, budget: 980000, spent: 49000, priority: 'medium', category: 'Commercial', created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
  ]

  const tasks: DemoRecord[] = [
    { id: '350e8400-e29b-41d4-a716-446655440001', project_id: projects[0].id, title: 'Protection relay coordination study', name: 'Protection relay coordination study', description: 'Validate selectivity and issue final protection settings.', due_date: isoDate(-18), start_date: isoDate(-75), end_date: isoDate(-18), status: 'completed', priority: 'high', assigned_to: personnel[3].id, assignee: personnel[3].name, estimated_hours: 120, progress: 100, phase: 'Engineering', category: 'design', duration: 57, gantt_position: 1, dependencies: [], notes: 'Final settings approved by the utility.', completed_at: isoDate(-20), created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440002', project_id: projects[0].id, title: 'Install 13.8 kV switchgear', name: 'Install 13.8 kV switchgear', description: 'Position, align, terminate, and test the new lineup.', due_date: isoDate(5), start_date: isoDate(-20), end_date: isoDate(5), status: 'in-progress', priority: 'high', assigned_to: personnel[1].id, assignee: personnel[1].name, estimated_hours: 240, progress: 72, phase: 'Construction', category: 'installation', duration: 25, gantt_position: 2, dependencies: [tasksId(1)], notes: 'Equipment installation is on schedule.', completed_at: null, created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440003', project_id: projects[0].id, title: 'SCADA point-to-point testing', name: 'SCADA point-to-point testing', description: 'Verify telemetry, alarms, controls, and historian tags.', due_date: isoDate(18), start_date: isoDate(7), end_date: isoDate(18), status: 'todo', priority: 'high', assigned_to: personnel[2].id, assignee: personnel[2].name, estimated_hours: 80, progress: 0, phase: 'Commissioning', category: 'testing', duration: 11, gantt_position: 3, dependencies: [tasksId(2)], notes: '', completed_at: null, created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440004', project_id: projects[1].id, title: 'PV array structural survey', name: 'PV array structural survey', description: 'Confirm roof zones and mounting loads.', due_date: isoDate(-8), start_date: isoDate(-40), end_date: isoDate(-8), status: 'completed', priority: 'medium', assigned_to: personnel[2].id, assignee: personnel[2].name, estimated_hours: 60, progress: 100, phase: 'Site Assessment', category: 'survey', duration: 32, gantt_position: 1, dependencies: [], notes: 'All roof zones cleared.', completed_at: isoDate(-9), created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440005', project_id: projects[1].id, title: 'Battery enclosure and HVAC', name: 'Battery enclosure and HVAC', description: 'Complete enclosure fit-out and environmental controls.', due_date: isoDate(2), start_date: isoDate(-12), end_date: isoDate(2), status: 'in-progress', priority: 'high', assigned_to: personnel[1].id, assignee: personnel[1].name, estimated_hours: 100, progress: 60, phase: 'Construction', category: 'installation', duration: 14, gantt_position: 2, dependencies: [tasksId(4)], notes: 'Cooling equipment arrived on site.', completed_at: null, created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440006', project_id: projects[3].id, title: 'Short-circuit and load-flow model', name: 'Short-circuit and load-flow model', description: 'Develop the basis-of-design electrical model.', due_date: isoDate(7), start_date: isoDate(-4), end_date: isoDate(7), status: 'in-progress', priority: 'high', assigned_to: personnel[3].id, assignee: personnel[3].name, estimated_hours: 72, progress: 35, phase: 'Planning', category: 'design', duration: 11, gantt_position: 1, dependencies: [], notes: 'Awaiting final motor schedule.', completed_at: null, created_at: timestamp, updated_at: timestamp },
    { id: '350e8400-e29b-41d4-a716-446655440007', project_id: projects[4].id, title: 'Lighting control cabinet installation', name: 'Lighting control cabinet installation', description: 'Install programmable cabinets and feeder interfaces.', due_date: isoDate(28), start_date: isoDate(-6), end_date: isoDate(28), status: 'in-progress', priority: 'medium', assigned_to: personnel[1].id, assignee: personnel[1].name, estimated_hours: 96, progress: 80, phase: 'Construction', category: 'installation', duration: 34, gantt_position: 1, dependencies: [], notes: 'Night work permits confirmed.', completed_at: null, created_at: timestamp, updated_at: timestamp },
  ]

  const events: DemoRecord[] = [
    { id: '250e8400-e29b-41d4-a716-446655440001', title: 'Weekly portfolio review', description: 'Review milestones, risks, and upcoming energization work.', date: isoDate(1), time: '10:00:00', type: 'meeting', project_id: projects[0].id, location: 'Project Office', attendees: ['Alex Morgan', 'Sarah Johnson', 'Emily Chen'], created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '250e8400-e29b-41d4-a716-446655440002', title: 'Site safety walk', description: 'Joint inspection of lifting and access controls.', date: isoDate(3), time: '08:30:00', type: 'inspection', project_id: projects[1].id, location: 'Riverside Site', attendees: ['David Rodriguez', 'Site Team'], created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
    { id: '250e8400-e29b-41d4-a716-446655440003', title: 'Switchgear factory acceptance review', description: 'Close remaining FAT comments with the supplier.', date: isoDate(6), time: '14:00:00', type: 'review', project_id: projects[0].id, location: 'Online Conference', attendees: ['Alex Morgan', 'Supplier Team'], created_by: DEMO_USER_ID, created_at: timestamp, updated_at: timestamp },
  ]

  const reports: DemoRecord[] = [
    { id: '050e8400-e29b-41d4-a716-446655440001', project_id: projects[0].id, file_name: 'substation_weekly_progress.pdf', file_path: 'demo/substation_weekly_progress.pdf', file_type: 'application/pdf', mime_type: 'application/pdf', file_size: 2840576, category: 'Progress Report', status: 'approved', description: 'Weekly progress, constraints, safety performance, and upcoming work.', uploaded_by: personnel[0].id, uploaded_at: timestamp, uploader_name: personnel[0].name, uploader_position: personnel[0].position, assigned_reviewer: personnel[3].id, reviewer_notes: 'Clear summary and supporting evidence.', title: 'Substation Weekly Progress' },
    { id: '050e8400-e29b-41d4-a716-446655440002', project_id: projects[1].id, file_name: 'microgrid_safety_review.pdf', file_path: 'demo/microgrid_safety_review.pdf', file_type: 'application/pdf', mime_type: 'application/pdf', file_size: 1950432, category: 'Safety Report', status: 'pending', description: 'Battery installation safety review and corrective actions.', uploaded_by: personnel[4].id, uploaded_at: timestamp, uploader_name: personnel[4].name, uploader_position: personnel[4].position, assigned_reviewer: personnel[0].id, reviewer_notes: null, title: 'Battery Installation Safety Review' },
    { id: '050e8400-e29b-41d4-a716-446655440003', project_id: projects[4].id, file_name: 'bridge_lighting_design.pdf', file_path: 'demo/bridge_lighting_design.pdf', file_type: 'application/pdf', mime_type: 'application/pdf', file_size: 3120640, category: 'Technical Report', status: 'approved', description: 'Lighting calculations, controls narrative, and emergency operating modes.', uploaded_by: personnel[3].id, uploaded_at: timestamp, uploader_name: personnel[3].name, uploader_position: personnel[3].position, assigned_reviewer: personnel[0].id, reviewer_notes: 'Approved for construction.', title: 'Bridge Lighting Design' },
  ]

  const milestones: DemoRecord[] = [
    { id: '150e8400-e29b-41d4-a716-446655440001', project_id: projects[0].id, name: 'Protection design approved', target_date: isoDate(-20), actual_date: isoDate(-21), completed: true, description: 'Utility approval of protection philosophy and settings.' },
    { id: '150e8400-e29b-41d4-a716-446655440002', project_id: projects[0].id, name: 'Ready for energization', target_date: isoDate(22), actual_date: null, completed: false, description: 'All pre-energization checks and documentation complete.' },
    { id: '150e8400-e29b-41d4-a716-446655440003', project_id: projects[1].id, name: 'Battery system commissioned', target_date: isoDate(60), actual_date: null, completed: false, description: 'Battery, PCS, controls, and protection commissioned.' },
  ]

  return {
    personnel,
    projects,
    tasks,
    events,
    reports,
    photos: [],
    photos_with_uploader_names: [],
    milestones,
    notifications: [],
    report_reviewers: [],
    user_profiles: [],
  }
}

function tasksId(index: number) {
  return `350e8400-e29b-41d4-a716-44665544000${index}`
}
