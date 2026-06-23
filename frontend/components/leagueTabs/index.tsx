import Link from 'next/link'
import React from 'react'

const LeagueTabs = () => {
    return (
        <div className='flex flex-col place-self-start gap-4 w-full rounded-xl bg-white p-6'>
            <h4 className='font-bold text-xl'>Leagues</h4>
            <ul className='flex flex-col gap-2'>
                <Link href="/">
                    <li>Premier League</li>
            </Link>
                <Link href="/">
                    <li>La Liga</li>
                </Link>
                <Link href="/">
                    <li>League 1</li>
                </Link>
                <Link href="/">
                    <li>Serie A</li>
                </Link>
                <Link href="/">
                    <li>Bundesliga</li>
                </Link>
                <Link href="/">
                    <li>Eredvisie</li>
                </Link>
                <Link href="/">
                    <li>Argentina</li>
                </Link>
            </ul>
        </div>
    )
}

export default LeagueTabs