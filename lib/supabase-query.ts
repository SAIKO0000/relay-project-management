import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export { supabase }

// Centralized query keys factory - prevents cache key mismatches
export const queryKeys = {
  all: ['data'] as const,
  projects: () => [...queryKeys.all, 'projects'] as const,
  project: (id: string) => [...queryKeys.projects(), id] as const,
  projectTasks: (id: string) => [...queryKeys.project(id), 'tasks'] as const,
  projectEvents: (id: string) => [...queryKeys.project(id), 'events'] as const,
  projectReports: (id: string) => [...queryKeys.project(id), 'reports'] as const,
  projectPhotos: (id: string) => [...queryKeys.project(id), 'photos'] as const,
  
  personnel: () => [...queryKeys.all, 'personnel'] as const,
  person: (id: string) => [...queryKeys.personnel(), id] as const,
  
  tasks: () => [...queryKeys.all, 'tasks'] as const,
  task: (id: string) => [...queryKeys.tasks(), id] as const,
  tasksByProject: (projectId: string) => [...queryKeys.tasks(), 'project', projectId] as const,
  ganttTasks: (projectId?: string) => projectId 
    ? [...queryKeys.all, 'gantt-tasks', 'project', projectId] as const 
    : [...queryKeys.all, 'gantt-tasks'] as const,
  
  events: () => [...queryKeys.all, 'events'] as const,
  event: (id: string) => [...queryKeys.events(), id] as const,
  eventsByProject: (projectId: string) => [...queryKeys.events(), 'project', projectId] as const,
  eventsByDate: (date: string) => [...queryKeys.events(), 'date', date] as const,
  
  reports: () => [...queryKeys.all, 'reports'] as const,
  report: (id: string) => [...queryKeys.reports(), id] as const,
  reportsByProject: (projectId: string) => [...queryKeys.reports(), 'project', projectId] as const,
  
  photos: () => [...queryKeys.all, 'photos'] as const,
  photo: (id: string) => [...queryKeys.photos(), id] as const,
  photosByProject: (projectId: string) => [...queryKeys.photos(), 'project', projectId] as const,
  photosByDate: (date: string) => [...queryKeys.photos(), 'date', date] as const,
  
  notifications: () => [...queryKeys.all, 'notifications'] as const,
  
  // Dashboard aggregations
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  dashboardStats: () => [...queryKeys.dashboard(), 'stats'] as const,
  dashboardProject: (projectId: string) => [...queryKeys.dashboard(), 'project', projectId] as const,
}

// Helper functions for cache invalidation
export const getInvalidateQueries = (queryClient: QueryClient) => ({
  projects: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects() }),
  personnel: () => queryClient.invalidateQueries({ queryKey: queryKeys.personnel() }),
  tasks: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks() }),
  events: () => queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
  reports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports() }),
  photos: () => queryClient.invalidateQueries({ queryKey: queryKeys.photos() }),
  notifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  
  // Invalidate project-specific data
  projectData: (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tasksByProject(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.eventsByProject(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.reportsByProject(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.photosByProject(projectId) })
  }
})

// Prefetch commonly needed data
export const getPrefetchData = (queryClient: QueryClient) => ({
  projects: () => queryClient.prefetchQuery({
    queryKey: queryKeys.projects(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for projects
  }),
  
  personnel: () => queryClient.prefetchQuery({
    queryKey: queryKeys.personnel(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    },
    staleTime: 15 * 60 * 1000, // 15 minutes for personnel (changes rarely)
  })
})
