import mongoose, { Types } from 'mongoose'
import {
  ChallengeStatus,
  ChallengeVisibility,
  Market,
  Pick,
  OPPOSITE_PICK_MAP,
  WagerStatus,
  SocketEvent,
} from '@challengers-bet/shared'
import { Challenge } from '../db/models/challenge.model'
import { Wager } from '../db/models/wager.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'
import { toDecimal, serializeDecimal } from '../utils/decimal'
import { paginationParams, paginatedResponse } from '../utils/paginate'
import { walletService } from './wallet.service'
import { fixtureService } from './fixture.service'
import { socketService } from './socket.service'

interface CreateChallengeBody {
  fixtureId: string
  market: Market
  pick: Pick
  stake: string | number
  currency?: string
  visibility?: ChallengeVisibility
  expiresAt?: string | Date
}

interface ListChallengesFilters {
  status?: ChallengeStatus
  leagueId?: string
  page?: number | string
}

class ChallengeService {
  async createChallenge(userId: string, body: CreateChallengeBody) {
    const { fixtureId, market, pick, stake, currency = 'USDT', visibility, expiresAt } = body

    // Validate pick is in enum
    if (!Object.values(Pick).includes(pick)) {
      throw new AppError('Invalid pick value', 400, 'INVALID_PICK')
    }

    const opponentPick = OPPOSITE_PICK_MAP[pick]
    if (!opponentPick) {
      throw new AppError(`No opposite pick defined for pick: ${pick}`, 400, 'NO_OPPOSITE_PICK')
    }

    // Validate fixture hasn't started
    const fixture = (await fixtureService.getFixtureById(fixtureId)) as {
      fixture: { status: { short: string }; date: string }
    }
    const fixtureStatus = fixture?.fixture?.status?.short ?? ''
    const started = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'FT', 'AET', 'PEN'].includes(fixtureStatus)
    if (started) throw new AppError('Fixture has already started', 400, 'FIXTURE_STARTED')

    const stakeNum = parseFloat(String(stake))
    if (stakeNum < env.MIN_STAKE) {
      throw new AppError(`Minimum stake is ${env.MIN_STAKE}`, 400, 'BELOW_MIN_STAKE')
    }
    if (env.MAX_STAKE && stakeNum > env.MAX_STAKE) {
      throw new AppError(`Maximum stake is ${env.MAX_STAKE}`, 400, 'ABOVE_MAX_STAKE')
    }

    const feePercent = env.PLATFORM_FEE_PERCENT
    const platformFee = (stakeNum * 2 * feePercent) / 100
    const potentialWin = stakeNum * 2 - platformFee

    // Pre-generate challenge ID so lockStake ledger entry references it
    const challengeId = new Types.ObjectId()

    const session = await mongoose.startSession()
    let challenge: InstanceType<typeof Challenge> | undefined

    await session.withTransaction(async () => {
      await walletService.lockStake(userId, stakeNum, challengeId.toString(), session)

      challenge = new Challenge({
        _id: challengeId,
        creatorId: new Types.ObjectId(userId),
        fixtureId,
        market,
        pick,
        opponentPick,
        stake: toDecimal(stakeNum, 'stake'),
        currency,
        potentialWin: toDecimal(potentialWin, 'potentialWin'),
        platformFee: toDecimal(platformFee, 'platformFee'),
        status: ChallengeStatus.OPEN,
        visibility: visibility ?? ChallengeVisibility.PUBLIC,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      await challenge.save({ session })
    })

    session.endSession()

    if (!challenge) throw new AppError('Failed to create challenge', 500)
    const createdChallenge = challenge

    // Create the creator's wager (PENDING until matched)
    await Wager.create({
      challengeId,
      userId: new Types.ObjectId(userId),
      pick,
      market,
      stake: toDecimal(stakeNum, 'stake'),
      currency,
      potentialPayout: toDecimal(potentialWin, 'potentialPayout'),
      status: WagerStatus.PENDING,
    })

    socketService.emitToUser(userId, SocketEvent.CHALLENGE_CREATED, serializeDecimal(createdChallenge.toObject()))
    socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })

