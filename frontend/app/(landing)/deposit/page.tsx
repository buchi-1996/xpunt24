'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/apiClient'
import { useWallet } from '@/context/wallet/WalletContect'
import { useAuth } from '@/context/auth/AuthContext'
import { useLimits } from '@/context/limits/LimitsContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2Icon, ClipboardCopyIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface DepositIntent {
  depositId: string
  address: string
  network: string
  currency: string
  amount: string
  expiresAt: string
  providerReference: string
}

type DepositStatus = 'INITIATED' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CREDITED' | 'FAILED' | 'EXPIRED'

export default function DepositPage() {
  const { user } = useAuth()
  const { refresh: refreshWallet } = useWallet()
  const { minDeposit } = useLimits()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [intent, setIntent] = useState<DepositIntent | null>(null)
  const [status, setStatus] = useState<DepositStatus | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    if (!intent) return
    const expiry = new Date(intent.expiresAt).getTime()

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        if (status !== 'CREDITED') setStatus('EXPIRED')
      }
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [intent, status])

  // Poll deposit status until credited/failed/expired
  useEffect(() => {
    if (!intent || !status) return
    if (['CREDITED', 'FAILED', 'EXPIRED'].includes(status)) {
      if (pollRef.current) clearInterval(pollRef.current)
      if (status === 'CREDITED') {
        refreshWallet()
        toast.success('Deposit confirmed! Your balance has been updated.')
      }
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.wallet.getDeposit(intent.depositId)
        const newStatus = res.data.status as DepositStatus
        setStatus(newStatus)
      } catch {
        // ignore polling errors
      }
    }, 10_000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [intent, status, refreshWallet])

  async function handleCreateDeposit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed < minDeposit) {
      toast.error(`Minimum deposit is ${minDeposit} USDT`)
      return
    }

    setLoading(true)
    try {
      const res = await api.wallet.createDeposit({ amount: parsed, currency: 'USDT' })
      setIntent(res.data)
      setStatus('PENDING_CONFIRMATION')
      setTimeLeft(Math.floor((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create deposit'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!intent) return
    navigator.clipboard.writeText(intent.address)
    toast.success('Address copied!')
  }

  function handleReset() {
    setIntent(null)
    setStatus(null)
    setAmount('')
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const minutesLeft = Math.floor(timeLeft / 60)
  const secondsLeft = timeLeft % 60

  if (!user) {
    return (
      <section className="py-10">
        <div className="container max-w-lg mx-auto text-center">
          <p className="text-gray-500">Please sign in to deposit funds.</p>
          <Button asChild className="mt-4">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-10">
      <div className="container max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-1">Deposit USDT</h2>
        <p className="text-sm text-gray-500 mb-8">Fund your wallet using USDT on the TRON (TRC20) network.</p>

        {!intent ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleCreateDeposit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Amount (USDT)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min={minDeposit}
                    step="0.01"
                    placeholder={`Min. ${minDeposit} USDT`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="py-6 rounded-lg shadow-none pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">USDT</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Minimum deposit: {minDeposit} USDT</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
                <p className="font-semibold">Important</p>
                <p>Only send USDT on the <strong>TRON (TRC20)</strong> network. Sending on other networks will result in permanent loss of funds.</p>
              </div>

              <Button type="submit" className="w-full py-6 rounded-lg" disabled={loading}>
                {loading ? (
                  <><RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> Generating address...</>
                ) : (
                  'Get Deposit Address'
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status banner */}
            {status === 'CREDITED' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2Icon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 text-sm">Deposit Confirmed!</p>
                  <p className="text-xs text-green-600">{intent.amount} USDT has been credited to your wallet.</p>
                </div>
              </div>
            )}
            {(status === 'EXPIRED' || status === 'FAILED') && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">
                    {status === 'EXPIRED' ? 'Deposit Expired' : 'Deposit Failed'}
                  </p>
                  <p className="text-xs text-red-500">
                    {status === 'EXPIRED'
                      ? 'The deposit window has closed. Please create a new deposit.'
                      : 'Something went wrong. Please try again.'}
                  </p>
                </div>
              </div>
            )}
            {status === 'PENDING_CONFIRMATION' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <RefreshCwIcon className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-sm text-blue-700">Waiting for payment confirmation on the TRON network...</p>
              </div>
            )}

            {/* Deposit card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Send exactly</p>
                  <p className="text-2xl font-bold">{intent.amount} <span className="text-base text-gray-500">USDT</span></p>
                </div>
                {timeLeft > 0 && status !== 'CREDITED' && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Expires in</p>
                    <p className="font-mono font-bold text-amber-600">
                      {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                    </p>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${intent.address}`}
                  alt="Deposit QR code"
                  className="rounded-lg border border-gray-100"
                  width={200}
                  height={200}
                />
              </div>

              {/* Address */}
              <div>
                <p className="text-xs text-gray-400 mb-1">TRC20 Deposit Address</p>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <span className="font-mono text-xs break-all flex-1 select-all">{intent.address}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    title="Copy address"
                  >
                    <ClipboardCopyIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1">
                <p>Network: <strong className="text-gray-600">TRON (TRC20)</strong></p>
                <p>Minimum confirmations: <strong className="text-gray-600">1</strong></p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopy}
              >
                <ClipboardCopyIcon className="w-4 h-4 mr-2" />
                Copy Address
              </Button>
            </div>

            {(status === 'CREDITED' || status === 'EXPIRED' || status === 'FAILED') && (
              <Button variant="secondary" className="w-full" onClick={handleReset}>
                {status === 'CREDITED' ? 'Make Another Deposit' : 'Try Again'}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
