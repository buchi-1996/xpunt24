'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BellIcon,
  CheckCheckIcon,
  HandshakeIcon,
  InboxIcon,
  ShieldAlertIcon,
  TrophyIcon,
  XCircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, NotificationItem } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'unread'

const TYPE_META: Record<string, { Icon: typeof BellIcon; tone: string }> = {
  CHALLENGE_MATCHED:   { Icon: HandshakeIcon,    tone: 'bg-indigo-50 text-indigo-700' },
  CHALLENGE_SETTLED:   { Icon: TrophyIcon,       tone: 'bg-amber-50 text-amber-700' },
  CHALLENGE_CANCELLED: { Icon: XCircleIcon,      tone: 'bg-gray-100 text-gray-600' },
  WAGER_WON:           { Icon: TrophyIcon,       tone: 'bg-green-50 text-green-700' },
  WAGER_LOST:          { Icon: XCircleIcon,      tone: 'bg-red-50 text-red-700' },
  DEPOSIT_CONFIRMED:   { Icon: ArrowDownLeftIcon,tone: 'bg-green-50 text-green-700' },
  WITHDRAWAL_PROCESSED:{ Icon: ArrowUpRightIcon, tone: 'bg-blue-50 text-blue-700' },
  WITHDRAWAL_REJECTED: { Icon: XCircleIcon,      tone: 'bg-red-50 text-red-700' },
  ACCOUNT_SUSPENDED:   { Icon: ShieldAlertIcon,  tone: 'bg-red-50 text-red-700' },
  DISPUTE_OPENED:      { Icon: ShieldAlertIcon,  tone: 'bg-amber-50 text-amber-700' },
  DISPUTE_RESOLVED:    { Icon: CheckCheckIcon,   tone: 'bg-green-50 text-green-700' },
  SYSTEM:              { Icon: BellIcon,         tone: 'bg-blue-50 text-blue-700' },
}

function safeRelativeTime(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return formatDistanceToNow(d, { addSuffix: true })
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  const load = useCallback(
    async (p: number) => {
      if (!user) return
      setLoading(true)
      try {
        const res = await api.notifications.list(p)
        setItems(res.data)
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

  // Live append on incoming socket-dispatched notifications
  useEffect(() => {
    const onNew = (e: Event) => {
      const detail = (e as CustomEvent).detail as NotificationItem | undefined
      if (!detail) return
      setItems((prev) => [detail, ...prev])
    }
    window.addEventListener('notification:new', onNew)
    return () => window.removeEventListener('notification:new', onNew)
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.read)
    return items
  }, [items, filter])

  const unreadCount = items.filter((n) => !n.read).length

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    try {
      await api.notifications.markRead(id)
    } catch {
      // revert on failure
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)))
    }
  }

  const markAllRead = async () => {
    const previous = items
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.notifications.markAllRead()
    } catch {
      setItems(previous)
    }
  }

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
          <p className="text-sm text-gray-500 mb-4">Sign in to view your notifications.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/notifications">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-6 md:py-10 pb-20 md:pb-10">
      <div className="container max-w-2xl mx-auto">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-blue-600 hover:text-blue-700">
              <CheckCheckIcon className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </header>

        <div className="flex items-center gap-2 mb-4">
          {(['all', 'unread'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <>
            <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {filtered.map((n) => (
                <NotificationRow key={n._id} item={n} onMarkRead={markRead} />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
                  Previous
                </Button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem
  onMarkRead: (id: string) => void
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM
  const Icon = meta.Icon
  return (
    <li>
      <button
        type="button"
        onClick={() => !item.read && onMarkRead(item._id)}
        className={cn(
          'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
          !item.read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-gray-50',
        )}
      >
        <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0', meta.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            {!item.read && <span className="inline-block h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
            <p className={cn('font-bold text-sm truncate', item.read && 'font-semibold')}>{item.title}</p>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.body}</p>
          <p className="text-[10px] text-gray-400 mt-1">{safeRelativeTime(item.createdAt)}</p>
        </div>
      </button>
    </li>
  )
}

function EmptyState({ filter }: { filter: FilterKey }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
      <InboxIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 font-semibold">
        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        We'll let you know when a challenge matches, settles or your wallet moves.
      </p>
    </div>
  )
}

function SkeletonList() {
  return (
    <ul className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
          <div className="h-9 w-9 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="flex-1 grid gap-2">
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-3 w-56 bg-gray-100 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}
