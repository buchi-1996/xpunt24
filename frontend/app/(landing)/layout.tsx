import type { Metadata } from 'next'
import Footer from '@/components/footer/Footer'
import Providers from '@/context/Providers'
import HeaderSwitcher from '@/components/header/HeaderSwitcher'
import BottomNav from '@/components/bottomNav'
import UnverifiedEmailBanner from '@/components/auth/UnverifiedEmailBanner'

export const metadata: Metadata = {
  title: {
    template: '%s | Xpunt24',
    default: 'Xpunt24 — Peer-to-Peer Sports Challenges',
  },
  description: 'Xpunt24 lets you challenge other fans with real money peer-to-peer sports wagers. Pick your side, set your stake, and find an opponent.',
}

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <HeaderSwitcher />
      <UnverifiedEmailBanner />
      {children}
      <BottomNav />
      <Footer />
    </Providers>
  )
}
