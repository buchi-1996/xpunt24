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
import { User } from '../db/models/user.model'
import { WalletAccount } from '../db/models/wallet-account.model'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'
import { toDecimal, serializeDecimal } from '../utils/decimal'
import { paginationParams, paginatedResponse } from '../utils/paginate'
import { walletService } from './wallet.service'
import { fixtureService } from './fixture.service'
import { socketService } from './socket.service'

// Reshape a raw challenge doc into the frontend-expected shape (challenger/opposer, amount, picks, matchData).
async function enrichChallenges(rawChallenges: Array<Record<string, unknown>>) {
  if (rawChallenges.length === 0) return []

  const userIds = new Set<string>()
  const fixtureIds = new Set<string>()
  for (const c of rawChallenges) {
    if (c['creatorId']) userIds.add(String(c['creatorId']))
    if (c['opponentId']) userIds.add(String(c['opponentId']))
    if (c['fixtureId']) fixtureIds.add(String(c['fixtureId']))
  }

  const [users, fixtureResults] = await Promise.all([
    User.find({ _id: { $in: [...userIds] } }).select('name image email').lean(),
    Promise.all(
      [...fixtureIds].map((id) =>
        fixtureService.getFixtureById(id).catch(() => null),
      ),
    ),
  ])

  const userMap = new Map(users.map((u) => [String(u._id), u]))
  const fixtureMap = new Map([...fixtureIds].map((id, i) => [id, fixtureResults[i]]))

  return rawChallenges.map((c) => {
    const creator = c['creatorId'] ? userMap.get(String(c['creatorId'])) : null
    const opponent = c['opponentId'] ? userMap.get(String(c['opponentId'])) : null
    const serialized = serializeDecimal(c) as Record<string, unknown>

    return {
      ...serialized,
      amount: serialized['stake'],
      challengerPick: serialized['pick'],
      opposerPick: serialized['opponentPick'],
      matchData: fixtureMap.get(String(c['fixtureId'])) ?? null,
      challenger: creator
        ? {
            _id: String(creator._id),
            name: creator.name ?? null,
            username: null,
            image: creator.image ?? null,
            walletBalance: 0,
          }
        : null,
      opposer: opponent
        ? {
            _id: String(opponent._id),
            name: opponent.name ?? null,
            username: null,
            image: opponent.image ?? null,
            walletBalance: 0,
          }
        : null,
    }
  })
}

