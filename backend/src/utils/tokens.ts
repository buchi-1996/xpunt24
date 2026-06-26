import crypto from 'crypto'

// 32 bytes of crypto-random entropy (256 bits). Base64url-encoded for URL-safety.
export function generatePlaintextToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

// SHA-256 is sufficient here — the input already has 256 bits of entropy, so brute force
// is infeasible regardless of hash cost. Using bcrypt would needlessly slow /verify-email
// and /reset-password endpoints. This is the same pattern NextAuth / Supabase use.
export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex')
}
