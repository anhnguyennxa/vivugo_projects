import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
  data?: { user?: { email: string }; accessToken?: string; email?: string };
  errors?: { field: string; message: string }[];
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testEmail = `e2e-${Date.now()}@vivugo.vn`;
  const testPassword = 'Passw0rd!23';

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('từ chối mật khẩu yếu khi đăng ký', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: testEmail, password: '123', fullName: 'E2E Test' })
      .expect(400);

    const body = res.body as ApiBody;
    expect(body.success).toBe(false);
    expect(body.errors?.[0].field).toBe('password');
  });

  it('đăng ký thành công và trả về accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, fullName: 'E2E Test' })
      .expect(201);

    const body = res.body as ApiBody;
    expect(body.success).toBe(true);
    expect(body.data?.user?.email).toBe(testEmail);
    expect(typeof body.data?.accessToken).toBe('string');
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refresh_token=/);
  });

  it('từ chối đăng ký trùng email (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword, fullName: 'E2E Test' })
      .expect(409);
  });

  it('từ chối đăng nhập sai mật khẩu (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'saiRoi123!' })
      .expect(401);
  });

  it('đăng nhập đúng trả về accessToken hợp lệ dùng được cho /auth/me', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const loginBody = loginRes.body as ApiBody;
    const accessToken = loginBody.data?.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const meBody = meRes.body as ApiBody;
    expect(meBody.data?.email).toBe(testEmail);
  });

  it('từ chối truy cập /auth/me khi không có token (401)', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('forgot-password trả về cùng một message dù email tồn tại hay không (chống dò email)', async () => {
    const [existing, notExisting] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: testEmail }),
      request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'khong-ton-tai@vivugo.vn' }),
    ]);

    const existingBody = existing.body as ApiBody;
    const notExistingBody = notExisting.body as ApiBody;
    expect(existingBody.message).toBe(notExistingBody.message);
  });
});
