import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';
import { VnpayService } from '../payments/vnpay.service';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import type { CheckoutDto } from './dto/checkout.dto';
import type { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const BOOKING_INCLUDE = {
  tour: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
  departure: {
    select: { id: true, departureDate: true, returnDate: true },
  },
  payment: true,
} as const;

function toNumber(value: unknown) {
  return value == null ? null : Number(value);
}

function serializeBooking<T extends Record<string, unknown>>(booking: T) {
  const payment = booking.payment as Record<string, unknown> | null;
  return {
    ...booking,
    totalPrice: toNumber(booking.totalPrice),
    ...(payment && {
      payment: { ...payment, amount: toNumber(payment.amount) },
    }),
  };
}

function generateBookingCode() {
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `VVG${Date.now().toString(36).toUpperCase()}${rand}`;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpay: VnpayService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto, ipAddr: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: dto.cartItemId },
      include: { tour: true, departure: true },
    });

    if (!cartItem)
      throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (cartItem.userId !== userId) throw new ForbiddenException();
    if (cartItem.departure.status !== 'OPEN') {
      throw new BadRequestException('Đợt khởi hành này đã đóng hoặc bị huỷ');
    }

    const requested = cartItem.numAdults + cartItem.numChildren;
    const remaining =
      cartItem.departure.totalSlots - cartItem.departure.bookedSlots;
    if (requested > remaining) {
      throw new BadRequestException(
        `Chỉ còn ${remaining} chỗ trống cho đợt khởi hành này`,
      );
    }

    const unitPrice = Number(
      cartItem.departure.priceOverride ??
        cartItem.tour.discountPrice ??
        cartItem.tour.basePrice,
    );
    const totalPrice = unitPrice * requested;
    const bookingCode = generateBookingCode();

    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.departure.update({
        where: { id: cartItem.departureId },
        data: { bookedSlots: { increment: requested } },
      });
      await tx.cartItem.delete({ where: { id: cartItem.id } });

      const created = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          tourId: cartItem.tourId,
          departureId: cartItem.departureId,
          numAdults: cartItem.numAdults,
          numChildren: cartItem.numChildren,
          totalPrice,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          note: dto.note,
        },
      });

      await tx.payment.create({
        data: {
          bookingId: created.id,
          provider: 'VNPAY',
          amount: totalPrice,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: created.id },
        include: BOOKING_INCLUDE,
      });
    });

    const paymentUrl = this.vnpay.isConfigured()
      ? this.vnpay.createPaymentUrl({
          amount: totalPrice,
          orderId: bookingCode,
          orderInfo: `Thanh toan don hang ${bookingCode}`,
          ipAddr,
        })
      : null;

    return { booking: serializeBooking(booking), paymentUrl };
  }

  async findAllForUser(requester: RequestUser) {
    const bookings = await this.prisma.booking.findMany({
      where: requester.role === 'ADMIN' ? {} : { userId: requester.id },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map(serializeBooking);
  }

  async findByCode(code: string, requester: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: code },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (requester.role !== 'ADMIN' && booking.userId !== requester.id) {
      throw new ForbiddenException();
    }
    return serializeBooking(booking);
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');

    if (dto.status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      await this.releaseSlots(
        booking.departureId,
        booking.numAdults + booking.numChildren,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: dto.status },
      include: BOOKING_INCLUDE,
    });
    return serializeBooking(updated);
  }

  async cancel(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (booking.userId !== userId) throw new ForbiddenException();
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể huỷ đơn đang chờ xử lý');
    }

    await this.releaseSlots(
      booking.departureId,
      booking.numAdults + booking.numChildren,
    );
    await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private releaseSlots(departureId: string, quantity: number) {
    return this.prisma.departure.update({
      where: { id: departureId },
      data: { bookedSlots: { decrement: quantity } },
    });
  }
}
