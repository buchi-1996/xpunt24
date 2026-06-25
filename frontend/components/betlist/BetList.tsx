'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { format, formatDistanceToNowStrict, isPast } from 'date-fns'
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2,
  RadioIcon,
  Trash2,
  TrophyIcon,
  XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { api } from '@/lib/apiClient'
import { useWallet } from '@/context/wallet/WalletContect'
import { PICK_OPTIONS } from '@/lib/picks'
import { cn } from '@/lib/utils'
import { ChallengeStatusValue, WagerProps } from '@/types'

type UIStatus = 'open' | 'matched' | 'live' | 'won' | 'lost' | 'cancelled' | 'expired'

interface BetListProps {
  wager: WagerProps
  userId: string
}

interface LiveInfo {
  playedTime: number
  status: string
  isLive: boolean
  homeScore: number
  awayScore: number
}

const STATUS_META: Record<
  UIStatus,
  { label: string; pill: string; barIcon: typeof CheckCircle2Icon }
> = {
  open:     { label: 'Open',      pill: 'bg-blue-50 text-blue-700 border-blue-200',    barIcon: ClockIcon },
  matched:  { label: 'Matched',   pill: 'bg-indigo-50 text-indigo-700 border-indigo-200', barIcon: ClockIcon },
  live:     { label: 'Live',      pill: 'bg-red-50 text-red-700 border-red-200',       barIcon: RadioIcon },
  won:      { label: 'Won',       pill: 'bg-green-50 text-green-700 border-green-200', barIcon: TrophyIcon },
  lost:     { label: 'Lost',      pill: 'bg-red-50 text-red-700 border-red-200',       barIcon: XCircleIcon },
  cancelled:{ label: 'Cancelled', pill: 'bg-gray-50 text-gray-600 border-gray-200',    barIcon: XCircleIcon },
  expired:  { label: 'Expired',   pill: 'bg-amber-50 text-amber-700 border-amber-200', barIcon: ClockIcon },
}

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P'])
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])

function computeUIStatus(
  status: ChallengeStatusValue,
  isCreator: boolean,
  winnerUserId: string | null | undefined,
  userId: string,
  fixtureStatusShort?: string,
): UIStatus {
  if (status === 'SETTLED') {
    if (winnerUserId && winnerUserId === userId) return 'won'
    return 'lost'
  }
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'EXPIRED') return 'expired'
  if (status === 'MATCHED' || status === 'LOCKED') {
    if (fixtureStatusShort && LIVE_STATUSES.has(fixtureStatusShort)) return 'live'
    return 'matched'
  }
  // OPEN (or unknown statuses fall through)
  // isCreator is meaningful for OPEN — only creators can cancel
  void isCreator
  return 'open'
}

