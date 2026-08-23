import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase.types'
import { getSupabasePublicEnv } from './env'

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

export async function updatePrivateBetaSession(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicEnv()
  let pendingCookies: PendingCookie[] = []
  let pendingHeaders: Record<string, string> = {}

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        pendingCookies = cookiesToSet
        pendingHeaders = headers
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      },
    },
  })

  // getUser verifies the identity with Supabase Auth. Do not authorize from
  // getSession(), whose cookie payload can be spoofed.
  const { data, error } = await supabase.auth.getUser()

  const applySession = (response: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    Object.entries(pendingHeaders).forEach(([name, value]) => {
      response.headers.set(name, value)
    })
    return response
  }

  return {
    user: error ? null : data.user,
    applySession,
  }
}
