import { Types } from 'mongoose'
import jwt from 'jsonwebtoken'
import {
  AccountStatus,
  UserRole,
  VerificationTokenPurpose,
} from '@challengers-bet/shared'
import { env } from '../config/env'
import { User, IUserDocument } from '../db/models/user.model'
import { VerificationToken } from '../db/models/verification-token.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { UserStats } from '../db/models/user-stats.model'
import { UserSettings } from '../db/models/user-settings.model'
import { AppError } from '../utils/AppError'
import { hashPassword, verifyPassword } from '../utils/password'
import { generatePlaintextToken, hashToken } from '../utils/tokens'
import {
  emailService,
  passwordResetTemplate,
  signupAttemptOnExistingTemplate,
  verifyEmailTemplate,
} from './email.service'

const COOKIE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000 // 5 days — matches the JWT TTL

const RESEND_THROTTLE_MS = 60 * 1000 // 1 send per 60s per email/purpose

export function issueToken(userId: string, role: UserRole, accountStatus: AccountStatus): string {
  return jwt.sign({ role, accountStatus }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: '5d',
  })
}

export const AUTH_COOKIE_NAME = 'auth_token'

export function authCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
  domain?: string
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  }
}

// Used on logout — same options minus maxAge so the browser deletes the cookie.
export function authClearCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  domain?: string
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  }
}

async function bootstrapUserCollections(userId: Types.ObjectId): Promise<void> {
  // Same bootstrap as the Google OAuth callback.
  await Promise.all([
    WalletAccount.create({ userId, currency: 'USDT' }),
    UserStats.create({ userId }),
    UserSettings.create({ userId }),
  ])
}

function buildVerifyLink(plaintextToken: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/auth/verify?token=${encodeURIComponent(plaintextToken)}`
}

function buildResetLink(plaintextToken: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(plaintextToken)}`
}

class AuthService {
  /**
   * Register an email/password account. Returns void — caller always gets a generic
   * "check your inbox" response, so this method never reveals which branch ran.
   * Handles new email, linking to an existing Google user, and already-set-up account
   * by sending different emails internally.
   */
  async register(params: { email: string; password: string; name: string }): Promise<void> {
    const email = params.email.trim().toLowerCase()
    const name = params.name.trim()
    const passwordHash = await hashPassword(params.password)

    // Need passwordHash on this fetch since we check whether the user has one already
    const existing = await User.findOne({ email }).select('+passwordHash')

    // Branch A: no user at all → stage a new-user verify token (no User row yet)
    if (!existing) {
      if (await this.recentlySent({ email, purpose: VerificationTokenPurpose.EMAIL_VERIFY })) return
      const { plaintext, hash } = makeToken()
      await VerificationToken.create({
        userId: undefined,
        tokenHash: hash,
        purpose: VerificationTokenPurpose.EMAIL_VERIFY,
        expiresAt: verifyTokenExpiry(),
        pendingEmail: email,
        pendingName: name,
        pendingPasswordHash: passwordHash,
      })
      const msg = verifyEmailTemplate({
        name,
        link: buildVerifyLink(plaintext),
        ttlHours: env.EMAIL_VERIFY_TTL_HOURS,
        context: 'new_user',
      })
      await emailService.send({ ...msg, to: email })
      return
    }

    // Branch B: user exists, has a googleId, no passwordHash → linking flow
    if (existing.googleId && !existing.passwordHash) {
      if (await this.recentlySent({ userId: existing._id, purpose: VerificationTokenPurpose.EMAIL_VERIFY })) return
      const { plaintext, hash } = makeToken()
      await VerificationToken.create({
        userId: existing._id,
        tokenHash: hash,
        purpose: VerificationTokenPurpose.EMAIL_VERIFY,
        expiresAt: verifyTokenExpiry(),
        pendingPasswordHash: passwordHash,
      })
      const msg = verifyEmailTemplate({
        name: existing.name,
        link: buildVerifyLink(plaintext),
        ttlHours: env.EMAIL_VERIFY_TTL_HOURS,
        context: 'linking_to_google',
      })
      await emailService.send({ ...msg, to: email })
      return
    }

    // Branch C: user exists, already verified + has a password → quiet security alert
    if (existing.passwordHash && existing.emailVerified) {
      const msg = signupAttemptOnExistingTemplate({ name: existing.name })
      await emailService.send({ ...msg, to: email })
      return
    }

    // Branch D: user exists, unverified, may or may not have a passwordHash → reissue
    if (await this.recentlySent({ userId: existing._id, purpose: VerificationTokenPurpose.EMAIL_VERIFY })) return
    await this.invalidateUserTokens(existing._id, VerificationTokenPurpose.EMAIL_VERIFY)
    const { plaintext, hash } = makeToken()
    await VerificationToken.create({
      userId: existing._id,
      tokenHash: hash,
      purpose: VerificationTokenPurpose.EMAIL_VERIFY,
      expiresAt: verifyTokenExpiry(),
      // If they're re-registering with a new password while unverified, allow them to
      // overwrite — they're proving the email is theirs by clicking the link.
      pendingPasswordHash: passwordHash,
    })
    const msg = verifyEmailTemplate({
      name: existing.name,
      link: buildVerifyLink(plaintext),
      ttlHours: env.EMAIL_VERIFY_TTL_HOURS,
      context: existing.googleId ? 'linking_to_google' : 'new_user',
    })
    await emailService.send({ ...msg, to: email })
  }

