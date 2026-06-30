import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View and manage your public Xpunt24 profile.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
