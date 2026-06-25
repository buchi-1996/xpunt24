import { NextRequest, NextResponse } from 'next/server'

// /challenges is intentionally NOT in this list — the lobby is public so visitors can browse
// open challenges. Authentication is enforced per-action (create / accept / cancel) at the API
// layer and via useRequireAuth() on the buttons that trigger those actions.
const PRIVATE = [
  '/dashboard',
  '/wagers',
  '/profile',
  '/settings',
  '/transactions',
  '/notifications',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PRIVATE.some((r) => pathname.startsWith(r)) && !req.cookies.has('auth_token')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)'],
}
