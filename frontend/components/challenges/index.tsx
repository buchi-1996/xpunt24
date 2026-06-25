'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import Autoplay from 'embla-carousel-autoplay'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import Link from 'next/link'
import BetCard from '../betrow/BetCard'
import Image from 'next/image'
import { api } from '@/lib/apiClient'

export interface ChallengeProps {
  _id: string
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

// Drop rows the backend couldn't resolve to a real fixture — happens when an old challenge
// references a fixtureId that the fixture API no longer returns (deleted, postponed, or the
// previous api-sports key was suspended). Showing them as "Invalid match data" cards is worse
// than just not surfacing them in the featured carousel.
function hasValidMatchData(c: ChallengeProps): boolean {
  const m = c.matchData as { fixture?: { timestamp?: number }; teams?: { home?: { name?: string }; away?: { name?: string } } } | null
  if (!m || typeof m !== 'object') return false
  if (typeof m.fixture?.timestamp !== 'number') return false
  if (!m.teams?.home?.name || !m.teams?.away?.name) return false
  return true
}

const ChallengeSlides = () => {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })
  )
  const [challenges, setChallenges] = useState<ChallengeProps[]>([])

  useEffect(() => {
    api.challenges.list({ status: 'OPEN' })
      .then((res) => {
        const valid = (res.data as ChallengeProps[]).filter(hasValidMatchData)
        setChallenges(valid)
      })
      .catch((err) => console.error('Error fetching challenges:', err))
  }, [])

  return (
    <div className="px-4 sm:px-0">
      <div className="rounded-2xl bg-gray-50 w-full p-5 place-self-start">
        {challenges.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-4'>
            <Image
              src="/assets/undraw_no-data_ig65.svg"
              alt="No challenges available"
              width={100}
              height={100}
              className="w-24 h-full object-cover rounded-2xl"
            />
            <p>No available challenges</p>
          </div>
        ) : (
          <>
            <div className="flex flex-row items-start mb-4 sm:mb-6 justify-between">
              <h4 className="text-xl sm:text-2xl font-bold">Featured Challenges</h4>
              <Button variant="ghost" size="sm">
                <Link href="/challenges">View all</Link>
              </Button>
            </div>
            <div className="col-span-3 bg-gray-50 rounded-2xl place-self-start w-full">
              <Carousel
                plugins={[plugin.current]}
                className="w-full group"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
              >
                <CarouselContent className="-ml-1">
                  {challenges.map((challenge: ChallengeProps) => (
                    <CarouselItem key={challenge._id} className="pl-1 md:basis-full lg:basis-1/2">
                      <BetCard {...challenge} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className='hidden group-hover:flex' />
                <CarouselNext className='hidden group-hover:flex' />
              </Carousel>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ChallengeSlides
