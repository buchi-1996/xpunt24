import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { UserRole, AccountStatus } from '@challengers-bet/shared'
import { User } from '../db/models/user.model'

export interface AuthPayload {
  id: string
  role: UserRole
  accountStatus: AccountStatus
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let token: string | undefined

  // Prefer httpOnly cookie, fall back to Authorization header
  if (req.cookies?.auth_token) {
    token = req.cookies.auth_token as string
  } else {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const userId = payload['sub'] as string | undefined
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  // Session-invalidation check. If `sessionsValidFrom` has been bumped (manual sign-out-
  // everywhere, password reset, admin suspend) any JWT issued before that timestamp is
  // rejected. This is what makes logout "global" and password reset session-invalidating.
  try {
    const user = await User.findById(userId)
      .select('sessionsValidFrom accountStatus role')
      .lean()
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    if (user.sessionsValidFrom && typeof payload.iat === 'number') {
      // payload.iat is seconds-since-epoch; sessionsValidFrom is a Date.
      if (payload.iat * 1000 < user.sessionsValidFrom.getTime()) {
        res.status(401).json({ error: 'Session has been invalidated', code: 'SESSION_INVALIDATED' })
        return
      }
    }

    // Reject inactive accounts immediately, even with an otherwise-valid JWT — so an admin
    // ban/suspend/close takes effect on the next request without waiting for token expiry.
    if (
      user.accountStatus === AccountStatus.BANNED ||
      user.accountStatus === AccountStatus.CLOSED ||
      user.accountStatus === AccountStatus.SUSPENDED
    ) {
      res.status(403).json({ error: 'Account is not active', code: 'ACCOUNT_INACTIVE' })
      return
    }

    req.user = {
      id: userId,
      // Prefer fresh DB values over the JWT payload — keeps role/status changes immediate.
      role: user.role,
      accountStatus: user.accountStatus,
    }
    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Blocks the request when the authenticated user hasn't verified their email yet.
 * Mount AFTER `authenticate`. Use on money-touching routes (create/accept challenge,
 * deposit, withdraw). Read-only routes (e.g. /auth/me) stay open so the UI can show
 * the "please verify" banner.
 */
export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const user = await User.findById(req.user.id).select('emailVerified').lean()
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (!user.emailVerified) {
      res
        .status(403)
        .json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' })
      return
    }
    next()
  } catch (err) {
    next(err)
  }
}
