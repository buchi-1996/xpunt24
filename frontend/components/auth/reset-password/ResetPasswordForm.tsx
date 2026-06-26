'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import FormCard from '../formcard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { ResetValues, resetSchema } from '@/lib/formSchema'

const ResetPasswordFormInner = () => {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const { refresh } = useAuth()

  const [submitting, setSubmitting] = useState(false)

  // No token in the URL = wrong path. Redirect to forgot-password so they can request one.
  useEffect(() => {
    if (!token) router.replace('/auth/forgot-password')
  }, [token, router])

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const onSubmit = async (values: ResetValues) => {
    if (!token) return
    setSubmitting(true)
    try {
      await api.auth.resetPassword(token, values.password)
      await refresh()
      toast.success('Password updated')
      router.replace('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reset failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) return null

  return (
    <FormCard
      className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
      title="Set a new password"
      label="Choose something you'll remember"
      backButtonHref="/auth/login"
      backButtonLabel="Back to sign in"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
        <div>
          <Input
            type="password"
            placeholder="New password (min 10 characters)"
            autoComplete="new-password"
            className="py-6 rounded-lg shadow-none"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div>
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="py-6 rounded-lg shadow-none"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full py-6 rounded-lg" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
        </Button>
      </form>
    </FormCard>
  )
}

const ResetPasswordForm = () => (
  <Suspense fallback={null}>
    <ResetPasswordFormInner />
  </Suspense>
)

export default ResetPasswordForm
