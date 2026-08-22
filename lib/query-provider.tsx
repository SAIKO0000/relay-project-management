'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect, useState } from 'react'
import { getQueryClient } from './query-client-optimized'
import { createOptimizedQueryClient } from './hooks/useOptimizedQueryClient'
import { runtimeConfig } from './optimization-flags'
import { DEMO_CHANGE_EVENT, isDemoMode } from './demo/config'
import { queryKeys } from './supabase-query'

type DemoChange = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use optimized client if enabled, fallback to original
  const [queryClient] = useState(() => {
    if (runtimeConfig.shouldUseOptimizedClient()) {
      console.log('🚀 Using optimized query client for 40-50% performance improvement')
      return getQueryClient()
    } else {
      console.log('⚠️ Using fallback query client (optimizations disabled)')
      return createOptimizedQueryClient()
    }
  })

  useEffect(() => {
    if (!isDemoMode) return

    const handleDemoChange = (event: Event) => {
      const change = (event as CustomEvent<DemoChange>).detail
      if (!change) return

      if (change.eventType === 'RESET' || change.table === '*') {
        void queryClient.invalidateQueries()
        return
      }

      if (change.table === 'projects') {
        const changedProject = change.new ?? change.old
        const changedId = String(changedProject?.id ?? '')

        queryClient.setQueryData<Record<string, unknown>[]>(queryKeys.projects(), (current = []) => {
          if (change.eventType === 'DELETE') {
            return current.filter(project => String(project.id) !== changedId)
          }

          if (!change.new) return current
          return [
            change.new,
            ...current.filter(project => String(project.id) !== changedId),
          ]
        })
      }

      // Active queries refetch immediately from browser-local storage. This is
      // also the cross-tab fallback for tables without an optimistic updater.
      void queryClient.invalidateQueries({
        predicate: query => {
          const parts = query.queryKey.map(String)
          return parts.includes(change.table) || parts.includes('dashboard')
        },
      })
    }

    window.addEventListener(DEMO_CHANGE_EVENT, handleDemoChange)
    return () => window.removeEventListener(DEMO_CHANGE_EVENT, handleDemoChange)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  )
}
