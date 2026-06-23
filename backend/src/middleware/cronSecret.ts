import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

export function verifyCronSecret(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const secret = authHeader.slice(7)
  if (secret !== env.CRON_SECRET) {
    res.status(401).json({ error: 'Invalid cron secret' })
    return
  }
  next()
}
