// 'use client'

// import { WagerProps } from '@/types'
// import React, { useTransition } from 'react'
// import { format } from 'date-fns'
// import { Trash2, Loader2 } from 'lucide-react'
// import { Button } from '../ui/button'
// import { toast } from 'sonner'
// import { useWallet } from '@/context/wallet/WalletContect'
// import { cancelBet } from '@/actions/football'

// interface BetListProps {
//     status: 'open' | 'won' | 'lost' | 'running'
//     wager: WagerProps
//     userId: string
// }

// const getStatusColor = (status: string) => {
//     const colors = {
//         lost: 'bg-red-600',
//         won: 'bg-green-500',
//         open: 'bg-blue-600',
//         running: 'bg-orange-500'
//     }
//     return colors[status as keyof typeof colors] || ''
// }

// const BetList = ({ status, wager, userId }: BetListProps) => {
//     const [isPending, startTransition] = useTransition()
//     const isChallenger = wager.challengerId === userId
//     const { refreshWalletBalance } = useWallet()

//     const { home, away } = wager.matchData.teams
//     const userPick = isChallenger ? wager.challengerPick : wager.opposerPick
//     const userRole = isChallenger ? 'Challenged' : 'Opposed'

//     // Format the createdAt date
//     const formattedDate = format(new Date(wager.createdAt), 'dd MMM yyyy HH:mm')

//     const handleCancelBet = () => {
//         if (!confirm('Are you sure you want to cancel this bet? Your stake will be refunded.')) {
//             return
//         }

//         // Debug: Check if wager.id exists
//         console.log('Wager object:', wager)
//         console.log('Wager ID:', wager.id)

//         if (!wager.id) {
//             toast.error('Error: Bet ID not found')
//             return
//         }

//         startTransition(async () => {
//             try {
//                 const result = await cancelBet(wager.id)

//                 if (result.success) {
//                     // Show success message with refund amount
//                     toast.success(`Bet canceled successfully! ${result.data?.refundAmount} has been refunded to your account.`)
                    
//                     // Refresh wallet balance
//                     refreshWalletBalance()
                    
//                     // The page will automatically update due to revalidatePath in the server action
//                 } else {
//                     toast.error(result.error || 'Failed to cancel bet. Please try again.')
//                 }
//             } catch (error) {
//                 console.error('Error canceling bet:', error)
//                 toast.error(error instanceof Error ? error.message : 'Failed to cancel bet. Please try again.')
//             }
//         })
//     }

//     // Only show cancel button for open bets and if user is the challenger (bet creator)
//     const canCancel = status === 'open' && isChallenger && wager.status === 'PENDING'

//     return (
//         <div className='betlist'>
//             <small className='text-xs text-gray-500 ml-3'>{formattedDate}</small>
//             <div className="bg-white rounded-xl p-3">
//                 <div className='flex bg-gray-50 overflow-hidden rounded-xl justify-between items-center'>
//                     <div className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-8 gap-4 place-items-start">
//                         <div className="sm:col-span-2">
//                             <h4 className='font-bold text-sm'>{home.name}</h4>
//                             <h4 className='font-bold text-sm'>{away.name}</h4>
//                         </div>

//                         <span className="text-black font-bold py-1 px-2 capitalize ring-4 ring-yellow-500 rounded-full bg-yellow-300 text-xs">
//                             {userPick}
//                         </span>

//                         <div className="sm:col-span-2">
//                             <h4 className="font-bold text-xs sm:text-sm text-gray-600">
//                                 {userRole}
//                             </h4>
//                             {canCancel && (
//                                 <Button
//                                     variant="destructive"
//                                     size="sm"
//                                     onClick={handleCancelBet}
//                                     disabled={isPending}
//                                     className="flex mt-2 items-center gap-1 h-7 px-2 text-xs"
//                                     title="Cancel bet and get refund"
//                                 >
//                                     {isPending ? (
//                                         <Loader2 className="w-3 h-3 animate-spin" />
//                                     ) : (
//                                         <Trash2 className="w-3 h-3" />
//                                     )}
//                                     {isPending ? 'Canceling...' : 'Cancel'}
//                                 </Button>
//                             )}
//                         </div>

