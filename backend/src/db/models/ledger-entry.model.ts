import { Schema, model, Document, Types } from 'mongoose'
import { LedgerEntryType } from '@challengers-bet/shared'

export interface ILedgerEntryDocument extends Document {
  _id: Types.ObjectId
  walletAccountId: Types.ObjectId
  userId: Types.ObjectId
  type: LedgerEntryType
  amount: Types.Decimal128
  balanceBefore: Types.Decimal128
  balanceAfter: Types.Decimal128
  currency: string
  sourceId: string
  sourceModel: string
  description?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const ledgerEntrySchema = new Schema<ILedgerEntryDocument>(
  {
    walletAccountId: { type: Schema.Types.ObjectId, ref: 'WalletAccount', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(LedgerEntryType), required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    balanceBefore: { type: Schema.Types.Decimal128, required: true },
    balanceAfter: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    sourceId: { type: String, required: true },
    sourceModel: { type: String, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false },
)

// Idempotency: prevent duplicate ledger entries for the same source event
ledgerEntrySchema.index({ sourceId: 1, type: 1 }, { unique: true })
ledgerEntrySchema.index({ userId: 1, createdAt: -1 })
ledgerEntrySchema.index({ walletAccountId: 1, createdAt: -1 })

export const LedgerEntry = model<ILedgerEntryDocument>('LedgerEntry', ledgerEntrySchema)
