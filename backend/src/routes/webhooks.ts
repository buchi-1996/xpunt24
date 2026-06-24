import { Router, Request, Response, NextFunction } from 'express'
import { Deposit } from '../db/models/deposit.model'
import { Withdrawal } from '../db/models/withdrawal.model'
import { walletService } from '../services/wallet.service'
import { socketService } from '../services/socket.service'
import { notificationService } from '../services/notification.service'
import {
  payRamAdapter,
  PayRamPayoutWebhookPayload,
  PayRamWebhookPayload,
} from '../gateways/payram.adapter'
import { toDecimal } from '../utils/decimal'
import { SocketEvent } from '@challengers-bet/shared'

const router = Router()

// POST /webhooks/crypto/payram
// Called by the PayRam server when a payment status changes.
router.post('/crypto/payram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verify the request is genuinely from PayRam (HMAC-SHA256 of body, keyed by API key)
    const signature = req.headers['x-payram-signature'] as string | undefined
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody || !payRamAdapter.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid webhook signature' })
      return
    }

    const payload = req.body as PayRamWebhookPayload

    if (!payload.reference_id || !payload.status) {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }

    // 2. Find the deposit by providerReference
    const deposit = await Deposit.findOne({ providerReference: payload.reference_id })

    if (!deposit) {
      // Unknown reference — acknowledge so PayRam doesn't retry forever
      res.json({ received: true })
      return
    }

    // 3. Idempotency — if already credited, do nothing
    if (deposit.status === 'CREDITED') {
      res.json({ received: true })
      return
    }

    // 4. Store raw webhook payload for audit
    deposit.webhookPayload = payload as unknown as Record<string, unknown>

    const userId = deposit.userId.toString()

    if (payload.status === 'FILLED' || payload.status === 'OVER_FILLED') {
      const receivedAmount = parseFloat(payload.filled_amount ?? payload.amount)

      // Update deposit to CONFIRMED then CREDITED atomically
      deposit.status = 'CONFIRMED'
      deposit.receivedAmount = toDecimal(receivedAmount, 'receivedAmount')
      if (payload.tx_hash) deposit.txHash = payload.tx_hash
      await deposit.save()

      // Credit the wallet — using requested amount to avoid overpay confusion
      const creditAmount = parseFloat(deposit.requestedAmount.toString())
      await walletService.creditDeposit(userId, creditAmount, deposit._id.toString())

      deposit.status = 'CREDITED'
      await deposit.save()

      // Notify user in real time
      socketService.emitToUser(userId, SocketEvent.DEPOSIT_UPDATED, {
        depositId: deposit._id.toString(),
        status: 'CREDITED',
        amount: String(creditAmount),
      })
      socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })

      await notificationService.create(
        userId,
        'DEPOSIT_CONFIRMED',
        'Deposit Confirmed',
        `Your deposit of ${creditAmount} USDT has been confirmed and credited to your wallet.`,
        { depositId: deposit._id.toString() },
      )
    } else if (payload.status === 'EXPIRED' || payload.status === 'FAILED') {
      deposit.status = payload.status === 'EXPIRED' ? 'EXPIRED' : 'FAILED'
      await deposit.save()

      socketService.emitToUser(userId, SocketEvent.DEPOSIT_UPDATED, {
        depositId: deposit._id.toString(),
        status: deposit.status,
      })
    } else {
      // VERIFYING / PARTIALLY_FILLED — update status to PENDING_CONFIRMATION
      deposit.status = 'PENDING_CONFIRMATION'
      await deposit.save()

      socketService.emitToUser(userId, SocketEvent.DEPOSIT_UPDATED, {
        depositId: deposit._id.toString(),
        status: 'PENDING_CONFIRMATION',
      })
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

// POST /webhooks/payout/payram
// PayRam pushes payout lifecycle events here. event_type follows "payout.<status>".
router.post('/payout/payram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-payram-signature'] as string | undefined
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (!rawBody || !payRamAdapter.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid webhook signature' })
      return
    }

    const payload = req.body as PayRamPayoutWebhookPayload
    if (!payload.payout_id || !payload.event_type) {
      res.status(400).json({ error: 'Invalid payload' })
      return
    }

    const withdrawal = await Withdrawal.findOne({ providerReference: String(payload.payout_id) })
    if (!withdrawal) {
      // Unknown payout — ack so PayRam doesn't keep retrying
      res.json({ received: true })
      return
    }

    // Idempotency — terminal states never re-process
    if (['COMPLETED', 'REJECTED', 'FAILED'].includes(withdrawal.status)) {
      res.json({ received: true })
      return
    }

    const userId = withdrawal.userId.toString()
    const status = (payload.status ?? '').toLowerCase()
    const event = payload.event_type.toLowerCase()

    // Terminal success — funds confirmed on chain
    if (event === 'payout.sent' || event === 'payout.processed' || status === 'sent' || status === 'processed') {
      withdrawal.status = 'COMPLETED'
      if (payload.tx_hash) withdrawal.txHash = payload.tx_hash
      withdrawal.processedAt = new Date()
      await withdrawal.save()

      socketService.emitToUser(userId, SocketEvent.WITHDRAWAL_PROCESSED, {
        withdrawalId: withdrawal._id.toString(),
        status: 'COMPLETED',
        txHash: payload.tx_hash,
      })

      await notificationService.create(
        userId,
        'WITHDRAWAL_PROCESSED',
        'Withdrawal Sent',
        `Your withdrawal of ${withdrawal.amount.toString()} ${withdrawal.currency} has been sent on-chain.`,
        { withdrawalId: withdrawal._id.toString(), txHash: payload.tx_hash },
      )
    }
    // Terminal failure — refund user and mark failed/rejected
    else if (
      event === 'payout.failed' ||
      event === 'payout.rejected' ||
      event === 'payout.cancelled' ||
      ['failed', 'rejected', 'cancelled'].includes(status)
    ) {
      const amountNum = parseFloat(withdrawal.amount.toString())
      try {
        await walletService.refundWithdrawal(userId, amountNum, withdrawal._id.toString())
      } catch (refundErr) {
        console.error(`Failed to refund withdrawal ${withdrawal._id}:`, refundErr)
      }
      withdrawal.status = status === 'rejected' ? 'REJECTED' : 'FAILED'
      withdrawal.rejectionReason = payload.failure_reason || event
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
    }
    // Intermediate states — bump status to PROCESSING if we're still in flight
    else if (withdrawal.status === 'PENDING' || withdrawal.status === 'UNDER_REVIEW') {
      withdrawal.status = 'PROCESSING'
      await withdrawal.save()
    }

    res.json({ received: true })
  } catch (err) {
    next(err)
  }
})

export default router