//                         <div className='sm:col-span-2 sm:place-self-end flex flex-col items-end'>
//                             <div className='mb-2'>
//                                 <p className='text-xs sm:text-sm text-gray-500 font-bold'>
//                                     Stake <span className="text-black ml-2">{wager.amount}</span>
//                                 </p>
//                                 <p className='text-xs sm:text-sm text-gray-500 font-bold'>
//                                     Pot. win <span className="text-black ml-2">{wager.amount * 2}</span>
//                                 </p>
//                             </div>
//                         </div>
//                     </div>

//                     <div className={`${getStatusColor(status)} self-stretch w-10 flex items-center justify-center font-bold p-2 text-white`}>
//                         <p className="-rotate-90 text-sm capitalize">{status}</p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }

// export default BetList



'use client'

import { WagerProps } from '@/types'
import React, { useTransition, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Trash2, Loader2, Clock, Wifi } from 'lucide-react'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { useWallet } from '@/context/wallet/WalletContect'
import { api } from '@/lib/apiClient'

interface BetListProps {
    status: 'open' | 'won' | 'lost' | 'running'
    wager: WagerProps
    userId: string
}

interface LiveMatchInfo {
    playedTime: string | null
    status: string
    isLive: boolean
    homeScore?: number
    awayScore?: number
}

const getStatusColor = (status: string) => {
    const colors = {
        lost: 'bg-red-600',
        won: 'bg-green-500',
        open: 'bg-blue-600',
        running: 'bg-orange-500'
    }
    return colors[status as keyof typeof colors] || ''
}

