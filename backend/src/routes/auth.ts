import { Router, Request, Response, NextFunction } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { User } from '../db/models/user.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { UserStats } from '../db/models/user-stats.model'
import { UserSettings } from '../db/models/user-settings.model'
import { authenticate } from '../middleware/auth'
import { UserRole, AccountStatus } from '@challengers-bet/shared'

const router = Router()

const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL,
)

const COOKIE_NAME = 'auth_token'
const COOKIE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

function issueToken(userId: string, role: UserRole, accountStatus: AccountStatus): string {
  return jwt.sign({ role, accountStatus }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: '5d',
  })
}

// GET /auth/google — redirect to Google consent page
router.get('/google', (_req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  })
  res.redirect(url)
})

// GET /auth/callback/google — exchange code, find/create user, issue JWT
router.get(
  '/callback/google',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.query['code'] as string | undefined
      if (!code) {
        res.status(400).json({ error: 'Missing authorization code' })
        return
      }

      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)

      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      if (!payload?.email) {
        res.status(400).json({ error: 'Invalid Google token payload' })
        return
      }

      const { sub: googleId, email, name, picture } = payload

      // Find or create the user
      let user = await User.findOne({ $or: [{ googleId }, { email }] })
      if (!user) {
        user = await User.create({
          googleId,
          email,
          name: name ?? email,
          image: picture,
          role: UserRole.BETTOR,
          accountStatus: AccountStatus.ACTIVE,
        })

        // Bootstrap wallet, stats, and settings for new users
        await Promise.all([
          WalletAccount.create({ userId: user._id, currency: 'USDT' }),
          UserStats.create({ userId: user._id }),
          UserSettings.create({ userId: user._id }),
        ])
      } else if (!user.googleId) {
        // Existing user from legacy system — patch googleId and fix any stale enum values
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              googleId,
              ...(!user.name && { name: name ?? email }),
              ...(picture && !user.image && { image: picture }),
              ...(!Object.values(UserRole).includes(user.role) && { role: UserRole.BETTOR }),
              ...(!Object.values(AccountStatus).includes(user.accountStatus) && { accountStatus: AccountStatus.ACTIVE }),
            },
          },
          { new: true, runValidators: false },
        ) as typeof user
      }

      const token = issueToken(user._id.toString(), user.role, user.accountStatus)

      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE_MS,
      })

      // Redirect to the web app after successful login
      const origin = env.ALLOWED_ORIGINS.split(',')[0] ?? 'http://localhost:3000'
      res.redirect(origin)
    } catch (err) {
      next(err)
    }
  },
)

// GET /auth/me — return current authenticated user
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select('-__v')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// POST /auth/logout — clear auth cookie
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' })
  res.json({ message: 'Logged out' })
})

export default router
