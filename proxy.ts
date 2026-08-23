import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updatePrivateBetaSession } from '@/lib/supabase/proxy'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

  // The public portfolio build has no real accounts or public diagnostic UI.
  if (isDemoMode) {
    if (pathname.startsWith('/auth') || pathname.startsWith('/debug') || pathname.startsWith('/test')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/debug') || pathname.startsWith('/test') || pathname === '/auth-demo') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { user, applySession } = await updatePrivateBetaSession(req)

  // Private beta accounts are provisioned only through Supabase invitations.
  if (pathname === '/auth/signup') {
    return applySession(NextResponse.redirect(new URL('/auth/login?inviteOnly=1', req.url)))
  }

  const publicRoutes = [
    '/auth/login',
    '/auth/confirm',
    '/auth/forgot-password',
    '/auth/reset-password',
  ]
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!user && !isPublicRoute && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return applySession(NextResponse.redirect(loginUrl))
  }

  if (user && pathname === '/auth/login') {
    return applySession(NextResponse.redirect(new URL('/', req.url)))
  }

  return applySession(NextResponse.next({ request: req }))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
