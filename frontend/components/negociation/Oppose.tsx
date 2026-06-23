import React, { useTransition } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { api } from '@/lib/apiClient'
import { toast } from 'sonner'
import LoaderSpinner from '../spinner'
import { useWallet } from '@/context/wallet/WalletContect'

interface OpposeProps {
    match: {
        fixture: { timestamp: number }
        teams: {
            home: { name: string; logo: string }
            away: { name: string; logo: string }
        }
    }
    id: string
    amount: number
    opposerPick?: string | null
}

const Oppose = ({ id, match, amount, opposerPick }: OpposeProps) => {
    const { teams } = match
    const { home, away } = teams
    const { refresh: refreshWallet } = useWallet()
    const [isPending, startTransition] = useTransition()

    const handleOppose = () => {
        startTransition(async () => {
            try {
                await api.challenges.accept(id)
                toast.success('Challenge accepted!', { id: 'oppose-success' })
                await refreshWallet()
            } catch (err: unknown) {
                const error = err as { message?: string }
                toast.error(error.message ?? 'Failed to accept challenge', { id: 'oppose-error' })
            }
        })
    }

    return (
        <div className="px-5 sm:px-0 pb-4">
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-[0.9rem] md:text-[1rem] truncate text-gray-700 font-bold">
                        {home.name}
                    </span>
                    <span className="text-[0.9rem] md:text-[1rem] truncate text-gray-700 font-bold">
                        {away.name}
                    </span>
                </div>
                <span className="text-black font-bold py-1 px-2 capitalize ring-4 ring-red-500 rounded-full bg-red-300 text-xs">
                    {opposerPick}
                </span>
            </div>

            <div className='flex flex-col gap-2'>
                <div className="relative w-full">
                    <Input disabled type='number' value={amount} name="amount" className='flex-1 w-full py-4 mt-5 bg-gray-50 rounded-xl h-14 border-none shadow-none ring-2 ring-blue-600 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' />
                </div>
                <small className='text-xs text-gray-600'>Locked Stake <span className='font-bold'>{amount}</span></small>
                <div className='flex items-center justify-between my-6 border-t border-b py-2'>
                    <h4 className='font-bold text-gray-600'>Potential win:</h4>
                    <h2 className='font-bold text-gray-800'>{amount * 2}</h2>
                </div>
                <Button
                    onClick={handleOppose}
                    type="button"
                    variant="secondary"
                    className="py-6 font-bold sm:text-[1rem]"
                >
                    {isPending ? <LoaderSpinner color="bg-white" /> : 'Oppose Challenge'}
                </Button>
            </div>
        </div>
    )
}

export default Oppose
