import 'dotenv/config'
import './config/env' // validates env at startup — exits on missing vars
import express from 'express'
import { createServer } from 'http'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { SocketEvent } from '@challengers-bet/shared'

import { env } from './config/env'
import { connectDB, disconnectDB } from './db/connection'
import { requestId } from './middleware/requestId'
import { errorHandler } from './middleware/errorHandler'
import { socketAuthMiddleware } from './middleware/socketAuth'
import { socketService } from './services/socket.service'

import healthRouter from './routes/health'
import authRouter from './routes/auth'
import walletRouter from './routes/wallet'
import fixtureRouter from './routes/fixtures'
import challengesRouter from './routes/challenges'
import usersRouter from './routes/users'
import notificationsRouter from './routes/notifications'
import adminRouter from './routes/admin'
import cronRouter from './routes/cron'
import webhooksRouter from './routes/webhooks'

const app = express()
const httpServer = createServer(app)

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())

// Security & logging
app.use(helmet())
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  }),
)
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Request parsing — capture raw body on the request so webhook handlers can verify HMAC signatures
app.use(
  express.json({
    verify: (req, _res, buf) => {
      ;(req as express.Request & { rawBody?: Buffer }).rawBody = buf
    },
  }),
)
app.use(cookieParser())

// Attach request ID first so all downstream middleware can read it
app.use(requestId)

// Routes
app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/wallet', walletRouter)
app.use('/fixtures', fixtureRouter)
app.use('/challenges', challengesRouter)
app.use('/users', usersRouter)
app.use('/notifications', notificationsRouter)
app.use('/admin', adminRouter)
app.use('/cron', cronRouter)
app.use('/webhooks', webhooksRouter)

// Global error handler — must be last
app.use(errorHandler)

async function start(): Promise<void> {
  await connectDB()

  // Redis clients for Socket.IO adapter
  const pubClient = new Redis(env.REDIS_URL)
  const subClient = pubClient.duplicate()

  pubClient.on('error', (err: unknown) => console.error('[Redis pub] error:', err))
  subClient.on('error', (err: unknown) => console.error('[Redis sub] error:', err))

  // Socket.IO server
  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  })

  io.adapter(createAdapter(pubClient, subClient))

  // Make io accessible to services
  app.set('io', io)
  socketService.setApp(app)

  // Socket auth middleware
  io.use(socketAuthMiddleware)

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(`user:${userId}`)

    socket.on(SocketEvent.LEAVE_USER_ROOM, () => {
      socket.leave(`user:${userId}`)
    })

    socket.on('disconnect', () => {
      // cleanup handled by socket.io
    })
  })

  httpServer.listen(env.PORT, () => {
    console.log(`API server listening on port ${env.PORT}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully')
  await disconnectDB()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received — shutting down gracefully')
  await disconnectDB()
  process.exit(0)
})

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
