import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client';
import type { NotificationType } from '../../generated/prisma/enums';
import { PrismaService } from '../database/prisma/prisma.service';
import type { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}

const NOTIFICATION_EVENT = 'notification:new';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: input,
    });
    this.gateway.emitToUser(input.userId, NOTIFICATION_EVENT, notification);
    return notification;
  }

  async findAllForUser(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { items, page, limit, total };
  }

  getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    if (notification.userId !== userId) throw new ForbiddenException();

    if (notification.isRead) return notification;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async broadcast(dto: BroadcastNotificationDto) {
    const userIds = dto.toAll
      ? (
          await this.prisma.user.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true },
          })
        ).map((u) => u.id)
      : (dto.userIds ?? []);

    if (userIds.length === 0) return { count: 0 };

    const created = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        userId,
        type: 'SYSTEM',
        title: dto.title,
        message: dto.message,
      })),
    });

    for (const notification of created) {
      this.gateway.emitToUser(
        notification.userId,
        NOTIFICATION_EVENT,
        notification,
      );
    }

    return { count: created.length };
  }
}
