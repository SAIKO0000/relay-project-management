import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/supabase-query'
import { createSmartInvalidation } from '@/lib/hooks/useSmartInvalidation'
import { getAffectedQueryKeys } from '@/lib/query-keys-optimized'
import { toast } from 'react-hot-toast'
import { isDemoMode } from '@/lib/demo/config'

// Real-time Dashboard Sync Hook
export function useDashboardRealtime() {
  const queryClient = useQueryClient()
  const smartInvalidation = useMemo(() => createSmartInvalidation(queryClient), [queryClient])
  const lastNotificationRef = useRef(0)

  // Throttled notification function to prevent spam
  const throttledNotification = useCallback(
    (message: string, type: 'success' | 'info' = 'info') => {
        // Demo mutations already show a direct success message. Realtime toasts
        // duplicate it and make ordinary actions feel like system alerts.
        if (isDemoMode) return
        const now = Date.now()
        const throttleTime = 3000
        if (now - lastNotificationRef.current > throttleTime) {
          lastNotificationRef.current = now
          if (type === 'success') {
            toast.success(message)
          } else {
            toast(message, { icon: '🔄' })
          }
        }
      },
    []
  )

  // Set up comprehensive real-time subscriptions for dashboard
  useEffect(() => {
    console.log('🔄 Setting up comprehensive dashboard real-time subscriptions...')
    
    // Projects real-time subscription
    const projectsChannel = supabase
      .channel('dashboard_projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('🏗️ Project change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT' && payload.new) {
            smartInvalidation.onProjectCreate(payload.new as any)
            throttledNotification('New project created!', 'success')
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            smartInvalidation.onProjectUpdate(payload.new as any)
            throttledNotification('Project updated!')
          } else if (payload.eventType === 'DELETE' && payload.old) {
            smartInvalidation.onProjectDelete((payload.old as any).id)
            throttledNotification('Project deleted', 'info')
          }
        }
      )

    // Tasks real-time subscription  
    const tasksChannel = supabase
      .channel('dashboard_tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('📝 Task change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT' && payload.new) {
            smartInvalidation.onTaskCreate(payload.new as any)
            throttledNotification('New task created!', 'success')
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            smartInvalidation.onTaskUpdate(payload.new as any)
            throttledNotification('Task updated!')
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldTask = payload.old as any
            smartInvalidation.onTaskDelete(oldTask.id, oldTask.project_id || '')
            throttledNotification('Task completed/deleted')
          }
        }
      )

    // Reports real-time subscription
    const reportsChannel = supabase
      .channel('dashboard_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          console.log('📊 Report change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // Update reports cache and related project cache
            const affectedKeys = getAffectedQueryKeys('reports', payload)
            affectedKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key, exact: true })
            })
            throttledNotification('New report uploaded!', 'success')
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const affectedKeys = getAffectedQueryKeys('reports', payload)
            affectedKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key, exact: true })
            })
            throttledNotification('Report updated!')
          } else if (payload.eventType === 'DELETE') {
            const affectedKeys = getAffectedQueryKeys('reports', payload)
            affectedKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key, exact: true })
            })
            throttledNotification('Report deleted')
          }
        }
      )

    // Personnel real-time subscription (less frequent updates)
    const personnelChannel = supabase
      .channel('dashboard_personnel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel'
        },
        (payload) => {
          console.log('👥 Personnel change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT' && payload.new) {
            smartInvalidation.onPersonnelUpdate(payload.new as any)
            throttledNotification('New team member added!', 'success')
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            smartInvalidation.onPersonnelUpdate(payload.new as any)
            throttledNotification('Team member updated!')
          } else {
            // For deletes or unknown changes, just invalidate personnel cache
            queryClient.invalidateQueries({ queryKey: queryKeys.personnel(), exact: true })
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(), exact: true })
          }
        }
      )

    // Events real-time subscription
    const eventsChannel = supabase
      .channel('dashboard_events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('📅 Event change detected:', payload.eventType)
          
          // Events affect dashboard notifications and upcoming activities
          queryClient.invalidateQueries({ queryKey: queryKeys.events(), exact: true })
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications(), exact: true })
          
          if (payload.eventType === 'INSERT') {
            throttledNotification('New event scheduled!', 'success')
          } else if (payload.eventType === 'UPDATE') {
            throttledNotification('Event updated!')
          }
        }
      )

    // Subscribe to all channels
    projectsChannel.subscribe()
    tasksChannel.subscribe()
    reportsChannel.subscribe()
    personnelChannel.subscribe()
    eventsChannel.subscribe()

    // Cleanup function
    return () => {
      console.log('🔄 Cleaning up dashboard real-time subscriptions...')
      supabase.removeChannel(projectsChannel)
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(reportsChannel)
      supabase.removeChannel(personnelChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [queryClient, smartInvalidation, throttledNotification])

  // Manual refresh function for emergency use
  const refreshAll = useCallback(() => {
    console.log('🔄 Manual refresh triggered for all dashboard data')
    queryClient.invalidateQueries()
    toast.success('Dashboard refreshed!')
  }, [queryClient])

  // Get current cache state for debugging
  const getCacheState = useCallback(() => {
    const projectsData = queryClient.getQueryData(queryKeys.projects())
    const tasksData = queryClient.getQueryData(queryKeys.tasks())
    const reportsData = queryClient.getQueryData(queryKeys.reports())
    
    return {
      projects: Array.isArray(projectsData) ? projectsData.length : 0,
      tasks: Array.isArray(tasksData) ? tasksData.length : 0,
      reports: Array.isArray(reportsData) ? reportsData.length : 0,
      cacheAge: {
        projects: queryClient.getQueryState(queryKeys.projects())?.dataUpdatedAt || 0,
        tasks: queryClient.getQueryState(queryKeys.tasks())?.dataUpdatedAt || 0,
        reports: queryClient.getQueryState(queryKeys.reports())?.dataUpdatedAt || 0,
      }
    }
  }, [queryClient])

  return {
    refreshAll,
    getCacheState,
    isConnected: true // Could be enhanced with actual connection state
  }
}
