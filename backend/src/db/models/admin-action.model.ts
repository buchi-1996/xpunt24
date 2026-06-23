import { Schema, model, Document, Types } from 'mongoose'

export interface IAdminActionDocument extends Document {
  _id: Types.ObjectId
  adminUserId: Types.ObjectId
  targetUserId?: Types.ObjectId
  action: string
  targetModel?: string
  targetId?: string
  reason?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}

const adminActionSchema = new Schema<IAdminActionDocument>(
  {
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    targetModel: { type: String },
    targetId: { type: String },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false },
)

adminActionSchema.index({ adminUserId: 1, createdAt: -1 })
adminActionSchema.index({ targetUserId: 1, createdAt: -1 })
adminActionSchema.index({ action: 1, createdAt: -1 })

export const AdminAction = model<IAdminActionDocument>('AdminAction', adminActionSchema)
