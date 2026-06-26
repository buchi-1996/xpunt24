'use client'

import { z } from 'zod'

// Keep client and server password rules in lockstep: min 10, max 128.
const passwordField = z
  .string()
  .min(10, { message: 'Password must be at least 10 characters' })
  .max(128, { message: 'Password is too long' })

const emailField = z.string().email({ message: 'Please enter a valid email address' })

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(80, { message: 'Name is too long' }),
  email: emailField,
  password: passwordField,
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: 'Enter your password' }).max(128),
})

export const requestResetSchema = z.object({
  email: emailField,
})

export const resetSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

// Legacy prototype schema kept around because `app/(landing)/dashboard/page.tsx` still
// imports it. The real account UI lives in /profile + /settings now; this can be deleted
// once that page is removed.
export const updateProfileSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  gender: z.enum(['Male', 'Female']),
  bio: z.string().max(160),
  avatar: z.string(),
})

export type RegisterValues = z.infer<typeof registerSchema>
export type LoginValues = z.infer<typeof loginSchema>
export type RequestResetValues = z.infer<typeof requestResetSchema>
export type ResetValues = z.infer<typeof resetSchema>
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>
