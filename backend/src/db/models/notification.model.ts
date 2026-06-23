import { Schema, model, Document, Types } from 'mongoose'

export type NotificationType =
  | 'CHALLENGE_MATCHED'
  | 'CHALLENGE_SETTLED'
  | 'CHALLENGE_CANCELLED'
  | 'WAGER_WON'
  | 'WAGER_LOST'
  | 'DEPOSIT_CONFIRMED'
  | 'WITHDRAWAL_PROCESSED'
  | 'WITHDRAWAL_REJECTED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'ACCOUNT_SUSPENDED'
  | 'SYSTEM'

export interface INotificationDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: NotificationType
  title: string
  body: string
  read: boolean
  data?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'CHALLENGE_MATCHED',
        'CHALLENGE_SETTLED',
        'CHALLENGE_CANCELLED',
        'WAGER_WON',
        'WAGER_LOST',
        'DEPOSIT_CONFIRMED',
        'WITHDRAWAL_PROCESSED',
        'WITHDRAWAL_REJECTED',
        'DISPUTE_OPENED',
        'DISPUTE_RESOLVED',
        'ACCOUNT_SUSPENDED',
        'SYSTEM',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export const Notification = model<INotificationDocument>('Notification', notificationSchema)
