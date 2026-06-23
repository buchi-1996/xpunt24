import { Schema, model, Document, Types } from 'mongoose'

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'
export type DisputeResolution = 'REFUND_BOTH' | 'AWARD_CREATOR' | 'AWARD_OPPONENT' | 'VOID'

export interface IDisputeDocument extends Document {
  _id: Types.ObjectId
  challengeId: Types.ObjectId
  raisedBy: Types.ObjectId
  reason: string
  evidence?: string
  status: DisputeStatus
  resolution?: DisputeResolution
  resolvedBy?: Types.ObjectId
  resolvedAt?: Date
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const disputeSchema = new Schema<IDisputeDocument>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    evidence: { type: String },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    resolution: {
      type: String,
      enum: ['REFUND_BOTH', 'AWARD_CREATOR', 'AWARD_OPPONENT', 'VOID'],
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    adminNotes: { type: String },
  },
  { timestamps: true },
)

disputeSchema.index({ challengeId: 1 })
disputeSchema.index({ status: 1, createdAt: 1 })
disputeSchema.index({ raisedBy: 1 })

export const Dispute = model<IDisputeDocument>('Dispute', disputeSchema)
