import { createClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase.types'
import { getSupabasePublicEnv } from './env'
import { createServerSupabaseClient } from './server'

type AuthenticatedRouteContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  user: User
}

export async function getAuthenticatedRouteContext(
  request: NextRequest
): Promise<AuthenticatedRouteContext | null> {
  const bearerToken = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')

  if (bearerToken) {
    const { url, publishableKey } = getSupabasePublicEnv()
    const callerClient = createClient<Database>(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${bearerToken}` },
      },
    })
    const { data, error } = await callerClient.auth.getUser(bearerToken)

    if (error || !data.user) return null

    return {
      supabase: callerClient as AuthenticatedRouteContext['supabase'],
      user: data.user,
    }
  }

  const cookieClient = await createServerSupabaseClient()
  const { data, error } = await cookieClient.auth.getUser()

  if (error || !data.user) return null

  return { supabase: cookieClient, user: data.user }
}
