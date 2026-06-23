import { Schema, model, Document, Types } from 'mongoose'

export type SettlementOutcome = 'HOME_WIN' | 'AWAY_WIN' | 'DRAW' | 'CANCELLED' | 'VOID'

export interface ISettlementDocument extends Document {
  _id: Types.ObjectId
  challengeId: Types.ObjectId
  fixtureId: string
  outcome: SettlementOutcome
  settledBy: 'AUTO' | 'ADMIN'
  adminUserId?: Types.ObjectId
  notes?: string
  totalPaidOut: Types.Decimal128
  currency: string
  createdAt: Date
  updatedAt: Date
}

const settlementSchema = new Schema<ISettlementDocument>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true, unique: true },
    fixtureId: { type: String, required: true },
    outcome: {
      type: String,
      enum: ['HOME_WIN', 'AWAY_WIN', 'DRAW', 'CANCELLED', 'VOID'],
      required: true,
    },
    settledBy: { type: String, enum: ['AUTO', 'ADMIN'], required: true },
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    totalPaidOut: { type: Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
  },
  { timestamps: true },
)

settlementSchema.index({ fixtureId: 1 })

export const Settlement = model<ISettlementDocument>('Settlement', settlementSchema)
