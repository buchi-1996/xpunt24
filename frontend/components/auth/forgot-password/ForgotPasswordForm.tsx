'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2Icon, Loader2 } from 'lucide-react'
import FormCard from '../formcard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/apiClient'
import { RequestResetValues, requestResetSchema } from '@/lib/formSchema'

const ForgotPasswordForm = () => {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const onSubmit = async (values: RequestResetValues) => {
    setSubmitting(true)
    try {
      await api.auth.requestPasswordReset(values.email)
    } catch {
      // Don't surface errors here — the backend returns the same generic ack on success
      // or no-op; we mirror that on the client by showing the same confirmation either way.
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <FormCard
        className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
        title="Check your inbox"
        label="We've sent reset instructions if your email matched an account"
        backButtonHref="/auth/login"
        backButtonLabel="Back to sign in"
      >
        <div className="flex flex-col items-center py-4">
          <CheckCircle2Icon className="h-10 w-10 text-green-600 mb-3" />
          <p className="text-sm text-gray-600 text-center max-w-xs">
            If an account exists for that email, you'll receive a link to reset your password
            within a minute. The link expires in 1 hour.
          </p>
        </div>
      </FormCard>
    )
  }

  return (
    <FormCard
      className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
      title="Forgot password?"
      label="We'll email you a link to reset it"
      backButtonHref="/auth/login"
      backButtonLabel="Back to sign in"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
        <div>
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="py-6 rounded-lg shadow-none"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full py-6 rounded-lg" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
        </Button>
      </form>
    </FormCard>
  )
}

export default ForgotPasswordForm
