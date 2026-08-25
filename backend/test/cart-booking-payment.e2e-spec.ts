import { createHmac } from 'node:crypto';

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

function sortAndEncode(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`,
    )
    .join('&');
}

function signVnpay(params: Record<string, string>) {
  const secret = process.env.VNPAY_HASH_SECRET!;
  const signData = sortAndEncode(params);
  return createHmac('sha512', secret).update(signData).digest('hex');
}

describe('Cart, Booking & Payment (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const userEmail = `e2e-cart-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let userToken: string;
  let tourId: string;
  let departureId: string;
  let bookedSlotsBefore: number;

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
        email: userEmail,
        passwordHash,
        fullName: 'E2E Cart User',
        role: 'USER',
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    userToken = (login.body as ApiBody & { data: { accessToken: string } }).data
      .accessToken;

    const category = await prisma.category.create({
      data: { name: 'E2E Cart Category', slug: `e2e-cart-cat-${suffix}` },
    });
    const admin = await prisma.user.findFirstOrThrow({
      where: { role: 'ADMIN' },
    });
    const tour = await prisma.tour.create({
      data: {
        title: 'E2E Cart Tour',
        slug: `e2e-cart-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta tour kiem thu gio hang thanh toan',
        itinerary: [],
        location: 'Test',
        durationDays: 2,
        durationNights: 1,
        basePrice: 1000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-cart/400',
        status: 'PUBLISHED',
        createdById: admin.id,
      },
    });
    tourId = tour.id;

    const departure = await prisma.departure.create({
      data: {
        tourId: tour.id,
        departureDate: new Date(Date.now() + 30 * 86400000),
        returnDate: new Date(Date.now() + 31 * 86400000),
        totalSlots: 10,
        bookedSlots: 0,
      },
    });
    departureId = departure.id;
    bookedSlotsBefore = departure.bookedSlots;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { tourId } });
    await prisma.cartItem.deleteMany({ where: { tourId } });
    await prisma.departure.deleteMany({ where: { tourId } });
    await prisma.tour.deleteMany({ where: { id: tourId } });
    await prisma.category.deleteMany({
      where: { slug: `e2e-cart-cat-${suffix}` },
    });
    await prisma.user.deleteMany({ where: { email: userEmail } });
    await app.close();
  });

  it('thêm vào giỏ hàng, chặn thêm trùng đợt khởi hành (409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ tourId, departureId, numAdults: 2 })
      .expect(201);

    expect((res.body as ApiBody).success).toBe(true);

    await request(app.getHttpServer())
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ tourId, departureId, numAdults: 1 })
      .expect(409);
  });

  it('checkout tạo booking PENDING, giữ chỗ, và sinh paymentUrl', async () => {
    const cart = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    const cartItemId = (cart.body as ApiBody & { data: { id: string }[] })
      .data[0].id;

    const res = await request(app.getHttpServer())
      .post('/api/bookings/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItemId,
        contactName: 'E2E Test',
        contactPhone: '0912345678',
        contactEmail: userEmail,
      })
      .expect(201);

    const body = res.body as ApiBody & {
      data: {
        booking: {
          status: string;
          totalPrice: number;
          bookingCode: string;
          payment: unknown;
        };
        paymentUrl: string | null;
      };
    };
    expect(body.data.booking.status).toBe('PENDING');
    expect(body.data.booking.totalPrice).toBe(2000000);
    expect(body.data.booking.payment).not.toBeNull();
    expect(body.data.paymentUrl).toContain('vnp_SecureHash=');

    const departure = await prisma.departure.findUniqueOrThrow({
      where: { id: departureId },
    });
    expect(departure.bookedSlots).toBe(bookedSlotsBefore + 2);

    const cartAfter = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect((cartAfter.body as ApiBody & { data: unknown[] }).data).toHaveLength(
      0,
    );
  });

  it('IPN với chữ ký sai bị từ chối (RspCode 97)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/payments/vnpay/callback?vnp_TxnRef=x&vnp_Amount=100&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_SecureHash=sai',
    );
    expect(res.body).toEqual({ RspCode: '97', Message: 'Invalid signature' });
  });

  it('IPN hợp lệ xác nhận thanh toán thành công -> booking CONFIRMED/PAID', async () => {
    const booking = await prisma.booking.findFirstOrThrow({
      where: { tourId },
    });

    const params = {
      vnp_Amount: String(booking.totalPrice.toNumber() * 100),
      vnp_ResponseCode: '00',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE!,
      vnp_TransactionNo: '999888',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: booking.bookingCode,
    };
    const qs = `${sortAndEncode(params)}&vnp_SecureHash=${signVnpay(params)}`;

    const res = await request(app.getHttpServer()).get(
      `/api/payments/vnpay/callback?${qs}`,
    );
    expect(res.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(updated.status).toBe('CONFIRMED');
    expect(updated.paymentStatus).toBe('PAID');
  });

  it('replay IPN cho đơn đã xác nhận trả về RspCode 02', async () => {
    const booking = await prisma.booking.findFirstOrThrow({
      where: { tourId },
    });
    const params = {
      vnp_Amount: String(booking.totalPrice.toNumber() * 100),
      vnp_ResponseCode: '00',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE!,
      vnp_TransactionNo: '999888',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: booking.bookingCode,
    };
    const qs = `${sortAndEncode(params)}&vnp_SecureHash=${signVnpay(params)}`;

    const res = await request(app.getHttpServer()).get(
      `/api/payments/vnpay/callback?${qs}`,
    );
    expect(res.body).toEqual({
      RspCode: '02',
      Message: 'Order already confirmed',
    });
  });
});
