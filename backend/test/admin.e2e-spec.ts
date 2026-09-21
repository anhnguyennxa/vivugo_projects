import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface ApiBody {
  data?: unknown;
  meta?: { total: number };
}

describe('Admin dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-dash-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-dash-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  const paidCode = `E2EDASH${suffix}P`;
  const pendingCode = `E2EDASH${suffix}Q`;
  let adminToken: string;
  let userToken: string;
  let tourId: string;
  let departureId: string;
  let pendingBookingId: string;

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
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Dash Admin',
        role: 'ADMIN',
      },
    });
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Dash User',
        role: 'USER',
      },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password });
      return (res.body as { data: { accessToken: string } }).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);

    const category = await prisma.category.create({
      data: { name: 'E2E Dash Category', slug: `e2e-dash-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: 'E2E Dash Tour',
        slug: `e2e-dash-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta tour kiem thu bang dieu khien quan tri',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        departureCity: 'HO_CHI_MINH',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-dash/400',
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
        bookedSlots: 3,
      },
    });
    departureId = departure.id;

    const base = {
      userId: user.id,
      tourId,
      departureId,
      numAdults: 1,
      totalPrice: 1000000,
      contactName: 'Khach Dash',
      contactPhone: '0912345678',
      contactEmail: userEmail,
    };
    await prisma.booking.create({
      data: {
        ...base,
        bookingCode: paidCode,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
    });
    const pending = await prisma.booking.create({
      data: { ...base, bookingCode: pendingCode, numAdults: 2 },
    });
    pendingBookingId = pending.id;
  });

  afterAll(async () => {
    // Guard: id undefined trong where của Prisma = "bỏ qua điều kiện" -> xoá cả bảng.
    if (tourId) {
      await prisma.booking.deleteMany({ where: { tourId } });
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({
      where: { slug: `e2e-dash-cat-${suffix}` },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('USER thường và khách chưa đăng nhập bị từ chối (403/401)', async () => {
    await request(app.getHttpServer()).get('/api/admin/stats').expect(401);
    await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('GET /api/admin/stats trả về thống kê đúng kiểu, có doanh thu từ đơn đã thanh toán', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const data = (
      res.body as {
        data: {
          totalRevenue: number;
          totalBookings: number;
          bookingsByStatus: Record<string, number>;
          revenueByMonth: { month: string; revenue: number }[];
          topTours: { id: string; revenue: number }[];
          recentBookings: { totalPrice: number }[];
        };
      }
    ).data;

    expect(typeof data.totalRevenue).toBe('number');
    expect(data.totalRevenue).toBeGreaterThanOrEqual(1000000);
    expect(data.totalBookings).toBeGreaterThanOrEqual(2);
    expect(data.bookingsByStatus.PENDING).toBeGreaterThanOrEqual(1);
    expect(data.revenueByMonth).toHaveLength(6);
    expect(data.revenueByMonth.at(-1)!.revenue).toBeGreaterThanOrEqual(1000000);
    expect(data.topTours.some((t) => t.id === tourId)).toBe(true);
    expect(typeof data.recentBookings[0].totalPrice).toBe('number');
  });

  it('GET /api/admin/bookings lọc theo trạng thái thanh toán và tìm theo mã đơn', async () => {
    const paid = await request(app.getHttpServer())
      .get(`/api/admin/bookings?paymentStatus=PAID&search=E2EDASH${suffix}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const paidBody = paid.body as ApiBody & {
      data: { bookingCode: string; user: { email: string } }[];
    };
    expect(paidBody.meta?.total).toBe(1);
    expect(paidBody.data[0].bookingCode).toBe(paidCode);
    expect(paidBody.data[0].user.email).toBe(userEmail);

    const all = await request(app.getHttpServer())
      .get(`/api/admin/bookings?search=E2EDASH${suffix}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((all.body as ApiBody).meta?.total).toBe(2);
  });

  it('đổi trạng thái đơn theo đúng luồng, chặn chuyển sai và trả chỗ khi huỷ', async () => {
    const patch = (status: string) =>
      request(app.getHttpServer())
        .patch(`/api/bookings/${pendingBookingId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status });

    await patch('COMPLETED').expect(400);
    await patch('CONFIRMED').expect(200);

    await patch('CANCELLED').expect(200);
    const dep = await prisma.departure.findUniqueOrThrow({
      where: { id: departureId },
    });
    expect(dep.bookedSlots).toBe(1);

    await patch('CONFIRMED').expect(400);
    await patch('CANCELLED').expect(400);
  });
});
