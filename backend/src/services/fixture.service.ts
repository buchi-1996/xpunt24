import Redis from 'ioredis'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'

const FOOTBALL_API_BASE = 'https://v3.football.api-sports.io'

const redis = new Redis(env.REDIS_URL)

redis.on('error', (err: unknown) => console.error('[FixtureService] Redis error:', err))

interface FixtureApiResponse {
  response: unknown[]
}

async function fetchFromApi(path: string): Promise<unknown[]> {
  const res = await fetch(`${FOOTBALL_API_BASE}${path}`, {
    headers: {
      'x-apisports-key': env.FOOTBALL_API_KEY,
    },
  })
  if (!res.ok) {
    throw new AppError(`Football API error: ${res.status}`, 502, 'FOOTBALL_API_ERROR')
  }
  const json = (await res.json()) as FixtureApiResponse & { errors?: unknown }
  // api-sports returns HTTP 200 even when rate-limited/erroring — the problem is in `errors`
  // (an object/array of messages; `[]` on success). Throw so we never cache an empty/garbage
  // result (which would blank out the fixtures board until the cache expired).
  const errs = json.errors
  const hasErr = Array.isArray(errs) ? errs.length > 0 : !!errs && Object.keys(errs).length > 0
  if (hasErr) {
    throw new AppError(`Football API error: ${JSON.stringify(errs)}`, 502, 'FOOTBALL_API_ERROR')
  }
  return json.response
}

function isLive(status: string): boolean {
  return ['1H', '2H', 'ET', 'P', 'HT', 'LIVE', 'BT'].includes(status)
}

function isFinished(status: string): boolean {
  return ['FT', 'AET', 'PEN'].includes(status)
}

class FixtureService {
  async getFixturesByDate(date: string, leagueId?: string): Promise<unknown[]> {
    const allCacheKey = `fixtures:date:${date}:all`
    const lastGoodKey = `fixtures:date:${date}:lastgood`

    // Always work from the full-day cache
    let allFixtures: unknown[]
    const cached = await redis.get(allCacheKey)

    if (cached) {
      allFixtures = JSON.parse(cached) as unknown[]
    } else {
      try {
        allFixtures = await fetchFromApi(`/fixtures?date=${date}`)
        const hasLive = (allFixtures as Array<{ fixture: { status: { short: string } } }>).some(
          (f) => isLive(f?.fixture?.status?.short),
        )
        // 10-min TTL when live matches are on, 60-min otherwise. The api-football budget is
        // tiny (100/day), and this single /fixtures?date= response already carries every
        // fixture's live status + scores — so warm the per-fixture cache from it and let
        // getFixtureById/getLiveData/getCompletedFixture serve from cache (no extra calls).
        const ttl = hasLive ? 600 : 3600
        await redis.set(allCacheKey, JSON.stringify(allFixtures), 'EX', ttl)
        const pipeline = redis.pipeline()
        for (const f of allFixtures as Array<{ fixture?: { id?: number } }>) {
          const fid = f?.fixture?.id
          if (fid) pipeline.set(`fixtures:id:${fid}`, JSON.stringify(f), 'EX', ttl)
        }
        await pipeline.exec()
        // Keep a 24h "last known good" copy to serve when the API is rate-limited/down.
        await redis.set(lastGoodKey, JSON.stringify(allFixtures), 'EX', 86400)
      } catch (err) {
        // Rate-limited or API error: serve the last-known-good board instead of blanking it.
        const lastGood = await redis.get(lastGoodKey)
        if (!lastGood) throw err
        allFixtures = JSON.parse(lastGood) as unknown[]
        // Short negative-cache so we don't re-hit the (limited) API on every request.
        await redis.set(allCacheKey, lastGood, 'EX', 120)
      }
    }

    // League filter is done in-memory — no extra API call
    if (leagueId) {
      const id = parseInt(leagueId, 10)
      return (allFixtures as Array<{ league: { id: number } }>).filter(
        (f) => f.league?.id === id,
      )
    }

    return allFixtures
  }

