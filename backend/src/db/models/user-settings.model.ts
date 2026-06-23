import { Schema, model, Document, Types } from 'mongoose'

export interface IUserSettingsDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  notifications: {
    challengeMatched: boolean
    challengeSettled: boolean
    depositConfirmed: boolean
    withdrawalProcessed: boolean
    newFollower: boolean
  }
  privacy: {
    showWagerHistory: boolean
    showStats: boolean
    showBalance: boolean
  }
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  language: string
  createdAt: Date
  updatedAt: Date
}

const userSettingsSchema = new Schema<IUserSettingsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    notifications: {
      challengeMatched: { type: Boolean, default: true },
      challengeSettled: { type: Boolean, default: true },
      depositConfirmed: { type: Boolean, default: true },
      withdrawalProcessed: { type: Boolean, default: true },
      newFollower: { type: Boolean, default: true },
    },
    privacy: {
      showWagerHistory: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      showBalance: { type: Boolean, default: false },
    },
    theme: { type: String, enum: ['LIGHT', 'DARK', 'SYSTEM'], default: 'SYSTEM' },
    language: { type: String, default: 'en' },
  },
  { timestamps: true },
)

export const UserSettings = model<IUserSettingsDocument>('UserSettings', userSettingsSchema)
