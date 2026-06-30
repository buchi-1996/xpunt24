'use client'

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { SocketEvent } from '@challengers-bet/shared'
import { useAuth } from '@/context/auth/AuthContext'
import { useWallet } from '@/context/wallet/WalletContect'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { refresh: refreshWallet, setBalance } = useWallet()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    const socket = io(apiUrl, { withCredentials: true })
    socketRef.current = socket

    socket.on(SocketEvent.CHALLENGE_CREATED, () => {
      window.dispatchEvent(new Event('challenges:refresh'))
    })

    socket.on(SocketEvent.CHALLENGE_MATCHED, () => {
      // trigger challenge list refresh via custom event
      window.dispatchEvent(new Event('challenges:refresh'))
    })

    socket.on(SocketEvent.CHALLENGE_SETTLED, () => {
      window.dispatchEvent(new Event('challenges:refresh'))
      refreshWallet()
    })

    socket.on(SocketEvent.CHALLENGE_CANCELLED, () => {
      window.dispatchEvent(new Event('challenges:refresh'))
    })

    socket.on(SocketEvent.WALLET_BALANCE_UPDATED, (data: { balance?: string }) => {
      if (data.balance) {
        setBalance(data.balance)
      } else {
        refreshWallet()
      }
    })

    socket.on(SocketEvent.NOTIFICATION_NEW, (notification: unknown) => {
      window.dispatchEvent(new CustomEvent('notification:new', { detail: notification }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, refreshWallet, setBalance])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket(): SocketContextType {
  return useContext(SocketContext)
}
