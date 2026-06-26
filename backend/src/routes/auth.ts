import { Router, Request, Response, NextFunction } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { z } from 'zod'
import { env } from '../config/env'
import { User } from '../db/models/user.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { UserStats } from '../db/models/user-stats.model'
import { UserSettings } from '../db/models/user-settings.model'
import { authenticate } from '../middleware/auth'
import { UserRole, AccountStatus } from '@challengers-bet/shared'
import {
  AUTH_COOKIE_NAME,
  authClearCookieOptions,
  authCookieOptions,
  authService,
  issueToken,
} from '../services/auth.service'
import { authStrict, emailDispatch } from '../middleware/rateLimit'
import { AppError } from '../utils/AppError'

const router = Router()

const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL,
)

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions())
}

// ───── Google OAuth ─────

// GET /auth/google — redirect to Google consent page
// Optional ?redirect=/some/path is round-tripped through Google's `state` param so the callback
// can return the user to the page they were on before authenticating.
router.get('/google', (req: Request, res: Response) => {
  const redirect = typeof req.query['redirect'] === 'string' ? req.query['redirect'] : undefined
  const state = redirect ? Buffer.from(redirect, 'utf8').toString('base64url') : undefined
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    ...(state ? { state } : {}),
  })
  res.redirect(url)
})

// Only allow internal, relative paths so we can't be turned into an open redirect.
function safeRedirectPath(state: string | undefined): string {
  if (!state) return '/'
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded
  } catch {
    /* fall through */
  }
  return '/'
}

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
        // Google has already verified the email — mark verified at creation.
        user = await User.create({
          googleId,
          email,
          name: name ?? email,
          image: picture,
          emailVerified: new Date(),
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
        // Existing user from legacy system or email/password registration — patch googleId
        // and fix any stale enum values. Also mark emailVerified since Google did it for us.
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              googleId,
              ...(!user.emailVerified && { emailVerified: new Date() }),
              ...(!user.name && { name: name ?? email }),
              ...(picture && !user.image && { image: picture }),
              ...(!Object.values(UserRole).includes(user.role) && { role: UserRole.BETTOR }),
              ...(!Object.values(AccountStatus).includes(user.accountStatus) && { accountStatus: AccountStatus.ACTIVE }),
            },
          },
          { new: true, runValidators: false },
        ) as typeof user
      } else if (!user.emailVerified) {
        // Returning Google user that somehow lacked emailVerified — backfill silently.
        user = await User.findByIdAndUpdate(
          user._id,
          { $set: { emailVerified: new Date() } },
          { new: true, runValidators: false },
        ) as typeof user
      }

      const token = issueToken(user._id.toString(), user.role, user.accountStatus)
      setAuthCookie(res, token)

      // Redirect to the web app after successful login, honoring any signed-in-from state.
      const origin = env.ALLOWED_ORIGINS.split(',')[0] ?? 'http://localhost:3000'
      const state = typeof req.query['state'] === 'string' ? req.query['state'] : undefined
      res.redirect(`${origin}${safeRedirectPath(state)}`)
    } catch (err) {
      next(err)
    }
  },
)

// ───── Session ─────

// GET /auth/me — return current authenticated user
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // .select() excludes __v explicitly. passwordHash has select:false on the schema so it's
    // never returned here regardless.
    const user = await User.findById(req.user!.id).select('-__v')
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    // Re-issue the cookie with the current options (notably Domain from COOKIE_DOMAIN).
    // This transparently UPGRADES legacy host-only cookies (set on api.xpunt24.com before
    // COOKIE_DOMAIN existed) to .xpunt24.com on the next app load, so the frontend
    // middleware on xpunt24.com starts seeing the cookie — no manual re-login needed.
    // Also acts as a sliding session for active users.
    const freshToken = issueToken(user._id.toString(), user.role, user.accountStatus)
    res.cookie(AUTH_COOKIE_NAME, freshToken, authCookieOptions())
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// POST /auth/logout-everywhere — invalidate every JWT for this user across all devices.
// Also clears the current device's cookie. Useful when a device is lost or you suspect
// your session was compromised.
router.post('/logout-everywhere', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logoutEverywhere(req.user!.id)
    const base = authClearCookieOptions()
    if (env.COOKIE_DOMAIN) res.clearCookie(AUTH_COOKIE_NAME, base)
    const { domain: _omit, ...hostOnly } = base
    void _omit
    res.clearCookie(AUTH_COOKIE_NAME, hostOnly)
    res.json({ message: 'Signed out everywhere' })
  } catch (err) {
    next(err)
  }
})

