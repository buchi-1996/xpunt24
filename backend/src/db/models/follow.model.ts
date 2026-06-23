import { Schema, model, Document, Types } from 'mongoose'

export interface IFollowDocument extends Document {
  _id: Types.ObjectId
  followerId: Types.ObjectId
  followingId: Types.ObjectId
  createdAt: Date
}

const followSchema = new Schema<IFollowDocument>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false },
)

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true })
followSchema.index({ followingId: 1 })

export const Follow = model<IFollowDocument>('Follow', followSchema)
