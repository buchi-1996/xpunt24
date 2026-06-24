import { Router, Request, Response, NextFunction } from 'express'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/auth'
import { walletService } from '../services/wallet.service'
import { socketService } from '../services/socket.service'
import { notificationService } from '../services/notification.service'
import { Deposit } from '../db/models/deposit.model'
import { Withdrawal } from '../db/models/withdrawal.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { User } from '../db/models/user.model'
import { toDecimal, serializeDecimal } from '../utils/decimal'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'
import { SocketEvent } from '@challengers-bet/shared'
import { payRamAdapter } from '../gateways/payram.adapter'

const router = Router()

router.get('/balance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await walletService.getBalance(req.user!.id)
    if (!wallet) {
      res.json({ data: { balance: '0', lockedBalance: '0', currency: 'USDT' } })
      return
    }
    res.json({ data: serializeDecimal(wallet.toObject()) })
  } catch (err) {
    next(err)
  }
})

router.get('/transactions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await walletService.getTransactions(req.user!.id, req.query as Record<string, unknown>)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /wallet/deposits/:id — poll deposit status
router.get('/deposits/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deposit = await Deposit.findOne({
      _id: req.params.id,
      userId: new Types.ObjectId(req.user!.id),
    })
    if (!deposit) throw new AppError('Deposit not found', 404)
    res.json({ data: serializeDecimal(deposit.toObject()) })
  } catch (err) {
    next(err)
  }
})

// POST /wallet/deposits — create PayRam deposit intent, returns TRC20 address
router.post('/deposits', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'USDT' } = req.body as { amount: number; currency?: string }
    if (!amount || amount <= 0) throw new AppError('Invalid amount', 400)
    if (amount < env.MIN_DEPOSIT) throw new AppError(`Minimum deposit is ${env.MIN_DEPOSIT} ${currency}`, 400)

    const userId = req.user!.id
    const user = await User.findById(userId).select('email').lean()
    if (!user?.email) throw new AppError('User email required for deposit', 400)

    // Create a placeholder deposit record first so we have an ID for the invoiceId
    const deposit = await Deposit.create({
      userId: new Types.ObjectId(userId),
      provider: 'PAYRAM',
      network: 'TRC20',
      address: 'pending',           // filled in after PayRam responds
      requestedAmount: toDecimal(amount, 'amount'),
      status: 'INITIATED',
      providerReference: `tmp_${new Types.ObjectId().toString()}`, // overwritten below
      requiredConfirmations: 1,
    })

    // Call PayRam — creates a payment record then assigns a TRC20 address for it
    const intent = await payRamAdapter.createDepositIntent({
      amountInUSD: Number(amount),
      customerEmail: user.email,
      customerID: userId,
      blockchainCode: 'TRX',
      expireSeconds: 3600,
    })

    // Patch the deposit with the real address and provider reference
    deposit.address = intent.address
    deposit.providerReference = intent.providerReference
    deposit.status = 'PENDING_CONFIRMATION'
    await deposit.save()

    res.status(201).json({
      data: {
        depositId: deposit._id.toString(),
        address: intent.address,
        network: 'TRC20',
        currency,
        amount: String(amount),
        expiresAt: intent.expiresAt,
        providerReference: intent.providerReference,
      },
    })
  } catch (err) {
    next(err)
  }
})

// TRC20 addresses: base58, start with T, 34 chars total.
const TRC20_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/

router.get('/withdrawals', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userObjectId = new Types.ObjectId(req.user!.id)
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20))
    const skip = (page - 1) * limit

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments({ userId: userObjectId }),
    ])

    res.json({
      data: withdrawals.map((w) => serializeDecimal(w)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
})

router.post('/withdraw', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = 'USDT', destinationAddress } = req.body as {
      amount: number
      currency?: string
      destinationAddress: string
    }
    if (!amount || amount <= 0) throw new AppError('Invalid amount', 400)
    if (!destinationAddress) throw new AppError('Destination address is required', 400)
    if (!TRC20_ADDRESS_RE.test(destinationAddress)) {
      throw new AppError('Destination must be a valid TRC20 address (starts with T, 34 chars)', 400, 'INVALID_ADDRESS')
    }
    if (amount < env.MIN_WITHDRAWAL) throw new AppError(`Minimum withdrawal is ${env.MIN_WITHDRAWAL}`, 400)

    const userId = req.user!.id
    const wallet = await WalletAccount.findOne({ userId: new Types.ObjectId(userId), currency })
    if (!wallet) throw new AppError('Wallet not found', 404)

    // Upfront balance check to avoid creating an orphan row that subsequently fails the debit.
    const availableBalance = parseFloat(wallet.balance.toString())
    if (amount > availableBalance) {
      throw new AppError(
        `Insufficient available balance (${availableBalance} ${currency})`,
        400,
        'INSUFFICIENT_BALANCE',
      )
    }

    const status = amount >= env.WITHDRAWAL_REVIEW_THRESHOLD ? 'UNDER_REVIEW' : 'PENDING'

    const withdrawal = await Withdrawal.create({
      userId: new Types.ObjectId(userId),
      walletAccountId: wallet._id,
      amount: toDecimal(amount, 'amount'),
      currency,
      status,
      destinationAddress,
    })

    if (status === 'PENDING') {
      await walletService.debitWithdrawal(userId, amount, withdrawal._id.toString())

      // Submit the payout to PayRam. If this throws synchronously, refund the user and mark FAILED
      // so they're never charged for a payout the gateway never accepted.
      try {
        const user = await User.findById(userId).select('email').lean()
        if (!user?.email) throw new AppError('User email required for payout', 400)

        const payout = await payRamAdapter.createPayout({
          amount: String(amount),
          customerEmail: user.email,
          customerID: userId,
          toAddress: destinationAddress,
          blockchainCode: 'TRX',
          currencyCode: 'USDT',
        })

        withdrawal.providerReference = String(payout.id)
        withdrawal.status = 'PROCESSING'
        await withdrawal.save()
      } catch (err) {
        await walletService.refundWithdrawal(userId, amount, withdrawal._id.toString())
        withdrawal.status = 'FAILED'
        withdrawal.rejectionReason = err instanceof Error ? err.message : 'Gateway error'
        await withdrawal.save()
        socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })
        throw err
      }

      socketService.emitToUser(userId, SocketEvent.WITHDRAWAL_PROCESSED, {
        withdrawalId: withdrawal._id.toString(),
        amount: String(amount),
        currency,
      })
      socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })
      await notificationService.create(
        userId,
        'WITHDRAWAL_PROCESSED',
        'Withdrawal Processed',
        `Your withdrawal of ${amount} ${currency} has been submitted to the network.`,
        { withdrawalId: withdrawal._id.toString() },
      )
    }

    res.status(201).json({ data: serializeDecimal(withdrawal.toObject()) })
  } catch (err) {
    next(err)
  }
})

export default router
