"use client"

import BookButton from '@/components/betrow/BookButton'
import LeagueTabs from '@/components/leagueTabs'
import Challenge from '@/components/negociation/Challenge'
import { Button } from '@/components/ui/button'
import { useModal } from '@/hooks/useModal'
import { formatFixtureDateTime } from '@/lib/utils'
import { Match } from '@/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'


type OddsTableProps = {
    match: Match;
};

const MatchMarkets = ({ match }: OddsTableProps) => {

    const { openModal } = useModal();
    const { fixture, teams } = match;
    const { home, away } = teams;
    const { timestamp } = fixture;



    const handleOptionClick = (option: string) => {
        openModal(
            <Challenge match={match} selectedOption={option} />
        );
    };

    return (
        <section className='py-10'>
            <div className="container">
                <div className='grid gap-6'>
                    <Button variant="ghost" className='font-bold place-self-start' asChild>
                        <Link href="/matches"><ArrowLeft size={36} /> Back</Link>
                    </Button>
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-10">
                        <div className="hidden md:block col-span-2">
                            <LeagueTabs />
                        </div>
                        <div className="w-full col-auto md:col-span-6">
                            <div className=' bg-white rounded-lg py-6 gap-4'>
                                <div className='px-6 my-2'>
                                    <small className='text-sm text-gray-500'>{formatFixtureDateTime(timestamp)} </small>
                                </div>
                                <div className='flex flex-col lg:flex-row lg:items-center py-2 px-6  bg-gray-50'>
                                    <div className='flex items-center gap-4 w-full rounded-lg'>
                                        <h4 className='text-[1.1rem] md:text-[1.5rem] font-bold'>{home.name}</h4>
                                        <span>Vs</span>
                                        <h4 className='text-[1.1rem] md:text-[1.5rem] font-bold'>{away.name}</h4>
                                    </div>
                                </div>

                                {/* Remember to add In a tab to easily go to specific markets */}
                                {/* List of markets */}
                                <div className='grid gap-4 pt-4 px-6'>
                                    <div className='grid gap-2 border-b py-3'>
                                        <small className='text-sm font-bold text-gray-500'>1x2</small>
                                        <div className="flex flex-row items-center w-full gap-1 md:gap-2 ">
                                            <BookButton onClick={() => handleOptionClick("home")}>1</BookButton>
                                            <BookButton onClick={() => handleOptionClick("draw")}>2</BookButton>
                                        </div>
                                    </div>

                                    <div className='grid gap-2 border-b py-3'>
                                        <small className='text-sm font-bold text-gray-500'>GG/NG</small>
                                        <div className="flex flex-row items-center w-full gap-1 md:gap-2 ">
                                            <BookButton onClick={() => handleOptionClick("GG")}>GG</BookButton>
                                            <BookButton onClick={() => handleOptionClick("NG")}>NG</BookButton>
                                        </div>
                                    </div>
                                    <div className='grid gap-2 border-b py-3'>
                                        <small className='text-sm font-bold text-gray-500'>Over/Under 2.5</small>
                                        <div className="flex flex-row items-center w-full gap-1 md:gap-2 ">
                                            <BookButton onClick={() => handleOptionClick("Over 2.5")}>Over 2.5</BookButton>
                                            <BookButton onClick={() => handleOptionClick("Under 2.5")}>Under 2.5</BookButton>

                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default MatchMarkets