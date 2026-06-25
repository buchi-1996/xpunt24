import { Url } from "next/dist/shared/lib/router/router";

export interface FormCardProps {
    label: string,
    title: string,
    className: string,
    backButtonHref: Url,
    backButtonLabel: string,
    children: React.ReactNode
    isLogin?: boolean
}

export interface LeagueProps{
    country: {
        name: string,
        code: string,
        flag: string,
    }
    league: {
        id: number,
        name: string,
        logo: string,
    }
}


export interface FixtureResponse {
    response: Match[];
  }
  
  export interface Match {
    fixture: FixtureDetails;
    league: LeagueDetails;
    teams: Teams;
    goals: Goals;
    score: Score;
  }
  export interface Goals {
    home: number | null;
    away: number | null;
  }

  export interface Score {
    halftime: Goals;
    fulltime: Goals;
    extratime: Goals;
    penalty: Goals;
  }
  
  export interface FixtureDetails {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number | null;
      second: number | null;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
      extra: number | null;
    };
  }
  
  export interface LeagueDetails {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  }
  
  export interface Teams {
    home: TeamInfo;
    away: TeamInfo;
  }
  
  export interface TeamInfo {
    id: number;
    name: string;
    logo: string;
    winner: boolean | null;
  }




export interface MatchData {
  fixture: {
    id: number;
    referee?: string;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed?: number;
    };
    venue?: {
      id?: number;
      name?: string;
      city?: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag?: string;
    season: number;
    round?: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner?: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner?: boolean | null;
    };
  };
  goals: {
    home?: number | null;
    away?: number | null;
  };
  score: {
    halftime?: {
      home?: number | null;
      away?: number | null;
    };
    fulltime?: {
      home?: number | null;
      away?: number | null;
    };
    extratime?: {
      home?: number | null;
      away?: number | null;
    };
    penalty?: {
      home?: number | null;
      away?: number | null;
    };
  };
}
export type ChallengeStatusValue =
  | 'OPEN'
  | 'MATCHED'
  | 'LOCKED'
  | 'SETTLED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED'

export interface WagerUser {
  _id: string;
  name: string | null;
  username?: string | null;
  image: string | null;
  walletBalance?: number;
}

// Mirrors what backend's enrichChallenges() returns.
export interface WagerProps {
  _id: string;
  fixtureId: string;
  creatorId: string;
  opponentId?: string | null;
  market: string;
  marketParam?: string | null;
  pick: string;
  opponentPick: string;
  stake: string; // Decimal128 serialized as string
  amount: string; // alias for stake added by the enricher
  currency: string;
  potentialWin: string;
  platformFee: string;
  status: ChallengeStatusValue;
  visibility: string;
  expiresAt?: string | null;
  settledAt?: string | null;
  winnerUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  matchData: MatchData | null;
  challengerPick: string;
  opposerPick: string;
  challenger: WagerUser | null;
  opposer: WagerUser | null;
}




// types/betting.ts
export interface MatchResult {
  homeScore: number;
  awayScore: number;
  status: 'FINISHED' | 'CANCELED' | 'POSTPONED' | 'LIVE';
  totalGoals?: number;
  bothTeamsScored?: boolean;
  playedTime?: string | null; // e.g., "45'" or "45+2'"
  statusDisplay?: string; // Human-readable status
  rawStatus?: string; // Original API status code
  isLive?: boolean; // Quick check for live status
}
export interface BetResult {
  betId: string;
  winnerId: string | null; // null for draw/tie scenarios
  winnerPick: string;
  actualResult: string;
  winnings: number;
  platformFee: number;
}

export interface APIFootballMatchResult {
  fixture: {
    id: number;
    status: {
      long: string;
      short: string;
      elapsed?: number | null;
      extra?: number | null;
    };
  goals: {
    home: number | null;
    away: number | null;
  };
  teams: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
  };
}
}