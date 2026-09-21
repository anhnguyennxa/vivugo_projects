import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';

const FAVORITE_INCLUDE = {
  tour: {
    include: { category: true },
  },
} as const;

function serializeFavorite<
  T extends {
    tour: { basePrice: unknown; discountPrice: unknown; avgRating: unknown };
  },
>(favorite: T) {
  return {
    ...favorite,
    tour: {
      ...favorite.tour,
      basePrice: Number(favorite.tour.basePrice),
      discountPrice:
        favorite.tour.discountPrice != null
          ? Number(favorite.tour.discountPrice)
          : null,
      avgRating: Number(favorite.tour.avgRating),
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
