import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Xpunt24',
    default: 'Xpunt24 — Peer-to-Peer Sports Challenges',
  },
  description: 'Xpunt24 lets you challenge other fans with real money peer-to-peer sports wagers. Pick your side, set your stake, and find an opponent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakartaSans.className} ${plusJakartaSans.variable}`}>
      <body className="overflow-x-hidden antialiased bg-[#F1F3FF]">
        {children}
      </body>
    </html>
  )
}
