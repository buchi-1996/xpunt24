import { Schema, model, Document, Types } from 'mongoose'
import { ChallengeStatus, ChallengeVisibility, Market, Pick } from '@challengers-bet/shared'

export interface IChallengeDocument extends Document {
  _id: Types.ObjectId
  creatorId: Types.ObjectId
  opponentId?: Types.ObjectId
  fixtureId: string
  market: Market
  marketParam?: string // e.g. "1.5", "2.5", "3.5" for OVER_UNDER thresholds
  pick: Pick
  opponentPick: Pick
  stake: Types.Decimal128
  currency: string
  potentialWin: Types.Decimal128
  platformFee: Types.Decimal128
  status: ChallengeStatus
  visibility: ChallengeVisibility
  expiresAt?: Date
  settledAt?: Date
  winnerUserId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const challengeSchema = new Schema<IChallengeDocument>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User' },
    fixtureId: { type: String, required: true },
    market: { type: String, enum: Object.values(Market), required: true },
    marketParam: { type: String },
    pick: { type: String, enum: Object.values(Pick), required: true },
    opponentPick: { type: String, enum: Object.values(Pick), required: true },
    stake: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: 'USDT' },
    potentialWin: { type: Schema.Types.Decimal128, required: true },
    platformFee: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: Object.values(ChallengeStatus),
      default: ChallengeStatus.OPEN,
    },
    visibility: {
      type: String,
      enum: Object.values(ChallengeVisibility),
      default: ChallengeVisibility.PUBLIC,
    },
    expiresAt: { type: Date },
    settledAt: { type: Date },
    winnerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// Index for matching query — finding open challenges to match against
challengeSchema.index({ fixtureId: 1, market: 1, marketParam: 1, pick: 1, stake: 1, currency: 1, status: 1 })
challengeSchema.index({ creatorId: 1, status: 1 })
challengeSchema.index({ opponentId: 1, status: 1 })

export const Challenge = model<IChallengeDocument>('Challenge', challengeSchema)
