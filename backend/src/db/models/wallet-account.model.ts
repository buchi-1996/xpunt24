import { Schema, model, Document, Types } from 'mongoose'

export interface IWalletAccountDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  currency: string
  balance: Types.Decimal128
  lockedBalance: Types.Decimal128
  createdAt: Date
  updatedAt: Date
}

const walletAccountSchema = new Schema<IWalletAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, required: true, default: 'USDT' },
    balance: { type: Schema.Types.Decimal128, required: true, default: '0' },
    lockedBalance: { type: Schema.Types.Decimal128, required: true, default: '0' },
  },
  { timestamps: true },
)

walletAccountSchema.index({ userId: 1, currency: 1 }, { unique: true })

export const WalletAccount = model<IWalletAccountDocument>('WalletAccount', walletAccountSchema)
