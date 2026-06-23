"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPPOSITE_PICK_MAP = exports.Pick = exports.Market = void 0;
var Market;
(function (Market) {
    Market["MATCH_WINNER"] = "MATCH_WINNER";
    Market["BOTH_TEAMS_TO_SCORE"] = "BOTH_TEAMS_TO_SCORE";
    Market["OVER_UNDER"] = "OVER_UNDER";
    Market["ASIAN_HANDICAP"] = "ASIAN_HANDICAP";
    Market["CORRECT_SCORE"] = "CORRECT_SCORE";
    Market["FIRST_GOAL_SCORER"] = "FIRST_GOAL_SCORER";
    Market["DOUBLE_CHANCE"] = "DOUBLE_CHANCE";
})(Market || (exports.Market = Market = {}));
var Pick;
(function (Pick) {
    Pick["HOME"] = "HOME";
    Pick["AWAY"] = "AWAY";
    Pick["DRAW"] = "DRAW";
    Pick["YES"] = "YES";
    Pick["NO"] = "NO";
    Pick["OVER"] = "OVER";
    Pick["UNDER"] = "UNDER";
    Pick["DOUBLE_CHANCE"] = "DOUBLE_CHANCE";
})(Pick || (exports.Pick = Pick = {}));
exports.OPPOSITE_PICK_MAP = {
    [Pick.HOME]: Pick.AWAY,
    [Pick.AWAY]: Pick.HOME,
    [Pick.YES]: Pick.NO,
    [Pick.NO]: Pick.YES,
    [Pick.OVER]: Pick.UNDER,
    [Pick.UNDER]: Pick.OVER,
    [Pick.DRAW]: Pick.DOUBLE_CHANCE,
};
