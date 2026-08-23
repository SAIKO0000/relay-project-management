-- ===========================================
-- RELAY DATABASE SCHEMA EXPORT
-- ===========================================
-- Complete schema export for portfolio migration
-- Generated for: Relay Electrical Project Management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";

-- ===========================================
-- TABLE CREATION
-- ===========================================

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name CHARACTER VARYING NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status CHARACTER VARYING DEFAULT 'planning',
    location CHARACTER VARYING,
    client CHARACTER VARYING,
    progress INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    actual_end_date DATE,
    budget NUMERIC DEFAULT 0,
    spent NUMERIC DEFAULT 0,
    priority CHARACTER VARYING DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category CHARACTER VARYING CHECK (category IN ('Educational', 'Commercial', 'Industrial', 'Residential'))
);

-- Personnel table
CREATE TABLE IF NOT EXISTS public.personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name CHARACTER VARYING NOT NULL,
    email CHARACTER VARYING UNIQUE,
    phone CHARACTER VARYING,
    position CHARACTER VARYING,
    avatar_url TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    user_id UUID UNIQUE
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID,
    title CHARACTER VARYING NOT NULL,
    description TEXT,
    due_date DATE,
    status CHARACTER VARYING DEFAULT 'todo',
    priority CHARACTER VARYING DEFAULT 'medium',
    assigned_to UUID,
    estimated_hours INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    phase CHARACTER VARYING,
    category CHARACTER VARYING CHECK (category IN ('planning', 'pre-construction', 'construction', 'finishing', 'closeout')),
    duration INTEGER,
    dependencies TEXT[],
    assignee CHARACTER VARYING,
    gantt_position INTEGER,
    name CHARACTER VARYING,
    completed_at TIMESTAMP WITH TIME ZONE,
    assignee_headcounts JSONB DEFAULT '{}',
    notes TEXT
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID,
    file_name CHARACTER VARYING NOT NULL,
    file_path CHARACTER VARYING NOT NULL,
    file_type CHARACTER VARYING,
    file_size INTEGER,
    uploaded_by UUID,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    category CHARACTER VARYING DEFAULT 'Progress Report',
    status CHARACTER VARYING DEFAULT 'pending',
    description TEXT,
    uploader_name TEXT,
    uploader_position TEXT,
    assigned_reviewer UUID,
    reviewer_notes TEXT,
    assigned_reviewer_id UUID,
    title TEXT
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    message TEXT NOT NULL,
    type CHARACTER VARYING DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title CHARACTER VARYING NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    type CHARACTER VARYING NOT NULL CHECK (type IN ('inspection', 'delivery', 'meeting', 'training', 'review', 'task')),
    project_id UUID,
    location CHARACTER VARYING NOT NULL,
    attendees TEXT[],
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Photos table
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    event_id UUID,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    upload_date DATE NOT NULL,
    description TEXT,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    title TEXT
);

-- Milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name TEXT NOT NULL,
    target_date DATE NOT NULL,
    actual_date DATE,
    completed BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- FCM Tokens table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- FOREIGN KEY CONSTRAINTS
-- ===========================================

-- Projects foreign keys
ALTER TABLE public.projects 
    ADD CONSTRAINT projects_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Tasks foreign keys
ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES public.personnel(id);

-- Personnel foreign keys
ALTER TABLE public.personnel 
    ADD CONSTRAINT personnel_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Reports foreign keys
ALTER TABLE public.reports 
    ADD CONSTRAINT reports_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.reports 
    ADD CONSTRAINT reports_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);

ALTER TABLE public.reports 
    ADD CONSTRAINT reports_assigned_reviewer_fkey 
    FOREIGN KEY (assigned_reviewer) REFERENCES public.personnel(id);

ALTER TABLE public.reports 
    ADD CONSTRAINT reports_assigned_reviewer_id_fkey 
    FOREIGN KEY (assigned_reviewer_id) REFERENCES public.personnel(id);

-- Notifications foreign keys
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Events foreign keys
ALTER TABLE public.events 
    ADD CONSTRAINT events_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Photos foreign keys
ALTER TABLE public.photos 
    ADD CONSTRAINT photos_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.photos 
    ADD CONSTRAINT photos_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES public.events(id);

-- Milestones foreign keys
ALTER TABLE public.milestones 
    ADD CONSTRAINT milestones_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- WARNING: the broad collaboration policies below are legacy development
-- defaults and are not suitable for an internet-facing portfolio. After
-- restoring a dedicated portfolio project, run sql/portfolio_demo_lockdown.sql.

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Projects policies
CREATE POLICY "Users can view all projects" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Users can insert projects" ON public.projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update projects" ON public.projects
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete projects" ON public.projects
    FOR DELETE USING (true);

-- Tasks policies
CREATE POLICY "Users can view all tasks" ON public.tasks
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tasks" ON public.tasks
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete tasks" ON public.tasks
    FOR DELETE USING (true);

-- Reports policies
CREATE POLICY "Users can view all reports" ON public.reports
    FOR SELECT USING (true);

CREATE POLICY "Users can insert reports" ON public.reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update reports" ON public.reports
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete reports" ON public.reports
    FOR DELETE USING (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view all events" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert events" ON public.events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update events" ON public.events
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete events" ON public.events
    FOR DELETE USING (true);

-- Photos policies
CREATE POLICY "Users can view all photos" ON public.photos
    FOR SELECT USING (true);

CREATE POLICY "Users can insert photos" ON public.photos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update photos" ON public.photos
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete photos" ON public.photos
    FOR DELETE USING (true);

-- Milestones policies
CREATE POLICY "Users can view all milestones" ON public.milestones
    FOR SELECT USING (true);

CREATE POLICY "Users can insert milestones" ON public.milestones
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update milestones" ON public.milestones
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete milestones" ON public.milestones
    FOR DELETE USING (true);

-- FCM Tokens policies
CREATE POLICY "Users can view own FCM tokens" ON public.fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own FCM tokens" ON public.fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own FCM tokens" ON public.fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own FCM tokens" ON public.fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- STORAGE BUCKETS
-- ===========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('project-documents', 'project-documents', false, 52428800, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","text/plain","image/jpeg","image/png","image/gif"}'),
    ('project-photos', 'project-photos', true, 10485760, '{"image/jpeg","image/png","image/gif","image/webp"}'),
    ('avatars', 'avatars', true, 2097152, '{"image/jpeg","image/png","image/gif","image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- STORAGE POLICIES
-- ===========================================

-- Project documents storage policies
CREATE POLICY "Users can view project documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-documents');

CREATE POLICY "Users can upload project documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Users can update project documents" ON storage.objects
    FOR UPDATE USING (bucket_id = 'project-documents');

CREATE POLICY "Users can delete project documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'project-documents');

-- Project photos storage policies
CREATE POLICY "Anyone can view project photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-photos');

CREATE POLICY "Users can upload project photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'project-photos');

CREATE POLICY "Users can update project photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'project-photos');

CREATE POLICY "Users can delete project photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'project-photos');

-- Avatars storage policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete avatars" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars');

-- ===========================================
-- FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON public.photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fcm_tokens_updated_at BEFORE UPDATE ON public.fcm_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON public.projects(start_date);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_uploaded_by ON public.reports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_project_id ON public.events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON public.photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON public.photos(event_id);

-- ===========================================
-- DEMO DATA INSERTION
-- ===========================================

-- Note: Demo data will be inserted separately via the seed script
-- This schema file only contains the structure

-- ===========================================
-- SCHEMA EXPORT COMPLETE
-- ===========================================
