import { Router, Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { UserRole } from '@challengers-bet/shared'
import { settlementService } from '../services/settlement.service'
import { walletService } from '../services/wallet.service'
import { socketService } from '../services/socket.service'
import { notificationService } from '../services/notification.service'
import { AdminAction } from '../db/models/admin-action.model'
import { Withdrawal } from '../db/models/withdrawal.model'
import { SettlementOutcome } from '../db/models/settlement.model'
import { AppError } from '../utils/AppError'
import { SocketEvent } from '@challengers-bet/shared'

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

// POST /admin/withdrawals/:id/refund
// Admin refunds a stuck or rejected withdrawal. Credits the user, marks REJECTED,
// audits the action. Used both for ongoing operator interventions and one-shot cleanup
// of pre-PayRam-integration legacy rows.
router.post(
  '/withdrawals/:id/refund',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body as { reason?: string }
      const withdrawalId = String(req.params['id'])
      const adminId = req.user!.id

      const withdrawal = await Withdrawal.findById(withdrawalId)
      if (!withdrawal) throw new AppError('Withdrawal not found', 404)
      if (['COMPLETED', 'REJECTED'].includes(withdrawal.status)) {
        throw new AppError(`Withdrawal already ${withdrawal.status}`, 400, 'ALREADY_TERMINAL')
      }

      await AdminAction.create({
        adminUserId: new Types.ObjectId(adminId),
        action: 'REFUND_WITHDRAWAL',
        targetModel: 'Withdrawal',
        targetId: withdrawalId,
        reason,
        ipAddress: req.ip,
      })

      const userId = withdrawal.userId.toString()
      const amount = parseFloat(withdrawal.amount.toString())

      // Only refund if funds were actually debited. UNDER_REVIEW rows haven't been debited yet.
      if (withdrawal.status !== 'UNDER_REVIEW') {
        await walletService.refundWithdrawal(userId, amount, withdrawalId)
      }

      withdrawal.status = 'REJECTED'
      withdrawal.rejectionReason = reason ?? 'Manually refunded by admin'
      withdrawal.reviewedBy = new Types.ObjectId(adminId)
      withdrawal.reviewedAt = new Date()
      await withdrawal.save()

      socketService.emitToUser(userId, SocketEvent.WITHDRAWAL_PROCESSED, {
        withdrawalId,
        status: 'REJECTED',
      })
      socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })

      await notificationService.create(
        userId,
        'WITHDRAWAL_REJECTED',
        'Withdrawal Refunded',
        `Your withdrawal of ${amount} ${withdrawal.currency} has been refunded to your wallet.`,
        { withdrawalId, reason },
      )

      res.json({ success: true, data: { withdrawalId, refundedAmount: amount } })
    } catch (err) {
      next(err)
    }
  },
)

export default router
