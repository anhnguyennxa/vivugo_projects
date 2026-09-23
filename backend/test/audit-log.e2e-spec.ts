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

describe('Audit log (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-audit-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-audit-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';

  let adminToken: string;
  let userToken: string;
  let categoryId: string;

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
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Audit Admin',
        role: 'ADMIN',
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Audit User',
        role: 'USER',
      },
    });

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as ApiBody<{ accessToken: string }>).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { entity: 'Category', entityId: categoryId },
    });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('tạo danh mục sinh audit log CREATE đúng actor và entityId', async () => {
    const res = await api()
      .post('/api/categories')
      .set(auth(adminToken))
      .send({
        name: `E2E Audit Cat ${suffix}`,
        slug: `e2e-audit-cat-${suffix}`,
      })
      .expect(201);
    categoryId = (res.body as ApiBody<{ id: string }>).data.id;

    const logRes = await api()
      .get('/api/admin/audit-logs')
      .set(auth(adminToken))
      .query({ entity: 'Category', action: 'CREATE' })
      .expect(200);
    const body = logRes.body as ApiBody<
      {
        entity: string;
        action: string;
        entityId: string;
        user: { email: string } | null;
      }[]
    >;
    const found = body.data.find((l) => l.entityId === categoryId);
    expect(found).toBeDefined();
    expect(found?.user?.email).toBe(adminEmail);
  });

  it('sửa và xoá danh mục cũng sinh audit log tương ứng', async () => {
    await api()
      .patch(`/api/categories/${categoryId}`)
      .set(auth(adminToken))
      .send({ name: `E2E Audit Cat Updated ${suffix}` })
      .expect(200);

    await api()
      .delete(`/api/categories/${categoryId}`)
      .set(auth(adminToken))
      .expect(200);

    const res = await api()
      .get('/api/admin/audit-logs')
      .set(auth(adminToken))
      .query({ entity: 'Category' })
      .expect(200);
    const body = res.body as ApiBody<{ action: string; entityId: string }[]>;
    const actions = body.data
      .filter((l) => l.entityId === categoryId)
      .map((l) => l.action);
    expect(actions).toEqual(
      expect.arrayContaining(['CREATE', 'UPDATE', 'DELETE']),
    );
  });

  it('tìm theo tên admin (search) ra đúng kết quả', async () => {
    const res = await api()
      .get('/api/admin/audit-logs')
      .set(auth(adminToken))
      .query({ search: 'E2E Audit Admin' })
      .expect(200);
    const body = res.body as ApiBody<{ entityId: string }[]>;
    expect(body.data.some((l) => l.entityId === categoryId)).toBe(true);
  });

  it('user thường không xem được audit log (403)', async () => {
    await api().get('/api/admin/audit-logs').set(auth(userToken)).expect(403);
  });
});
