import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your free Xpunt24 account and start placing peer-to-peer sports challenges today.',
}

import RegisterForm from '@/components/auth/register/RegisterForm'
import React from 'react'

const Register = () => {
  return (
    <>
      <RegisterForm />
    </>
  )
}

export default Register