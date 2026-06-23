'use client'

import React from 'react'
import FormCard from '../formcard'
import GoogleSignBtn from '../GoogleSignBtn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const RegisterForm = () => {
  return (
    <FormCard
      className="w-full max-w-[500px] shadow-xl border-0 flex flex-col items-center justify-center"
      title="Register"
      label="Create an account"
      backButtonHref="/auth/login"
      backButtonLabel="Have an account? Login"
    >
      <GoogleSignBtn text="Sign Up" />
      <div className="flex items-center gap-4 my-6">
        <span className="border-b w-full" />
        <small>Or</small>
        <span className="border-b w-full" />
      </div>
      <div className="space-y-4 w-full">
        <Input type="text" placeholder="Username" className="py-6 rounded-lg shadow-none" disabled />
        <Input type="email" placeholder="Email" className="py-6 rounded-lg shadow-none" disabled />
        <Input type="password" placeholder="Password" className="py-6 rounded-lg shadow-none" disabled />
        <Button className="w-full py-6 rounded-lg" disabled>Create Account</Button>
      </div>
    </FormCard>
  )
}

export default RegisterForm
