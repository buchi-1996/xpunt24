import { Router, Request, Response, NextFunction } from 'express'
import { authenticate } from '../middleware/auth'
import { challengeService } from '../services/challenge.service'
import { Market, Pick, ChallengeVisibility } from '@challengers-bet/shared'

const router = Router()

// Public — visitors can browse the open challenge lobby. Auth is enforced at create/accept.
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await challengeService.listChallenges(req.query as Record<string, unknown>)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fixtureId, market, pick, stake, currency, visibility, expiresAt } = req.body as {
      fixtureId: string
      market: Market
      pick: Pick
      stake: number | string
      currency?: string
      visibility?: ChallengeVisibility
      expiresAt?: string
    }
    const challenge = await challengeService.createChallenge(req.user!.id, {
      fixtureId,
      market,
      pick,
      stake,
      currency,
      visibility,
      expiresAt,
    })
    res.status(201).json({ data: challenge })
  } catch (err) {
    next(err)
  }
})

// MUST be before /:id
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await challengeService.getUserChallenges(
      req.user!.id,
      req.query as Record<string, unknown>,
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challenge = await challengeService.getChallenge(String(req.params['id']))
    res.json({ data: challenge })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/accept', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const challenge = await challengeService.acceptChallenge(String(req.params['id']), req.user!.id)
    res.json({ data: challenge })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await challengeService.cancelChallenge(String(req.params['id']), req.user!.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
