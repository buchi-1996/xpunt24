'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Challenge from '@/components/negociation/Challenge'
import { useModal } from '@/hooks/useModal'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { formatFixtureDateTime } from '@/lib/utils'
import { PICK_OPTIONS, PICK_GROUPS, PickGroup } from '@/lib/picks'
import { cn } from '@/lib/utils'
import { Match } from '@/types'

type Props = {
  match: Match
}

// Tighter "what's covered" copy per category — appears under each section title.
const GROUP_BLURB: Record<PickGroup, string> = {
  'Match Result': '90-minute outcome — 1, X, 2 or No Draw',
  'Double Chance': 'Cover two of three outcomes',
  'Both Teams to Score': 'Whether both sides find the net',
  'Goals': 'Total goals scored — pick your line',
  'First Half': 'Settled at half-time only',
  'Second Half': 'Settled on the 2nd-half score only',
}

const MatchMarkets = ({ match }: Props) => {
  const { openModal } = useModal()
  const requireAuth = useRequireAuth()
  const { fixture, teams, league } = match
  const { home, away } = teams
  const { timestamp } = fixture

  // Default to the most popular three categories expanded; rest collapsed.
  const [open, setOpen] = useState<Record<PickGroup, boolean>>({
    'Match Result': true,
    'Double Chance': true,
    'Both Teams to Score': true,
    'Goals': true,
    'First Half': false,
    'Second Half': false,
  })

  const toggle = (group: PickGroup) => setOpen((prev) => ({ ...prev, [group]: !prev[group] }))

  const handleOptionClick = (optionId: string) => {
    requireAuth(
      () => openModal(<Challenge match={match} selectedOption={optionId} />),
      'Log in to place a wager',
    )
  }

  return (
    <section className="py-6 md:py-10">
      <div className="container">
        <Button variant="ghost" className="font-bold mb-4 pl-0" asChild>
          <Link href="/matches">
            <ArrowLeft className="w-5 h-5 mr-1" /> Back to matches
          </Link>
        </Button>

        {/* Sticky-ish match header */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {league?.logo && (
                <Image
                  src={league.logo}
                  alt={league.name ?? ''}
                  width={18}
                  height={18}
                  className="h-4 w-4 object-contain"
                />
              )}
              <span className="text-xs font-semibold text-gray-700">{league?.name}</span>
            </div>
            <span className="text-xs text-gray-600 font-medium">{formatFixtureDateTime(timestamp)}</span>
          </div>
          <div className="px-6 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center text-center">
              {home.logo && (
                <Image src={home.logo} alt={home.name} width={56} height={56} className="h-12 w-12 object-contain mb-2" />
              )}
              <h3 className="font-bold text-sm md:text-base">{home.name}</h3>
            </div>
            <div className="text-center">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">vs</span>
            </div>
            <div className="flex flex-col items-center text-center">
              {away.logo && (
                <Image src={away.logo} alt={away.name} width={56} height={56} className="h-12 w-12 object-contain mb-2" />
              )}
              <h3 className="font-bold text-sm md:text-base">{away.name}</h3>
            </div>
          </div>
        </div>

        {/* Markets */}
        <div className="grid gap-3">
          {PICK_GROUPS.map((group) => {
            const options = PICK_OPTIONS.filter((o) => o.group === group)
            if (options.length === 0) return null
            const isOpen = open[group]

            return (
              <div key={group} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(group)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <h4 className="font-bold text-sm">{group}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{GROUP_BLURB[group]}</p>
                  </div>
                  <ChevronDown
                    className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {options.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => handleOptionClick(o.id)}
                        className="group flex flex-col items-start gap-0.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors px-3 py-3 text-left"
                      >
                        <span className="font-bold text-sm text-gray-900 group-hover:text-blue-700">
                          {o.shortLabel}
                        </span>
                        <span className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                          {o.description ?? o.longLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default MatchMarkets
