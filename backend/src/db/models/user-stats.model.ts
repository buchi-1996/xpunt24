import { Schema, model, Document, Types } from 'mongoose'

export interface IUserStatsDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  totalWagers: number
  wonWagers: number
  lostWagers: number
  voidedWagers: number
  totalStaked: Types.Decimal128
  totalWon: Types.Decimal128
  totalLost: Types.Decimal128
  netPnl: Types.Decimal128
  winRate: number
  longestWinStreak: number
  longestLossStreak: number
  currentStreak: number
  createdAt: Date
  updatedAt: Date
}

const userStatsSchema = new Schema<IUserStatsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalWagers: { type: Number, default: 0 },
    wonWagers: { type: Number, default: 0 },
    lostWagers: { type: Number, default: 0 },
    voidedWagers: { type: Number, default: 0 },
    totalStaked: { type: Schema.Types.Decimal128, default: '0' },
    totalWon: { type: Schema.Types.Decimal128, default: '0' },
    totalLost: { type: Schema.Types.Decimal128, default: '0' },
    netPnl: { type: Schema.Types.Decimal128, default: '0' },
    winRate: { type: Number, default: 0 },
    longestWinStreak: { type: Number, default: 0 },
    longestLossStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const UserStats = model<IUserStatsDocument>('UserStats', userStatsSchema)
