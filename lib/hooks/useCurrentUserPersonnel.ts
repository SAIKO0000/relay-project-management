"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Database } from '@/lib/supabase.types'

type Personnel = Database['public']['Tables']['personnel']['Row']
type PersonnelUpdate = Database['public']['Tables']['personnel']['Update']

export function useCurrentUserPersonnel() {
  const [personnel, setPersonnel] = useState<Personnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const { user } = useAuth()

  const fetchCurrentUserPersonnel = useCallback(async () => {
    if (!user?.email) {
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
        .eq('email', user.email)
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
  }, [user?.email])

  const updatePersonnel = useCallback(async (updates: PersonnelUpdate) => {
    if (!personnel?.id) {
      throw new Error('No personnel record found to update')
    }

    try {
      setUpdating(true)
      setError(null)

      const { data, error } = await supabase
        .from('personnel')
        .update(updates)
        .eq('id', personnel.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setPersonnel(data)
      return { success: true, data }
    } catch (err) {
      console.error('Error updating personnel:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }, [personnel?.id])

  useEffect(() => {
    fetchCurrentUserPersonnel()

    // Listen for avatar update events from other components
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { personnelId } = event.detail
      // Only refetch if this event is for the current user
      if (personnelId === personnel?.id) {
        fetchCurrentUserPersonnel()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
      }
    }
  }, [fetchCurrentUserPersonnel, personnel?.id])

  return {
    personnel,
    loading,
    error,
    updating,
    updatePersonnel,
    refetch: fetchCurrentUserPersonnel
  }
}
