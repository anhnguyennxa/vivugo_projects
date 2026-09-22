import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
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

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-noti-user-${suffix}@vivugo.vn`;
  const otherEmail = `e2e-noti-other-${suffix}@vivugo.vn`;
  const adminEmail = `e2e-noti-admin-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  const broadcastTitle = `E2E broadcast ${suffix}`;

  let userToken: string;
  let otherToken: string;
  let adminToken: string;
  let userId: string;
  let tourId: string;
  let departureId: string;

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
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Noti User',
        role: 'USER',
      },
    });
    await prisma.user.create({
      data: {
        email: otherEmail,
        passwordHash,
        fullName: 'E2E Noti Other',
        role: 'USER',
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Noti Admin',
        role: 'ADMIN',
      },
    });
    userId = user.id;

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as ApiBody<{ accessToken: string }>).data.accessToken;
    };
    userToken = await login(userEmail);
    otherToken = await login(otherEmail);
    adminToken = await login(adminEmail);

    const category = await prisma.category.create({
      data: { name: 'E2E Noti Category', slug: `e2e-noti-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: `E2E Noti Tour ${suffix}`,
        slug: `e2e-noti-tour-${suffix}`,
        categoryId: category.id,
        description:
          'Mo ta hop le voi tren hai muoi ky tu cho tour kiem thu thong bao',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        departureCity: 'HO_CHI_MINH',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1500000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-noti/400',
        status: 'PUBLISHED',
        createdById: admin.id,
      },
    });
    tourId = tour.id;

    const departure = await prisma.departure.create({
      data: {
        tourId,
        departureDate: new Date(Date.now() + 10 * 86400000),
        returnDate: new Date(Date.now() + 11 * 86400000),
        totalSlots: 20,
        bookedSlots: 0,
      },
    });
    departureId = departure.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { title: broadcastTitle } });
    if (tourId) {
      await prisma.booking.deleteMany({ where: { tourId } });
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({
      where: { slug: `e2e-noti-cat-${suffix}` },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [userEmail, otherEmail, adminEmail] } },
    });
    await app.close();
  });

  it('danh sách thông báo trống khi chưa có gì', async () => {
    const res = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<unknown[]>;
    expect(body.data).toEqual([]);
    expect(body.meta?.total).toBe(0);
  });

  it('đơn đổi trạng thái tự sinh thông báo BOOKING_UPDATE cho đúng chủ đơn', async () => {
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId,
        departureId,
        numAdults: 1,
        totalPrice: 1500000,
        contactName: 'Khach Noti',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: `E2ENOTI${suffix}A`,
        status: 'PENDING',
        payment: {
          create: { provider: 'VNPAY', amount: 1500000, status: 'PENDING' },
        },
      },
    });

    await api()
      .patch(`/api/bookings/${booking.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'CONFIRMED' })
      .expect(200);

    const res = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const body = res.body as ApiBody<
      {
        type: string;
        title: string;
        isRead: boolean;
        data: { bookingId: string };
      }[]
    >;
    const found = body.data.find((n) => n.data?.bookingId === booking.id);
    expect(found).toBeDefined();
    expect(found?.type).toBe('BOOKING_UPDATE');
    expect(found?.isRead).toBe(false);

    // Người dùng khác không thấy thông báo của người này.
    const otherRes = await api()
      .get('/api/notifications')
      .set(auth(otherToken))
      .expect(200);
    const otherBody = otherRes.body as ApiBody<
      { data: { bookingId: string } }[]
    >;
    expect(
      otherBody.data.find((n) => n.data?.bookingId === booking.id),
    ).toBeUndefined();
  });

  it('unread-count và đánh dấu đã đọc từng cái / tất cả', async () => {
    const unreadBefore = await api()
      .get('/api/notifications/unread-count')
      .set(auth(userToken))
      .expect(200);
    const countBefore = (unreadBefore.body as ApiBody<{ count: number }>).data
      .count;
    expect(countBefore).toBeGreaterThan(0);

    const list = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const items = (list.body as ApiBody<{ id: string; isRead: boolean }[]>)
      .data;
    const target = items[0];

    await api()
      .patch(`/api/notifications/${target.id}/read`)
      .set(auth(userToken))
      .expect(200);

    const afterOne = await api()
      .get('/api/notifications/unread-count')
      .set(auth(userToken))
      .expect(200);
    expect((afterOne.body as ApiBody<{ count: number }>).data.count).toBe(
      countBefore - 1,
    );

    await api()
      .patch('/api/notifications/read-all')
      .set(auth(userToken))
      .expect(200);

    const afterAllRead = await api()
      .get('/api/notifications/unread-count')
      .set(auth(userToken))
      .expect(200);
    expect((afterAllRead.body as ApiBody<{ count: number }>).data.count).toBe(
      0,
    );
  });

  it('không cho đánh dấu đã đọc thông báo của người khác (403)', async () => {
    const list = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const items = (list.body as ApiBody<{ id: string }[]>).data;
    expect(items.length).toBeGreaterThan(0);

    await api()
      .patch(`/api/notifications/${items[0].id}/read`)
      .set(auth(otherToken))
      .expect(403);
  });

  it('user thường không được gọi broadcast (403)', async () => {
    await api()
      .post('/api/notifications/broadcast')
      .set(auth(userToken))
      .send({ userIds: [userId], title: broadcastTitle, message: 'Xin chao' })
      .expect(403);
  });

  it('admin broadcast cho user cụ thể: chỉ đúng user đó nhận được', async () => {
    const res = await api()
      .post('/api/notifications/broadcast')
      .set(auth(adminToken))
      .send({
        userIds: [userId],
        title: broadcastTitle,
        message: 'Khuyen mai rieng cho ban',
      })
      .expect(201);
    expect((res.body as ApiBody<{ count: number }>).data.count).toBe(1);

    const userList = await api()
      .get('/api/notifications')
      .set(auth(userToken))
      .expect(200);
    const userItems = (userList.body as ApiBody<{ title: string }[]>).data;
    expect(userItems.some((n) => n.title === broadcastTitle)).toBe(true);

    const otherList = await api()
      .get('/api/notifications')
      .set(auth(otherToken))
      .expect(200);
    const otherItems = (otherList.body as ApiBody<{ title: string }[]>).data;
    expect(otherItems.some((n) => n.title === broadcastTitle)).toBe(false);
  });

  it('admin broadcast gửi tất cả (toAll): user khác cũng nhận được', async () => {
    const res = await api()
      .post('/api/notifications/broadcast')
      .set(auth(adminToken))
      .send({
        toAll: true,
        title: broadcastTitle,
        message: 'Thong bao he thong cho tat ca',
      })
      .expect(201);
    expect(
      (res.body as ApiBody<{ count: number }>).data.count,
    ).toBeGreaterThanOrEqual(3);

    const otherList = await api()
      .get('/api/notifications')
      .set(auth(otherToken))
      .expect(200);
    const otherItems = (
      otherList.body as ApiBody<{ title: string; message: string }[]>
    ).data;
    expect(
      otherItems.some(
        (n) =>
          n.title === broadcastTitle &&
          n.message === 'Thong bao he thong cho tat ca',
      ),
    ).toBe(true);
  });

  it('broadcast thiếu userIds và không bật toAll thì bị từ chối (400)', async () => {
    await api()
      .post('/api/notifications/broadcast')
      .set(auth(adminToken))
      .send({ title: broadcastTitle, message: 'Thieu nguoi nhan' })
      .expect(400);
  });
});
