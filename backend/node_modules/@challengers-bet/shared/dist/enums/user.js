"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["BETTOR"] = "BETTOR";
    UserRole["MODERATOR"] = "MODERATOR";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "ACTIVE";
    AccountStatus["SUSPENDED"] = "SUSPENDED";
    AccountStatus["BANNED"] = "BANNED";
    AccountStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    AccountStatus["CLOSED"] = "CLOSED";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
