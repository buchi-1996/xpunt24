'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MailWarningIcon, Loader2, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth/AuthContext'
import { api } from '@/lib/apiClient'

const DISMISS_KEY = 'unverified-banner-dismissed'

const UnverifiedEmailBanner = () => {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  })
  const [sending, setSending] = useState(false)

  if (!user) return null
  if (user.emailVerified) return null
  if (dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await api.auth.resendVerification(user.email)
      toast.success("We've sent a fresh verification email.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3">
        <MailWarningIcon className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 text-xs sm:text-sm">
          <span className="font-semibold">Verify your email</span>{' '}
          <span className="opacity-80">
            to deposit, withdraw and place wagers. Check {user.email}.
          </span>
        </div>
        <Button
          onClick={handleResend}
          disabled={sending}
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-amber-900 hover:bg-amber-100"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
        </Button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-amber-700 hover:text-amber-900 p-1"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default UnverifiedEmailBanner
