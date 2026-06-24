import mongoose, { ClientSession, Types } from 'mongoose'
import { LedgerEntryType } from '@challengers-bet/shared'
import { WalletAccount, IWalletAccountDocument } from '../db/models/wallet-account.model'
import { LedgerEntry } from '../db/models/ledger-entry.model'
import { AppError } from '../utils/AppError'
import { toDecimal, serializeDecimal } from '../utils/decimal'
import { paginationParams, paginatedResponse } from '../utils/paginate'

const DEFAULT_CURRENCY = 'USDT'

async function getOrCreateWallet(
  userId: string,
  currency: string,
  session?: ClientSession,
): Promise<IWalletAccountDocument> {
  let wallet = await WalletAccount.findOne({ userId, currency }).session(session ?? null)
  if (!wallet) {
    const created = await WalletAccount.create(
      [{ userId: new Types.ObjectId(userId), currency, balance: '0', lockedBalance: '0' }],
      { session },
    )
    wallet = created[0]
  }
  return wallet
}

async function createLedgerEntry(
  wallet: IWalletAccountDocument,
  type: LedgerEntryType,
  amount: Types.Decimal128,
  balanceBefore: Types.Decimal128,
  balanceAfter: Types.Decimal128,
  sourceId: string,
  sourceModel: string,
  description?: string,
  session?: ClientSession,
): Promise<void> {
  await LedgerEntry.create(
    [
      {
        walletAccountId: wallet._id,
        userId: wallet.userId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        sourceId,
        sourceModel,
        description,
      },
    ],
    { session },
  )
}

