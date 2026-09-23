import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface ApiBody<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number };
}

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-chat-user-${suffix}@vivugo.vn`;
  const adminEmail = `e2e-chat-admin-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';

  let userToken: string;
  let adminToken: string;
  let conversationId: string;

  const api = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Chat User',
        role: 'USER',
      },
    });
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Chat Admin',
        role: 'ADMIN',
      },
    });

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as ApiBody<{ accessToken: string }>).data.accessToken;
    };
    userToken = await login(userEmail);
    adminToken = await login(adminEmail);
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.chatMessage.deleteMany({ where: { conversationId } });
      await prisma.chatConversation.deleteMany({
        where: { id: conversationId },
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [userEmail, adminEmail] } },
    });
    await app.close();
  });

  it('user tải hội thoại lần đầu sẽ tự tạo, danh sách tin nhắn trống', async () => {
    const res = await api()
      .get('/api/chat/messages')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<{
      conversation: { id: string; status: string };
      messages: unknown[];
    }>;
    expect(body.data.conversation.status).toBe('OPEN');
    expect(body.data.messages).toEqual([]);
    conversationId = body.data.conversation.id;
  });

  it('user gửi tin nhắn thành công', async () => {
    const res = await api()
      .post('/api/chat/messages')
      .set(auth(userToken))
      .send({ message: 'Xin chao, toi can ho tro' })
      .expect(201);
    const body = res.body as ApiBody<{ message: string; isRead: boolean }>;
    expect(body.data.message).toBe('Xin chao, toi can ho tro');
    expect(body.data.isRead).toBe(false);
  });

  it('user thường không gọi được route admin (403)', async () => {
    await api()
      .get('/api/chat/admin/conversations')
      .set(auth(userToken))
      .expect(403);
  });

  // Lưu ý: có thể có thêm tin chào tự động từ bot (xem "Chat auto-reply"
  // describe bên dưới) nếu test chạy ngoài giờ hành chính — bot không tính
  // vào unreadCount (chỉ đếm tin từ khách) nên các assert dưới vẫn đúng, chỉ
  // tránh check length/vị trí tuyệt đối của mảng messages.
  it('admin thấy hội thoại trong danh sách với unreadCount đúng', async () => {
    const res = await api()
      .get('/api/chat/admin/conversations')
      .set(auth(adminToken))
      .expect(200);
    const body = res.body as ApiBody<{ id: string; unreadCount: number }[]>;
    const found = body.data.find((c) => c.id === conversationId);
    expect(found).toBeDefined();
    expect(found?.unreadCount).toBe(1);
  });

  it('admin tải tin nhắn hội thoại sẽ tự đánh dấu đã đọc', async () => {
    const res = await api()
      .get(`/api/chat/admin/conversations/${conversationId}/messages`)
      .set(auth(adminToken))
      .expect(200);
    const body = res.body as ApiBody<{
      messages: { message: string; isRead: boolean }[];
    }>;
    const userMessage = body.data.messages.find(
      (m) => m.message === 'Xin chao, toi can ho tro',
    );
    expect(userMessage?.isRead).toBe(true);

    const listRes = await api()
      .get('/api/chat/admin/conversations')
      .set(auth(adminToken))
      .expect(200);
    const listBody = listRes.body as ApiBody<
      { id: string; unreadCount: number }[]
    >;
    expect(
      listBody.data.find((c) => c.id === conversationId)?.unreadCount,
    ).toBe(0);
  });

  it('admin trả lời: tạo tin nhắn + sinh thông báo CHAT cho khách', async () => {
    const res = await api()
      .post(`/api/chat/admin/conversations/${conversationId}/messages`)
      .set(auth(adminToken))
      .send({ message: 'Chao ban, VivuGo ho tro day' })
      .expect(201);
    expect((res.body as ApiBody<{ message: string }>).data.message).toBe(
      'Chao ban, VivuGo ho tro day',
    );

    const notiRes = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const notiBody = notiRes.body as ApiBody<
      { type: string; data: { conversationId: string } }[]
    >;
    const found = notiBody.data.find(
      (n) => n.type === 'CHAT' && n.data?.conversationId === conversationId,
    );
    expect(found).toBeDefined();
  });

  it('user tải lại hội thoại: thấy tin admin trả lời và tự đánh dấu đã đọc', async () => {
    const res = await api()
      .get('/api/chat/messages')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<{
      messages: { message: string; isRead: boolean }[];
    }>;
    const adminReply = body.data.messages.find(
      (m) => m.message === 'Chao ban, VivuGo ho tro day',
    );
    expect(adminReply?.isRead).toBe(true);

    const unreadRes = await api()
      .get('/api/chat/unread-count')
      .set(auth(userToken))
      .expect(200);
    expect((unreadRes.body as ApiBody<{ count: number }>).data.count).toBe(0);
  });

  it('admin đóng hội thoại: không gửi thêm được tin nhắn (400)', async () => {
    await api()
      .patch(`/api/chat/admin/conversations/${conversationId}/close`)
      .set(auth(adminToken))
      .expect(200);

    await api()
      .post(`/api/chat/admin/conversations/${conversationId}/messages`)
      .set(auth(adminToken))
      .send({ message: 'Sau khi dong' })
      .expect(400);
  });

  it('user nhắn tiếp sau khi hội thoại cũ bị đóng sẽ tạo hội thoại OPEN mới', async () => {
    const res = await api()
      .get('/api/chat/messages')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<{
      conversation: { id: string; status: string };
    }>;
    expect(body.data.conversation.status).toBe('OPEN');
    expect(body.data.conversation.id).not.toBe(conversationId);

    // Dọn luôn hội thoại mới này để không sót lại sau khi test kết thúc.
    await prisma.chatMessage.deleteMany({
      where: { conversationId: body.data.conversation.id },
    });
    await prisma.chatConversation.deleteMany({
      where: { id: body.data.conversation.id },
    });
  });
});