  async getFixtureById(id: string): Promise<unknown> {
    const cacheKey = `fixtures:id:${id}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const data = await fetchFromApi(`/fixtures?id=${id}`)
    if (!data.length) throw new AppError('Fixture not found', 404)

    const fixture = data[0] as { fixture: { status: { short: string } } }
    const ttl = isLive(fixture?.fixture?.status?.short) ? 300 : 3600
    await redis.set(cacheKey, JSON.stringify(fixture), 'EX', ttl)

    return fixture
  }

  async getLiveData(
    id: string,
  ): Promise<{
    playedTime: number
    status: string
    isLive: boolean
    homeScore: number
    awayScore: number
    halftimeHome: number | null
    halftimeAway: number | null
  }> {
    // Derive live data from the cached fixture object (warmed by getFixturesByDate's single
    // /fixtures?date= call, which includes live status/elapsed/goals). No separate per-fixture
    // live API call — that per-minute-per-fixture call was the main budget drain.
    const fixture = (await this.getFixtureById(id)) as {
      fixture: { status: { short: string; elapsed: number } }
      goals: { home: number | null; away: number | null }
      score?: { halftime?: { home: number | null; away: number | null } }
    }

    const result = {
      playedTime: fixture?.fixture?.status?.elapsed ?? 0,
      status: fixture?.fixture?.status?.short ?? 'NS',
      isLive: isLive(fixture?.fixture?.status?.short ?? ''),
      homeScore: fixture?.goals?.home ?? 0,
      awayScore: fixture?.goals?.away ?? 0,
      // Halftime is null during 1H — only set once HT/2H/FT reached
      halftimeHome: fixture?.score?.halftime?.home ?? null,
      halftimeAway: fixture?.score?.halftime?.away ?? null,
    }

    return result
  }

  async getLeagues(): Promise<unknown[]> {
    const cacheKey = 'fixtures:leagues'
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached) as unknown[]

    const data = await fetchFromApi('/leagues')
    await redis.set(cacheKey, JSON.stringify(data), 'EX', 86400)
    return data
  }

  async getCompletedFixture(id: string): Promise<{
    homeScore: number
    awayScore: number
    halftimeHome: number
    halftimeAway: number
    status: string
  }> {
    const cacheKey = `fixtures:completed:${id}`
    const cached = await redis.get(cacheKey)
    if (cached)
      return JSON.parse(cached) as {
        homeScore: number
        awayScore: number
        halftimeHome: number
        halftimeAway: number
        status: string
      }

    // Prefer the cached fixture (warmed from the daily /fixtures?date= fetch). Only spend a
    // direct API call when the cached copy isn't finished yet — settlement needs the real
    // final score, and we don't want to wait up to 10 min for the daily cache to refresh.
    let fixture = (await this.getFixtureById(id)) as {
      fixture: { status: { short: string } }
      goals: { home: number | null; away: number | null }
      score?: { halftime?: { home: number | null; away: number | null } }
    }
    let status = fixture?.fixture?.status?.short ?? ''

    if (!isFinished(status)) {
      const data = await fetchFromApi(`/fixtures?id=${id}`)
      if (!data.length) throw new AppError('Fixture not found', 404)
      fixture = data[0] as typeof fixture
      status = fixture?.fixture?.status?.short ?? ''
    }

    if (!isFinished(status)) {
      throw new AppError(`Fixture is not finished (status: ${status})`, 400, 'FIXTURE_NOT_FINISHED')
    }

    const result = {
      homeScore: fixture?.goals?.home ?? 0,
      awayScore: fixture?.goals?.away ?? 0,
      halftimeHome: fixture?.score?.halftime?.home ?? 0,
      halftimeAway: fixture?.score?.halftime?.away ?? 0,
      status,
    }

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600)
    return result
  }
}

export const fixtureService = new FixtureService()
