"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeVisibility = exports.ChallengeStatus = void 0;
var ChallengeStatus;
(function (ChallengeStatus) {
    ChallengeStatus["OPEN"] = "OPEN";
    ChallengeStatus["MATCHED"] = "MATCHED";
    ChallengeStatus["LOCKED"] = "LOCKED";
    ChallengeStatus["SETTLED"] = "SETTLED";
    ChallengeStatus["CANCELLED"] = "CANCELLED";
    ChallengeStatus["DISPUTED"] = "DISPUTED";
    ChallengeStatus["EXPIRED"] = "EXPIRED";
})(ChallengeStatus || (exports.ChallengeStatus = ChallengeStatus = {}));
var ChallengeVisibility;
(function (ChallengeVisibility) {
    ChallengeVisibility["PUBLIC"] = "PUBLIC";
    ChallengeVisibility["PRIVATE"] = "PRIVATE";
})(ChallengeVisibility || (exports.ChallengeVisibility = ChallengeVisibility = {}));
