import { Schema, model, Document, Types } from 'mongoose'
import { UserRole, AccountStatus } from '@challengers-bet/shared'

export interface IUserDocument extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  emailVerified?: Date
  image?: string
  role: UserRole
  accountStatus: AccountStatus
  googleId?: string
  riskFlags: {
    highDepositVelocity: boolean
    suspiciousActivity: boolean
    manualReviewRequired: boolean
  }
  wageringBlocked: boolean
  withdrawalsBlocked: boolean
  depositsBlocked: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Date },
    image: { type: String },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.BETTOR },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    googleId: { type: String, sparse: true, unique: true },
    riskFlags: {
      highDepositVelocity: { type: Boolean, default: false },
      suspiciousActivity: { type: Boolean, default: false },
      manualReviewRequired: { type: Boolean, default: false },
    },
    wageringBlocked: { type: Boolean, default: false },
    withdrawalsBlocked: { type: Boolean, default: false },
    depositsBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const User = model<IUserDocument>('User', userSchema)
