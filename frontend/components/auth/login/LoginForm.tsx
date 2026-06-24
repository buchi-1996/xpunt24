'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import FormCard from '../formcard'
import GoogleSignBtn from '../GoogleSignBtn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const LoginFormInner = () => {
  const params = useSearchParams()
  const redirect = params.get('redirect') ?? undefined

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
      <div className="space-y-4 w-full">
        <Input type="email" placeholder="Email" className="py-6 rounded-lg shadow-none" disabled />
        <Input type="password" placeholder="Password" className="py-6 rounded-lg shadow-none" disabled />
        <Button className="w-full py-6 rounded-lg" disabled>Sign In</Button>
      </div>
    </FormCard>
  )
}

const LoginForm = () => (
  <Suspense fallback={null}>
    <LoginFormInner />
  </Suspense>
)

export default LoginForm
