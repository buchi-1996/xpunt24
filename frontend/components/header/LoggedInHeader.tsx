'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ChevronDownIcon, EyeIcon, RefreshCwIcon } from 'lucide-react'
import { useAuth } from '@/context/auth/AuthContext'
import { useWallet } from '@/context/wallet/WalletContect'
import LogoutMenu from './LogoutMenu.tsx'

const LoggedInHeader = () => {
    const { user } = useAuth()
    const { balance, refresh, isRefreshing } = useWallet()

    const avatarFallback =
        (user?.name?.charAt(0)?.toUpperCase() ?? '') +
        (user?.name?.charAt(1)?.toUpperCase() ?? '')

    return (
        <header className='z-50 sticky top-0 w-full bg-hero-bg bg-cover bg-center'>
            <div className="container">
                <div className='flex flex-row items-center py-3 justify-between'>
                    <Link href="/"><h4 className='font-bold text-xl text-white'>Xpunt24</h4></Link>
                    <div className='flex flex-row items-center gap-4'>
                        <DropdownMenu>
                            <div className='flex flex-row items-center gap-1'>
                                <span className='text-white font-bold text-sm'>{balance} USDT</span>
                                <DropdownMenuTrigger>
                                    <div className='flex flex-row items-center gap-4'>
                                        <div className='py-.5 pr-2 rounded-full hover:bg-[#eeeeee6d] flex flex-row items-center gap-2'>
                                            <Avatar className='border-2 border-black'>
                                                <AvatarImage src={user?.image ?? ''} />
                                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                                            </Avatar>
                                            <ChevronDownIcon className='w-6 h-6 text-white' />
                                        </div>
                                    </div>
                                </DropdownMenuTrigger>
                            </div>
                            <DropdownMenuContent className="w-auto rounded-xl px-2 pb-2 shadow-2xl shadow-gray-200">
                                <DropdownMenuLabel>
                                    <div className='py-4 flex flex-row items-baseline justify-between gap-4'>
                                        <div className='flex flex-row items-center gap-2'>
                                            <Avatar className='border-2 border-black'>
                                                <AvatarImage src={user?.image ?? ''} />
                                                <AvatarFallback>{avatarFallback}</AvatarFallback>
                                            </Avatar>
                                            <div className='flex flex-col items-start'>
                                                <p className='text-xs'>Hi, <span className='capitalize'>{user?.name}</span></p>
                                                <span className='text-black font-bold text-sm'>{balance} USDT</span>
                                            </div>
                                        </div>
                                        <div className='flex flex-row items-center'>
                                            <Button variant="ghost" size="icon">
                                                <EyeIcon className='w-4 h-4 text-gray-400' />
                                            </Button>
                                            <Button onClick={refresh} variant="ghost" size="icon">
                                                <RefreshCwIcon className={`${isRefreshing ? 'animate-spin' : ''} w-4 h-4 text-gray-400`} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-row items-center gap-4">
                                        <Button asChild variant="secondary" size="lg" className='w-full'>
                                            <Link href="/deposit">Deposit</Link>
                                        </Button>
                                        <Button asChild variant="outline" size="lg" className='w-full'>
                                            <Link href="/withdraw">Withdraw</Link>
                                        </Button>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">My Account</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/wagers">Wagers</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Transactions</DropdownMenuItem>
                                    <DropdownMenuItem>History</DropdownMenuItem>
                                </DropdownMenuGroup>
                                <LogoutMenu />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            <nav className='py-3 bg-white'>
                <div className="container">
                    <div className='flex items-center justify-between'>
                        <ul className='flex flex-row items-center text-xs sm:text-sm gap-8 sm:gap-10'>
                            <Link href="/"><li>Home</li></Link>
                            <Link href="/matches"><li>Matches</li></Link>
                            <Link href="/challenges"><li>Challenges</li></Link>
                            <Link href="/app"><li>App</li></Link>
                        </ul>
                    </div>
                </div>
            </nav>
        </header>
    )
}

export default LoggedInHeader
