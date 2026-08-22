"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { clearAuthStorage, handleAuthError } from './auth-utils'
import { supabase } from './supabase'
import { isDemoMode } from './demo/config'
import { resetDemoData } from './demo/supabase-client'
import { clearWorkspaceCache } from './workspace'

export { supabase }

interface AuthContextType {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData: UserData) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  loading: boolean
}

interface UserData {
  name: string
  position: string
  phone?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('Session error:', error)
          // Handle token refresh errors
          const friendlyError = handleAuthError(error)
          if (friendlyError.includes('Session expired')) {
            clearAuthStorage()
            setSession(null)
            setUser(null)
            setLoading(false)
            return
          }
          throw error
        }
        
        // Validate session if it exists
        if (session) {
          try {
            // Test if the session is actually valid by making a simple call
            const { error: testError } = await supabase.auth.getUser()
            if (testError) {
              console.log('Session validation failed:', testError)
              clearAuthStorage()
              setSession(null)
              setUser(null)
              setLoading(false)
              return
            }
          } catch (testError) {
            console.log('Session test failed:', testError)
            clearAuthStorage()
            setSession(null)
            setUser(null)
            setLoading(false)
            return
          }
        }
        
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
        // Clear any corrupt session data
        clearAuthStorage()
        setSession(null)
        setUser(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('Auth state change:', event, session?.user?.email)
      
      if (!isMounted) return
      
      // Handle authentication errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('Token refresh failed, clearing storage and redirecting to login')
        clearAuthStorage()
        setSession(null)
        setUser(null)
        setLoading(false)
        router.push('/auth/login')
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_OUT') {
        toast.success('Successfully signed out. See you next time!', {
          duration: 1000,
          style: {
            background: 'linear-gradient(to right, #f97316, #ea580c)',
            color: 'white',
          },
        })
        router.push('/auth/login')
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      }
      
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const friendlyError = handleAuthError(error)
        return { success: false, error: friendlyError }
      }

      toast.success('Welcome back! Successfully signed in.', {
        duration: 1000, // Reduced duration
        style: {
          background: 'linear-gradient(to right, #f97316, #ea580c)',
          color: 'white',
        },
      })

      router.push('/')
      return { success: true }
    } catch (error: unknown) {
      const friendlyError = handleAuthError(error)
      return { success: false, error: friendlyError }
    } finally {
      setLoading(false)
    }
  }, [router])

  const signUp = useCallback(async (email: string, password: string, userData: UserData) => {
    if (isDemoMode) {
      return { success: false, error: 'Account creation is disabled in browser-local Demo Mode.' }
    }

    // Private beta accounts are created only by a trusted Supabase invitation.
    // Keeping this guard in the auth layer prevents accidental self-signup even
    // if somebody reaches the legacy signup component directly.
    void email
    void password
    void userData
    return { success: false, error: 'This private beta is invitation-only.' }
  }, [])

  const signOut = useCallback(async () => {
    clearWorkspaceCache()
    if (isDemoMode) {
      resetDemoData()
      toast.success('Demo data reset successfully')
      router.push('/')
      return
    }

    try {
      setLoading(true)
      
      // Clear auth storage first
      clearAuthStorage()
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('SignOut error:', error)
        // Even if signOut fails, we've already cleared local storage
      }
      
      // Always clear local state
      setSession(null)
      setUser(null)
      
    } catch (error) {
      console.error('Error signing out:', error)
      // Always clear local state and storage even on error
      clearAuthStorage()
      setSession(null)
      setUser(null)
      toast.error('Error signing out. Session cleared locally.')
    } finally {
      setLoading(false)
    }
  }, [router])

  const value = useMemo(() => ({
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
  }), [user, session, signIn, signUp, signOut, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
