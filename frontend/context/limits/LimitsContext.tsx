'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, PlatformLimits } from '@/lib/apiClient'
import {
  MIN_STAKE,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  WITHDRAWAL_REVIEW_THRESHOLD,
} from '@/lib/constants'

// Fallback values used while the fetch is in flight or if the endpoint fails. Mirror constants.ts.
const FALLBACK: PlatformLimits = {
  currency: 'USDT',
  minStake: MIN_STAKE,
  maxStake: 100000,
  minDeposit: MIN_DEPOSIT,
  minWithdrawal: MIN_WITHDRAWAL,
  withdrawalReviewThreshold: WITHDRAWAL_REVIEW_THRESHOLD,
  platformFeePercent: 5,
}

const LimitsContext = createContext<PlatformLimits>(FALLBACK)

export function LimitsProvider({ children }: { children: ReactNode }) {
  const [limits, setLimits] = useState<PlatformLimits>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    api.wallet
      .limits()
      .then((res) => {
        if (!cancelled) setLimits(res.data)
      })
      .catch(() => {
        // Silent — falls back to constants.ts values.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <LimitsContext.Provider value={limits}>{children}</LimitsContext.Provider>
}

export function useLimits(): PlatformLimits {
  return useContext(LimitsContext)
}
