'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import OddsTable from './oddsTable'
import Link from 'next/link'
import { Match } from '@/types'
import { format } from 'date-fns'
import ScrollableTabClient from '../scrollabletabs/ScrollableTabClient'
import { api } from '@/lib/apiClient'
import { Skeleton } from '../ui/skeleton'
import { POPULAR_LEAGUES } from '@/lib/leagues'
import LiveMatchRow from './LiveMatchRow'

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P'])

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

const FixturesSkeleton = () => (
  <div className="mt-10 overflow-hidden rounded-br-2xl rounded-bl-2xl">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white flex flex-row items-center justify-between border-b gap-4 py-3 px-4 w-full">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    ))}
  </div>
)

interface BetRowProps {
  homepage: boolean
  searchParams: { league?: string }
}

const BetRow = ({ homepage, searchParams }: BetRowProps) => {
  const [allFixtures, setAllFixtures] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const leagueId = searchParams.league

  const fetchAll = (silent = false) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (!silent) setLoading(true)
    api.fixtures.list(today)
      .then((res) => setAllFixtures(res.data as Match[]))
      .catch((err) => console.error('Error fetching fixtures:', err))
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    fetchAll()

    // Silent background refresh every 5 min
    intervalRef.current = setInterval(() => fetchAll(true), REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Split the day's fixtures into live and upcoming buckets.
  // api-sports statuses: NS = not started, TBD = time to be defined; 1H/2H/HT/ET/BT/P = in play.
  // Everything else (FT, AET, PEN, PST, CANC, ABD, …) is finished/cancelled and gets dropped.
  const now = Date.now()
  const liveAll = allFixtures.filter((m) => LIVE_STATUSES.has(m.fixture?.status?.short ?? ''))
  const upcomingAll = allFixtures.filter((m) => {
    const status = m.fixture?.status?.short
    const startMs = m.fixture?.timestamp ? m.fixture.timestamp * 1000 : 0
    return (status === 'NS' || status === 'TBD') && startMs > now
  })

  const filterByLeague = (matches: Match[]) =>
    leagueId ? matches.filter((m) => m.league.id === parseInt(leagueId, 10)) : matches

  const live = filterByLeague(liveAll)
  const fixtures = filterByLeague(upcomingAll)

  return (
    <div className="rounded-2xl mt-6 bg-gray-50 w-full place-self-start">
      {homepage && (
        <div className="flex flex-row items-start mb-4 pt-6 px-4 justify-between">
          <div className="flex flex-col md:gap-4 md:flex-row md:items-center">
            <h4 className="text-2xl font-bold">Upcoming games</h4>
            <span className='text-gray-500 mt-2 font-normal text-sm'>{format(new Date(), 'dd/MM')}</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/matches">View all</Link>
          </Button>
        </div>
      )}
      <ScrollableTabClient leagues={POPULAR_LEAGUES} />
      {loading ? (
        <FixturesSkeleton />
      ) : (
        <>
          {live.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-4 pb-2">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">Live now</h4>
                <span className="text-xs text-gray-400">({live.length})</span>
              </div>
              <div className="overflow-hidden rounded-lg">
                {live.map((match: Match) => (
                  <LiveMatchRow key={match.fixture.id} match={match} />
                ))}
              </div>
            </div>
          )}
          {fixtures.length === 0 && live.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 mt-10">
              <h4 className="text-gray-500 font-bold text-sm">No games available</h4>
            </div>
          ) : fixtures.length === 0 ? null : (
            <div className="mt-6 overflow-hidden rounded-br-2xl rounded-bl-2xl">
              {live.length > 0 && (
                <h4 className="px-4 pb-2 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Upcoming
                </h4>
              )}
              {fixtures.map((match: Match) => (
                <OddsTable key={match.fixture.id} match={match} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BetRow
