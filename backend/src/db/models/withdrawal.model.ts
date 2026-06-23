import { Schema, model, Document, Types } from 'mongoose'

export type WithdrawalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'

export interface IWithdrawalDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  walletAccountId: Types.ObjectId
  amount: Types.Decimal128
  currency: string
  status: WithdrawalStatus
  destinationAddress: string
  txHash?: string
  networkFee?: Types.Decimal128
  reviewedBy?: Types.ObjectId
  reviewedAt?: Date
  rejectionReason?: string
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const withdrawalSchema = new Schema<IWithdrawalDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    walletAccountId: { type: Schema.Types.ObjectId, ref: 'WalletAccount', required: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'],
      default: 'PENDING',
    },
    destinationAddress: { type: String, required: true },
    txHash: { type: String, sparse: true },
    networkFee: { type: Schema.Types.Decimal128 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
)

withdrawalSchema.index({ userId: 1, status: 1 })
withdrawalSchema.index({ status: 1, createdAt: 1 })

export const Withdrawal = model<IWithdrawalDocument>('Withdrawal', withdrawalSchema)
