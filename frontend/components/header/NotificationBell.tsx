'use client'

import { useEffect, useState } from 'react'
import { BellIcon, CheckCheckIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '../ui/button'
import { api, NotificationItem } from '@/lib/apiClient'
import { cn } from '@/lib/utils'

const MAX_DISPLAYED = 10

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    let cancelled = false
    api.notifications
      .list()
      .then((res) => {
        if (!cancelled) setNotifications(res.data.slice(0, MAX_DISPLAYED))
      })
      .catch(() => {
        // first-load failures shouldn't break the header
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const onNew = (e: Event) => {
      const detail = (e as CustomEvent).detail as NotificationItem | undefined
      if (!detail) return
      setNotifications((prev) => [detail, ...prev].slice(0, MAX_DISPLAYED))
      toast(detail.title, { description: detail.body })
    }
    window.addEventListener('notification:new', onNew)

    return () => {
      cancelled = true
      window.removeEventListener('notification:new', onNew)
    }
  }, [])

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    )
    try {
      await api.notifications.markRead(id)
    } catch {
      // best-effort; revert if server rejects
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: false } : n)),
      )
    }
  }

  const markAllRead = async () => {
    const previous = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.notifications.markAllRead()
    } catch {
      setNotifications(previous)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <BellIcon className="h-5 w-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] p-0 rounded-xl shadow-2xl shadow-gray-200"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-bold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <CheckCheckIcon className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <BellIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-xs text-gray-500">You're all caught up</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n._id}>
                  <button
                    onClick={() => !n.read && markRead(n._id)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50',
                      !n.read && 'bg-blue-50/50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className={cn('flex-1 min-w-0', n.read && 'pl-4')}>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">{n.body}</p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
