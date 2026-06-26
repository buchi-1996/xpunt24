'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import FormCard from '../formcard'
import GoogleSignBtn from '../GoogleSignBtn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { LoginValues, loginSchema } from '@/lib/formSchema'

const LoginFormInner = () => {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') ?? undefined
  const { refresh } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true)
    try {
      await api.auth.login(values)
      await refresh()
      router.replace(redirect ?? '/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormCard
      className="w-full shadow-xl max-w-[500px] border-0 flex flex-col items-center justify-center"
      title="Welcome back"
      label="Login to Xpunt24 account"
      backButtonHref="/auth/register"
      backButtonLabel="Don't have an account? Register"
      isLogin={true}
    >
      <GoogleSignBtn text="Sign In" redirect={redirect} />
      <div className="flex items-center gap-4 my-6">
        <span className="border-b w-full" />
        <small>Or</small>
        <span className="border-b w-full" />
      </div>
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
        <div>
          <Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="py-6 rounded-lg shadow-none"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full py-6 rounded-lg" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </Button>
      </form>
    </FormCard>
  )
}

const LoginForm = () => (
  <Suspense fallback={null}>
    <LoginFormInner />
  </Suspense>
)

export default LoginForm
