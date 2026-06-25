'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, SwordsIcon, TicketIcon, UserRoundIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
  matchPrefixes: string[]
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Home', Icon: HomeIcon, matchPrefixes: ['/'] },
  { href: '/challenges', label: 'Challenges', Icon: SwordsIcon, matchPrefixes: ['/challenges'] },
  { href: '/wagers', label: 'Wagers', Icon: TicketIcon, matchPrefixes: ['/wagers'] },
  { href: '/profile', label: 'Profile', Icon: UserRoundIcon, matchPrefixes: ['/profile', '/settings'] },
]

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/') return pathname === '/'
  return item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/'

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-200 bg-white/90 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 px-2 pt-2 pb-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item)
          const { Icon } = item
          return (
            <li key={item.href} className="flex justify-center">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200',
                  active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-700',
                )}
                prefetch={false}
              >
                <span
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200',
                    active && 'bg-blue-50 scale-105',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      active ? 'stroke-[2.4]' : 'stroke-[1.75]',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-none transition-all duration-200',
                    active ? 'font-bold' : 'font-medium',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
