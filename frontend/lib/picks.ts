// Single source of truth for the betting picks the UI exposes.
// Each option maps a button id (used in click handlers and selectedOption) to the
// (market, marketParam, pick) tuple the backend expects.
//
// IMPORTANT: every option here has a direct opposite — that's what lets the
// auto-matcher pair newly-created challenges with existing OPEN ones in the lobby.

export type Market =
  | 'MATCH_WINNER'
  | 'DOUBLE_CHANCE'
  | 'BOTH_TEAMS_TO_SCORE'
  | 'OVER_UNDER'
  | 'FIRST_HALF_WINNER'
  | 'FIRST_HALF_BOTH_TEAMS_TO_SCORE'
  | 'FIRST_HALF_OVER_UNDER'
  | 'SECOND_HALF_WINNER'

export type PickValue =
  | 'HOME'
  | 'AWAY'
  | 'DRAW'
  | 'YES'
  | 'NO'
  | 'OVER'
  | 'UNDER'
  | 'DOUBLE_CHANCE'

export type PickGroup =
  | 'Match Result'
  | 'Double Chance'
  | 'Goals'
  | 'Both Teams to Score'
  | 'First Half'
  | 'Second Half'

export type PickOption = {
  id: string
  shortLabel: string
  longLabel: string
  description?: string
  group: PickGroup
  market: Market
  marketParam?: string
  pick: PickValue
}

