import { ChallengeStatus, ChallengeVisibility } from '../enums/challenge';
import { Market, Pick } from '../enums/market';
export interface IChallenge {
    id: string;
    creatorId: string;
    opponentId?: string;
    fixtureId: string;
    market: Market;
    pick: Pick;
    opponentPick: Pick;
    stake: number;
    currency: string;
    potentialWin: number;
    platformFee: number;
    status: ChallengeStatus;
    visibility: ChallengeVisibility;
    expiresAt?: Date;
    settledAt?: Date;
    winnerUserId?: string;
    createdAt: Date;
    updatedAt: Date;
}
