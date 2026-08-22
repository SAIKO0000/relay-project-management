/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase.types'
import { isDemoMode } from './demo/config'
import { createDemoSupabaseClient } from './demo/supabase-client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.invalid'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-publishable-key'

if (!isDemoMode && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  throw new Error('Missing Supabase environment variables for live-backend mode')
}

// One shared client prevents auth-storage and cache inconsistencies. In the
// public portfolio build it is replaced with a browser-local implementation.
export const supabase: any = isDemoMode
  ? createDemoSupabaseClient()
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 2 },
      },
    })

export type { Database } from './supabase.types'

export type Project = Database['public']['Tables']['projects']['Row']
export type Personnel = Database['public']['Tables']['personnel']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