export const PICK_OPTIONS: PickOption[] = [
  // Match Result (full time)
  { id: 'home',     shortLabel: '1',     longLabel: 'Home Win',          description: 'Home team wins after 90 min', group: 'Match Result', market: 'MATCH_WINNER', pick: 'HOME' },
  { id: 'draw',     shortLabel: 'X',     longLabel: 'Draw',              description: 'Match ends level',           group: 'Match Result', market: 'MATCH_WINNER', pick: 'DRAW' },
  { id: 'away',     shortLabel: '2',     longLabel: 'Away Win',          description: 'Away team wins after 90 min',group: 'Match Result', market: 'MATCH_WINNER', pick: 'AWAY' },
  { id: 'no_draw',  shortLabel: '12',    longLabel: 'No Draw (1 or 2)',  description: 'Either side wins, no draw',  group: 'Match Result', market: 'MATCH_WINNER', pick: 'DOUBLE_CHANCE' },

  // Double Chance
  { id: '1x',       shortLabel: '1X',    longLabel: 'Home or Draw',      description: 'Home wins OR draw',          group: 'Double Chance', market: 'DOUBLE_CHANCE', pick: 'HOME' },
  { id: 'x2',       shortLabel: 'X2',    longLabel: 'Away or Draw',      description: 'Away wins OR draw',          group: 'Double Chance', market: 'DOUBLE_CHANCE', pick: 'AWAY' },

  // Both Teams to Score (full time)
  { id: 'btts_yes', shortLabel: 'GG',    longLabel: 'Both Teams Score',  description: 'Both teams score at least one', group: 'Both Teams to Score', market: 'BOTH_TEAMS_TO_SCORE', pick: 'YES' },
  { id: 'btts_no',  shortLabel: 'NG',    longLabel: 'No Goal',           description: 'One side keeps a clean sheet',  group: 'Both Teams to Score', market: 'BOTH_TEAMS_TO_SCORE', pick: 'NO' },

  // Over/Under Total Goals — multiple thresholds, each with its own opposite
  { id: 'over_15',  shortLabel: 'O 1.5', longLabel: 'Over 1.5 Goals',    description: '2 or more goals total',      group: 'Goals', market: 'OVER_UNDER', marketParam: '1.5', pick: 'OVER' },
  { id: 'under_15', shortLabel: 'U 1.5', longLabel: 'Under 1.5 Goals',   description: '0 or 1 goal total',          group: 'Goals', market: 'OVER_UNDER', marketParam: '1.5', pick: 'UNDER' },
  { id: 'over_25',  shortLabel: 'O 2.5', longLabel: 'Over 2.5 Goals',    description: '3 or more goals total',      group: 'Goals', market: 'OVER_UNDER', marketParam: '2.5', pick: 'OVER' },
  { id: 'under_25', shortLabel: 'U 2.5', longLabel: 'Under 2.5 Goals',   description: '0, 1 or 2 goals total',      group: 'Goals', market: 'OVER_UNDER', marketParam: '2.5', pick: 'UNDER' },
  { id: 'over_35',  shortLabel: 'O 3.5', longLabel: 'Over 3.5 Goals',    description: '4 or more goals total',      group: 'Goals', market: 'OVER_UNDER', marketParam: '3.5', pick: 'OVER' },
  { id: 'under_35', shortLabel: 'U 3.5', longLabel: 'Under 3.5 Goals',   description: '3 or fewer goals total',     group: 'Goals', market: 'OVER_UNDER', marketParam: '3.5', pick: 'UNDER' },
  { id: 'over_45',  shortLabel: 'O 4.5', longLabel: 'Over 4.5 Goals',    description: '5 or more goals total',      group: 'Goals', market: 'OVER_UNDER', marketParam: '4.5', pick: 'OVER' },
  { id: 'under_45', shortLabel: 'U 4.5', longLabel: 'Under 4.5 Goals',   description: '4 or fewer goals total',     group: 'Goals', market: 'OVER_UNDER', marketParam: '4.5', pick: 'UNDER' },

  // First Half — separate markets, separate liquidity, all opposite-pair-matched
  { id: 'fh_home',      shortLabel: '1 (HT)',  longLabel: '1st Half — Home Win', description: 'Home leads at HT',              group: 'First Half', market: 'FIRST_HALF_WINNER', pick: 'HOME' },
  { id: 'fh_draw',      shortLabel: 'X (HT)',  longLabel: '1st Half — Draw',     description: 'Level at HT',                   group: 'First Half', market: 'FIRST_HALF_WINNER', pick: 'DRAW' },
  { id: 'fh_away',      shortLabel: '2 (HT)',  longLabel: '1st Half — Away Win', description: 'Away leads at HT',              group: 'First Half', market: 'FIRST_HALF_WINNER', pick: 'AWAY' },
  { id: 'fh_no_draw',   shortLabel: '12 (HT)', longLabel: '1st Half — No Draw',  description: 'Either side leads at HT',       group: 'First Half', market: 'FIRST_HALF_WINNER', pick: 'DOUBLE_CHANCE' },
  { id: 'fh_btts_yes',  shortLabel: 'GG HT',   longLabel: '1st Half — Both Score', description: 'Both teams score before HT',  group: 'First Half', market: 'FIRST_HALF_BOTH_TEAMS_TO_SCORE', pick: 'YES' },
  { id: 'fh_btts_no',   shortLabel: 'NG HT',   longLabel: '1st Half — No Goal',  description: 'One side blanks before HT',     group: 'First Half', market: 'FIRST_HALF_BOTH_TEAMS_TO_SCORE', pick: 'NO' },
  { id: 'fh_over_05',   shortLabel: 'O 0.5 HT',longLabel: '1st Half — Over 0.5', description: 'At least one goal before HT',   group: 'First Half', market: 'FIRST_HALF_OVER_UNDER', marketParam: '0.5', pick: 'OVER' },
  { id: 'fh_under_05',  shortLabel: 'U 0.5 HT',longLabel: '1st Half — Under 0.5', description: 'No goals before HT',           group: 'First Half', market: 'FIRST_HALF_OVER_UNDER', marketParam: '0.5', pick: 'UNDER' },
  { id: 'fh_over_15',   shortLabel: 'O 1.5 HT',longLabel: '1st Half — Over 1.5', description: '2 or more goals before HT',     group: 'First Half', market: 'FIRST_HALF_OVER_UNDER', marketParam: '1.5', pick: 'OVER' },
  { id: 'fh_under_15',  shortLabel: 'U 1.5 HT',longLabel: '1st Half — Under 1.5', description: '0 or 1 goal before HT',        group: 'First Half', market: 'FIRST_HALF_OVER_UNDER', marketParam: '1.5', pick: 'UNDER' },

  // Second Half winner
  { id: 'sh_home',    shortLabel: '1 (2H)', longLabel: '2nd Half — Home Win',  description: 'Home wins the 2nd half',  group: 'Second Half', market: 'SECOND_HALF_WINNER', pick: 'HOME' },
  { id: 'sh_draw',    shortLabel: 'X (2H)', longLabel: '2nd Half — Draw',      description: '2nd half ends level',     group: 'Second Half', market: 'SECOND_HALF_WINNER', pick: 'DRAW' },
  { id: 'sh_away',    shortLabel: '2 (2H)', longLabel: '2nd Half — Away Win',  description: 'Away wins the 2nd half',  group: 'Second Half', market: 'SECOND_HALF_WINNER', pick: 'AWAY' },
  { id: 'sh_no_draw', shortLabel: '12 (2H)',longLabel: '2nd Half — No Draw',   description: 'Either side wins 2nd half', group: 'Second Half', market: 'SECOND_HALF_WINNER', pick: 'DOUBLE_CHANCE' },
]

export const PICK_GROUPS: PickGroup[] = [
  'Match Result',
  'Double Chance',
  'Both Teams to Score',
  'Goals',
  'First Half',
  'Second Half',
]

// Subset surfaced on the compact homepage row (full set lives on the match detail page).
export const HOMEPAGE_PICK_IDS = ['home', 'draw', 'away', 'btts_yes', 'btts_no', 'over_25', 'under_25']

export const PICK_BY_ID: Map<string, PickOption> = new Map(PICK_OPTIONS.map((p) => [p.id, p]))

export function findPickOption(id: string | undefined): PickOption | undefined {
  if (!id) return undefined
  return PICK_BY_ID.get(id)
}
