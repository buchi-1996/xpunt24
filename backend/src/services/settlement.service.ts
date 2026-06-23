import mongoose, { Types } from 'mongoose'
import { Market, Pick, ChallengeStatus, WagerStatus, WagerResult, SocketEvent } from '@challengers-bet/shared'
import { Challenge } from '../db/models/challenge.model'
import { Wager } from '../db/models/wager.model'
import { Settlement, SettlementOutcome } from '../db/models/settlement.model'
import { UserStats } from '../db/models/user-stats.model'
import { AppError } from '../utils/AppError'
import { serializeDecimal } from '../utils/decimal'
import { walletService } from './wallet.service'
import { fixtureService } from './fixture.service'
import { notificationService } from './notification.service'
import { socketService } from './socket.service'
import { env } from '../config/env'

/**
 * Determines if the given pick wins based on match scores.
 */
export function determineOutcome(
  market: Market,
  pick: Pick,
  homeScore: number,
  awayScore: number,
): boolean {
  const total = homeScore + awayScore

  switch (market) {
    case Market.MATCH_WINNER:
      if (pick === Pick.HOME) return homeScore > awayScore
      if (pick === Pick.AWAY) return awayScore > homeScore
      if (pick === Pick.DRAW) return homeScore === awayScore
      return false

    case Market.BOTH_TEAMS_TO_SCORE:
      if (pick === Pick.YES) return homeScore > 0 && awayScore > 0
      if (pick === Pick.NO) return !(homeScore > 0 && awayScore > 0)
      return false

    case Market.OVER_UNDER:
      if (pick === Pick.OVER) return total > 2.5
      if (pick === Pick.UNDER) return total <= 2.5
      return false

    case Market.DOUBLE_CHANCE:
      if (pick === Pick.HOME) return homeScore >= awayScore
      if (pick === Pick.AWAY) return awayScore >= homeScore
      return false

    default:
      return false
  }
}

