"use client"

import { z } from "zod"

export const registerSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be atleast 2 characters."
  }).max(50),
  email: z.string().email({
    message: "Please enter a valid email address"
  }),
  password: z.string().min(6, {
    message: "Password must be atleast 6 characters."
  })
})


export const loginSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be atleast 2 characters."
  }).max(50),
  password: z.string().min(6, {
    message: "Password must be atleast 6 characters."
  })
})

export const updateProfileSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be atleast 2 characters."
  }).max(50),
  email: z.string().email({
    message: "Please enter a valid email address"
  }),
  gender: z.enum(["Male", "Female"], {
    message: "Invalid gender selection"
  }),
  bio: z.string().max(160, {
    message: "Bio must be less than 160 characters."
  }),
  avatar: z.string().url({
    message: "Please enter a valid URL"
  })
})

