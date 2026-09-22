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
  meta?: { page: number; limit: number; total: number };
  data: T;
}

describe('Collections (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-col-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-col-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let adminToken: string;
  let userToken: string;
  let categoryId: string;
  let tourAId: string;
  let tourBId: string;
  let collectionIds: string[] = [];

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
      data: { email: adminEmail, passwordHash, fullName: 'E2E Col Admin', role: 'ADMIN' },
    });
    await prisma.user.create({
      data: { email: userEmail, passwordHash, fullName: 'E2E Col User', role: 'USER' },
    });

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as ApiBody<{ accessToken: string }>).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);

    const category = await prisma.category.create({
      data: { name: 'E2E Col Category', slug: `e2e-col-cat-${suffix}` },
    });
    categoryId = category.id;

    const makeTour = (slug: string, discountPrice?: number) =>
      prisma.tour.create({
        data: {
          title: `E2E Col Tour ${slug}`,
          slug: `e2e-col-tour-${slug}-${suffix}`,
          categoryId,
          description: 'Mo ta hop le voi tren hai muoi ky tu cho tour kiem thu',
          itinerary: [],
          location: 'Test',
          region: 'MIEN_NAM',
          departureCity: 'HO_CHI_MINH',
          durationDays: 2,
          durationNights: 1,
          basePrice: 1000000,
          discountPrice,
          maxGuests: 10,
          thumbnailUrl: 'https://picsum.photos/seed/e2e-col/400',
          status: 'PUBLISHED',
          createdById: admin.id,
        },
      });
    const [tourA, tourB] = await Promise.all([
      makeTour('a', 800000),
      makeTour('b'),
    ]);
    tourAId = tourA.id;
    tourBId = tourB.id;
  });

  afterAll(async () => {
    // Guard: id undefined trong where của Prisma = "bỏ qua điều kiện" -> xoá cả bảng.
    if (collectionIds.length > 0) {
      await prisma.collection.deleteMany({ where: { id: { in: collectionIds } } });
    }
    if (tourAId || tourBId) {
      await prisma.tour.deleteMany({ where: { id: { in: [tourAId, tourBId] } } });
    }
    await prisma.category.deleteMany({ where: { slug: `e2e-col-cat-${suffix}` } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
    await app.close();
  });

  it('USER thường không được tạo/xem trang admin (403)', async () => {
    await api()
      .post('/api/collections')
      .set(auth(userToken))
      .send({
        title: 'Tour hè kiểm thử',
        slug: `e2e-col-summer-${suffix}`,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
      })
      .expect(403);
    await api().get('/api/collections/admin').set(auth(userToken)).expect(403);
  });

  it('từ chối ngày bắt đầu sau ngày kết thúc (400)', async () => {
    await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: 'Bộ sưu tập ngày sai',
        slug: `e2e-col-invalid-${suffix}`,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
        startAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        endAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      })
      .expect(400);
  });

  it('từ chối tourIds chứa id không tồn tại (400)', async () => {
    await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: 'Bộ sưu tập tour ảo',
        slug: `e2e-col-ghost-${suffix}`,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
        tourIds: ['khong-ton-tai'],
      })
      .expect(400);
  });

  it('tạo bộ sưu tập DRAFT: chưa hiện công khai, admin thấy đủ', async () => {
    const res = await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: `Tour hè kiểm thử ${suffix}`,
        slug: `e2e-col-summer-${suffix}`,
        description: 'Bo suu tap kiem thu',
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
        tourIds: [tourAId, tourBId],
      })
      .expect(201);
    const collection = (res.body as ApiBody<{ id: string; status: string }>).data;
    expect(collection.status).toBe('DRAFT');
    collectionIds.push(collection.id);

    await api().get(`/api/collections/e2e-col-summer-${suffix}`).expect(404);

    const adminDetail = await api()
      .get(`/api/collections/admin/${collection.id}`)
      .set(auth(adminToken))
      .expect(200);
    const detail = (
      adminDetail.body as ApiBody<{ tours: { id: string }[] }>
    ).data;
    expect(detail.tours.map((t) => t.id)).toEqual([tourAId, tourBId]);
  });

  it('đăng bộ sưu tập: hiện công khai đúng thứ tự, giá hiệu lực và có thể sắp xếp lại', async () => {
    const collectionId = collectionIds[0];
    await api()
      .patch(`/api/collections/${collectionId}`)
      .set(auth(adminToken))
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const detail = await api()
      .get(`/api/collections/e2e-col-summer-${suffix}`)
      .expect(200);
    const body = (
      detail.body as ApiBody<{
        tours: { id: string; discountPrice: number | null; departures: unknown[] }[];
      }>
    ).data;
    expect(body.tours.map((t) => t.id)).toEqual([tourAId, tourBId]);
    expect(body.tours[0].discountPrice).toBe(800000);
    expect(body.tours[1].discountPrice).toBeNull();

    const list = await api().get('/api/collections').expect(200);
    const listBody = (
      list.body as ApiBody<{ id: string; tourCount: number }[]>
    ).data;
    const found = listBody.find((c) => c.id === collectionId);
    expect(found?.tourCount).toBe(2);

    // Đảo thứ tự
    await api()
      .patch(`/api/collections/${collectionId}`)
      .set(auth(adminToken))
      .send({ tourIds: [tourBId, tourAId] })
      .expect(200);
    const reordered = await api()
      .get(`/api/collections/e2e-col-summer-${suffix}`)
      .expect(200);
    expect(
      (reordered.body as ApiBody<{ tours: { id: string }[] }>).data.tours.map(
        (t) => t.id,
      ),
    ).toEqual([tourBId, tourAId]);

    // Bớt còn 1 tour
    await api()
      .patch(`/api/collections/${collectionId}`)
      .set(auth(adminToken))
      .send({ tourIds: [tourBId] })
      .expect(200);
    const shrunk = await api()
      .get(`/api/collections/e2e-col-summer-${suffix}`)
      .expect(200);
    expect(
      (shrunk.body as ApiBody<{ tours: { id: string }[] }>).data.tours,
    ).toHaveLength(1);
  });

  it('bộ sưu tập chưa tới hạn hoặc đã hết hạn tự ẩn khỏi trang công khai', async () => {
    const future = await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: `Bộ sưu tập tương lai ${suffix}`,
        slug: `e2e-col-future-${suffix}`,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
        status: 'PUBLISHED',
        startAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      })
      .expect(201);
    const futureId = (future.body as ApiBody<{ id: string }>).data.id;
    collectionIds.push(futureId);
    await api().get(`/api/collections/e2e-col-future-${suffix}`).expect(404);

    const expired = await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: `Bộ sưu tập đã qua ${suffix}`,
        slug: `e2e-col-expired-${suffix}`,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
        status: 'PUBLISHED',
        endAt: new Date(Date.now() - 86400000).toISOString(),
      })
      .expect(201);
    const expiredId = (expired.body as ApiBody<{ id: string }>).data.id;
    collectionIds.push(expiredId);
    await api().get(`/api/collections/e2e-col-expired-${suffix}`).expect(404);

    // Admin vẫn thấy cả hai, biết rõ đang ngoài hạn (isActive: false)
    const adminList = await api()
      .get('/api/collections/admin')
      .query({ search: suffix.toString() })
      .set(auth(adminToken))
      .expect(200);
    const items = (
      adminList.body as ApiBody<{ id: string; isActive: boolean }[]>
    ).data;
    expect(items.find((c) => c.id === futureId)?.isActive).toBe(false);
    expect(items.find((c) => c.id === expiredId)?.isActive).toBe(false);
  });

  it('slug trùng trả về 409, xoá thì biến mất khỏi danh sách admin', async () => {
    const dupSlug = `e2e-col-dup-${suffix}`;
    const first = await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: `Bộ sưu tập trùng slug ${suffix}`,
        slug: dupSlug,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
      })
      .expect(201);
    const id = (first.body as ApiBody<{ id: string }>).data.id;
    collectionIds.push(id);

    await api()
      .post('/api/collections')
      .set(auth(adminToken))
      .send({
        title: 'Bộ sưu tập khác',
        slug: dupSlug,
        coverImageUrl: 'https://picsum.photos/seed/e2e-col-cover/800',
      })
      .expect(409);

    await api().delete(`/api/collections/${id}`).set(auth(adminToken)).expect(200);
    const adminList = await api()
      .get('/api/collections/admin')
      .query({ search: suffix.toString(), limit: 100 })
      .set(auth(adminToken))
      .expect(200);
    const ids = (adminList.body as ApiBody<{ id: string }[]>).data.map((c) => c.id);
    expect(ids).not.toContain(id);
  });
});
