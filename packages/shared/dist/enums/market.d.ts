export declare enum Market {
    MATCH_WINNER = "MATCH_WINNER",
    BOTH_TEAMS_TO_SCORE = "BOTH_TEAMS_TO_SCORE",
    OVER_UNDER = "OVER_UNDER",
    ASIAN_HANDICAP = "ASIAN_HANDICAP",
    CORRECT_SCORE = "CORRECT_SCORE",
    FIRST_GOAL_SCORER = "FIRST_GOAL_SCORER",
    DOUBLE_CHANCE = "DOUBLE_CHANCE"
}
export declare enum Pick {
    HOME = "HOME",
    AWAY = "AWAY",
    DRAW = "DRAW",
    YES = "YES",
    NO = "NO",
    OVER = "OVER",
    UNDER = "UNDER",
    DOUBLE_CHANCE = "DOUBLE_CHANCE"
}
export declare const OPPOSITE_PICK_MAP: Partial<Record<Pick, Pick>>;
