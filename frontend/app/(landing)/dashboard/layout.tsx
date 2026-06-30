import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Xpunt24 betting dashboard — stats, activity, and quick actions.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
