import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '404 — Page Not Found | Xpunt24',
  description: 'This page does not exist.',
}

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

export default function NotFound() {
  return (
    <html lang="en" className={font.className}>
      <body className="min-h-screen bg-[#F1F3FF] flex flex-col items-center justify-center px-4">

        {/* Logo */}
        <Link href="/" className="mb-10">
          <Image
            src="/assets/logo-xpunt.png"
            alt="Xpunt24"
            width={140}
            height={40}
            className="h-10 w-auto"
          />
        </Link>

        {/* Football illustration */}
        <div className="relative mb-8 select-none">
          <Image
            src="/assets/football.png"
            alt=""
            width={100}
            height={100}
            className="w-24 h-24 opacity-20 absolute -top-6 -right-8 rotate-12"
          />
          {/* Big gradient 404 */}
          <p
            className="text-[7rem] md:text-[10rem] font-extrabold leading-none tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #4439DF 0%, #15206D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </p>
        </div>

        {/* Message */}
        <div className="text-center max-w-sm mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Looks like this page went offside
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Head back to the pitch and find your next challenge.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(to right, #4439DF, #15206D)' }}
          >
            Back to Home
          </Link>
          <Link
            href="/matches"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Browse Matches
          </Link>
        </div>

      </body>
    </html>
  )
}
