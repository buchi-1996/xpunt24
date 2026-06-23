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
// Extended bet type with properly typed matchData
export interface WagerProps {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
  completedAt?: Date | null;
  challengerId: string;
  opposerId?: string | null;
  matchData: MatchData; // Properly typed instead of JsonValue
  challengerPick: string;
  opposerPick: string;
  winnerId?: string | null;
  loserPayout?: number | null;
  platformFee?: number | null;
  isPublic: boolean;
  terms?: string | null;
  challenger: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    walletBalance: number;
  };
  opposer?: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    walletBalance: number;
  } | null;
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