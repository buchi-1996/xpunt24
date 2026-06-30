import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Xpunt24 account to place and manage peer-to-peer sports challenges.',
}

import React from 'react'
import LoginForm from '@/components/auth/login/LoginForm'


const Login = () => {
    return (
        <LoginForm />
    )
}

export default Login