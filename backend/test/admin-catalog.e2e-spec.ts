import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface Body<T = unknown> {
  data: T;
  meta?: { total: number };
}

describe('Admin catalog: tours, departures, categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-cat-admin-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  const categorySlug = `e2e-catalog-cat-${suffix}`;
  const tourSlug = `e2e-catalog-tour-${suffix}`;
  let adminId: string;
  let adminToken: string;
  let categoryId: string;
  let tourId: string;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash(password),
        fullName: 'E2E Catalog Admin',
        role: 'ADMIN',
      },
    });
    adminId = admin.id;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = (login.body as Body<{ accessToken: string }>).data.accessToken;

    const category = await prisma.category.create({
      data: { name: 'E2E Catalog Category', slug: categorySlug },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    // Guard: id undefined trong where của Prisma = "bỏ qua điều kiện" -> xoá cả bảng.
    if (tourId) {
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tourImage.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({ where: { slug: categorySlug } });
    if (adminId) {
      await prisma.user.deleteMany({ where: { id: adminId } });
    }
    await app.close();
  });

  it('danh sách tour admin thấy cả tour DRAFT, API công khai thì không', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tours')
      .set(auth())
      .send({
        title: 'Tour catalog kiểm thử',
        slug: tourSlug,
        categoryId,
        description: 'Mo ta hop le voi tren hai muoi ky tu cho tour catalog',
        itinerary: [{ day: 1, title: 'Ngày 1', description: 'Khởi hành' }],
        location: 'Test City',
        region: 'MIEN_BAC',
        departureCity: 'HA_NOI',
        durationDays: 2,
        durationNights: 1,
        basePrice: 2000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-catalog/400',
      })
      .expect(201);
    tourId = (created.body as Body<{ id: string }>).data.id;

    const adminList = await request(app.getHttpServer())
      .get('/api/admin/tours')
      .query({ status: 'DRAFT', search: 'Tour catalog kiểm thử' })
      .set(auth())
      .expect(200);
    const rows = (adminList.body as Body<{ id: string; basePrice: number }[]>)
      .data;
    expect(rows.some((t) => t.id === tourId)).toBe(true);
    expect(typeof rows[0].basePrice).toBe('number');

    const publicList = await request(app.getHttpServer()).get(
      `/api/tours?search=${tourSlug}`,
    );
    expect((publicList.body as Body<unknown[]>).data).toHaveLength(0);

    const detail = await request(app.getHttpServer())
      .get(`/api/admin/tours/${tourId}`)
      .set(auth())
      .expect(200);
    const d = (
      detail.body as Body<{ images: unknown[]; departures: unknown[] }>
    ).data;
    expect(d.images).toEqual([]);
    expect(d.departures).toEqual([]);

    // Form admin gửi discountPrice: null để xoá giá khuyến mãi
    await request(app.getHttpServer())
      .patch(`/api/tours/${tourId}`)
      .set(auth())
      .send({ discountPrice: 1500000, isFeatured: true })
      .expect(200);
    const cleared = await request(app.getHttpServer())
      .patch(`/api/tours/${tourId}`)
      .set(auth())
      .send({ discountPrice: null })
      .expect(200);
    expect(
      (cleared.body as Body<{ discountPrice: number | null }>).data
        .discountPrice,
    ).toBeNull();

    await request(app.getHttpServer())
      .get('/api/admin/tours/khong-ton-tai')
      .set(auth())
      .expect(404);
  });

  it('thêm rồi xoá ảnh tour; xoá ảnh của tour khác trả 404', async () => {
    const added = await request(app.getHttpServer())
      .post(`/api/tours/${tourId}/images`)
      .set(auth())
      .send({ urls: ['https://picsum.photos/seed/a/800'] })
      .expect(201);
    const imageId = (added.body as Body<{ id: string }[]>).data[0].id;

    await request(app.getHttpServer())
      .delete(`/api/tours/does-not-exist/images/${imageId}`)
      .set(auth())
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/tours/${tourId}/images/${imageId}`)
      .set(auth())
      .expect(200);
    expect(await prisma.tourImage.count({ where: { tourId } })).toBe(0);
  });

  it('đợt khởi hành: kiểm tra ngày, số chỗ ≥ đã đặt, xoá giá riêng, xoá đợt', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/tours/${tourId}/departures`)
      .set(auth())
      .send({
        departureDate: '2027-01-10',
        returnDate: '2027-01-11',
        totalSlots: 10,
        priceOverride: 1800000,
      })
      .expect(201);
    const departureId = (created.body as Body<{ id: string }>).data.id;

    await prisma.departure.update({
      where: { id: departureId },
      data: { bookedSlots: 4 },
    });

    const patch = (body: object) =>
      request(app.getHttpServer())
        .patch(`/api/departures/${departureId}`)
        .set(auth())
        .send(body);

    await patch({ totalSlots: 3 }).expect(400);
    await patch({ returnDate: '2027-01-05' }).expect(400);
    await patch({ totalSlots: 4 }).expect(200);

    const cleared = await patch({ priceOverride: null }).expect(200);
    expect(
      (cleared.body as Body<{ priceOverride: number | null }>).data
        .priceOverride,
    ).toBeNull();

    // Đợt có đơn đặt không được xoá
    const user = await prisma.user.create({
      data: {
        email: `e2e-cat-user-${suffix}@vivugo.vn`,
        passwordHash: 'x',
        fullName: 'E2E Catalog User',
      },
    });
    try {
      await prisma.booking.create({
        data: {
          bookingCode: `E2ECAT${suffix}`,
          userId: user.id,
          tourId,
          departureId,
          numAdults: 1,
          totalPrice: 1800000,
          contactName: 'K',
          contactPhone: '0912345678',
          contactEmail: 'k@vivugo.vn',
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/departures/${departureId}`)
        .set(auth())
        .expect(400);
    } finally {
      await prisma.booking.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }

    await request(app.getHttpServer())
      .delete(`/api/departures/${departureId}`)
      .set(auth())
      .expect(200);
    expect(await prisma.departure.count({ where: { tourId } })).toBe(0);
  });

  it('xoá vĩnh viễn tour: chặn khi đã có đơn, xoá sạch dữ liệu con khi chưa có đơn', async () => {
    const category = await prisma.category.create({
      data: { name: 'E2E Perm Category', slug: `${categorySlug}-perm` },
    });
    const makeTour = (slug: string) =>
      prisma.tour.create({
        data: {
          title: `E2E perm ${slug}`,
          slug,
          categoryId: category.id,
          description: 'Mo ta tour kiem thu xoa vinh vien',
          itinerary: [],
          location: 'Test',
          region: 'MIEN_BAC',
          departureCity: 'HA_NOI',
          durationDays: 1,
          durationNights: 0,
          basePrice: 100000,
          maxGuests: 5,
          thumbnailUrl: 'https://picsum.photos/seed/perm/400',
          createdById: adminId,
        },
      });
    const withBooking = await makeTour(`e2e-perm-a-${suffix}`);
    const empty = await makeTour(`e2e-perm-b-${suffix}`);
    const user = await prisma.user.create({
      data: {
        email: `e2e-perm-user-${suffix}@vivugo.vn`,
        passwordHash: 'x',
        fullName: 'E2E Perm User',
      },
    });

    try {
      const dep = await prisma.departure.create({
        data: {
          tourId: withBooking.id,
          departureDate: new Date('2027-02-01'),
          returnDate: new Date('2027-02-01'),
          totalSlots: 5,
        },
      });
      await prisma.booking.create({
        data: {
          bookingCode: `E2EPERM${suffix}`,
          userId: user.id,
          tourId: withBooking.id,
          departureId: dep.id,
          numAdults: 1,
          totalPrice: 100000,
          contactName: 'K',
          contactPhone: '0912345678',
          contactEmail: 'k@vivugo.vn',
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/tours/${withBooking.id}/permanent`)
        .set(auth())
        .expect(400);
      expect(await prisma.tour.count({ where: { id: withBooking.id } })).toBe(
        1,
      );

      await prisma.tourImage.create({
        data: { tourId: empty.id, url: 'https://picsum.photos/seed/p/100' },
      });
      await prisma.departure.create({
        data: {
          tourId: empty.id,
          departureDate: new Date('2027-03-01'),
          returnDate: new Date('2027-03-01'),
          totalSlots: 5,
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/tours/${empty.id}/permanent`)
        .set(auth())
        .expect(200);
      expect(await prisma.tour.count({ where: { id: empty.id } })).toBe(0);
      expect(
        await prisma.tourImage.count({ where: { tourId: empty.id } }),
      ).toBe(0);
      expect(
        await prisma.departure.count({ where: { tourId: empty.id } }),
      ).toBe(0);

      await request(app.getHttpServer())
        .delete(`/api/tours/${empty.id}/permanent`)
        .set(auth())
        .expect(404);
    } finally {
      await prisma.booking.deleteMany({ where: { userId: user.id } });
      await prisma.departure.deleteMany({ where: { tourId: withBooking.id } });
      await prisma.tour.deleteMany({ where: { id: withBooking.id } });
      await prisma.tour.deleteMany({ where: { id: empty.id } });
      await prisma.category.deleteMany({ where: { id: category.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it('không xoá được danh mục còn tour (kể cả tour đã xoá mềm), xoá được danh mục trống', async () => {
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .set(auth())
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/tours/${tourId}`)
      .set(auth())
      .expect(200);

    // Tour xoá mềm vẫn giữ khoá ngoại: phải trả 400 chứ không phải lỗi 500
    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}`)
      .set(auth())
      .expect(400);

    const empty = await request(app.getHttpServer())
      .post('/api/categories')
      .set(auth())
      .send({ name: 'E2E Empty Category', slug: `${categorySlug}-empty` })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/categories/${(empty.body as Body<{ id: string }>).data.id}`)
      .set(auth())
      .expect(200);
  });
});
