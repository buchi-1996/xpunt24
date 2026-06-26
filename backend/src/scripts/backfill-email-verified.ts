/**
 * One-shot migration: backfill `emailVerified` for all existing Google-authenticated users.
 *
 * Why: until the email/password rollout, the Google OAuth callback never set `emailVerified`.
 * Without this backfill, the new `requireVerifiedEmail` middleware would lock every existing
 * Google user out of deposits and wagering until they re-verified their email.
 *
 * Sets emailVerified = createdAt for any user that has a googleId and no existing
 * emailVerified date. Idempotent.
 *
 * Run with: pnpm --filter backend exec tsx src/scripts/backfill-email-verified.ts
 */
import { connectDB, disconnectDB } from '../db/connection'
import { User } from '../db/models/user.model'

async function main(): Promise<void> {
  await connectDB()
  const candidates = await User.find({
    googleId: { $exists: true, $ne: null },
    emailVerified: { $in: [null, undefined] },
  }).select('_id createdAt')

  console.log(`[backfill] found ${candidates.length} Google users without emailVerified`)

  let updated = 0
  for (const u of candidates) {
    await User.updateOne({ _id: u._id }, { $set: { emailVerified: u.createdAt } })
    updated++
  }

  console.log(`[backfill] set emailVerified on ${updated} users`)
  await disconnectDB()
}

main().catch((err) => {
  console.error('[backfill] failed:', err)
  process.exit(1)
})
