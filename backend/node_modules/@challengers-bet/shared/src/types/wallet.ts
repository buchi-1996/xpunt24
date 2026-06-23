import { LedgerEntryType } from '../enums/ledger'

export interface IWalletAccount {
  id: string
  userId: string
  currency: string
  balance: number
  lockedBalance: number
  createdAt: Date
  updatedAt: Date
}

export interface ILedgerEntry {
  id: string
  walletAccountId: string
  userId: string
  type: LedgerEntryType
  amount: number
  balanceBefore: number
  balanceAfter: number
  currency: string
  sourceId: string
  sourceModel: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}
