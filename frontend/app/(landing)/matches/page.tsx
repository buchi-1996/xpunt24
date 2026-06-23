import BetRow from '@/components/betrow'
import SkeletonLoader from '@/components/betrow/SkeletonLoader'
import LeagueTabs from '@/components/leagueTabs'
// import { Skeleton } from '@/components/ui/skeleton'
import React, { Suspense } from 'react'

const page = async ({ searchParams }: { searchParams: Promise<{ league?: string }> }) => {
    const params = await searchParams
    
    return (
        <section className='py-10' key={Math.random()}>
            <div className="container">
                <div className='grid gap-6'>
                    <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                        <h4 className='text-[2rem] md:text-[2.5rem] font-bold'>Matches</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-20">
                        <div className="hidden md:block col-span-2">
                            <LeagueTabs />
                        </div>
                        <div className="w-full col-auto md:col-span-6">

                            <div className="rounded-2xl pt-6 bg-gray-50 w-full  place-self-start">

                                <Suspense fallback={<SkeletonLoader homepage={false} />}>
                                    <BetRow homepage={false} searchParams={params} />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default page