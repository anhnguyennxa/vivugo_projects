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
  meta?: { page: number; limit: number; total: number };
  data?: unknown;
}

describe('Blog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-blog-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-blog-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let adminToken: string;
  let userToken: string;
  let tourId: string;
  let postId: string;
  const postSlug = `e2e-blog-post-${suffix}`;

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
        fullName: 'E2E Blog Admin',
        role: 'ADMIN',
      },
    });
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash,
        fullName: 'E2E Blog User',
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

    const category = await prisma.category.create({
      data: { name: 'E2E Blog Category', slug: `e2e-blog-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: 'E2E Blog Tour',
        slug: `e2e-blog-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta tour kiem thu lien ket bai cam nang',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-blog/400',
        status: 'PUBLISHED',
        createdById: admin.id,
      },
    });
    tourId = tour.id;
  });

  afterAll(async () => {
    // Guard: field undefined trong where cua Prisma nghia la "bo qua dieu kien",
    // neu beforeAll throw truoc khi gan id thi deleteMany co the xoa toan bo bang.
    if (postId) {
      await prisma.blogPost.deleteMany({ where: { id: postId } });
    }
    if (tourId) {
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({
      where: { slug: `e2e-blog-cat-${suffix}` },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, userEmail] } },
    });
    await app.close();
  });

  it('USER thường bị từ chối khi tạo bài viết (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/blog')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Bai viet khong hop le',
        slug: `${postSlug}-x`,
        excerpt: 'Excerpt kiem thu',
        content: 'Noi dung markdown kiem thu du dai toi thieu muoi ky tu ne',
        coverImageUrl: 'https://picsum.photos/seed/e2e-blog-x/800',
      })
      .expect(403);
  });

  it('ADMIN tạo bài viết mặc định DRAFT, không hiện ở danh sách công khai', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/blog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Bài viết kiểm thử E2E',
        slug: postSlug,
        excerpt: 'Tóm tắt bài viết kiểm thử',
        region: 'MIEN_NAM',
        content:
          'Nội dung markdown kiểm thử với độ dài trên năm mươi ký tự để vượt qua validate.',
        coverImageUrl: 'https://picsum.photos/seed/e2e-blog-cover/800',
        relatedTourIds: [tourId],
      })
      .expect(201);

    const body = res.body as ApiBody & {
      data: { id: string; status: string; publishedAt: string | null };
    };
    expect(body.data.status).toBe('DRAFT');
    expect(body.data.publishedAt).toBeNull();
    postId = body.data.id;

    await request(app.getHttpServer()).get(`/api/blog/${postSlug}`).expect(404);

    const list = await request(app.getHttpServer()).get(
      `/api/blog?region=MIEN_NAM&limit=50`,
    );
    const items = (list.body as ApiBody & { data: { slug: string }[] }).data;
    expect(items.some((p) => p.slug === postSlug)).toBe(false);
  });

  it('ADMIN publish bài viết, hiện công khai kèm tour liên quan và tăng lượt xem', async () => {
    await request(app.getHttpServer())
      .patch(`/api/blog/${postId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/blog/${postSlug}`)
      .expect(200);
    const body = res.body as ApiBody & {
      data: {
        publishedAt: string;
        viewCount: number;
        relatedTours: { id: string; basePrice: number }[];
      };
    };
    expect(body.data.publishedAt).not.toBeNull();
    expect(body.data.viewCount).toBe(1);
    expect(body.data.relatedTours).toHaveLength(1);
    expect(body.data.relatedTours[0].id).toBe(tourId);
    expect(typeof body.data.relatedTours[0].basePrice).toBe('number');

    const res2 = await request(app.getHttpServer())
      .get(`/api/blog/${postSlug}`)
      .expect(200);
    expect(
      (res2.body as ApiBody & { data: { viewCount: number } }).data.viewCount,
    ).toBe(2);
  });

  it('ADMIN xoá bài viết (soft delete), không còn hiện ở danh sách admin', async () => {
    await request(app.getHttpServer())
      .delete(`/api/blog/${postId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const adminList = await request(app.getHttpServer())
      .get('/api/blog/admin?limit=100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const items = (adminList.body as ApiBody & { data: { id: string }[] })
      .data;
    expect(items.some((p) => p.id === postId)).toBe(false);

    await request(app.getHttpServer()).get(`/api/blog/${postSlug}`).expect(404);
  });
});
