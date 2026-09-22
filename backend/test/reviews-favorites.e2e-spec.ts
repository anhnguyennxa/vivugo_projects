import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface ApiBody {
  success?: boolean;
  message?: string;
  data?: unknown;
}

describe('Reviews & Favorites (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-review-${suffix}@vivugo.vn`;
  const adminEmail = `e2e-review-admin-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let userToken: string;
  let tourId: string;
  let completedBookingId: string;
  let pendingBookingId: string;
  let reviewId: string;

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
        fullName: 'E2E Review User',
        role: 'USER',
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Review Admin',
        role: 'ADMIN',
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    userToken = (login.body as ApiBody & { data: { accessToken: string } }).data
      .accessToken;

    const category = await prisma.category.create({
      data: { name: 'E2E Review Category', slug: `e2e-review-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: 'E2E Review Tour',
        slug: `e2e-review-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta tour kiem thu danh gia va yeu thich',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-review/400',
        status: 'PUBLISHED',
        createdById: admin.id,
      },
    });
    tourId = tour.id;

    const departure = await prisma.departure.create({
      data: {
        tourId: tour.id,
        departureDate: new Date(Date.now() + 10 * 86400000),
        returnDate: new Date(Date.now() + 11 * 86400000),
        totalSlots: 10,
        bookedSlots: 0,
      },
    });

    const completed = await prisma.booking.create({
      data: {
        bookingCode: `E2ERV${suffix}A`,
        userId: user.id,
        tourId: tour.id,
        departureId: departure.id,
        numAdults: 1,
        totalPrice: 1000000,
        status: 'COMPLETED',
        contactName: 'Test',
        contactPhone: '0912345678',
        contactEmail: userEmail,
      },
    });
    completedBookingId = completed.id;

    const pending = await prisma.booking.create({
      data: {
        bookingCode: `E2ERV${suffix}B`,
        userId: user.id,
        tourId: tour.id,
        departureId: departure.id,
        numAdults: 1,
        totalPrice: 1000000,
        status: 'PENDING',
        contactName: 'Test',
        contactPhone: '0912345678',
        contactEmail: userEmail,
      },
    });
    pendingBookingId = pending.id;
  });

  afterAll(async () => {
    // Guard: field undefined trong where của Prisma nghĩa là "bỏ qua điều kiện",
    // nên nếu beforeAll throw truoc khi gan tourId, deleteMany se xoa toan bo bang.
    if (tourId) {
      await prisma.review.deleteMany({ where: { tourId } });
      await prisma.favorite.deleteMany({ where: { tourId } });
      await prisma.booking.deleteMany({ where: { tourId } });
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({
      where: { slug: `e2e-review-cat-${suffix}` },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [userEmail, adminEmail] } },
    });
    await app.close();
  });

  it('từ chối đánh giá khi booking chưa COMPLETED (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        bookingId: pendingBookingId,
        rating: 5,
        comment: 'Danh gia khi chua hoan thanh',
      })
      .expect(400);
  });

  it('gửi đánh giá thành công ở trạng thái PENDING, chưa hiện công khai', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        bookingId: completedBookingId,
        rating: 5,
        comment: 'Tour rat tuyet voi cho tat ca',
      })
      .expect(201);

    const body = res.body as ApiBody & { data: { id: string; status: string } };
    expect(body.data.status).toBe('PENDING');
    reviewId = body.data.id;

    const publicList = await request(app.getHttpServer()).get(
      `/api/tours/${tourId}/reviews`,
    );
    expect(
      (publicList.body as ApiBody & { data: unknown[] }).data,
    ).toHaveLength(0);
  });

  it('chặn đánh giá trùng cho cùng 1 booking (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        bookingId: completedBookingId,
        rating: 4,
        comment: 'Danh gia lan hai cho cung don',
      })
      .expect(409);
  });

  it('USER thường không được duyệt đánh giá (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/reviews/${reviewId}/moderate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('duyệt đánh giá cập nhật avgRating/reviewCount của tour và hiện công khai', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    const adminToken = (
      adminLogin.body as ApiBody & { data: { accessToken: string } }
    ).data.accessToken;

    await request(app.getHttpServer())
      .patch(`/api/reviews/${reviewId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const tour = await prisma.tour.findUniqueOrThrow({ where: { id: tourId } });
    expect(Number(tour.avgRating)).toBe(5);
    expect(tour.reviewCount).toBe(1);

    const publicList = await request(app.getHttpServer()).get(
      `/api/tours/${tourId}/reviews`,
    );
    expect(
      (publicList.body as ApiBody & { data: unknown[] }).data,
    ).toHaveLength(1);
  });

  it('thêm/xoá yêu thích, chặn trùng, yêu cầu đăng nhập', async () => {
    await request(app.getHttpServer()).get('/api/favorites').expect(401);

    await request(app.getHttpServer())
      .post(`/api/favorites/${tourId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/favorites/${tourId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(409);

    const list = await request(app.getHttpServer())
      .get('/api/favorites')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const favorites = (
      list.body as ApiBody & {
        data: { tour: { departures: { departureDate: string }[] } }[];
      }
    ).data;
    expect(favorites).toHaveLength(1);
    // Thẻ tour trong danh sách yêu thích cũng cần đợt khởi hành để hiện ngày.
    expect(favorites[0].tour.departures.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .delete(`/api/favorites/${tourId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/favorites/${tourId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
