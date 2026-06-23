import { Schema, model, Document, Types } from 'mongoose'

export interface ICommentDocument extends Document {
  _id: Types.ObjectId
  challengeId: Types.ObjectId
  userId: Types.ObjectId
  body: string
  edited: boolean
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<ICommentDocument>(
  {
    challengeId: { type: Schema.Types.ObjectId, ref: 'Challenge', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true },
)

commentSchema.index({ challengeId: 1, createdAt: 1 })
commentSchema.index({ userId: 1 })

export const Comment = model<ICommentDocument>('Comment', commentSchema)
