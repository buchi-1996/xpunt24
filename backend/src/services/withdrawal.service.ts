import { SocketEvent } from '@challengers-bet/shared'
import { Withdrawal, IWithdrawalDocument } from '../db/models/withdrawal.model'
import { payRamAdapter } from '../gateways/payram.adapter'
import { walletService } from './wallet.service'
import { notificationService } from './notification.service'
import { socketService } from './socket.service'

// Maps a PayRam payout status (or event_type) to terminal/intermediate transitions
// on our Withdrawal row. Idempotent: calling with the same input twice is a no-op.
class WithdrawalService {
  async applyPayoutStatus(
    withdrawal: IWithdrawalDocument,
    rawStatus: string,
    txHash?: string,
    failureReason?: string,
  ): Promise<void> {
    // Don't re-process terminal rows
    if (['COMPLETED', 'REJECTED', 'FAILED'].includes(withdrawal.status)) return

    const status = rawStatus.toLowerCase().replace(/^payout\./, '')
    const userId = withdrawal.userId.toString()

    if (status === 'sent' || status === 'processed') {
      withdrawal.status = 'COMPLETED'
      if (txHash) withdrawal.txHash = txHash
      withdrawal.processedAt = new Date()
      await withdrawal.save()

      socketService.emitToUser(userId, SocketEvent.WITHDRAWAL_PROCESSED, {
        withdrawalId: withdrawal._id.toString(),
        status: 'COMPLETED',
        txHash,
      })

      await notificationService.create(
        userId,
        'WITHDRAWAL_PROCESSED',
        'Withdrawal Sent',
        `Your withdrawal of ${withdrawal.amount.toString()} ${withdrawal.currency} has been sent on-chain.`,
        { withdrawalId: withdrawal._id.toString(), txHash },
      )
      return
    }

    if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
      const amountNum = parseFloat(withdrawal.amount.toString())
      try {
        await walletService.refundWithdrawal(userId, amountNum, withdrawal._id.toString())
      } catch (err) {
        console.error(`Refund failed for withdrawal ${withdrawal._id}:`, err)
      }
      withdrawal.status = status === 'rejected' ? 'REJECTED' : 'FAILED'
      withdrawal.rejectionReason = failureReason || status
      await withdrawal.save()

      socketService.emitToUser(userId, SocketEvent.WITHDRAWAL_PROCESSED, {
        withdrawalId: withdrawal._id.toString(),
        status: withdrawal.status,
      })
      socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })

      await notificationService.create(
        userId,
        'WITHDRAWAL_REJECTED',
        'Withdrawal Failed',
        `Your withdrawal of ${withdrawal.amount.toString()} ${withdrawal.currency} could not be processed — funds have been refunded.`,
        { withdrawalId: withdrawal._id.toString(), reason: withdrawal.rejectionReason },
      )
      return
    }

    // Intermediate (approved, initiated, pending, pending-approval) — bump from PENDING/UNDER_REVIEW to PROCESSING
    if (withdrawal.status === 'PENDING' || withdrawal.status === 'UNDER_REVIEW') {
      withdrawal.status = 'PROCESSING'
      await withdrawal.save()
    }
  }

  // Safety-net poller: reconcile PROCESSING rows whose webhook delivery was lost or delayed.
  async pollStalePayouts(): Promise<{ processed: number; updated: number }> {
    const stale = await Withdrawal.find({
      status: 'PROCESSING',
      providerReference: { $exists: true, $ne: null },
    })

    let updated = 0
    for (const w of stale) {
      try {
        const ref = w.providerReference!
        const remote = await payRamAdapter.getPayoutStatus(ref)
        const before = w.status
        await this.applyPayoutStatus(w, remote.status, remote.tx_hash, undefined)
        if (w.status !== before) updated++
      } catch (err) {
        console.error(`pollStalePayouts: failed for withdrawal ${w._id}:`, err)
      }
    }

    return { processed: stale.length, updated }
  }
}

export const withdrawalService = new WithdrawalService()
