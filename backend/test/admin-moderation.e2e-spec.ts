import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface ListBody {
  data: Record<string, unknown>[];
  meta: { total: number };
}

describe('Admin reviews & users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-mod-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-mod-user-${suffix}@vivugo.vn`;
  const lockedEmail = `e2e-mod-locked-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  const reviewText = `Danh gia kiem thu ${suffix}`;
  let adminToken: string;
  let userToken: string;
  let tourId: string;
  let reviewId: string;

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
    const admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, fullName: 'E2E Mod Admin', role: 'ADMIN' },
    });
    const user = await prisma.user.create({
      data: { email: userEmail, passwordHash, fullName: 'E2E Mod User', role: 'USER' },
    });
    await prisma.user.create({
      data: {
        email: lockedEmail,
        passwordHash,
        fullName: 'E2E Mod Locked',
        role: 'USER',
        isActive: false,
      },
    });

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as { data: { accessToken: string } }).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);

    const category = await prisma.category.create({
      data: { name: 'E2E Mod Category', slug: `e2e-mod-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: `E2E Mod Tour ${suffix}`,
        slug: `e2e-mod-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta tour kiem thu duyet danh gia',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        departureCity: 'HO_CHI_MINH',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-mod/400',
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
        totalSlots: 10,
      },
    });
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        tourId,
        departureId: departure.id,
        numAdults: 1,
        totalPrice: 1000000,
        contactName: 'Khach Mod',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: `E2EMOD${suffix}`,
        status: 'COMPLETED',
      },
    });
    const review = await prisma.review.create({
      data: {
        tourId,
        userId: user.id,
        bookingId: booking.id,
        rating: 4,
        comment: reviewText,
      },
    });
    reviewId = review.id;
  });

  afterAll(async () => {
    // Guard: id undefined trong where của Prisma = "bỏ qua điều kiện" -> xoá cả bảng.
    if (tourId) {
      await prisma.review.deleteMany({ where: { tourId } });
      await prisma.booking.deleteMany({ where: { tourId } });
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({ where: { slug: `e2e-mod-cat-${suffix}` } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail, lockedEmail] } },
    });
    await app.close();
  });

  describe('GET /admin/reviews', () => {
    it('rejects non-admin', async () => {
      await api().get('/api/admin/reviews').set(auth(userToken)).expect(403);
    });

    it('lists pending reviews with user and tour', async () => {
      const res = await api()
        .get('/api/admin/reviews')
        .query({ status: 'PENDING', search: reviewText })
        .set(auth(adminToken))
        .expect(200);
      const body = res.body as ListBody;
      expect(body.meta.total).toBe(1);
      expect(body.data[0]).toMatchObject({
        id: reviewId,
        status: 'PENDING',
        user: { fullName: 'E2E Mod User' },
        tour: { id: tourId },
      });
    });

    it('moderation moves the review between status filters', async () => {
      await api()
        .patch(`/api/reviews/${reviewId}/moderate`)
        .set(auth(adminToken))
        .send({ status: 'APPROVED' })
        .expect(200);

      const approved = await api()
        .get('/api/admin/reviews')
        .query({ status: 'APPROVED', search: reviewText })
        .set(auth(adminToken))
        .expect(200);
      expect((approved.body as ListBody).meta.total).toBe(1);

      const pending = await api()
        .get('/api/admin/reviews')
        .query({ status: 'PENDING', search: reviewText })
        .set(auth(adminToken))
        .expect(200);
      expect((pending.body as ListBody).meta.total).toBe(0);
    });

    it('rejects an invalid status filter', async () => {
      await api()
        .get('/api/admin/reviews')
        .query({ status: 'NOPE' })
        .set(auth(adminToken))
        .expect(400);
    });
  });

  describe('GET /admin/users', () => {
    it('rejects non-admin', async () => {
      await api().get('/api/admin/users').set(auth(userToken)).expect(403);
    });

    it('searches users, includes booking count and never leaks secrets', async () => {
      const res = await api()
        .get('/api/admin/users')
        .query({ search: userEmail })
        .set(auth(adminToken))
        .expect(200);
      const body = res.body as ListBody;
      expect(body.meta.total).toBe(1);
      expect(body.data[0]).toMatchObject({
        email: userEmail,
        role: 'USER',
        isActive: true,
        _count: { bookings: 1 },
      });
      expect(body.data[0]).not.toHaveProperty('passwordHash');
      expect(body.data[0]).not.toHaveProperty('resetPasswordTokenHash');
    });

    it('filters by role and active state', async () => {
      const admins = await api()
        .get('/api/admin/users')
        .query({ role: 'ADMIN', search: adminEmail })
        .set(auth(adminToken))
        .expect(200);
      expect((admins.body as ListBody).meta.total).toBe(1);

      const locked = await api()
        .get('/api/admin/users')
        .query({ isActive: 'false', search: `e2e-mod-` })
        .set(auth(adminToken))
        .expect(200);
      const emails = (locked.body as ListBody).data.map((u) => u.email);
      expect(emails).toEqual([lockedEmail]);
    });
  });

  describe('PATCH /admin/users/:id', () => {
    const findId = async (email: string) =>
      (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

    it('rejects non-admin', async () => {
      await api()
        .patch(`/api/admin/users/${await findId(userEmail)}`)
        .set(auth(userToken))
        .send({ isActive: false })
        .expect(403);
    });

    it('refuses self-lock and self-demotion', async () => {
      const adminId = await findId(adminEmail);
      await api()
        .patch(`/api/admin/users/${adminId}`)
        .set(auth(adminToken))
        .send({ isActive: false })
        .expect(400);
      await api()
        .patch(`/api/admin/users/${adminId}`)
        .set(auth(adminToken))
        .send({ role: 'USER' })
        .expect(400);
    });

    it('returns 404 for unknown user and 400 for invalid role', async () => {
      await api()
        .patch('/api/admin/users/khong-ton-tai')
        .set(auth(adminToken))
        .send({ isActive: false })
        .expect(404);
      await api()
        .patch(`/api/admin/users/${await findId(userEmail)}`)
        .set(auth(adminToken))
        .send({ role: 'SUPERUSER' })
        .expect(400);
    });

    it('locking blocks login and existing token; unlocking restores it', async () => {
      const userId = await findId(userEmail);

      const locked = await api()
        .patch(`/api/admin/users/${userId}`)
        .set(auth(adminToken))
        .send({ isActive: false })
        .expect(200);
      expect((locked.body as { data: { isActive: boolean } }).data.isActive).toBe(false);

      await api().get('/api/auth/me').set(auth(userToken)).expect(401);
      await api()
        .post('/api/auth/login')
        .send({ email: userEmail, password })
        .expect(401);
      const revoked = await prisma.refreshToken.count({
        where: { userId, revokedAt: null },
      });
      expect(revoked).toBe(0);

      await api()
        .patch(`/api/admin/users/${userId}`)
        .set(auth(adminToken))
        .send({ isActive: true })
        .expect(200);
      await api()
        .post('/api/auth/login')
        .send({ email: userEmail, password })
        .expect(200);
    });

    it('promotes and demotes another user', async () => {
      const userId = await findId(userEmail);
      const promoted = await api()
        .patch(`/api/admin/users/${userId}`)
        .set(auth(adminToken))
        .send({ role: 'ADMIN' })
        .expect(200);
      expect((promoted.body as { data: { role: string } }).data.role).toBe('ADMIN');

      const demoted = await api()
        .patch(`/api/admin/users/${userId}`)
        .set(auth(adminToken))
        .send({ role: 'USER' })
        .expect(200);
      expect((demoted.body as { data: { role: string } }).data.role).toBe('USER');
    });
  });
});
