import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';
import { validationExceptionFactory } from './../src/common/pipes/validation-exception-factory';
import { PrismaService } from './../src/database/prisma/prisma.service';

interface ApiBody {
  success: boolean;
  message: string;
  meta?: { page: number; limit: number; total: number };
  data?: unknown;
}

describe('Tours & Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let adminToken: string;
  let userToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Admin',
        role: 'ADMIN',
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E User',
        role: 'USER',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = (
      adminLogin.body as ApiBody & { data: { accessToken: string } }
    ).data.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    userToken = (userLogin.body as ApiBody & { data: { accessToken: string } })
      .data.accessToken;
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { slug: `e2e-cat-${suffix}` } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('GET /api/categories trả về danh sách công khai', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/categories')
      .expect(200);
    const body = res.body as ApiBody & { data: { slug: string }[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((c) => c.slug === 'bien-dao')).toBe(true);
  });

  it('USER thường bị từ chối khi tạo danh mục (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'X', slug: `e2e-cat-${suffix}` })
      .expect(403);
  });

  it('ADMIN tạo danh mục thành công', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E Category', slug: `e2e-cat-${suffix}` })
      .expect(201);

    const body = res.body as ApiBody & { data: { id: string } };
    categoryId = body.data.id;
    expect(body.success).toBe(true);
  });

  it('GET /api/tours trả về danh sách tour đã publish kèm phân trang', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/tours?limit=3')
      .expect(200);

    const body = res.body as ApiBody & { data: { basePrice: number }[] };
    expect(body.success).toBe(true);
    expect(body.meta?.limit).toBe(3);
    expect(body.data.length).toBeLessThanOrEqual(3);
    expect(typeof body.data[0].basePrice).toBe('number');
  });

  it('GET /api/tours/:slug trả về 404 khi không tồn tại', async () => {
    await request(app.getHttpServer())
      .get('/api/tours/khong-ton-tai-xyz')
      .expect(404);
  });

  it('từ chối tạo tour với categoryId không tồn tại (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/tours')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Tour kiểm thử',
        slug: `e2e-tour-${suffix}`,
        categoryId: 'khong-ton-tai',
        description: 'Mo ta hop le voi tren hai muoi ky tu',
        itinerary: [],
        location: 'Test',
        durationDays: 1,
        durationNights: 0,
        basePrice: 100000,
        maxGuests: 5,
        thumbnailUrl: 'https://picsum.photos/seed/e2e/400',
      })
      .expect(400);
  });

  it('ADMIN tạo tour thành công và USER thường bị từ chối', async () => {
    const payload = {
      title: 'Tour kiểm thử E2E',
      slug: `e2e-tour-${suffix}`,
      categoryId,
      description: 'Mo ta hop le voi tren hai muoi ky tu cho tour kiem thu',
      itinerary: [{ day: 1, title: 'Khởi hành', description: 'Test' }],
      location: 'Test City',
      durationDays: 2,
      durationNights: 1,
      basePrice: 1500000,
      maxGuests: 10,
      thumbnailUrl: 'https://picsum.photos/seed/e2e-tour/400',
    };

    await request(app.getHttpServer())
      .post('/api/tours')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload)
      .expect(403);

    const res = await request(app.getHttpServer())
      .post('/api/tours')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    const body = res.body as ApiBody & { data: { id: string; status: string } };
    expect(body.data.status).toBe('DRAFT');

    await prisma.tour.delete({ where: { id: body.data.id } });
  });
});
