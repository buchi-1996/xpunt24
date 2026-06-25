export enum Market {
  MATCH_WINNER = 'MATCH_WINNER',
  DOUBLE_CHANCE = 'DOUBLE_CHANCE',
  BOTH_TEAMS_TO_SCORE = 'BOTH_TEAMS_TO_SCORE',
  OVER_UNDER = 'OVER_UNDER',
  FIRST_HALF_WINNER = 'FIRST_HALF_WINNER',
  FIRST_HALF_BOTH_TEAMS_TO_SCORE = 'FIRST_HALF_BOTH_TEAMS_TO_SCORE',
  FIRST_HALF_OVER_UNDER = 'FIRST_HALF_OVER_UNDER',
  SECOND_HALF_WINNER = 'SECOND_HALF_WINNER',
  ASIAN_HANDICAP = 'ASIAN_HANDICAP',
  CORRECT_SCORE = 'CORRECT_SCORE',
  FIRST_GOAL_SCORER = 'FIRST_GOAL_SCORER',
}

export enum Pick {
  HOME = 'HOME',
  AWAY = 'AWAY',
  DRAW = 'DRAW',
  YES = 'YES',
  NO = 'NO',
  OVER = 'OVER',
  UNDER = 'UNDER',
  DOUBLE_CHANCE = 'DOUBLE_CHANCE',
}

export const OPPOSITE_PICK_MAP: Partial<Record<Pick, Pick>> = {
  [Pick.HOME]: Pick.AWAY,
  [Pick.AWAY]: Pick.HOME,
  [Pick.YES]: Pick.NO,
  [Pick.NO]: Pick.YES,
  [Pick.OVER]: Pick.UNDER,
  [Pick.UNDER]: Pick.OVER,
  // DRAW (in MATCH_WINNER) <-> DOUBLE_CHANCE-pick (anti-draw "12") — both directions so
  // either side can auto-match against the other.
  [Pick.DRAW]: Pick.DOUBLE_CHANCE,
  [Pick.DOUBLE_CHANCE]: Pick.DRAW,
}
