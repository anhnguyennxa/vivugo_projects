import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

const CART_ITEM_INCLUDE = {
  tour: {
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnailUrl: true,
      basePrice: true,
      discountPrice: true,
    },
  },
  departure: {
    select: {
      id: true,
      departureDate: true,
      returnDate: true,
      totalSlots: true,
      bookedSlots: true,
      priceOverride: true,
      status: true,
    },
  },
} as const;

function serializeCartItem<
  T extends {
    tour: { basePrice: unknown; discountPrice: unknown };
    departure: { priceOverride: unknown };
  },
>(item: T) {
  return {
    ...item,
    tour: {
      ...item.tour,
      basePrice: Number(item.tour.basePrice),
      discountPrice:
        item.tour.discountPrice != null
          ? Number(item.tour.discountPrice)
          : null,
    },
    departure: {
      ...item.departure,
      priceOverride:
        item.departure.priceOverride != null
          ? Number(item.departure.priceOverride)
          : null,
    },
  };
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: CART_ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return items.map(serializeCartItem);
  }

  async add(userId: string, dto: AddCartItemDto) {
    const departure = await this.prisma.departure.findUnique({
      where: { id: dto.departureId },
      include: { tour: true },
    });

    if (!departure || departure.tourId !== dto.tourId) {
      throw new NotFoundException('Không tìm thấy đợt khởi hành cho tour này');
    }
    if (departure.tour.status !== 'PUBLISHED' || departure.tour.deletedAt) {
      throw new NotFoundException('Tour hiện không khả dụng');
    }
    if (departure.status !== 'OPEN') {
      throw new BadRequestException('Đợt khởi hành này đã đóng hoặc bị huỷ');
    }

    const requested = dto.numAdults + (dto.numChildren ?? 0);
    const remaining = departure.totalSlots - departure.bookedSlots;
    if (requested > remaining) {
      throw new BadRequestException(
        `Chỉ còn ${remaining} chỗ trống cho đợt khởi hành này`,
      );
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_departureId: { userId, departureId: dto.departureId } },
    });
    if (existing) {
      throw new ConflictException(
        'Đợt khởi hành này đã có trong giỏ hàng, vui lòng chỉnh sửa số lượng thay vì thêm lại',
      );
    }

    const item = await this.prisma.cartItem.create({
      data: {
        userId,
        tourId: dto.tourId,
        departureId: dto.departureId,
        numAdults: dto.numAdults,
        numChildren: dto.numChildren ?? 0,
      },
      include: CART_ITEM_INCLUDE,
    });
    return serializeCartItem(item);
  }

  async update(userId: string, id: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: { departure: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.userId !== userId) throw new ForbiddenException();

    const numAdults = dto.numAdults ?? item.numAdults;
    const numChildren = dto.numChildren ?? item.numChildren;
    const requested = numAdults + numChildren;
    const remaining = item.departure.totalSlots - item.departure.bookedSlots;
    if (requested > remaining) {
      throw new BadRequestException(
        `Chỉ còn ${remaining} chỗ trống cho đợt khởi hành này`,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id },
      data: { numAdults, numChildren },
      include: CART_ITEM_INCLUDE,
    });
    return serializeCartItem(updated);
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.userId !== userId) throw new ForbiddenException();

    await this.prisma.cartItem.delete({ where: { id } });
  }
}
