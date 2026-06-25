'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/apiClient'

interface AuthUser {
  id: string
  name: string
  email: string
  image?: string
  role: string
  createdAt?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const { user: u } = await api.auth.me()
      setUser({
        id: u._id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        createdAt: (u as { createdAt?: string }).createdAt,
      })
    } catch {
      setUser(null)
    }
  }

  async function logout() {
    try {
      await api.auth.logout()
    } catch {
      // ignore
    }
    setUser(null)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
