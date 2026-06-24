'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  WalletIcon,
  XCircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, WithdrawalItem, WithdrawalStatus } from '@/lib/apiClient'
import { MIN_WITHDRAWAL, WITHDRAWAL_REVIEW_THRESHOLD } from '@/lib/constants'
import { useAuth } from '@/context/auth/AuthContext'
import { useWallet } from '@/context/wallet/WalletContect'
import { cn } from '@/lib/utils'

const TRC20_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/

const STATUS_META: Record<
  WithdrawalStatus,
  { label: string; tone: string; Icon: typeof CheckCircle2Icon; help?: string }
> = {
  PENDING: {
    label: 'Pending',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: ClockIcon,
    help: 'Queued for on-chain processing.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: ShieldAlertIcon,
    help: 'Large withdrawal — held for manual review.',
  },
  APPROVED: {
    label: 'Approved',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: ClockIcon,
  },
  PROCESSING: {
    label: 'Processing',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: RefreshCwIcon,
  },
  COMPLETED: {
    label: 'Completed',
    tone: 'bg-green-50 text-green-700 border-green-200',
    Icon: CheckCircle2Icon,
  },
  REJECTED: {
    label: 'Rejected',
    tone: 'bg-red-50 text-red-700 border-red-200',
    Icon: XCircleIcon,
  },
  FAILED: {
    label: 'Failed',
    tone: 'bg-red-50 text-red-700 border-red-200',
    Icon: AlertCircleIcon,
  },
}

const truncateAddress = (addr: string | undefined | null): string => {
  if (!addr) return '—'
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr
}

const safeRelativeTime = (iso: string | undefined | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return formatDistanceToNow(d, { addSuffix: true })
}

export default function WithdrawPage() {
  const { user } = useAuth()
  const { balance, lockedBalance, currency, refresh: refreshWallet, isRefreshing } = useWallet()

  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<WithdrawalItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const available = parseFloat(balance || '0')
  const locked = parseFloat(lockedBalance || '0')

  const loadHistory = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    try {
      const res = await api.wallet.listWithdrawals()
      setHistory(res.data)
    } catch {
      // silently — empty history is fine
    } finally {
      setHistoryLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleMax = () => setAmount(String(available))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (parsed < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL} USDT`)
      return
    }
    if (parsed > available) {
      toast.error(`You only have ${available} USDT available`)
      return
    }
    if (!TRC20_ADDRESS_RE.test(address.trim())) {
      toast.error('Destination must be a valid TRC20 address (starts with T, 34 chars)')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.wallet.withdraw({
        amount: parsed,
        currency: 'USDT',
        destinationAddress: address.trim(),
      })

      const w = res.data
      if (w.status === 'UNDER_REVIEW') {
        toast.success('Withdrawal submitted — held for review due to size.')
      } else {
        toast.success('Withdrawal submitted — funds are being sent on-chain.')
      }

      setAmount('')
      setAddress('')
      refreshWallet()
      loadHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit withdrawal'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <section className="py-10">
        <div className="container max-w-lg mx-auto text-center">
          <p className="text-gray-500">Please sign in to withdraw funds.</p>
          <Button asChild className="mt-4">
            <Link href="/auth/login?redirect=/withdraw">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  const parsedAmount = parseFloat(amount || '0')
  const willReview = parsedAmount >= WITHDRAWAL_REVIEW_THRESHOLD

  return (
    <section className="py-10">
      <div className="container max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-1">Withdraw USDT</h2>
        <p className="text-sm text-gray-500 mb-8">
          Send USDT from your wallet to any TRON (TRC20) address.
        </p>

        {/* Balance card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <WalletIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-gray-400">Available</p>
              <p className="text-xl font-bold">
                {available.toFixed(2)} <span className="text-sm text-gray-500 font-normal">{currency}</span>
              </p>
              {locked > 0 && (
                <p className="text-[11px] text-gray-400">
                  {locked.toFixed(2)} {currency} locked in active wagers
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshWallet}
            title="Refresh balance"
            disabled={isRefreshing}
          >
            <RefreshCwIcon className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Amount (USDT)</label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  disabled={available <= 0}
                >
                  Use max ({available.toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={MIN_WITHDRAWAL}
                  step="0.01"
                  placeholder={`Min. ${MIN_WITHDRAWAL} USDT`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="py-6 rounded-lg shadow-none pr-16"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                  USDT
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum withdrawal: {MIN_WITHDRAWAL} USDT</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Destination address (TRC20)
              </label>
              <Input
                type="text"
                placeholder="T…"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="py-6 rounded-lg shadow-none font-mono text-xs"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Must be a TRON network (TRC20) address. Withdrawals to other networks will be lost.
              </p>
            </div>

            {willReview && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex gap-2">
                <ShieldAlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Withdrawals of <strong>{WITHDRAWAL_REVIEW_THRESHOLD} USDT</strong> or more are held for
                  manual review and may take up to 24 hours to process.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-6 rounded-lg"
              disabled={submitting || available <= 0}
            >
              {submitting ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                'Withdraw'
              )}
            </Button>
          </form>
        </div>

        {/* History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Recent withdrawals</h3>
            <button
              onClick={loadHistory}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <RefreshCwIcon className={cn('h-3 w-3', historyLoading && 'animate-spin')} />
            </button>
          </div>

          {historyLoading ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-gray-400">Loading…</div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <WalletIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-500">No withdrawals yet</p>
            </div>
          ) : (
            <ul className="bg-white rounded-2xl divide-y overflow-hidden">
              {history.map((w) => {
                const meta = STATUS_META[w.status] ?? {
                  label: w.status ?? 'Unknown',
                  tone: 'bg-gray-50 text-gray-600 border-gray-200',
                  Icon: AlertCircleIcon,
                }
                const Icon = meta.Icon
                return (
                  <li key={w._id} className="p-4 flex items-start gap-3">
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-full border flex-shrink-0',
                        meta.tone,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold text-sm">
                          {parseFloat(w.amount).toFixed(2)} <span className="text-xs font-normal text-gray-500">{w.currency}</span>
                        </p>
                        <span className={cn('text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border', meta.tone)}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        → {truncateAddress(w.destinationAddress)}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {safeRelativeTime(w.createdAt)}
                        {w.txHash && (
                          <>
                            {' · '}
                            <a
                              href={`https://tronscan.org/#/transaction/${w.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View on TronScan
                            </a>
                          </>
                        )}
                      </p>
                      {w.rejectionReason && (
                        <p className="text-[11px] text-red-500 mt-1">Reason: {w.rejectionReason}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
