import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Withdraw',
  description: 'Withdraw your Xpunt24 winnings to your USDT wallet.',
}

export default function WithdrawLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
