'use client'

import React, { useState, useEffect, ChangeEvent, useTransition } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useModal } from '@/hooks/useModal'
import LoaderSpinner from '../spinner'
import { useWallet } from '@/context/wallet/WalletContect'
import { api } from '@/lib/apiClient'
import { useLimits } from '@/context/limits/LimitsContext'
import { findPickOption } from '@/lib/picks'
import { Match } from '@/types'

type ChallengeProps = {
  match: Match
  selectedOption?: string
}

const Challenge = ({ match, selectedOption }: ChallengeProps) => {
  const { refresh: refreshWallet } = useWallet()
  const { minStake } = useLimits()
  const [input, setInput] = useState<string>('')
  const [potentialWin, setPotentialWin] = useState<number>(0)
  const { setIsOpen } = useModal()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setPotentialWin(Number(input) * 2)
  }, [input])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const option = findPickOption(selectedOption)

  const handleCreateChallenge = () => {
    if (!input || Number(input) < minStake) {
      toast.error(`Please enter a valid amount (minimum ${minStake} USDT)`)
      return
    }
    if (!option) {
      toast.error('Please select a pick option')
      return
    }

    startTransition(async () => {
      try {
        await api.challenges.create({
          fixtureId: String(match.fixture.id),
          market: option.market,
          marketParam: option.marketParam,
          pick: option.pick,
          stake: Number(input),
          currency: 'USDT',
        })

        toast.success('Challenge created successfully', { id: 'challenge-success' })
        setIsOpen(false)
        setInput('')
        // Tell the lobby / Featured carousel to re-fetch so the new challenge appears
        // immediately without a manual refresh.
        window.dispatchEvent(new Event('challenges:refresh'))
        await refreshWallet()
      } catch (err: unknown) {
        const error = err as { status?: number; message?: string }
        if (error.status === 401) {
          setIsOpen(false)
          toast.error('Not logged in!', {
            id: 'login-warning',
            duration: 10000,
            description: 'Please login to create a challenge',
            action: { label: 'Login', onClick: () => router.push('/auth/login') },
          })
        } else if (error.message?.includes('Insufficient')) {
          setIsOpen(false)
          toast.error('Insufficient balance to create challenge', {
            id: 'insufficient-balance',
            duration: 10000,
            description: 'Please top up your wallet',
            action: { label: 'Top Up', onClick: () => router.push('/deposit') },
          })
        } else {
          toast.error(error.message ?? 'Failed to create challenge', { id: 'challenge-error' })
        }
      }
    })
  }

  return (
    <div className="px-5 sm:px-0 pb-4">
      <div className="flex flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <span className="text-[0.9rem] md:text-[1rem] truncate text-gray-700 font-bold">
            {match.teams.home.name}
          </span>
          <span className="text-[0.9rem] md:text-[1rem] truncate text-gray-700 font-bold">
            {match.teams.away.name}
          </span>
        </div>
        <span className="text-black font-bold py-1 px-2 ring-4 ring-yellow-500 rounded-full bg-yellow-300 text-xs whitespace-nowrap">
          {option?.longLabel ?? selectedOption}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Input
            onChange={handleInputChange}
            value={input}
            type="number"
            name="amount"
            id="amount"
            className="flex-1 w-full py-4 mt-1 bg-gray-50 rounded-xl h-14 border-none shadow-none ring-2 ring-blue-600 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <small className="text-xs text-gray-600">
          Min stake <span className="font-bold">{minStake} USDT</span>
        </small>
        <div className="flex items-center justify-between my-6 border-t border-b py-2">
          <h4 className="font-bold text-gray-600">Potential win:</h4>
          <h2 className="font-bold text-gray-800">{potentialWin}</h2>
        </div>
        <Button
          onClick={handleCreateChallenge}
          type="button"
          variant="secondary"
          disabled={isPending}
          className="py-6 font-bold sm:text-[1rem] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? <LoaderSpinner color="bg-white" /> : 'Create Challenge'}
        </Button>
      </div>
    </div>
  )
}

export default Challenge