  /**
   * Email/password login. Returns { jwt, user } on success.
   * On any failure throws AppError(401, 'INVALID_CREDENTIALS') — never leaks the
   * specific reason (wrong password vs no user vs banned vs unverified). The one
   * exception is the unverified case where we DO want the user to see a helpful
   * message — caller can distinguish via the err.code.
   */
  async login(params: { email: string; password: string }): Promise<{
    token: string
    user: IUserDocument
  }> {
    const email = params.email.trim().toLowerCase()
    const user = await User.findOne({ email }).select('+passwordHash')

    // Generic-fail branch (covers no-user, no-password-on-account, wrong-password)
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }
    const ok = await verifyPassword(params.password, user.passwordHash)
    if (!ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')

    // Account-status gate (don't leak which status to anonymous probers)
    if (
      user.accountStatus === AccountStatus.BANNED ||
      user.accountStatus === AccountStatus.CLOSED ||
      user.accountStatus === AccountStatus.SUSPENDED
    ) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    // We DO allow login when emailVerified is null — backend gates money actions via
    // requireVerifiedEmail middleware; the UI shows a banner. This is the agreed UX.
    const token = issueToken(user._id.toString(), user.role, user.accountStatus)
    return { token, user }
  }

  /**
   * Consume an email-verify token: set passwordHash + emailVerified, create the user
   * + bootstrap collections if needed, return an auto-login JWT.
   */
  async verifyEmail(plaintextToken: string): Promise<{ token: string; user: IUserDocument }> {
    const tokenHash = hashToken(plaintextToken)
    const tokenDoc = await VerificationToken.findOne({
      tokenHash,
      purpose: VerificationTokenPurpose.EMAIL_VERIFY,
    }).select('+pendingPasswordHash')

    if (!tokenDoc) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN')
    if (tokenDoc.usedAt) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN')
    if (tokenDoc.expiresAt.getTime() < Date.now())
      throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN')

    let user: IUserDocument | null = null

    if (tokenDoc.userId) {
      // Linking-to-existing-user or reissue case.
      user = await User.findById(tokenDoc.userId).select('+passwordHash')
      if (!user) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN')
      const updates: Partial<IUserDocument> = { emailVerified: new Date() }
      if (tokenDoc.pendingPasswordHash) updates.passwordHash = tokenDoc.pendingPasswordHash
      await User.findByIdAndUpdate(user._id, { $set: updates })
      // Re-fetch with passwordHash so caller has a fresh picture if it matters
      user = await User.findById(user._id).select('+passwordHash')
    } else {
      // Brand-new-user create-on-verify case. pendingEmail/pendingName/pendingPasswordHash all required.
      if (!tokenDoc.pendingEmail || !tokenDoc.pendingName || !tokenDoc.pendingPasswordHash) {
        throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN')
      }
      // Race: another path could have just created the user (Google signup with same email
      // between the register call and the verify click). Handle by linking onto whatever exists.
      const collisionUser = await User.findOne({ email: tokenDoc.pendingEmail }).select('+passwordHash')
      if (collisionUser) {
        await User.findByIdAndUpdate(collisionUser._id, {
          $set: {
            emailVerified: new Date(),
            passwordHash: tokenDoc.pendingPasswordHash,
            ...(collisionUser.name ? {} : { name: tokenDoc.pendingName }),
          },
        })
        user = await User.findById(collisionUser._id).select('+passwordHash')
      } else {
        user = await User.create({
          name: tokenDoc.pendingName,
          email: tokenDoc.pendingEmail,
          passwordHash: tokenDoc.pendingPasswordHash,
          emailVerified: new Date(),
          role: UserRole.BETTOR,
          accountStatus: AccountStatus.ACTIVE,
        })
        await bootstrapUserCollections(user._id)
      }
    }

    if (!user) throw new AppError('Failed to verify email', 500)

    // Mark this token consumed and invalidate any other unused EMAIL_VERIFY tokens
    tokenDoc.usedAt = new Date()
    await tokenDoc.save()
    await this.invalidateUserTokens(user._id, VerificationTokenPurpose.EMAIL_VERIFY, tokenDoc._id)

    const token = issueToken(user._id.toString(), user.role, user.accountStatus)
    return { token, user }
  }