describe('Chat auto-reply (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-chat-auto-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';

  let userToken: string;
  let conversationId: string;

  const api = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    // Không phụ thuộc `npm run db:seed` — tự đảm bảo có tài khoản bot.
    await prisma.user.upsert({
      where: { email: 'bot@vivugo.vn' },
      update: {},
      create: {
        email: 'bot@vivugo.vn',
        passwordHash: await argon2.hash(randomUUID()),
        fullName: 'VivuGo',
        role: 'ADMIN',
      },
    });

    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Chat Auto',
        role: 'USER',
      },
    });

    const login = await api()
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    userToken = (login.body as ApiBody<{ accessToken: string }>).data
      .accessToken;
  });

  afterAll(async () => {
    if (conversationId) {
      await prisma.chatMessage.deleteMany({ where: { conversationId } });
      await prisma.chatConversation.deleteMany({
        where: { id: conversationId },
      });
    }
    await prisma.user.deleteMany({ where: { email: userEmail } });
    await app.close();
  });

  it('tin đầu tiên của hội thoại mới luôn nhận được tin chào tự động từ bot', async () => {
    // Tái hiện đúng luồng UI thật: widget gọi GET để mở khung chat (tạo sẵn
    // hội thoại rỗng) TRƯỚC KHI khách gõ và gửi tin đầu tiên. Đây chính xác
    // là kịch bản từng làm auto-reply không kích hoạt (isNewConversation sai)
    // trước khi sửa sang đếm số tin nhắn đã có (isFirstMessage).
    await api().get('/api/chat/messages').set(auth(userToken)).expect(200);

    await api()
      .post('/api/chat/messages')
      .set(auth(userToken))
      .send({ message: 'Tin nhan dau tien' })
      .expect(201);

    const res = await api()
      .get('/api/chat/messages')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<{
      conversation: { id: string };
      messages: { senderId: string; message: string }[];
    }>;
    conversationId = body.data.conversation.id;

    expect(body.data.messages).toHaveLength(2);
    expect(body.data.messages[0].message).toBe('Tin nhan dau tien');
    expect(body.data.messages[1].message).toContain(
      'Cảm ơn bạn đã liên hệ VivuGo',
    );
    expect(body.data.messages[1].senderId).not.toBe(
      body.data.messages[0].senderId,
    );
  });

  it('tin nhắn tiếp theo trong cùng hội thoại không lặp lại tin chào', async () => {
    await api()
      .post('/api/chat/messages')
      .set(auth(userToken))
      .send({ message: 'Tin nhan thu hai' })
      .expect(201);

    const res = await api()
      .get('/api/chat/messages')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<{ messages: { message: string }[] }>;

    expect(body.data.messages).toHaveLength(3);
    expect(
      body.data.messages.filter((m) =>
        m.message.includes('Cảm ơn bạn đã liên hệ VivuGo'),
      ),
    ).toHaveLength(1);
  });
});
