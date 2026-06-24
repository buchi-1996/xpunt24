import { Router, Request, Response, NextFunction } from 'express'
import { fixtureService } from '../services/fixture.service'

const router = Router()

// Fixture data is public — browsing the schedule and live scores doesn't require auth.
// Auth is enforced at the moment a user creates or accepts a challenge.

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, leagueId } = req.query as { date?: string; leagueId?: string }
    if (!date) {
      res.status(400).json({ error: 'date query param is required' })
      return
    }
    const fixtures = await fixtureService.getFixturesByDate(date, leagueId)
    res.json({ data: fixtures })
  } catch (err) {
    next(err)
  }
})

// MUST be before /:fixtureId
router.get('/leagues', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const leagues = await fixtureService.getLeagues()
    res.json({ data: leagues })
  } catch (err) {
    next(err)
  }
})

router.get('/:fixtureId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fixture = await fixtureService.getFixtureById(String(req.params['fixtureId']))
    res.json({ data: fixture })
  } catch (err) {
    next(err)
  }
})

router.get('/:fixtureId/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveData = await fixtureService.getLiveData(String(req.params['fixtureId']))
    res.json({ data: liveData })
  } catch (err) {
    next(err)
  }
})

export default router
