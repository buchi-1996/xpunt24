import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to activate your Xpunt24 account.',
}

import VerifyForm from '@/components/auth/verify/VerifyForm'

const Verify = () => <VerifyForm />

export default Verify
