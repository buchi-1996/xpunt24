'use client'

import React, { useEffect, useState } from 'react'
import BetCard, { BetCardProps } from '@/components/betrow/BetCard'
import LeagueTabs from '@/components/leagueTabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import Image from 'next/image'
import { api } from '@/lib/apiClient'

const Challenges = () => {
  const [challenges, setChallenges] = useState<BetCardProps[]>([])

  useEffect(() => {
    api.challenges.list({ status: 'OPEN' })
      .then((res) => setChallenges(res.data as BetCardProps[]))
      .catch((err) => console.error('Error fetching challenges:', err))
  }, [])

  return (
    <section className='py-10'>
      <div className="container">
        <div>
          <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
            <h4 className='text-[2rem] mb-2 md:text-[2.5rem] font-bold'>Challenges</h4>
            <div className='flex-1 flex items-center lg:justify-end gap-2'>
              <Input
                type='search'
                name="search"
                placeholder="Search User"
                className='w-full py-4 h-12 lg:w-44 bg-white rounded-xl border-none shadow-lg'
              />
              <Button variant="secondary" className='text-white text-[2rem] h-12 rounded-xl'>
                <Search className='font-bold' />
              </Button>
            </div>
          </div>
          <div className="grid lg:grid-cols-8 gap-10 pt-10">
            <div className="hidden lg:block col-span-2">
              <LeagueTabs />
            </div>
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
              <div className="col-span-6 w-full">
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                  {[...challenges].reverse().map(challenge => (
                    <BetCard key={challenge.id} {...challenge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Challenges
