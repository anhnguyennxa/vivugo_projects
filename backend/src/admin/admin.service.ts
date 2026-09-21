import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import type { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';

const REVENUE_MONTHS = 6;
const TOP_TOURS_LIMIT = 5;
const RECENT_BOOKINGS_LIMIT = 5;

const ADMIN_BOOKING_INCLUDE = {
  tour: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
  departure: { select: { id: true, departureDate: true, returnDate: true } },
  user: { select: { id: true, fullName: true, email: true } },
  payment: { select: { provider: true, status: true, paidAt: true } },
} satisfies Prisma.BookingInclude;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function serializeBooking<T extends { totalPrice: Prisma.Decimal }>(b: T) {
  return { ...b, totalPrice: Number(b.totalPrice) };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const firstMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (REVENUE_MONTHS - 1),
      1,
    );

    // Doanh thu = đơn đã thanh toán (PAID) và chưa bị huỷ.
    const paidWhere: Prisma.BookingWhereInput = {
      paymentStatus: 'PAID',
      status: { not: 'CANCELLED' },
    };

    const [
      revenueAgg,
      statusGroups,
      userCount,
      publishedTourCount,
      pendingReviewCount,
      paidRecent,
      topGroups,
      recentBookings,
    ] = await Promise.all([
      this.prisma.booking.aggregate({
        where: paidWhere,
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { role: 'USER', deletedAt: null } }),
      this.prisma.tour.count({
        where: { status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.findMany({
        where: { ...paidWhere, createdAt: { gte: firstMonth } },
        select: { createdAt: true, totalPrice: true },
      }),
      this.prisma.booking.groupBy({
        by: ['tourId'],
        where: paidWhere,
        _count: { _all: true },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: TOP_TOURS_LIMIT,
      }),
      this.prisma.booking.findMany({
        include: ADMIN_BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: RECENT_BOOKINGS_LIMIT,
      }),
    ]);

    const bookingsByStatus = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
    for (const g of statusGroups) bookingsByStatus[g.status] = g._count._all;

    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 0; i < REVENUE_MONTHS; i++) {
      const d = new Date(
        firstMonth.getFullYear(),
        firstMonth.getMonth() + i,
        1,
      );
      revenueByMonth.push({ month: monthKey(d), revenue: 0 });
    }
    for (const b of paidRecent) {
      const slot = revenueByMonth.find(
        (m) => m.month === monthKey(b.createdAt),
      );
      if (slot) slot.revenue += Number(b.totalPrice);
    }

    const topTourRows = await this.prisma.tour.findMany({
      where: { id: { in: topGroups.map((g) => g.tourId) } },
      select: { id: true, title: true, slug: true },
    });
    const topTours = topGroups.flatMap((g) => {
      const tour = topTourRows.find((t) => t.id === g.tourId);
      return tour
        ? [
            {
              ...tour,
              bookings: g._count._all,
              revenue: Number(g._sum.totalPrice ?? 0),
            },
          ]
        : [];
    });

    return {
      totalRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
      totalBookings: Object.values(bookingsByStatus).reduce((a, b) => a + b, 0),
      bookingsByStatus,
      userCount,
      publishedTourCount,
      pendingReviewCount,
      revenueByMonth,
      topTours,
      recentBookings: recentBookings.map(serializeBooking),
    };
  }

  async findBookings(query: QueryAdminBookingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const where: Prisma.BookingWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
      ...(query.search && {
        OR: [
          { bookingCode: { contains: query.search, mode: 'insensitive' } },
          { contactName: { contains: query.search, mode: 'insensitive' } },
          { contactPhone: { contains: query.search } },
          { contactEmail: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: ADMIN_BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items: items.map(serializeBooking), page, limit, total };
  }
}
