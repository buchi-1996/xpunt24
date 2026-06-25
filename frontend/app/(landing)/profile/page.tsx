'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowDownToLineIcon,
  ArrowRightIcon,
  ArrowUpFromLineIcon,
  BellIcon,
  ChevronRightIcon,
  FlameIcon,
  HistoryIcon,
  LogOutIcon,
  MailIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TargetIcon,
  TicketIcon,
  TrendingUpIcon,
  TrophyIcon,
  WalletIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { api, UserStats } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { useWallet } from '@/context/wallet/WalletContect'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const { balance, lockedBalance, currency } = useWallet()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setStats(null)
      setStatsLoading(false)
      return
    }
    let cancelled = false
    api.users
      .stats(user.id)
      .then((res) => {
        if (!cancelled) setStats(res.data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const initials = useMemo(() => {
    if (!user?.name) return '?'
    return user.name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?'
  }, [user?.name])

  const available = parseFloat(balance || '0') || 0
  const locked = parseFloat(lockedBalance || '0') || 0
  const netPnl = stats ? parseFloat(stats.netPnl || '0') : 0
  const totalStaked = stats ? parseFloat(stats.totalStaked || '0') : 0

  if (loading) {
    return (
      <section className="py-10">
        <div className="container max-w-2xl mx-auto">
          <ProfileSkeleton />
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="py-10">
        <div className="container max-w-md mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">Please sign in to view your profile.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/profile">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-6 md:py-10 pb-20 md:pb-10">
      <div className="container max-w-2xl mx-auto grid gap-4">
        {/* Identity card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="px-5 pb-5 -mt-10">
            <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
              <AvatarImage src={user.image ?? ''} />
              <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold text-lg truncate">{user.name}</h2>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  <MailIcon className="h-3 w-3" />
                  {user.email}
                </p>
                {user.createdAt && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Member since {format(new Date(user.createdAt), 'MMM yyyy')}
                  </p>
                )}
              </div>
              {user.role && user.role !== 'BETTOR' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase px-2 py-0.5">
                  <ShieldCheckIcon className="h-3 w-3" />
                  {user.role.toLowerCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Wallet card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
                <WalletIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Available</p>
                <p className="text-2xl font-bold tabular-nums">
                  {available.toFixed(2)} <span className="text-sm text-gray-400 font-normal">{currency}</span>
                </p>
                {locked > 0 && (
                  <p className="text-[11px] text-gray-400">
                    {locked.toFixed(2)} {currency} locked in active wagers
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" className="w-full">
              <Link href="/deposit">
                <ArrowDownToLineIcon className="h-4 w-4 mr-1.5" />
                Deposit
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/withdraw">
                <ArrowUpFromLineIcon className="h-4 w-4 mr-1.5" />
                Withdraw
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-gray-500" />
            Performance
          </h3>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard Icon={TicketIcon} label="Total Wagers" value={stats?.totalWagers ?? 0} />
              <StatCard
                Icon={TargetIcon}
                label="Win Rate"
                value={stats && stats.totalWagers > 0 ? `${stats.winRate.toFixed(0)}%` : '—'}
                sub={stats ? `${stats.wonWagers}W · ${stats.lostWagers}L` : undefined}
              />
              <StatCard
                Icon={FlameIcon}
                label="Streak"
                value={
                  stats?.currentStreak !== undefined && stats.currentStreak !== 0
                    ? `${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}`
                    : '—'
                }
                sub={
                  stats?.currentStreak !== undefined && stats.currentStreak !== 0
                    ? stats.currentStreak > 0 ? 'wins' : 'losses'
                    : undefined
                }
                tone={(stats?.currentStreak ?? 0) > 0 ? 'green' : (stats?.currentStreak ?? 0) < 0 ? 'red' : 'neutral'}
              />
              <StatCard
                Icon={TrophyIcon}
                label="P&L"
                value={`${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}`}
                sub={`${currency} · staked ${totalStaked.toFixed(0)}`}
                tone={netPnl > 0 ? 'green' : netPnl < 0 ? 'red' : 'neutral'}
              />
            </div>
          )}
          {stats && stats.totalWagers > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide font-bold">Longest win streak</p>
                <p className="font-bold mt-0.5">{stats.longestWinStreak}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide font-bold">Longest loss streak</p>
                <p className="font-bold mt-0.5">{stats.longestLossStreak}</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <ActionRow
            href="/wagers"
            Icon={TicketIcon}
            label="My Wagers"
            sub="Open, active and settled bets"
          />
          <ActionRow
            href="/wagers"
            Icon={HistoryIcon}
            label="Transactions"
            sub="Wallet ledger and history"
          />
          <ActionRow
            href="#"
            Icon={BellIcon}
            label="Notifications"
            sub="In-app and email preferences"
            disabled
          />
          <ActionRow
            href="#"
            Icon={SettingsIcon}
            label="Account Settings"
            sub="Coming soon"
            disabled
            last
          />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={async () => {
            await logout()
            window.location.href = '/'
          }}
        >
          <LogOutIcon className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </section>
  )
}

function StatCard({
  Icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  Icon: typeof TrophyIcon
  label: string
  value: number | string
  sub?: string
  tone?: 'green' | 'red' | 'neutral'
}) {
  const tones: Record<'green' | 'red' | 'neutral', string> = {
    green: 'text-green-600',
    red: 'text-red-600',
    neutral: 'text-gray-900',
  }
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-gray-400" />
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</p>
      </div>
      <p className={cn('text-lg font-bold tabular-nums', tones[tone])}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ActionRow({
  href,
  Icon,
  label,
  sub,
  disabled,
  last,
}: {
  href: string
  Icon: typeof TrophyIcon
  label: string
  sub?: string
  disabled?: boolean
  last?: boolean
}) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors',
        !last && 'border-b border-gray-100',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
      )}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
      </div>
      {disabled ? (
        <ChevronRightIcon className="h-4 w-4 text-gray-300" />
      ) : (
        <ArrowRightIcon className="h-4 w-4 text-gray-400" />
      )}
    </div>
  )
  if (disabled) return content
  return <Link href={href}>{content}</Link>
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-blue-100 to-indigo-100 animate-pulse" />
        <div className="p-5 -mt-10">
          <div className="h-20 w-20 rounded-full bg-gray-100 animate-pulse border-4 border-white" />
          <div className="mt-3 space-y-2">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 h-32 animate-pulse" />
      <div className="bg-white rounded-2xl shadow-sm p-5 h-32 animate-pulse" />
    </div>
  )
}
