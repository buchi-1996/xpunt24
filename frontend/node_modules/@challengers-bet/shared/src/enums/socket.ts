export const SocketEvent = {
  // Challenge events
  CHALLENGE_CREATED: 'challenge:created',
  CHALLENGE_MATCHED: 'challenge:matched',
  CHALLENGE_SETTLED: 'challenge:settled',
  CHALLENGE_CANCELLED: 'challenge:cancelled',

  // Wager events
  WAGER_UPDATED: 'wager:updated',

  // Wallet events
  WALLET_BALANCE_UPDATED: 'wallet:balance_updated',
  DEPOSIT_UPDATED: 'wallet:deposit_updated',
  DEPOSIT_CONFIRMED: 'wallet:deposit_confirmed',
  WITHDRAWAL_PROCESSED: 'wallet:withdrawal_processed',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',

  // Connection events
  JOIN_USER_ROOM: 'join:user_room',
  LEAVE_USER_ROOM: 'leave:user_room',
} as const

export type SocketEventKey = keyof typeof SocketEvent
export type SocketEventValue = (typeof SocketEvent)[SocketEventKey]
