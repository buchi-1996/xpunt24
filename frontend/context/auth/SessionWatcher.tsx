'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { setUnauthorizedHandler } from '@/lib/apiClient'
import { useAuth } from './AuthContext'
import { useIdleLogout } from '@/hooks/useIdleLogout'

/**
 * Mounts inside <AuthProvider> so it has access to the auth context. Two responsibilities:
 *  1. Wire the global 401 handler in apiClient — when any API call 401s on a previously-
 *     authed user, clear the local user state and bounce to the login page (so a session
 *     that was killed remotely doesn't leave a stale "logged in" UI).
 *  2. Drive the 30-minute idle logout via the useIdleLogout hook.
 */
export function SessionWatcher() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useIdleLogout()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Only react if we currently think we're logged in. A 401 against a never-authed
      // visitor (e.g. a 401 from a stale fetch) shouldn't bounce anyone.
      if (!user) return
      void logout().catch(() => undefined)
      toast.info('Your session has ended. Please sign in again.')
      const target = pathname && !pathname.startsWith('/auth') ? pathname : '/'
      router.replace(`/auth/login?redirect=${encodeURIComponent(target)}`)
    })
    return () => setUnauthorizedHandler(null)
  }, [user, logout, router, pathname])

  return null
}
