import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { notificationService } from '../services/notification.service'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.getUserNotifications(
      req.user!.id,
      req.query as Record<string, unknown>,
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// MUST be before /:id
router.patch('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markRead(String(req.params['id']), req.user!.id)
    res.json({ data: notification })
  } catch (err) {
    next(err)
  }
})

export default router
