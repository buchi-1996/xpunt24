import rateLimit from 'express-rate-limit'

// Strict per-IP limiter for endpoints where the attacker is trying to brute force.
// Login, verify-email, reset-password. 10 per 15 min per IP.
export const authStrict = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

// Per-IP limiter for endpoints that dispatch an email.
// Register, resend-verification, request-password-reset. 10 per hour per IP.
export const emailDispatch = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})
