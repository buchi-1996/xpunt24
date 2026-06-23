import { NextRequest, NextResponse } from 'next/server'

const PRIVATE = ['/dashboard', '/wagers', '/profile', '/settings', '/challenges']

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
