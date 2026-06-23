import { Router, Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/auth'
import { User } from '../db/models/user.model'
import { UserStats } from '../db/models/user-stats.model'
import { UserSettings } from '../db/models/user-settings.model'
import { Follow } from '../db/models/follow.model'
import { serializeDecimal } from '../utils/decimal'
import { AppError } from '../utils/AppError'

const router = Router()

router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, image } = req.body as { name?: string; image?: string }
    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      { ...(name && { name }), ...(image && { image }) },
      { new: true },
    ).lean()
    if (!updated) throw new AppError('User not found', 404)
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
})

// MUST be before /:id
router.get('/me/settings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = new Types.ObjectId(req.user!.id)
    const existing = await UserSettings.findOne({ userId }).lean()
    if (existing) {
      res.json({ data: existing })
      return
    }
    const created = await UserSettings.create({ userId })
    res.json({ data: created.toObject() })
  } catch (err) {
    next(err)
  }
})

router.patch('/me/settings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await UserSettings.findOneAndUpdate(
      { userId: new Types.ObjectId(req.user!.id) },
      { $set: req.body as Record<string, unknown> },
      { new: true, upsert: true },
    ).lean()
    res.json({ data: updated })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(String(req.params['id'])).lean()
    if (!user) throw new AppError('User not found', 404)
    res.json({ data: user })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await UserStats.findOne({
      userId: new Types.ObjectId(String(req.params['id'])),
    }).lean()
    if (!stats) throw new AppError('Stats not found', 404)
    res.json({ data: serializeDecimal(stats) })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const followingId = String(req.params['id'])
    if (followingId === req.user!.id) {
      throw new AppError('Cannot follow yourself', 400)
    }
    const follow = await Follow.create({
      followerId: new Types.ObjectId(req.user!.id),
      followingId: new Types.ObjectId(followingId),
    })
    res.status(201).json({ data: follow })
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'Already following' })
      return
    }
    next(err)
  }
})

router.delete('/:id/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Follow.findOneAndDelete({
      followerId: new Types.ObjectId(req.user!.id),
      followingId: new Types.ObjectId(String(req.params['id'])),
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
