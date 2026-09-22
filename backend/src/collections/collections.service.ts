import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { ensureDateWindowValid, isWithinWindow } from '../common/utils/date-window.util';
import { PrismaService } from '../database/prisma/prisma.service';
import { effectiveDiscountPrice } from '../tours/promo.util';
import {
  serializeDepartures,
  UPCOMING_DEPARTURES_INCLUDE,
} from '../tours/upcoming-departures.util';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { QueryAdminCollectionsDto } from './dto/query-admin-collections.dto';
import type { QueryCollectionsDto } from './dto/query-collections.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';

const TOUR_CARD_INCLUDE = {
  category: true,
  departures: UPCOMING_DEPARTURES_INCLUDE,
} satisfies Prisma.TourInclude;

function serializeTourCard<
  T extends {
    basePrice: Prisma.Decimal;
    discountPrice: Prisma.Decimal | null;
    promoStartAt: Date | null;
    promoEndAt: Date | null;
    avgRating: Prisma.Decimal;
    departures?: { priceOverride: Prisma.Decimal | null }[];
  },
>(tour: T) {
  return {
    ...tour,
    basePrice: Number(tour.basePrice),
    discountPrice: effectiveDiscountPrice(tour),
    avgRating: Number(tour.avgRating),
    ...(tour.departures && { departures: serializeDepartures(tour.departures) }),
  };
}

// Đang hiển thị công khai: đã đăng và đang trong (hoặc chưa đặt) hạn hiển thị.
// Dùng "AND" ở cấp cao nhất để không đè lên OR của các điều kiện khác nếu
// sau này có thêm bộ lọc (tìm kiếm...) trên danh sách công khai.
function activeCollectionWhere(now = new Date()): Prisma.CollectionWhereInput {
  return {
    status: 'PUBLISHED',
    deletedAt: null,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCollectionsDto) {
    const collections = await this.prisma.collection.findMany({
      where: activeCollectionWhere(),
      include: { _count: { select: { tours: true } } },
      orderBy: { createdAt: 'desc' },
      ...(query.limit && { take: query.limit }),
    });

    return collections.map(({ _count, ...c }) => ({
      ...c,
      tourCount: _count.tours,
    }));
  }

  async findBySlug(slug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { slug, ...activeCollectionWhere() },
      include: {
        tours: {
          orderBy: { sortOrder: 'asc' },
          include: { tour: { include: TOUR_CARD_INCLUDE } },
        },
      },
    });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');

    const { tours, ...rest } = collection;
    return { ...rest, tours: tours.map((t) => serializeTourCard(t.tour)) };
  }

  async findAllAdmin(query: QueryAdminCollectionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;

    const where: Prisma.CollectionWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        include: { _count: { select: { tours: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.collection.count({ where }),
    ]);

    return {
      items: items.map(({ _count, ...c }) => ({
        ...c,
        tourCount: _count.tours,
        // Đang thật sự hiển thị với khách: đã đăng và trong hạn (nếu có đặt hạn).
        isActive: c.status === 'PUBLISHED' && isWithinWindow(c.startAt, c.endAt),
      })),
      page,
      limit,
      total,
    };
  }

  async findByIdAdmin(id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, deletedAt: null },
      include: {
        tours: {
          orderBy: { sortOrder: 'asc' },
          include: { tour: { select: { id: true, title: true, thumbnailUrl: true } } },
        },
      },
    });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');

    const { tours, ...rest } = collection;
    return { ...rest, tours: tours.map((t) => t.tour) };
  }

  async create(dto: CreateCollectionDto, createdById: string) {
    ensureDateWindowValid(dto.startAt, dto.endAt);
    const { tourIds, ...rest } = dto;
    if (tourIds) await this.ensureToursExist(tourIds);

    const collection = await this.prisma.collection.create({
      data: {
        ...rest,
        createdById,
        ...(tourIds &&
          tourIds.length > 0 && {
            tours: {
              create: tourIds.map((tourId, i) => ({ tourId, sortOrder: i })),
            },
          }),
      },
    });
    return collection;
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const existing = await this.ensureExists(id);
    ensureDateWindowValid(
      dto.startAt ?? existing.startAt?.toISOString(),
      dto.endAt ?? existing.endAt?.toISOString(),
    );
    const { tourIds, ...rest } = dto;
    if (tourIds) await this.ensureToursExist(tourIds);

    const collection = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.collection.update({ where: { id }, data: rest });
      if (tourIds !== undefined) {
        // Thay toàn bộ danh sách + thứ tự tour trong một giao dịch.
        await tx.collectionTour.deleteMany({ where: { collectionId: id } });
        if (tourIds.length > 0) {
          await tx.collectionTour.createMany({
            data: tourIds.map((tourId, i) => ({
              collectionId: id,
              tourId,
              sortOrder: i,
            })),
          });
        }
      }
      return updated;
    });
    return collection;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureExists(id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!collection) throw new NotFoundException('Không tìm thấy bộ sưu tập');
    return collection;
  }

  // Chặn sớm bằng 400 thay vì để lỗi khoá ngoại rơi xuống thành 500.
  private async ensureToursExist(tourIds: string[]) {
    if (tourIds.length === 0) return;
    const count = await this.prisma.tour.count({
      where: { id: { in: tourIds }, deletedAt: null },
    });
    if (count !== new Set(tourIds).size) {
      throw new BadRequestException('Một hoặc nhiều tour không tồn tại');
    }
  }
}
