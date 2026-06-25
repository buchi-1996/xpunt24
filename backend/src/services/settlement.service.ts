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

interface FixtureResult {
  homeScore: number
  awayScore: number
  halftimeHome: number
  halftimeAway: number
}

/**
 * Determines if the given pick wins based on match scores.
 * marketParam carries threshold (e.g. "2.5") for OVER_UNDER variants.
 */
export function determineOutcome(
  market: Market,
  pick: Pick,
  fixture: FixtureResult,
  marketParam?: string,
): boolean {
  const { homeScore, awayScore, halftimeHome, halftimeAway } = fixture
  const total = homeScore + awayScore
  const ht1H = halftimeHome
  const ht1A = halftimeAway
  const sh2H = homeScore - halftimeHome
  const sh2A = awayScore - halftimeAway
  const total1H = ht1H + ht1A
  const threshold = marketParam ? parseFloat(marketParam) : 2.5

  const winnerOutcome = (h: number, a: number): boolean => {
    if (pick === Pick.HOME) return h > a
    if (pick === Pick.AWAY) return a > h
    if (pick === Pick.DRAW) return h === a
    if (pick === Pick.DOUBLE_CHANCE) return h !== a // "no draw" counter-side
    return false
  }

  const dcOutcome = (h: number, a: number): boolean => {
    if (pick === Pick.HOME) return h >= a // 1X
    if (pick === Pick.AWAY) return a >= h // X2
    return false
  }

  const bttsOutcome = (h: number, a: number): boolean => {
    if (pick === Pick.YES) return h > 0 && a > 0
    if (pick === Pick.NO) return !(h > 0 && a > 0)
    return false
  }

  const overUnderOutcome = (t: number): boolean => {
    if (pick === Pick.OVER) return t > threshold
    if (pick === Pick.UNDER) return t < threshold
    return false
  }

  switch (market) {
    case Market.MATCH_WINNER:
      return winnerOutcome(homeScore, awayScore)
    case Market.DOUBLE_CHANCE:
      return dcOutcome(homeScore, awayScore)
    case Market.BOTH_TEAMS_TO_SCORE:
      return bttsOutcome(homeScore, awayScore)
    case Market.OVER_UNDER:
      return overUnderOutcome(total)
    case Market.FIRST_HALF_WINNER:
      return winnerOutcome(ht1H, ht1A)
    case Market.FIRST_HALF_BOTH_TEAMS_TO_SCORE:
      return bttsOutcome(ht1H, ht1A)
    case Market.FIRST_HALF_OVER_UNDER:
      return overUnderOutcome(total1H)
    case Market.SECOND_HALF_WINNER:
      return winnerOutcome(sh2H, sh2A)
    default:
      return false
  }
}

function inferOutcome(homeScore: number, awayScore: number): SettlementOutcome {
  if (homeScore > awayScore) return 'HOME_WIN'
  if (awayScore > homeScore) return 'AWAY_WIN'
  return 'DRAW'
}

// Markets whose outcome is decidable from live score alone:
//   OVER_UNDER (OVER side): total > threshold
//   BOTH_TEAMS_TO_SCORE (YES side): both > 0
// 1H markets get settled at HT or later via the same logic but using halftime scores.
// UNDER, NO, and 1X2-style picks can't be resolved early — wait for FT.
function canSettleEarlyForMarket(
  market: Market,
  marketParam: string | undefined,
  fixture: { homeScore: number; awayScore: number; halftimeHome: number | null; halftimeAway: number | null; status: string },
): boolean {
  const ht = fixture.halftimeHome !== null && fixture.halftimeAway !== null
  const reachedHT = ht || ['HT', '2H', 'ET', 'BT', 'P', 'FT', 'AET', 'PEN'].includes(fixture.status)
  const threshold = marketParam ? parseFloat(marketParam) : 2.5

  switch (market) {
    case Market.OVER_UNDER: {
      const total = fixture.homeScore + fixture.awayScore
      return total > threshold // OVER side certain
    }
    case Market.BOTH_TEAMS_TO_SCORE:
      return fixture.homeScore > 0 && fixture.awayScore > 0
    case Market.FIRST_HALF_OVER_UNDER: {
      if (!reachedHT) return false
      const total1H = (fixture.halftimeHome ?? 0) + (fixture.halftimeAway ?? 0)
      return total1H > threshold || ['HT', '2H', 'ET', 'BT', 'P', 'FT', 'AET', 'PEN'].includes(fixture.status)
    }
    case Market.FIRST_HALF_BOTH_TEAMS_TO_SCORE:
    case Market.FIRST_HALF_WINNER:
      // Once HT is reached, 1H markets are fully decided either way.
      return reachedHT
    default:
      return false
  }
}

class SettlementService {
  async settleChallenge(
    challengeId: string,
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
    await this._settleWithFixture(challenge, fixture, settledBy, adminId)
  }

