'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import FormCard from '../formcard'
import GoogleSignBtn from '../GoogleSignBtn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/apiClient'
import { RegisterValues, registerSchema } from '@/lib/formSchema'

const RegisterForm = () => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onBlur',
  })

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true)
    try {
      await api.auth.register(values)
      // Always route to the "check your inbox" page — the API gives the same generic
      // response whether the email was new, already linked, or already in use.
      router.replace(`/auth/verify?email=${encodeURIComponent(values.email)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormCard
      className="w-full max-w-[500px] shadow-xl border-0 flex flex-col items-center justify-center"
      title="Create your account"
      label="Sign up to Xpunt24"
      backButtonHref="/auth/login"
      backButtonLabel="Have an account? Login"
    >
      <GoogleSignBtn text="Sign Up" />
      <div className="flex items-center gap-4 my-6">
        <span className="border-b w-full" />
        <small>Or</small>
        <span className="border-b w-full" />
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full">
        <div>
          <Input
            type="text"
            placeholder="Full name"
            autoComplete="name"
            className="py-6 rounded-lg shadow-none"
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.name.message}</p>
          )}
        </div>
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
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 10 characters)"
              autoComplete="new-password"
              className="py-6 rounded-lg shadow-none pr-10"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-500 mt-1 pl-1">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full py-6 rounded-lg" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
        </Button>
      </form>
    </FormCard>
  )
}

export default RegisterForm
