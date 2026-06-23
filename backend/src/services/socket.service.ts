import { Application } from 'express'
import { Server as SocketServer } from 'socket.io'
import { SocketEventValue } from '@challengers-bet/shared'

let _app: Application | null = null

class SocketService {
  setApp(app: Application) {
    _app = app
  }

  private get io(): SocketServer | null {
    if (!_app) return null
    return _app.get('io') as SocketServer | null
  }

  emit(room: string, event: SocketEventValue, data: unknown): void {
    const io = this.io
    if (!io) return
    io.to(room).emit(event, data)
  }

  emitToUser(userId: string, event: SocketEventValue, data: unknown): void {
    this.emit(`user:${userId}`, event, data)
  }
}

export const socketService = new SocketService()
