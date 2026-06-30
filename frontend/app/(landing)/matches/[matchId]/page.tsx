'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import MatchMarkets from '@/components/betrow/MatchMarkets'
import { api } from '@/lib/apiClient'
import { Match } from '@/types'

const MatchDetails = ({ params }: { params: Promise<{ matchId: string }> }) => {
  const { matchId } = use(params)
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    api.fixtures.get(matchId)
      .then((res) => { if (active) setMatch(res.data as Match) })
      .catch((err) => { console.error('Error fetching match:', err); if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [matchId])

  if (loading) {
    return <div className="container py-16 text-center text-sm text-gray-500">Loading match…</div>
  }
  if (error || !match) {
    return (
      <div className="container py-16 text-center text-sm text-gray-500">
        Couldn&apos;t load this match&apos;s markets right now. Please try again shortly.
      </div>
    )
  }

  return <MatchMarkets match={match} />
}

export default MatchDetails