  /**
   * Settle once we have authoritative scores (either FT or an early-decidable in-play state).
   * Shared path used by FT settlement, admin settlement, and early settlement.
   */
  private async _settleWithFixture(
    challenge: InstanceType<typeof Challenge>,
    fixture: { homeScore: number; awayScore: number; halftimeHome: number; halftimeAway: number },
    settledBy: 'AUTO' | 'AUTO_EARLY' | 'ADMIN',
    adminId?: string,
    settledAtMinute?: number,
  ) {
    if (!challenge.opponentId) throw new AppError('Challenge has no opponent', 400)
    const challengeId = challenge._id.toString()

    const creatorWins = determineOutcome(challenge.market, challenge.pick, fixture, challenge.marketParam)
    const winnerId = creatorWins
      ? challenge.creatorId.toString()
      : challenge.opponentId.toString()
    const loserId = creatorWins
      ? challenge.opponentId.toString()
      : challenge.creatorId.toString()

    const outcome = inferOutcome(fixture.homeScore, fixture.awayScore)
    const stakeNum = parseFloat(challenge.stake.toString())

    const session = await mongoose.startSession()
    await session.withTransaction(async () => {
      await walletService.settleWager(
        winnerId,
        loserId,
        stakeNum,
        env.PLATFORM_FEE_PERCENT,
        challengeId,
        session,
      )

      await Settlement.create(
        [
          {
            challengeId: challenge._id,
            fixtureId: challenge.fixtureId,
            outcome,
            settledBy,
            adminUserId: adminId ? new Types.ObjectId(adminId) : undefined,
            settledAtMinute,
            totalPaidOut: challenge.potentialWin,
            currency: challenge.currency,
          },
        ],
        { session },
      )

      await Challenge.findByIdAndUpdate(
        challengeId,
        {
          status: ChallengeStatus.SETTLED,
          settledAt: new Date(),
          winnerUserId: new Types.ObjectId(winnerId),
        },
        { session },
      )

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

    const payoutNum = parseFloat(challenge.potentialWin.toString())
    await this.updateUserStats(winnerId, true, stakeNum, payoutNum)
    await this.updateUserStats(loserId, false, stakeNum, payoutNum)

    const isEarly = settledBy === 'AUTO_EARLY'
    const winnerTitle = isEarly ? 'Challenge Settled Early — You Won!' : 'Challenge Settled — You Won!'
    const loserTitle = isEarly ? 'Challenge Settled Early' : 'Challenge Settled'
    const minuteSuffix = settledAtMinute ? ` (decided at ${settledAtMinute}')` : ''

    await notificationService.create(
      winnerId,
      'CHALLENGE_SETTLED',
      winnerTitle,
      `You won your challenge${minuteSuffix}. ${challenge.potentialWin} ${challenge.currency} has been credited.`,
      { challengeId, settledAtMinute },
    )
    await notificationService.create(
      loserId,
      'CHALLENGE_SETTLED',
      loserTitle,
      `Your challenge has been settled${minuteSuffix}. Better luck next time!`,
      { challengeId, settledAtMinute },
    )

    socketService.emitToUser(winnerId, SocketEvent.CHALLENGE_SETTLED, { challengeId, result: 'WIN', early: isEarly })
    socketService.emitToUser(loserId, SocketEvent.CHALLENGE_SETTLED, { challengeId, result: 'LOSS', early: isEarly })
    socketService.emitToUser(winnerId, SocketEvent.WALLET_BALANCE_UPDATED, { userId: winnerId })
    socketService.emitToUser(loserId, SocketEvent.WALLET_BALANCE_UPDATED, { userId: loserId })
  }

  async processCompletedMatches() {
    const matchedChallenges = await Challenge.find({ status: ChallengeStatus.MATCHED })
    let settled = 0

    for (const challenge of matchedChallenges) {
      try {
        await fixtureService.getCompletedFixture(challenge.fixtureId)
        await this.settleChallenge(challenge._id.toString(), 'AUTO')
        settled++
      } catch {
        // Fixture not finished yet — skip
      }
    }

    return { processed: matchedChallenges.length, settled }
  }

  async expireOpenChallenges() {
    const now = new Date()

    // Direct hits: explicit expiresAt has passed.
    const expiredByTime = await Challenge.find({
      status: ChallengeStatus.OPEN,
      expiresAt: { $lte: now },
    })

    // Safety net: OPEN challenges with no expiresAt (legacy rows or any creation-time bug
    // where the kickoff couldn't be resolved). Cross-check each against the live fixture state.
    const orphans = await Challenge.find({
      status: ChallengeStatus.OPEN,
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }],
    })

    const seen = new Set<string>(expiredByTime.map((c) => c._id.toString()))
    const candidates = [...expiredByTime]
    for (const orphan of orphans) {
      if (seen.has(orphan._id.toString())) continue
      try {
        const fixture = (await fixtureService.getFixtureById(orphan.fixtureId)) as {
          fixture: { status: { short: string }; timestamp?: number }
        }
        const status = fixture?.fixture?.status?.short ?? ''
        const startedOrFinished = [
          '1H', '2H', 'HT', 'ET', 'P', 'BT', 'FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO',
        ].includes(status)
        const kickoffMs = fixture?.fixture?.timestamp ? fixture.fixture.timestamp * 1000 : 0
        const kickoffPassed = kickoffMs > 0 && kickoffMs <= now.getTime()
        if (startedOrFinished || kickoffPassed) {
          candidates.push(orphan)
          seen.add(orphan._id.toString())
        }
      } catch (err) {
        // Fixture lookup failed — leave the orphan for next sweep rather than expire blindly.
        console.error(`expireOpenChallenges: fixture lookup failed for ${orphan._id}:`, err)
      }
    }

    let expired = 0
    for (const challenge of candidates) {
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
            { status: ChallengeStatus.EXPIRED, expiresAt: challenge.expiresAt ?? now },
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

    return { processed: candidates.length, expired }
  }

  /**
   * Early settlement sweep — settles MATCHED challenges whose outcome is mathematically certain
   * before full time. Examples:
   *   - Over 1.5 once a 2nd goal goes in
   *   - BTTS Yes once both teams have scored
   *   - 1H markets once the half-time whistle has gone
   * Anything still uncertain is left for `processCompletedMatches` at FT.
   */
  async processEarlySettlements(): Promise<{ processed: number; settledEarly: number }> {
    const matched = await Challenge.find({ status: ChallengeStatus.MATCHED })
    if (matched.length === 0) return { processed: 0, settledEarly: 0 }

    const byFixture = new Map<string, typeof matched>()
    for (const c of matched) {
      const arr = byFixture.get(c.fixtureId) ?? []
      arr.push(c)
      byFixture.set(c.fixtureId, arr)
    }

    let settledEarly = 0
    for (const [fixtureId, group] of byFixture) {
      let live: Awaited<ReturnType<typeof fixtureService.getLiveData>>
      try {
        live = await fixtureService.getLiveData(fixtureId)
      } catch (err) {
        console.error(`processEarlySettlements: live fetch failed for ${fixtureId}:`, err)
        continue
      }

      // Skip pre-match fixtures entirely
      if (live.status === 'NS' || live.status === 'TBD') continue

      const fixtureForOutcome = {
        homeScore: live.homeScore,
        awayScore: live.awayScore,
        halftimeHome: live.halftimeHome ?? 0,
        halftimeAway: live.halftimeAway ?? 0,
        status: live.status,
      }

      for (const challenge of group) {
        try {
          if (
            !canSettleEarlyForMarket(challenge.market, challenge.marketParam, {
              homeScore: live.homeScore,
              awayScore: live.awayScore,
              halftimeHome: live.halftimeHome,
              halftimeAway: live.halftimeAway,
              status: live.status,
            })
          ) {
            continue
          }
          await this._settleWithFixture(
            challenge,
            fixtureForOutcome,
            'AUTO_EARLY',
            undefined,
            live.playedTime || undefined,
          )
          settledEarly++
        } catch (err) {
          console.error(`processEarlySettlements: failed for ${challenge._id}:`, err)
        }
      }
    }

    return { processed: matched.length, settledEarly }
  }

  private async updateUserStats(userId: string, won: boolean, stake: number, payout: number) {
    const userObjectId = new Types.ObjectId(userId)
    let stats = await UserStats.findOne({ userId: userObjectId })
    if (!stats) {
      stats = await UserStats.create({ userId: userObjectId })
    }

    const totalWagers = stats.totalWagers + 1
    const wonWagers = stats.wonWagers + (won ? 1 : 0)
    const lostWagers = stats.lostWagers + (won ? 0 : 1)
    const winRate = totalWagers > 0 ? (wonWagers / totalWagers) * 100 : 0

    // Monetary tracking — stake counts for both sides; payout counts only for the winner;
    // stake counts as loss for the loser. netPnl = totalWon - totalLost.
    const prevStaked = parseFloat(stats.totalStaked?.toString() ?? '0') || 0
    const prevWon = parseFloat(stats.totalWon?.toString() ?? '0') || 0
    const prevLost = parseFloat(stats.totalLost?.toString() ?? '0') || 0
    const totalStaked = prevStaked + stake
    const totalWon = prevWon + (won ? payout : 0)
    const totalLost = prevLost + (won ? 0 : stake)
    const netPnl = totalWon - totalLost

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
      totalStaked: String(totalStaked),
      totalWon: String(totalWon),
      totalLost: String(totalLost),
      netPnl: String(netPnl),
    })
  }
}

export const settlementService = new SettlementService()
