-- ===========================================
-- RELAY DEMO DATA SEEDING SCRIPT
-- ===========================================
-- Demo data for portfolio showcase
-- Contains realistic but fictional data

-- ===========================================
-- DEMO PERSONNEL DATA
-- ===========================================

INSERT INTO public.personnel (id, name, email, phone, position, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@example.com', '+1-555-0101', 'Project Manager', NULL),
('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@example.com', '+1-555-0102', 'Site Engineer', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'Mike Davis', 'mike.davis@example.com', '+1-555-0103', 'Civil Engineer', NULL),
('550e8400-e29b-41d4-a716-446655440004', 'Emily Chen', 'emily.chen@example.com', '+1-555-0104', 'Architect', NULL),
('550e8400-e29b-41d4-a716-446655440005', 'David Rodriguez', 'david.rodriguez@example.com', '+1-555-0105', 'Safety Inspector', NULL),
('550e8400-e29b-41d4-a716-446655440006', 'Lisa Wang', 'lisa.wang@example.com', '+1-555-0106', 'Quality Control', NULL),
('550e8400-e29b-41d4-a716-446655440007', 'Mark Thompson', 'mark.thompson@example.com', '+1-555-0107', 'Electrical Engineer', NULL),
('550e8400-e29b-41d4-a716-446655440008', 'Jennifer Brown', 'jennifer.brown@example.com', '+1-555-0108', 'Environmental Engineer', NULL)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- DEMO PROJECTS DATA
-- ===========================================

INSERT INTO public.projects (id, name, description, start_date, end_date, status, location, client, progress, team_size, budget, spent, priority, category) VALUES
(
    '450e8400-e29b-41d4-a716-446655440001',
    'Downtown Office Complex',
    'Modern 15-story office building with sustainable design features including solar panels, green roof systems, and energy-efficient HVAC systems. The project includes underground parking for 200 vehicles and retail space on the ground floor.',
    '2024-01-15',
    '2025-08-30',
    'in_progress',
    'Downtown Metro City',
    'Metro Development Corp',
    65,
    12,
    2500000.00,
    1625000.00,
    'high',
    'Commercial'
),
(
    '450e8400-e29b-41d4-a716-446655440002',
    'Riverside Elementary School',
    'New elementary school facility designed to accommodate 500 students with modern classrooms, computer labs, gymnasium, cafeteria, and library. Features include accessible design, energy-efficient systems, and outdoor learning spaces.',
    '2024-03-01',
    '2025-01-15',
    'in_progress',
    'Riverside District',
    'Riverside School Board',
    40,
    8,
    1800000.00,
    720000.00,
    'high',
    'Educational'
),
(
    '450e8400-e29b-41d4-a716-446655440003',
    'Green Valley Residential Complex',
    'Eco-friendly residential development with 50 townhouses featuring solar panels, rainwater harvesting systems, and community gardens. The project emphasizes sustainable living and community engagement.',
    '2024-02-01',
    '2024-12-31',
    'completed',
    'Green Valley Subdivision',
    'Valley Homes LLC',
    100,
    15,
    3200000.00,
    3200000.00,
    'medium',
    'Residential'
),
(
    '450e8400-e29b-41d4-a716-446655440004',
    'Tech Manufacturing Facility',
    'State-of-the-art manufacturing facility for electronics production with clean room environments, automated assembly lines, and advanced quality control systems. Includes research and development laboratories.',
    '2024-05-01',
    '2025-11-30',
    'planning',
    'Industrial Park East',
    'TechCorp Industries',
    15,
    10,
    4500000.00,
    675000.00,
    'high',
    'Industrial'
),
(
    '450e8400-e29b-41d4-a716-446655440005',
    'City Bridge Renovation',
    'Complete renovation of the historic City Bridge including structural reinforcement, deck replacement, and installation of LED lighting systems. Project preserves historical architecture while modernizing infrastructure.',
    '2024-04-15',
    '2024-10-15',
    'in_progress',
    'Central City',
    'City Municipal Works',
    75,
    6,
    1200000.00,
    900000.00,
    'medium',
    'Industrial'
),
(
    '450e8400-e29b-41d4-a716-446655440006',
    'Lakeside Community Center',
    'Multi-purpose community center with fitness facilities, meeting rooms, event hall, and senior center. Features sustainable design with geothermal heating and cooling systems.',
    '2024-06-01',
    '2025-03-31',
    'planning',
    'Lakeside Community',
    'Lakeside Municipality',
    5,
    7,
    980000.00,
    49000.00,
    'medium',
    'Commercial'
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- DEMO TASKS DATA
-- ===========================================

INSERT INTO public.tasks (id, project_id, title, description, due_date, status, priority, assigned_to, estimated_hours, start_date, end_date, progress, phase, category, duration, assignee, gantt_position, notes) VALUES
-- Downtown Office Complex Tasks
(
    '350e8400-e29b-41d4-a716-446655440001',
    '450e8400-e29b-41d4-a716-446655440001',
    'Foundation Excavation',
    'Complete excavation for building foundation including soil testing and preparation',
    '2024-03-15',
    'completed',
    'high',
    '550e8400-e29b-41d4-a716-446655440003',
    160,
    '2024-01-15',
    '2024-03-10',
    100,
    'Foundation',
    'construction',
    45,
    'Mike Davis',
    1,
    'Completed ahead of schedule. Soil conditions were better than expected.'
),
(
    '350e8400-e29b-41d4-a716-446655440002',
    '450e8400-e29b-41d4-a716-446655440001',
    'Steel Frame Installation',
    'Install structural steel framework for floors 1-8',
    '2024-06-30',
    'in_progress',
    'high',
    '550e8400-e29b-41d4-a716-446655440003',
    240,
    '2024-04-01',
    '2024-06-30',
    70,
    'Structure',
    'construction',
    90,
    'Mike Davis',
    2,
    'Weather delays caused minor schedule adjustments. Quality inspections passed.'
),
(
    '350e8400-e29b-41d4-a716-446655440003',
    '450e8400-e29b-41d4-a716-446655440001',
    'Electrical Rough-In',
    'Install electrical conduits and wiring for floors 1-5',
    '2024-08-15',
    'in_progress',
    'medium',
    '550e8400-e29b-41d4-a716-446655440007',
    120,
    '2024-07-01',
    '2024-08-15',
    45,
    'Systems',
    'construction',
    35,
    'Mark Thompson',
    3,
    'Coordination with HVAC team required for ceiling installations.'
),

-- Riverside Elementary School Tasks
(
    '350e8400-e29b-41d4-a716-446655440004',
    '450e8400-e29b-41d4-a716-446655440002',
    'Site Preparation',
    'Clear site, remove existing structures, and prepare for construction',
    '2024-04-15',
    'completed',
    'high',
    '550e8400-e29b-41d4-a716-446655440002',
    80,
    '2024-03-01',
    '2024-04-10',
    100,
    'Site Work',
    'pre-construction',
    30,
    'Sarah Johnson',
    1,
    'Environmental clearances obtained. All trees preserved as planned.'
),
(
    '350e8400-e29b-41d4-a716-446655440005',
    '450e8400-e29b-41d4-a716-446655440002',
    'Building Foundation',
    'Pour concrete foundation and install waterproofing systems',
    '2024-06-30',
    'in_progress',
    'high',
    '550e8400-e29b-41d4-a716-446655440003',
    100,
    '2024-05-01',
    '2024-06-30',
    60,
    'Foundation',
    'construction',
    45,
    'Mike Davis',
    2,
    'Foundation inspection scheduled for next week.'
),

-- Tech Manufacturing Facility Tasks
(
    '350e8400-e29b-41d4-a716-446655440006',
    '450e8400-e29b-41d4-a716-446655440004',
    'Environmental Impact Assessment',
    'Complete environmental studies and obtain necessary permits',
    '2024-07-30',
    'in_progress',
    'high',
    '550e8400-e29b-41d4-a716-446655440008',
    60,
    '2024-05-01',
    '2024-07-30',
    80,
    'Planning',
    'planning',
    90,
    'Jennifer Brown',
    1,
    'EPA consultation in progress. Initial results are favorable.'
),
(
    '350e8400-e29b-41d4-a716-446655440007',
    '450e8400-e29b-41d4-a716-446655440004',
    'Clean Room Design',
    'Design specifications for clean room environments and HVAC systems',
    '2024-08-30',
    'todo',
    'medium',
    '550e8400-e29b-41d4-a716-446655440004',
    80,
    '2024-08-01',
    '2024-08-30',
    0,
    'Design',
    'planning',
    30,
    'Emily Chen',
    2,
    'Waiting for client specifications on contamination control requirements.'
),

-- City Bridge Renovation Tasks
(
    '350e8400-e29b-41d4-a716-446655440008',
    '450e8400-e29b-41d4-a716-446655440005',
    'Structural Inspection',
    'Complete detailed structural analysis and safety assessment',
    '2024-05-15',
    'completed',
    'high',
    '550e8400-e29b-41d4-a716-446655440005',
    40,
    '2024-04-15',
    '2024-05-10',
    100,
    'Assessment',
    'planning',
    25,
    'David Rodriguez',
    1,
    'Inspection revealed better structural integrity than expected.'
),
(
    '350e8400-e29b-41d4-a716-446655440009',
    '450e8400-e29b-41d4-a716-446655440005',
    'Deck Replacement',
    'Remove old bridge deck and install new reinforced concrete surface',
    '2024-09-15',
    'in_progress',
    'high',
    '550e8400-e29b-41d4-a716-446655440003',
    120,
    '2024-07-01',
    '2024-09-15',
    80,
    'Construction',
    'construction',
    75,
    'Mike Davis',
    2,
    'Traffic management plan is working well. Minimal disruption to city traffic.'
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- DEMO EVENTS DATA
-- ===========================================

INSERT INTO public.events (id, title, description, date, time, type, project_id, location, attendees, created_by) VALUES
(
    '250e8400-e29b-41d4-a716-446655440001',
    'Weekly Progress Review',
    'Review project milestones and address any issues',
    '2024-09-15',
    '10:00:00',
    'meeting',
    '450e8400-e29b-41d4-a716-446655440001',
    'Downtown Office Complex - Site Office',
    ARRAY['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Chen'],
    NULL
),
(
    '250e8400-e29b-41d4-a716-446655440002',
    'Safety Training Session',
    'Monthly safety training for all site personnel',
    '2024-09-20',
    '14:00:00',
    'training',
    '450e8400-e29b-41d4-a716-446655440002',
    'Riverside Elementary School - Temporary Office',
    ARRAY['David Rodriguez', 'All Site Personnel'],
    NULL
),
(
    '250e8400-e29b-41d4-a716-446655440003',
    'Foundation Inspection',
    'City inspector review of foundation work',
    '2024-09-12',
    '09:00:00',
    'inspection',
    '450e8400-e29b-41d4-a716-446655440002',
    'Riverside Elementary School - Construction Site',
    ARRAY['Mike Davis', 'City Inspector', 'Sarah Johnson'],
    NULL
),
(
    '250e8400-e29b-41d4-a716-446655440004',
    'Steel Delivery',
    'Delivery of structural steel for floors 9-15',
    '2024-09-18',
    '08:00:00',
    'delivery',
    '450e8400-e29b-41d4-a716-446655440001',
    'Downtown Office Complex - Loading Area',
    ARRAY['Mike Davis', 'John Smith', 'Crane Operator'],
    NULL
),
(
    '250e8400-e29b-41d4-a716-446655440005',
    'Client Walkthrough',
    'Monthly client progress review and walkthrough',
    '2024-09-25',
    '11:00:00',
    'review',
    '450e8400-e29b-41d4-a716-446655440005',
    'City Bridge - Main Span',
    ARRAY['John Smith', 'Client Representative', 'David Rodriguez'],
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- DEMO MILESTONES DATA
-- ===========================================

INSERT INTO public.milestones (id, project_id, name, target_date, actual_date, completed, description) VALUES
(
    '150e8400-e29b-41d4-a716-446655440001',
    '450e8400-e29b-41d4-a716-446655440001',
    'Foundation Complete',
    '2024-03-15',
    '2024-03-10',
    true,
    'All foundation work including excavation, concrete pour, and curing completed'
),
(
    '150e8400-e29b-41d4-a716-446655440002',
    '450e8400-e29b-41d4-a716-446655440001',
    'Structural Frame - 50% Complete',
    '2024-06-30',
    NULL,
    false,
    'Steel frame installation for floors 1-8 completed'
),
(
    '150e8400-e29b-41d4-a716-446655440003',
    '450e8400-e29b-41d4-a716-446655440001',
    'Mechanical Rough-In Complete',
    '2024-09-30',
    NULL,
    false,
    'All HVAC, plumbing, and electrical rough-in work completed'
),
(
    '150e8400-e29b-41d4-a716-446655440004',
    '450e8400-e29b-41d4-a716-446655440002',
    'Site Preparation Complete',
    '2024-04-15',
    '2024-04-10',
    true,
    'Site cleared, utilities relocated, and ready for construction'
),
(
    '150e8400-e29b-41d4-a716-446655440005',
    '450e8400-e29b-41d4-a716-446655440002',
    'Foundation and Framing Complete',
    '2024-08-31',
    NULL,
    false,
    'Building foundation and structural framing completed'
),
(
    '150e8400-e29b-41d4-a716-446655440006',
    '450e8400-e29b-41d4-a716-446655440003',
    'Phase 1 Townhouses Complete',
    '2024-08-15',
    '2024-08-10',
    true,
    'First 25 townhouses completed and ready for occupancy'
),
(
    '150e8400-e29b-41d4-a716-446655440007',
    '450e8400-e29b-41d4-a716-446655440005',
    'Structural Assessment Complete',
    '2024-05-15',
    '2024-05-10',
    true,
    'Complete structural analysis and safety evaluation finished'
),
(
    '150e8400-e29b-41d4-a716-446655440008',
    '450e8400-e29b-41d4-a716-446655440005',
    'Deck Replacement 75% Complete',
    '2024-09-01',
    NULL,
    false,
    'Three quarters of bridge deck replacement completed'
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- DEMO REPORTS DATA (File references)
-- ===========================================

INSERT INTO public.reports (id, project_id, file_name, file_path, file_type, file_size, category, status, description, uploader_name, uploader_position, title) VALUES
(
    '050e8400-e29b-41d4-a716-446655440001',
    '450e8400-e29b-41d4-a716-446655440001',
    'weekly_progress_report_week_32.pdf',
    'project-documents/downtown-office/reports/weekly_progress_report_week_32.pdf',
    'application/pdf',
    2840576,
    'Progress Report',
    'approved',
    'Weekly progress summary including completed milestones, current activities, and upcoming tasks',
    'John Smith',
    'Project Manager',
    'Week 32 Progress Summary'
),
(
    '050e8400-e29b-41d4-a716-446655440002',
    '450e8400-e29b-41d4-a716-446655440001',
    'safety_inspection_august_2024.pdf',
    'project-documents/downtown-office/safety/safety_inspection_august_2024.pdf',
    'application/pdf',
    1950432,
    'Safety Report',
    'approved',
    'Monthly safety inspection report with recommendations and corrective actions',
    'David Rodriguez',
    'Safety Inspector',
    'August 2024 Safety Inspection'
),
(
    '050e8400-e29b-41d4-a716-446655440003',
    '450e8400-e29b-41d4-a716-446655440002',
    'environmental_clearance_report.pdf',
    'project-documents/riverside-school/environmental/environmental_clearance_report.pdf',
    'application/pdf',
    3120640,
    'Environmental Report',
    'approved',
    'Environmental impact assessment and clearance documentation',
    'Jennifer Brown',
    'Environmental Engineer',
    'Environmental Impact Assessment'
),
(
    '050e8400-e29b-41d4-a716-446655440004',
    '450e8400-e29b-41d4-a716-446655440005',
    'structural_analysis_report.pdf',
    'project-documents/city-bridge/structural/structural_analysis_report.pdf',
    'application/pdf',
    4680192,
    'Technical Report',
    'approved',
    'Detailed structural analysis of existing bridge conditions and renovation requirements',
    'Mike Davis',
    'Civil Engineer',
    'Bridge Structural Analysis'
),
(
    '050e8400-e29b-41d4-a716-446655440005',
    '450e8400-e29b-41d4-a716-446655440004',
    'permit_application_manufacturing.pdf',
    'project-documents/tech-facility/permits/permit_application_manufacturing.pdf',
    'application/pdf',
    2340864,
    'Permit Application',
    'pending',
    'Manufacturing facility permit application with technical specifications',
    'Emily Chen',
    'Architect',
    'Manufacturing Facility Permits'
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- UPDATE SEQUENCES AND FINAL CHECKS
-- ===========================================

-- Update project progress based on completed tasks
UPDATE public.projects 
SET progress = (
    SELECT COALESCE(AVG(tasks.progress), 0)
    FROM public.tasks 
    WHERE tasks.project_id = projects.id
)
WHERE id IN (
    SELECT DISTINCT project_id 
    FROM public.tasks 
    WHERE project_id IS NOT NULL
);

-- ===========================================
-- DEMO DATA SEEDING COMPLETE
-- ===========================================

-- Summary of demo data created:
-- - 8 Personnel records (engineers, managers, inspectors)
-- - 6 Projects (various types: commercial, educational, residential, industrial)
-- - 9 Tasks (spanning different phases and categories)
-- - 5 Events (meetings, inspections, deliveries, training)
-- - 8 Milestones (project checkpoints and targets)
-- - 5 Reports (progress, safety, environmental, technical)

-- All data is realistic but fictional, suitable for portfolio demonstration
-- Data demonstrates the full functionality of the Relay system
-- Includes various project statuses, priorities, and categories
-- Shows progression from planning through completion
