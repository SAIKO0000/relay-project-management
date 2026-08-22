"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { DEMO_CHANGE_EVENT, isDemoMode } from '@/lib/demo/config'
import type { Database } from '@/lib/supabase.types'

type Personnel = Database['public']['Tables']['personnel']['Row']
type PersonnelUpdate = Database['public']['Tables']['personnel']['Update']

const PERSONNEL_UPDATED_EVENT = 'currentUserPersonnelUpdated'

type DemoPersonnelChange = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET'
  new: Personnel | null
  old: Personnel | null
}

export function useCurrentUserPersonnel() {
  const [personnel, setPersonnel] = useState<Personnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const { user } = useAuth()
  const userEmail = user?.email
  const personnelId = personnel?.id

  const fetchCurrentUserPersonnel = useCallback(async () => {
    if (!userEmail) {
      setPersonnel(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .eq('email', userEmail)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No personnel record found - this is expected for some users
          setPersonnel(null)
        } else {
          throw error
        }
      } else {
        setPersonnel(data)
      }
    } catch (err) {
      console.error('Error fetching current user personnel:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  const updatePersonnel = useCallback(async (updates: PersonnelUpdate) => {
    if (!personnelId) {
      throw new Error('No personnel record found to update')
    }

    try {
      setUpdating(true)
      setError(null)

      const { data, error } = await supabase
        .from('personnel')
        .update(updates)
        .eq('id', personnelId)
        .select()
        .single()

      if (error) {
        throw error
      }

      setPersonnel(data)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<Personnel>(PERSONNEL_UPDATED_EVENT, {
          detail: data,
        }))
      }
      return { success: true, data }
    } catch (err) {
      console.error('Error updating personnel:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }, [personnelId])

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => {
      void fetchCurrentUserPersonnel()
    }, 0)

    // Listen for avatar update events from other components
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { personnelId: updatedPersonnelId } = event.detail
      // Only refetch if this event is for the current user
      if (updatedPersonnelId === personnelId) {
        fetchCurrentUserPersonnel()
      }
    }

    // Each component using this hook owns its own state. Keep those instances
    // synchronized after the profile modal saves a personnel record.
    const handlePersonnelUpdate = (event: CustomEvent<Personnel>) => {
      if (event.detail?.email === userEmail) {
        setPersonnel(event.detail)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
      window.addEventListener(PERSONNEL_UPDATED_EVENT, handlePersonnelUpdate as EventListener)
    }

    return () => {
      window.clearTimeout(fetchTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
        window.removeEventListener(PERSONNEL_UPDATED_EVENT, handlePersonnelUpdate as EventListener)
      }
    }
  }, [fetchCurrentUserPersonnel, personnelId, userEmail])

  useEffect(() => {
    if (!isDemoMode || !userEmail) return

    const handleDemoPersonnelChange = (event: Event) => {
      const change = (event as CustomEvent<DemoPersonnelChange>).detail

      if (change?.table !== 'personnel') return

      const changedPersonnel = change.new ?? change.old
      if (changedPersonnel?.email !== userEmail) return

      if (change.eventType === 'DELETE') {
        setPersonnel(null)
        return
      }

      if (change.new) setPersonnel(change.new)
    }

    window.addEventListener(DEMO_CHANGE_EVENT, handleDemoPersonnelChange)
    return () => window.removeEventListener(DEMO_CHANGE_EVENT, handleDemoPersonnelChange)
  }, [userEmail])

  return {
    personnel,
    loading,
    error,
    updating,
    updatePersonnel,
    refetch: fetchCurrentUserPersonnel
  }
}