interface CreateChallengeBody {
  fixtureId: string
  market: Market
  marketParam?: string
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
    const { fixtureId, market, marketParam, pick, stake, currency = 'USDT', visibility, expiresAt } = body

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
      fixture: { status: { short: string }; date: string; timestamp?: number }
    }
    const fixtureStatus = fixture?.fixture?.status?.short ?? ''
    const started = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'FT', 'AET', 'PEN'].includes(fixtureStatus)
    if (started) throw new AppError('Fixture has already started', 400, 'FIXTURE_STARTED')

    // Refuse to create a challenge we can't auto-expire. A null kickoff timestamp would silently
    // produce a null expiresAt and leave the OPEN row holding stake forever.
    const kickoffMs = fixture?.fixture?.timestamp ? fixture.fixture.timestamp * 1000 : undefined
    if (!kickoffMs) {
      throw new AppError(
        'Could not determine fixture kickoff time — please try again',
        502,
        'FIXTURE_KICKOFF_UNKNOWN',
      )
    }
    // Kickoff-time guard: the fixture status above can be stale (we serve a cached/last-good
    // fixture when api-football is rate-limited), so also reject by the fixed kickoff time.
    if (kickoffMs <= Date.now()) {
      throw new AppError('Fixture has already started', 400, 'FIXTURE_STARTED')
    }
    const kickoffDate = new Date(kickoffMs)

    // expiresAt = min(provided, kickoff). Always set — never null.
    const providedExpiry = expiresAt ? new Date(expiresAt) : undefined
    const effectiveExpiry: Date =
      providedExpiry && providedExpiry.getTime() < kickoffDate.getTime()
        ? providedExpiry
        : kickoffDate

    const stakeNum = parseFloat(String(stake))
    if (stakeNum < env.MIN_STAKE) {
      throw new AppError(`Minimum stake is ${env.MIN_STAKE}`, 400, 'BELOW_MIN_STAKE')
    }
    if (env.MAX_STAKE && stakeNum > env.MAX_STAKE) {
      throw new AppError(`Maximum stake is ${env.MAX_STAKE}`, 400, 'ABOVE_MAX_STAKE')
    }

    // Auto-matching is handled exclusively by the /cron/auto-match sweep (autoMatchSweep),
    // NOT at create time. Doing it here made every create race the cron for the same
    // wallet/challenge docs, which deadlocked on Atlas's transaction lifetime and hung the
    // request ~2 min. Creating always produces a fast OPEN row; the cron pairs opposites
    // within ~1 min, and users can still match instantly via the manual "Oppose" flow.

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
        marketParam,
        pick,
        opponentPick,
        stake: toDecimal(stakeNum, 'stake'),
        currency,
        potentialWin: toDecimal(potentialWin, 'potentialWin'),
        platformFee: toDecimal(platformFee, 'platformFee'),
        status: ChallengeStatus.OPEN,
        visibility: visibility ?? ChallengeVisibility.PUBLIC,
        expiresAt: effectiveExpiry,
      })
      await challenge.save({ session })
    }, { maxCommitTimeMS: 10000 })

    session.endSession()

    if (!challenge) throw new AppError('Failed to create challenge', 500)
    const createdChallenge = challenge

    // Create the creator's wager (PENDING until matched)
    await Wager.create({
      challengeId,
      userId: new Types.ObjectId(userId),
      pick,
      market,
      marketParam,
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
    await session.withTransaction(
      async () => {
        // Atomically CLAIM the challenge first: only the accepter that flips OPEN→MATCHED
        // proceeds. If create-time auto-match and the auto-match cron race for the same
        // challenge, the loser gets null here and exits fast with NOT_OPEN instead of
        // deadlocking on the wallet/challenge docs until the transaction times out.
        const claimed = await Challenge.findOneAndUpdate(
          { _id: challengeId, status: ChallengeStatus.OPEN },
          { status: ChallengeStatus.MATCHED, opponentId: new Types.ObjectId(opponentId) },
          { session, new: true },
        )
        if (!claimed) {
          throw new AppError('Challenge is no longer open', 400, 'NOT_OPEN')
        }

        await walletService.lockStake(opponentId, stakeNum, challengeId, session)

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
            marketParam: challenge.marketParam,
            stake: challenge.stake,
            currency: challenge.currency,
            potentialPayout: challenge.potentialWin,
            status: WagerStatus.ACTIVE,
          },
        ],
        { session },
      )
    },
      // Bound the commit so a rare lock conflict fails in seconds instead of hanging on
      // Atlas's 60s transaction lifetime (which surfaced as a 2-minute spinner).
      { maxCommitTimeMS: 10000 },
    )
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

    const enriched = await enrichChallenges(challenges as Array<Record<string, unknown>>)
    return paginatedResponse(enriched, total, page, limit)
  }

  async getChallenge(id: string) {
    const challenge = await Challenge.findById(id).lean()
    if (!challenge) throw new AppError('Challenge not found', 404)
    const [enriched] = await enrichChallenges([challenge as Record<string, unknown>])
    return enriched
  }

  async getUserChallenges(userId: string, filters: Record<string, unknown>) {
    const { skip, limit, page } = paginationParams(filters)
    const query: Record<string, unknown> = {
      $or: [
        { creatorId: new Types.ObjectId(userId) },
        { opponentId: new Types.ObjectId(userId) },
      ],
      // Hide secondary challenges that the auto-matcher merged into a primary — the user
      // already appears on the primary (matched), so showing the cancelled secondary too
      // would duplicate the entry in their wagers list.
      mergedInto: { $exists: false },
    }
    if (filters['status']) query['status'] = filters['status']

    const [challenges, total] = await Promise.all([
      Challenge.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Challenge.countDocuments(query),
    ])

    const enriched = await enrichChallenges(challenges as Array<Record<string, unknown>>)
    return paginatedResponse(enriched, total, page, limit)
  }

  // Find the oldest OPEN challenge that satisfies the FIFO compatibility rules:
  // same fixture, market, stake, currency; opposite pick; different creator; not expired.
  private async findCompatibleOpenChallenge(criteria: {
    fixtureId: string
    market: Market
    marketParam?: string
    pick: Pick // the pick the counter-party would have made (i.e. opposite of current user's pick)
    stake: number
    currency: string
    excludeUserId: string
  }): Promise<{ _id: Types.ObjectId; createdAt: Date; creatorId: Types.ObjectId } | null> {
    const now = new Date()
    const query: Record<string, unknown> = {
      fixtureId: criteria.fixtureId,
      market: criteria.market,
      pick: criteria.pick,
      currency: criteria.currency,
      status: ChallengeStatus.OPEN,
      visibility: ChallengeVisibility.PUBLIC,
      creatorId: { $ne: new Types.ObjectId(criteria.excludeUserId) },
      $expr: { $eq: [{ $toDouble: '$stake' }, criteria.stake] },
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }

    // marketParam must match exactly — an Over/Under 1.5 doesn't match an Over/Under 2.5.
    if (criteria.marketParam !== undefined) {
      query['marketParam'] = criteria.marketParam
    } else {
      query['$and'] = [{ $or: [{ marketParam: { $exists: false } }, { marketParam: null }] }]
    }

    return Challenge.findOne(query)
      .sort({ createdAt: 1 })
      .select('_id createdAt creatorId')
      .lean<{ _id: Types.ObjectId; createdAt: Date; creatorId: Types.ObjectId } | null>()
  }

  // Safety net: scan OPEN challenges for pairs that the create-time matcher missed (e.g. race conditions).
  // Pairs are merged by cancelling the newer one (refunding the user) then accepting the older — so
  // the secondary user's stake gets re-locked under the surviving challenge through the normal path.
  // In-memory mutex: only one sweep runs at a time. Overlapping sweeps (a slow run still
  // going when the next cron fires, or a manual trigger during the cron) deadlock — each
  // multi-document merge transaction holds one challenge and waits for another. Single
  // backend instance, so an in-process flag is sufficient.
  private sweepRunning = false

  async autoMatchSweep() {
    if (this.sweepRunning) {
      return { processed: 0, matched: 0, skipped: true as const }
    }
    this.sweepRunning = true
    try {
      return await this.runAutoMatchSweep()
    } finally {
      this.sweepRunning = false
    }
  }

  private async runAutoMatchSweep() {
    const openChallenges = await Challenge.find({ status: ChallengeStatus.OPEN })
      .sort({ createdAt: 1 })
      .lean<
        Array<{
          _id: Types.ObjectId
          createdAt: Date
          creatorId: Types.ObjectId
          fixtureId: string
          market: Market
          marketParam?: string
          opponentPick: Pick
          stake: Types.Decimal128
          currency: string
        }>
      >()

    let matched = 0
    const seen = new Set<string>()

    for (const challenge of openChallenges) {
      const id = challenge._id.toString()
      if (seen.has(id)) continue

      const counter = await this.findCompatibleOpenChallenge({
        fixtureId: challenge.fixtureId,
        market: challenge.market,
        marketParam: challenge.marketParam,
        pick: challenge.opponentPick,
        stake: parseFloat(challenge.stake.toString()),
        currency: challenge.currency,
        excludeUserId: challenge.creatorId.toString(),
      })
      if (!counter || seen.has(counter._id.toString())) continue

      // FIFO: oldest survives as the matched challenge; the newer one is merged into it.
      const primary = counter.createdAt <= challenge.createdAt ? counter : challenge
      const secondary = primary === counter ? challenge : counter
      // Both sides of a matched pair share the same stake; read it from the typed loop var.
      const stakeNum = parseFloat(challenge.stake.toString())

      // Merge the pair in ONE atomic transaction. The previous cancel-then-accept used two
      // separate transactions, so a failure between them left a challenge cancelled-but-
      // unmatched. Doing both claims + the stake move + the wagers together is all-or-nothing.
      const session = await mongoose.startSession()
      try {
        await session.withTransaction(
          async () => {
            const p = await Challenge.findOneAndUpdate(
              { _id: primary._id, status: ChallengeStatus.OPEN },
              { status: ChallengeStatus.MATCHED, opponentId: secondary.creatorId },
              { session, new: true },
            )
            if (!p) throw new AppError('Primary no longer open', 409, 'NOT_OPEN')
            const s = await Challenge.findOneAndUpdate(
              { _id: secondary._id, status: ChallengeStatus.OPEN },
              { status: ChallengeStatus.CANCELLED, mergedInto: primary._id },
              { session, new: true },
            )
            if (!s) throw new AppError('Secondary no longer open', 409, 'NOT_OPEN')

            // Move the secondary creator's stake off their (now cancelled) challenge and lock
            // it onto the primary instead — net zero balance change, clean ledger trail.
            await walletService.unlockStake(
              secondary.creatorId.toString(), stakeNum, secondary._id.toString(), session,
            )
            await walletService.lockStake(
              secondary.creatorId.toString(), stakeNum, primary._id.toString(), session,
            )

            // Activate the primary creator's wager.
            await Wager.updateMany({ challengeId: p._id }, { status: WagerStatus.ACTIVE }, { session })
            // Re-point the secondary creator's EXISTING wager onto the primary challenge
            // instead of cancelling it and creating a new one. Otherwise the opposer ends up
            // with two rows in their wagers page — a CANCELLED dupe plus the MATCHED one. Their
            // pick already equals p.opponentPick (that's the matching criterion).
            await Wager.updateMany(
              { challengeId: s._id, userId: secondary.creatorId },
              {
                $set: {
                  challengeId: p._id,
                  pick: p.opponentPick,
                  market: p.market,
                  marketParam: p.marketParam,
                  potentialPayout: p.potentialWin,
                  status: WagerStatus.ACTIVE,
                },
              },
              { session },
            )
          },
          { maxCommitTimeMS: 10000 },
        )

        seen.add(primary._id.toString())
        seen.add(secondary._id.toString())
        matched++

        const primaryCreator = primary.creatorId.toString()
        const secondaryCreator = secondary.creatorId.toString()
        socketService.emitToUser(primaryCreator, SocketEvent.CHALLENGE_MATCHED, { challengeId: primary._id.toString() })
        socketService.emitToUser(secondaryCreator, SocketEvent.CHALLENGE_MATCHED, { challengeId: primary._id.toString() })
        socketService.emitToUser(secondaryCreator, SocketEvent.WALLET_BALANCE_UPDATED, { userId: secondaryCreator })
      } catch (err) {
        console.error('autoMatchSweep: failed to merge pair', {
          primary: primary._id.toString(),
          secondary: secondary._id.toString(),
          err,
        })
      } finally {
        await session.endSession()
      }
    }

    return { processed: openChallenges.length, matched }
  }
}

export const challengeService = new ChallengeService()
