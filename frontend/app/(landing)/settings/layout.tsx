import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Xpunt24 account, notification preferences, and privacy settings.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
