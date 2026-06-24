'use client'

import Link from 'next/link'
import { Match } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  '1H': '1H',
  '2H': '2H',
  HT: 'HT',
  ET: 'ET',
  BT: 'BREAK',
  P: 'PEN',
}

const LiveMatchRow = ({ match }: { match: Match }) => {
  const status = match.fixture?.status?.short ?? ''
  const elapsed = match.fixture?.status?.elapsed
  const homeGoals = match.goals?.home ?? 0
  const awayGoals = match.goals?.away ?? 0

  const label =
    status === 'HT'
      ? 'HT'
      : `${STATUS_LABELS[status] ?? 'LIVE'}${elapsed ? ` ${elapsed}'` : ''}`

  return (
    <Link href={`/matches/${match.fixture.id}`} className="block">
      <div className="bg-white flex items-center justify-between gap-4 py-3 px-4 border-b hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600 whitespace-nowrap">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            {label}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-xs md:text-sm font-semibold">
              <span className="truncate">{match.teams.home.name}</span>
              <span className="tabular-nums text-gray-900">{homeGoals}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs md:text-sm font-semibold mt-0.5">
              <span className="truncate">{match.teams.away.name}</span>
              <span className="tabular-nums text-gray-900">{awayGoals}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default LiveMatchRow
