import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your Xpunt24 account.',
}

import ResetPasswordForm from '@/components/auth/reset-password/ResetPasswordForm'

const ResetPassword = () => <ResetPasswordForm />

export default ResetPassword
