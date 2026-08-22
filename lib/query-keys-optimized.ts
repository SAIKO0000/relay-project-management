// Unified query key factory for consistent TanStack Query caching.
// Keep the shared keys identical to supabase-query.ts. The app historically had
// two roots (`data` and `projtrack`), which meant mutations/realtime updated a
// cache the visible screens were not reading.
import { queryKeys as baseQueryKeys } from './supabase-query'

export const queryKeys = {
  ...baseQueryKeys,
  
  // Dashboard
  dashboard: baseQueryKeys.dashboard,
  dashboardStats: baseQueryKeys.dashboardStats,
  
  // Projects
  projects: baseQueryKeys.projects,
  project: baseQueryKeys.project,
  projectTasks: baseQueryKeys.projectTasks,
  
  // Tasks
  tasks: baseQueryKeys.tasks,
  task: baseQueryKeys.task,
  tasksByProject: baseQueryKeys.tasksByProject,
  tasksByAssignee: (assigneeId: string) => [...baseQueryKeys.tasks(), 'assignee', assigneeId] as const,
  ganttTasks: baseQueryKeys.ganttTasks,
  
  // Personnel
  personnel: baseQueryKeys.personnel,
  person: baseQueryKeys.person,
  
  // Reports
  reports: baseQueryKeys.reports,
  report: baseQueryKeys.report,
  reportsByProject: baseQueryKeys.reportsByProject,
  reportsByUploader: (uploaderId: string) => [...baseQueryKeys.reports(), 'uploader', uploaderId] as const,

  // Events
  events: baseQueryKeys.events,
  event: baseQueryKeys.event,
  eventsByProject: baseQueryKeys.eventsByProject,
  eventsByDate: baseQueryKeys.eventsByDate,

  // Photos
  photos: baseQueryKeys.photos,
  photo: baseQueryKeys.photo,
  photosByProject: baseQueryKeys.photosByProject,

  // Auth/User
  user: () => [...queryKeys.all, 'user'] as const,
  userProfile: (id: string) => [...queryKeys.user(), 'profile', id] as const,
  userSession: () => [...queryKeys.user(), 'session'] as const,

  // Search
  search: (query: string) => [...queryKeys.all, 'search', query] as const,
  
  // Generic list operations
  list: (table: string) => [...queryKeys.all, 'list', table] as const,
  infinite: (table: string, params: string) => [...queryKeys.list(table), 'infinite', params] as const,
  
  // Utility for custom keys
  custom: (key: readonly string[]) => [...queryKeys.all, ...key] as const
} as const

// Type for Supabase realtime payload
type RealtimePayload = {
  new?: Record<string, unknown>
  old?: Record<string, unknown>
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE'
}

// Helper function to get affected query keys for smart invalidation
export function getAffectedQueryKeys(table: string, payload: RealtimePayload): string[][] {
  const keys: string[][] = []
  
  switch (table) {
    case 'projects':
      keys.push(
        [...queryKeys.projects()],
        [...queryKeys.dashboard()],
        [...queryKeys.dashboardStats()]
      )
      if (payload.new?.id || payload.old?.id) {
        const projectId = String(payload.new?.id || payload.old?.id)
        keys.push([...queryKeys.project(projectId)])
      }
      break

    case 'tasks':
      keys.push([...queryKeys.tasks()])
      if (payload.new?.project_id || payload.old?.project_id) {
        const projectId = String(payload.new?.project_id || payload.old?.project_id)
        keys.push(
          [...queryKeys.tasksByProject(projectId)],
          [...queryKeys.ganttTasks(projectId)],
          [...queryKeys.project(projectId)]
        )
      }
      if (payload.new?.assigned_to || payload.old?.assigned_to) {
        const assigneeId = String(payload.new?.assigned_to || payload.old?.assigned_to)
        keys.push([...queryKeys.tasksByAssignee(assigneeId)])
      }
      break

    case 'reports':
      keys.push([...queryKeys.reports()])
      if (payload.new?.project_id || payload.old?.project_id) {
        const projectId = String(payload.new?.project_id || payload.old?.project_id)
        keys.push(
          [...queryKeys.reportsByProject(projectId)],
          [...queryKeys.project(projectId)]
        )
      }
      break

    case 'personnel':
      keys.push(
        [...queryKeys.personnel()],
        [...queryKeys.dashboard()],
        [...queryKeys.dashboardStats()]
      )
      break

    case 'events':
      keys.push([...queryKeys.events()])
      if (payload.new?.project_id || payload.old?.project_id) {
        const projectId = String(payload.new?.project_id || payload.old?.project_id)
        keys.push([...queryKeys.eventsByProject(projectId)])
      }
      break

    case 'project_photos':
      keys.push([...queryKeys.photos()])
      if (payload.new?.project_id || payload.old?.project_id) {
        const projectId = String(payload.new?.project_id || payload.old?.project_id)
        keys.push([...queryKeys.photosByProject(projectId)])
      }
      break

    default:
      // For unknown tables, just invalidate related dashboard data
      keys.push([...queryKeys.dashboard()], [...queryKeys.dashboardStats()])
      break
  }

  return keys
}

// Utility to check if two query keys are related
export function areQueryKeysRelated(key1: readonly string[], key2: readonly string[]): boolean {
  if (key1.length === 0 || key2.length === 0) return false
  
  // Check if one key is a prefix of another
  const minLength = Math.min(key1.length, key2.length)
  for (let i = 0; i < minLength; i++) {
    if (key1[i] !== key2[i]) return false
  }
  
  return true
}

// Export type for strict typing
export type QueryKey = readonly string[]
