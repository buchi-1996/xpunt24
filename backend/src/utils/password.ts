import bcrypt from 'bcryptjs'
import { env } from '../config/env'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.PASSWORD_HASH_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // bcrypt.compare is constant-time relative to the hash length.
  return bcrypt.compare(plain, hash)
}
