'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { POPULAR_LEAGUES } from '@/lib/leagues'
import { cn } from '@/lib/utils'

const LeagueTabs = () => {
  const params = useSearchParams()
  const active = params.get('league')

  const itemClasses = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100',
      isActive && 'bg-gray-100 font-semibold text-gray-900',
    )

  return (
    <nav className="flex flex-col place-self-start gap-3 w-full rounded-xl bg-white p-5">
      <h4 className="font-bold text-base px-3">Leagues</h4>
      <ul className="flex flex-col gap-1">
        <li>
          <Link href="/" className={itemClasses(!active)}>
            <span className="inline-flex h-5 w-5 items-center justify-center text-xs">★</span>
            <span>All Leagues</span>
          </Link>
        </li>
        {POPULAR_LEAGUES.map((l) => {
          const isActive = active === String(l.league.id)
          return (
            <li key={l.league.id}>
              <Link href={`/?league=${l.league.id}`} className={itemClasses(isActive)}>
                <Image
                  src={l.league.logo}
                  alt={l.league.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                />
                <span className="truncate">{l.league.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default LeagueTabs
