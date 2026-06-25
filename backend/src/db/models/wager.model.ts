import { Schema, model, Document, Types } from 'mongoose'
import { WagerStatus, WagerResult, Market, Pick } from '@challengers-bet/shared'

export interface IWagerDocument extends Document {
  _id: Types.ObjectId
  challengeId: Types.ObjectId
  userId: Types.ObjectId
  pick: Pick
  market: Market
  marketParam?: string
  stake: Types.Decimal128
  currency: string
  potentialPayout: Types.Decimal128
  status: WagerStatus
  result?: WagerResult
  settledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const wagerSchema = new Schema<IWagerDocument>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pick: { type: String, enum: Object.values(Pick), required: true },
    market: { type: String, enum: Object.values(Market), required: true },
    marketParam: { type: String },
    stake: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    potentialPayout: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: Object.values(WagerStatus),
      default: WagerStatus.PENDING,
    },
    result: { type: String, enum: Object.values(WagerResult) },
    settledAt: { type: Date },
  },
  { timestamps: true },
)

wagerSchema.index({ userId: 1, status: 1 })
wagerSchema.index({ challengeId: 1 })

export const Wager = model<IWagerDocument>('Wager', wagerSchema)
