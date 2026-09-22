import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma/prisma.service';
import type { RefundResult } from './../src/payments/vnpay.service';
import { VnpayService } from './../src/payments/vnpay.service';

interface ApiBody<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

describe('Payments refund (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const adminEmail = `e2e-refund-admin-${suffix}@vivugo.vn`;
  const userEmail = `e2e-refund-user-${suffix}@vivugo.vn`;
  const password = 'Passw0rd!23';
  let adminToken: string;
  let userToken: string;
  let tourId: string;
  let departureId: string;
  let userId: string;

  // Điều khiển hành vi mock VnpayService theo từng test.
  let vnpayConfigured = true;
  let refundResponse: RefundResult = {
    success: true,
    responseCode: '00',
    message: 'Success',
    transactionNo: 'REFUND-MOCK-1',
  };
  const refundCalls: { txnRef: string; amount: number; transactionNo: string }[] = [];

  const api = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VnpayService)
      .useValue({
        isConfigured: () => vnpayConfigured,
        refund: async (params: {
          txnRef: string;
          amount: number;
          transactionNo: string;
        }) => {
          refundCalls.push({
            txnRef: params.txnRef,
            amount: params.amount,
            transactionNo: params.transactionNo,
          });
          return refundResponse;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password);
    const admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, fullName: 'E2E Refund Admin', role: 'ADMIN' },
    });
    const user = await prisma.user.create({
      data: { email: userEmail, passwordHash, fullName: 'E2E Refund User', role: 'USER' },
    });
    userId = user.id;

    const login = async (email: string) => {
      const res = await api().post('/api/auth/login').send({ email, password });
      return (res.body as ApiBody<{ accessToken: string }>).data.accessToken;
    };
    adminToken = await login(adminEmail);
    userToken = await login(userEmail);

    const category = await prisma.category.create({
      data: { name: 'E2E Refund Category', slug: `e2e-refund-cat-${suffix}` },
    });
    const tour = await prisma.tour.create({
      data: {
        title: `E2E Refund Tour ${suffix}`,
        slug: `e2e-refund-tour-${suffix}`,
        categoryId: category.id,
        description: 'Mo ta hop le voi tren hai muoi ky tu cho tour kiem thu hoan tien',
        itinerary: [],
        location: 'Test',
        region: 'MIEN_NAM',
        departureCity: 'HO_CHI_MINH',
        durationDays: 2,
        durationNights: 1,
        basePrice: 2000000,
        maxGuests: 10,
        thumbnailUrl: 'https://picsum.photos/seed/e2e-refund/400',
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
        totalSlots: 20,
        bookedSlots: 2,
      },
    });
    departureId = departure.id;
  });

  afterAll(async () => {
    // Guard: id undefined trong where của Prisma = "bỏ qua điều kiện" -> xoá cả bảng.
    if (tourId) {
      await prisma.booking.deleteMany({ where: { tourId } });
      await prisma.departure.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    await prisma.category.deleteMany({ where: { slug: `e2e-refund-cat-${suffix}` } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail] } } });
    await app.close();
  });

  // Tạo một đơn CONFIRMED + đã thanh toán thật qua VNPay (có transactionRef +
  // vnpayPayDate), rồi huỷ qua chính API admin để mô phỏng đúng luồng thật.
  async function makeCancelledPaidBooking(code: string) {
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId,
        departureId,
        numAdults: 1,
        totalPrice: 2000000,
        contactName: 'Khach Refund',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: code,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        payment: {
          create: {
            provider: 'VNPAY',
            amount: 2000000,
            status: 'SUCCESS',
            transactionRef: `TXN-${code}`,
            paidAt: new Date(),
            vnpayPayDate: '20260920103000',
          },
        },
      },
    });

    await api()
      .patch(`/api/bookings/${booking.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'CANCELLED' })
      .expect(200);

    return booking.id;
  }

  it('USER thường không được gọi hoàn tiền (403)', async () => {
    const id = await makeCancelledPaidBooking(`E2ERF${suffix}A`);
    await api().post(`/api/payments/${id}/refund`).set(auth(userToken)).expect(403);
  });

  it('từ chối hoàn tiền khi đơn chưa bị huỷ (400)', async () => {
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId,
        departureId,
        numAdults: 1,
        totalPrice: 2000000,
        contactName: 'Khach Refund',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: `E2ERF${suffix}B`,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        payment: {
          create: {
            provider: 'VNPAY',
            amount: 2000000,
            status: 'SUCCESS',
            transactionRef: `TXN-B-${suffix}`,
            paidAt: new Date(),
            vnpayPayDate: '20260920103000',
          },
        },
      },
    });

    await api()
      .post(`/api/payments/${booking.id}/refund`)
      .set(auth(adminToken))
      .expect(400);
  });

  it('từ chối hoàn tiền khi đơn đã huỷ nhưng chưa thanh toán (400)', async () => {
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId,
        departureId,
        numAdults: 1,
        totalPrice: 2000000,
        contactName: 'Khach Refund',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: `E2ERF${suffix}C`,
        status: 'PENDING',
        // Mọi đơn thật đều có payment ngay từ lúc checkout (xem
        // BookingsService.checkout), chỉ chưa được VNPay xác nhận thanh toán.
        payment: {
          create: { provider: 'VNPAY', amount: 2000000, status: 'PENDING' },
        },
      },
    });

    await api()
      .patch(`/api/bookings/${booking.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'CANCELLED' })
      .expect(200);

    await api()
      .post(`/api/payments/${booking.id}/refund`)
      .set(auth(adminToken))
      .expect(400);
  });

  it('từ chối hoàn tiền khi đơn không có dữ liệu giao dịch VNPay gốc (400)', async () => {
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId,
        departureId,
        numAdults: 1,
        totalPrice: 2000000,
        contactName: 'Khach Refund',
        contactPhone: '0912345678',
        contactEmail: userEmail,
        bookingCode: `E2ERF${suffix}D`,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        payment: {
          // Được admin đánh dấu PAID thủ công, không qua VNPay thật.
          create: { provider: 'VNPAY', amount: 2000000, status: 'SUCCESS' },
        },
      },
    });

    await api()
      .patch(`/api/bookings/${booking.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'CANCELLED' })
      .expect(200);

    await api()
      .post(`/api/payments/${booking.id}/refund`)
      .set(auth(adminToken))
      .expect(400);
  });

  it('hoàn tiền thành công: cập nhật payment + booking, gọi đúng tham số VNPay', async () => {
    const code = `E2ERF${suffix}E`;
    const id = await makeCancelledPaidBooking(code);

    const res = await api()
      .post(`/api/payments/${id}/refund`)
      .set(auth(adminToken))
      .expect(201);
    expect((res.body as ApiBody<null>).success).toBe(true);

    const call = refundCalls.find((c) => c.txnRef === code);
    expect(call).toBeDefined();
    expect(call?.amount).toBe(2000000);
    expect(call?.transactionNo).toBe(`TXN-${code}`);

    const payment = await prisma.payment.findUnique({ where: { bookingId: id } });
    expect(payment?.status).toBe('REFUNDED');
    expect(payment?.refundedAt).not.toBeNull();
    expect(payment?.refundTransactionRef).toBe('REFUND-MOCK-1');

    const booking = await prisma.booking.findUnique({ where: { id } });
    expect(booking?.paymentStatus).toBe('REFUNDED');

    // Hoàn lần 2 phải bị từ chối vì đã REFUNDED, không phải PAID nữa.
    await api().post(`/api/payments/${id}/refund`).set(auth(adminToken)).expect(400);
  });

  it('VNPay từ chối hoàn tiền: trả 400, không đổi trạng thái đơn', async () => {
    const id = await makeCancelledPaidBooking(`E2ERF${suffix}F`);

    refundResponse = { success: false, responseCode: '91', message: 'Giao dịch không tồn tại' };
    try {
      const res = await api()
        .post(`/api/payments/${id}/refund`)
        .set(auth(adminToken))
        .expect(400);
      expect((res.body as ApiBody<null>).message).toContain('VNPay từ chối hoàn tiền');
    } finally {
      refundResponse = {
        success: true,
        responseCode: '00',
        message: 'Success',
        transactionNo: 'REFUND-MOCK-1',
      };
    }

    const payment = await prisma.payment.findUnique({ where: { bookingId: id } });
    expect(payment?.status).toBe('SUCCESS');
    const booking = await prisma.booking.findUnique({ where: { id } });
    expect(booking?.paymentStatus).toBe('PAID');
  });

  it('chưa cấu hình VNPay thì trả 503', async () => {
    const id = await makeCancelledPaidBooking(`E2ERF${suffix}G`);

    vnpayConfigured = false;
    try {
      await api().post(`/api/payments/${id}/refund`).set(auth(adminToken)).expect(503);
    } finally {
      vnpayConfigured = true;
    }
  });
});
