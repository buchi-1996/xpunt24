'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CoinsIcon,
  HandCoinsIcon,
  InboxIcon,
  RefreshCcwIcon,
  ScaleIcon,
  ShieldOffIcon,
  TrophyIcon,
  UndoIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, LedgerEntry, LedgerEntryType } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'deposits' | 'withdrawals' | 'wagers'

const TYPE_META: Record<
  LedgerEntryType,
  { label: string; Icon: typeof CoinsIcon; tone: 'green' | 'red' | 'blue' | 'amber' | 'gray'; sign: 1 | -1 | 0 }
> = {
  DEPOSIT:             { label: 'Deposit',                  Icon: ArrowDownLeftIcon, tone: 'green', sign: 1 },
  WITHDRAWAL:          { label: 'Withdrawal',               Icon: ArrowUpRightIcon,  tone: 'red',   sign: -1 },
  WITHDRAWAL_REVERSAL: { label: 'Withdrawal refund',        Icon: UndoIcon,          tone: 'green', sign: 1 },
  WAGER_STAKE:         { label: 'Stake locked',             Icon: HandCoinsIcon,     tone: 'amber', sign: -1 },
  WAGER_WIN:           { label: 'Wager won',                Icon: TrophyIcon,        tone: 'green', sign: 1 },
  WAGER_REFUND:        { label: 'Stake refunded',           Icon: RefreshCcwIcon,    tone: 'blue',  sign: 1 },
  PLATFORM_FEE:        { label: 'Platform fee',             Icon: ScaleIcon,         tone: 'gray',  sign: -1 },
  ADMIN_CREDIT:        { label: 'Admin credit',             Icon: CheckCircle2Icon,  tone: 'green', sign: 1 },
  ADMIN_DEBIT:         { label: 'Admin debit',              Icon: ShieldOffIcon,     tone: 'red',   sign: -1 },
}

const TONE_CLASS: Record<'green' | 'red' | 'blue' | 'amber' | 'gray', string> = {
  green: 'bg-green-50 text-green-700',
  red:   'bg-red-50 text-red-700',
  blue:  'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  gray:  'bg-gray-100 text-gray-600',
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  const load = useCallback(
    async (p: number) => {
      if (!user) return
      setLoading(true)
      try {
        const res = await api.wallet.transactions(p)
        setEntries(res.data)
        setTotalPages(res.totalPages ?? 1)
        setPage(res.page ?? p)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  useEffect(() => {
    load(1)
  }, [load])

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((e) => {
      if (filter === 'deposits') return e.type === 'DEPOSIT' || e.type === 'WITHDRAWAL_REVERSAL' || e.type === 'ADMIN_CREDIT'
      if (filter === 'withdrawals') return e.type === 'WITHDRAWAL' || e.type === 'ADMIN_DEBIT'
      if (filter === 'wagers') return e.type.startsWith('WAGER_') || e.type === 'PLATFORM_FEE'
      return true
    })
  }, [entries, filter])

  if (authLoading) {
    return (
      <section className="py-6 md:py-10 pb-20 md:pb-10">
        <div className="container max-w-2xl mx-auto">
          <SkeletonList />
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="py-10">
        <div className="container max-w-md mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">Sign in to view your transactions.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/transactions">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-6 md:py-10 pb-20 md:pb-10">
      <div className="container max-w-2xl mx-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold mb-1">Transactions</h1>
          <p className="text-sm text-gray-500">Every credit and debit on your wallet, newest first.</p>
        </header>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-1 px-1">
          {(['all', 'deposits', 'withdrawals', 'wagers'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {filtered.map((e) => (
                <EntryRow key={e._id} entry={e} />
              ))}
            </ul>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={load} />
            )}
          </>
        )}
      </div>
    </section>
  )
}

function EntryRow({ entry }: { entry: LedgerEntry }) {
  const meta = TYPE_META[entry.type] ?? { label: entry.type, Icon: CoinsIcon, tone: 'gray' as const, sign: 0 as const }
  const Icon = meta.Icon
  const amount = parseFloat(entry.amount || '0') || 0
  const balanceAfter = parseFloat(entry.balanceAfter || '0') || 0
  const signedAmount = meta.sign === -1 ? -amount : amount
  const balanceColor =
    meta.sign === 1 ? 'text-green-600' : meta.sign === -1 ? 'text-red-600' : 'text-gray-600'

  return (
    <li className="px-4 py-3 flex items-start gap-3">
      <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0', TONE_CLASS[meta.tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm">{meta.label}</p>
            {entry.description && (
              <p className="text-[11px] text-gray-500 truncate">{entry.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn('font-bold text-sm tabular-nums', balanceColor)}>
              {signedAmount > 0 ? '+' : signedAmount < 0 ? '−' : ''}
              {Math.abs(signedAmount).toFixed(2)} <span className="text-[11px] font-normal text-gray-500">{entry.currency}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Balance {balanceAfter.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {format(new Date(entry.createdAt), 'dd MMM yyyy · HH:mm')}
        </p>
      </div>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
      <InboxIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 font-semibold">No transactions yet</p>
      <p className="text-xs text-gray-400 mt-1">Deposits, withdrawals and wager activity will appear here.</p>
    </div>
  )
}

function SkeletonList() {
  return (
    <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
          <div className="h-9 w-9 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="flex-1 grid gap-2">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}
