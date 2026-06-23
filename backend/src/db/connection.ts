import mongoose from 'mongoose'
import { env } from '../config/env'

export async function connectDB(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected')
  })
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err)
  })
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected')
  })

  await mongoose.connect(env.DATABASE_URL)
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  console.log('MongoDB connection closed')
}
