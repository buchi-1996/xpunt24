import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deposit',
  description: 'Top up your Xpunt24 wallet with USDT to start placing challenges.',
}

export default function DepositLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