const BetList = ({ status, wager, userId }: BetListProps) => {
    const [isPending, startTransition] = useTransition()
    const [liveInfo, setLiveInfo] = useState<LiveMatchInfo | null>(null)
    const [isLoadingLive, setIsLoadingLive] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    
    const isChallenger = wager.challengerId === userId
    const { refresh: refreshWalletBalance } = useWallet()

    const { home, away } = wager.matchData.teams
    const userPick = isChallenger ? wager.challengerPick : wager.opposerPick
    const userRole = isChallenger ? 'Challenged' : 'Opposed'
    const fixtureId = wager.matchData?.fixture?.id

    // Format the createdAt date
    const formattedDate = format(new Date(wager.createdAt), 'dd MMM yyyy HH:mm')
    
    // Get match start time from wager
    const matchStartTime = wager.matchData?.fixture?.date
    const formattedMatchTime = matchStartTime ? format(new Date(matchStartTime), 'dd MMM yyyy HH:mm') : null

   
    // Fetch live match info when status is running
    useEffect(() => {
        if (status === 'running' && fixtureId) {
            const fetchLiveInfo = async () => {
                setIsLoadingLive(true)
                setFetchError(null)
                
                try {
                    console.log(`Fetching live info for fixture: ${fixtureId}`) // Debug log
                    
                    const res = await api.fixtures.live(String(fixtureId))
                    const data = res.data as LiveMatchInfo
                    setLiveInfo(data)
                } catch (error) {
                    console.error('Error fetching live match info:', error)
                    setFetchError(error instanceof Error ? error.message : 'Failed to fetch live data')
                } finally {
                    setIsLoadingLive(false)
                }
            }

            // Only fetch if API endpoint exists, otherwise just show match time
            fetchLiveInfo()
            
            // Update every 30 seconds for live matches
            const interval = setInterval(fetchLiveInfo, 30000)
            return () => clearInterval(interval)
        }
    }, [status, fixtureId])

    const handleCancelBet = () => {
        if (!confirm('Are you sure you want to cancel this bet? Your stake will be refunded.')) {
            return
        }

        // Debug: Check if wager.id exists
        console.log('Wager object:', wager)
        console.log('Wager ID:', wager.id)

        if (!wager.id) {
            toast.error('Error: Bet ID not found')
            return
        }

        startTransition(async () => {
            try {
                await api.challenges.cancel(wager.id)
                toast.success('Bet canceled successfully! Your stake has been refunded.')
                refreshWalletBalance()
            } catch (error) {
                console.error('Error canceling bet:', error)
                toast.error(error instanceof Error ? error.message : 'Failed to cancel bet. Please try again.')
            }
        })
    }

    // Only show cancel button for open bets and if user is the challenger (bet creator)
    const canCancel = status === 'open' && isChallenger && wager.status === 'PENDING'

    // Helper function to render live scores or match info
    const renderMatchInfo = () => {
        if (status !== 'running') return null
        
        return (
            <div className="space-y-2">
                {/* Match time or live minutes */}
                <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                    <Clock className="w-3 h-3" />
                    {liveInfo?.playedTime ? (
                        <span className="text-green-600 font-bold">
                            {liveInfo.playedTime} {liveInfo.isLive && <span className="text-red-500">● LIVE</span>}
                        </span>
                    ) : formattedMatchTime ? (
                        <span>Match: {formattedMatchTime}</span>
                    ) : (
                        <span>Match time unavailable</span>
                    )}
                </div>
                
                {/* Live scores section */}
                {isLoadingLive ? (
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Loading live data...</span>
                    </div>
                ) : fetchError ? (
                    <div className="text-xs text-amber-600 font-medium">
                        <Wifi className="w-3 h-3 inline mr-1" />
                        Live data unavailable
                    </div>
                ) : liveInfo && (liveInfo.homeScore !== undefined && liveInfo.awayScore !== undefined) ? (
                    <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
                        <span>{liveInfo.homeScore}</span>
                        <span className="text-gray-400">-</span>
                        <span>{liveInfo.awayScore}</span>
                    </div>
                ) : (
                    <div className="text-xs text-gray-500">
                        Waiting for live data...
                    </div>
                )}
            </div>
        )
    }

    // // Helper function to render match status
    // const renderMatchStatus = () => {
    //     if (status !== 'running') return null
        
    //     if (isLoadingLive) {
    //         return (
    //             <div className="flex items-center gap-1 text-xs text-gray-500">
    //                 <Loader2 className="w-3 h-3 animate-spin" />
    //                 <span>Loading...</span>
    //             </div>
    //         )
    //     }
        
    //     if (fetchError) {
    //         return (
    //             <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full">
    //                 <Wifi className="w-3 h-3" />
    //                 <span className="text-xs font-medium">Connection Error</span>
    //             </div>
    //         )
    //     }
        
    //     if (liveInfo?.isLive) {
    //         return (
    //             <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full">
    //                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
    //                 <span className="text-xs font-medium">
    //                     LIVE {liveInfo.playedTime || ''}
    //                 </span>
    //             </div>
    //         )
    //     }
        
    //     if (liveInfo) {
    //         return (
    //             <div className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
    //                 <Clock className="w-3 h-3" />
    //                 <span className="text-xs font-medium">
    //                     {liveInfo.status}
    //                 </span>
    //             </div>
    //         )
    //     }
        
    //     return null
    // }

    return (
        <div className='betlist'>
            <small className='text-xs text-gray-500 ml-3'>{formattedDate}</small>
            <div className="bg-white rounded-xl p-3">
                <div className='flex bg-gray-50 overflow-hidden rounded-xl justify-between items-center'>
                    <div className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-8 gap-4 place-items-start">
                        <div className="sm:col-span-2">
                            {/* Team Names and Scores */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className='font-bold text-sm'>{home.name}</h4>
                                </div>
                                <div className="flex items-center justify-between">
                                    <h4 className='font-bold text-sm'>{away.name}</h4>
                                </div>
                            </div>
                            
                            {/* Live Match Info - Shows match time and scores */}
                            {status === 'running' && (
                                <div className="mt-3">
                                    {renderMatchInfo()}
                                </div>
                            )}
                        </div>

                        <span className="text-black font-bold py-1 px-2 capitalize ring-4 ring-yellow-500 rounded-full bg-yellow-300 text-xs">
                            {userPick}
                        </span>

                        <div className="sm:col-span-2">
                            <h4 className="font-bold text-xs sm:text-sm text-gray-600">
                                {userRole}
                            </h4>
                            {canCancel && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleCancelBet}
                                    disabled={isPending}
                                    className="flex mt-2 items-center gap-1 h-7 px-2 text-xs"
                                    title="Cancel bet and get refund"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3 h-3" />
                                    )}
                                    {isPending ? 'Canceling...' : 'Cancel'}
                                </Button>
                            )}
                        </div>

                        <div className='sm:col-span-2 sm:place-self-end flex flex-col items-end'>
                            <div className='mb-2'>
                                <p className='text-xs sm:text-sm text-gray-500 font-bold'>
                                    Stake <span className="text-black ml-2">{wager.amount}</span>
                                </p>
                                <p className='text-xs sm:text-sm text-gray-500 font-bold'>
                                    Pot. win <span className="text-black ml-2">{wager.amount * 2}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={`${getStatusColor(status)} self-stretch w-10 flex items-center justify-center font-bold p-2 text-white`}>
                        <p className="-rotate-90 text-sm capitalize">{status}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BetList