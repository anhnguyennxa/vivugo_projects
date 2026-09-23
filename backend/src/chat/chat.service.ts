import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { QueryChatConversationsDto } from './dto/query-chat-conversations.dto';
import type { SendMessageDto } from './dto/send-message.dto';

const CHAT_MESSAGE_EVENT = 'chat:message';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
} as const;

function truncate(text: string, max = 120) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Tài khoản hệ thống đại diện cho tin nhắn chào tự động (xem prisma/seed.ts).
const BOT_EMAIL = 'bot@vivugo.vn';
const BUSINESS_HOURS_START = 8;
const BUSINESS_HOURS_END = 21;
const AUTO_REPLY_MESSAGE =
  'Cảm ơn bạn đã liên hệ VivuGo! Đội ngũ hỗ trợ làm việc từ 8:00–21:00 hàng ngày và sẽ phản hồi bạn sớm nhất có thể.';

function isOutsideBusinessHours(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date()),
  );
  return hour < BUSINESS_HOURS_START || hour >= BUSINESS_HOURS_END;
}

@Injectable()
export class ChatService {
  private botUserId: string | null | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  private async getOrCreateOpenConversation(userId: string) {
    const existing = await this.prisma.chatConversation.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    return this.prisma.chatConversation.create({ data: { userId } });
  }

  private async getBotUserId(): Promise<string | null> {
    if (this.botUserId !== undefined) return this.botUserId;
    const bot = await this.prisma.user.findUnique({
      where: { email: BOT_EMAIL },
    });
    this.botUserId = bot?.id ?? null;
    return this.botUserId;
  }

  // Gửi tin nhắn chào tự động tối đa 1 lần/hội thoại, khi đây là tin nhắn đầu
  // tiên của khách trong hội thoại hoặc khi nhắn ngoài giờ hành chính. Im lặng
  // bỏ qua nếu chưa seed tài khoản bot (xem prisma/seed.ts) — không chặn luồng
  // chat chính.
  private async maybeSendAutoReply(
    conversationId: string,
    isFirstMessage: boolean,
  ) {
    if (!isFirstMessage && !isOutsideBusinessHours()) return;

    const botUserId = await this.getBotUserId();
    if (!botUserId) return;

    const alreadyReplied = await this.prisma.chatMessage.count({
      where: { conversationId, senderId: botUserId },
    });
    if (alreadyReplied > 0) return;

    const botMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: botUserId,
        message: AUTO_REPLY_MESSAGE,
      },
    });
    const conversation = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.gateway.emitToUser(conversation.userId, CHAT_MESSAGE_EVENT, {
      conversationId,
      message: botMessage,
    });
  }

  async getMyMessages(userId: string) {
    const conversation = await this.getOrCreateOpenConversation(userId);

    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    return { conversation, messages };
  }

  async sendMyMessage(userId: string, dto: SendMessageDto) {
    const conversation = await this.getOrCreateOpenConversation(userId);

    const existingCount = await this.prisma.chatMessage.count({
      where: { conversationId: conversation.id },
    });
    const isFirstMessage = existingCount === 0;

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        message: dto.message,
      },
    });
    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    this.gateway.emitToUser(userId, CHAT_MESSAGE_EVENT, {
      conversationId: conversation.id,
      message,
    });
    this.gateway.emitToAdmins(CHAT_MESSAGE_EVENT, {
      conversationId: conversation.id,
      message,
    });

    await this.maybeSendAutoReply(conversation.id, isFirstMessage);

    return message;
  }

  getMyUnreadCount(userId: string) {
    return this.prisma.chatMessage.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: { userId },
      },
    });
  }

  // ----- Phía admin -----

  async listConversations(query: QueryChatConversationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatConversation.findMany({
        where,
        include: {
          user: { select: USER_SELECT },
          messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    // Đếm tin chưa đọc từ khách theo từng hội thoại — không dùng được _count vì
    // cần so sánh senderId với userId của chính hội thoại đó (Prisma không hỗ
    // trợ so sánh 2 cột liên quan trong 1 query where tĩnh).
    const itemsWithUnread = await Promise.all(
      items.map(async ({ messages, ...conversation }) => {
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: conversation.userId,
            isRead: false,
          },
        });
        return {
          ...conversation,
          lastMessage: messages[0] ?? null,
          unreadCount,
        };
      }),
    );

    return { items: itemsWithUnread, page, limit, total };
  }

  async getConversationMessages(conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { user: { select: USER_SELECT } },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');

    await this.prisma.chatMessage.updateMany({
      where: { conversationId, senderId: conversation.userId, isRead: false },
      data: { isRead: true },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return { conversation, messages };
  }

  async sendAdminMessage(
    admin: RequestUser,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');
    if (conversation.status === 'CLOSED') {
      throw new BadRequestException(
        'Hội thoại đã đóng, không thể gửi thêm tin nhắn',
      );
    }

    const message = await this.prisma.chatMessage.create({
      data: { conversationId, senderId: admin.id, message: dto.message },
    });
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        adminId: conversation.adminId ?? admin.id,
      },
    });

    this.gateway.emitToUser(conversation.userId, CHAT_MESSAGE_EVENT, {
      conversationId,
      message,
    });
    this.gateway.emitToAdmins(CHAT_MESSAGE_EVENT, { conversationId, message });

    await this.notifications.create({
      userId: conversation.userId,
      type: 'CHAT',
      title: 'Tin nhắn mới từ VivuGo',
      message: truncate(dto.message),
      data: { conversationId },
    });

    return message;
  }

  async closeConversation(conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy hội thoại');

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });
  }

  async getAdminUnreadCount() {
    const openConversations = await this.prisma.chatConversation.findMany({
      where: { status: 'OPEN' },
      select: { id: true, userId: true },
    });
    if (openConversations.length === 0) return 0;

    const counts = await Promise.all(
      openConversations.map((c) =>
        this.prisma.chatMessage.count({
          where: { conversationId: c.id, senderId: c.userId, isRead: false },
        }),
      ),
    );
    return counts.reduce((sum, c) => sum + c, 0);
  }
}
