import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../database/prisma/prisma.service';

// Room chung để mọi admin đều nhận được sự kiện realtime (tin nhắn chat mới từ
// bất kỳ khách nào) — khớp thiết kế "admin nào cũng thấy và trả lời được".
const ADMIN_ROOM = 'admins';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Thiếu token');

      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.isActive || user.deletedAt) {
        throw new Error('Tài khoản không còn hiệu lực');
      }

      await client.join(`user:${user.id}`);
      if (user.role === 'ADMIN') {
        await client.join(ADMIN_ROOM);
      }
    } catch (err) {
      this.logger.warn(`Kết nối WS bị từ chối: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect() {}

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToAdmins(event: string, payload: unknown) {
    this.server.to(ADMIN_ROOM).emit(event, payload);
  }
}
