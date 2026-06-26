import { Schema, model, Document, Types } from 'mongoose'
import { VerificationTokenPurpose } from '@challengers-bet/shared'

export interface IVerificationTokenDocument extends Document {
  _id: Types.ObjectId
  userId?: Types.ObjectId // null when this is a "create-new-user-on-verify" token
  tokenHash: string // sha256 hex of the plaintext token
  purpose: VerificationTokenPurpose
  expiresAt: Date
  usedAt?: Date
  // Staged signup data (used by EMAIL_VERIFY tokens issued during /auth/register).
  // pendingPasswordHash is select:false so it never leaks.
  pendingPasswordHash?: string
  pendingEmail?: string
  pendingName?: string
  createdAt: Date
  updatedAt: Date
}

const verificationTokenSchema = new Schema<IVerificationTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenHash: { type: String, required: true, unique: true },
    purpose: {
      type: String,
      enum: Object.values(VerificationTokenPurpose),
      required: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    pendingPasswordHash: { type: String, select: false },
    pendingEmail: { type: String, lowercase: true },
    pendingName: { type: String },
  },
  { timestamps: true },
)

// TTL: MongoDB physically deletes expired docs within ~60s, keeping the collection bounded.
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Lookup-by-user-and-purpose for invalidating prior unused tokens of the same kind.
verificationTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 })

export const VerificationToken = model<IVerificationTokenDocument>(
  'VerificationToken',
  verificationTokenSchema,
)
