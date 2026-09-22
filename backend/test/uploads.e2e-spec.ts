import { ServiceUnavailableException } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';
import { UploadsService } from './../src/uploads/uploads.service';

interface Body<T = unknown> {
  data: T;
  message?: string;
}

// PNG 1x1 hợp lệ
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Uploads (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-upload-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-upload-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let adminToken: string;
  let userToken: string;
  let uploadCalls = 0;

  beforeAll(async () => {
    // Mock Cloudinary: e2e không được gọi mạng thật hay cần khoá thật.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UploadsService)
      .useValue({
        uploadImage: () => {
          uploadCalls++;
          return Promise.resolve({
            url: 'https://res.cloudinary.com/demo/image/upload/vivugo/x.png',
            publicId: 'vivugo/x',
          });
        },
      })
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'E2E Upload Admin',
        role: 'ADMIN',
      },
    });
    await prisma.user.create({
      data: { email: userEmail, passwordHash, fullName: 'E2E Upload User' },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password });
      return (res.body as Body<{ accessToken: string }>).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('khách chưa đăng nhập không được tải ảnh (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/uploads/image')
      .attach('file', PNG, 'a.png')
      .expect(401);
    expect(uploadCalls).toBe(0);
  });

  it('USER thường cũng tải được ảnh (dùng cho đổi ảnh đại diện)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    expect((res.body as Body<{ url: string }>).data.url).toMatch(/^https:\/\//);
    expect(uploadCalls).toBe(1);
  });

  it('từ chối khi thiếu file, sai định dạng hoặc quá 5MB (400/413)', async () => {
    const before = uploadCalls;
    const auth = { Authorization: `Bearer ${adminToken}` };
    await request(app.getHttpServer())
      .post('/api/uploads/image')
      .set(auth)
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/uploads/image')
      .set(auth)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/uploads/image')
      .set(auth)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(uploadCalls).toBe(before);
  });

  it('ADMIN tải ảnh hợp lệ và nhận URL', async () => {
    const before = uploadCalls;
    const res = await request(app.getHttpServer())
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    expect((res.body as Body<{ url: string }>).data.url).toMatch(/^https:\/\//);
    expect(uploadCalls).toBe(before + 1);
  });

  it('service báo 503 rõ ràng khi chưa cấu hình Cloudinary', () => {
    const saved = { ...process.env };
    process.env.CLOUDINARY_CLOUD_NAME = '';
    process.env.CLOUDINARY_API_KEY = '';
    process.env.CLOUDINARY_API_SECRET = '';
    try {
      expect(() =>
        new UploadsService().uploadImage({
          buffer: PNG,
        } as Express.Multer.File),
      ).toThrow(ServiceUnavailableException);
    } finally {
      process.env = saved;
    }
  });
});
