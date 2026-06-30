import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Transactions',
  description: 'View your full deposit and withdrawal history on Xpunt24.',
}

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
