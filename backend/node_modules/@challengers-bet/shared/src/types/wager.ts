import { WagerResult, WagerStatus } from '../enums/wager'
import { Market, Pick } from '../enums/market'

export interface IWager {
  id: string
  challengeId: string
  userId: string
  pick: Pick
  market: Market
  stake: number
  currency: string
  potentialPayout: number
  status: WagerStatus
  result?: WagerResult
  settledAt?: Date
  createdAt: Date
  updatedAt: Date
}
