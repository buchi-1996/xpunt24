'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2Icon, Loader2, MailIcon, XCircleIcon } from 'lucide-react'
import FormCard from '../formcard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'

type Status = 'verifying' | 'success' | 'invalid' | 'idle'

const VerifyFormInner = () => {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const prefilledEmail = params.get('email') ?? ''
  const { refresh } = useAuth()

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle')
  const [email, setEmail] = useState(prefilledEmail)
  const [resending, setResending] = useState(false)
  // Strict Mode mounts effects twice in dev; guard against running the verify twice
  // (the second call would always 400 with an "already used" token).
  const verifyAttempted = useRef(false)

  useEffect(() => {
    if (!token) return
    if (verifyAttempted.current) return
    verifyAttempted.current = true
    ;(async () => {
      try {
        await api.auth.verifyEmail(token)
        await refresh()
        setStatus('success')
        setTimeout(() => router.replace('/'), 1500)
      } catch {
        setStatus('invalid')
      }
    })()
  }, [token, refresh, router])

  const handleResend = async () => {
    if (!email) {
      toast.error('Enter your email')
      return
    }
    setResending(true)
    try {
      await api.auth.resendVerification(email)
      toast.success("If an account requires verification, we've sent an email.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  if (status === 'verifying') {
    return (
      <FormCard
        className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
        title="Verifying email…"
        label="Hold on a moment"
        backButtonHref="/auth/login"
        backButtonLabel="Back to sign in"
      >
        <div className="flex flex-col items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </FormCard>
    )
  }

  if (status === 'success') {
    return (
      <FormCard
        className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
        title="Email verified"
        label="You're all set"
        backButtonHref="/"
        backButtonLabel="Continue"
      >
        <div className="flex flex-col items-center py-6">
          <CheckCircle2Icon className="h-10 w-10 text-green-600 mb-3" />
          <p className="text-sm text-gray-600">Taking you in…</p>
        </div>
      </FormCard>
    )
  }

  if (status === 'invalid') {
    return (
      <FormCard
        className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
        title="Link invalid or expired"
        label="No worries — request a new one"
        backButtonHref="/auth/login"
        backButtonLabel="Back to sign in"
      >
        <div className="flex flex-col items-center mb-4">
          <XCircleIcon className="h-10 w-10 text-red-500 mb-3" />
        </div>
        <div className="space-y-3 w-full">
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="py-6 rounded-lg shadow-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleResend} className="w-full py-6 rounded-lg" disabled={resending}>
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send a new verification email'}
          </Button>
        </div>
      </FormCard>
    )
  }

  // idle — landed here after register without a token
  return (
    <FormCard
      className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
      title="Check your inbox"
      label="We've sent you a verification link"
      backButtonHref="/auth/login"
      backButtonLabel="Back to sign in"
    >
      <div className="flex flex-col items-center mb-4">
        <MailIcon className="h-10 w-10 text-blue-600 mb-3" />
        <p className="text-sm text-gray-600 text-center">
          We've sent a verification link to <strong>{email || 'your email'}</strong>.
          Click it to finish setting up your account.
        </p>
      </div>
      <div className="space-y-3 w-full mt-4">
        <Input
          type="email"
          placeholder="Email"
          autoComplete="email"
          className="py-6 rounded-lg shadow-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={handleResend}
          variant="outline"
          className="w-full py-6 rounded-lg"
          disabled={resending}
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend verification email'}
        </Button>
      </div>
    </FormCard>
  )
}

const VerifyForm = () => (
  <Suspense fallback={null}>
    <VerifyFormInner />
  </Suspense>
)

export default VerifyForm