class SettlementService {
  async settleChallenge(
    challengeId: string,
    outcome: SettlementOutcome,
    settledBy: 'AUTO' | 'ADMIN',
    adminId?: string,
  ) {
    const challenge = await Challenge.findById(challengeId)
    if (!challenge) throw new AppError('Challenge not found', 404)
    if (challenge.status !== ChallengeStatus.MATCHED) {
      throw new AppError('Challenge is not in MATCHED state', 400, 'NOT_MATCHED')
    }
    if (!challenge.opponentId) throw new AppError('Challenge has no opponent', 400)

    const fixture = await fixtureService.getCompletedFixture(challenge.fixtureId)
    const { homeScore, awayScore } = fixture

    // Determine winner by checking creator's pick
    const creatorWins = determineOutcome(challenge.market, challenge.pick, homeScore, awayScore)
    const winnerId = creatorWins
      ? challenge.creatorId.toString()
      : challenge.opponentId.toString()
    const loserId = creatorWins
      ? challenge.opponentId.toString()
      : challenge.creatorId.toString()

    const stakeNum = parseFloat(challenge.stake.toString())

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      // Settle wallet
      await walletService.settleWager(
        winnerId,
        loserId,
        stakeNum,
        env.PLATFORM_FEE_PERCENT,
        challengeId,
        session,
      )

      // Create settlement record
      await Settlement.create(
        [
          {
            challengeId: challenge._id,
            fixtureId: challenge.fixtureId,
            outcome,
            settledBy,
            adminUserId: adminId ? new Types.ObjectId(adminId) : undefined,
            totalPaidOut: challenge.potentialWin,
            currency: challenge.currency,
          },
        ],
        { session },
      )

      // Update challenge
      await Challenge.findByIdAndUpdate(
        challengeId,
        {
          status: ChallengeStatus.SETTLED,
          settledAt: new Date(),
          winnerUserId: new Types.ObjectId(winnerId),
        },
        { session },
      )

      // Update wagers
      await Wager.updateMany(
        { challengeId: challenge._id, userId: new Types.ObjectId(winnerId) },
        { status: WagerStatus.WON, result: WagerResult.WIN, settledAt: new Date() },
        { session },
      )
      await Wager.updateMany(
        { challengeId: challenge._id, userId: new Types.ObjectId(loserId) },
        { status: WagerStatus.LOST, result: WagerResult.LOSS, settledAt: new Date() },
        { session },
      )
    })
    session.endSession()

    // Update UserStats (outside transaction — non-critical)
    await this.updateUserStats(winnerId, true)
    await this.updateUserStats(loserId, false)

    // Notifications
    await notificationService.create(
      winnerId,
      'CHALLENGE_SETTLED',
      'Challenge Settled — You Won!',
      `You won your challenge. ${challenge.potentialWin} ${challenge.currency} has been credited.`,
      { challengeId },
    )
    await notificationService.create(
      loserId,
      'CHALLENGE_SETTLED',
      'Challenge Settled',
      'Your challenge has been settled. Better luck next time!',
      { challengeId },
    )

    // Socket events
    socketService.emitToUser(winnerId, SocketEvent.CHALLENGE_SETTLED, { challengeId, result: 'WIN' })
    socketService.emitToUser(loserId, SocketEvent.CHALLENGE_SETTLED, { challengeId, result: 'LOSS' })
    socketService.emitToUser(winnerId, SocketEvent.WALLET_BALANCE_UPDATED, { userId: winnerId })
    socketService.emitToUser(loserId, SocketEvent.WALLET_BALANCE_UPDATED, { userId: loserId })
  }

  async processCompletedMatches() {
    const matchedChallenges = await Challenge.find({ status: ChallengeStatus.MATCHED })
    let settled = 0

    for (const challenge of matchedChallenges) {
      try {
        await fixtureService.getCompletedFixture(challenge.fixtureId)
        // Fixture is completed — settle it
        await this.settleChallenge(challenge._id.toString(), 'HOME_WIN', 'AUTO')
        settled++
      } catch {
        // Fixture not finished yet — skip
      }
    }

    return { processed: matchedChallenges.length, settled }
  }

  async expireOpenChallenges() {
    const now = new Date()
    const expiredChallenges = await Challenge.find({
      status: ChallengeStatus.OPEN,
      expiresAt: { $lte: now },
    })

    let expired = 0
    for (const challenge of expiredChallenges) {
      try {
        const stakeNum = parseFloat(challenge.stake.toString())
        const session = await mongoose.startSession()
        await session.withTransaction(async () => {
          await walletService.unlockStake(
            challenge.creatorId.toString(),
            stakeNum,
            challenge._id.toString(),
            session,
          )
          await Challenge.findByIdAndUpdate(
            challenge._id,
            { status: ChallengeStatus.EXPIRED },
            { session },
          )
          await Wager.updateMany(
            { challengeId: challenge._id },
            { status: WagerStatus.CANCELLED },
            { session },
          )
        })
        session.endSession()

        socketService.emitToUser(
          challenge.creatorId.toString(),
          SocketEvent.CHALLENGE_CANCELLED,
          { challengeId: challenge._id.toString() },
        )
        socketService.emitToUser(challenge.creatorId.toString(), SocketEvent.WALLET_BALANCE_UPDATED, {
          userId: challenge.creatorId.toString(),
        })

        expired++
      } catch (err) {
        console.error(`Failed to expire challenge ${challenge._id}:`, err)
      }
    }

    return { processed: expiredChallenges.length, expired }
  }

  private async updateUserStats(userId: string, won: boolean) {
    const userObjectId = new Types.ObjectId(userId)
    let stats = await UserStats.findOne({ userId: userObjectId })
    if (!stats) {
      stats = await UserStats.create({ userId: userObjectId })
    }

    const totalWagers = stats.totalWagers + 1
    const wonWagers = stats.wonWagers + (won ? 1 : 0)
    const lostWagers = stats.lostWagers + (won ? 0 : 1)
    const winRate = totalWagers > 0 ? (wonWagers / totalWagers) * 100 : 0

    let currentStreak = stats.currentStreak
    if (won) {
      currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1
    } else {
      currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1
    }

    const longestWinStreak =
      currentStreak > 0
        ? Math.max(stats.longestWinStreak, currentStreak)
        : stats.longestWinStreak
    const longestLossStreak =
      currentStreak < 0
        ? Math.max(stats.longestLossStreak, Math.abs(currentStreak))
        : stats.longestLossStreak

    await UserStats.findByIdAndUpdate(stats._id, {
      totalWagers,
      wonWagers,
      lostWagers,
      winRate,
      currentStreak,
      longestWinStreak,
      longestLossStreak,
    })
  }
}

export const settlementService = new SettlementService()
