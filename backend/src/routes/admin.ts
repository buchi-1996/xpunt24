import { Router, Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@challengers-bet/shared'
import { settlementService } from '../services/settlement.service'
import { AdminAction } from '../db/models/admin-action.model'
import { SettlementOutcome } from '../db/models/settlement.model'

const router = Router()

router.post(
  '/challenges/:id/settle',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outcome, notes } = req.body as { outcome: SettlementOutcome; notes?: string }
      const challengeId = String(req.params['id'])
      const adminId = req.user!.id

      await AdminAction.create({
        adminUserId: new Types.ObjectId(adminId),
        action: 'SETTLE_CHALLENGE',
        targetModel: 'Challenge',
        targetId: challengeId,
        reason: notes,
        ipAddress: req.ip,
      })

      await settlementService.settleChallenge(challengeId, outcome, 'ADMIN', adminId)

      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  },
)

export default router
