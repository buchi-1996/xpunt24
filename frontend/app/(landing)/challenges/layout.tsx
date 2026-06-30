import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Challenges',
  description: 'Browse open peer-to-peer sports challenges and oppose other fans on Xpunt24.',
}

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
