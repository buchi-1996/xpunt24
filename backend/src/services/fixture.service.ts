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
  const json = (await res.json()) as FixtureApiResponse
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

    // Always work from the full-day cache
    let allFixtures: unknown[]
    const cached = await redis.get(allCacheKey)

    if (cached) {
      allFixtures = JSON.parse(cached) as unknown[]
    } else {
      allFixtures = await fetchFromApi(`/fixtures?date=${date}`)
      const hasLive = (allFixtures as Array<{ fixture: { status: { short: string } } }>).some(
        (f) => isLive(f?.fixture?.status?.short),
      )
      // 5-min TTL when live matches are on, 60-min otherwise
      await redis.set(allCacheKey, JSON.stringify(allFixtures), 'EX', hasLive ? 300 : 3600)
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
  ): Promise<{ playedTime: number; status: string; isLive: boolean; homeScore: number; awayScore: number }> {
    const cacheKey = `fixtures:live:${id}`
    const cached = await redis.get(cacheKey)
    if (cached)
      return JSON.parse(cached) as {
        playedTime: number
        status: string
        isLive: boolean
        homeScore: number
        awayScore: number
      }

    const data = await fetchFromApi(`/fixtures?id=${id}&live=all`)
    const fixture = (
      data.length
        ? data[0]
        : await this.getFixtureById(id)
    ) as {
      fixture: { status: { short: string; elapsed: number } }
      goals: { home: number | null; away: number | null }
    }

    const result = {
      playedTime: fixture?.fixture?.status?.elapsed ?? 0,
      status: fixture?.fixture?.status?.short ?? 'NS',
      isLive: isLive(fixture?.fixture?.status?.short ?? ''),
      homeScore: fixture?.goals?.home ?? 0,
      awayScore: fixture?.goals?.away ?? 0,
    }

    await redis.set(cacheKey, JSON.stringify(result), 'EX', 300)
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

    const data = await fetchFromApi(`/fixtures?id=${id}`)
    if (!data.length) throw new AppError('Fixture not found', 404)

    const fixture = data[0] as {
      fixture: { status: { short: string } }
      goals: { home: number | null; away: number | null }
      score?: { halftime?: { home: number | null; away: number | null } }
    }
    const status = fixture?.fixture?.status?.short ?? ''

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
