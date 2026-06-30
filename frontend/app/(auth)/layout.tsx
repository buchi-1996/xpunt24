import type { Metadata } from 'next'
import Footer from '@/components/footer/Footer'
import Providers from '@/context/Providers'
import HeaderSwitcher from '@/components/header/HeaderSwitcher'

export const metadata: Metadata = {
  title: {
    template: '%s | Xpunt24',
    default: 'Xpunt24',
  },
  description: 'Sign in or create your Xpunt24 account to start placing peer-to-peer sports challenges.',
}

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <HeaderSwitcher />
      <div className="container">
        <div className="sm:min-h-screen flex flex-col items-center justify-center">
          <main className="py-10 flex flex-col justify-center">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </Providers>
  )
}
