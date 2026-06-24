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
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
