import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import type { AddTourImagesDto } from './dto/add-tour-images.dto';
import type { CreateTourDto } from './dto/create-tour.dto';
import type { QueryToursDto } from './dto/query-tours.dto';
import type { UpdateTourDto } from './dto/update-tour.dto';

function serializeTour<
  T extends {
    basePrice: Prisma.Decimal;
    discountPrice: Prisma.Decimal | null;
    avgRating: Prisma.Decimal;
    departures?: { priceOverride: Prisma.Decimal | null }[];
  },
>(tour: T) {
  return {
    ...tour,
    basePrice: Number(tour.basePrice),
    discountPrice:
      tour.discountPrice != null ? Number(tour.discountPrice) : null,
    avgRating: Number(tour.avgRating),
    ...(tour.departures && {
      departures: tour.departures.map((d) => ({
        ...d,
        priceOverride: d.priceOverride != null ? Number(d.priceOverride) : null,
      })),
    }),
  };
}

const LAST_MINUTE_WINDOW_DAYS = 21;

@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryToursDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const lastMinuteWindow = query.lastMinute
      ? {
          gte: new Date(),
          lte: new Date(Date.now() + LAST_MINUTE_WINDOW_DAYS * 86_400_000),
        }
      : undefined;

    const where: Prisma.TourWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(query.featured != null && { isFeatured: query.featured }),
      ...(query.promo && { discountPrice: { not: null } }),
      ...(query.category && { category: { slug: query.category } }),
      ...(query.region && { region: query.region }),
      ...(query.departureCity && { departureCity: query.departureCity }),
      ...(query.lastMinute && {
        departures: {
          some: { status: 'OPEN', departureDate: lastMinuteWindow },
        },
      }),
      ...((query.minPrice != null || query.maxPrice != null) && {
        basePrice: {
          ...(query.minPrice != null && { gte: query.minPrice }),
          ...(query.maxPrice != null && { lte: query.maxPrice }),
        },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
          { summary: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tour.findMany({
        where,
        include: {
          category: true,
          ...(query.lastMinute && {
            departures: {
              where: { status: 'OPEN', departureDate: lastMinuteWindow },
              orderBy: { departureDate: 'asc' },
              take: 1,
            },
          }),
        },
        orderBy: { [query.sort ?? 'createdAt']: query.order ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.tour.count({ where }),
    ]);

    return { items: items.map(serializeTour), page, limit, total };
  }

  async findBySlug(slug: string) {
    const tour = await this.prisma.tour.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        departures: { orderBy: { departureDate: 'asc' } },
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    });

    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    return serializeTour(tour);
  }

  async create(dto: CreateTourDto, createdById: string) {
    await this.ensureCategoryExists(dto.categoryId);

    const tour = await this.prisma.tour.create({
      data: {
        ...dto,
        itinerary: dto.itinerary,
        createdById,
      },
    });
    return serializeTour(tour);
  }

  async update(id: string, dto: UpdateTourDto) {
    await this.ensureTourExists(id);
    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);

    const tour = await this.prisma.tour.update({
      where: { id },
      data: { ...dto, ...(dto.itinerary && { itinerary: dto.itinerary }) },
    });
    return serializeTour(tour);
  }

  async remove(id: string) {
    await this.ensureTourExists(id);
    await this.prisma.tour.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Xoá hẳn: chỉ khi tour chưa từng có đơn để không làm mất lịch sử đơn/doanh thu.
  // Ảnh, đợt khởi hành, đánh giá, yêu thích, giỏ hàng tự xoá theo (onDelete: Cascade).
  async removePermanently(id: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!tour) throw new NotFoundException('Không tìm thấy tour');
    if (tour._count.bookings > 0) {
      throw new BadRequestException(
        `Tour đã có ${tour._count.bookings} đơn đặt nên không thể xoá vĩnh viễn, hãy ẩn tour thay vì xoá`,
      );
    }
    await this.prisma.tour.delete({ where: { id } });
  }

  async addImages(tourId: string, dto: AddTourImagesDto) {
    await this.ensureTourExists(tourId);

    const existingCount = await this.prisma.tourImage.count({
      where: { tourId },
    });
    await this.prisma.tourImage.createMany({
      data: dto.urls.map((url, i) => ({
        tourId,
        url,
        sortOrder: existingCount + i,
      })),
    });

    return this.prisma.tourImage.findMany({
      where: { tourId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async removeImage(tourId: string, imageId: string) {
    const image = await this.prisma.tourImage.findFirst({
      where: { id: imageId, tourId },
    });
    if (!image) throw new NotFoundException('Không tìm thấy ảnh');
    await this.prisma.tourImage.delete({ where: { id: imageId } });
  }

  private async ensureTourExists(id: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id } });
    if (!tour || tour.deletedAt)
      throw new NotFoundException('Không tìm thấy tour');
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new BadRequestException('Danh mục không tồn tại');
  }
}
