import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Match Details',
  description: 'Place a peer-to-peer challenge on this match and find an opponent on Xpunt24.',
}

export default function MatchDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
