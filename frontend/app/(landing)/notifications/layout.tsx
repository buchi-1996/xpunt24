import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Your Xpunt24 activity — challenge updates, settlement results, and alerts.',
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
