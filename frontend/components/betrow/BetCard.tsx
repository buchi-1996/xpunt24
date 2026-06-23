'use client'
import Image from 'next/image'
import React from 'react'
import { Button } from '../ui/button'
import Oppose from '../negociation/Oppose'
import { useModal } from '@/hooks/useModal'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'

export interface BetCardProps {
  id: string
  matchData: unknown
  amount: number
  challengerPick: string | null
  opposerPick: string | null
  challenger: {
    username: string | null
    name: string | null
    walletBalance: number
    image: string | null
  }
}

interface ExpectedMatchData {
  fixture: { timestamp: number }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
}

function isValidMatchData(data: unknown): data is ExpectedMatchData {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (!obj['fixture'] || typeof obj['fixture'] !== 'object') return false
  const fixture = obj['fixture'] as Record<string, unknown>
  if (typeof fixture['timestamp'] !== 'number') return false
  if (!obj['teams'] || typeof obj['teams'] !== 'object') return false
  const teams = obj['teams'] as Record<string, unknown>
  if (!teams['home'] || typeof teams['home'] !== 'object') return false
  if (!teams['away'] || typeof teams['away'] !== 'object') return false
  const home = teams['home'] as Record<string, unknown>
  const away = teams['away'] as Record<string, unknown>
  return (
    typeof home['name'] === 'string' &&
    typeof home['logo'] === 'string' &&
    typeof away['name'] === 'string' &&
    typeof away['logo'] === 'string'
  )
}

const BetCard = ({ id, matchData, amount, challenger, challengerPick, opposerPick }: BetCardProps) => {
  const { openModal } = useModal()
  const avatarFallback =
    (challenger.name?.charAt(0)?.toUpperCase() ??
      challenger.username?.charAt(0)?.toUpperCase() ?? '') +
    (challenger.name?.charAt(1)?.toUpperCase() ??
      challenger.username?.charAt(1)?.toUpperCase() ?? '')

  if (!isValidMatchData(matchData)) {
    return (
      <div className="bg-white rounded-2xl w-full p-4">
        <div className="text-center text-red-500">Invalid match data</div>
      </div>
    )
  }

  const { fixture, teams } = matchData
  const { home, away } = teams
  const matchTime = fixture.timestamp ? format(new Date(fixture.timestamp * 1000), 'HH:mm') : '00:00'
  const matchDate = fixture.timestamp ? format(new Date(fixture.timestamp * 1000), 'dd/MM') : ''

  return (
    <div className="bg-white rounded-2xl w-full p-4">
      <div className="flex flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Avatar className='border-2 w-8 h-8 border-black'>
            <AvatarImage src={`${challenger.image}`} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <h4 className="font-bold text-[0.7rem]">{challenger.name || challenger.username}</h4>
        </div>
        <h4 className="text-xs font-bold bg-gray-50 rounded-lg p-2 text-gray-900">₦{amount}</h4>
      </div>
      <div className="grid grid-cols-7 gap-2 w-full mb-4">
        <div className="col-span-2 grid place-items-center">
          <Image
            src={home.logo || '/assets/clubImages/53e3c40b-85fe-4310-aa9e-b0f3b32a83c2.png'}
            alt={home.name || 'Home team'}
            width={500}
            height={500}
            className="w-10"
          />
          <h4 className="text-xs font-bold text-center">{home.name || 'Home'}</h4>
        </div>
        <div className="col-span-3 flex flex-col items-center justify-center">
          <span className="text-black mb-2 font-bold py-1 px-2 capitalize ring-4 ring-yellow-500 rounded-full bg-yellow-300 text-xs">
            {challengerPick || 'N/A'}
          </span>
          <h4 className="text-xl xl:text-2xl font-bold">{matchTime}</h4>
          <span className="text-xs text-gray-400">{matchDate}</span>
        </div>
        <div className="col-span-2 grid place-items-center">
          <Image
            src={away.logo || '/assets/clubImages/53e3c40b-85fe-4310-aa9e-b0f3b32a83c2.png'}
            alt={away.name || 'Away team'}
            width={500}
            height={500}
            className="w-10"
          />
          <h4 className="text-xs font-bold text-center">{away.name || 'Away'}</h4>
        </div>
      </div>
      <Button
        onClick={() => openModal(<Oppose id={id} match={matchData} amount={amount} opposerPick={opposerPick} />)}
        variant="secondary"
        className="w-full"
      >
        Oppose
      </Button>
    </div>
  )
}

export default BetCard
