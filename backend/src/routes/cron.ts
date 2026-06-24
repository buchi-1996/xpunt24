import { Router, Request, Response, NextFunction } from 'express'
import { verifyCronSecret } from '../middleware/cronSecret'
import { settlementService } from '../services/settlement.service'
import { challengeService } from '../services/challenge.service'
import { withdrawalService } from '../services/withdrawal.service'

const router = Router()

router.post('/process-results', verifyCronSecret, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.processCompletedMatches()
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

router.post('/expire-challenges', verifyCronSecret, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settlementService.expireOpenChallenges()
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

router.post('/auto-match', verifyCronSecret, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await challengeService.autoMatchSweep()
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

router.post('/poll-payouts', verifyCronSecret, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await withdrawalService.pollStalePayouts()
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
})

export default router
