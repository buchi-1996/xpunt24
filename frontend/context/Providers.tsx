'use client'

import Modal from '@/components/modal/Modal'
import { ModalProvider } from '@/context/modal/ModalContext'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from './auth/AuthContext'
import { WalletProvider } from './wallet/WalletContect'
import { SocketProvider } from './socket/SocketContext'
import { LimitsProvider } from './limits/LimitsContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LimitsProvider>
      <AuthProvider>
        <WalletProvider>
          <SocketProvider>
            <ModalProvider>
              {children}
              <Modal />
              <Toaster position="top-right" richColors />
            </ModalProvider>
          </SocketProvider>
        </WalletProvider>
      </AuthProvider>
    </LimitsProvider>
  )
}
