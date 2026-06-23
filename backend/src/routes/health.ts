import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState
  // 1 = connected, 2 = connecting
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'

  res.json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  })
})

export default router
