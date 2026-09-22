import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { effectiveDiscountPrice } from '../tours/promo.util';
import {
  serializeDepartures,
  UPCOMING_DEPARTURES_INCLUDE,
} from '../tours/upcoming-departures.util';

const FAVORITE_INCLUDE = {
  tour: {
    include: {
      category: true,
      // Để thẻ tour trong danh sách yêu thích hiện được ngày khởi hành.
      departures: UPCOMING_DEPARTURES_INCLUDE,
    },
  },
} as const;

function serializeFavorite<
  T extends {
    tour: {
      basePrice: Prisma.Decimal;
      discountPrice: Prisma.Decimal | null;
      promoStartAt: Date | null;
      promoEndAt: Date | null;
      avgRating: Prisma.Decimal;
      departures: { priceOverride: Prisma.Decimal | null }[];
    };
  },
>(favorite: T) {
  return {
    ...favorite,
    tour: {
      ...favorite.tour,
      basePrice: Number(favorite.tour.basePrice),
      discountPrice: effectiveDiscountPrice(favorite.tour),
      avgRating: Number(favorite.tour.avgRating),
      departures: serializeDepartures(favorite.tour.departures),
    },
  };
}

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: FAVORITE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map(serializeFavorite);
  }

  async add(userId: string, tourId: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour || tour.deletedAt || tour.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy tour');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_tourId: { userId, tourId } },
    });
    if (existing)
      throw new ConflictException('Tour này đã có trong danh sách yêu thích');

    const favorite = await this.prisma.favorite.create({
      data: { userId, tourId },
      include: FAVORITE_INCLUDE,
    });
    return serializeFavorite(favorite);
  }

  async remove(userId: string, tourId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_tourId: { userId, tourId } },
    });
    if (!existing)
      throw new NotFoundException('Không tìm thấy trong danh sách yêu thích');

    await this.prisma.favorite.delete({ where: { id: existing.id } });
  }
}
