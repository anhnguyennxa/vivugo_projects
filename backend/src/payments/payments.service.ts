import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VnpayService } from './vnpay.service';

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayService,
    private readonly notifications: NotificationsService,
  ) {}

  async getByBookingId(bookingId: string, requester: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (requester.role !== 'ADMIN' && booking.userId !== requester.id) {
      throw new ForbiddenException();
    }
    if (!booking.payment)
      throw new NotFoundException('Không tìm thấy thông tin thanh toán');

    return { ...booking.payment, amount: Number(booking.payment.amount) };
  }

  async handleVnpayIpn(query: Record<string, string>) {
    const result = this.vnpay.verifyIpn(query);

    if (!result.isValidSignature) {
      this.logger.warn(
        `VNPay IPN chữ ký không hợp lệ: txnRef=${result.txnRef}`,
      );
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: result.txnRef },
      include: { payment: true, tour: { select: { title: true } } },
    });
    if (!booking || !booking.payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (Number(booking.payment.amount) !== result.amount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (booking.payment.status !== 'PENDING') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (!result.isSuccess) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: 'FAILED',
            transactionRef: result.transactionNo || null,
          },
        }),
        this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        }),
        this.prisma.departure.update({
          where: { id: booking.departureId },
          data: {
            bookedSlots: { decrement: booking.numAdults + booking.numChildren },
          },
        }),
      ]);
      return { RspCode: '00', Message: 'Confirm Success' };
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: 'SUCCESS',
          transactionRef: result.transactionNo,
          paidAt: new Date(),
          vnpayPayDate: result.payDate || null,
        },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      }),
    ]);

    await this.notifications.create({
      userId: booking.userId,
      type: 'PAYMENT',
      title: 'Thanh toán thành công',
      message: `Đơn "${booking.tour.title}" (${booking.bookingCode}) đã thanh toán thành công ${formatVnd(result.amount)}.`,
      data: { bookingId: booking.id, bookingCode: booking.bookingCode },
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  // Chỉ admin gọi, sau khi đơn đã được huỷ (xem BookingsService.updateStatus).
  // Hoàn toàn phần qua API VNPay, không tự động — admin chủ động xác nhận.
  async refund(bookingId: string, admin: RequestUser, ipAddr: string) {
    if (!this.vnpay.isConfigured()) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình VNPay (VNPAY_TMN_CODE, VNPAY_HASH_SECRET)',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, tour: { select: { title: true } } },
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (!booking.payment)
      throw new NotFoundException('Không tìm thấy thông tin thanh toán');

    if (booking.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Chỉ có thể hoàn tiền cho đơn đã huỷ, hãy huỷ đơn trước',
      );
    }
    if (booking.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        `Đơn ở trạng thái thanh toán "${booking.paymentStatus}", không có gì để hoàn`,
      );
    }
    if (!booking.payment.transactionRef || !booking.payment.vnpayPayDate) {
      throw new BadRequestException(
        'Đơn không có dữ liệu giao dịch VNPay gốc nên không thể hoàn tiền tự động',
      );
    }

    const result = await this.vnpay.refund({
      txnRef: booking.bookingCode,
      amount: Number(booking.payment.amount),
      transactionNo: booking.payment.transactionRef,
      transactionDate: booking.payment.vnpayPayDate,
      orderInfo: `Hoan tien don ${booking.bookingCode}`,
      createBy: admin.email,
      ipAddr,
    });

    if (!result.success) {
      this.logger.warn(
        `Hoàn tiền VNPay thất bại cho đơn ${booking.bookingCode}: ${result.responseCode} - ${result.message}`,
      );
      throw new BadRequestException(
        `VNPay từ chối hoàn tiền: ${result.message}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundTransactionRef: result.transactionNo ?? null,
        },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'REFUNDED' },
      }),
    ]);

    await this.notifications.create({
      userId: booking.userId,
      type: 'PAYMENT',
      title: 'Hoàn tiền thành công',
      message: `Đơn "${booking.tour.title}" (${booking.bookingCode}) đã được hoàn tiền ${formatVnd(Number(booking.payment.amount))}.`,
      data: { bookingId: booking.id, bookingCode: booking.bookingCode },
    });
  }
}
