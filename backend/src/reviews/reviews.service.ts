import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ModerateReviewDto } from './dto/moderate-review.dto';
import type { QueryReviewsDto } from './dto/query-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTour(tourId: string, query: QueryReviewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = { tourId, status: 'APPROVED' as const };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt tour');
    if (booking.userId !== userId) throw new ForbiddenException();
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Chỉ có thể đánh giá sau khi tour đã hoàn thành',
      );
    }
    if (booking.review) {
      throw new ConflictException('Đơn đặt tour này đã được đánh giá');
    }

    return this.prisma.review.create({
      data: {
        tourId: booking.tourId,
        userId,
        bookingId: booking.id,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.recalculateTourRating(review.tourId);
    return updated;
  }

  private async recalculateTourRating(tourId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { tourId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.tour.update({
      where: { id: tourId },
      data: {
        avgRating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count,
      },
    });
  }
}