// POST /auth/logout — clear auth cookie.
// IMPORTANT: clearCookie options MUST match what was set, or the browser won't recognize
// the directive and the cookie persists. Same httpOnly / secure / sameSite / domain as set.
router.post('/logout', (_req: Request, res: Response) => {
  const base = authClearCookieOptions()
  // Clear the domain-scoped cookie (current scheme)...
  if (env.COOKIE_DOMAIN) res.clearCookie(AUTH_COOKIE_NAME, base)
  // ...and any legacy host-only cookie set before COOKIE_DOMAIN existed, otherwise it survives
  // logout and keeps the session alive on api.xpunt24.com.
  const { domain: _omit, ...hostOnly } = base
  void _omit
  res.clearCookie(AUTH_COOKIE_NAME, hostOnly)
  res.json({ message: 'Logged out' })
})

// ───── Email/password ─────

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  name: z.string().min(2).max(80),
})
const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
})
const tokenOnlyBodySchema = z.object({ token: z.string().min(20).max(200) })
const emailOnlyBodySchema = z.object({ email: z.string().email() })
const resetBodySchema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(10).max(128),
})

const GENERIC_EMAIL_ACK = {
  message: 'If the email is valid, a verification link has been sent.',
}
const GENERIC_RESEND_ACK = {
  message: 'If an account requires verification, an email has been sent.',
}
const GENERIC_RESET_ACK = {
  message: 'If an account exists for that email, a reset link has been sent.',
}

function parseOr400<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new AppError('Invalid request', 400, 'INVALID_REQUEST')
  return parsed.data
}

// POST /auth/register — email/password signup. Generic response in every case.
router.post(
  '/register',
  emailDispatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = parseOr400(registerBodySchema, req.body)
      await authService.register(body)
      res.json(GENERIC_EMAIL_ACK)
    } catch (err) {
      next(err)
    }
  },
)

// POST /auth/login — email/password login. Sets auth cookie on success.
router.post(
  '/login',
  authStrict,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = parseOr400(loginBodySchema, req.body)
      const { token, user } = await authService.login(body)
      setAuthCookie(res, token)
      res.json({
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          accountStatus: user.accountStatus,
          emailVerified: user.emailVerified,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /auth/verify-email — consume token, auto-login.
router.post(
  '/verify-email',
  authStrict,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = parseOr400(tokenOnlyBodySchema, req.body)
      const result = await authService.verifyEmail(token)
      setAuthCookie(res, result.token)
      res.json({
        message: 'Email verified',
        user: {
          _id: result.user._id.toString(),
          name: result.user.name,
          email: result.user.email,
          image: result.user.image,
          role: result.user.role,
          accountStatus: result.user.accountStatus,
          emailVerified: result.user.emailVerified,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

// POST /auth/resend-verification — generic ack regardless of outcome.
router.post(
  '/resend-verification',
  emailDispatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = parseOr400(emailOnlyBodySchema, req.body)
      await authService.resendVerification(email)
      res.json(GENERIC_RESEND_ACK)
    } catch (err) {
      next(err)
    }
  },
)

// POST /auth/request-password-reset — generic ack.
router.post(
  '/request-password-reset',
  emailDispatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = parseOr400(emailOnlyBodySchema, req.body)
      await authService.requestPasswordReset(email)
      res.json(GENERIC_RESET_ACK)
    } catch (err) {
      next(err)
    }
  },
)

// POST /auth/reset-password — consume token, set new password, auto-login.
router.post(
  '/reset-password',
  authStrict,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = parseOr400(resetBodySchema, req.body)
      const result = await authService.resetPassword(token, newPassword)
      setAuthCookie(res, result.token)
      res.json({
        message: 'Password updated',
        user: {
          _id: result.user._id.toString(),
          name: result.user.name,
          email: result.user.email,
          image: result.user.image,
          role: result.user.role,
          accountStatus: result.user.accountStatus,
          emailVerified: result.user.emailVerified,
        },
      })
    } catch (err) {
      next(err)
    }
  },
)

export default router
