'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'

interface WalletContextType {
  balance: string
  lockedBalance: string
  currency: string
  isRefreshing: boolean
  refresh: () => Promise<void>
  setBalance: (balance: string) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [balance, setBalance] = useState('0')
  const [lockedBalance, setLockedBalance] = useState('0')
  const [currency, setCurrency] = useState('USDT')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setIsRefreshing(true)
    try {
      const res = await api.wallet.balance()
      setBalance(res.data.balance)
      setLockedBalance(res.data.lockedBalance)
      setCurrency(res.data.currency)
    } catch {
      // silently fail
    } finally {
      setIsRefreshing(false)
    }
  }, [user])

  // Fetch on mount and when user changes
  useEffect(() => {
    if (user) {
      refresh()
    } else {
      setBalance('0')
      setLockedBalance('0')
    }
  }, [user, refresh])

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => { if (user) refresh() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, refresh])

  return (
    <WalletContext.Provider
      value={{ balance, lockedBalance, currency, isRefreshing, refresh, setBalance }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
