import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/signup']
  const { pathname } = req.nextUrl

  // The public portfolio build has no real accounts or public diagnostic UI.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    if (pathname.startsWith('/auth') || pathname.startsWith('/debug') || pathname.startsWith('/test')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Allow access to public routes and static files
  if (publicRoutes.includes(pathname) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // For protected routes, we'll let the client-side auth handle redirection
  // This is a simplified middleware - full auth checking would require server-side session management
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
}
