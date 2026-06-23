export declare const SocketEvent: {
    readonly CHALLENGE_CREATED: "challenge:created";
    readonly CHALLENGE_MATCHED: "challenge:matched";
    readonly CHALLENGE_SETTLED: "challenge:settled";
    readonly CHALLENGE_CANCELLED: "challenge:cancelled";
    readonly WAGER_UPDATED: "wager:updated";
    readonly WALLET_BALANCE_UPDATED: "wallet:balance_updated";
    readonly DEPOSIT_UPDATED: "wallet:deposit_updated";
    readonly DEPOSIT_CONFIRMED: "wallet:deposit_confirmed";
    readonly WITHDRAWAL_PROCESSED: "wallet:withdrawal_processed";
    readonly NOTIFICATION_NEW: "notification:new";
    readonly JOIN_USER_ROOM: "join:user_room";
    readonly LEAVE_USER_ROOM: "leave:user_room";
};
export type SocketEventKey = keyof typeof SocketEvent;
export type SocketEventValue = (typeof SocketEvent)[SocketEventKey];
