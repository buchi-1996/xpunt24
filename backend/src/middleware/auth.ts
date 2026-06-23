import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { UserRole, AccountStatus } from '@challengers-bet/shared'

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

export function authenticate(req: Request, res: Response, next: NextFunction): void {
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

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    req.user = {
      id: payload['sub'] as string,
      role: payload['role'] as UserRole,
      accountStatus: payload['accountStatus'] as AccountStatus,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
