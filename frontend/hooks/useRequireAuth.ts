'use client'

import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth/AuthContext'

// Wraps an action in an auth check. If the user is logged in, the action runs.
// Otherwise it redirects to /auth/login with a `redirect=` back to the current page.
export function useRequireAuth() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  return (action: () => void, message = 'Please log in to continue') => {
    if (user) {
      action()
      return
    }
    toast.info(message)
    const params = new URLSearchParams({ redirect: pathname })
    router.push(`/auth/login?${params.toString()}`)
  }
}
