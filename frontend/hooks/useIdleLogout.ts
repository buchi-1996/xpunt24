'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth/AuthContext'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
// Pulse instead of resetting on every single mouse-move — avoids hammering setTimeout.
const ACTIVITY_DEBOUNCE_MS = 30 * 1000 // 30 seconds

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'visibilitychange',
]

/**
 * Logs the user out after IDLE_TIMEOUT_MS of no activity. Activity = mouse/key/scroll/touch
 * or the tab being focused again. Only mounts behavior for authenticated users.
 */
export function useIdleLogout() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivity = useRef<number>(Date.now())

  useEffect(() => {
    if (!user) {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      return
    }

    const triggerLogout = async () => {
      try {
        await logout()
      } catch {
        // ignore — we're force-clearing state regardless
      }
      toast.info('Signed out due to inactivity')
      // Send to login with a return URL so refreshing after re-login is seamless.
      const target = pathname && !pathname.startsWith('/auth') ? pathname : '/'
      router.replace(`/auth/login?redirect=${encodeURIComponent(target)}`)
    }

    const arm = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(triggerLogout, IDLE_TIMEOUT_MS)
    }

    const onActivity = () => {
      const now = Date.now()
      // Debounce: only push out the timer if at least ACTIVITY_DEBOUNCE_MS have passed since
      // the last bump. Mouse-move spam shouldn't reset setTimeout 60 times a second.
      if (now - lastActivity.current < ACTIVITY_DEBOUNCE_MS) return
      lastActivity.current = now
      arm()
    }

    arm()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [user, logout, router, pathname])
}
