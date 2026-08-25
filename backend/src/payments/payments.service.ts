import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../database/prisma/prisma.service';
import { VnpayService } from './vnpay.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayService,
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
      include: { payment: true },
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
        },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
      }),
    ]);

    return { RspCode: '00', Message: 'Confirm Success' };
  }
}