  async resendVerification(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalized }).select('+passwordHash')
    if (!user || user.emailVerified) return // generic ack — caller never knows
    if (await this.recentlySent({ userId: user._id, purpose: VerificationTokenPurpose.EMAIL_VERIFY })) return

    await this.invalidateUserTokens(user._id, VerificationTokenPurpose.EMAIL_VERIFY)
    const { plaintext, hash } = makeToken()
    await VerificationToken.create({
      userId: user._id,
      tokenHash: hash,
      purpose: VerificationTokenPurpose.EMAIL_VERIFY,
      expiresAt: verifyTokenExpiry(),
    })
    const msg = verifyEmailTemplate({
      name: user.name,
      link: buildVerifyLink(plaintext),
      ttlHours: env.EMAIL_VERIFY_TTL_HOURS,
      context: user.googleId && !user.passwordHash ? 'linking_to_google' : 'new_user',
    })
    await emailService.send({ ...msg, to: normalized })
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalized })
    if (!user) return // generic ack
    if (await this.recentlySent({ userId: user._id, purpose: VerificationTokenPurpose.PASSWORD_RESET })) return

    await this.invalidateUserTokens(user._id, VerificationTokenPurpose.PASSWORD_RESET)
    const { plaintext, hash } = makeToken()
    await VerificationToken.create({
      userId: user._id,
      tokenHash: hash,
      purpose: VerificationTokenPurpose.PASSWORD_RESET,
      expiresAt: resetTokenExpiry(),
    })
    const msg = passwordResetTemplate({
      name: user.name,
      link: buildResetLink(plaintext),
      ttlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
    })
    await emailService.send({ ...msg, to: normalized })
  }

  async resetPassword(
    plaintextToken: string,
    newPassword: string,
  ): Promise<{ token: string; user: IUserDocument }> {
    const tokenHash = hashToken(plaintextToken)
    const tokenDoc = await VerificationToken.findOne({
      tokenHash,
      purpose: VerificationTokenPurpose.PASSWORD_RESET,
    })

    if (!tokenDoc) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN')
    if (tokenDoc.usedAt) throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN')
    if (tokenDoc.expiresAt.getTime() < Date.now())
      throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN')
    if (!tokenDoc.userId)
      throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN')

    const passwordHash = await hashPassword(newPassword)
    await User.findByIdAndUpdate(tokenDoc.userId, {
      $set: {
        passwordHash,
        // A successful reset proves email control — verify them implicitly.
        emailVerified: new Date(),
      },
    })

    tokenDoc.usedAt = new Date()
    await tokenDoc.save()
    await this.invalidateUserTokens(
      tokenDoc.userId,
      VerificationTokenPurpose.PASSWORD_RESET,
      tokenDoc._id,
    )

    const user = await User.findById(tokenDoc.userId)
    if (!user) throw new AppError('User not found', 500)

    const token = issueToken(user._id.toString(), user.role, user.accountStatus)
    return { token, user }
  }

  // ───── helpers ─────

  private async invalidateUserTokens(
    userId: Types.ObjectId | string,
    purpose: VerificationTokenPurpose,
    exceptId?: Types.ObjectId,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      userId,
      purpose,
      usedAt: null,
    }
    if (exceptId) filter['_id'] = { $ne: exceptId }
    await VerificationToken.updateMany(filter, { $set: { usedAt: new Date() } })
  }

  // Returns true if we sent an email matching these criteria within the throttle window.
  // Caller treats true as a silent no-op (don't reveal whether the email matched) instead
  // of throwing 429, so an attacker can't probe email existence by comparing response codes.
  private async recentlySent(by: {
    userId?: Types.ObjectId
    email?: string
    purpose: VerificationTokenPurpose
  }): Promise<boolean> {
    const cutoff = new Date(Date.now() - RESEND_THROTTLE_MS)
    const query: Record<string, unknown> = {
      purpose: by.purpose,
      createdAt: { $gt: cutoff },
    }
    if (by.userId) query['userId'] = by.userId
    if (by.email) query['pendingEmail'] = by.email
    const recent = await VerificationToken.findOne(query).select('_id')
    return Boolean(recent)
  }
}

function makeToken(): { plaintext: string; hash: string } {
  const plaintext = generatePlaintextToken()
  return { plaintext, hash: hashToken(plaintext) }
}

function verifyTokenExpiry(): Date {
  return new Date(Date.now() + env.EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000)
}

function resetTokenExpiry(): Date {
  return new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
}

export const authService = new AuthService()