class WalletService {
  async lockStake(
    userId: string,
    amount: string | number,
    challengeId: string,
    session?: ClientSession,
  ): Promise<void> {
    const amountDecimal = toDecimal(amount, 'amount')
    const amountNum = parseFloat(String(amount))

    const wallet = await WalletAccount.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        currency: DEFAULT_CURRENCY,
        $expr: { $gte: [{ $toDouble: '$balance' }, amountNum] },
      },
      {
        $inc: {
          balance: Types.Decimal128.fromString(String(-amountNum)),
          lockedBalance: amountDecimal,
        },
      },
      { new: false, session },
    )

    if (!wallet) {
      // Check if wallet exists at all or insufficient funds
      const existing = await WalletAccount.findOne({
        userId: new Types.ObjectId(userId),
        currency: DEFAULT_CURRENCY,
      }).session(session ?? null)
      if (!existing) throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND')
      throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE')
    }

    const balanceBefore = wallet.balance
    const balanceAfter = Types.Decimal128.fromString(
      String(parseFloat(wallet.balance.toString()) - amountNum),
    )

    const sourceId = `${challengeId}:${LedgerEntryType.WAGER_STAKE}`
    try {
      await createLedgerEntry(
        wallet,
        LedgerEntryType.WAGER_STAKE,
        amountDecimal,
        balanceBefore,
        balanceAfter,
        sourceId,
        'Challenge',
        `Stake locked for challenge ${challengeId}`,
        session,
      )
    } catch (err: unknown) {
      // Idempotency: duplicate key = already processed
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  async unlockStake(
    userId: string,
    amount: string | number,
    challengeId: string,
    session?: ClientSession,
  ): Promise<void> {
    const amountDecimal = toDecimal(amount, 'amount')
    const amountNum = parseFloat(String(amount))

    const wallet = await WalletAccount.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        currency: DEFAULT_CURRENCY,
        $expr: { $gte: [{ $toDouble: '$lockedBalance' }, amountNum] },
      },
      {
        $inc: {
          balance: amountDecimal,
          lockedBalance: Types.Decimal128.fromString(String(-amountNum)),
        },
      },
      { new: false, session },
    )

    if (!wallet) throw new AppError('Failed to unlock stake', 400, 'UNLOCK_FAILED')

    const balanceBefore = wallet.balance
    const balanceAfter = Types.Decimal128.fromString(
      String(parseFloat(wallet.balance.toString()) + amountNum),
    )

    const sourceId = `${challengeId}:${LedgerEntryType.WAGER_REFUND}`
    try {
      await createLedgerEntry(
        wallet,
        LedgerEntryType.WAGER_REFUND,
        amountDecimal,
        balanceBefore,
        balanceAfter,
        sourceId,
        'Challenge',
        `Stake refunded for challenge ${challengeId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  async settleWager(
    winnerId: string,
    loserId: string,
    stake: string | number,
    feePercent: number,
    challengeId: string,
    session?: ClientSession,
  ): Promise<void> {
    const stakeNum = parseFloat(String(stake))
    const feeNum = (stakeNum * feePercent) / 100
    const winnerPayout = stakeNum * 2 - feeNum

    // Winner: lockedBalance↓, balance += payout
    const winnerWallet = await WalletAccount.findOneAndUpdate(
      {
        userId: new Types.ObjectId(winnerId),
        currency: DEFAULT_CURRENCY,
        $expr: { $gte: [{ $toDouble: '$lockedBalance' }, stakeNum] },
      },
      {
        $inc: {
          lockedBalance: Types.Decimal128.fromString(String(-stakeNum)),
          balance: Types.Decimal128.fromString(String(winnerPayout)),
        },
      },
      { new: false, session },
    )
    if (!winnerWallet) throw new AppError('Failed to settle winner wallet', 400, 'SETTLE_FAILED')

    const winnerBalanceBefore = winnerWallet.balance
    const winnerBalanceAfter = Types.Decimal128.fromString(
      String(parseFloat(winnerWallet.balance.toString()) + winnerPayout),
    )

    const winSourceId = `${challengeId}:${LedgerEntryType.WAGER_WIN}`
    try {
      await createLedgerEntry(
        winnerWallet,
        LedgerEntryType.WAGER_WIN,
        Types.Decimal128.fromString(String(winnerPayout)),
        winnerBalanceBefore,
        winnerBalanceAfter,
        winSourceId,
        'Challenge',
        `Wager won for challenge ${challengeId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }

    // Loser: lockedBalance↓ (funds released to platform)
    const loserWallet = await WalletAccount.findOneAndUpdate(
      {
        userId: new Types.ObjectId(loserId),
        currency: DEFAULT_CURRENCY,
        $expr: { $gte: [{ $toDouble: '$lockedBalance' }, stakeNum] },
      },
      {
        $inc: {
          lockedBalance: Types.Decimal128.fromString(String(-stakeNum)),
        },
      },
      { new: false, session },
    )
    if (!loserWallet) throw new AppError('Failed to settle loser wallet', 400, 'SETTLE_FAILED')

    const feeSourceId = `${challengeId}:${LedgerEntryType.PLATFORM_FEE}`
    try {
      await createLedgerEntry(
        loserWallet,
        LedgerEntryType.PLATFORM_FEE,
        Types.Decimal128.fromString(String(feeNum)),
        loserWallet.balance,
        loserWallet.balance,
        feeSourceId,
        'Challenge',
        `Platform fee for challenge ${challengeId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  async creditDeposit(
    userId: string,
    amount: string | number,
    depositId: string,
    session?: ClientSession,
  ): Promise<void> {
    const amountDecimal = toDecimal(amount, 'amount')
    const amountNum = parseFloat(String(amount))

    const wallet = await getOrCreateWallet(userId, DEFAULT_CURRENCY, session)

    const updated = await WalletAccount.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amountDecimal } },
      { new: false, session },
    )
    if (!updated) throw new AppError('Wallet not found', 404)

    const balanceBefore = updated.balance
    const balanceAfter = Types.Decimal128.fromString(
      String(parseFloat(updated.balance.toString()) + amountNum),
    )

    const sourceId = `${depositId}:${LedgerEntryType.DEPOSIT}`
    try {
      await createLedgerEntry(
        updated,
        LedgerEntryType.DEPOSIT,
        amountDecimal,
        balanceBefore,
        balanceAfter,
        sourceId,
        'Deposit',
        `Deposit confirmed: ${depositId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  async debitWithdrawal(
    userId: string,
    amount: string | number,
    withdrawalId: string,
    session?: ClientSession,
  ): Promise<void> {
    const amountDecimal = toDecimal(amount, 'amount')
    const amountNum = parseFloat(String(amount))

    const wallet = await WalletAccount.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        currency: DEFAULT_CURRENCY,
        $expr: { $gte: [{ $toDouble: '$balance' }, amountNum] },
      },
      { $inc: { balance: Types.Decimal128.fromString(String(-amountNum)) } },
      { new: false, session },
    )
    if (!wallet) throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE')

    const balanceBefore = wallet.balance
    const balanceAfter = Types.Decimal128.fromString(
      String(parseFloat(wallet.balance.toString()) - amountNum),
    )

    const sourceId = `${withdrawalId}:${LedgerEntryType.WITHDRAWAL}`
    try {
      await createLedgerEntry(
        wallet,
        LedgerEntryType.WITHDRAWAL,
        amountDecimal,
        balanceBefore,
        balanceAfter,
        sourceId,
        'Withdrawal',
        `Withdrawal: ${withdrawalId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  // Reverses a withdrawal — credits the funds back and records a WITHDRAWAL_REVERSAL ledger entry.
  // Used when a gateway payout fails, when an admin rejects an UNDER_REVIEW row, or for cleanup.
  async refundWithdrawal(
    userId: string,
    amount: string | number,
    withdrawalId: string,
    session?: ClientSession,
  ): Promise<void> {
    const amountDecimal = toDecimal(amount, 'amount')
    const amountNum = parseFloat(String(amount))

    const wallet = await getOrCreateWallet(userId, DEFAULT_CURRENCY, session)
    const updated = await WalletAccount.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amountDecimal } },
      { new: false, session },
    )
    if (!updated) throw new AppError('Wallet not found', 404)

    const balanceBefore = updated.balance
    const balanceAfter = Types.Decimal128.fromString(
      String(parseFloat(updated.balance.toString()) + amountNum),
    )

    const sourceId = `${withdrawalId}:${LedgerEntryType.WITHDRAWAL_REVERSAL}`
    try {
      await createLedgerEntry(
        updated,
        LedgerEntryType.WITHDRAWAL_REVERSAL,
        amountDecimal,
        balanceBefore,
        balanceAfter,
        sourceId,
        'Withdrawal',
        `Withdrawal refund: ${withdrawalId}`,
        session,
      )
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return
      throw err
    }
  }

  async getBalance(userId: string): Promise<IWalletAccountDocument | null> {
    return WalletAccount.findOne({ userId: new Types.ObjectId(userId), currency: DEFAULT_CURRENCY })
  }

  async getTransactions(
    userId: string,
    query: Record<string, unknown>,
  ): Promise<ReturnType<typeof paginatedResponse>> {
    const { skip, limit, page } = paginationParams(query)
    const userObjectId = new Types.ObjectId(userId)

    const [entries, total] = await Promise.all([
      LedgerEntry.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LedgerEntry.countDocuments({ userId: userObjectId }),
    ])

    return paginatedResponse(entries.map((e) => serializeDecimal(e)), total, page, limit)
  }
}

export const walletService = new WalletService()