const BetList = ({ wager, userId }: BetListProps) => {
  const { refresh: refreshWallet } = useWallet()
  const [isPending, startTransition] = useTransition()
  const [liveInfo, setLiveInfo] = useState<LiveInfo | null>(null)

  const isCreator = wager.creatorId === userId
  const myPickRaw = isCreator ? wager.pick : wager.opponentPick
  const theirPickRaw = isCreator ? wager.opponentPick : wager.pick
  const myPickLabel = labelForPick(wager.market, wager.marketParam, myPickRaw)
  const theirPickLabel = labelForPick(wager.market, wager.marketParam, theirPickRaw)

  const opponent = isCreator ? wager.opposer : wager.challenger
  const opponentName = opponent?.name ?? opponent?.username ?? null

  const fixtureStatus = wager.matchData?.fixture?.status?.short
  const uiStatus = computeUIStatus(wager.status, isCreator, wager.winnerUserId, userId, fixtureStatus)
  const meta = STATUS_META[uiStatus]
  const StatusIcon = meta.barIcon

  const homeName = wager.matchData?.teams?.home?.name ?? 'Home'
  const awayName = wager.matchData?.teams?.away?.name ?? 'Away'
  const homeLogo = wager.matchData?.teams?.home?.logo
  const awayLogo = wager.matchData?.teams?.away?.logo
  const leagueName = wager.matchData?.league?.name
  const leagueLogo = wager.matchData?.league?.logo

  const fixtureTimestamp = wager.matchData?.fixture?.timestamp
  const kickoffDate = fixtureTimestamp ? new Date(fixtureTimestamp * 1000) : null
  const expiryDate = wager.expiresAt ? new Date(wager.expiresAt) : null

  const homeScore = liveInfo?.homeScore ?? wager.matchData?.goals?.home ?? null
  const awayScore = liveInfo?.awayScore ?? wager.matchData?.goals?.away ?? null

  const stakeNum = parseFloat(wager.amount ?? wager.stake ?? '0') || 0
  const potentialWinNum = parseFloat(wager.potentialWin ?? '0') || stakeNum * 2

  // Poll live data when the match should be in play. We can't rely solely on uiStatus === 'live'
  // because the backend fixture cache lags up to 5 min — kickoff might have happened but the
  // cached status still says NS. So also poll once the scheduled kickoff is in the past, as long
  // as the underlying challenge is matched and not yet settled.
  useEffect(() => {
    if (!wager.fixtureId) return
    const isMatched = wager.status === 'MATCHED' || wager.status === 'LOCKED'
    const kickoffPassed = kickoffDate ? kickoffDate.getTime() <= Date.now() : false
    const shouldPoll = uiStatus === 'live' || (isMatched && kickoffPassed)
    if (!shouldPoll) return

    let cancelled = false
    const fetchLive = async () => {
      try {
        const res = await api.fixtures.live(String(wager.fixtureId))
        if (cancelled) return
        const data = res.data as LiveInfo
        setLiveInfo(data)
        // Stop polling once the fixture has finished
        if (FINISHED_STATUSES.has(data.status)) cancelled = true
      } catch {
        // best-effort
      }
    }

    fetchLive()
    const interval = setInterval(fetchLive, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [uiStatus, wager.fixtureId, wager.status, kickoffDate])

  const canCancel = uiStatus === 'open' && isCreator

  const handleCancel = () => {
    if (!confirm('Cancel this challenge and refund your stake?')) return
    startTransition(async () => {
      try {
        await api.challenges.cancel(wager._id)
        toast.success('Challenge cancelled — stake refunded.')
        refreshWallet()
        // BetListWrapper will re-fetch on a custom event we dispatch:
        window.dispatchEvent(new Event('wagers:refresh'))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel')
      }
    })
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header — league + match time + status pill */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 min-w-0">
          {leagueLogo && (
            <Image src={leagueLogo} alt={leagueName ?? ''} width={16} height={16} className="h-4 w-4 object-contain" />
          )}
          <span className="text-xs text-gray-600 font-medium truncate">{leagueName ?? 'Match'}</span>
          {kickoffDate && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500 font-medium">{format(kickoffDate, 'dd MMM, HH:mm')}</span>
            </>
          )}
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded-full border px-2 py-0.5',
          meta.pill,
        )}>
          <StatusIcon className={cn('h-3 w-3', uiStatus === 'live' && 'animate-pulse')} />
          {meta.label}
        </span>
      </header>

      {/* Teams + score */}
      <div className="px-4 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center text-center min-w-0">
          {homeLogo && <Image src={homeLogo} alt={homeName} width={40} height={40} className="h-9 w-9 object-contain mb-1" />}
          <span className="text-xs font-semibold truncate w-full">{homeName}</span>
        </div>
        <div className="text-center">
          {homeScore !== null && awayScore !== null ? (
            <div className="text-2xl font-bold tabular-nums">
              {homeScore}<span className="text-gray-300 mx-1">–</span>{awayScore}
            </div>
          ) : (
            <span className="text-[11px] uppercase font-bold text-gray-400">vs</span>
          )}
          {uiStatus === 'live' && liveInfo?.playedTime ? (
            <p className="text-[10px] text-red-600 font-bold mt-0.5">{liveInfo.playedTime}'</p>
          ) : null}
        </div>
        <div className="flex flex-col items-center text-center min-w-0">
          {awayLogo && <Image src={awayLogo} alt={awayName} width={40} height={40} className="h-9 w-9 object-contain mb-1" />}
          <span className="text-xs font-semibold truncate w-full">{awayName}</span>
        </div>
      </div>

      {/* Picks */}
      <div className="px-4 pb-3 grid gap-2">
        <PickRow side="you" label={myPickLabel} sublabel={describeMarket(wager.market, wager.marketParam)} />
        {opponent ? (
          <PickRow side="them" label={theirPickLabel} sublabel={opponentName ? `vs ${opponentName}` : 'Opponent'} avatar={opponent.image} />
        ) : uiStatus === 'open' ? (
          <PickRow side="them" label="Looking for opponent…" sublabel="Awaiting a counter-challenge" />
        ) : null}
      </div>

      {/* Money + footer action */}
      <footer className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
        <div className="text-xs">
          <span className="text-gray-500">Stake </span>
          <span className="font-bold">{stakeNum.toFixed(2)} {wager.currency}</span>
          <span className="text-gray-300 mx-2">·</span>
          <span className="text-gray-500">Potential </span>
          <span className="font-bold">{potentialWinNum.toFixed(2)}</span>
        </div>
        <FooterAction
          uiStatus={uiStatus}
          expiryDate={expiryDate}
          kickoffDate={kickoffDate}
          isPending={isPending}
          canCancel={canCancel}
          onCancel={handleCancel}
          potentialWin={potentialWinNum}
          stake={stakeNum}
          currency={wager.currency}
          finishedScore={
            FINISHED_STATUSES.has(fixtureStatus ?? '') && homeScore !== null && awayScore !== null
              ? `${homeScore}–${awayScore}`
              : undefined
          }
        />
      </footer>
    </article>
  )
}

