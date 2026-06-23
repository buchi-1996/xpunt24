import { Schema, model, Document, Types } from 'mongoose'

export type DepositStatus =
  | 'INITIATED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'CREDITED'
  | 'FAILED'
  | 'EXPIRED'

export interface IDepositDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  provider: string
  network: string
  address: string
  requestedAmount: Types.Decimal128
  receivedAmount?: Types.Decimal128
  confirmations: number
  requiredConfirmations: number
  status: DepositStatus
  providerReference: string
  txHash?: string
  webhookPayload?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const depositSchema = new Schema<IDepositDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true, default: 'PAYRAM' },
    network: { type: String, required: true, default: 'TRC20' },
    address: { type: String, required: true },
    requestedAmount: { type: Schema.Types.Decimal128, required: true },
    receivedAmount: { type: Schema.Types.Decimal128 },
    confirmations: { type: Number, default: 0 },
    requiredConfirmations: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ['INITIATED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CREDITED', 'FAILED', 'EXPIRED'],
      default: 'INITIATED',
    },
    providerReference: { type: String, required: true, unique: true },
    txHash: { type: String },
    webhookPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

depositSchema.index({ userId: 1, status: 1 })
depositSchema.index({ txHash: 1 }, { sparse: true })

export const Deposit = model<IDepositDocument>('Deposit', depositSchema)
