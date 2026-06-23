import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { fixtureService } from '../services/fixture.service'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/leagues', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const leagues = await fixtureService.getLeagues()
    res.json({ data: leagues })
  } catch (err) {
    next(err)
  }
})

router.get('/:fixtureId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fixture = await fixtureService.getFixtureById(String(req.params['fixtureId']))
    res.json({ data: fixture })
  } catch (err) {
    next(err)
  }
})

router.get('/:fixtureId/live', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveData = await fixtureService.getLiveData(String(req.params['fixtureId']))
    res.json({ data: liveData })
  } catch (err) {
    next(err)
  }
})

export default router
