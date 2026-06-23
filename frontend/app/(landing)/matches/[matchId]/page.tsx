'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import MatchMarkets from '@/components/betrow/MatchMarkets'
import { api } from '@/lib/apiClient'
import { Match } from '@/types'

const MatchDetails = ({ params }: { params: Promise<{ matchId: string }> }) => {
  const { matchId } = use(params)
  const [match, setMatch] = useState<Match | null>(null)

  useEffect(() => {
    api.fixtures.get(matchId)
      .then((res) => setMatch(res.data as Match))
      .catch((err) => console.error('Error fetching match:', err))
  }, [matchId])

  if (!match) return null

  return <MatchMarkets match={match} />
}

export default MatchDetails