function PickRow({
  side,
  label,
  sublabel,
  avatar,
}: {
  side: 'you' | 'them'
  label: string
  sublabel?: string
  avatar?: string | null
}) {
  const isYou = side === 'you'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {isYou ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
            YOU
          </span>
        ) : avatar ? (
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatar} />
            <AvatarFallback>{(sublabel ?? '?').charAt(3)?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
            VS
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-bold truncate', !isYou && side === 'them' && 'text-gray-700')}>{label}</p>
        {sublabel && <p className="text-[11px] text-gray-500 truncate">{sublabel}</p>}
      </div>
    </div>
  )
}

function FooterAction({
  uiStatus,
  expiryDate,
  kickoffDate,
  finishedScore,
  isPending,
  canCancel,
  onCancel,
  potentialWin,
  stake,
  currency,
}: {
  uiStatus: UIStatus
  expiryDate: Date | null
  kickoffDate: Date | null
  finishedScore?: string
  isPending: boolean
  canCancel: boolean
  onCancel: () => void
  potentialWin: number
  stake: number
  currency: string
}) {
  if (uiStatus === 'open') {
    return (
      <div className="flex items-center gap-2">
        {expiryDate && !isPast(expiryDate) && (
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            expires in {formatDistanceToNowStrict(expiryDate)}
          </span>
        )}
        {canCancel && (
          <Button onClick={onCancel} disabled={isPending} variant="destructive" size="sm" className="h-8 px-3 text-xs">
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
            Cancel
          </Button>
        )}
      </div>
    )
  }
  if (uiStatus === 'matched' && kickoffDate && !isPast(kickoffDate)) {
    return <span className="text-[11px] text-gray-500">kickoff in {formatDistanceToNowStrict(kickoffDate)}</span>
  }
  if (uiStatus === 'matched') {
    return <span className="text-[11px] text-gray-500">{finishedScore ? `Final ${finishedScore} · awaiting settlement` : 'Awaiting settlement'}</span>
  }
  if (uiStatus === 'live') {
    return <span className="text-[11px] text-red-600 font-bold">LIVE</span>
  }
  if (uiStatus === 'won') {
    return <span className="text-xs font-bold text-green-600">+{potentialWin.toFixed(2)} {currency}{finishedScore ? ` · ${finishedScore}` : ''}</span>
  }
  if (uiStatus === 'lost') {
    return <span className="text-xs font-bold text-red-600">−{stake.toFixed(2)} {currency}{finishedScore ? ` · ${finishedScore}` : ''}</span>
  }
  if (uiStatus === 'cancelled') {
    return <span className="text-[11px] text-gray-500">Refunded</span>
  }
  if (uiStatus === 'expired') {
    return <span className="text-[11px] text-gray-500">No opponent · refunded</span>
  }
  return null
}

function labelForPick(market: string, marketParam: string | null | undefined, pickValue: string): string {
  const found = PICK_OPTIONS.find(
    (o) => o.market === market && (o.marketParam ?? '') === (marketParam ?? '') && o.pick === pickValue,
  )
  return found?.longLabel ?? pickValue
}

function describeMarket(market: string, marketParam?: string | null): string {
  const human = market.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return marketParam ? `${human} ${marketParam}` : human
}

export default BetList
