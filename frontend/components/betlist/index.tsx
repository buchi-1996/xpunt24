'use client'

import { useEffect, useState } from 'react'
import BetListTabs from './BetListClient'
import { useAuth } from '@/context/auth/AuthContext'
import { api } from '@/lib/apiClient'
import { WagerProps } from '@/types'

export function BetListWrapper() {
  const { user } = useAuth()
  const [wagers, setWagers] = useState<WagerProps[]>([])

  useEffect(() => {
    if (!user) return
    api.challenges.mine()
      .then((res) => setWagers(res.data as WagerProps[]))
      .catch((err) => console.error('Error fetching wagers:', err))
  }, [user])

  return <BetListTabs wagers={wagers} />
}
