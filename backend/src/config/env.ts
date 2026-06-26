import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(5),
  MIN_STAKE: z.coerce.number().default(2),
  MAX_STAKE: z.coerce.number(),
  MIN_DEPOSIT: z.coerce.number(),
  MIN_WITHDRAWAL: z.coerce.number(),
  WITHDRAWAL_REVIEW_THRESHOLD: z.coerce.number(),
  FOOTBALL_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PAYRAM_API_URL: z.string().url().default('http://localhost:7000'),
  PAYRAM_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  // Optional. Set to e.g. `.xpunt24.com` in production so the auth cookie is visible to
  // both api.xpunt24.com (backend) and xpunt24.com (frontend). Leave unset in dev.
  COOKIE_DOMAIN: z.string().optional(),

  // Email + frontend link config
  EMAIL_FROM: z.string().email().default('noreply@xpunt24.local'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Email provider (one of these must be configured in production)
  RESEND_API_KEY: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),

  // Password + token policy
  PASSWORD_HASH_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  EMAIL_VERIFY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
