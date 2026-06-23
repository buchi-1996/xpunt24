"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerEntryType = void 0;
var LedgerEntryType;
(function (LedgerEntryType) {
    LedgerEntryType["DEPOSIT"] = "DEPOSIT";
    LedgerEntryType["WITHDRAWAL"] = "WITHDRAWAL";
    LedgerEntryType["WITHDRAWAL_REVERSAL"] = "WITHDRAWAL_REVERSAL";
    LedgerEntryType["WAGER_STAKE"] = "WAGER_STAKE";
    LedgerEntryType["WAGER_WIN"] = "WAGER_WIN";
    LedgerEntryType["WAGER_REFUND"] = "WAGER_REFUND";
    LedgerEntryType["PLATFORM_FEE"] = "PLATFORM_FEE";
    LedgerEntryType["ADMIN_CREDIT"] = "ADMIN_CREDIT";
    LedgerEntryType["ADMIN_DEBIT"] = "ADMIN_DEBIT";
})(LedgerEntryType || (exports.LedgerEntryType = LedgerEntryType = {}));
