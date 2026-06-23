"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WagerResult = exports.WagerStatus = void 0;
var WagerStatus;
(function (WagerStatus) {
    WagerStatus["PENDING"] = "PENDING";
    WagerStatus["ACTIVE"] = "ACTIVE";
    WagerStatus["WON"] = "WON";
    WagerStatus["LOST"] = "LOST";
    WagerStatus["CANCELLED"] = "CANCELLED";
    WagerStatus["DISPUTED"] = "DISPUTED";
    WagerStatus["REFUNDED"] = "REFUNDED";
})(WagerStatus || (exports.WagerStatus = WagerStatus = {}));
var WagerResult;
(function (WagerResult) {
    WagerResult["WIN"] = "WIN";
    WagerResult["LOSS"] = "LOSS";
    WagerResult["VOID"] = "VOID";
    WagerResult["PUSH"] = "PUSH";
})(WagerResult || (exports.WagerResult = WagerResult = {}));
