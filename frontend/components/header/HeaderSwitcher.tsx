'use client'

import { useAuth } from '@/context/auth/AuthContext'
import Header from './Header'
import LoggedInHeader from './LoggedInHeader'

export default function HeaderSwitcher() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <LoggedInHeader /> : <Header />
}
