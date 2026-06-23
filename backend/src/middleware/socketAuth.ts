import { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { UserRole, AccountStatus } from '@challengers-bet/shared'

// Extend Socket.IO's SocketData interface
declare module 'socket.io' {
  interface SocketData {
    userId: string
    role: UserRole
    accountStatus: AccountStatus
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((parts) => parts.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())]),
  )
}

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  try {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const cookies = parseCookies(cookieHeader)
    const token = cookies['auth_token']

    if (!token) {
      next(new Error('Unauthorized'))
      return
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    socket.data.userId = payload['sub'] as string
    socket.data.role = payload['role'] as UserRole
    socket.data.accountStatus = payload['accountStatus'] as AccountStatus
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
}
