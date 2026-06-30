import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Xpunt24 — Peer-to-Peer Sports Challenges',
  description: 'Browse live matches, place challenges, and compete head-to-head with other sports fans on Xpunt24.',
}

import BetRow from "@/components/betrow"
import SkeletonLoader from "@/components/betrow/SkeletonLoader"
import ChallengeSlides from "@/components/challenges"
import Hero from "@/components/hero/Hero"
import LeagueTabs from "@/components/leagueTabs"
import { Suspense } from "react"
// import { Button } from "@/components/ui/button"
// import Image from "next/image"




const Home = async ({searchParams}: { searchParams: Promise<{ league?: string }> }) => {

  // const leaguesData = getLeagues()
  // const fixturesData = getTodayFixtures()
  // const fixtures = await getTodayFixtures()
  const params = await searchParams


  // const [leagues, fixtures] = await Promise.all([leaguesData, fixturesData])

  // console.log('The fixtures', fixtures)

  return (
    <div>
      <Hero />
      <section className="py-6 md:py-10">
        <div className="sm:container">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="hidden md:block col-span-1 overflow-hidden rounded-2xl">
              <div className="hidden lg:block">
                <LeagueTabs />
              </div>
            </div>
            <div className="col-span-3">
              <ChallengeSlides />
              <Suspense fallback={<SkeletonLoader homepage />}>                
                <BetRow homepage searchParams={params} />
              </Suspense>

            </div>

            <div className='hidden md:block col-span-1 overflow-hidden rounded-2xl'>
              {/* <Image src="/assets/395fa7ba8ce46613be6fe40218389d41.png" width={500} height={500} alt="" className='w-full h-full object-cover' /> */}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home