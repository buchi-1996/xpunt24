'use client'

import { useCallback, useEffect, useState } from 'react'
import BetListTabs from './BetListClient'
import { useAuth } from '@/context/auth/AuthContext'
import { useSocket } from '@/context/socket/SocketContext'
import { api } from '@/lib/apiClient'
import { WagerProps } from '@/types'

export function BetListWrapper() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [wagers, setWagers] = useState<WagerProps[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setWagers([])
      setIsLoading(false)
      return
    }
    try {
      const res = await api.challenges.mine()
      setWagers(res.data as WagerProps[])
    } catch {
      // silent — keep last data
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    setIsLoading(true)
    load()
  }, [load])

  // Re-fetch on relevant socket events and on local "wagers:refresh" dispatches (cancel/etc.)
  useEffect(() => {
    if (!user) return

    const handleRefresh = () => load()
    const events: Array<Parameters<NonNullable<typeof socket>['on']>[0]> = [
      'challenge:matched',
      'challenge:settled',
      'challenge:cancelled',
    ]
    events.forEach((e) => socket?.on(e, handleRefresh))
    window.addEventListener('wagers:refresh', handleRefresh)
    window.addEventListener('challenges:refresh', handleRefresh)
    return () => {
      events.forEach((e) => socket?.off(e, handleRefresh))
      window.removeEventListener('wagers:refresh', handleRefresh)
      window.removeEventListener('challenges:refresh', handleRefresh)
    }
  }, [user, socket, load])

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
        <p className="text-sm text-gray-600">Please sign in to view your wagers.</p>
      </div>
    )
  }

  return <BetListTabs wagers={wagers} isLoading={isLoading} />
}
