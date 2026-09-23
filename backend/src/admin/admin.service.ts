import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import type { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import type { QueryAdminReviewsDto } from './dto/query-admin-reviews.dto';
import type { QueryAdminToursDto } from './dto/query-admin-tours.dto';
import type { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import type { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';

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

function serializeTour<
  T extends {
    basePrice: Prisma.Decimal;
    discountPrice: Prisma.Decimal | null;
    avgRating: Prisma.Decimal;
  },
>(tour: T) {
  return {
    ...tour,
    basePrice: Number(tour.basePrice),
    discountPrice:
      tour.discountPrice != null ? Number(tour.discountPrice) : null,
    avgRating: Number(tour.avgRating),
  };
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

  // Danh sách tour cho admin: gồm cả DRAFT/ARCHIVED (API công khai chỉ trả PUBLISHED).
  async findTours(query: QueryAdminToursDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const where: Prisma.TourWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tour.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { departures: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tour.count({ where }),
    ]);

    return { items: items.map(serializeTour), page, limit, total };
  }

  async findTourById(id: string) {
    const tour = await this.prisma.tour.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        departures: { orderBy: { departureDate: 'asc' } },
      },
    });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');

    return {
      ...serializeTour(tour),
      departures: tour.departures.map((d) => ({
        ...d,
        priceOverride: d.priceOverride != null ? Number(d.priceOverride) : null,
      })),
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

  async findReviews(query: QueryAdminReviewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const where: Prisma.ReviewWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { comment: { contains: query.search, mode: 'insensitive' } },
          {
            user: { fullName: { contains: query.search, mode: 'insensitive' } },
          },
          { tour: { title: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          tour: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async findUsers(query: QueryAdminUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async updateUser(actorId: string, id: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const losesAdmin = dto.role === 'USER' && user.role === 'ADMIN';
    const locks = dto.isActive === false && user.isActive;

    if (id === actorId && (losesAdmin || dto.isActive === false)) {
      throw new BadRequestException(
        'Bạn không thể tự khoá hoặc tự hạ quyền tài khoản của mình',
      );
    }

    // Luôn còn ít nhất một quản trị viên đang hoạt động.
    if (user.role === 'ADMIN' && (losesAdmin || locks)) {
      const otherAdmins = await this.prisma.user.count({
        where: {
          role: 'ADMIN',
          isActive: true,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException(
          'Không thể khoá hoặc hạ quyền quản trị viên cuối cùng',
        );
      }
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.role && { role: dto.role }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
      }),
      // Khoá tài khoản: thu hồi mọi refresh token để không gia hạn được phiên.
      ...(locks
        ? [
            this.prisma.refreshToken.updateMany({
              where: { userId: id, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
    ]);

    return updated;
  }

  async findAuditLogs(query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity && { entity: query.entity }),
      ...(query.action && { action: query.action }),
      ...(query.search && {
        user: {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, page, limit, total };
  }
}