    return serializeDecimal(createdChallenge.toObject())
  }

  async acceptChallenge(challengeId: string, opponentId: string) {
    const challenge = await Challenge.findById(challengeId)
    if (!challenge) throw new AppError('Challenge not found', 404)
    if (challenge.status !== ChallengeStatus.OPEN) {
      throw new AppError('Challenge is no longer open', 400, 'NOT_OPEN')
    }
    if (challenge.creatorId.toString() === opponentId) {
      throw new AppError('Cannot accept your own challenge', 400, 'SELF_ACCEPT')
    }

    const stakeNum = parseFloat(challenge.stake.toString())

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      await walletService.lockStake(opponentId, stakeNum, challengeId, session)

      await Challenge.findByIdAndUpdate(
        challengeId,
        { status: ChallengeStatus.MATCHED, opponentId: new Types.ObjectId(opponentId) },
        { session },
      )

      // Activate both wagers
      await Wager.updateMany(
        { challengeId: new Types.ObjectId(challengeId) },
        { status: WagerStatus.ACTIVE },
        { session },
      )

      // Create opponent's wager
      await Wager.create(
        [
          {
            challengeId: challenge._id,
            userId: new Types.ObjectId(opponentId),
            pick: challenge.opponentPick,
            market: challenge.market,
            stake: challenge.stake,
            currency: challenge.currency,
            potentialPayout: challenge.potentialWin,
            status: WagerStatus.ACTIVE,
          },
        ],
        { session },
      )
    })
    session.endSession()

    const updated = await Challenge.findById(challengeId).lean()

    socketService.emitToUser(challenge.creatorId.toString(), SocketEvent.CHALLENGE_MATCHED, {
      challengeId,
    })
    socketService.emitToUser(opponentId, SocketEvent.CHALLENGE_MATCHED, { challengeId })
    socketService.emitToUser(challenge.creatorId.toString(), SocketEvent.WALLET_BALANCE_UPDATED, {
      userId: challenge.creatorId.toString(),
    })
    socketService.emitToUser(opponentId, SocketEvent.WALLET_BALANCE_UPDATED, { userId: opponentId })

    return serializeDecimal(updated)
  }

  async cancelChallenge(challengeId: string, userId: string) {
    const challenge = await Challenge.findById(challengeId)
    if (!challenge) throw new AppError('Challenge not found', 404)
    if (challenge.status !== ChallengeStatus.OPEN) {
      throw new AppError('Only open challenges can be cancelled', 400, 'NOT_OPEN')
    }
    if (challenge.creatorId.toString() !== userId) {
      throw new AppError('Only the creator can cancel a challenge', 403, 'NOT_CREATOR')
    }

    const stakeNum = parseFloat(challenge.stake.toString())

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      await walletService.unlockStake(userId, stakeNum, challengeId, session)
      await Challenge.findByIdAndUpdate(
        challengeId,
        { status: ChallengeStatus.CANCELLED },
        { session },
      )
      await Wager.updateMany(
        { challengeId: new Types.ObjectId(challengeId) },
        { status: WagerStatus.CANCELLED },
        { session },
      )
    })
    session.endSession()

    socketService.emitToUser(userId, SocketEvent.CHALLENGE_CANCELLED, { challengeId })
    socketService.emitToUser(userId, SocketEvent.WALLET_BALANCE_UPDATED, { userId })
  }

  async listChallenges(filters: ListChallengesFilters) {
    const { status, leagueId } = filters
    const { skip, limit, page } = paginationParams(filters as Record<string, unknown>)

    const query: Record<string, unknown> = { visibility: ChallengeVisibility.PUBLIC }
    if (status) query['status'] = status

    // leagueId filter would require fixture data — skip for now or filter in-memory
    // For now just filter by status

    const [challenges, total] = await Promise.all([
      Challenge.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Challenge.countDocuments(query),
    ])

    return paginatedResponse(challenges.map((c) => serializeDecimal(c)), total, page, limit)
  }

  async getChallenge(id: string) {
    const challenge = await Challenge.findById(id).lean()
    if (!challenge) throw new AppError('Challenge not found', 404)
    return serializeDecimal(challenge)
  }

  async getUserChallenges(userId: string, filters: Record<string, unknown>) {
    const { skip, limit, page } = paginationParams(filters)
    const query: Record<string, unknown> = {
      $or: [
        { creatorId: new Types.ObjectId(userId) },
        { opponentId: new Types.ObjectId(userId) },
      ],
    }
    if (filters['status']) query['status'] = filters['status']

    const [challenges, total] = await Promise.all([
      Challenge.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Challenge.countDocuments(query),
    ])

    return paginatedResponse(challenges.map((c) => serializeDecimal(c)), total, page, limit)
  }
}

export const challengeService = new ChallengeService()
