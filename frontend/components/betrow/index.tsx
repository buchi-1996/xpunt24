'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import OddsTable from './oddsTable'
import Link from 'next/link'
import { Match, LeagueProps } from '@/types'
import { format } from 'date-fns'
import ScrollableTabClient from '../scrollabletabs/ScrollableTabClient'
import { api } from '@/lib/apiClient'
import { Skeleton } from '../ui/skeleton'

const POPULAR_LEAGUES: LeagueProps[] = [
  { league: { id: 39,  name: 'Premier League',   logo: 'https://media.api-sports.io/football/leagues/39.png'  }, country: { name: 'England',     code: 'GB', flag: 'https://media.api-sports.io/flags/gb.svg' } },
  { league: { id: 140, name: 'La Liga',           logo: 'https://media.api-sports.io/football/leagues/140.png' }, country: { name: 'Spain',       code: 'ES', flag: 'https://media.api-sports.io/flags/es.svg' } },
  { league: { id: 135, name: 'Serie A',           logo: 'https://media.api-sports.io/football/leagues/135.png' }, country: { name: 'Italy',       code: 'IT', flag: 'https://media.api-sports.io/flags/it.svg' } },
  { league: { id: 78,  name: 'Bundesliga',        logo: 'https://media.api-sports.io/football/leagues/78.png'  }, country: { name: 'Germany',     code: 'DE', flag: 'https://media.api-sports.io/flags/de.svg' } },
  { league: { id: 61,  name: 'Ligue 1',           logo: 'https://media.api-sports.io/football/leagues/61.png'  }, country: { name: 'France',      code: 'FR', flag: 'https://media.api-sports.io/flags/fr.svg' } },
  { league: { id: 2,   name: 'Champions League',  logo: 'https://media.api-sports.io/football/leagues/2.png'   }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 3,   name: 'Europa League',     logo: 'https://media.api-sports.io/football/leagues/3.png'   }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 848, name: 'Conference League', logo: 'https://media.api-sports.io/football/leagues/848.png' }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 88,  name: 'Eredivisie',        logo: 'https://media.api-sports.io/football/leagues/88.png'  }, country: { name: 'Netherlands', code: 'NL', flag: 'https://media.api-sports.io/flags/nl.svg' } },
  { league: { id: 94,  name: 'Primeira Liga',     logo: 'https://media.api-sports.io/football/leagues/94.png'  }, country: { name: 'Portugal',    code: 'PT', flag: 'https://media.api-sports.io/flags/pt.svg' } },
  { league: { id: 203, name: 'Süper Lig',         logo: 'https://media.api-sports.io/football/leagues/203.png' }, country: { name: 'Turkey',      code: 'TR', flag: 'https://media.api-sports.io/flags/tr.svg' } },
]

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
