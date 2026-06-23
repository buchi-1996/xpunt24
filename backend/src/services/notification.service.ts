import { Types } from 'mongoose'
import { SocketEvent } from '@challengers-bet/shared'
import { Notification, NotificationType } from '../db/models/notification.model'
import { paginationParams, paginatedResponse } from '../utils/paginate'
import { AppError } from '../utils/AppError'
import { socketService } from './socket.service'

class NotificationService {
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await Notification.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      body,
      data,
    })

    socketService.emitToUser(userId, SocketEvent.NOTIFICATION_NEW, notification.toObject())
    return notification
  }

  async getUserNotifications(userId: string, query: Record<string, unknown>) {
    const { skip, limit, page } = paginationParams(query)
    const userObjectId = new Types.ObjectId(userId)

    const [notifications, total] = await Promise.all([
      Notification.find({ userId: userObjectId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ userId: userObjectId }),
    ])

    return paginatedResponse(notifications, total, page, limit)
  }

  async markRead(id: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { read: true },
      { new: true },
    )
    if (!notification) throw new AppError('Notification not found', 404)
    return notification
  }

  async markAllRead(userId: string) {
    await Notification.updateMany({ userId: new Types.ObjectId(userId), read: false }, { read: true })
  }
}

export const notificationService = new NotificationService()
