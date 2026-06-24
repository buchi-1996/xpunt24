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

  // Client-side filter — no extra network call
  const fixtures = leagueId
    ? allFixtures.filter((m) => m.league.id === parseInt(leagueId, 10))
    : allFixtures

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
      ) : fixtures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 mt-10">
          <h4 className="text-gray-500 font-bold text-sm">No games available</h4>
        </div>
      ) : (
        <div className="mt-10 overflow-hidden rounded-br-2xl rounded-bl-2xl">
          {fixtures.map((match: Match) => (
            <OddsTable key={match.fixture.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BetRow
