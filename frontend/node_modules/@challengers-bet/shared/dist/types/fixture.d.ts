export interface IFixture {
    id: string;
    externalId: string;
    homeTeam: string;
    awayTeam: string;
    leagueName: string;
    leagueId: number;
    country: string;
    kickoffAt: Date;
    status: string;
    homeScore?: number;
    awayScore?: number;
    season: number;
    round?: string;
}
