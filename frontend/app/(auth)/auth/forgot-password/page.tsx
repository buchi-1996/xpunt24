import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your Xpunt24 account password.',
}

import ForgotPasswordForm from '@/components/auth/forgot-password/ForgotPasswordForm'

const ForgotPassword = () => <ForgotPasswordForm />

export default ForgotPassword
