'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Inbox, RefreshCwIcon, ShieldQuestionIcon, TicketIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { useAuth } from '@/context/auth/AuthContext'
import { ChallengeStatusValue, WagerProps } from '@/types'
import BetList from './BetList'

interface Props {
  wagers: WagerProps[]
  isLoading: boolean
}

const BetListTabs = ({ wagers, isLoading }: Props) => {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const buckets = useMemo(() => {
    const matched = wagers.filter((w) => isMatched(w.status))
    const settled = wagers.filter((w) => w.status === 'SETTLED')
    return {
      all: wagers,
      open: wagers.filter((w) => w.status === 'OPEN'),
      active: matched,
      settled,
      cancelled: wagers.filter((w) => w.status === 'CANCELLED' || w.status === 'EXPIRED'),
      won: settled.filter((w) => w.winnerUserId && w.winnerUserId === userId),
      lost: settled.filter((w) => w.winnerUserId && w.winnerUserId !== userId),
    }
  }, [wagers, userId])

  // Summary stats
  const stake = (w: WagerProps) => parseFloat(w.amount ?? w.stake ?? '0') || 0
  const potential = (w: WagerProps) => parseFloat(w.potentialWin ?? '0') || 0
  const totalWagered = buckets.all.reduce((s, w) => s + stake(w), 0)
  const totalWon = buckets.won.reduce((s, w) => s + potential(w), 0)
  const totalLost = buckets.lost.reduce((s, w) => s + stake(w), 0)
  const winRate = buckets.settled.length > 0 ? (buckets.won.length / buckets.settled.length) * 100 : 0
  const pnl = totalWon - totalLost

  return (
    <div>
      {/* Summary strip */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Open" value={String(buckets.open.length)} tone="blue" />
        <Stat label="Active" value={String(buckets.active.length)} tone="indigo" />
        <Stat
          label="Win rate"
          value={buckets.settled.length > 0 ? `${winRate.toFixed(0)}%` : '—'}
          sub={buckets.settled.length > 0 ? `${buckets.won.length}/${buckets.settled.length}` : 'no settled bets'}
          tone="amber"
        />
        <Stat
          label="P&L"
          value={`${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`}
          sub={`USDT · staked ${totalWagered.toFixed(0)}`}
          tone={pnl >= 0 ? 'green' : 'red'}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <ScrollArea className="whitespace-nowrap">
          <TabsList className="bg-transparent gap-1 mb-1 h-auto">
            <Tab value="all"       label="All"       count={buckets.all.length} />
            <Tab value="open"      label="Open"      count={buckets.open.length} />
            <Tab value="active"    label="Active"    count={buckets.active.length} />
            <Tab value="settled"   label="Settled"   count={buckets.settled.length} />
            <Tab value="cancelled" label="Cancelled" count={buckets.cancelled.length} />
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="all">
          {renderList(buckets.all, userId, 'No wagers yet', <BrowseCTA />, isLoading)}
        </TabsContent>
        <TabsContent value="open">
          {renderList(buckets.open, userId, 'No open challenges', <BrowseCTA />, isLoading)}
        </TabsContent>
        <TabsContent value="active">
          {renderList(buckets.active, userId, 'Nothing in play', null, isLoading)}
        </TabsContent>
        <TabsContent value="settled">
          {renderList(buckets.settled, userId, 'No settled bets yet', null, isLoading)}
        </TabsContent>
        <TabsContent value="cancelled">
          {renderList(buckets.cancelled, userId, 'No cancelled or expired bets', null, isLoading)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function isMatched(status: ChallengeStatusValue): boolean {
  return status === 'MATCHED' || status === 'LOCKED'
}

function renderList(
  list: WagerProps[],
  userId: string,
  emptyTitle: string,
  emptyAction: React.ReactNode,
  isLoading: boolean,
) {
  if (isLoading) {
    return (
      <div className="grid gap-3 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <BetListSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 mt-4 text-center">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-semibold">{emptyTitle}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div className="grid gap-3 mt-4">
      {list.map((wager) => (
        <BetList key={wager._id} wager={wager} userId={userId} />
      ))}
    </div>
  )
}

function Tab({ value, label, count }: { value: string; label: string; count: number }) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-full px-4 py-1.5 text-xs font-semibold bg-transparent text-gray-600 transition-colors"
    >
      {label}
      <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
    </TabsTrigger>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone: 'blue' | 'indigo' | 'amber' | 'green' | 'red'
}) {
  const tones: Record<typeof tone, string> = {
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
    amber: 'text-amber-700',
    green: 'text-green-600',
    red: 'text-red-600',
  }
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BrowseCTA() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      <Button asChild size="sm" variant="default">
        <Link href="/matches">
          <TicketIcon className="w-4 h-4 mr-1.5" /> Browse matches
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/challenges">
          <ShieldQuestionIcon className="w-4 h-4 mr-1.5" /> Open challenges
        </Link>
      </Button>
    </div>
  )
}

function BetListSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-9 bg-gray-50 border-b border-gray-100" />
      <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 bg-gray-100 rounded-full" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-7 w-12 bg-gray-100 rounded" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-9 bg-gray-100 rounded-full" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="px-4 pb-3 grid gap-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 bg-gray-100 rounded-full" />
          <div className="h-4 flex-1 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 bg-gray-100 rounded-full" />
          <div className="h-4 flex-1 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="h-10 bg-gray-50 border-t border-gray-100 flex items-center px-4">
        <div className="h-3 w-40 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

export default BetListTabs
export { RefreshCwIcon }
